define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/query',
        'dojo/on',
        'dojo/dom-attr',
        'dojo/request/xhr',
        'dojo/topic',
        'mustache/mustache',
        'rosavto/ParametersVerification',
        'rosavto/Constants',
        'leaflet/leaflet',
        'dojo/NodeList-traverse',
        'centreit/DragAndDrop'
    ],
    function (declare, array, lang, query, on, domAttr, xhr, topic, mustache,
              ParametersVerification, Constants, L, DnD) {

        return declare('rosavto.MapIdentify', [ParametersVerification], {
            template: '<div id="{{id}}" class="layers-selector">{{#layers}}<p>{{name}}</p><ul data-layer-id="{{id}}">{{#features}}<li data-id="{{id}}"><a href="javascript:void(0)">{{label}}</a></li>{{/features}}</ul>{{/layers}}</div>',

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'layersInfo',
                    'fieldIdentify',
                    'objectSelector'
                ]);
                lang.mixin(this, settings);

                mustache.parse(this.template);
            },

            _stringRepl: function (tmpl) {
                return mustache.render(tmpl, this);
            },

            on: function () {
                this.map._lmap.on('click', lang.hitch(this, function (e) {
                    if (this.debug) {
                        DnD.dragStart = false;
                    }
                    if (DnD.dragStart === false) {
                        var lmap = this.map._lmap,
                            zoom = lmap.getZoom(),
                            latLng = [e.latlng.lng, e.latlng.lat];

                        if (this.map.getVisibleNgwLayers().length < 1) {
                            this._identifyDefaultLayer(zoom, latLng);
                        } else {
                            this._getIdsByClick(zoom, latLng);
                        }
                    }
                }));
            },

            geometryTypesRank: {
                'POINT': 0,
                'MULTIPOINT': 1,
                'LINESTRING': 2,
                'MULTILINESTRING': 3,
                'POLYGON': 4,
                'MULTIPOLYGON': 5
            },


            _getIdsByClick: function (zoom, latlng) {
                var feature,
                    featuresCount;

                return this.layersInfo.getLayersIdByStyles(this.map.getVisibleNgwLayers()).then(lang.hitch(this, function (layersId) {
                    this.ngwServiceFacade.identifyGeoFeaturesByLayers(layersId, zoom, latlng)
                        .then(lang.hitch(this, function (geoJsonFeatures) {
                                featuresCount = geoJsonFeatures.features.length;
                                feature = null;
                                if (featuresCount === 1) {
                                    feature = geoJsonFeatures.features[0];
                                }
                                else if (featuresCount > 1) {
                                    feature = this._getSignificantFeature(geoJsonFeatures.features);
                                }

                                if (feature) {
                                    this.objectSelector.selectObjectByFeature(
                                        feature.properties[this.fieldIdentify], feature, Constants.TileLayer);
                                } else if (this.keynameDefaultLayer) {
                                    this._identifyDefaultLayer(zoom, latlng);
                                }
                            }
                        ));
                }));
            },


            _getSignificantFeature: function (features) {
                var significantFeature;
                array.forEach(features, lang.hitch(this, function (feature) {
                    if (significantFeature) {
                        if (this.geometryTypesRank[feature.geometry.type.toUpperCase()] <
                            this.geometryTypesRank[significantFeature.geometry.type.toUpperCase()]) {
                            significantFeature = feature;
                        }
                    } else {
                        significantFeature = feature;
                    }
                }));
                return significantFeature;
            },


            _parseNgwFeatures: function (ngwFeatures) {
                var layersByType = {
                        point: null,
                        line: null,
                        polygon: null
                    },
                    layer,
                    layerName,
                    geometryType,
                    addGeometryToLayers = function (type, geometry) {
                        if (!layersByType[type]) {
                            layersByType[type] = [];
                        }
                        layersByType[type] = geometry;
                    },
                    identifiedFeatures = {
                        count: 0,
                        layers: []
                    },
                    nonPointObjects = [],
                    identifiedLayer,
                    layerId,
                    ngwLayerFeaturesCount,
                    ngwFeature,
                    label,
                    i;

                for (layerId in ngwFeatures) {
                    if (ngwFeatures.hasOwnProperty(layerId)) {

                        ngwLayerFeaturesCount = ngwFeatures[layerId].featureCount;

                        if (ngwLayerFeaturesCount > 0) {

                            layer = this.layersInfo.getLayerById(parseInt(layerId, 10));
                            layerName = layer.display_name;
                            geometryType = layer.geometry_type;

                            if (geometryType === 'POINT' || geometryType === 'MULTIPOINT') {
                                identifiedFeatures.count += ngwLayerFeaturesCount;
                                identifiedLayer = {
                                    id: layerId,
                                    name: layerName,
                                    features: []
                                };

                                for (i = 0; i < ngwLayerFeaturesCount; i += 1) {
                                    ngwFeature = ngwFeatures[layerId].features[i];
                                    if (!ngwFeature.fields[this.fieldIdentify]) {
                                        console.log('MapIdentify: Identify field "' + this.fieldIdentify + '" was not found');
                                    } else {

                                        // Temporary solution: rendering type name instead of label
                                        if (ngwFeature.fields && ngwFeature.fields.type_name) {
                                            label = ngwFeature.fields.type_name;
                                        } else {
                                            label = ngwFeature.label;
                                        }

                                        identifiedLayer.features.push({
                                            label: label,
                                            id: ngwFeature.fields[this.fieldIdentify]
                                        });
                                    }
                                }
                                identifiedFeatures.layers.push(identifiedLayer);
                            } else if (geometryType === 'LINESTRING' || geometryType === 'MULTILINESTRING') {
                                for (i = 0; i < ngwLayerFeaturesCount; i += 1) {
                                    ngwFeature = ngwFeatures[layerId].features[i];
                                    if (!ngwFeature.fields[this.fieldIdentify]) {
                                        console.log('MapIdentify: Identify field "' + this.fieldIdentify + '" was not found');
                                    } else {
                                        nonPointObjects.unshift([layerId, ngwFeature.fields[this.fieldIdentify]]);
                                    }
                                }
                            } else if (geometryType === 'POLYGON' || geometryType === 'MULTIPOLYGON') {
                                for (i = 0; i < ngwLayerFeaturesCount; i += 1) {
                                    ngwFeature = ngwFeatures[layerId].features[i];
                                    if (!ngwFeature.fields[this.fieldIdentify]) {
                                        console.log('MapIdentify: Identify field "' + this.fieldIdentify + '" was not found');
                                    } else {
                                        nonPointObjects.push([layerId, ngwFeature.fields[this.fieldIdentify]]);
                                    }
                                }
                            }
                        }
                    }
                }

                if (identifiedFeatures.count === 0 && nonPointObjects.length > 0) {
                    identifiedFeatures.count = 1;
                    identifiedFeatures.layers.push({
                        layerId: nonPointObjects[0][0],
                        featureId: nonPointObjects[0][1]
                    });
                }

                return identifiedFeatures;
            },

            _buildPopup: function (latlngClick, identifiedFeatures) {
                var that = this,
                    map = this.map._lmap,
                    popupId = map._container.id + '-MapIdentify',
                    popup;

                popup = L.popup().setLatLng(latlngClick)
                    .setContent(mustache.render(this.template, {
                        id: popupId,
                        layers: identifiedFeatures.layers
                    }))
                    .openOn(map);

                on(query('#' + popupId + ' li'), 'click', function () {
                    var layerId = domAttr.get(query(this).parent()[0], 'data-layer-id'),
                        featureId = domAttr.get(this, 'data-id');
                    that.identify(layerId, featureId);
                    map.closePopup(popup);
                });
            },

            identify: function (layerId, id) {
                topic.publish('attributes/get', layerId, id);
            },

            _defaultLayerId: null,
            _identifyDefaultLayer: function (zoom, latLng) {
                var defaultLayerId = this._defaultLayerId ? this._defaultLayerId :
                        this.layersInfo.getLayerIdByKeyname(this.keynameDefaultLayer),
                    feature,
                    featuresCount;

                this.ngwServiceFacade.identifyGeoFeaturesByLayers([defaultLayerId], zoom, latLng)
                    .then(lang.hitch(this, function (geoJsonFeatures) {
                        featuresCount = geoJsonFeatures.features.length;
                        feature = null;
                        if (featuresCount === 1) {
                            feature = geoJsonFeatures.features[0];
                        }
                        else if (featuresCount > 1) {
                            feature = this._getSignificantFeature(geoJsonFeatures.features);
                        }

                        if (feature) {
                            this.objectSelector.selectObjectByFeature(
                                feature.properties[this.fieldIdentify], feature, Constants.TileLayer);
                        }
                    }));
            }
        });
    });