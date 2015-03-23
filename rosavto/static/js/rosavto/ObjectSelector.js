define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/on',
        'dojo/html',
        'dojo/topic',
        'dojo/request/xhr',
        'dojo/Deferred',
        'dojo/DeferredList',
        'centreit/DragAndDrop',
        'rosavto/MapIdentify',
        'rosavto/NgwServiceFacade',
        'rosavto/ParametersVerification',
        'rosavto/Loader',
        'rosavto/Layers/StyledGeoJsonLayer',
        'rosavto/Constants'
    ],
    function (declare, array, lang, on, html, topic, xhr, Deferred, DeferredList, DnD, MapIdentify, NgwServiceFacade,
              ParametersVerification, Loader, StyledGeoJsonLayer, Constants) {
        return declare('rosavto.ObjectSelector', [Loader, ParametersVerification], {
            _selectedObjectsLayer: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'layersInfo',
                    'defaultStylesSettings'
                ]);
                lang.mixin(this, settings);
            },

            selectObject: function (keynameLayer, guid) {
                var layer = this.getLayerVisibleByKeyname(keynameLayer);

                if (!layer._layerType) {
                    throw new Error('ObjectSelector: Layer "' + keynameLayer + '" is not contained "_layerType" properties.');
                }

                if (layer._layerType === Constants.TileLayer) {
                    this.selectObjectOnTileLayer(guid, keynameLayer);
                }

                if (layer._layerType === Constants.RealtimeLayer) {
                    if (layer.layersById && layer.layersById[guid]) {
                    }
                }

                if (layer._layerType === Constants.SensorsLayer) {
                    if (layer._markers) {
                        var markerFound = layer._markers[guid];
                        if (markerFound) {
                            layer._selectMarker(markerFound);
                        }
                    }
                }
            },

            selectObjectOnTileLayer: function (guid, keynameLayer) {
                var layerId = this.layersInfo.getLayersIdByKeynames([keynameLayer])[0];
                this.ngwServiceFacade.getGeometryByGuid(layerId, guid).then(lang.hitch(this, function (geometry) {
                    if (!geometry.features || geometry.features.length < 1) {
                        throw new Error('ObjectSelector: object with guid "' + guid +
                        '" on layer"' + keynameLayer + '" is not found.');
                    }
                    this._renderMarkerSelected(geometry.features[0]);
                    this._fireAfterSelect(guid, Constants.TileLayer);
                }));
            },

            selectObjectByFeature: function (guid, feature, layerType) {
                this._renderMarkerSelected(feature);
                this._fireAfterSelect(guid, layerType);
            },

            addObjectByMarker: function (guid, layerType, marker) {
                this._createSelectedObjectsLayer();
                this._selectedObjectsLayer.addLayer(marker);
                marker.setZIndexOffset(9999);
                this._bindDndEventMarker(marker);
                this.map.getLMap().fitBounds(this._selectedObjectsLayer.getBounds());
                this._fireAfterSelect(guid, layerType);
            },

            _mousedownHandler: null,
            _bindDndEventMarker: function (marker) {
                this._mousedownHandler = on(marker._icon, 'mousedown', lang.hitch(this, function (e) {
                    if (e.which === 1) {
                        DnD.onDragStart(e.target, {
                            objectGuid: marker.guid,
                            type: marker.type,
                            historyDate: this.getHistDate.call(undefined)
                        });
                        e.stopPropagation();
                    }
                }));
            },

            getLayerVisibleByKeyname: function (keynameLayer) {
                if (this.map._layersByKeyname[keynameLayer]) {
                    return this.map._layersByKeyname[keynameLayer];
                } else {
                    throw new Error('ObjectSelector: keynameLayer ' + keynameLayer + ' is not found into visible layers.');
                }
            },

            _fireAfterSelect: function (guid, keynameLayer, layerType) {
                if (this.afterSelect && typeof(this.afterSelect) === 'function') {
                    this.afterSelect.call(undefined, guid, keynameLayer, layerType);
                }
            },

            _createSelectedObjectsLayer: function () {
                if (this._selectedObjectsLayer) {
                    this._selectedObjectsLayer.clearLayers();
                } else {
                    this._selectedObjectsLayer = new StyledGeoJsonLayer(null, this.defaultStylesSettings);
                    this._bindSelectedObjectsLayerEvents();
                    this.map.getLMap().addLayer(this._selectedObjectsLayer);
                }

                this._selectedObjectsLayer.bringToFront();
            },

            _bindSelectedObjectsLayerEvents: function () {
                if (!this._selectedObjectsLayer) {
                    throw new Error('ObjectSelector: _selectedObjectsLayer is not created.');
                }
                this._selectedObjectsLayer.on('click', function (e, e1) {
                    console.log(e);
                    console.log(e1);
                });
            },

            _removeSelectedObjectsLayer: function () {
                if (this._selectedObjectsLayer) {
                    this.map.getLMap().removeLayer(this._selectedObjectsLayer);
                    this._selectedObjectsLayer = null;
                }
            },

            _unbindEvents: function () {
                if (this._mousedownHandler) this._mousedownHandler.remove();
            },

            _renderMarkerSelected: function (feature) {
                var layerId = feature.properties.__layer__,
                    style = this._getNgwTileLayerStyle(layerId, feature.properties);

                this._createSelectedObjectsLayer();

                if (style) {
                    this._addSelectedStyle(style);
                    this.map.getLMap().fitBounds(this._selectedObjectsLayer.addObject(feature, 'selected', 0).getBounds());
                } else {
                    this.map.getLMap().fitBounds(this._selectedObjectsLayer.addObject(feature, 'default', 0).getBounds());
                }
            },

            _addSelectedStyle: function (style) {
                this._selectedObjectsLayer.addType('selected', style);
            },

            _getNgwTileLayerStyle: function (layerId, featureProperties) {
                var style = this.layersInfo.getStyleByLayerId(layerId),
                    selectedObjectGroupStyle;

                if (!style) {
                    if (this.debug) {
                        console.log('ObjectSelector: selected-object-style style is not defined for layer ' + this.layersInfo.getLayerNameByLayerId(layerId));
                    }
                    return null;
                } else if (style['selectedObjectStyle']) {
                    return style.selectedObjectStyle;
                } else if (style['selectedObjectStyleGroup']) {
                    selectedObjectGroupStyle = style.selectedObjectStyleGroup[featureProperties[style.selectedObjectStyleGroup._fieldType]];
                    if (!selectedObjectGroupStyle) {
                        console.log('ObjectSelector: selected-object-style-group is not found: type "' +
                        featureProperties[style.selectedObjectStyleGroup._fieldType] + '"');
                    }
                    return selectedObjectGroupStyle;
                }
            }
        });
    });