<%inherit file="master.mako"/>

<%block name="title">Происшествия</%block>

<div class="code-description">
    <p>Код с комментариями <a href="${request.route_url('code') + '#incidentCode'}">здесь</a></p>
</div>

<div id="map"></div>

<%block name="inlineScripts">
    require([
        'dojo/DeferredList',
        'rosavto/Map',
        'rosavto/NgwServiceFacade',
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

        map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);

        styles = {
            'accident': {
                Point: {className: 'accident'}
            },
            'jam' : {
                Point: {className: 'jam'}
            }
        };
        map.createCustomizableGeoJsonLayer(styles, function () {
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
                map.addCustomizableGeoJsonData(incidents[i][1]);
            }
        });
    });
</%block>