define([
    'dojo/query',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/Loader',
    'leaflet/leaflet',
    'centreit/StorageProvider',
    'dojo/topic',
    'dojox/lang/functional/object'
], function (query, declare, lang, xhr, Loader, L, storage, topic, object) {
    return declare('rosavto.Map', [Loader], {
        _lmap: {},
        _baseLayers: {},
        _overlaylayers: {},
        _legend: null,
        _incidentLayer: null,
        _ngwServiceFacade: null,
        historyDate: null,

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

            var component = this;
            topic.subscribe("map/coordinates/restore", function () {
                component._lmap.setView([arguments[0].lat, arguments[0].lon], arguments[0].zoom, {reset: true});
            });
            topic.publish("map/created", {created: true});

            topic.subscribe("map/historyDate/change", function () {
                component.historyDate=arguments[0];
                object.forIn(component._lmap._layers, function (layer, key) {
                    if (layer.options && layer.options.subscribeUrl){
                        if (component.historyDate){
                            layer.options.historyDate = component.historyDate;
                        }else{
                            layer.options.historyDate = null;
                        }
                    }
                }, this);
                component._lmap.fire('moveend');  //событие, что перемещения на карте выполнены, т.е. даты для отображения во всех слоях проставлены
            });
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

        addWmsLayer: function (url, name, settings) {
            var wmsLayer = L.tileLayer.wms(url, settings);

            this._lmap.addLayer(wmsLayer);
            this._baseLayers[name] = wmsLayer;
            if (this._legend) {
                this._legend.addBaseLayer(wmsLayer, name);
            }
        },

        addTileLayer: function (name, url, settings) {
            var tileLayer = new L.TileLayer(url, settings);
            this._lmap.addLayer(tileLayer);
            this._baseLayers[name] = tileLayer;
            if (this._legend) {
                this._legend.addBaseLayer(tileLayer, name);
            }
        },

        addNgwTileLayer: function (keyname, name, ngwUrl, idStyle, settings) {
            var ngwTilesUrl = ngwUrl + 'resource/' + idStyle + '/tms?z={z}&x={x}&y={y}',
                ngwTileLayer = new L.TileLayer(ngwTilesUrl, settings);
            ngwTileLayer._ngwStyleId = idStyle;
            ngwTileLayer.keyname = keyname;

            storage.then(lang.hitch(this, function (provider) {
                if (provider.get('mapLayerVisibility-' + ngwTileLayer.keyname) === true) {
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
            var osmUrl = Monitoring.tileUrl,
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
                        if (this._legend) {
                            this._legend.addOverlay(layer, name);
                        }
                    }
                }));
        },

        addGeoJsonLayer: function (keyname, name, geoJsonLayer, disable) {
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

        onMapMoveEnd: function(obj) {
            if (obj && obj.target) {
                storage.then(function () {
                    var zoom = obj.target.getZoom(), center = obj.target.getCenter();
                    if (zoom && center) {
                        topic.publish('map/coordinates/save', {zoom: zoom, lat: center.lat, lon: center.lng});
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
            if (this._customizableGeoJsonLayer) {
                return;
            }
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
            if (!this._customizableGeoJsonLayer) {
                return false;
            }

            this._customizableGeoJsonLayer.addData(data);
        }

    });
});