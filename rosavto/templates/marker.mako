<%inherit file="master.mako"/>

<%block name="title">Маркер</%block>

<div id="map"></div>

<pre>
    Код для добавления слоев заправок и мостов, а также тайлового слоя OpenStreetMap:
    <code data-language="javascript">
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [55.7501, 37.6687], // Задаем центр
                    zoom: 10 // Указываем начальный зум
                    zoomControl: true, // Показываем элемент управления зумом
                });

            // Показываем заправку по id = 544601086 c всплывающим окном
            map.showObjectAsMarker('/gas_stations/', 544601086, true);

            // Показываем заправку по id = 40889936 без всплывающего окна
            map.showObjectAsMarker('/gas_stations/', 40889936, false);
        });
    </code>
</pre>

<%block name="inlineScripts">
    <script>
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                center: [55.7501, 37.6687],
                zoom: 10,
                zoomControl: true
            });
            map.showObjectAsMarker('/gas_stations/', 544601086, true);
            map.showObjectAsMarker('/gas_stations/', 40889936, false);
        });
    </script>
</%block>