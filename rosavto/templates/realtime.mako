<%inherit file="master.mako"/>

<%block name="title">Realtime</%block>

<div id="map"></div>

<pre>
    Код для инициализации карты:
    <code data-language="javascript">
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

<%block name="inlineScripts">
    require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        var map = new Map('map', {
                center: [56.7839, 35.9895],
                zoom: 13
            }),
            getGuid = function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
            },
            settings = {
                socketUrl: 'http://zulu.centre-it.com:7040/monitoring-web/socket',
                subscribeUrl: '/app/subscribe/map/' + getGuid(),
                minVisibleZoom: 11,
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
                    }
                }
            };

        map.addRealtimeLayer('roadsObjects', settings);
    });
</%block>