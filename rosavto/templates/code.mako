<%inherit file="master.mako"/>

<%block name="title">Примеры кода</%block>

<h3>Содержание</h3>

<div>
    <ol>
        <li>
            <a href="#realtimeCode">Realtime слой</a>
        </li>
        <li>
            <a href="#attributesCode">Атрибуты</a>
        </li>
        <li>
            <a href="#incidentCode">Происшествия</a>
        </li>
    </ol>
</div>

<div id="realtimeCode">
    <h4>Realtime слой</h4>

    <pre>
        Код для инициализации карты:
        <code class="javascript">
            // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
            require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
                var map = new Map('map', {
                        center: [56.8225, 35.9116], // Задаем центр
                        zoom: 11 // Указываем начальный зум
                    }),

                    // Функция генерации GUID
                    getGuid = function () {
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
                    },

                    // Задаем настройки для слоя RealTime
                    settings = {
                        socketUrl: 'http://zulu.centre-it.com:7040/monitoring-web/socket',
                        subscribeUrl: '/app/subscribe/map/' + getGuid(),
                        minVisibleZoom: 11, // Минимальный зум, ниже которого маркеры не показываются
                        id: 'guid', // Название поля для идентификации объектов
                        styleField: 'type', // Название поля, содержащего значения для раскраски маркеров
                        styles: {
                            'Machine': { // Значение типа объекта
                                className: 'machine' // Название css класса, применяемого к маркеру данного типа
                            },
                            'Accident': {  // Значение типа объекта
                                className: 'accident' // Название css класса, применяемого к маркеру данного типа
                            },
                            'Video': {  // Значение типа объекта
                                className: 'video' // Название css класса, применяемого к маркеру данного типа
                            },
                            'Meteo': {  // Значение типа объекта
                                className: 'meteo' // Название css класса, применяемого к маркеру данного типа
                            },
                            'Weighing': {  // Значение типа объекта
                                className: 'weighing' // Название css класса, применяемого к маркеру данного типа
                            },
                            'Traffic': {  // Значение типа объекта
                                className: 'traffic' // Название css класса, применяемого к маркеру данного типа
                            }
                        }
                    };

            // Добавляем RealTime слой, параметры
            // 'roadsObjects' - уникальное название слоя,
            // settings - Настройки для слоя RealTime
            map.addRealtimeLayer('roadsObjects', settings);
        });
        </code>
    </pre>
</div>

<div id="attributesCode">
    <h4>Атрибуты</h4>

    <pre>
        Код для инициализации механизма получения атрибутивных данные по клику карты:
        <code class="javascript">
        require([ // Загружаем модуль необходимые модули после готовности DOM дерева
        'rosavto/Map',
        'rosavto/LayersInfo',
        'rosavto/MapIdentify',
        'rosavto/AttributeGetter',
        'rosavto/AttributesServiceFacade',
        'rosavto/NgwServiceFacade',
        'dojo/domReady!'],

        function (Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade) {
            // ngwServiceFacade - фасад к оконечным точкам сервера NextGIS Web
            var ngwServiceFacade = new NgwServiceFacade(ngwUrlBase, {proxy: proxyUrl}),
                attributesBaseUrl = 'http://zulu.centre-it.com:7040/',
                // attributesServiceFacade - фасад к оконечным точкам сервисов атрибутов
                attributesServiceFacade = new AttributesServiceFacade(attributesBaseUrl, {proxy: proxyUrl}),
                map = new Map('map', {
                    center: [55.529, 37.584],
                    zoom: 7,
                    zoomControl: true,
                    legend: true
                }),
                layersInfo,
                mapIdentify,
                attributeGetter;

            // Добавляем слои с NextGIS Web сервера
            map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);
            map.addNgwTileLayer('Регионы', ngwUrlBase, 7);
            map.addNgwTileLayer('Нормативные участки дорог', ngwUrlBase, 10);
            map.addNgwTileLayer('Участки подрядных организаций', ngwUrlBase, 9);

            // Создаем экземпляр объекта класса для получения информации о слоях
            layersInfo = new LayersInfo(ngwServiceFacade);

            // Создаем экземляр класса для идентификации объектов по клику
            mapIdentify = new MapIdentify({
                map: map,
                ngwServiceFacade: ngwServiceFacade,
                layersInfo: layersInfo,
                fieldIdentify: 'uniq_uid' // Название параметра для обращения к NextGIS Web
            });

            // Включаем перехват событий клика по карте для идентификации
            mapIdentify.on();

            // Создаем экземпляр объекта класса для получения атрибутов
            attributeGetter = new AttributeGetter({
                map: map,
                ngwServiceFacade: ngwServiceFacade,
                attributesServiceFacade: attributesServiceFacade,
                mapIdentify: mapIdentify,
                domSelector: '#attributes', // Элемент для рендеринга атрибутов
                style: { // Стиль подсветки выбранного объекта на карте
                    fill: false,
                    color: '#FF0000',
                    weight: 2
                }
            });
        });
        </code>
    </pre>

