define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dojo/dom-attr',
    'dojo/request/xhr',
    'dojo/topic',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./templates/MapIdentify.html',
    'mustache/mustache'
],
    function (declare, array, lang, query, on, domAttr, xhr, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, mustache) {

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

                    xhrIdentity.then(lang.hitch(this, function (ngwFeatures) {
                        var identifiedFeatures;

                        identifiedFeatures = this._parseNgwFeatures(ngwFeatures);

                        if (identifiedFeatures.count === 0) {
                            alert('В этом месте объектов нет');
                            this._map.hideLoader();
                        } else if (identifiedFeatures.count === 1) {
                            topic.publish('map/identity', identifiedFeatures.layers[0].features[0].id);
                            this._map.hideLoader();
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
                                name: layerName,
                                features: []
                            };

                            for (i = 0; i < ngwLayerFeaturesCount; i += 1) {
                                ngwFeature = ngwFeatures[layerId].features[i];
                                identifiedLayer.features.push({
                                    label: ngwFeature.label,
                                    id: ngwFeature.fields[this.fieldIdentify]
                                });
                            }

                            identifiedFeatures.layers.push(identifiedLayer);
                        }
                    }
                }

                return identifiedFeatures;
            },

            _buildPopup: function (latlngClick, identifiedFeatures) {
                var map = this._map._lmap,
                    popupId = map._container.id + '-MapIdentify',
                    popup;

                popup = L.popup().setLatLng(latlngClick)
                    .setContent(mustache.render(this.template, {
                        id: popupId,
                        layers: identifiedFeatures.layers
                    }))
                    .openOn(map);

                on(query('#' + popupId + ' li'), 'click', function () {
                    topic.publish('map/identity', domAttr.get(this, 'data-id'));
                    map.closePopup(popup);
                });

                this._map.hideLoader();
            }
        });
    });