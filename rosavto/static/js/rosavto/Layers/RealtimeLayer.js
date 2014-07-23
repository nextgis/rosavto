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
], function (declare, lang, on, StyledGeoJsonLayer, StompClient, DnD, object, uuid, generateRandomUuid, query, array, L) {
    var RealtimeLayer = declare('rosavto.RealtimeLayer', [StyledGeoJsonLayer], {
        _debug: false,
        markerZIndexOffset: {
            GRAY: 1000,
            GREEN: 1001,
            YELLOW: 1002,
            RED: 1003,
            CURRENT: 1004
        },
        _ngwServiceFacade: null,

        // конструктор realtime-слоя
        constructor: function() {
            // добавляем слой в массив всех realtime-слоёв
            RealtimeLayer.layers.push(this);
        },

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
                var guidTemplate = message.guid+'-';
                object.forIn(layerIdMap, function(value, key){
                    if (key && key.indexOf(guidTemplate) == 0){
                        delete layerIdMap[key];
                    }
                });
            }, this);
            object.forIn(layerIdMap, function (value, key) {
                this.removeObject(key);
            }, this);
        },
        processMessage: function(message) {
            if (message.geoJson && message.geoJson !== null ) {
                    this.clearGeoJsonElements(message.guid);
                    this.addGeoJsonElements(message);
            }
            else if (this.options.isCriticalValuesOfSensorsLayer && message.latitude && message.longitude) {
                // мы на слое отображения отрезков, поэтому рисуем только отрезки по точке!
                this.renderBacklightLine(message);
            } else if (message.latitude && message.longitude) {
                // если задана точка, рисуем маркер
                this.renderMarker(message.guid, [message.latitude, message.longitude], message.type, message.alarmState);
            } else if (message.geoJson === null) {
                this.clearGeoJsonElements(message.guid);
                if (message.dependentElements){
                    this.addGeoJsonElements(message);
                }
            }
        },
        //Список добавляемых объектов по geoJson
        getJsonElementArray: function (mainGuid, geoJson, type) {
            var geoJsonArray = [];
            if (geoJson.features){
                array.forEach(geoJson.features, function(element) {
                    geoJsonArray.push({mainGuid: mainGuid, geoJson: element, type: type });
                });
            } else{
                geoJsonArray.push({mainGuid: mainGuid, geoJson: geoJson, type: type });
            }
            return geoJsonArray;
        },
        //Список добавляемых объектов из dependence
        getJsonDependentElementArray: function (message) {
            var geoJsonArray = [];
            if (message.dependentElements) {
                array.forEach(message.dependentElements, function(element) {
                    if (element.geoJson != null){
                        geoJsonArray=geoJsonArray.concat(this.getJsonElementArray(message.guid, element.geoJson, element.type));
                    }
                }, this);
            }
            return geoJsonArray;
        },
        addGeoJsonElements: function (message) {
            var geoJsonElementArray = [];
            if (message.geoJson){
                geoJsonElementArray=geoJsonElementArray.concat(this.getJsonElementArray(message.guid, message.geoJson, message.type));
            }
            if (message.dependentElements)  {
                    geoJsonElementArray=geoJsonElementArray.concat(this.getJsonDependentElementArray(message));
            }
            array.forEach(geoJsonElementArray, function(element, index){
                   this._addGeoJsonElement(element.mainGuid, index, element.geoJson, element.type);
            }, this);
        },
        _addGeoJsonElement: function (mainGuid, index, geoJson, type) {
            var realtimeLayer = this;
                if (geoJson.geometry && geoJson.properties){
                    var incidentGuid = mainGuid+'-'+index;
                    var incident = this.addObject(geoJson, type, incidentGuid);
                    if (incidentGuid === RealtimeLayer.currentMarkerId &&
                        incident.layersById[incidentGuid].feature.geometry.type=='Point'){ //если данный элемент выделен, то мы должны добавить css = 'pressed'

                        incident.layersById[incidentGuid].setIcon(L.divIcon({
                            className: incident.options.styles[type]['point'].className + ' pressed'
                        }));
                    }
                    on(incident.layersById[incidentGuid],'click', function () {
                        var m = incident.layersById[incidentGuid];
                        m.markerId = incidentGuid;
                        if (this.feature.geometry.type === 'Point') {
                            realtimeLayer.selectMarker(m, type);
                        } else {
                            RealtimeLayer.currentMarkerId = incidentGuid;
                            var histDate = null;
                            if (realtimeLayer.options){
                                histDate=realtimeLayer.options.historyDate;
                            }
                            Monitoring.getApplication().fireEvent('mapObjectSelected', incidentGuid, histDate);
                            query('.pressed').removeClass('pressed');
                        }
                    });
            }
        },
        clearGeoJsonElements : function (guid){
            var guidTemplate = guid+'-';
            object.forIn(this.layersById, function(value, key){
                if (key && key.indexOf(guidTemplate) == 0){
                    this.removeObject(key);
                }
            }, this);
        },
        renderMarker: function (markerId, latlng, type, alarmState) {
            var pointStyle = alarmState || 'point';
            var marker;
            if (this.layersById[markerId]) {
                // если маркер уже присутствует на карте
                marker = this.layersById[markerId];
                marker.setIcon(L.divIcon({
                    className: this.options.styles[type][pointStyle].className
                }));
                marker.setLatLng(latlng);
                marker.options.alarmState = alarmState;
            } else {
                // если это новый маркер, которого нет на карте
                marker = L.marker(latlng, {
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

                var me = this;
                if (marker._icon) {
                    on(marker._icon, 'mousedown', function(e) {
                        if (e.which === 1) {
                            DnD.onDragStart(e.target, {
                                objectGuid: marker.markerId,
                                type: type,
                                historyDate: me.options.historyDate
                            });
                            e.stopPropagation();
                        }
                    });
                    on(marker._icon, 'mouseup', function(e) {
                        if (e.which === 1) {
                            if (DnD.dragStart === false) {
                                me.selectMarker(marker, type);
                            } else {
                                if (DnD.dragElement) {
                                    DnD.dragElement.remove();
                                }
                            }
                        }
                    });
                }
            }
            if (markerId === RealtimeLayer.markerToSelectId) {
                this.selectMarker(marker, type);
                RealtimeLayer.markerToSelectId = null;
            }
            if (markerId === RealtimeLayer.currentMarkerId) {
                this.selectMarker(marker, type, RealtimeLayer.currentMarkerClosed);
            }
        },

        resetZIndex: function (marker) {
            if (marker instanceof L.Marker){
                if (marker.options.alarmState) {
                    marker.setZIndexOffset(this.markerZIndexOffset[marker.options.alarmState]);
                } else {
                    marker.setZIndexOffset(this.markerZIndexOffset.GREEN);
                }
                marker._setPos = function(pos) {
                    L.DomUtil.setPosition(this._icon, pos);

                    if (this._shadow) {
                        L.DomUtil.setPosition(this._shadow, pos);
                    }

                    this._zIndex = this.options.zIndexOffset;

                    this._resetZIndex();
                };
                marker._zIndex = marker.options.zIndexOffset;
                marker._resetZIndex();
            }
        },

        // функция для выделения маркера
        selectMarker: function(marker, type, suppressOpenCard) {
            query('.pressed').removeClass('pressed');
            var pointStyleCurrent = 'point';
            if (this.layersById[marker.markerId].options.alarmState) {
                pointStyleCurrent = this.layersById[marker.markerId].options.alarmState;
            }
            if (this.options.styles[type][pointStyleCurrent]) {
                marker.setIcon(L.divIcon({
                    className: this.options.styles[type][pointStyleCurrent].className + ' pressed'
                }));
            } else {
                marker.setIcon(L.divIcon({
                    className: this.options.styles[type].className + ' pressed'
                }));
            }
            marker.setZIndexOffset(this.markerZIndexOffset.CURRENT); // выводим элемент как текущий
            // возвращаем предыдущий выбранный элемент на тот z-уровень, где ему положено находиться
            if (RealtimeLayer.currentMarkerId && RealtimeLayer.currentMarkerId !== marker.markerId) {
                RealtimeLayer.layers.every(function (layer) {
                    var oldCurrentMarker = layer.layersById[RealtimeLayer.currentMarkerId];
                    if (oldCurrentMarker) {
                        layer.resetZIndex(oldCurrentMarker);
                        return false;
                    }
                    return true;
                });
            }
            RealtimeLayer.currentMarkerId = marker.markerId;
            var histDate = null;
            if (this.options){
                histDate=this.options.historyDate;
            }
            if (!suppressOpenCard) {
                RealtimeLayer.currentMarkerClosed = false;
                Monitoring.getApplication().fireEvent('mapObjectSelected', marker.markerId, histDate);
            }
        },
        deleteMarker: function(markerId) {
            if (this.layersById[markerId]) {
                this.removeLayer(this.layersById[markerId]);
                delete this.layersById[markerId];
            }
        },
        renderBacklightLine: function(body) {
            //передаем сервису координаты для расчета построения линии
            if (body.roadId && body.roadMeter) {
                var line = this.layersById[body.guid];
                if (line) {
                    if (body.alarmState === 'GREEN') {
                        this.deleteLine(body.guid);
                    } else if (line.options.alarmState !== body.alarmState) { //если тревожность изменилась
                        this.deleteLine(body.guid);
                        this.drawLine(body);
                    }
                } else if (body.alarmState !== 'GREEN') {
                    this.drawLine(body);
                }
            } else if (this.layersById[body.guid]) {
                this.deleteLine(body.guid);
            }
        },
        drawLine: function(body) {
            var indent = 2;
            var me = this;
            var xhr = this.options._ngwServiceFacade.getIncidentLine('{' + body.roadId + '}',
                    {distance: {km: (body.roadMeter / 1000) - indent, m: body.roadMeter % 1000}},
            {distance: {km: (body.roadMeter / 1000) + indent, m: body.roadMeter % 1000}}
            );
            xhr.then(lang.hitch(this, function(lineGeoJson) {
                var jsonLayer = L.geoJson(lineGeoJson, {
                    style: this.options.styles[body.type][body.alarmState].line,
                    alarmState: body.alarmState
                });
                this.addLayer(jsonLayer);
                if (body.alarmState == 'RED')
                    jsonLayer.bringToFront(); //красный рисуем впереди
                else
                    jsonLayer.bringToBack(); //остальное позади
                this.layersById[body.guid] = jsonLayer;
                jsonLayer.on('click', function() {
                    var histDate = null;
                    if (me.options){
                        histDate=me.options.historyDate;
                    }
                    Monitoring.getApplication().fireEvent('mapObjectSelected', body.guid, histDate);
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

            if (this.options.historyDate){
                    headers.HistoryDate = this.options.historyDate.toISOString();
            }

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
    // id текущего выбранного маркера — один на все realtime-слои
    RealtimeLayer.currentMarkerId = null;
    // закрыта ли карточка текущего объекта
    RealtimeLayer.currentMarkerClosed = false;
    // id маркера, который необходимо выбрать после того, как он станет виден
    RealtimeLayer.markerToSelectId = null;
    // массив всех realtime-слоёв
    RealtimeLayer.layers = [];
    return RealtimeLayer;
});
