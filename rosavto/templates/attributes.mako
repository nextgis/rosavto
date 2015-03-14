<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте.</p>

    <ul class="layersStatus">
        <li>
            Загрузка слоев
        </li>
        <li id="dep">
            <span></span>Сеть дорог ДЕП
        </li>
        <li id="fed">
            <span></span>Сеть федеральных дорог
        </li>
        <li id="reg">
            <span></span>Сеть региональных дорог
        </li>
        <li id="obd">
            <span></span>Объезды
        </li>
        <li id="datch">
            <span></span>Датчики
        </li>
        <li id="regions">
            <span></span>Регионы
        </li>
        <li id="services">
            <span></span>Объекты сервиса
        </li>
        <li  id="pp">
            <span></span>Производственные площадки (пескобазы, теплые стоянки)
        </li>
        <li  id="reservoir">
            <span></span>Водохранилища
        </li>
        <li  id="mchs">
            <span></span>Пункты МЧС
        </li>
    </ul>
</div>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<%block name="inlineScripts">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/sensors/sensors.css')}"/>
    <script>

        Monitoring = {
            getApplication: function () {
                return {
                    fireEvent: function (type, featureId, datetime) {
                        var el = document.getElementById('attributes');
                        el.innerHTML = featureId;
                    }
                }
            }
        };

        require([
                    'dojo/dom-class',
                    'rosavto/Map',
                    'rosavto/LayersInfo',
                    'rosavto/MapIdentify',
                    'rosavto/AttributeGetter',
                    'rosavto/AttributesServiceFacade',
                    'rosavto/NgwServiceFacade',
                    'dojo/domReady!'],

                function (domClass, Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade) {
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
                            attributeGetter;

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    map.showLoader();
                    layersInfo.fillLayersInfo().then(function (store) {
                        var layersByKeyname = layersInfo.getLayersDictByKeyname();
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayerWithKeyname('roads_dep', 'Сеть дорог ДЕП', ngwUrlForTiles, layersByKeyname['roads_dep'].style_id, null, {
                            loading: function () {
                                domClass.add('dep', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('dep', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('roads', 'Сеть федеральных дорог', ngwUrlForTiles, layersByKeyname['roads'].style_id, null, {
                            loading: function () {
                                domClass.add('fed', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('fed', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('roads_regional', 'Сеть региональных дорог', ngwUrlForTiles, layersByKeyname['roads_regional'].style_id, null, {
                            loading: function () {
                                domClass.add('reg', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('reg', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('detour', 'Объезды', ngwUrlForTiles, layersByKeyname['detour'].style_id, null, {
                            loading: function () {
                                domClass.add('obd', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('obd', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('sensors_meteo', 'Датчики', ngwUrlForTiles, layersByKeyname['sensors_meteo'].style_id, null, {
                            loading: function () {
                                domClass.add('datch', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('datch', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('regions', 'Регионы', ngwUrlForTiles, layersByKeyname['regions'].style_id, null, {
                            loading: function () {
                                domClass.add('regions', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('regions', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('service', 'Объекты сервиса', ngwUrlForTiles, layersByKeyname['service'].style_id, null, {
                            loading: function () {
                                domClass.add('services', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('services', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('productions', 'Производственные площадки (пескобазы, теплые стоянки)', ngwUrlForTiles, layersByKeyname['productions'].style_id, null, {
                            loading: function () {
                                domClass.add('pp', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('pp', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('reservoir', 'Водохранилища', ngwUrlForTiles, layersByKeyname['reservoir'].style_id, null, {
                            loading: function () {
                                domClass.add('reservoir', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('reservoir', 'loading');
                            }});
                        map.addNgwTileLayerWithKeyname('emergency_posts', 'Пункты МЧС', ngwUrlForTiles, layersByKeyname['emergency_posts'].style_id, null, {
                            loading: function () {
                                domClass.add('mchs', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('mchs', 'loading');
                            }});

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
                    });
                });
    </script>
</%block>