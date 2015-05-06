require([
        // Модуль карты
        'rosavto/Map',
        // Модуль для заполнения информации о слоях
        'rosavto/LayersInfo',
        // Модуль фасада к сервисам NGW
        'rosavto/NgwServiceFacade',
        'dojo/domReady!'],

    function (Map, LayersInfo, NgwServiceFacade) {
        // Создаем и конфигурируем фасад к сервисам NGW
        var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
            // Создаем и конфигурируем карту
            map = new Map('map', {
                center: [55.529, 37.584],
                zoom: 7,
                zoomControl: true,
                legend: true,
                easyPrint: false
            }),
            layersInfo;

        // Инициализируем хранилище информации о слоях
        layersInfo = new LayersInfo(ngwServiceFacade);

        // Отображаем иконку загрузки
        map.showLoader();

        // Заполняем рекурсивно хранилище информации о слоях LayersInfo
        layersInfo.fillLayersInfo().then(function (store) {

            // Подключаем базовые слои подложки с NGW
            map.addBaseLayers(layersInfo.getBaseLayers());

            // Получаем словарь стилей слоев по ключевым значениями слоя
            var layersByKeyname = layersInfo.getLayersDictByKeyname();

            // Добавляем нужные нам слои на карту
            map.addNgwTileLayerWithKeyname('roads_dep', 'Сеть дорог ДЕП', ngwUrlForTiles, layersByKeyname['roads_dep'].style_id, null);
            map.addNgwTileLayerWithKeyname('roads', 'Сеть федеральных дорог', ngwUrlForTiles, layersByKeyname['roads'].style_id, null);
            map.addNgwTileLayerWithKeyname('roads_regional', 'Сеть региональных дорог', ngwUrlForTiles, layersByKeyname['roads_regional'].style_id, null);

            // Скрываем иконку загрузки
            map.hideLoader();
        });
    });