<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div id="map"></div>
<div id="attributes"></div>

<pre>
    Код для добавления слоев заправок и мостов, а также тайлового слоя OpenStreetMap:
    <code data-language="javascript">
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [55.7501, 37.6687], // Задаем центр
                    zoom: 10 // Указываем начальный зум
                    zoomControl: true, // Показываем элемент управления зумом
                    legend: true // Показываем легенду карты
                });

            // Добавляем слой с заправками
            map.addGeoJsonLayer('Заправки', '/gas_stations', {color:'#FF0000', opacity: 0.9 });

            // Добавляем слой с мостами
            map.addGeoJsonLayer('Мосты', '/bridges', {opacity:0.9, weight: 2});
        });
    </code>
</pre>

<%block name="inlineScripts">
    require(['rosavto/Map', 'rosavto/LayersInfo', 'rosavto/MapIdentify', 'rosavto/AttributeGetter', 'dojo/domReady!'], function (Map, LayersInfo, MapIdentify, AttributeGetter) {
        var map = new Map('map', {
                center: [55.529, 37.584],
                zoom: 7,
                zoomControl: true,
                legend: true
            }),
            layersInfoSettings = {
                url: 'http://demo.nextgis.ru/ngw_rosavto/api/layer_group/0/tree',
                proxy: application_root + '/proxy'
            },
            mapIdentifySettings = {
                url: 'http://demo.nextgis.ru/ngw_rosavto/feature_layer/identify',
                proxy: application_root + '/proxy',
                fieldIdentify: 'guid'
            };

        map.addNgwTileLayer('Регионы', 'http://demo.nextgis.ru/ngw_rosavto', 7);
        map.addNgwTileLayer('Дороги', 'http://demo.nextgis.ru/ngw_rosavto', 8);

        var attributeGetter = new AttributeGetter(map, layersInfoSettings, mapIdentifySettings);
    });
</%block>