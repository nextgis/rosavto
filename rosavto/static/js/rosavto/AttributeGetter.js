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
    'rosavto/MapIdentify',
    'rosavto/NgwServiceFacade',
    'rosavto/ParametersVerification',
    'rosavto/Loader'
],
    function (declare, array, lang, query, html, topic, xhr, Deferred, DeferredList, MapIdentify, NgwServiceFacade, ParametersVerification, Loader) {
        return declare('rosavto.AttributeGetter', [Loader, ParametersVerification], {
            _container: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, ['map', 'ngwServiceFacade', 'attributesServiceFacade', 'domSelector', 'mapIdentify']);
                lang.mixin(this, settings);

                var container = query(this.domSelector);
                if (container.length === 1) {
                    this._container = container[0];
                } else {
                    throw 'There is multiple attributes elements or element was not found';
                }

                this.buildLoader(this._container);

                this._geoJsonGroupLayer = L.geoJson(null, {style: lang.hitch(this, function (feature) {
                    return this._getStyle();
                })});
                this.map._lmap.addLayer(this._geoJsonGroupLayer);

                this.subscribe();
            },

            _getStyle: function () {
                if (this.style) {
                    return this.style;
                } else {
                    return {
                        fill: false,
                        color: '#FF0000',
                        weight: 2
                    };
                }
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
                    this.map.showLoader();
                }));

                topic.subscribe('map/identityUi/unblock', lang.hitch(this, function () {
                    this.hideLoader();
                    this.map.hideLoader();
                }));
            },

            updateAttributes: function (featureId) {
                var deferred = new Deferred();

                this.attributesServiceFacade.getAttributesByGuid(featureId, 'cdfffff').then(lang.hitch(this, function (content) {
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


                this.ngwServiceFacade.getGeometryByGuid(layerId, featureId, 4326).then(lang.hitch(this, function (feature) {
                    this._geoJsonGroupLayer.clearLayers();
                    this.map._lmap.fitBounds(this._geoJsonGroupLayer.addData(feature).getBounds());
                    deferred.resolve();
                }));

                return deferred;
            }
        });
    });