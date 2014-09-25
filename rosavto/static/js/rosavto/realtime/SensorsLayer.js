define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojox/lang/functional/object',
    'dojo/topic',
    'dojo/dom-class',
    'mustache/mustache',
    'rosavto/realtime/Subscriber',
    'rosavto/Layers/MarkersStateClusterLayer',
    'rosavto/ParametersVerification'
], function (declare, lang, array, funcObject, topic, domClass, mustache, Subscriber, MarkersStateClusterLayer, ParametersVerification) {
    return declare('rosavto.SensorsLayer', [MarkersStateClusterLayer, ParametersVerification], {

        constructor: function (settings) {
            var self = this;

            this.verificateRequiredParameters(settings, [
                'objectsSubscribedUrl',
                'getHistDate',
                'sensorsSubscribesUrl'
            ]);
            lang.mixin(this, settings);

            this._layersSubsriber = new Subscriber({
                subscribeUrl: this.objectsSubscribedUrl,
                getHeaders: lang.hitch(this, this._getHeadersForLayers),
                parseMessage: lang.hitch(this, this._buildMarkers)
            });

            this._createSensorsSubscribers(this.sensorsSubscribesUrl);

            mustache.parse(this._popupTemplate);
        },

        _sensorsSubscribers: {},
        _createSensorsSubscribers: function (sensorsSubscribersSettings) {
            var layerTypeName;
            for (layerTypeName in sensorsSubscribersSettings) {
                if (sensorsSubscribersSettings.hasOwnProperty(layerTypeName)) {
                    this._sensorsSubscribers[layerTypeName] = new Subscriber({
                        _layerTypeName: layerTypeName,
                        subscribeUrl: sensorsSubscribersSettings[layerTypeName],
                        getHeaders: lang.hitch(this, function (subscriber) {
                            return this._getHeadersForSensors(subscriber);
                        }),
                        parseMessage: lang.hitch(this, this._buildPopups)
                    });
                }
            }
        },

        _getHeadersForSensors: function (subscriber) {
            var stations = [],
                arrayIsEmpty = true,
                layerTypeName = subscriber._layerTypeName,
                markerGuid;

            if (this._markersWithPopup[layerTypeName]) {
                for (markerGuid in this._markersWithPopup[layerTypeName]) {
                    if (this._markersWithPopup[layerTypeName].hasOwnProperty(markerGuid)) {
                        stations.push(markerGuid);
                        if (arrayIsEmpty) {
                            arrayIsEmpty = false;
                        }
                    }
                }
            }

            return {
                'stations': arrayIsEmpty ? '[]' : stations,
                'sensorTypes': this._activatedSensors[layerTypeName],
                'historyDate': this.getHistDate()
            };
        },

        _activatedLayers: [],
        _layersSubsriber: [],
        _activatedSensors: null,
        activateLayers: function (layers) {
            var isLayersExists = false,
                layer;

            this._activatedLayers = [];
            for (layer in layers) {
                if (layers.hasOwnProperty(layer)) {
                    this._activatedLayers.push(layer);
                    isLayersExists = true;
                }
            }

            this._setActivatedSensors(layers);

            if (isLayersExists) {
                this._hookMap(this._map);
            } else {
                this._unhookMap(this._map);
            }

            this._map.addLayer(this._popupsLayer);
        },

        _setActivatedSensors: function (layersObject) {
            var layerType;

            this._activatedSensors = {};

            for (layerType in layersObject) {
                if (layersObject.hasOwnProperty(layerType)) {
                    if (layersObject[layerType] && layersObject[layerType].length > 0) {
                        if (!this._activatedSensors[layerType]) {
                            this._activatedSensors[layerType] = [];
                        }
                        this._activatedSensors[layerType] = layersObject[layerType];
                    }
                }
            }
        },

        addSensors: function (layerTypeName, sensors) {
            this.addLayerType(layerTypeName);
            if (!sensors || sensors.length === 0) {
                delete this._activatedSensors[layerTypeName];
            } else {
                this._activatedSensors[layerTypeName] = sensors;
            }
        },

//        addSensor: function (objectType, sensorName) {
//
//        },
//
//        removeSensors: function (objectType, sensors) {
//
//        },
//
//        removeSensor: function (objectType, sensorName) {
//
//        },

        addLayerType: function (layerTypeName) {
            var initialActivatedLayersCount = this._activatedLayers.length,
                indexLayerType = array.indexOf(this._activatedLayers, layerTypeName);

            if (indexLayerType === -1) {
                this._activatedLayers.push(layerTypeName);
            }

            if (initialActivatedLayersCount < 1) {
                this._hookMap(this._map);
            }
        },

        removeLayerType: function (layerTypeName) {
            var indexLayerType = array.indexOf(this._activatedLayers, layerTypeName);

            if (indexLayerType !== -1) {
                this._activatedLayers.splice(indexLayerType, 1);
            }

            if (this._activatedSensors[layerTypeName]) {
                delete this._activatedSensors[layerTypeName];
            }

            if (this._sensorsSubscribers[layerTypeName]) {
                this._sensorsSubscribers[layerTypeName].unsubscribe();
            }

            if (this._activatedLayers.length < 1) {
                this._unhookMap(this._map);
            }
        },

        _getHeadersForLayers: function (subscriber) {
            var bounds = this._map.getBounds(),
            // Добавляем к видимой области слоя по 10% с каждой стороны
                widthDelta = (bounds.getEast() - bounds.getWest()) * 0.1,
                heightDelta = (bounds.getNorth() - bounds.getSouth()) * 0.1;

            return {
                'LatitudeFrom': bounds.getSouth(),
                'LatitudeTo': bounds.getNorth(),
                'LongitudeFrom': bounds.getWest(),
                'LongitudeTo': bounds.getEast(),
                'ObjectTypes': this._activatedLayers
            };
        },

        _markers: {},
        _markerSelected: null,
        _buildMarkers: function (json) {
            var isSelectedFound = false,
                markerSelectedExist = this._markerSelected !== null,
                markerSelected = this._markerSelected,
                isMarkersVisibleExists = !this._isEmpty(this._markers),
                markerExisted,
                sensorsObjects,
                newMarker;

            if (json && json.body) {
                sensorsObjects = JSON.parse(json.body);
                array.forEach(sensorsObjects, function (sensor) {
                    if (!sensor.latitude || !sensor.latitude) {
                        console.log('sensor "' + sensor.guid + '" is not have coordinates');
                        return;
                    }

                    if (isMarkersVisibleExists) {
                        markerExisted = this._markers[sensor.guid];
                        this.removeLayer(markerExisted);
                    }

                    if (markerSelectedExist && !isSelectedFound && markerSelected.guid === sensor.guid) {
                        newMarker = this._createSensorMarker(sensor);
                        this.addMarker(newMarker);
                        this._markerSelected = newMarker;
                        if (this._markerSelected._icon) {
                            domClass.add(this._markerSelected._icon, 'selected');
                        }
                        isSelectedFound = true;
                        this._markers[this._markerSelected.guid] = this._markerSelected;
                        return;
                    }

                    newMarker = this._createSensorMarker(sensor);
                    this.addMarker(newMarker);
                    this._markers[newMarker.guid] = newMarker;
                }, this);
            }

            var gridUnclustered = this._gridUnclustered[this._map.getZoom()]._grid;
            array.forEach(funcObject.values(gridUnclustered), function (cell) {
                array.forEach(funcObject.values(cell), function (objectsList) {
                    array.forEach(objectsList, function (object) {
                        if (object.guid) {
                            this._oneMarkerCreated(object);
                        }
                    }, this);
                }, this);
            }, this);

            if (this._isNewSetData) {
                this._isNewSetData = false;
                this._subscribeSensorsSubscribes();
            }
        },

        _createSensorMarker: function (sensor) {
            var icon = L.divIcon(this.layersStyles[sensor.type][sensor.alarmState]),
                marker = L.marker(new L.LatLng(sensor.latitude, sensor.longitude), {
                    icon: icon
                });
            marker.state = sensor.alarmState;
            marker.type = sensor.type;
            marker.guid = sensor.guid;
            this._markerBindEvents(marker);
            this._markers[sensor.guid] = marker;
            return marker;
        },

        _markerBindEvents: function (marker) {
            marker.on('click', function (e) {
                if (this._markerSelected && this._markerSelected._icon) {
                    domClass.remove(this._markerSelected._icon, 'selected');
                }
                this._markerSelected = e.target;
                domClass.add(this._markerSelected._icon, 'selected');

                if (Monitoring) {
                    Monitoring.getApplication().fireEvent('mapObjectSelected', this._markerSelected.guid, this.getHistDate());
                }
            }, this);
        },

        _markersWithPopup: {},
        _markersWithPopupById: {},
        _oneMarkerCreated: function (marker) {
            if (!this._sensorsSubscribers[marker.type]) {
                return false;
            }

            if (!this._markersWithPopup[marker.type]) {
                this._markersWithPopup[marker.type] = {};
            }
            this._markersWithPopup[marker.type][marker.guid] = marker;
            this._markersWithPopupById[marker.guid] = marker;
        },

        _popupsLayer: L.featureGroup(null),
        _buildPopups: function (json) {
            var sensorsJsonData,
                sensorsData,
                stationGuid,
                markerStation,
                popup, contentPopup;

            if (json && json.body) {
                console.log(JSON.parse(json.body));

                sensorsJsonData = JSON.parse(json.body)[0];

                if (sensorsJsonData.kind === 'Signal') {
                    sensorsData = sensorsJsonData.data;
                    array.forEach(sensorsData, function (stationData) {
                        stationGuid = stationData.station;
                        markerStation = this._markersWithPopupById[stationGuid];
                        contentPopup = mustache.render(this._popupTemplate,
                            {
                                guid: stationGuid,
                                sensors: this._createSensorsArrayForPopup(markerStation, stationData.sensors)
                            });
                        popup = L.popup().setLatLng(markerStation.getLatLng()).setContent(contentPopup);
                        this._popupsLayer.addLayer(popup);
                        console.log(contentPopup);
                    }, this);
                }
            }
        },

        _popupTemplate: '<div id="{{guid}}" class="sensorsPopup"><table>{{#sensors}}</tr>{{#values}}<td><div class="background {{alarmState}}"></div><div class="icon-sensor {{type}}"></div></td>{{/values}}</tr>{{/sensors}}</table></div>',
        _createSensorsArrayForPopup: function (markerStation, sensors) {
            var sensorsForTemplate = [],
                sensorsDataBySensorName = {},
                startIndex, currentTrArray;

            array.forEach(sensors, function (sensor) {
                sensorsDataBySensorName[sensor.type] = sensor;
            }, this);

            startIndex = 0;
            array.forEach(this._activatedSensors[markerStation.type], function (sensor, index) {
                if (index === 0 || (index - startIndex) === 4) {
                    currentTrArray = [];
                    sensorsForTemplate.push({values: currentTrArray});
                    startIndex = index;
                }
                currentTrArray.push(sensorsDataBySensorName[sensor]);
            }, this);

            return sensorsForTemplate;
        },

        _isNewSetData: false,
        _clearAll: function () {
            this._markers = {};
            this._markersWithPopup = {};
            this._markersWithPopupById = {};
            this._isNewSetData = true;
            this.clearLayers();
            this._popupsLayer.clearLayers();
        },

        _setDebug: function (debug) {
            this._debug = debug;
        },

        onAdd: function (map) {
            MarkersStateClusterLayer.prototype.onAdd.call(this, map);
        },

        onRemove: function (map) {
            this._unhookMap(map);
            MarkersStateClusterLayer.prototype.onRemove.call(this, map);
        },

        _hookMap: function (map) {
            map.on('moveend zoomend', function () {
                this._clearAll();
                this._layersSubsriber.subscribe();
            }, this);
            this._clearAll();
            this._layersSubsriber.subscribe();
        },

        _queueMoveendEvents: [],
        _unhookMap: function (map) {
            map.off('moveend zoomend', function () {
                this._clearAll();
                this._layersSubsriber.subscribe();
            }, this);
            this._layersSubsriber.unsubscribe();
            this._unsubscribeSensorsSubscribes();
        },

        _unsubscribeSensorsSubscribes: function () {
            var sensorSubscribe;

            if (!this._isEmpty(this._sensorsSubscribers)) {
                for (sensorSubscribe in this._sensorsSubscribers) {
                    if (this._sensorsSubscribers.hasOwnProperty(sensorSubscribe)) {
                        this._sensorsSubscribers[sensorSubscribe].unsubscribe();
                    }
                }
            }
        },

        _subscribeSensorsSubscribes: function () {
            var layerTypeName;

            for (layerTypeName in this._activatedSensors) {
                if (this._activatedSensors.hasOwnProperty(layerTypeName)) {
                    if (this._activatedSensors[layerTypeName] && this._activatedSensors[layerTypeName].length > 0) {
                        this._sensorsSubscribers[layerTypeName].subscribe();
                    }
                }
            }
        },

        _isEmpty: function (object) {
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    return false;
                }
            }
            return true;
        }
    });
})