<%inherit file="master.mako"/>

<%block name="title">Карта + слой с проложенным маршрутом</%block>

<table class="claro">
    <tr>
        <td>ID дороги</td>
        <td><input id="way_guid" type="text" size="37" value="c902beec-8a15-45c9-9b8a-eda30c0e4cbd"></td>
    </tr>
    <tr>
        <td>Пикетаж начала</td>
        <td><input id="first" type="text" size="10" value="31000"></td>
    </tr>
    <tr>
        <td>Пикетаж окончания</td>
        <td><input id="last" type="text" size="10" value="39000"> <br/></td>
    </tr>
    <tr>
        <td colspan="2"><button id="get_route" style="background-color: gainsboro;">Построить маршрут</button></td>
    </tr>
</table>
<div id="map"></div>
<p>Код с комментариями <a href="${request.route_url('code') + '#routingCode'}">здесь</a></p>


<%block name="inlineScripts">
    <script>
        require([
            'rosavto/Map',
            'rosavto/NgwServiceFacade',
            'dojo/query',
            'dojo/domReady!'
        ], function (Map, NgwServiceFacade, query) {
            //---- common
            var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl);

            var map = new Map('map', {
                center: [57, 38],
                zoom: 7,
                zoomControl: true,
                legend: true
            });

            var chainage_lyr = L.geoJson( [], {
                style: {color: '#0000C3', opacity: 0.7 }
            });
            map.addGeoJsonLayer('Сегмент для объезда', chainage_lyr);

            var route_lyr = L.geoJson( [], {
                style: {color: '#FF0000', opacity: 0.7 }
            });
            map.addGeoJsonLayer('Маршрут', route_lyr);


            query('#get_route').on('click', function () {
                var way_id = dojo.byId('way_guid').value;
                var first = dojo.byId('first').value;
                var last = dojo.byId('last').value;

                dojo.byId('get_route').disabled=true;
                dojo.byId('get_route').innerHTML="Подождите...";

                var chainage_data = ngwServiceFacade.getWaySublineByChainage(17, way_id, first, last);
                var route_data = ngwServiceFacade.getRouteByChainage(17, way_id, first, last);

                route_lyr.clearLayers();
                chainage_lyr.clearLayers();

                route_data.then(function (geoJson) {
                    dojo.byId('get_route').disabled=false;
                    dojo.byId('get_route').innerHTML="Построить маршрут";

                    if (geoJson.features) {
                        route_lyr.addData(geoJson);
                        map.getLMap().fitBounds(route_lyr.getBounds().extend(chainage_lyr.getBounds()));
                    }
                },  function(err){
                    dojo.byId('get_route').disabled=false;
                    dojo.byId('get_route').innerHTML="Построить маршрут";
                    alert(err)
                });

                chainage_data.then(function (geoJson) {
                    if (geoJson) {
                        //UGLY!!!
                        geoJson_f = {'type': "FeatureCollection", 'features': [geoJson] };
                        chainage_lyr.addData(geoJson_f);
                        map.getLMap().fitBounds(chainage_lyr.getBounds().extend(route_lyr.getBounds()));
                    }
                });
            })
        });
    </script>
</%block>