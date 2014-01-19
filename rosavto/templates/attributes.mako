<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<pre>
    Код для добавления слоев заправок и мостов, а также тайлового слоя OpenStreetMap:
    <code data-language="javascript">
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
            },
            attributeGetterSettings = {
                domSelector: '#attributes',
                urlBuilder: function (id) {
                    return application_root + '/attributes/html/' + id
                }
            };

        map.addNgwTileLayer('Регионы', 'http://demo.nextgis.ru/ngw_rosavto', 7);
        map.addNgwTileLayer('Дороги', 'http://demo.nextgis.ru/ngw_rosavto', 8);

        var attributeGetter = new AttributeGetter(map, layersInfoSettings, mapIdentifySettings, attributeGetterSettings);
    });
</%block>