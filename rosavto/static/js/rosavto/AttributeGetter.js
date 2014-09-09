define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo',
        'dojo/html',
        'dojo/topic',
        'dojo/request/xhr',
        'dojo/Deferred',
        'dojo/DeferredList',
        'rosavto/MapIdentify',
        'rosavto/NgwServiceFacade',
        'rosavto/ParametersVerification',
        'rosavto/Loader',
        'rosavto/Layers/StyledGeoJsonLayer',
        'leaflet/leaflet'
    ],
    function (declare, array, lang, dojo, html, topic, xhr, Deferred, DeferredList, MapIdentify, NgwServiceFacade, ParametersVerification, Loader, StyledGeoJsonLayer, L) {
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
                topic.subscribe('attributes/get', lang.hitch(this, function (feature, fieldIdentify) {
//                    var updateAttributesBlock = this.updateAttributes(feature.properties[fieldIdentify]);

                    this.updateGeometry(feature)
                    topic.publish('map/identityUi/unblock');

//                    updateAttributesBlock.then(function () {
//                        topic.publish('map/identityUi/unblock');
//                    });
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
//                var deferred = new Deferred();
//
//                this.attributesServiceFacade.getAttributesByGuid(featureId, 'Monitoring.fireMapObjectSelected').then(lang.hitch(this, function (content) {
//                    this._updateAttributesHtmlBlock(content);
//                    deferred.resolve();
//                }));
//
//                return deferred;
            },

            _updateAttributesHtmlBlock: function (content) {
                this._cardBody.scrollTop = 0;
                html.set(this._cardInner, content);
            },

            _styledGeoJsonLayer: null,
            updateGeometry: function (feature) {
                var style = this.mapIdentify.layersInfo.getStyleByLayerId(feature.properties.__layer__);
                if (style && style.selectedObjectStyle) {
                    this._styledGeoJsonLayer.clearLayers().clearTypes().addType('selected', style.selectedObjectStyle);
                    this.map._lmap.fitBounds(this._styledGeoJsonLayer.addObject(feature, 'selected', 0).getBounds());
                } else {
                    console.log('style is not found.');
                }
            },

            selectObject: function (layerId, featureId) {
                topic.publish('map/identityUi/block');
                topic.publish('attributes/get', layerId, featureId);
            }
        });
    });