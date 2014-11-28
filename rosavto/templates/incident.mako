<%inherit file="master.mako"/>

<%block name="title">Происшествия</%block>

<select id="roadsSelector" name="road1" data-dojo-type="dijit/form/Select">
    <option value="{65de3f89-c234-44c5-867d-fd8961eb8644}">М-10 "Россия" Москва-Тверь-Великий Новгород-Санкт-Петербург
    </option>
    <option value="{11b970fb-a9a8-474b-92cd-b0aa6a7f2d28}">А-147 Джубга-Сочи-граница с Республикой Абхазия</option>
</select>
</br>
<button id="test1" style="margin: 3px; background-color: gainsboro;">Создать: ДТП М-10 «Россия» 614 + 870</button>
</br>
<button id="test2" style="margin: 3px; background-color: gainsboro;">Создать: Занос А-147 77+376 - 80+570</button>
</br>
<button id="test3" style="margin: 3px; background-color: gainsboro;">Отобразить: Метеостанция М-10 «Россия» 614 + 870
</button>
</br>
<button id="test4" style="margin: 3px; background-color: gainsboro;">Отобразить: ПУИДД М-10 «Россия» 614 + 880
</button>


<div class="claro">
    <div style="width:49%; float:left;">
        <div id="map"></div>
        <div style="margin: 5px 0;">
            Тип создаваемого происшествия:
            <select id="typesSelector" name="select1" data-dojo-type="dijit/form/Select">
                <option value="accident">ДТП - происшествие</option>
                <option value="snow">Снежный занос - происшествие</option>
                <option value="meteo">Метеостанция</option>
                <option value="puid">ПУИД</option>
            </select>

            <button id="create" style="margin-left: 10px; background-color: gainsboro;">Создать новый объект
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
    <style>
        div.leaflet-marker-icon.sensor {
            background-image: url('/static/css/images/sensors-states.png');
            width: 44px !important;
            height: 44px !important;
            /*margin-left: -22px !important;*/
            margin-top: -27px !important;
        }

        /* meteo styles */
        .sensor.meteo-normal {
            background-position: 0 0;
        }

        .sensor.meteo-attention {
            background-position: -44px 0;
        }

        .sensor.meteo-alarm {
            background-position: -88px 0;
        }

        .sensor.meteo-inactive {
            background-position: -132px 0;
        }

        .sensor.meteo-failure {
            background-position: -176px 0;
        }

        .sensor.meteo-disabled {
            background-position: -220px 0;
        }

        .sensor.meteo-normal.selected {
            background-position: -264px 0;
        }

        .sensor.meteo-attention.selected {
            background-position: -308px 0;
        }

        .sensor.meteo-alarm.selected {
            background-position: -352px 0;
        }

        .sensor.meteo-inactive.selected {
            background-position: -396px 0;
        }

        .sensor.meteo-failure.selected {
            background-position: -400px 0;
        }

        .sensor.meteo-disabled.selected {
            background-position: -484px 0;
        }

        /* traffic styles */
        .traffic-normal {
            background-position: 0 -132px;
        }

        .traffic-attention {
            background-position: -44px -132px;
        }

        .traffic-alarm {
            background-position: -88px -132px;
        }

        .traffic-inactive {
            background-position: -132px -132px;
        }

        .traffic-failure {
            background-position: -176px -132px;
        }

        .traffic-disabled {
            background-position: -220px -132px;
        }

        .traffic-normal.selected {
            background-position: -264px -132px;
        }

        .traffic-attention.selected {
            background-position: -308px -132px;
        }

        .traffic-alarm.selected {
            background-position: -352px -132px;
        }

        .traffic-inactive.selected {
            background-position: -396px -132px;
        }

        .traffic-failure.selected {
            background-position: -400px -132px;
        }

        .traffic-disabled.selected {
            background-position: -484px -132px;
        }
    </style>
    <script>
    require([
                'dojo/DeferredList',
                'dojo/query',
                'dojo/_base/array',
                'dojo/html',
                'rosavto/Map',
                'rosavto/NgwServiceFacade',
                'rosavto/LayersInfo',
                'rosavto/Layers/StyledGeoJsonLayer',
                'rosavto/controls/L.Control.IncidentEditor',
                'dojo/parser',
                'dijit/form/Select',
                'dojo/domReady!'],

            function (DeferredList, query, array, html, Map, NgwServiceFacade, LayersInfo, StyledGeoJsonLayer, IncidentEditor, parser, Select) {
                parser.parse();

                var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                        map = new Map('map', {
                            center: [59.34601, 31.23893],
                            zoom: 16,
                            zoomControl: true,
                            legend: true,
                            easyPrint: false
                        }),
                        map2 = new Map('map2', {
                            center: [59.34601, 31.23893],
                            zoom: 16,
                            zoomControl: true,
                            legend: true,
                            easyPrint: false
                        }),
                        layersInfo,
                        styles,
                        getIncident1, getIncident2, getIncident3,
                        layer;

                layersInfo = new LayersInfo(ngwServiceFacade);
                map.showLoader();
                map2.showLoader();
                layersInfo.fillLayersInfo().then(function (store) {
                    var baseLayers = layersInfo.getBaseLayers();
                    map.addBaseLayers(baseLayers);
                    map2.addBaseLayers(baseLayers);
                    map.addNgwTileLayer('Тестовые дороги', ngwUrlForTiles, 46);
                    map2.addNgwTileLayer('Тестовые дороги', ngwUrlForTiles, 46);
                    map.hideLoader();
                    map2.hideLoader();

                    styles = {
                        accident: {
                            position: 'front',
                            point: {type: 'div', className: 'accident'},
                            line: {opacity: 0.8, weight: 5, color: '#FF0000'}
                        },
                        snow: {
                            position: 'back',
                            point: {type: 'div', className: 'snow'},
                            line: {opacity: 0.5, weight: 15, color: '#0040FF'}
                        },
                        meteo: layersInfo.getStylesByLayersKeynames(['sensors_meteo'])['sensors_meteo']['objectStyle'],
                        puid: layersInfo.getStylesByLayersKeynames(['sensors_traffic'])['sensors_traffic']['objectStyle']
                    };

                    layer = new StyledGeoJsonLayer(null, {
                        callbackClick: function (id, feature) {
                            alert(feature.properties.__type);
                        },
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

                    var getSelectedType = function (id) {
                        var selectedType;
                        array.forEach(dijit.byId(id).getOptions(), function (opt, i) {
                            if (opt.selected) {
                                selectedType = opt.value;
                            }
                        });
                        return selectedType;
                    };

                    query('#create').on('click', function () {
                        var geoJson = incidentEditor.getGeoJsonData();

                        if (geoJson) {
                            var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });

                            layer.addObject(geoJson, getSelectedType("typesSelector"), guid);
                            map2.getLMap().fitBounds(layer.getBounds());
                            incidentEditor.erase();
                        }
                    });

                    query('#center').on('click', function () {
                        incidentEditor.centerByObject(23, '{1437e736-974f-462a-86f8-85f0910089f0}', 3000);
                    });

                    var roadsSelector = dijit.byId('roadsSelector');

                    roadsSelector.on('change', function (roadGuid) {
                        incidentEditor.centerByObject(14, roadGuid, 3000);
                        incidentEditor.setRoadGuid(roadGuid);
                    });

                    query('#test1').on('click', function () {
                        incidentEditor.setRoadGuid('{65de3f89-c234-44c5-867d-fd8961eb8644}');
                        incidentEditor.createMarkersByDistance([
                            {km: 614, m: 870}
                        ]);
                    });

                    query('#test2').on('click', function () {
                        incidentEditor.setMode('line');
                        incidentEditor.setRoadGuid('{11b970fb-a9a8-474b-92cd-b0aa6a7f2d28}');
                        incidentEditor.createMarkersByDistance([
                            {km: 77, m: 376},
                            {km: 80, m: 570}
                        ]);
                    });

                    query('#test3').on('click', function () {
                        incidentEditor.setRoadGuid('{65de3f89-c234-44c5-867d-fd8961eb8644}');

                        incidentEditor.options.callbackDistanceChange = function () {
                            var geoJson = incidentEditor.getGeoJsonData();

                            if (geoJson) {
                                var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                    return v.toString(16);
                                });

                                layer.addObject(geoJson, 'meteo', guid);
                                map2.getLMap().fitBounds(layer.getBounds());
                                incidentEditor.erase();
                            }
                            incidentEditor.options.callbackDistanceChange = function (data) {
                                console.log('IncidentEditor: ' + JSON.stringify(data));
                            };
                        };

                        incidentEditor.createMarkersByDistance([
                            {km: 614, m: 870}
                        ]);
                    });

                    query('#test4').on('click', function () {
                        incidentEditor.setRoadGuid('{65de3f89-c234-44c5-867d-fd8961eb8644}');

                        incidentEditor.options.callbackDistanceChange = function () {
                            var geoJson = incidentEditor.getGeoJsonData();

                            if (geoJson) {
                                var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                    return v.toString(16);
                                });

                                layer.addObject(geoJson, 'puid', guid);
                                map2.getLMap().fitBounds(layer.getBounds());
                                incidentEditor.erase();
                            }
                            incidentEditor.options.callbackDistanceChange = function (data) {
                                console.log('IncidentEditor: ' + JSON.stringify(data));
                            };
                        };

                        incidentEditor.createMarkersByDistance([
                            {km: 614, m: 880}
                        ]);
                    });
                });


            });
    </script>
</%block>