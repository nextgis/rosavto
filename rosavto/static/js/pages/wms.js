require([
        'rosavto/Map', // Модуль карты
        'dojo/domReady!'],
    function (Map) {
        // Создаем и конфигурируем карту
        var map = new Map('map', {
            center: [59.9175, 30.30],
            zoom: 11,
            zoomControl: true,
            legend: true,
            easyPrint: false
        });

        // Добавляем WMS слой
        // Конфигурируем его
        map.addWmsLayer('http://nextgis.ru/cgi-bin/wms?', 'NextGIS Demo WMS', {
            layers: 'sattelite_image',
            format: 'image/png',
            tileSize: 256,
            transparent: true,
            attribution: "NextGIS Demo WMS"
        });
    });