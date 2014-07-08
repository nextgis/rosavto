define([
    'dojo/query',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/Loader',
    'leaflet/leaflet',
    'centreit/StorageProvider'
], function (query, declare, lang, xhr, Loader, L, storage) {
    return declare('rosavto.Map', [Loader], {
        _lmap: {},
        _baseLayers: {},
        _overlaylayers: {},
        _legend: null,
        _incidentLayer: null,
        _ngwServiceFacade: null,

        constructor: function (domNode, settings, ngwServiceFacade) {
            this._ngwServiceFacade = ngwServiceFacade;
            if (!settings.zoomControl) {
                settings.zoomControl = false;
            }

            this._lmap = new L.Map(domNode, settings);
            this._lmap.on('layeradd', this.onMapLayerAdded);
            this._lmap.on('layerremove', this.onMapLayerRemoved);
            this._lmap.on('moveend', this.onMapMoveEnd);

            if (settings.legend) {
                this._legend = L.control.layers(this._baseLayers, this._overlaylayers).addTo(this._lmap);
                this._legendBindEvents();
            }

            this.buildLoader(domNode);

            this.addOsmTileLayer();

            storage.then(lang.hitch(this, function (provider) {
                var zoom = provider.get('zoom'), center = provider.get('center');
                if (center) {
                    this._lmap.setView(center, zoom, {reset: true});
                }
            }));

        },

        _legendBindEvents: function () {
            query(this._legend._overlaysList).on('click', lang.hitch(this, function () {
                this._updateActiveNgwLayers();
            }));
        },

        _visibleNgwLayers: [],
        _updateActiveNgwLayers: function () {
            var layerLeafletId,
                layer;

            this._visibleNgwLayers = [];

            for (layerLeafletId in this._legend._layers) {
                if (this._legend._layers.hasOwnProperty(layerLeafletId)) {
                    layer = this._legend._layers[layerLeafletId].layer;

                    if (layer._ngwStyleId) {
                        if (this._lmap.hasLayer(layer)) {
                            this._visibleNgwLayers.push(layer._ngwStyleId);
                        }
                    }
                }
            }
        },

        getVisibleNgwLayers: function () {
            return this._visibleNgwLayers;
        },

        getLMap: function () {
            return this._lmap;
        },

        addVectorLayer: function (layer, name) {
            this._lmap.addLayer(layer);

            this._overlaylayers[name] = layer;
            if (this._legend) {
                this._legend.addOverlay(layer, name);
            }
        },

        addWmsLayer: function (url, name, settings) {
            var wmsLayer = L.tileLayer.wms(url, settings);

            this._lmap.addLayer(wmsLayer);
            this._baseLayers[name] = wmsLayer;
            if (this._legend)
                this._legend.addBaseLayer(wmsLayer, name);
        },

        addTileLayer: function (name, url, settings) {
            var tileLayer = new L.TileLayer(url, settings);
            this._lmap.addLayer(tileLayer);
            this._baseLayers[name] = tileLayer;
            if (this._legend)
                this._legend.addBaseLayer(tileLayer, name);
        },

        addNgwTileLayer: function (name, ngwUrl, idStyle, settings) {
            var ngwTilesUrl = ngwUrl + 'resource/' + idStyle + '/tms?z={z}&x={x}&y={y}',
                ngwTileLayer = new L.TileLayer(ngwTilesUrl, settings);
            ngwTileLayer._ngwStyleId = idStyle;

            storage.then(lang.hitch(this, function (provider) {
                if (provider.get('mapLayerVisibility-' + ngwTileLayer._ngwStyleId) === true) {
                    this._lmap.addLayer(ngwTileLayer);
                }
            }));

            this._overlaylayers[name] = ngwTileLayer;
            if (this._legend) {
                this._legend.addOverlay(ngwTileLayer, name);
            }
            this._visibleNgwLayers.push(ngwTileLayer._ngwStyleId);
        },

        addOsmTileLayer: function () {
            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                settingsOsmLayer = {
                    attribution: 'Map data © OpenStreetMap contributors'
                };

            this.addTileLayer('Openstreetmap', osmUrl, settingsOsmLayer);
        },

        createGeoJsonLayer: function (name, url, style) {
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

                        layer.addTo(this._lmap);

                        this._overlaylayers[name] = layer;
                        if (this._legend)
                            this._legend.addOverlay(layer, name);
                    }
                }));
        },

        addGeoJsonLayer: function (name, geoJsonLayer) {
            geoJsonLayer.addTo(this._lmap);
            this._overlaylayers[name] = geoJsonLayer;
            if (this._legend)
                this._legend.addOverlay(geoJsonLayer, name);
        },

        onMapLayerAdded: function (layer) {
            storage.then(function (provider) {
                provider.put('mapLayerVisibility-' + layer.layer._ngwStyleId, true);
            });
        },

        onMapLayerRemoved: function (layer) {
            storage.then(function (provider) {
                provider.put('mapLayerVisibility-' + layer.layer._ngwStyleId, false);
            });
        },

        onMapMoveEnd: function (obj) {
            if (obj && obj.target) {
                storage.then(function (provider) {
                    var zoom = obj.target.getZoom(), center = obj.target.getCenter();
                    if (zoom) {
                        provider.put('zoom', zoom);
                    }
                    if (center) {
                        provider.put('center', [center.lat, center.lng]);
                    }
                });
            }
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
                        this._lmap.addLayer(layer);
                    }
                }));
        },

        _customizableGeoJsonLayer: null,
        createCustomizableGeoJsonLayer: function (styles, callback) {
            if (this._customizableGeoJsonLayer)
                return;

            var type,
                style,
                marker;

            this._customizableGeoJsonLayer = new L.GeoJSON(null, {
                pointToLayer: function (feature, latLng) {
                    type = feature.properties.type;
                    style = styles[type];

                    if (style['Point'] && feature.geometry.type === 'Point') {
                        marker = L.marker(latLng, {icon: L.divIcon(style['Point'])});
                        return marker;
                    }
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function (e) {
                        callback.call(this.feature, e);
                    });
                }
            });

            this._lmap.addLayer(this._customizableGeoJsonLayer);
        },

        addCustomizableGeoJsonData: function (data) {
            if (!this._customizableGeoJsonLayer)
                return false;

            this._customizableGeoJsonLayer.addData(data);
        }


    });
});