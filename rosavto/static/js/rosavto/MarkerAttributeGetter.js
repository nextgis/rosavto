define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/html',
    'dojo/topic',
    'dojo/request/xhr',
    'rosavto/ParametersVerification'
],
    function (declare, lang, query, html, topic, xhr, ParametersVerification) {
        return declare('rosavto.MarkerAttributeGetter', [ParametersVerification], {
            _container: null,

            constructor: function (settings) {
                this.verificateRequiredParameters(settings, ['map', 'attributesServiceFacade', 'domSelector']);
                lang.mixin(this, settings);

                var container = query(this.domSelector);
                if (container.length === 1) {
                    this._container = container[0];
                } else {
                    throw 'There is multiple attributes elements or element was not found';
                }

                this.subscribe();
            },

            subscribe: function () {
                topic.subscribe('marker/attributes/get', lang.hitch(this, function (featureId) {
                    this.attributesServiceFacade.getAttributesByGuid(featureId, 'MonitoringCard.showCard').then(lang.hitch(this, function (content) {
                        html.set(this._container, content);
                    }));
                }));
            }

        });
    });