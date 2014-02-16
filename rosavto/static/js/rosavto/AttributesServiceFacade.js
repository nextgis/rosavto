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
        return declare('rosavto.NgwServiceFacade', null, {
            constructor: function (attributesServiceUrlBase, settings) {
                this._attributesServiceUrlBase = attributesServiceUrlBase;

                lang.mixin(this, settings);
            },

            getAttributesByGuid: function (featureGuid, callback) {
                var url = 'gis/description?guid=' + featureGuid;

                if (callback) {
                    url += '&callback=' + callback;
                }

                return xhr(this._attributesServiceUrlBase + url, {
                    handleAs: 'text',
                    method: 'POST',
                    data: {
                        guids: featureGuid
                    }});
            }
        });
    });