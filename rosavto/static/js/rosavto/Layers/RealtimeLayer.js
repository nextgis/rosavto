define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/Layers/StyledGeoJsonLayer',
    'StompClient'
], function (declare, lang, xhr, StyledGeoJsonLayer, StompClient) {
    return declare('rosavto.RealtimeLayer', [StyledGeoJsonLayer], {
        _debug: false,
        _setDebug: function (debug) {
            this._debug = debug;
        },

        start: function (subscribeUrl) {
            var self = this;

            this._map.on('dragend zoomend', lang.hitch(this, function () {
                this._subscribeForRealtimeLayer(function (message) {
                    self.parseMessage(message);
                }, subscribeUrl);
            }));

            this._subscribeForRealtimeLayer(function (message) {
                self.parseMessage(message);
            }, subscribeUrl);

        },

        stop: function () {
            this._unsubscribeForRealtimeLayer();
        },

        parseMessage: function (message) {
            var body = JSON.parse(message.body);

            if (this._debug) {
                console.log(message.body);
            }

            if (body.geoJson && body.geoJson !== null && body.geoJson.geometry && body.geoJson.properties) {
                this.addObject(body.geoJson, body.type, body.guid);
            } else if (body.geoJson === null) {
                this.removeObject(body.guid);
            }
        },

        _subscribeUrl: {},
        _lastMapBounds: null,
        _lastSubscribedId: null,
        _subscribeForRealtimeLayer: function (callback, subscribeUrl) {
            var bounds = this._map.getBounds(),
                boundsHeaders = {
                    'LatitudeFrom': bounds.getSouth(),
                    'LatitudeTo': bounds.getNorth(),
                    'LongitudeFrom': bounds.getWest(),
                    'LongitudeTo': bounds.getEast()
                };

            if (bounds.equals(this._lastMapBounds)) {
                return;
            }

            this._lastMapBounds = bounds;

            var self = this;
            StompClient.connect().then(function (client) {
                if (self._lastSubscribedId) {
                    client.unsubscribe(self._lastSubscribedId);
                    self._lastSubscribedId = null;
                }
                self._lastSubscribedId = client.subscribe(subscribeUrl, callback, boundsHeaders).id;
            });
        },

        _unsubscribeForRealtimeLayer: function () {
            var self = this;
            if (this._lastSubscribedId) {
                StompClient.connect().then(function (client) {
                    client.unsubscribe(self._lastSubscribedId);
                    self._lastSubscribedId = null;
                });
            }
        }
    });
});