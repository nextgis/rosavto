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
                //убрал monitoring-web/
                var url = 'gis/card?guid=' + featureGuid;

                if (callback) {
                    url += '&callback=' + callback;
                }
                //убрал параметр url, поменял post на get, дополнил proxy url
                return this.proxy ? xhr(this.proxy + url, {handleAs: 'text', method: 'GET'}) :
                    xhr(this._attributesServiceUrlBase + url, {handleAs: 'text', method: 'GET', headers: {'X-Requested-With': 'XMLHttpRequest'}});
            }
        });
    });