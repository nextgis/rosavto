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
            // Загружаем модуль необходимые модули после готовности DOM дерева
            require(['rosavto/Map', 'rosavto/LayersInfo', 'rosavto/MapIdentify', 'rosavto/AttributeGetter', 'dojo/domReady!'],
                function (Map, LayersInfo, MapIdentify, AttributeGetter) {
                    var map = new Map('map', {
                            center: [55.7501, 37.6687], // Задаем центр
                            zoom: 10 // Указываем начальный зум
                            zoomControl: true, // Показываем элемент управления зумом
                            legend: true // Показываем легенду карты
                        }),
                        layersInfoSettings = { // Настройки модуль для получения информации о слоях на сервере
                            // Путь к NextGIS Web сервису с информацией о слоях
                            url: 'http://demo.nextgis.ru/ngw_rosavto/api/layer_group/0/tree',
                            proxy: application_root + '/proxy' // Простой прокси для кроссдоменных запросов
                        },
                        mapIdentifySettings = { // Настройки модуля идентификации объектов-геометрий
                            // Путь к NextGIS Web сервису идентификации сущностей
                            url: 'http://demo.nextgis.ru/ngw_rosavto/feature_layer/identify',
                            proxy: application_root + '/proxy', // Простой прокси для кроссдоменных запросов
                            fieldIdentify: 'guid' // название поля, содержащего ID объекта
                        },
                        attributeGetterSettings = { // Настройки модуля получения атрибутов
                            // CSS селектор HTML элемента, который будет содаржать таблицу аттрибутов
                            domSelector: '#attributes',
                            // Функция обратного вызова для построения URL адреса оконечной точки сервиса,
                            // возвращающего аттрибутивные данные о сущности по ее ID
                            urlBuilder: function (id) {
                                return application_root + '/attributes/html/' + id
                            }
                        };

                    // Добавление слоев NextGIS Web, которые будут использоваться для идентификации
                    // Синтаксис: (name, url, styleId)
                    // name - имя слоя в легенде
                    // url - url к NextGIS Web
                    // styleId - ID стиля слоя
                    map.addNgwTileLayer('Регионы', 'http://demo.nextgis.ru/ngw_rosavto', 7);
                    map.addNgwTileLayer('Дороги', 'http://demo.nextgis.ru/ngw_rosavto', 8);

                    // Инициализация модулей
                    var attributeGetter = new AttributeGetter(map, layersInfoSettings, mapIdentifySettings, attributeGetterSettings);
                });
        </code>
    </pre>
</div>