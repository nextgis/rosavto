<%inherit file="master.mako"/>

<%block name="title">Программное выделение пиктограмм</%block>

<div class="code-description">
    <a href="https://github.com/nextgis/rosavto/issues/20">Описание issue</a>
    <p>
        <label data-layer-keyname="-1" id="layerName">Выберите слой на карте</label>

        <select id="objectsSelect">
        </select>
    </p>
</div>

<div id="map"></div>

<%block name="inlineScripts">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/sensors/sensors.css')}"/>
    <script>
        require([
                    'dojo/parser',
                    'dijit/form/Select',
                    'dojo/dom-class',
                    'dojo/_base/lang',
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

                function (parser, Select, domClass, lang, registry, Map, LayersInfo, MapIdentify, AttributeGetter,
                          AttributesServiceFacade, NgwServiceFacade, ObjectSelector, SensorsLayer, RealtimeLayer,
                          Constants) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            attributesBaseUrl = '/',
                            attributesServiceFacade = new AttributesServiceFacade(attributesBaseUrl),
                            map = new Map('map', {
                                center: [55.529, 37.584],
                                zoom: 7,
                                zoomControl: true,
                                legend: true,
                                easyPrint: false
                            }),
                            layersInfo,
                            mapIdentify,
                            attributeGetter,
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

                        mapIdentify = new MapIdentify({
                            map: map,
                            ngwServiceFacade: ngwServiceFacade,
                            layersInfo: layersInfo,
                            fieldIdentify: 'uniq_uid',
                            debug: true
                        });
                        mapIdentify.on();

                        attributeGetter = new AttributeGetter({
                            map: map,
                            ngwServiceFacade: ngwServiceFacade,
                            attributesServiceFacade: attributesServiceFacade,
                            getHistDate: function () {
                                return new Date();
                            },
                            mapIdentify: mapIdentify,
                            defaultStylesSettings: {
                                fields: {
                                    id: 'uniq_uid',
                                    type: 'type_name'
                                },
                                style: {
                                    'default': {
                                        point: {},
                                        line: {opacity: 0.5, weight: 15, color: '#FF0000'}
                                    }
                                }
                            },
                            debug: true
                        });

                        objectSelector = new ObjectSelector({
                            map: map,
                            ngwServiceFacade: ngwServiceFacade,
                            mapIdentify: mapIdentify,
                            attributeGetter: attributeGetter,
                            layersInfo: layersInfo,
                            defaultStylesSettings: {
                                fields: {
                                    id: 'uniq_uid',
                                    type: 'type_name'
                                },
                                style: {
                                    'default': {
                                        point: {},
                                        line: {opacity: 0.5, weight: 15, color: '#FF0000'}
                                    }
                                }
                            }
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
                            objectSelector.selectObject(keyname, value);
                        });

                        map.getLMap().on('layeradd', lang.hitch(this, function (layer) {
                            var keyname = layer.layer.keyname;

                            if (keyname && layer.layer._layerType === Constants.TileLayer) {
                                    ngwServiceFacade.getObjectsFromLayer(layersByKeyname[keyname].layer_id).then(function (objects) {
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
                                            label:objects[i].uniq_uid,
                                            selected:false,
                                            value:objects[i].uniq_uid
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
                    });

                });
    </script>
</%block>