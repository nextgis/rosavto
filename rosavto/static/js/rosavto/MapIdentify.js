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
    'dojo/NodeList-traverse'
],
    function (declare, array, lang, query, on, domAttr, xhr, topic, mustache) {

        return declare('rosavto.MapIdentify', [], {
            template: '<div id="{{id}}" class="layers-selector">{{#layers}}<p>{{name}}</p><ul data-layer-id="{{id}}">{{#features}}<li data-id="{{id}}"><a href="javascript:void(0)">{{label}}</a></li>{{/features}}</ul>{{/layers}}</div>',

            constructor: function (map, layersInfo, settings) {
                mustache.parse(this.template);
                this._map = map;
                this._layersInfo = layersInfo;
                lang.mixin(this, settings);
            },

            _stringRepl: function (tmpl) {
                return mustache.render(tmpl, this);
            },

            on: function () {
                var that = this;

                this._map._lmap.on('click', function (e) {
                    topic.publish('map/identityUi/block');
                    that.getIdsByClick(e);
                });
            },

            getIdsByClick: function (e) {
                var map = this._map._lmap,
                    latlngClick = e.latlng;

                return this._layersInfo.getLayersIdByStyles(this._map._ngwTileLayers).then(lang.hitch(this, function (layersId) {
                    var url = this.urlNgw + 'feature_layer/identify',
                        zoom = map.getZoom(),
                        point = map.project([e.latlng.lat, e.latlng.lng], zoom),
                        pointTopLeft = L.CRS.EPSG3857.project(map.unproject(new L.Point(point.x - 10, point.y - 10), zoom)),
                        pointBottomRight = L.CRS.EPSG3857.project(map.unproject(new L.Point(point.x + 10, point.y + 10), zoom)),
                        wktBounds,
                        postParams,
                        xhrIdentity;

                    wktBounds = 'POLYGON((' + pointTopLeft.x + ' ' + pointTopLeft.y + ', ' +
                        pointBottomRight.x + ' ' + pointTopLeft.y + ', ' +
                        pointBottomRight.x + ' ' + pointBottomRight.y + ', ' +
                        pointTopLeft.x + ' ' + pointBottomRight.y + ', ' +
                        pointTopLeft.x + ' ' + pointTopLeft.y + '))';

                    postParams = {
                        srs: 3857,
                        geom: wktBounds,
                        layers: layersId
                    };

                    xhrIdentity = this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: url, params: JSON.stringify(postParams)}}) :
                        xhr(url, {handleAs: 'json', method: 'POST', data: postParams, headers: {'X-Requested-With': 'XMLHttpRequest'}});

                    xhrIdentity.then(lang.hitch(this, function (ngwFeatures) {
                        var identifiedFeatures;

                        identifiedFeatures = this._parseNgwFeatures(ngwFeatures);

                        if (identifiedFeatures.count === 0) {
                            alert('В этом месте объектов нет');
                            topic.publish('map/identityUi/unblock');
                        } else if (identifiedFeatures.count === 1) {
                            topic.publish('attributes/get', identifiedFeatures.layers[0].id, identifiedFeatures.layers[0].features[0].id);
                        } else if (identifiedFeatures.count > 1) {
                            this._buildPopup(latlngClick, identifiedFeatures);
                        }
                    }));
                }));
            },

            _parseNgwFeatures: function (ngwFeatures) {
                var identifiedFeatures = {
                        count: 0,
                        layers: []
                    },
                    identifiedLayer,
                    layerId,
                    ngwLayerFeaturesCount,
                    ngwFeature,
                    i;

                for (layerId in ngwFeatures) {
                    if (ngwFeatures.hasOwnProperty(layerId)) {

                        ngwLayerFeaturesCount = ngwFeatures[layerId].featureCount;

                        if (ngwLayerFeaturesCount > 0) {

                            identifiedFeatures.count += ngwLayerFeaturesCount;
                            layerName = this._layersInfo.getLayerNameByLayerId(parseInt(layerId, 10));

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
                                    identifiedLayer.features.push({
                                        label: ngwFeature.label,
                                        id: ngwFeature.fields[this.fieldIdentify]
                                    });
                                }
                            }

                            identifiedFeatures.layers.push(identifiedLayer);
                        }
                    }
                }

                return identifiedFeatures;
            },

            _buildPopup: function (latlngClick, identifiedFeatures) {
                var that = this,
                    map = this._map._lmap,
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

                topic.publish('map/identityUi/unblock');
            },

            identify: function (layerId, id) {
                topic.publish('map/identityUi/block');
                topic.publish('attributes/get', layerId, id);
            },

            getGeometryById: function (idFeature, idLayer) {

            }
        });
    });