define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/html',
    'dojo/topic',
    'dojo/request/xhr',
    'dojo/Deferred',
    'dojo/DeferredList',
    'rosavto/LayersInfo',
    'rosavto/MapIdentify',
    'rosavto/Loader'
],
    function (declare, array, lang, query, html, topic, xhr, Deferred, DeferredList, LayersInfo, MapIdentify, Loader) {
        return declare('rosavto.AttributeGetter', [Loader], {
            _container: null,

            constructor: function (map, layersInfoSettings, mapIdentifysettings, settings) {
                lang.mixin(this, settings);

                var container = query(this.domSelector);
                if (container.length === 1) {
                    this._container = container[0];
                } else {
                    throw 'There is multiple attributes elements or element was not found';
                }

                this.buildLoader(this._container);

                this._map = map;
                this.layersInfo = new LayersInfo(layersInfoSettings);
                this.mapIdentify = new MapIdentify(map, this.layersInfo, mapIdentifysettings);
                this.mapIdentify.on();

                this._geoJsonGroupLayer = L.geoJson();
                this._map._lmap.addLayer(this._geoJsonGroupLayer);

                this.subscribe();
            },

            subscribe: function () {
                topic.subscribe('attributes/get', lang.hitch(this, function (layerId, featureId) {
                    var updateAttributesBlock = this.updateAttributes(featureId),
                        updateGeometry = this.updateGeometry(layerId, featureId),
                        dl = new DeferredList([updateAttributesBlock, updateGeometry]);

                    dl.then(function () {
                        topic.publish('map/identityUi/unblock');
                    });
                }));

                topic.subscribe('map/identityUi/block', lang.hitch(this, function () {
                    this.showLoader();
                    this._map.showLoader();
                }));

                topic.subscribe('map/identityUi/unblock', lang.hitch(this, function () {
                    this.hideLoader();
                    this._map.hideLoader();
                }));
            },

            updateAttributes: function (featureId) {
                var deferred = new Deferred(),
                    url = this.urlBuilder(featureId);

                xhr.get(url).then(lang.hitch(this, function (content) {
                    this._updateAttributesHtmlBlock(content);
                    deferred.resolve();
                }));

                return deferred;
            },

            _updateAttributesHtmlBlock: function (content) {
                html.set(this._container, content);
            },

            _geoJsonGroupLayer: null,
            updateGeometry: function (layerId, featureId) {
                var deferred = new Deferred();
                deferred.resolve();
                return deferred;
            }
        });
    });