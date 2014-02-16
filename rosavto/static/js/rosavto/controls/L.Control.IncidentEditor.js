define([
    'dojo/_base/lang',
    'dojo/Deferred'
],
    function (lang, Deferred) {
        L.Control.IncidentEditor = L.Control.extend({
            options: {
                position: 'topleft',
                modes: ['point', 'line'],
                activeMode: 'point',
                pointModeText: 'Создать точку происшествия',
                lineModeText: 'Создать отрезок происшествия',
                eraseText: 'Стереть объект',
                editorLayerStyle: {color: '#FF0000', weight: 10, opacity: 0.5 },
                centeredLayerStyle: {opacity: 0.5, weight: 15, color: '#00FF00'},
                callbackDistanceChange: function (data) {
                    console.log('IncidentEditor: ' + JSON.stringify(data));
                },
                ngwServiceFacade: null,
                map: null,
                roadGuid: null,
                idLayer: null
            },

            onAdd: function (map) {
                var incidentName = 'incident-editor',
                    container = L.DomUtil.create('div', incidentName + ' leaflet-bar'),
                    options = this.options,
                    modesCount = options.modes.length,
                    i,
                    modeName;

                if (modesCount > 1) {
                    for (i = 0; i < modesCount; i += 1) {
                        modeName = options.modes[i];
                        this._createButton(options[modeName + 'ModeText'], modeName + '-mode', container, this['_' + modeName + 'ModeTurnOn']);

                        if (modeName === 'line') {
                            this._createEraseButton(container);
                        }
                    }
                } else if (modesCount === 1 && options.modes[0] === 'line') {
                    this._createEraseButton(container);
                }

                this._editorLayer = L.geoJson(null, {
                    style: options.editorLayerStyle,
                    pointToLayer: function (geojson, latlng) {
                        return L.circle(latlng, 10);
                    }
                });
                this._editorLayer.addTo(map);

                this._centeredLayer = L.geoJson(null, {
                    style: options.centeredLayerStyle
                });
                this._centeredLayer.addTo(map);

                map.on('click', lang.hitch(this, function (e) {
                    this._clickHandler(e.latlng);
                }));
                this._markers = [];

                if (modesCount === 1) {
                    options.activeMode = options.modes[0];
                }
                this._setMode(options.activeMode);
                this._clearAll(true);

                return container;
            },

            setMode: function (modeName) {
                this['_' + modeName + 'ModeTurnOn']();
            },

            setRoadGuid: function (guid) {
                this.options.roadGuid = guid;
                this._clearAll();
            },

            _createEraseButton: function (container) {
                this._createButton(this.options.eraseText, 'erase', container, this._clearAll);
            },

            erase: function () {
                this._clearAll();
            },

            _createButton: function (title, className, container, fn) {
                var link = L.DomUtil.create('a', className, container);
                link.href = '#';
                link.title = title;

                L.DomEvent
                    .on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
                    .on(link, 'click', L.DomEvent.stop)
                    .on(link, 'click', fn, this);

                return link;
            },

            _setMode: function (mode) {
                if (mode) {
                    this.options.activeMode = mode;
                }
            },

            _clearAll: function (ignoreCallback) {
                this._clearGeo();

                switch (this.options.activeMode) {
                    case 'point':
                        this._distances = this._getEmptyDistancePoint();
                        break;

                    case 'line':
                        this._distances = {
                            begin: this._getEmptyDistancePoint(),
                            end: this._getEmptyDistancePoint()
                        };
                        break;

                    default:
                        console.log('L.Control.IncidentEditor: "' + this.options.activeMode + '" is not supported.');
                }

                var distance = this._getDistance();
                if (!ignoreCallback) {
                    this.options.callbackDistanceChange.apply(this, [distance]);
                }
            },

            _getEmptyDistancePoint: function () {
                return {
                    guid: null,
                    km: null,
                    m: null,
                    lat: null,
                    lng: null
                };
            },

            _setDistance: function (distance, point) {
                distance.km = point.km;
                distance.m = point.m;
            },

            _getDistance: function () {
                return {
                    mode: this.options.activeMode,
                    distances: this._distances,
                    geometry: this.getGeoJsonData()
                };
            },

            _pointModeTurnOn: function () {
                this._setMode('point');
                this._clearAll();
            },

            _lineModeTurnOn: function () {
                this._setMode('line');
                this._clearAll();
            },

            _clearGeo: function () {
                var markersCount = this._markers.length,
                    i;

                if (markersCount > 0) {
                    for (i = 0; i < markersCount; i += 1) {
                        this._map.removeLayer(this._markers[i]);
                    }
                    this._markers = [];
                }

                if (this._editorLayer) {
                    this._editorLayer.clearLayers();
                }
            },

            _clickHandler: function (latlng) {
                var mode = this.options.activeMode;

                this['_' + mode + 'ClickHandler'](latlng);
            },

            _pointClickHandler: function (latlng) {
                if (this._markers.length === 0) {
                    this.snapMarker(this._createMarker(latlng, this._distances));
                }
            },

            _lineClickHandler: function (latlng) {
                var markersCount = this._markers.length,
                    distance = markersCount === 0 ? this._distances.begin : this._distances.end;
                if (markersCount < 2) {
                    this.snapMarker(this._createMarker(latlng, distance));
                }
            },

            _createMarker: function (latlng, distance) {
                var self = this,
                    marker = new L.Marker(latlng, {
                        draggable: true
                    });

                this._map.addLayer(marker);
                this._markers.push(marker);
                marker.distance = distance;

                marker.distance.guid = this.options.roadGuid;
                marker.distance.lat = marker._latlng.lat;
                marker.distance.lng = marker._latlng.lng;

                marker.on('dragend', function (e) {
                    self.snapMarker(this);
                });

                return marker;
            },

            snapMarker: function (marker) {
                var self = this,
                    options = this.options,
                    xhrPointProjection = this.options.ngwServiceFacade.getPointProjection(
                        options.idLayer,
                        options.roadGuid,
                        marker._latlng.lat,
                        marker._latlng.lng
                    ),
                    xhrLatLngByDistance;

                xhrPointProjection.then(function (data) {
                    if (data.distance) {
                        marker.distance.guid = options.roadGuid;
                        marker.distance.km = Math.floor(data.distance / 1000);
                        marker.distance.m = data.distance - marker.distance.km * 1000;
                        marker.distance.lat = marker._latlng.lat;
                        marker.distance.lng = marker._latlng.lng;

                        xhrLatLngByDistance = options.ngwServiceFacade.getIncident([
                            {
                                layer: options.idLayer,
                                guid: options.roadGuid,
                                distance: {km: marker.distance.km, m: marker.distance.m}
                            }
                        ]);

                        xhrLatLngByDistance.then(function (data) {
                            marker.setLatLng([data.geometry.coordinates[1], data.geometry.coordinates[0]]);

                            if (self.options.activeMode === 'point') {
                                self._rebuildPoint();
                                self.options.callbackDistanceChange(self._getDistance());
                            } else if (self.options.activeMode === 'line') {
                                self._rebuildLine().then(function () {
                                    self.options.callbackDistanceChange(self._getDistance());
                                });
                            }
                        });
                    }
                });
            },

            createMarkersByDistance: function (points) { // points like as [{km: 0, m: 0}]
                var self = this,
                    pointsCount = points.length,
                    options = this.options,
                    point,
                    marker,
                    xhrLatLngByDistance;

                this._clearAll(true);

                if (pointsCount === 1) {
                    this._createMarkerByDistance(points[0]).then(function (marker) {
                        self._map.setView(marker._latlng, 15);
                        self.options.callbackDistanceChange(self._getDistance());
                    });
                }

                if (options.activeMode === 'line' && pointsCount === 2) {
                    xhrLatLngByDistance = this.options.ngwServiceFacade.getIncidentLine(
                        this.options.roadGuid,
                        {distance: points[0]},
                        {distance: points[1]}
                    );

                    xhrLatLngByDistance.then(function (data) {
                        self._editorLayer.addData(data);

                        if (data.geometry && data.geometry.coordinates) {
                            var latlng,
                                markerBegin,
                                markerEnd,
                                lastCoordinatesIndex = data.geometry.coordinates.length - 1;

                            self._setDistance(self._distances.begin, points[0]);
                            self._setDistance(self._distances.end, points[1]);

                            latlng = [data.geometry.coordinates[0][1], data.geometry.coordinates[0][0]];
                            markerBegin = self._createMarker(latlng, self._distances.begin);
                            self._editorLayer.addData(markerBegin.toGeoJSON());


                            latlng = [data.geometry.coordinates[lastCoordinatesIndex][1], data.geometry.coordinates[lastCoordinatesIndex][0]];
                            markerEnd = self._createMarker(latlng, self._distances.end);
                            self._editorLayer.addData(markerEnd.toGeoJSON());
                            self._map.fitBounds(self._editorLayer.getBounds());

                            self.options.callbackDistanceChange(self._getDistance());
                        }
                    });
                }
            },

            _createMarkerByDistance: function (distance) {
                var deferred = new Deferred(),
                    self = this,
                    marker;

                this._latlngByDistance(distance).then(function (latlng) {
                    marker = self._createMarker(latlng, self._distances);
                    self._editorLayer.addData(marker.toGeoJSON());

                    marker.distance.km = distance.km;
                    marker.distance.m = distance.m;
                    marker.distance.guid = self.options.roadGuid;
                    marker.distance.lat = marker._latlng.lat;
                    marker.distance.lng = marker._latlng.lng;

                    deferred.resolve(marker);
                });

                return deferred;
            },

            _latlngByDistance: function (distance) {
                var options = this.options,
                    deferred = new Deferred(),
                    xhrLatLngByDistance;

                xhrLatLngByDistance = options.ngwServiceFacade.getIncident([
                    {
                        layer: options.idLayer,
                        guid: options.roadGuid,
                        distance: {km: distance.km, m: distance.m}
                    }
                ]);

                xhrLatLngByDistance.then(function (data) {
                    deferred.resolve([data.geometry.coordinates[1], data.geometry.coordinates[0]]);
                });

                return deferred;
            },

            _rebuildLine: function () {
                var self = this,
                    markersCount = this._markers.length,
                    xhrGetIncidentLine,
                    deferred = new Deferred();

                if (markersCount < 2) {
                    deferred.resolve();
                    return deferred;
                }

                this._editorLayer.clearLayers();

                xhrGetIncidentLine = this.options.ngwServiceFacade.getIncidentLine(
                    this.options.roadGuid,
                    {distance: this._distances.begin},
                    {distance: this._distances.end}
                );

                xhrGetIncidentLine.then(function (data) {
                    self._editorLayer.addData(data);
                    deferred.resolve();
                });

                return deferred;
            },

            _rebuildPoint: function () {
                this._editorLayer.clearLayers();
                this._editorLayer.addData(this._markers[0].toGeoJSON());
            },

            getGeoJsonData: function () {
                if (this._editorLayer.getLayers().length > 0) {
                    return this._editorLayer.toGeoJSON().features[0];
                } else {
                    return null;
                }
            },

            centerByObject: function (layerId, featureId, timeout) {
                var layer, self;

                this.options.ngwServiceFacade.getGeometryByGuid(layerId, featureId, 4326).then(lang.hitch(this, function (feature) {
                    self = this;

                    this._centeredLayer.addData(feature);

                    this._map.fitBounds(this._centeredLayer.getBounds());

                    if (timeout) {
                        setTimeout(function () {
                            self._centeredLayer.clearLayers();
                        }, timeout);
                    } else {
                        this._centeredLayer.clearLayers();
                    }
                }));
            }
        });
    });




