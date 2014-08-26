<%inherit file="master.mako"/>

<%block name="title">Кластеры с состояниями</%block>

<div id="map"></div>

<div>
    <button id="test1" style="margin: 3px; background-color: gainsboro;">Объекты в одной точке</button>
    </br>
    <button id="test2" style="margin: 3px; background-color: gainsboro;">Создать объект со статусом "тревога"</button>
    </br>
    <button id="test3" style="margin: 3px; background-color: gainsboro;">Создать объект со статусом "внимание"</button>
    </br>
    <button id="test4" style="margin: 3px; background-color: gainsboro;">Создать объект со статусом "не активен"</button>
    </br>
</div>

<pre>
    <p>Код для построения слоя кластеров с учетом состояния отдельных объектов с комментариями <a href="${request.route_url('code') + '#clusters'}">здесь</a>. Исходный код этой страницы также содержит комментарии.</p>
</pre>

<%block name="inlineScripts">
    <script src="${request.static_url('rosavto:static/json/stations.js')}"></script>

    <link rel="stylesheet" href="${request.static_url('rosavto:static/js/leaflet/leaflet.markercluster/MarkerCluster.css')}" />
    <link rel="stylesheet" href="${request.static_url('rosavto:static/js/leaflet/leaflet.markercluster/MarkerCluster.Default.css')}" />

    <style>
        img.leaflet-marker-icon {
            width: 44px !important;
            height: 44px !important;
            margin-left: -22px !important;
            margin-top: -22px !important;
        }

        .marker-cluster-alarm {
            background-color: rgba(240, 12, 12, 0.6);
        }

        .marker-cluster-normal {
            background-color: rgba(255, 255, 255, 0.60);
        }

        .marker-cluster-attention {
            background-color: rgba(222, 240, 12, 0.6);
        }

        .marker-cluster-inactive,
        .marker-cluster-failure,
        .marker-cluster-disabled {
            background-color: rgba(96, 96, 96, 0.75);
        }
    </style>

    <script>
        require([
                    'rosavto/Map', // Модуль карты
                    'rosavto/Layers/MarkersStateClusterLayer', // Слой кластеров
                    'rosavto/NgwServiceFacade',
                    'rosavto/LayersInfo',
                    'dojo/query',
                    'dojo/domReady!'],
                function (Map, MarkersStateClusterLayer, NgwServiceFacade, LayersInfo, query) {
                    // Создаем карту
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            map = new Map('map', {
                                center: [55.7501, 37.6687],
                                zoom: 7,
                                zoomControl: true
                            }),

                            // Описываем возможные значения состояний
                            states = {
                                clusters: ['inactive', 'failure', 'disabled', 'normal', 'attention', 'alarm']
                            },

                            // Создаем кластерный слой, передавая ему в качестве параметра
                            //  перечень возможных состояний
                            clustersLayer = new MarkersStateClusterLayer(states),

                            // Расчитываем количество заправок (для демо)
                            stationsCount = stations.features.length,

                            layersInfo,
                            markers = {};

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    layersInfo.fillLayersInfo().then(function (store) {
                        var styles = layersInfo.getStylesByLayersKeynames(['sensors_video', 'sensors_traffic']);

                        // Перебираем заправки из geojson файла
                        for (var i = 0; i < stationsCount; i++) {
                            var feature = stations.features[i];

                            var feature_style = styles[feature.properties.type_sensor].clustersStatesStyles[feature.properties.state];

                            // Строим иконку маркера, определяя стиль по названию состояния
                            var icon = L.icon(feature_style);

                            // Создаем маркер
                            var marker = L.marker(new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), {
                                icon: icon
                            });

                            // Маркеру присваиваем состояние из значения свойства geojson объекта
                            // это понадобится слою для определния цвета кластера
                            marker.state = feature.properties.state;
                            marker.type = feature.properties.type_sensor;

                            markers[feature.id] = marker;

                            // Добавляем маркер к кластерному слою
                            clustersLayer.addMarker(marker);
                        }

                        // Кластерный слой добавляем к карте
                        map.addVectorLayer(clustersLayer);


                        query('#test1').on('click', function () {
                            map._lmap.setView([ 55.8667281, 37.5824726 ], 20);
                        });

                        query('#test2').on('click', function () {
                            var testMarker = markers['node/533478769'];
                            clustersLayer.removeLayer(testMarker);
                            testMarker.state = 'alarm';
                            testMarker.setIcon(L.icon(styles[testMarker.type].clustersStatesStyles[testMarker.state]));
                            clustersLayer.addMarker(testMarker);
                        });

                        query('#test3').on('click', function () {
                            var testMarker = markers['node/734904042'];
                            clustersLayer.removeLayer(testMarker);
                            testMarker.state = 'attention';
                            testMarker.setIcon(L.icon(styles[testMarker.type].clustersStatesStyles[testMarker.state]));
                            clustersLayer.addMarker(testMarker);
                        });

                        query('#test4').on('click', function () {
                            var testMarker = markers['node/371706631'];
                            clustersLayer.removeLayer(testMarker);
                            testMarker.state = 'inactive';
                            testMarker.setIcon(L.icon(styles[testMarker.type].clustersStatesStyles[testMarker.state]));
                            clustersLayer.addMarker(testMarker);
                            map._lmap.setView([ 56.0199496, 37.8805576 ], 20);
                        });

                    });

                });
    </script>
</%block>