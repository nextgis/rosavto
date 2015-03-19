define([
    'dojo/_base/declare',
    'dojo/on',
    'dojo/query',
    'dojo/dom',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojox/lang/functional/object',
    'dojo/topic',
    'dojo/dom-class',
    'mustache/mustache',
    'rosavto/realtime/Subscriber',
    'rosavto/Layers/MarkersStateClusterLayer',
    'rosavto/ParametersVerification',
    'rosavto/Constants',
    'centreit/DragAndDrop'
], function (declare, on, query, dom, lang, array, funcObject, topic, domClass, mustache, Subscriber,
             MarkersStateClusterLayer,
             ParametersVerification, Constants, DnD) {
    return declare('rosavto.SensorsLayer', [MarkersStateClusterLayer, ParametersVerification], {

        constructor: function (settings) {

            this.verificateRequiredParameters(settings, [
                'objectsSubscribedUrl',
                'getHistDate',
                'sensorsSubscribesUrl'
            ]);

            lang.mixin(this, settings);
            this._setDefaultKeyname();
            this._layerType = Constants.SensorsLayer;

            this._layersSubsriber = new Subscriber({
                subscribeUrl: this.objectsSubscribedUrl,
                getHeaders: lang.hitch(this, this._getHeadersForLayers),
                parseMessage: lang.hitch(this, this._buildMarkers)
            });

            this._createSensorsSubscribers(this.sensorsSubscribesUrl);

            mustache.parse(this._popupTemplate);

            topic.subscribe("map/events/select/marker", lang.hitch(this, function (LAYER_TYPE, markerId) {
                if (LAYER_TYPE !== Constants.SensorsLayer && this._markerSelected) {
                    domClass.remove(this._markerSelected._icon, 'selected');
                    this._markerSelected = null;
                }
            }));

            this._onSpiderfyBindEvents();
        },

        _setDefaultKeyname: function () {
            if (!this.keyname) {
                this.keyname = 'sensorsLayer';
            }
        },

        _onSpiderfyBindEvents: function () {
            var markerId, markers, marker;

            this.on('spiderfied', function (e) {
                markers = e.target._markers;
                for (markerId in markers) {
                    if (markers.hasOwnProperty(markerId)) {
                        marker = markers[markerId];
                        this._onDndEvent(marker);
                    }
                }
            }, this);
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
                isLayerHooked = this._activatedLayers.length > 0,
                layer;

            if (!this._map.hasLayer(this._popupsLayer)) {
                this._map.addLayer(this._popupsLayer);
            }

            this._activatedLayers = [];
            for (layer in layers) {
                if (layers.hasOwnProperty(layer)) {
                    this._activatedLayers.push(layer);
                    isLayersExists = true;
                }
            }

            this._setActivatedSensors(layers);

            if (isLayersExists && !isLayerHooked) {
                this._hookMap(this._map);
            } else if (isLayersExists && isLayerHooked) {
                this._rebuildLayer();
            } else if (!isLayersExists) {
                this._unhookMap(this._map);
            }
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
            var isLayerHooked = this._activatedLayers.length > 0;

            this._addLayerType(layerTypeName);
            if (!sensors || sensors.length === 0) {
                delete this._activatedSensors[layerTypeName];
            } else {
                this._activatedSensors[layerTypeName] = sensors;
            }

            if (isLayerHooked) {
                this._rebuildLayer();
            } else {
                this._hookMap(this._map);
            }
        },

        _addLayerType: function (layerTypeName) {
            var indexLayerType = array.indexOf(this._activatedLayers, layerTypeName);

            if (indexLayerType === -1) {
                this._activatedLayers.push(layerTypeName);
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
            } else {
                this._rebuildLayer();
            }
        },

        _getHeadersForLayers: function (subscriber) {
            var bounds = this._map.getBounds();

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
                if (this._debug) {
                    console.log(sensorsObjects);
                }
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
                        this._markerSelected = newMarker;
                        if (this._markerSelected._icon) {
                            domClass.add(this._markerSelected._icon, 'selected');
                        }
                        isSelectedFound = true;
                        this._markers[this._markerSelected.guid] = this._markerSelected;
                        return;
                    }

                    newMarker = this._createSensorMarker(sensor);
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
            this._markers[sensor.guid] = marker;
            this.addMarker(marker);
            this._markerBindEvents(marker);
            return marker;
        },

        _markerBindEvents: function (marker) {
            marker.on('click', function (e) {
                this._selectMarker(e.target);
            }, this);

            if (marker._icon) {
                this._onDndEvent(marker);
            }
        },

        _onDndEvent: function (marker) {
            on(marker._icon, 'mousedown', lang.hitch(this, function (e) {
                if (e.which === 1) {
                    DnD.onDragStart(e.target, {
                        objectGuid: marker.guid,
                        type: marker.type,
                        historyDate: this.getHistDate()
                    });
                    e.stopPropagation();
                }
            }));

            on(marker._icon, 'mouseup', lang.hitch(this, function (e) {

                if (e.which === 1) {
                    if (DnD.dragStart === false) {
                        this._selectMarker(marker);
                    } else {
                        if (DnD.dragElement) {
                            DnD.dragElement.remove();
                        }
                    }
                }
            }));
        },

        _selectMarker: function (markerSelected) {
            if (this._markerSelected && this._markerSelected._icon) {
                domClass.remove(this._markerSelected._icon, 'selected');
            }
            this._markerSelected = markerSelected;
            domClass.add(this._markerSelected._icon, 'selected');

            if (Monitoring) {
                Monitoring.getApplication().fireEvent('mapObjectSelected', this._markerSelected.guid, this.getHistDate());
            }

            topic.publish('map/events/select/marker', Constants.SensorsLayer, this._markerSelected.guid);
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
        _popupTemplate: '<div id={{guid}} class=sensorsPopup><table>{{#sensors}}<tr>{{#values}} {{#is_temp}}<td class=Temperature>{{#sensor}}<div class="{{.}} sensor"><div class=background></div></div>{{/sensor}}{{/is_temp}} {{^is_temp}}<td class={{sensor}}><div class=background></div><div class=icon-sensor></div>{{/is_temp}} {{/values}}{{/sensors}}</table></div>',
        _buildPopups: function (json) {
            var sensorsJsonData,
                sensorsStatesData,
                sensorsValuesData,
                stationGuid,
                markerStation,
                htmlPopup,
                sensorTdHtml;

            if (this._isEmpty(this._markersWithPopupById)) {
                return false;
            }

            if (json && json.body) {
                sensorsJsonData = JSON.parse(json.body)[0];

                if (sensorsJsonData.kind === 'Signal') {
                    sensorsStatesData = sensorsJsonData.data;
                    array.forEach(sensorsStatesData, function (stationData) {
                        stationGuid = stationData.station;
                        markerStation = this._markersWithPopupById[stationGuid];
                        if (!markerStation) {
                            return false;
                        }
                        htmlPopup = this._getHtmlPopup(stationGuid, markerStation);
                        array.forEach(stationData.sensors, function (sensorValuePair) {
                            if (!sensorValuePair.alarmState) {
                                return;
                            }
                            var isTemperature = this._temperatureSensors.hasOwnProperty(sensorValuePair.type);
                            sensorTdHtml = isTemperature ?
                                query('td.Temperature div.' + sensorValuePair.type + ' div.background', htmlPopup) :
                                query('td.' + sensorValuePair.type + ' div.background', htmlPopup);
                            if (sensorTdHtml && sensorTdHtml.length === 1) {
                                domClass.remove(sensorTdHtml[0]);
                                domClass.add(sensorTdHtml[0], ['background', sensorValuePair.alarmState]);
                            }
                        }, this);
                    }, this);
                } else if (sensorsJsonData.kind === 'Data') {
                    sensorsValuesData = sensorsJsonData.data;
                    array.forEach(sensorsValuesData, function (stationData) {
                        stationGuid = stationData.station;
                        markerStation = this._markersWithPopupById[stationGuid];
                        if (!markerStation) {
                            return false;
                        }
                        htmlPopup = this._getHtmlPopup(stationGuid, markerStation);
                        array.forEach(stationData.sensors, function (sensorValuePair) {
                            if (!sensorValuePair.value && sensorValuePair.value !== false) {
                                return;
                            }
                            sensorTdHtml = query('td.' + sensorValuePair.type + ' div.icon-sensor', htmlPopup);
                            if (sensorTdHtml && sensorTdHtml.length === 1) {
                                domClass.remove(sensorTdHtml[0]);
                                if (sensorValuePair.value === true) {
                                    domClass.add(sensorTdHtml[0], ['icon-sensor', 'TRUE']);
                                } else if (sensorValuePair.value === false) {
                                    domClass.add(sensorTdHtml[0], ['icon-sensor', 'FALSE']);
                                } else {
                                    domClass.add(sensorTdHtml[0], ['icon-sensor', sensorValuePair.value]);
                                }
                            }
                        }, this);
                    }, this);
                }
            }
        },

        _getHtmlPopup: function (objectGuid, marker) {
            var htmlPopup = dom.byId(objectGuid),
                htmlContent;

            if (!htmlPopup) {
                htmlContent = mustache.render(this._popupTemplate,
                    {
                        guid: objectGuid,
                        sensors: this._createSensorsArrayForPopup(marker)
                    });
                this._buildSinglePopup(htmlContent, marker);
                htmlPopup = dom.byId(objectGuid);
            }

            return htmlPopup;
        },

        _buildSinglePopup: function (htmlContent, marker) {
            var popup = L.popup({
                offset: L.point(0, -20),
                autoPan: false
            }).setLatLng(marker.getLatLng()).setContent(htmlContent);
            this._popupsLayer.addLayer(popup);
        },

        _createSensorsArrayForPopup: function (markerStation) {
            var sensorsForTemplate = [],
                startIndex = 0,
                currentIndex = 0,
                currentTrArray = [],
                temperaturesArray = this._createTemperaturesSensorsForPopup(markerStation);

            sensorsForTemplate.push({values: currentTrArray});

            if (temperaturesArray) {
                currentTrArray.push({
                    is_temp: true,
                    sensor: temperaturesArray
                });
                currentIndex++;
            }

            array.forEach(this._activatedSensors[markerStation.type], function (sensor, index) {
                if (this._temperatureSensors.hasOwnProperty(sensor)) {
                    return;
                }

                if ((currentIndex - startIndex) === 4) {
                    currentTrArray = [];
                    sensorsForTemplate.push({values: currentTrArray});
                    startIndex = currentIndex;
                }

                currentTrArray.push({
                    is_temp: false,
                    sensor: sensor
                });

                currentIndex++;
            }, this);

            return sensorsForTemplate;
        },

        _temperatureSensors: {
            TemperatureAir: 0,
            TemperatureRoad: 1,
            TemperatureUnderRoad: 2
        },

        _createTemperaturesSensorsForPopup: function (markerStation) {
            var isTemperatureSensorsExist = false,
                temperaturesArray = [false, false, false];

            array.forEach(this._activatedSensors[markerStation.type], function (sensor, index) {
                if (this._temperatureSensors.hasOwnProperty(sensor)) {
                    isTemperatureSensorsExist = true;
                    temperaturesArray[this._temperatureSensors[sensor]] = sensor;
                }
            }, this);

            return isTemperatureSensorsExist ? temperaturesArray : false;
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
            map.on('moveend zoomend', this._rebuildLayer, this);
            this._rebuildLayer();
        },

        _queueMoveendEvents: [],
        _unhookMap: function (map) {
            map.off('moveend zoomend', this._rebuildLayer, this);
            this._layersSubsriber.unsubscribe();
            this._unsubscribeSensorsSubscribes();
            this._clearAll();
        },

        _rebuildLayer: function () {
            this._clearAll();
            this._layersSubsriber.subscribe();
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
            var key;
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    return false;
                }
            }
            return true;
        }
    });
})