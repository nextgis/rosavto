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
    function (declare, array, lang, dojo, html, topic, xhr, Deferred, DeferredList, MapIdentify, NgwServiceFacade, ParametersVerification, Loader) {
        return declare('rosavto.ObjectSelector', [Loader, ParametersVerification], {

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, [
                    'map',
                    'ngwServiceFacade',
                    'attributeGetter',
                    'layersInfo'
                ]);
                lang.mixin(this, settings);
            },

            selectObject: function (keynameLayer, guid) {
                if (!this.map._layersByKeyname[keynameLayer]) {
                    throw new Error('keynameLayer ' + keynameLayer + ' is not found into visible layers.');
                }
            }
        });
    });