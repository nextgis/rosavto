define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/DeferredList',
    'rosavto/ParametersVerification',
    'rosavto/Loader',
    'rosavto/Layers/StyledGeoJsonLayer'
],
    function (declare, lang, dojo, topic, Deferred, DeferredList, ParametersVerification, Loader, StyledGeoJsonLayer) {
        return declare('rosavto.AttributeGetter', [Loader, ParametersVerification], {
            _cardInner: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'attributesServiceFacade',
                    'cardInnerId',
                    'cardBodyId',
                    'mapIdentify',
                    'stylesSettings'
                ]);
                lang.mixin(this, settings);

                this._cardInner = dojo.byId(this.cardInnerId);
                this._cardBody = dojo.byId(this.cardBodyId);

                this.buildLoader(this._cardInner);

                this._styledGeoJsonLayer = new StyledGeoJsonLayer(null, this.stylesSettings);

                this.map._lmap.addLayer(this._styledGeoJsonLayer);

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
                    this.map.showLoader();
                }));

                topic.subscribe('map/identityUi/unblock', lang.hitch(this, function () {
                    this.hideLoader();
                    this.map.hideLoader();
                }));
            },

            updateAttributes: function (featureId) {
                var deferred = new Deferred();
                topic.publish('map/objectSelected', featureId);
                return deferred;
            },

            _styledGeoJsonLayer: null,
            updateGeometry: function (layerId, featureId) {
                var deferred = new Deferred();


                this.ngwServiceFacade.getGeometryByGuid(layerId, featureId, 4326).then(lang.hitch(this, function (feature) {
                    this._styledGeoJsonLayer.clearLayers();
                    this.map._lmap.fitBounds(this._styledGeoJsonLayer.addObjectByDefaultProperties(feature).getBounds());
                    deferred.resolve();
                }));

                return deferred;
            },

            selectObject: function (layerId, featureId) {
                topic.publish('map/identityUi/block');
                topic.publish('attributes/get', layerId, featureId);
            }
        });
    });
