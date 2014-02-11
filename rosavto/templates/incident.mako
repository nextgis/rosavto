<%inherit file="master.mako"/>

<%block name="title">Происшествия</%block>

<div class="claro">
    <div style="width:49%; float:left;">
        <div id="map"></div>
        <div style="margin: 5px 0;">
            Тип создаваемого объекта:
            <select id="typesSelector" name="select1" data-dojo-type="dijit/form/Select">
                <option value="accident">ДТП</option>
                <option value="snow">Снежный занос</option>
            </select>

            <button id="create" style="margin-left: 10px; background-color: gainsboro;">Создать новое происшествие
            </button>
        </div>
        <div style="margin: 20px 0">
            <div>
                <button id="getGeoJson">Получить геоданные из редактора</button>
            </div>
            <div>
                Данные из callback функции редактора при изменении сведений о пикетаже:
                <div id="editorInfo"></div>
            </div>
        </div>
    </div>
    <div style="width:49%; float:right;">
        <div id="map2"></div>
        <div>
##            Происшествия:
            <br/>
            <div id="incidentsList"></div>
        </div>
    </div>
</div>




<%block name="inlineScripts">
    require([
        'dojo/DeferredList',
        'dojo/query',
        'dojo/_base/array',
        'dojo/html',
        'rosavto/Map',
        'rosavto/NgwServiceFacade',
        'rosavto/Layers/StyledGeoJsonLayer',
        'rosavto/Layers/StyledGeoJsonLayerMapExtension',
        'rosavto/Layers/IncidentsLayer',
        'rosavto/controls/L.Control.IncidentEditor',
        'dojo/parser',
        'dijit/form/Select',
        'dojo/domReady!'],

    function (DeferredList, query, array, html, Map, NgwServiceFacade, StyledGeoJsonLayer, StyledGeoJsonLayerMapExtension, IncidentsLayer, IncidentEditor,
                parser, Select) {
        parser.parse();

        var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrlBase),
            map = new Map('map', {
                center: [56.0369, 35.8788],
                zoom: 16,
                zoomControl: true,
                legend: true
            }),
            map2 = new Map('map2', {
                    center: [56.0369, 35.8788],
                    zoom: 16,
                    zoomControl: true,
                    legend: true
                }),
            styles,
            getIncident1, getIncident2, getIncident3,
            layer;

        map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);
        map2.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);

        styles = {
            'accident': {
                point: {className: 'accident'},
                line: {opacity:0.5, weight: 15, color: '#FF0000'}
            },
            'snow' : {
                point: {className: 'snow'},
                line: {opacity:0.5, weight: 15, color: '#1E00FF'}
            }
        };

        layer = new StyledGeoJsonLayer(null, {
            callbackClick: function () {},
            styles: styles
        });

        map2.addGeoJsonLayer('Происшествия', layer);

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

        var getSelectedType = function () {
            var selectedType;
            array.forEach(dijit.byId("typesSelector").getOptions(), function(opt, i) {
                if (opt.selected) {
                    selectedType = opt.value;
                }
            });
            return selectedType;
        };

        query('#create').on('click', function () {
            var geoJson = incidentEditor.getGeoJsonData();

            if (geoJson) {
                var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });

                layer.addObject(geoJson, getSelectedType(), guid);
                incidentEditor.erase();
            }
        });
    });
</%block>