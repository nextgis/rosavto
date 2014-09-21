define([
    'dojo/query',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/request/xhr',
    'rosavto/Loader',
    'leaflet/leaflet',
    'centreit/StorageProvider'
], function (query, declare, lang, array, xhr, Loader, L, storage) {
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
            }

            this.buildLoader(domNode);

            storage.then(lang.hitch(this, function (provider) {
                var zoom = provider.get('zoom'), center = provider.get('center');
                if (center) {
                    this._lmap.setView(center, zoom, {reset: true});
                }
            }));

        },

        getVisibleNgwLayers: function () {
            var visibleNgwLayers = [];

            this._lmap.eachLayer(function (layer) {
                if (layer._ngwStyleId) {
                    visibleNgwLayers.push(layer._ngwStyleId);
                }
            }, this);

            return visibleNgwLayers;
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

        addNgwTileLayerWithKeyname: function (keyname, name, ngwUrl, idStyle, settings, callbacks) {
            this.addNgwTileLayer({
                keyname: keyname,
                name: name
            }, ngwUrl, idStyle, settings, callbacks);
        },


        addNgwTileLayer: function (name, ngwUrl, idStyle, settings, callbacks) {
            var ngwTilesUrl = ngwUrl + 'resource/' + idStyle + '/tms?z={z}&x={x}&y={y}',
                ngwTileLayer = new L.TileLayer(ngwTilesUrl, settings);

            ngwTileLayer._ngwStyleId = idStyle;

            if (typeof name !== 'string') {
                ngwTileLayer.keyname = name.keyname;

                storage.then(lang.hitch(this, function (provider) {
                    if (provider.get('mapLayerVisibility-' + ngwTileLayer.keyname) === true) {
                        this._lmap.addLayer(ngwTileLayer);
                    }
                }));

                name = name.name;
            }

            if (callbacks && callbacks.loaded) {
                ngwTileLayer.on('load', function () {
                    callbacks.loaded.call();
                });
            }

            if (callbacks && callbacks.loading) {
                ngwTileLayer.on('loading', function () {
                    callbacks.loading.call();
                });
            }

            this._overlaylayers[name] = ngwTileLayer;
            if (this._legend) {
                this._legend.addOverlay(ngwTileLayer, name);
            }
        },

        addOsmTileLayer: function () {
            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                settingsOsmLayer = {
                    attribution: 'Map data © OpenStreetMap contributors'
                };

            this.addTileLayer('Openstreetmap', osmUrl, settingsOsmLayer);
        },

        addBaseLayers: function (baseLayers) {
            if (!baseLayers.baseLayers || !baseLayers.baseLayers.default_layer) {
                return false;
            }

            var url;

            array.forEach(baseLayers.baseLayers.baselayers, lang.hitch(this, function (baseLayer) {
                url = baseLayer.url;
                if (url && url.indexOf('{x}') > -1) {
                    url = url.replace(/\$/g, '');
                    this.addTileLayer(baseLayer.title, url);
                }
            }));
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

        addStorageGeoJsonLayer: function (keyname, name, geoJsonLayer, disable) {
            disable = disable || false;
            geoJsonLayer.keyname = keyname;
            if (!disable) {
                storage.then(lang.hitch(this, function (provider) {
                    if (provider.get('mapLayerVisibility-' + geoJsonLayer.keyname) !== false) {
                        this._lmap.addLayer(geoJsonLayer);
                    }
                }));
            }
            this._overlaylayers[name] = geoJsonLayer;
            if (this._legend) {
                this._legend.addOverlay(geoJsonLayer, name);
            }
        },

        onMapLayerAdded: function (layer) {
            storage.then(function (provider) {
                provider.put('mapLayerVisibility-' + layer.layer.keyname, true);
            });
        },

        onMapLayerRemoved: function (layer) {
            storage.then(function (provider) {
                provider.put('mapLayerVisibility-' + layer.layer.keyname, false);
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