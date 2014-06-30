<%inherit file="master.mako"/>

<%block name="title">Карта</%block>

<div id="map"></div>

<pre>
    Код для инициализации карты:
    <code data-language="javascript">
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [55.7501, 37.6687], // Задаем центр
                    zoom: 10 // Указываем начальный зум
                });
        });
    </code>
</pre>

<%block name="inlineScripts">
    <script>
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                center: [55.7501, 37.6687],
                zoom: 10
            });
        });
    </script>
</%block>