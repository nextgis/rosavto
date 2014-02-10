<%inherit file="master.mako"/>

<%block name="title">Происшествия</%block>

<div class="code-description">
    <p>Код с комментариями <a href="${request.route_url('code') + '#incidentCode'}">здесь</a></p>
</div>

<div>
    <p><button id="buildLine">Построить линию</button> </br>
        по GUID дороги = 4886ad28-7b11-9eba-5c9d-a4ecfd608099 </br>
        с 64 км 321 м по 79 км 321 м</p>
</div>

<div id="map"></div>

<div><p><button id="getGeoJson">Получить геоданные из редактора</button>
</div>

<br/>

<div>
    Данные из callback функции редактора при изменении сведений о пикетаже
    <div id="editorInfo"></div>
</div>

<%block name="inlineScripts">
    require([
        'dojo/DeferredList',
        'dojo/query',
        'dojo/html',
        'rosavto/Map',
        'rosavto/NgwServiceFacade',
        'rosavto/Layers/StyledGeoJsonLayerMapExtension',
        'rosavto/Layers/IncidentsLayer',
        'rosavto/controls/L.Control.IncidentEditor',
        'dojo/domReady!'],

    function (DeferredList, query, html, Map, NgwServiceFacade, StyledGeoJsonLayerMapExtension, IncidentsLayer, IncidentEditor) {
        var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrlBase),
            map = new Map('map', {
                center: [56.0369, 35.8788],
                zoom: 16,
                zoomControl: true,
                legend: true
            }),
            styles,
            getIncident1, getIncident2, getIncident3,
            layer;

        map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);

        styles = {
            'accident': {
                Point: {className: 'accident'}
            },
            'jam' : {
                Point: {className: 'jam'}
            }
        };
        layer = map.createStyledGeoJsonLayer('incidents', styles, function () {
            alert('Вызван callback для объекта типа ' + this.properties.type);
        });

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

        var dl = new DeferredList([getIncident1, getIncident2, getIncident3]);

        dl.then(function (incidents) {
            var countIncidents = incidents.length,
                i;

            for (var i = 0; i < countIncidents; i++) {
                incidents[i][1].properties.type = i % 2 == 0 ? 'accident' : 'jam';
                layer.addData(incidents[i][1]);
            }
        });

        incidentsLayer = new IncidentsLayer(null, {
            ngwServiceFacade: ngwServiceFacade,
            color: '#FF0000',
            weight: 20,
            opacity: 0.5
        });

        map.addGeoJsonLayer('Происшествия', incidentsLayer);

        query('#buildLine').on('click', function () {
            incidentsLayer.showIncidentLine('4886ad28-7b11-9eba-5c9d-a4ecfd608099',
                                            {distance: {km: 123, m: 200}},
                                            {distance: {km: 123, m: 450}}

            );
        });

        var editorInfo = query('#editorInfo')[0];

        var incidentEditor = new L.Control.IncidentEditor({
            ngwServiceFacade: ngwServiceFacade,
            map: map,
            idLayer: 17,
            roadGuid: '4886ad28-7b11-9eba-5c9d-a4ecfd608099',
            modes: ['point', 'line'],
            activeMode: 'point',
            callbackDistanceChange: function (distances) {
                html.set(editorInfo, JSON.stringify(distances));
            }
        });

        map.getLMap().addControl(incidentEditor);

        query('#getGeoJson').on('click', function () {
            alert(JSON.stringify(incidentEditor.getGeoJsonData()));
        });
    });
</%block>