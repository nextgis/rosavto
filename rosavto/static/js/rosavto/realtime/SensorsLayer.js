define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-class',
    'rosavto/realtime/Subscriber',
    'rosavto/Layers/MarkersStateClusterLayer',
    'rosavto/ParametersVerification'
], function (declare, lang, array, domClass, Subscriber, MarkersStateClusterLayer, ParametersVerification) {
    return declare('rosavto.SensorsLayer', [MarkersStateClusterLayer, ParametersVerification], {

        constructor: function (settings) {
            var self = this;

            this.verificateRequiredParameters(settings, [
                'objectsSubscribedUrl'
            ]);
            lang.mixin(this, settings);

            this._layersSubsriber = new Subscriber({
                subscribeUrl: this.objectsSubscribedUrl,
                getHeaders: lang.hitch(this, this._getHeadersForLayers),
                parseMessage: lang.hitch(this, this._buildMarkers)
            });
        },

        _activatedLayers: [],
        _activatedSensors: null,
        _layersSubsriber: [],
        activateLayers: function (layers) {
            var isLayersExists = false;

            this._activatedLayers = [];
            for (var layer in layers) {
                if (layers.hasOwnProperty(layer)) {
                    this._activatedLayers.push(layer);
                    isLayersExists = true;
                }
            }

            this._activatedSensors = layers;

            if (isLayersExists) {
                this._hookMap(this._map);
            } else {
                this._unhookMap(this._map);
            }
        },

        _getHeadersForLayers: function () {
            var bounds = this._map.getBounds(),
            // Добавляем к видимой области слоя по 10% с каждой стороны
                widthDelta = (bounds.getEast() - bounds.getWest()) * 0.1,
                heightDelta = (bounds.getNorth() - bounds.getSouth()) * 0.1;

            return {
                'LatitudeFrom': bounds.getSouth() - heightDelta,
                'LatitudeTo': bounds.getNorth() + heightDelta,
                'LongitudeFrom': bounds.getWest() - widthDelta,
                'LongitudeTo': bounds.getEast() + widthDelta,
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
                    // todo: add time machine dependency
                    Monitoring.getApplication().fireEvent('mapObjectSelected', this._markerSelected.guid, new Date());
                }
            }, this);
        },

        _clearAll: function () {
            this.clearLayers();
            this._markers = {};
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

        _unhookMap: function (map) {
            map.off('moveend zoomend', function () {
                this._layersSubsriber.subscribe();
            }, this);
            this._layersSubsriber.unsubscribe();
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
;
