<%inherit file="master.mako"/>

<%block name="title">Карта + слой с проложенным маршрутом</%block>

<div id="map"></div>
<div id="map2"></div>

<pre>
    Код для добавления слоя с проложенным маршрутом:
    <code data-language="javascript">
        // Загружаем модуль <a href="${request.static_url('rosavto:static/js/rosavto/Map.js')}">rosavto/Map</a> после готовности DOM дерева
        require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
            var map = new Map('map', {
                    center: [57.0, 38.0], // Задаем центр
                    zoom: 7 // Указываем начальный зум
                    zoomControl: true, // Показываем элемент управления зумом
                    legend: true // Показываем легенду карты
                });
        });
    </code>
</pre>

<%block name="inlineScripts">
    require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        var map = new Map('map', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

        var startPoint = L.latLng(56.001548, 38.773279);
        var endPoint = L.latLng(57.635199, 40.386479);
        var barrierPoint = L.latLng(56.969893, 39.203637);

        //markers not working???
        //L.marker(startPoint).addTo(map)
        //.bindPopup('Start point').openPopup();

        //L.marker(endPoint).addTo(map)
        //.bindPopup('End point').openPopup();

        //ugly! need more clear code
        var rUrl = '/routing?from_x='+startPoint.lng+'&from_y='+startPoint.lat+
                    '&to_x='+endPoint.lng+'&to_y='+endPoint.lat;
        map.addGeoJsonLayer('Маршрут', rUrl, {color:'#FF0000', opacity: 0.7 });

        //---- map with restriction
        var map2 = new Map('map2', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

        //L.marker(startPoint).addTo(map2)
        //.bindPopup('Start point').openPopup();

        //L.marker(endPoint).addTo(map2)
        //.bindPopup('End point').openPopup();

        //L.marker(barrierPoint).addTo(map2)
        //.bindPopup('Restriction point').openPopup();

        //ugly! need more clear code
        rUrl = '/routing?from_x=' + startPoint.lng + '&from_y=' + startPoint.lat +
               '&to_x=' + endPoint.lng + '&to_y=' + endPoint.lat +
               '&bar_x=' + barrierPoint.lng + '&bar_y=' + barrierPoint.lat;
        map2.addGeoJsonLayer('Маршрут c ограничением', rUrl, {color:'#FF0000', opacity: 0.7 });
    });
</%block>
