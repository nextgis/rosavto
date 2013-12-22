<%inherit file="master.mako"/>

<%block name="title">Карта</%block>

<div id="map"></div>

<pre>
    Код для инициализации карты и слоя OpenStreetMap:
    <code>
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [55.7501, 37.6687], // Задаем центр
                    zoom: 10 // Указываем начальный зум
                }),
                osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // URL к тайлам OSM
                settingsOsmLayer = {
                    attribution: 'Map data © OpenStreetMap contributors' // Описание слоя
                };

            map.addTileLayer(osmUrl, settingsOsmLayer); // Добавляем тайловый слой к карте
        });
    </code>
</pre>

<%block name="inlineScripts">
    require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        var map = new Map('map', {
                center: [55.7501, 37.6687],
                zoom: 10
            }),
            osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            settingsOsmLayer = {
                attribution: 'Map data © OpenStreetMap contributors'
            };

        map.addTileLayer(osmUrl, settingsOsmLayer);
    });
</%block>