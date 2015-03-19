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
        'rosavto/Constants'
    ],
    function (declare, array, lang, dojo, html, topic, xhr, Deferred, DeferredList, MapIdentify, NgwServiceFacade,
              ParametersVerification, Loader, StyledGeoJsonLayer, Constants) {
        return declare('rosavto.ObjectSelector', [Loader, ParametersVerification], {
            _selectedObjectsLayer: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'mapIdentify',
                    'attributeGetter',
                    'layersInfo',
                    'defaultStylesSettings'
                ]);
                lang.mixin(this, settings);
            },

            selectObject: function (keynameLayer, guid) {
                var layer = this.getLayerVisibleByKeyname(keynameLayer);

                if (!layer._layerType) {
                    throw new Error('ObjectSelector: Layer "' + keynameLayer + '" is not contained "_layerType" properties.');
                }

                if (layer._layerType === Constants.TileLayer) {
                    var layerId = this.layersInfo.getLayersIdByKeynames([keynameLayer])[0];
                    this.ngwServiceFacade.getGeometryByGuid(layerId, guid).then(lang.hitch(this, function (geometry) {
                        if (!geometry.features || geometry.features.length < 1) {
                            throw new Error('ObjectSelector: object with guid "' + guid +
                            '" on layer"' + keynameLayer + '" is not found.');
                        }
                        topic.publish('attributes/get', geometry.features[0], this.mapIdentify.fieldIdentify);
                    }));
                }

                if (layer._layerType === Constants.RealtimeLayer) {
                    if (layer.layersById && layer.layersById[guid]) {

                    }
                }

                if (layer._layerType === Constants.SensorsLayer) {

                }
            },

            getLayerVisibleByKeyname: function (keynameLayer) {
                if (this.map._layersByKeyname[keynameLayer]) {
                    return this.map._layersByKeyname[keynameLayer];
                } else {
                    throw new Error('ObjectSelector: keynameLayer ' + keynameLayer + ' is not found into visible layers.');
                }
            }
        });
    });