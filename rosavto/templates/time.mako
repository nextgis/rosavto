<%inherit file="master.mako"/>

<%block name="title">Время</%block>

<div class="code-description">
    <label for="dateWidget">Дата:</label>
    <input type="text" id="dateWidget"/>
    <label for="timeWidget">Время:</label>
    <input id="timeWidget"/>

    Выбранное время: <input id="selectedDateTime" disabled="disabled"/>
    GUIDs датчиков: <input id="guids"/>
    <button type="button" id="selectObj"/>
</div>

<div id="map"></div>


<%block name="inlineScripts">
    <script>
        require([
                    'dojo/parser',
                    'dijit/form/DateTextBox',
                    'dijit/form/Button',
                    'dijit/form/TimeTextBox',
                    'dijit/form/TextBox',
                    'dijit/registry',
                    'dojo/dom-class',
                    'rosavto/Map',
                    'rosavto/LayersInfo',
                    'rosavto/MapIdentify',
                    'rosavto/AttributeGetter',
                    'rosavto/AttributesServiceFacade',
                    'rosavto/NgwServiceFacade',
                    'rosavto/Layers/StyledGeoJsonLayer',
                    'dojo/domReady!'],

                function (parser, DateTextBox, Button, TimeTextBox, TextBox, registry, domClass, Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade, StyledGeoJsonLayer) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            map = new Map('map', {
                                center: [55.529, 37.584],
                                zoom: 7,
                                zoomControl: true,
                                legend: true
                            }),
                            layersInfo,
                            dateWidget, timeWidget,
                            styledGeoJsonLayer;

                    layersInfo = new LayersInfo(ngwServiceFacade);
                    map.showLoader();
                    layersInfo.fillLayersInfo().then(function (store) {
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayer('Сеть дорог ДЕП', ngwUrlForTiles, 4);
                        map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 51);
                        map.addNgwTileLayer('Сеть региональных дорог', ngwUrlForTiles, 50);
                        map.addNgwTileLayer('Объезды', ngwUrlForTiles, 43);
                        map.addNgwTileLayer('Датчики', ngwUrlForTiles, 53);

                        styledGeoJsonLayer = new StyledGeoJsonLayer(null, {styles: {default: {
                            position: 'front',
                            point: {type: 'icon', iconUrl: 'static/icons/sensors/video-norm.png'},
                            line: {opacity: 0.8, weight: 5, color: '#FF0000'}
                        }}});
                        map.addVectorLayer(styledGeoJsonLayer, 'Датчики-вектор');
                        map.hideLoader();
                    });


                    dateWidget = new DateTextBox({
                        id: 'dateWidget',
                        value: new Date(),
                        onChange: function (newDate) {
                            var date = newDate,
                                    time = registry.byId('timeWidget').value,
                                    selectedDateTime = registry.byId('selectedDateTime');
                            console.log(newDate);
                            date.setHours(time.getHours());
                            date.setMinutes(time.getMinutes());
                            date.setSeconds(time.getSeconds());
                            selectedDateTime.set('value', ngwServiceFacade.formatDateTime(new Date(date)));
                            selectedDateTime.date = date;
                        }
                    }, 'dateWidget');

                    var changeTime = function (newTime) {
                        var time = newTime,
                                date = registry.byId('dateWidget').value,
                                selectedDateTime = registry.byId('selectedDateTime');
                        console.log(newTime);
                        time.setYear(date.getFullYear());
                        time.setMonth(date.getMonth());
                        time.setDate(date.getDate());
                        selectedDateTime.set('value', ngwServiceFacade.formatDateTime(new Date(time)));
                        selectedDateTime.date = time;
                    };

                    timeWidget = new TimeTextBox({
                        id: 'timeWidget',
                        value: new Date(),
                        constraints: {
                            timePattern: 'HH:mm:ss',
                            clickableIncrement: 'T00:15:00',
                            visibleIncrement: 'T00:15:00',
                            visibleRange: 'T01:00:00'
                        },
                        onChange: function (newTime) {
                            changeTime(newTime);
                        }
                    }, 'timeWidget');

                    timeWidget.startup();
                    timeWidget.set('value', new Date());

                    var rebuildPoints = function (datetime, guids) {
                        if (styledGeoJsonLayer) {
                            if (styledGeoJsonLayer.getLayers().length > 0) {
                                styledGeoJsonLayer.clearLayers();
                            }
                            ngwServiceFacade.getGeometriesByGuids([25], guids, datetime)
                                    .then(function (geoJson) {
                                        var countFeatures = geoJson.features.length;
                                        for (var i = 0; i < countFeatures; i++) {
                                            styledGeoJsonLayer.addObject(geoJson.features[i], 'default', geoJson.features[i].properties['uniq_uid'])
                                        }
                                        map.getLMap().fitBounds(styledGeoJsonLayer.getBounds());
                                    });
                        }
                    };

                    new TextBox({
                        id: 'selectedDateTime',
                        value: 'Не выбрано'
                    }, 'selectedDateTime');

                    new TextBox({
                        id: 'guids',
                        value: 'f5474132-7900-46cc-979b-e9e53675b40a,4d2377fb-7cb2-4fc4-bc9c-59e15c4c70a8',
                        style: 'width: 400px'
                    }, 'guids');

                    var myButton = new Button({
                        label: "Подсветить объекты",
                        onClick: function () {
                            var guids = registry.byId('guids').value.split(','),
                                    dateTime = registry.byId('selectedDateTime').date;
                            rebuildPoints(dateTime, guids);
                        }
                    }, "selectObj").startup();
                });
    </script>
</%block>