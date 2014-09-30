<%inherit file="master.mako"/>

<%block name="title">Датчики</%block>

<div class="code-description">

</div>

<div id="map"></div>


<%block name="inlineScripts">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/sensors/sensors.css')}"/>
    <script>
        Monitoring.contextPath = 'http://192.168.255.1:2012/monitoring-web/';
        require([
                    'dojo/parser',
                    'dijit/form/DateTextBox',
                    'dijit/form/Button',
                    'dijit/form/TimeTextBox',
                    'dijit/form/TextBox',
                    'dijit/registry',
                    'dojo/dom-class',
                    'rosavto/Map',
                    'rosavto/LayersInfo',
                    'rosavto/MapIdentify',
                    'rosavto/AttributeGetter',
                    'rosavto/AttributesServiceFacade',
                    'rosavto/NgwServiceFacade',
                    'rosavto/Layers/StyledGeoJsonLayer',
                    'rosavto/realtime/SensorsLayer',
                    'dojo/domReady!'],

                function (parser, DateTextBox, Button, TimeTextBox, TextBox, registry, domClass, Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade, StyledGeoJsonLayer, SensorsLayer) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            map = new Map('map', {
                                center: [55.529, 37.584],
                                zoom: 7,
                                zoomControl: true,
                                legend: true
                            }),
                            layersInfo,
                            dateWidget, timeWidget,
                            styledGeoJsonLayer;

                    layersInfo = new LayersInfo(ngwServiceFacade);
                    map.showLoader();
                    layersInfo.fillLayersInfo().then(function (store) {
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayer('Сеть дорог ДЕП', ngwUrlForTiles, 4);
                        map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 51);
                        map.addNgwTileLayer('Сеть региональных дорог', ngwUrlForTiles, 50);
                        map.addNgwTileLayer('Объезды', ngwUrlForTiles, 43);
                        map.addNgwTileLayer('Датчики', ngwUrlForTiles, 53);
                        map.hideLoader();

                        var sensorLayer = new SensorsLayer({
                            objectsSubscribedUrl: '/app/subscribe/map/',
                            clusters: ['GRAY', 'GREEN', 'YELLOW', 'RED'],
                            layersStyles: {
                                'Video': layersInfo.getClusterStyleByLayerKeyname('sensors_video'),
                                'Traffic': layersInfo.getClusterStyleByLayerKeyname('sensors_traffic'),
                                'Meteo': layersInfo.getClusterStyleByLayerKeyname('sensors_meteo')
                            },
                            sensorsSubscribesUrl: {
                                'Meteo': '/app/subscribe/meteoStations/',
                                'Traffic': '/app/subscribe/trafficStations/'
                            },
                            getHistDate: function () {
                                return new Date();
                            }
                        }), lmap = map.getLMap();

                        lmap.addLayer(sensorLayer);
                        sensorLayer.activateLayers({
                            'Meteo': ['TemperatureAir', 'TemperatureRoad', 'TemperatureUnderRoad', 'WindVelocity', 'WindGusts',
                                'WindDirection', 'PrecipitationCode', 'Cloudiness', 'AirPlessure', 'LayerType', 'ReagentAmount', 'ViewDistance',
                                'Humidity', 'AdhesionCoefficient'],
                            'Video': [],
                            'Traffic': ['AverageSpeed', 'Amount', 'Trucks']
                        });
                    });
                });
    </script>
</%block>