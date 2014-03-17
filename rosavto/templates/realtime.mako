<%inherit file="master.mako"/>

<%block name="title">Realtime</%block>

<div class="code-description">
    <p>Код с комментариями <a href="${request.route_url('code') + '#realtimeCode'}">здесь</a></p>
</div>

<div id="map"></div>

<%block name="inlineScripts">
    require(['rosavto/Map', 'rosavto/Layers/RealtimeLayer', 'dojo/domReady!'], function (Map, RealtimeLayer) {
        var map = new Map('map', {
                center: [59.3441, 31.2633],
                zoom: 13
            }),
            getGuid = function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
            },
            styles = {
                'Accident': {
                    point: {className: 'accident'},
                    line: {opacity:0.5, weight: 15, color: '#FF0000'}
                },
                'snow' : {
                    point: {className: 'snow'},
                    line: {opacity:0.5, weight: 15, color: '#1E00FF'}
                }
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
                    },
                    'Weighing': {  // Значение типа объекта
                        className: 'weighing' // Название css класса, применяемого к маркеру данного типа
                    },
                    'Traffic': {  // Значение типа объекта
                        className: 'traffic' // Название css класса, применяемого к маркеру данного типа
                    }
                }
            };

            var realtimeLayer = new RealtimeLayer(null, {
                callbackClick: function (feature) {
                    alert(JSON.stringify(feature));
                },
                styles: styles
            });

            map.addGeoJsonLayer('Происшествия', realtimeLayer);
            realtimeLayer.start('/app/subscribe/map/' + getGuid());
            realtimeLayer._setDebug(true);
    });
</%block>