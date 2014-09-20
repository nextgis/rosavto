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
            _styledGeoJsonLayer: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'attributesServiceFacade',
                    'mapIdentify',
                    'getHistDate',
                    'defaultStylesSettings'
                ]);
                lang.mixin(this, settings);

                this._styledGeoJsonLayer = new StyledGeoJsonLayer(null, this.defaultStylesSettings);
                this.map._lmap.addLayer(this._styledGeoJsonLayer);

                this.subscribe();
            },

            subscribe: function () {
                topic.subscribe('attributes/get', lang.hitch(this, function (feature, fieldIdentify) {
                    this.updateGeometry(feature);
                    this.updateAttributes(feature.properties[fieldIdentify]);
                    topic.publish('map/identityUi/unblock');
                }));

                topic.subscribe('map/identityUi/block', lang.hitch(this, function () {
                    this.map.showLoader();
                }));

                topic.subscribe('map/identityUi/unblock', lang.hitch(this, function () {
                    this.map.hideLoader();
                }));
            },

            updateAttributes: function (featureId) {
                if (Monitoring) {
                    Monitoring.getApplication().fireEvent('mapObjectSelected', featureId, this.getHistDate());
                }
            },

            updateGeometry: function (feature) {
                var style;

                if (feature.properties.__layer__) {
                    style = this.mapIdentify.layersInfo.getStyleByLayerId(feature.properties.__layer__);
                }

                if (style && style.selectedObjectStyle) {
                    this._styledGeoJsonLayer.clearLayers().clearTypes().addType('selected', style.selectedObjectStyle);
                    this.map._lmap.fitBounds(this._styledGeoJsonLayer.addObject(feature, 'selected', 0).getBounds());
                } else {
                    this._styledGeoJsonLayer.clearLayers().clearTypes().addType('default', this.defaultStylesSettings.style['default']);
                    this.map._lmap.fitBounds(this._styledGeoJsonLayer.addObject(feature, 'default', 0).getBounds());
                    console.log('selected-object-style style is not defined for layer ' + feature.properties.__layer__);
                }
            },

            selectObject: function (layerId, featureId) {
                topic.publish('map/identityUi/block');
                this.ngwServiceFacade.getGeometriesByGuids([layerId], [featureId], this.getHistDate())
                    .then(lang.hitch(this, function (geoJson) {
                        var countFeatures = geoJson.features.length,
                            feature;
                        if (countFeatures > 0) {
                            feature = geoJson.features[0];
                            feature.properties.__layer__ = layerId;
                            this.updateGeometry(feature);
                        }
                        topic.publish('map/identityUi/unblock');
                    }));
            }
        });
    });