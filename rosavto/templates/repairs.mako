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
                    'dojo/DeferredList',
                    'rosavto/Map',
                    'rosavto/LayersInfo',
                    'rosavto/MapIdentify',
                    'rosavto/AttributeGetter',
                    'rosavto/AttributesServiceFacade',
                    'rosavto/NgwServiceFacade',
                    'rosavto/ObjectSelector',
                    'rosavto/realtime/SensorsLayer',
                    'rosavto/Layers/RealtimeLayer',
                    'rosavto/Layers/StyledGeoJsonLayer',
                    'rosavto/Layers/RepairsLayer',
                    'rosavto/Constants',
                    'dojo/domReady!'],

                function (parser, Select, domClass, lang, registry, DeferredList, Map, LayersInfo, MapIdentify, AttributeGetter,
                          AttributesServiceFacade, NgwServiceFacade, ObjectSelector, SensorsLayer, RealtimeLayer, StyledGeoJsonLayer,
                          RepairsLayer, Constants) {
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

                        // Создаем слой ремонтов
                        // Подключаем из rosavto/Layers/RepairsLayer
                        var l = new RepairsLayer(null, {
                            ngwServiceFacade: ngwServiceFacade,
                            layersInfo: layersInfo,
                            map: map,
                            // Определяем стили для статусов, которые вернет П-М сервис
                            // В примере предполагается, что статусы называются
                            // 'before' и 'after'
                            styles: {
                                'before': {
                                    point: {'type': 'circle', 'radius': 3, 'style': {'opacity': 1, 'fillOpacity': 1, 'weight': 1, 'color': '#730000', 'fillColor': '#C92626'}},
                                    line: {opacity: 0.5, weight: 3, color: '#FF0000'}
                                },
                                'after': {
                                    point: {'type': 'circle', 'radius': 3, 'style': {'opacity': 1, 'fillOpacity': 1, 'weight': 1, 'color': '#730000', 'fillColor': '#C92626'}},
                                    line: {opacity: 0.5, weight: 3, color: '#00D600'}
                                }
                            },

                            // Адрес сервиса П-М, который вернет статусы
                            // Сервис принимает запросы POST типа
                            // Данные на вход
                            // guids: строка, массив вида '["535a698c-9d2c-4429-a847-db6a4642737f","d70b3a9f-e43b-42db-87ba-aff19a31caca"]'
                            // time: то, что вернет функция getCurrentTime
                            getRepairsStatusUrl: '${request.route_url('repairs_status')}',

                            // функция, возвращающая текущее время из машины времени
                            // должна быть реализована на стороне П-М
                            getCurrentTime: function () {
                                return '';
                            },

                            // Метка отладки
                            // Если включена, то будут выводиться в консоль значения GUID
                            // которые вернуло ГИС, но сервис П-М не нашел статус
                            debug: true
                        });
                        map.addVectorLayer(l, 'Ремонты');
                    });

                });
    </script>
</%block>