define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojo/topic',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./templates/MapIdentify.html',
    'mustache/mustache'
],
    function (declare, array, lang, xhr, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, mustache) {

        return declare('rosavto.MapIdentify', [], {
            template: template,

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
                    that.getIdsByClick(e);
                });
            },

            off: function () {
                var that = this;

                this._map._lmap.off('click', function (e) {
                    that.getIdsByClick(e);
                });
            },

            getIdsByClick: function (e) {
                var map = this._map._lmap,
                    latlngClick = e.latlng;

                this._map.showLoader();

                return this._layersInfo.getLayersIdByStyles(this._map._ngwTileLayers).then(lang.hitch(this, function (layersId) {
                    var point = map.project([e.latlng.lat, e.latlng.lng], map.getZoom()),
                        pointTopLeft = L.CRS.EPSG3857.project(map.unproject(new L.Point(point.x - 10, point.y - 10), map.getZoom())),
                        pointBottomRight = L.CRS.EPSG3857.project(map.unproject(new L.Point(point.x + 10, point.y + 10), map.getZoom())),
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

                    xhrIdentity = this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: this.url, params: JSON.stringify(postParams)}}) :
                        xhr(this.url, {handleAs: 'json', method: 'POST', data: postParams, headers: {'X-Requested-With': 'XMLHttpRequest'}});

                    xhrIdentity.then(lang.hitch(this, function (featuresInfo) {
                        var layerName,
                            layerId,
                            featureCount,
                            feature,
                            i,
                            featuresIdentified = {
                                count: 0,
                                features: {}
                            };

                        for (layerId in featuresInfo) {
                            if (featuresInfo.hasOwnProperty(layerId)) {
                                featureCount = featuresInfo[layerId]['featureCount'];
                                if (featureCount > 0) {
                                    featuresIdentified.count += featureCount;
                                    layerName = this._layersInfo.getLayerNameByLayerId(parseInt(layerId, 10));
                                    featuresIdentified.features[layerName] = [];
                                    for (i = 0; i < featureCount; i += 1) {
                                        feature = featuresInfo[layerId].features[i];
                                        featuresIdentified.features[layerName].push({
                                            label: feature.label,
                                            id: feature.fields[this.fieldIdentify]
                                        });
                                    }
                                }
                            }
                        }

                        if (featuresIdentified.count < 2) {
                            topic.publish('map/identity', featuresIdentified);
                        } else {
                            var layersTemplated = [],
                                layerTemplated;
                            for (layerName in featuresIdentified.features) {
                                if (featuresIdentified.features.hasOwnProperty(layerName)) {
                                    feturesCount = featuresIdentified.features[layerName].length;

                                    if (featureCount < 1) {
                                        continue;
                                    }

                                    layerTemplated = {
                                        'name': layerName,
                                        'features': []
                                    };

                                    for (i = 0; i < feturesCount; i++) {
                                        feature = featuresIdentified.features[layerName][i];
                                        layerTemplated.features.push({
                                            id: feature.id,
                                            name: feature.label
                                        });
                                    }

                                    layersTemplated.push(layerTemplated);
                                }
                            }

                            this._map.hideLoader();
                            L.popup().setLatLng(latlngClick)
                                .setContent(mustache.render(this.template, {layers: layersTemplated}))
                                .openOn(map);
                        }
                    }));
                }));
            }
        });
    });