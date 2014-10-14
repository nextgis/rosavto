<%inherit file="master.mako"/>

<%block name="title">Карта + WMS</%block>

<div id="map"></div>

<div>

<pre>
    Код для инициализации карты:
    <code data-language="javascript">
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после
        готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        var map = new Map('map', {
        center: [59.9175, 30.1410], // Задаем центр
        zoom: 10 // Указываем начальный зум,
        legend: true
        });

        // Добавляем WMS слой
        map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
        layers: 'sattelite_image', // Указываем название слоя
        format: 'image/png', // Указываем формат изображения
        transparent: true,
        attribution: "NextGIS wms layer" // Указываем аттрибутивную информацию о слое
        });
        });
    </code>
</pre>

</div>

<%block name="inlineScripts">
    <script>
        require([
                    'rosavto/Map', // Модуль карты
                    'rosavto/Layers/MarkersStateClusterLayer', // Слой кластеров
                    'rosavto/NgwServiceFacade',
                    'rosavto/LayersInfo',
                    'dojo/query',
                    'dojo/domReady!'],
                function (Map, MarkersStateClusterLayer, NgwServiceFacade, LayersInfo, query) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            map = new Map('map', {
                                center: [59.9175, 30.1410],
                                zoom: 10,
                                zoomControl: true,
                                legend: true,
                                easyPrint: false
                            }),
                            layersInfo;

                    map.showLoader();
                    layersInfo = new LayersInfo(ngwServiceFacade);
                    layersInfo.fillLayersInfo().then(function (store) {
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.hideLoader();

                        map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
                            layers: 'sattelite_image',
                            format: 'image/png',
                            tileSize: 256,
                            transparent: true,
                            attribution: "NextGIS Demo WMS"
                        });
                    });
                });
    </script>
</%block>