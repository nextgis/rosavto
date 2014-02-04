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
                var url = 'layer/' + layerId + '/store_api/rosavto/?guid=' + featureGuid;

                if (srs) {
                    url += '&srs=' + srs;
                }

                return xhr(this._ngwUrlBase + url, {handleAs: 'json', method: 'GET'});
            },

            identifyFeaturesByLayers: function (layersIds, wktBounds, srs) {
                var url = 'feature_layer/identify',
                    params;

                if (!srs) {
                    srs = 4326;
                }

                params = {
                    layers: layersIds,
                    srs: srs,
                    geom: wktBounds
                };

                return xhr(this._ngwUrlBase + url, {
                    handleAs: 'json',
                    method: 'POST',
                    data: JSON.stringify(params)
                });
            },


            getLayersInfo: function () {
                var url = 'api/layer_group/0/tree';

                return xhr(this._ngwUrlBase + url, {handleAs: 'json', method: 'GET'});
            },


            getIncident: function (incidentPoints, srs) {
                var countsPoints = incidentPoints.length,
                    url,
                    point,
                    distance,
                    pointsParams,
                    i;

                if (!srs) {
                    srs = 4326;
                }

                if (countsPoints === 1) {
                    point = incidentPoints[0];

                    url = 'layer/' + point.layer + '/store_api/rosavto/?guid=' + point.guid +
                        '&distance=' + this._calculateDistanceInMeters(point) +
                        '&srs=' + srs;

                    return xhr(this._ngwUrlBase + url, {handleAs: 'json', method: 'GET', data: {url: this._ngwUrlBase + url}});
                }

                if (countsPoints > 1) {
                    pointsParams = [];

                    for (i = 0; i < countsPoints; i += 1) {
                        pointsParams.push({
                            guid: incidentPoints[i].guid,
                            layer: incidentPoints[i].layer,
                            distance: this._calculateDistanceInMeters(incidentPoints[i])
                        });
                    }

                    url = 'layer/17/store_api/rosavto/?' + 'srs=' + srs;
                    return xhr(this.proxy + url, {
                        handleAs: 'json',
                        method: 'POST',
                        data: {
                            url: this._ngwUrlBase + url,
                            params: JSON.stringify({points: pointsParams})
                        }
                    });
                }
            },


            _calculateDistanceInMeters: function (point) {
                var distance = 0;
                if (point.distance['km']) {
                    distance += point.distance['km'] * 1000;
                }
                if (point.distance['m']) {
                    distance += point.distance['m'];
                }
                return distance;
            },


            getIncidentLine: function (guid, pointStart, pointFinish, srs) {
                var url;

                if (!srs) {
                    srs = 4326;
                }

                url = 'layer/17/rosavto/getlrsublinebyuuid?guid=' + guid +
                    '&first=' + this._calculateDistanceInMeters(pointStart) +
                    '&last=' + this._calculateDistanceInMeters(pointFinish) +
                    '&step=1000' +
                    '&srs=' + srs;

                return xhr(this._ngwUrlBase + url, {handleAs: 'json', method: 'GET', data: {url: this._ngwUrlBase + url}});
            }
        });
    });