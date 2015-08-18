<%inherit file="master.mako"/>

<%block name="title">Программное выделение пиктограмм</%block>

<div class="code-description">
    <a href="https://github.com/nextgis/rosavto/issues/20">Описание issue</a>
    <p>
        <label data-layer-keyname="-1" id="layerName">Выберите слой на карте</label>
        <select id="objectsSelect"></select>
    </p>
    <p>
        <label data-layer-keyname="-1" id="layerName">Объекты сенсорного слоя</label>
        <select id="objectsSelectSensor"></select>
    </p>
</div>

<div id="map"></div>

<%block name="inlineScripts">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/sensors/sensors.css')}"/>
    <script>
        document.objectSelectorGlobal = null;
        require([
                    'dojo/parser',
                    'dijit/form/Select',
                    'dojo/dom-class',
                    'dojo/_base/lang',
                    'dojo/topic',
                    'dijit/registry',
                    'rosavto/Map',
                    'rosavto/LayersInfo',
                    'rosavto/MapIdentify',
                    'rosavto/AttributeGetter',
                    'rosavto/AttributesServiceFacade',
                    'rosavto/NgwServiceFacade',
                    'rosavto/ObjectSelector',
                    'rosavto/realtime/SensorsLayer',
                    'rosavto/Layers/RealtimeLayer',
                    'rosavto/Constants',
                    'dojo/domReady!'],

                function (parser, Select, domClass, lang, topic, registry, Map, LayersInfo, MapIdentify, AttributeGetter,
                          AttributesServiceFacade, NgwServiceFacade, ObjectSelector, SensorsLayer, RealtimeLayer,
                          Constants) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            attributesBaseUrl = '/',
                            map = new Map('map', {
                                center: [55.529, 37.584],
                                zoom: 10,
                                zoomControl: true,
                                legend: true,
                                easyPrint: false
                            }),
                            layersInfo,
                            mapIdentify,
                            objectSelector;

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    map.showLoader();
                    layersInfo.fillLayersInfo().then(function (store) {
                        var layersByKeyname = layersInfo.getLayersDictByKeyname();
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayerWithKeyname('roads_dep', 'Сеть дорог ДЕП', ngwUrlForTiles, layersByKeyname['roads_dep'].style_id, null);
                        map.addNgwTileLayerWithKeyname('roads', 'Сеть федеральных дорог', ngwUrlForTiles, layersByKeyname['roads'].style_id, null);
                        map.addNgwTileLayerWithKeyname('roads_regional', 'Сеть региональных дорог', ngwUrlForTiles, layersByKeyname['roads_regional'].style_id, null);
                        map.addNgwTileLayerWithKeyname('service', 'Объекты сервиса', ngwUrlForTiles, layersByKeyname['service'].style_id, null);
                        map.hideLoader();

                        objectSelector = new ObjectSelector({
                            map: map,
                            ngwServiceFacade: ngwServiceFacade,
                            layersInfo: layersInfo,
                            realtimeLayer: RealtimeLayer,
                            getHistDate: function () {
                                return '';
                            },
                            afterSelect: function (guid, layerType) {
                                console.log(guid);
                                console.log(layerType);
                                if (Monitoring) {
                                    Monitoring.getApplication().fireEvent('mapObjectSelected', guid, new Date());
                                }
                            },
                            defaultStylesSettings: {
                                fields: {
                                    id: 'uniq_uid',
                                    type: 'type_name'
                                },
                                styles: {
                                    'default': {
                                        point: {},
                                        line: {opacity: 0.5, weight: 15, color: '#FF0000'}
                                    }
                                }
                            }
                        });

                        document.objectSelectorGlobal = objectSelector;

                        mapIdentify = new MapIdentify({
                            map: map,
                            ngwServiceFacade: ngwServiceFacade,
                            layersInfo: layersInfo,
                            objectSelector: objectSelector,
                            fieldIdentify: 'uniq_uid',
                            debug: true
                        });
                        mapIdentify.on();

                        var sensorLayer = new SensorsLayer({
                            objectSelector: objectSelector,
                            objectsSubscribedUrl: '/app/subscribe/map/',
                            ngwServiceFacade: ngwServiceFacade,
                            clusters: ['GRAY', 'GREEN', 'YELLOW', 'RED'],
                            ngwLayersKeynames:['sensors_video', 'sensors_meteo', 'sensors_traffic'],
                            layersStyles: {
                                'Video': layersInfo.getClusterStyleByLayerKeyname('sensors_video'),
                                'Traffic': layersInfo.getClusterStyleByLayerKeyname('sensors_traffic'),
                                'Meteo': layersInfo.getClusterStyleByLayerKeyname('sensors_meteo')
                            },
                            sensorsSubscribesUrl: {
                                'Meteo': '/app/subscribe/meteoStations/',
                                'Traffic': '/app/subscribe/trafficStations/'
                            },
                            sensors: {
                                'Meteo': []
                            },
                            getHistDate: function () {
                                return new Date();
                            }
                        }), lmap = map.getLMap();

                        document.sensorLayer = sensorLayer;

                        lmap.addLayer(sensorLayer);

                        sensorLayer.activateLayers({
                            'Meteo': []
                        });

                        var objectsSelect = new Select({
                            id: 'objectsSelect',
                            value: new Date(),
                            onChange: function (newDate) {

                            }
                        }, 'objectsSelect');
                        objectsSelect.startup();

                        objectsSelect.addOption({
                            disabled:false,
                            label:'----',
                            selected:true,
                            value:-1
                        });

                        objectsSelect.on('change', function () {
                            var value = this.get("value");

                            if (value == '-1') {
                                return false;
                            }

                            var keyname = document.getElementById('layerName').getAttribute('data-layer-keyname');
                            topic.publish('object/select', value, Constants.TileLayer);
                        });

                        map.getLMap().on('layeradd', lang.hitch(this, function (layer) {
                            var keyname = layer.layer.keyname;

                            if (keyname && layer.layer._layerType === Constants.TileLayer) {
                                    var bounds = map.getLMap().getBounds(),
                                        extent = [bounds._southWest.lng, bounds._southWest.lat, bounds._northEast.lng, bounds._northEast.lat];
                                    ngwServiceFacade.identifyFeaturesByLayers([layersByKeyname[keyname].layer_id], extent).then(function (result) {
                                    document.getElementById('layerName').innerHTML = layersByKeyname[keyname].display_name;
                                    document.getElementById('layerName').setAttribute('data-layer-keyname', keyname);
                                    objectsSelect.removeOption(objectsSelect.getOptions());
                                    objectsSelect.addOption({
                                            disabled:false,
                                            label:'Выберите объект',
                                            selected:true,
                                            value:-1
                                        });
                                    for (var i = 0, l = 10; i < l; i++) {
                                        objectsSelect.addOption({
                                            disabled:false,
                                            label:result.features[i].properties.uniq_uid,
                                            selected:false,
                                            value:result.features[i].properties.uniq_uid
                                        });
                                    }
                                });
                            } else if (layer.layer._layerType === Constants.RealtimeLayer) {
                                setTimeout(function () {
                                    var c = layer.layer.layersById;
                                }, 5000);
                            }
                        } ));

                        map.getLMap().on('layerremove', lang.hitch(this, function (layer) {
                            var keyname = layer.layer.keyname;
                            if (!keyname) {
                                return false;
                            }
                            objectsSelect.removeOption(objectsSelect.getOptions());
                            document.getElementById('layerName').innerHTML = 'Выберите слой на карте';
                            document.getElementById('layerName').setAttribute('data-layer-keyname', '-1');
                            objectsSelect.addOption({
                                    disabled:false,
                                    label:'----',
                                    selected:true,
                                    value:-1
                                });
                        } ));

                        var objectsSelectSensor = new Select({
                            id: 'objectsSelectSensor',
                            value: new Date(),
                            onChange: function (guid) {
                                topic.publish('object/select', guid, Constants.SensorsLayer);
                            }
                        }, 'objectsSelectSensor');
                        objectsSelectSensor.startup();

                        objectsSelectSensor.addOption({
                            disabled:false,
                            label:'Загрузка...',
                            selected:true,
                            value: -1
                        });

                        var fillSensorsGuid = function () {
                            if (Object.keys(sensorLayer._markers).length > 10) {
                                objectsSelectSensor.removeOption(objectsSelectSensor.getOptions());
                                objectsSelectSensor.addOption({
                                        disabled:false,
                                        label:'Выберите объект',
                                        selected:true,
                                        value:-1
                                    });
                                var limit = 0;
                                for (var guid in sensorLayer._markers) {
                                    limit++;
                                    if (limit === 10) break;
                                    objectsSelectSensor.addOption({
                                        disabled:false,
                                        label: guid,
                                        selected:false,
                                        value: guid
                                    });
                                }
                                return false;
                            }
                            setTimeout(fillSensorsGuid, 5000);
                        };

                        fillSensorsGuid();

                        map.on('');
                    });

                });
    </script>
</%block>