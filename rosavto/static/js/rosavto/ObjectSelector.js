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
                this.bindEvents();
            },

            bindEvents: function () {
                topic.subscribe('object/select', lang.hitch(this, function (guid, layerType, keyname) {
                    this.selectObject(guid, layerType, keyname);
                }));
            },

            selectObject: function (guid, layerType, keyname) {

                if (layerType === Constants.TileLayer) {
                    this.selectObjectOnTileLayer(guid);
                }

                if (layerType === Constants.RealtimeLayer) {
                    // todo: need implement logic for RealtimeLayer
                }

                if (layerType === Constants.SensorsLayer) {
                    var sensorLayer = this._getLayerVisibleByKeyname('sensorsLayer');
                    if (sensorLayer._markers) {
                        var markerFound = sensorLayer._markers[guid];
                        if (markerFound) {
                            sensorLayer._selectMarker(markerFound);
                        } else {
                            this.zoomToObject(guid, sensorLayer.ngwLayersKeynames);
                        }
                    }
                }
            },

            selectObjectOnTileLayer: function (guid) {
                this.ngwServiceFacade.getGeometriesByGuids(null, [guid]).then(lang.hitch(this, function (geometry) {
                    if (!geometry.features || geometry.features.length < 1) {
                        console.log('Object with GUID="' + guid + '" not found in GIS database');
                    }
                    this._renderMarkerSelected(geometry.features[0]);
                    this._fireAfterSelect(guid, Constants.TileLayer);
                }));
            },

            zoomToObject: function (guid, keynameLayers) {
                var layersId = this.layersInfo.getLayersIdByKeynames(keynameLayers);

                this.ngwServiceFacade.getGeometriesByGuids(layersId, [guid]).then(lang.hitch(this, function (geometry) {
                    if (!geometry.features || geometry.features.length < 1) {
                        console.log('Object with GUID="' + guid + '" not found in GIS database');
                    }

                    this._createSelectedObjectsLayer();
                    this.map.getLMap().removeLayer(this._selectedObjectsLayer);
                    this.map.getLMap().fitBounds(this._selectedObjectsLayer.addObject(geometry.features[0], 'empty', 0).getBounds());
                }));
            },

            selectObjectByFeature: function (guid, feature, layerType) {
                this._renderMarkerSelected(feature);
                this._fireAfterSelect(guid, layerType);
            },

            addMarker: function (guid, layerType, marker, notFitting) {
                this._createSelectedObjectsLayer();
                this._selectedObjectsLayer.addLayer(marker);
                marker.setZIndexOffset(999999);
                this._bindDndEventMarker(marker);
                if (!notFitting) {
                    this.map.getLMap().fitBounds(this._selectedObjectsLayer.getBounds());
                }
                this._fireAfterSelect(guid, layerType);
            },

            clearSelectedObject: function () {
                this._unbindEvents();
                this._selectedObjectsLayer.clearLayers();
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
                this.map.getLMap().on('click', this.clearSelectedObject, this);
            },

            _getLayerVisibleByKeyname: function (keynameLayer) {
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
                    this.clearSelectedObject();
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

                this._selectedObjectsLayer.on('click', lang.hitch(this, function () {
                    this.clearSelectedObject();
                }));
            },

            _removeSelectedObjectsLayer: function () {
                if (this._selectedObjectsLayer) {
                    this.map.getLMap().removeLayer(this._selectedObjectsLayer);
                    this._selectedObjectsLayer = null;
                }
            },

            _unbindEvents: function () {
                if (this._mousedownHandler) this._mousedownHandler.remove();
                this.map.getLMap().off('click', this.clearSelectedObject, this);
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