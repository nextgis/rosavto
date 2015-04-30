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

        //map.showLoader();
        layersInfo = new LayersInfo(ngwServiceFacade);
        layersInfo.fillLayersInfo().then(function (store) {
            map.addBaseLayers(layersInfo.getBaseLayers());
            //map.hideLoader();

            map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
                layers: 'sattelite_image',
                format: 'image/png',
                tileSize: 256,
                transparent: true,
                attribution: "NextGIS Demo WMS"
            });
        });
    });