</div>

<div id="incidentCode">
    <h4>Происшествия</h4>

    <pre>
        Код для инициализации механизма получения данных о происшествиях:
        <code class="javascript">
        // Подключаем необходимые модули
        require([
            'dojo/DeferredList',
            'rosavto/Map', // Модуль, инкапсулирующий карту
            'rosavto/NgwServiceFacade', // Фасад к сервисам NextGIS Web
            'dojo/domReady!'],

        function (DeferredList, Map, NgwServiceFacade) {
            var ngwServiceFacade = new NgwServiceFacade(ngwUrlBase, {proxy: proxyUrl}),
                map = new Map('map', {
                    center: [56.0369, 35.8788],
                    zoom: 16,
                    zoomControl: true,
                    legend: true
                }),
                styles,
                getIncident1, getIncident2, getIncident3;

            // Добавляем слой дорог из NextGIS Web
            map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);

            // Описываем стили для точек
            styles = {
                'accident': {
                    Point: {className: 'accident'}
                },
                'jam' : {
                    Point: {className: 'jam'}
                }
            };

            // Создаем стилизированный GeoJSON слой и указываем callback для события клика
            map.createCustomizableGeoJsonLayer(styles, function () {
                alert('Вызван callback для объекта типа ' + this.properties.type);
            });

            // Получаем сведения о геометриях происшествий из NextGIS Web
            // по GUID происшествия
            // и расстоянию
            getIncident1 = ngwServiceFacade.getIncident([{
                layer: 17,
                guid: '4886ad28-7b11-9eba-5c9d-a4ecfd608099',
                distance: {km: 123, m: 300}
            }]);

            getIncident2 = ngwServiceFacade.getIncident([{
                layer: 17,
                guid: '4886ad28-7b11-9eba-5c9d-a4ecfd608099',
                distance: {km: 123, m: 400}
            }]);

            getIncident3 = ngwServiceFacade.getIncident([{
                layer: 17,
                guid: '4886ad28-7b11-9eba-5c9d-a4ecfd608099',
                distance: {km: 123, m: 500}
            }]);

            // Создаем DeferredList для запросов получения данных ajax запросов
            var dl = new DeferredList([getIncident1, getIncident2, getIncident3]);

            dl.then(function (incidents) {
                var countIncidents = incidents.length,
                    i;

                for (var i = 0; i < countIncidents; i++) {

                    // Добавляем информацию о типе объектов к геометрии
                    incidents[i][1].properties.type = i % 2 == 0 ? 'accident' : 'jam';

                    // Добавляем объект происшествия, содержащий геометрию и свойства типа
                    // к слою стилизованных geoJson объектов карты
                    map.addCustomizableGeoJsonData(incidents[i][1]);
                }
            });
        });
        </code>
    </pre>

</div>