define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr'
],
    function (declare, lang, xhr) {
        return declare('rosavto.NgwServiceFacade', null, {
            constructor: function (ngwUrlBase, settings) {
                this._ngwUrlBase = ngwUrlBase;

                lang.mixin(this, settings);
            },

            getGeometryByGuid: function (layerId, featureGuid, srs) {
                var url = 'geocollection/rosavto?layers=' + layerId + '&guids=' + featureGuid;

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


            getResourceInfo: function (idResource) {
                var url = 'resource/' + idResource + '/child/';

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

                    url = 'layer/' + point.layer + '/rosavto/getlrposbyuuid?guid=' + point.guid +
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

                    url = 'layer/' + incidentPoints[0].layer + '/rosavto/getlrposbyuuid?srs=' + srs;
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
            },


            getPointProjection: function (idLayer, guid, lat, lon) {
                var url = 'layer/' + idLayer + '/rosavto/getlrdistbyuuid?guid=' + guid +
                    '&lon=' + lon +
                    '&lat=' + lat;

                return xhr(this._ngwUrlBase + url, {handleAs: 'json', method: 'GET', data: {url: this._ngwUrlBase + url}});
            }
        });
    });