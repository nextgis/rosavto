<%inherit file="master.mako"/>

<%block name="title">Карта + слой с проложенным маршрутом</%block>

<div id="map"></div>
<div id="map2"></div>

<pre>
    <p>Код с комментариями <a href="${request.route_url('code') + '#routingCode'}">здесь</a></p>
</pre>

<%block name="inlineScripts">
    require(['rosavto/Map', 'dojo/domReady!'], function (Map) {
        //---- common
        var startPoint = L.latLng(55.885548, 38.783279);
        var endPoint = L.latLng(57.635199, 40.386479);
        var barrierPoint = L.latLng(56.969893, 39.203637);

        var startIcon = L.icon( {iconUrl:   "${request.static_url('rosavto:static/start-point.png')}",
                                 iconSize:  [32, 37],
                                 iconAnchor:[16, 36],
                                 popupAnchor:  [0, -35]
                                 });
        var finishIcon = L.icon( {iconUrl: "${request.static_url('rosavto:static/finish-point.png')}",
                                 iconSize:  [32, 37],
                                 iconAnchor:[16, 36],
                                 popupAnchor:  [0, -35]
                                 });
        var barIcon = L.icon( {iconUrl: "${request.static_url('rosavto:static/barrier-point.png')}",
                                 iconSize:  [32, 37],
                                 iconAnchor:[16, 36],
                                 popupAnchor:  [0, -35]
                                 });

        //---- map without restriction
        var map = new Map('map', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

        L.marker(startPoint, {icon: startIcon}).addTo(map.getLMap()).bindPopup('Start point');
        L.marker(endPoint, {icon: finishIcon}).addTo(map.getLMap()).bindPopup('End point');

        //ugly! need more clear code
        var rUrl = '/routing?from_x='+startPoint.lng+'&from_y='+startPoint.lat+
                    '&to_x='+endPoint.lng+'&to_y='+endPoint.lat;
        map.createGeoJsonLayer('Маршрут', rUrl, {color:'#FF0000', opacity: 0.7 });

        //---- map with restriction
        var map2 = new Map('map2', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

        L.marker(startPoint, {icon: startIcon}).addTo(map2.getLMap()).bindPopup('Start point');
        L.marker(endPoint, {icon: finishIcon}).addTo(map2.getLMap()).bindPopup('End point');
        L.marker(barrierPoint, {icon: barIcon}).addTo(map2.getLMap()).bindPopup('Restriction point').openPopup();

        //ugly! need more clear code
        rUrl = '/routing?from_x=' + startPoint.lng + '&from_y=' + startPoint.lat +
               '&to_x=' + endPoint.lng + '&to_y=' + endPoint.lat +
               '&bar_x=' + barrierPoint.lng + '&bar_y=' + barrierPoint.lat;
        map2.createGeoJsonLayer('Маршрут c ограничением', rUrl, {color:'#FF0000', opacity: 0.7 });
    });
</%block>
