define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'http://cdn.leafletjs.com/leaflet-0.7.1/leaflet-src.js'
], function (declare, lang, xhr) {
    return declare('rosavto.Map', null, {
        _map: {},
        _baseLayers: {},
        _overlaylayers: {},
        _legend: null,

        constructor: function (domNode, settings) {
            if (!settings.zoomControl) {
                settings.zoomControl = false;
            }

            this._map = new L.Map(domNode, settings);

            if (settings.legend) {
                this._legend = L.control.layers(this._baseLayers, this._overlaylayers).addTo(this._map);
            }

            this.addOsmTileLayer();
        },

        addWmsLayer: function (url, name, settings) {
            var wmsLayer = L.tileLayer.wms(url, settings);

            this._map.addLayer(wmsLayer);
            this._baseLayers[name] = wmsLayer;
            if (this._legend) this._legend.addBaseLayer(wmsLayer, name);
        },

        addTileLayer: function (name, url, settings) {
            var tileLayer = new L.TileLayer(url, settings);
            this._map.addLayer(tileLayer);
            this._baseLayers[name] = tileLayer;
            if (this._legend) this._legend.addBaseLayer(tileLayer, name);
        },

        addOsmTileLayer: function () {
            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                settingsOsmLayer = {
                    attribution: 'Map data © OpenStreetMap contributors'
                };

            this.addTileLayer('Openstreetmap', osmUrl, settingsOsmLayer);
        },

        addGeoJsonLayer: function (name, url, style) {
            xhr(application_root + url, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (geoJson) {
                    if (geoJson.features) {
                        var layer = L.geoJson(geoJson.features, {
                            style: style,
                            pointToLayer: function (feature, latlng) {
                                return L.circle(latlng, 25, style);
                            }
                        });

                        layer.addTo(this._map);

                        this._overlaylayers[name] = layer;
                        if (this._legend) this._legend.addOverlay(layer, name);
                    }
                }));
        },

        showObjectAsMarker: function (url, id, isPopup) {
            xhr(application_root + url + id, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (geoJson) {
                    if (geoJson.features) {
                        var layer = new L.geoJson(geoJson.features, {
                            onEachFeature: function (feature, layer) {
                                if (isPopup) {
                                    layer.bindPopup('id: ' + feature.id);
                                }
                            }
                        });
                        this._map.addLayer(layer);
                    }
                }));
        },

        _realTimeLayers: {},
        _subscribeUrl: {},
        addRealtimeLayer: function (layerName, settings) {
            var layer = L.layerGroup([]).addTo(this._map),
                socket = new SockJS(settings.socketUrl),
                client = Stomp.over(socket),
                callback = lang.hitch(this, function (message) {
                    var body = JSON.parse(message.body);
                    this._renderMarker(layerName, body[settings.id], [body.latitude, body.longitude],
                        body[settings.styleField]);
                });

            this._realTimeLayers[layerName] = {
                layer: layer,
                settings: settings,
                markers: {} // Map of markers: id of entity to id of map
            };

            if (this._map.getZoom() >= settings.minVisibleZoom)
                this._subscribeForRealtimeLayer(client, callback, this._realTimeLayers[layerName].settings.subscribeUrl);

            this._map.on('dragend zoomend', lang.hitch(this, function () {
                var realTimeLayer = this._realTimeLayers[layerName];
                if (this._map.getZoom() < realTimeLayer.settings.minVisibleZoom) {
                    realTimeLayer.layer.clearLayers();
                    realTimeLayer.markers = {};
                    this._unsubscribeForRealtimeLayer(client);
                    return;
                }
                this._subscribeForRealtimeLayer(client, callback,
                    realTimeLayer.settings.subscribeUrl);
            }));
        },

        _renderMarker: function (layerName, markerId, latlng, type) {
            var realtimeLayer = this._realTimeLayers[layerName];
            if (!realtimeLayer) return;

            if (realtimeLayer.markers[markerId]) {
                realtimeLayer.layer.getLayer(realtimeLayer.markers[markerId]).setLatLng(latlng);
            } else {
                var marker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: realtimeLayer.settings.styles[type].className
                    })
                });
                realtimeLayer.layer.addLayer(marker);
                realtimeLayer.markers[markerId] = L.stamp(marker);
            }
        },

        _lastMapBounds: null,
        _lastSubscribedId: null,
        _subscribeForRealtimeLayer: function (client, callback, subscribeUrl) {
            var bounds = this._map.getBounds(),
                boundsHeaders = {
                    'LatitudeFrom': bounds.getSouth(),
                    'LatitudeTo': bounds.getNorth(),
                    'LongitudeFrom': bounds.getWest(),
                    'LongitudeTo': bounds.getEast()
                };

            if (bounds.equals(this._lastMapBounds)) return;

            this._lastMapBounds = bounds;

            if (client.connected) {
                client.unsubscribe(this._lastSubscribedId);
                this._lastSubscribedId = client.subscribe(subscribeUrl, callback, boundsHeaders).id;
                return;
            } else {
                client.connect('spring', 'spring', lang.hitch(this, function () {
                    this._lastSubscribedId = client.subscribe(subscribeUrl, callback, boundsHeaders).id;
                }));
            }
        },

        _unsubscribeForRealtimeLayer: function (client) {
            if (this._lastSubscribedId) {
                client.unsubscribe(this._lastSubscribedId);
            }
        }
    });
});