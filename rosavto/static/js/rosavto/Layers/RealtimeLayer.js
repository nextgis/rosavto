define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    "dojo/on",
    'rosavto/Layers/StyledGeoJsonLayer',
    'centreit/StompClient',
    'centreit/DragAndDrop',
    'dojox/lang/functional/object',
    'dojox/uuid/_base',
    'dojox/uuid/generateRandomUuid',
    'dojo/query',
    'dojo/_base/array',
    'leaflet/leaflet'
], function(declare, lang, on, StyledGeoJsonLayer, StompClient, DnD, object, uuid, generateRandomUuid, query, array, L) {
    return declare('rosavto.RealtimeLayer', [StyledGeoJsonLayer], {
        _debug: false,
        markerZIndexOffset: {
            GREEN: 1001,
            YELLOW: 1002,
            RED: 1003,
            CURRENT: 1004
        },
        currentMarkerId: '', //хранение идентификатора текущего выбранного элемента
        _ngwServiceFacade: null,
        _setDebug: function(debug) {
            this._debug = debug;
        },
        onAdd: function(map) {
            StyledGeoJsonLayer.prototype.onAdd.call(this, map);
            this._hookMap(map);
        },
        onRemove: function(map) {
            this._unhookMap(map);
            StyledGeoJsonLayer.prototype.onRemove.call(this, map);
        },
        _hookMap: function(map) {
            map.on('moveend zoomend', this._resubscribe, this);
            this._resubscribe();
        },
        _unhookMap: function(map) {
            map.off('moveend zoomend', this._resubscribe, this);
            this._unsubscribeForRealtimeLayer();
        },
        _resubscribe: function() {
            this._subscribeForRealtimeLayer(lang.hitch(this, this.parseMessage));
        },
        parseMessage: function(message) {
            var body = JSON.parse(message.body);

            if (this._debug) {
                console.log(message.body);
            }

            if (lang.isArray(body)) {
                this.processInitialData(body);
            } else {
                this.processMessage(body);
            }
        },
        processInitialData: function(messages) {
            var layerIdMap = {};
            object.forIn(this.layersById, function(value, key) {
                layerIdMap[key] = 0;
            }, this);
            array.forEach(messages, function(message) {
                this.processMessage(message);
                delete layerIdMap[message.guid];
            }, this);
            object.forIn(layerIdMap, function(value, key) {
                this.removeObject(key)
            }, this);
        },
        processMessage: function(message) {
            if (message.geoJson && message.geoJson !== null && message.geoJson.geometry && message.geoJson.properties) {
                this.addObject(message.geoJson, message.type, message.guid);
            } else if (this.options.isCriticalValuesOfSensorsLayer && message.latitude && message.longitude) {
                // мы на слое отображения отрезков, поэтому рисуем только отрезки по точке!
                this.renderBacklightLine(message);
            } else if (message.latitude && message.longitude) {
                // если задана точка, рисуем маркер
                this.renderMarker(message.guid, [message.latitude, message.longitude], message.type, message.alarmState);
            } else if (message.geoJson === null) {
                this.removeObject(message.guid);
            }
        },
        renderMarker: function(markerId, latlng, type, alarmState) {
            var pointStyle = alarmState || 'point';
            if (this.layersById[markerId]) {
                var pressed = '';
                var queryPressed = query(".pressed");
                if (queryPressed.length > 0 && markerId == this.currentMarkerId) {
                    pressed = ' pressed';
                    queryPressed.removeClass("pressed");
                }

                var changedMarker = this.layersById[markerId];
                if (changedMarker) {
                    changedMarker.setIcon(L.divIcon({
                        className: this.options.styles[type][pointStyle].className + pressed
                    }));
                    changedMarker.setLatLng(latlng);
                    if (markerId != this.currentMarkerId)
                        this.resetZIndex(changedMarker);
                    changedMarker.options.alarmState = alarmState;
                }

            } else {
                var marker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: this.options.styles[type][pointStyle].className
                    }),
                    riseOnHover: true,
                    alarmState: alarmState
                });

                this.addLayer(marker);
                L.stamp(marker);
                this.layersById[markerId] = marker;
                marker.markerId = markerId;
                this.resetZIndex(marker);
            }

            var me = this;
            if (marker && marker._icon) {
                on(marker._icon, 'mousedown', function(e) {                    
                    if (e.which === 1) {
                        DnD.startDragTime = new Date().getTime();
                        DnD.dragReady = true;
                        DnD.dragStart = false;
                        DnD.dragElement = lang.clone(e.target);   
                        e.stopPropagation();
                        DnD.dragElement.markerId = marker.markerId;
                        DnD.dragElement.type = type;
                    }
                });
                on(marker._icon, 'mouseup', function(e) {
                    if (e.which === 1) {
                        if (DnD.dragStart === false) {
                            me.selectMarker(marker, type);
                        } else {
                            DnD.dragElement.remove();
                        }
                    }
                });                
            }
        },
        resetZIndex: function(marker) {
            if (marker.options.alarmState)
                marker.setZIndexOffset(this.markerZIndexOffset[marker.options.alarmState]);
            else
                marker.setZIndexOffset(this.markerZIndexOffset.GREEN);
            marker._zIndex = marker.options.zIndexOffset;
            marker._resetZIndex();
        },
        //функция для выделения маркера
        selectMarker: function(marker, type) {
            query(".pressed").removeClass("pressed");
            var pointStyleCurrent = 'point';
            if (this.layersById[marker.markerId].options.alarmState)
                pointStyleCurrent = this.layersById[marker.markerId].options.alarmState;
            marker.setIcon(L.divIcon({
                className: this.options.styles[type][pointStyleCurrent].className + ' pressed'
            }));
            marker.setZIndexOffset(this.markerZIndexOffset.CURRENT); // выводим элемент как текущий
            //возвращаем предыдущий элемент на тот слой, где ему положено находиться
            if (this.currentMarkerId) {
                var oldCurrentMarker = this.layersById[this.currentMarkerId];
                if (oldCurrentMarker) {
                    this.resetZIndex(oldCurrentMarker);
                }
            }
            this.currentMarkerId = marker.markerId;
            Monitoring.getApplication().fireEvent('mapObjectSelected', marker.markerId);
        },
        deleteMarker: function(markerId) {
            if (this.layersById[markerId]) {
                this.removeLayer(this.layersById[markerId]);
                delete this.layersById[markerId];
            }
        },
        renderBacklightLine: function(body) {
            var component = this;
            //передаем сервису координаты для расчета построения линии
            if (body.roadId && body.roadMeter) {
                var line = this.layersById[body.guid];
                if (line) {
                    if (!(body.alarmState && body.alarmState != 'GREEN')) {
                        component.deleteLine(body.guid);
                        return;
                    } else if (line.options.alarmState == body.alarmState) { //если тревожность не изменилась - ничего не делаем
                        return;
                    } else {
                        component.deleteLine(body.guid);
                        this.drawLine(body);
                    }
                } else if (!(body.alarmState && body.alarmState != 'GREEN')) {
                    return;
                } else {
                    this.drawLine(body);
                }
            } else if (this.layersById[body.guid]) {
                this.deleteLine(body.guid);
            }
        },
        drawLine: function(body) {
            var component = this;
            var indent = 2;
            var xhr = this.options._ngwServiceFacade.getIncidentLine(body.roadId,
                    {distance: {km: (body.roadMeter / 1000) - indent, m: body.roadMeter % 1000}},
            {distance: {km: (body.roadMeter / 1000) + indent, m: body.roadMeter % 1000}}
            );
            xhr.then(lang.hitch(this, function(lineGeoJson) {
                var jsonLayer = L.geoJson(lineGeoJson, {
                    style: component.options.styles[body.type][body.alarmState].line,
                    alarmState: body.alarmState
                });
                component.addLayer(jsonLayer);
                if (body.alarmState == 'RED')
                    jsonLayer.bringToFront(); //красный рисуем впереди
                else
                    jsonLayer.bringToBack(); //остальное позади
                this.layersById[body.guid] = jsonLayer;
                jsonLayer.on('click', function(e) {
                    Monitoring.getApplication().fireEvent('mapObjectSelected', body.guid);
                }, this);
            }));
        },
        deleteLine: function(lineId) {
            if (this.layersById[lineId]) {
                this.removeLayer(this.layersById[lineId]);
                delete this.layersById[lineId];
            }
        },
        _lastMapBounds: null,
        _subscription: null,
        _subscribeForRealtimeLayer: function(callback) {
            var bounds = this._map.getBounds();

            // Добавляем к видимой области слоя по 10% с каждой стороны
            var widthDelta = (bounds.getEast() - bounds.getWest()) * 0.1;
            var heightDelta = (bounds.getNorth() - bounds.getSouth()) * 0.1;

            var headers = {
                'LatitudeFrom': bounds.getSouth() - heightDelta,
                'LatitudeTo': bounds.getNorth() + heightDelta,
                'LongitudeFrom': bounds.getWest() - widthDelta,
                'LongitudeTo': bounds.getEast() + widthDelta,
                'ObjectTypes': object.keys(this.options.styles)
            };

            StompClient.connect().then(lang.hitch(this, function(client) {
                this._unsubscribeForRealtimeLayer();
                this._subscription = client.subscribe(this.options.subscribeUrl + uuid.generateRandomUuid(), callback, headers);
            }));
        },
        _unsubscribeForRealtimeLayer: function() {
            if (this._subscription) {
                this._subscription.unsubscribe();
                this._subscription = null;
            }
        }

    });
});