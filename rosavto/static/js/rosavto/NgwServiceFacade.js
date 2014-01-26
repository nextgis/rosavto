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
            constructor: function (ngwUrlBase, settings) {
                this._ngwUrlBase = ngwUrlBase;

                lang.mixin(this, settings);
            },

            getGeometryByGuid: function (layerId, featureGuid, srs) {
                var url = this._ngwUrlBase + 'layer/' + layerId + '/store_api/rosavto/?guid=' + featureGuid;

                if (srs) {
                    url += '&srs=' + srs;
                }

                return this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: url}}) :
                    xhr(url, {handleAs: 'json', method: 'POST', headers: {'X-Requested-With': 'XMLHttpRequest'}});
            },

            identifyFeaturesByLayers: function (layersIds, wktBounds, srs) {
                var url = this._ngwUrlBase + 'feature_layer/identify',
                    params;

                if (!srs) {
                    srs = 4326;
                }

                params = {
                    layers: layersIds,
                    srs: srs,
                    geom: wktBounds
                };

                return this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: url, params: JSON.stringify(params)}}) :
                    xhr(url, {handleAs: 'json', method: 'POST', data: params, headers: {'X-Requested-With': 'XMLHttpRequest'}});
            },

            getLayersInfo: function () {
                var url = this._ngwUrlBase + 'api/layer_group/0/tree';

                return this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: url}}) :
                    xhr(url, {handleAs: 'json', method: 'POST', headers: {'X-Requested-With': 'XMLHttpRequest'}});
            }
        });
    });