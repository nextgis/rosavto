<%inherit file="master.mako"/>

<%block name="title">Карта + WMS</%block>

<div id="map"></div>

<pre>
    Код для инициализации карты:
    <code>
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [55.7501, 37.6687], // Задаем центр
                    zoom: 10 // Указываем начальный зум
                });

            // Добавляем WMS слой
            map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
                layers: 'sattelite_image', // Указываем название слоя
                format: 'image/png', // Указываем формат изображения
                attribution: "NextGIS wms layer" // Указываем аттрибутивную информацию о слое
            });
        });
    </code>
</pre>

<%block name="inlineScripts">
    require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        var map = new Map('map', {
                center: [55.7501, 37.6687],
                zoom: 10
            });

        map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
            layers: 'sattelite_image',
            format: 'image/png',
            tileSize: 256,
            attribution: "NextGIS Demo WMS"
        });
    });
</%block>