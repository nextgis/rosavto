<%inherit file="master.mako"/>

<%block name="title">Карта + слой с проложенным маршрутом</%block>

<div class="claro">
    <div style="width:49%; float:left;">
        <div id="map"></div>
        <p>Код с комментариями <a href="${request.route_url('code') + '#routingCode'}">здесь</a></p>
    </div>
    <div style="width:49%; float:right;">
        <div id="map2"></div>
    </div>
</div>

<%block name="inlineScripts">
    <script>
        require([
            'rosavto/Map',
            'rosavto/NgwServiceFacade',
            'rosavto/LayersInfo',
            'dojo/domReady!'
        ], function (Map, NgwServiceFacade, LayersInfo) {
            //---- common
            var startPoint = L.latLng(55.885548, 38.783279);
            var endPoint = L.latLng(57.635199, 40.386479);
            var barrierPoint = L.latLng(56.969893, 39.203637);
            var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl);


            var startIcon = L.icon({iconUrl: "${request.static_url('rosavto:static/start-point.png')}",
                iconSize: [32, 37],
                iconAnchor: [16, 36],
                popupAnchor: [0, -35]
            });
            var finishIcon = L.icon({iconUrl: "${request.static_url('rosavto:static/finish-point.png')}",
                iconSize: [32, 37],
                iconAnchor: [16, 36],
                popupAnchor: [0, -35]
            });
            var barIcon = L.icon({iconUrl: "${request.static_url('rosavto:static/barrier-point.png')}",
                iconSize: [32, 37],
                iconAnchor: [16, 36],
                popupAnchor: [0, -35]
            });

            //---- map without restriction
            var map = new Map('map', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

            //---- map with restriction
            var map2 = new Map('map2', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

            var layersInfo = new LayersInfo(ngwServiceFacade);
            map.showLoader();
            map2.showLoader();
            layersInfo.fillLayersInfo().then(function (store) {
                var baseLayers = layersInfo.getBaseLayers();
                map.addBaseLayers(baseLayers);
                map2.addBaseLayers(baseLayers);
                map.hideLoader();
                map2.hideLoader();


                L.marker(startPoint, {icon: startIcon}).addTo(map.getLMap()).bindPopup('Start point');
                L.marker(endPoint, {icon: finishIcon}).addTo(map.getLMap()).bindPopup('End point');

                var route_data = ngwServiceFacade.getRouteByCoord(startPoint, endPoint);
                route_data.then(function (geoJson) {
                    if (geoJson.features) {
                        var layer = L.geoJson(geoJson.features, {
                            style: {color: '#FF0000', opacity: 0.7 }
                        });
                        map.addGeoJsonLayer('Маршрут', layer);
                    }
                });

                L.marker(startPoint, {icon: startIcon}).addTo(map2.getLMap()).bindPopup('Start point');
                L.marker(endPoint, {icon: finishIcon}).addTo(map2.getLMap()).bindPopup('End point');
                L.marker(barrierPoint, {icon: barIcon}).addTo(map2.getLMap()).bindPopup('Restriction point').openPopup();

                var route_data = ngwServiceFacade.getRouteByCoord(startPoint, endPoint, barrierPoint);
                route_data.then(function (geoJson) {
                    if (geoJson.features) {
                        var layer = L.geoJson(geoJson.features, {
                            style: {color: '#FF0000', opacity: 0.7 }
                        });
                        map2.addGeoJsonLayer('Маршрут c ограничением', layer);
                    }
                });
            });


        });
    </script>
</%block>