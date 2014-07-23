define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr'
],
    function (declare, lang, xhr) {
        return declare('rosavto.NgwServiceFacade', null, {
            constructor: function (attributesServiceUrlBase, settings) {
                this._attributesServiceUrlBase = attributesServiceUrlBase;

                lang.mixin(this, settings);
            },

            getAttributesByGuid: function (featureGuid, callback) {
                var url = 'gis/card?guid=' + featureGuid;

                if (callback) {
                    url += '&callback=' + callback;
                }

                return xhr(this._attributesServiceUrlBase + url, {handleAs: 'text', method: 'GET'});
            }
        });
    });
