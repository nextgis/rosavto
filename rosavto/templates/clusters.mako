<%inherit file="master.mako"/>

<%block name="title">Маркер</%block>

<div id="map"></div>

<pre>
    <p>Код для построения слоя кластеров с учетом состояния отдельных объектов с комментариями <a href="${request.route_url('code') + '#clusters'}">здесь</a>. Исходный код этой страницы также содержит комментарии.</p>
</pre>

<%block name="inlineScripts">
    <script src="${request.static_url('rosavto:static/json/stations.js')}"></script>

    <style>
        .marker-cluster-critical {
            background-color: rgba(240, 12, 12, 0.6);
        }

        .marker-cluster-normal {
            background-color: rgba(12, 240, 58, 0.6);
        }

        .marker-cluster-tolerable {
            background-color: rgba(222, 240, 12, 0.6);
        }
    </style>

    <script>
        require([
            'rosavto/Map', // Модуль карты
            'rosavto/Layers/MarkersStateClusterLayer', // Слой кластеров
            'dojo/domReady!'],
                function (Map, MarkersStateClusterLayer) {
                            // Создаем карту
                    var map = new Map('map', {
                                center: [55.7501, 37.6687],
                                zoom: 7,
                                zoomControl: true
                            }),

                            // Описываем возможные значения состояний
                            states = {
                                clusters: ['normal', 'tolerable', 'critical']
                            },

                            // Создаем кластерный слой, передавая ему в качестве параметра
                            //  перечень возможных состояний
                            clustersLayer = new MarkersStateClusterLayer(states),

                            // Расчитываем количество заправок (для демо)
                            stationsCount = stations.features.length;

                    // Перебираем заправки из geojson файла
                    for (var i = 0; i < stationsCount; i++) {
                        var feature = stations.features[i],

                                // Если есть имя - выбираем его для попапа
                                title = feature.properties.name ? feature.properties.name : null,

                                // Строим иконку маркера, определяя стиль по названию состояния
                                icon = L.icon({
                                    iconUrl: application_root + '/static/css/images/states/marker-icon-' + feature.properties.state + '.png'
                                }),

                                // Создаем маркер
                                marker = L.marker(new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), {
                                    title: title,
                                    icon: icon
                                });

                        // Маркеру присваиваем состояние из значения свойства geojson объекта
                        // это понадобится слою для определния цвета кластера
                        marker.state = feature.properties.state;

                        // Связываем попам с маркером (для демо)
                        marker.bindPopup(title);

                        // Добавляем маркер к кластерному слою
                        clustersLayer.addMarker(marker);
                    }

                    // Кластерный слой добавляем к карте
                    map.addVectorLayer(clustersLayer);
                });
    </script>
</%block>