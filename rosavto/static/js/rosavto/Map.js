define([
    'dojo/query',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/request/xhr',
    'rosavto/Loader',
    'leaflet/leaflet',
    'centreit/StorageProvider',
    'dojo/topic',
    'dojox/lang/functional/object',
    'rosavto/EasyPrint',
    'rosavto/Constants',
    'rosavto/LayersInfo'
], function (query, declare, lang, array, xhr, Loader, L, storage, topic, object, EasyPrint, Constants, LayersInfo) {
    return declare('rosavto.Map', [Loader], {
        _lmap: {},
        _baseLayers: {},
        _overlaylayers: {},
        _legend: null,
        _incidentLayer: null,
        _ngwServiceFacade: null,
        _layersByKeyname: {},

        constructor: function (domNode, settings, ngwServiceFacade) {
            this._ngwServiceFacade = ngwServiceFacade;
            if (!settings.zoomControl) {
                settings.zoomControl = false;
            }

            this._lmap = new L.Map(domNode, settings);
            this._lmap.on('layeradd', lang.hitch(this, function (layer) {
                    this.onMapLayerAdded(layer);
                }
            ));
            this._lmap.on('layerremove', lang.hitch(this, function (layer) {
                this.onMapLayerRemoved(layer);
            }));
            this._lmap.on('moveend', this.onMapMoveEnd);

            if (settings.legend) {
                this._legend = L.control.layers(this._baseLayers, this._overlaylayers).addTo(this._lmap);
            }

            this.buildLoader(domNode, 'map');

            topic.subscribe('loader/for/map/hidden', lang.hitch(this, function () {
                this.updateZIndexLayers()
            }));

            storage.then(lang.hitch(this, function (provider) {
                var zoom = provider.get('zoom'), center = provider.get('center');
                if (center) {
                    this._lmap.setView(center, zoom, {reset: true});
                }
            }));

            var component = this;
            topic.subscribe("map/coordinates/restore", function () {
                if (!arguments || !arguments[0] || !arguments[0].lat || !arguments[0].lon || !arguments[0].zoom) {
                    component._lmap.setView(['55.7325', '37.6529'], 10, {reset: true});
                } else {
                    component._lmap.setView([arguments[0].lat, arguments[0].lon], arguments[0].zoom, {reset: true});
                }

            });
            topic.publish("map/created", {created: true});

            topic.subscribe("map/historyDate/change", function () {
                component.historyDate = arguments[0];
                object.forIn(component._lmap._layers, function (layer, key) {
                    if (layer.options && (layer.options.subscribeUrl || layer.options.objectsSubscribedUrl)) {
                        if (component.historyDate) {
                            layer.options.historyDate = component.historyDate;
                        } else {
                            layer.options.historyDate = null;
                        }
                    }
                }, this);
                component._lmap.fire('moveend');  //событие, что перемещения на карте выполнены, т.е. даты для отображения во всех слоях проставлены
            });

            if (settings.easyPrint || settings.easyPrint === 'undefined') {
                new EasyPrint();
                L.easyPrint().addTo(this._lmap);
            }
        },

        _legendBindEvents: function () {
            query(this._legend._overlaysList).on('click', lang.hitch(this, function () {
                this._updateActiveNgwLayers();
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

            ngwTileLayer._layerType = Constants.TileLayer;
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

        addGeoJsonLayer: function (name, geoJsonLayer, keyname) {
            if (keyname) {
                geoJsonLayer.keyname = keyname;
            }
            this._lmap.addLayer(geoJsonLayer);
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

        onMapLayerAdded: function (layerAddedObject) {
            var layer = layerAddedObject.layer;

            if (!layer.keyname) {
                return false;
            }

            this._layersByKeyname[layer.keyname] = layer;

            if (LayersInfo.instance) {
                this.setLayerZIndex(layer);
            }

            storage.then(function (provider) {
                provider.put('mapLayerVisibility-' + layer.keyname, true);
            });
        },

        updateZIndexLayers: function () {
            if (!LayersInfo.instance) {
                return false;
            }

            object.forIn(this._layersByKeyname, function (layer, keyname) {
                this.setLayerZIndex(layer)
            }, this);
        },

        setLayerZIndex: function (layer) {
            var zIndex = LayersInfo.instance.getLayerZIndexByKeyname(layer.keyname);
            if (zIndex && layer.setZIndex) {
                layer.setZIndex(zIndex);
            }
        },

        onMapLayerRemoved: function (layer) {
            var layerKeyname = layer.layer.keyname;
            if (!layerKeyname) {
                return false;
            }

            delete this._layersByKeyname[layerKeyname];
            topic.publish('/map/layer/removed', layerKeyname);

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
        },

        selectObject: function (keynameLayer, guid) {

        }
    });
});