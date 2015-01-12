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
                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayer('Сеть дорог ДЕП', ngwUrlForTiles, 4, null, {
                            loading: function () {
                                domClass.add('dep', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('dep', 'loading');
                            }});

                        map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 51, null, {
                            loading: function () {
                                domClass.add('fed', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('fed', 'loading');
                            }});

                        map.addNgwTileLayer('Сеть региональных дорог', ngwUrlForTiles, 50, null, {
                            loading: function () {
                                domClass.add('reg', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('reg', 'loading');
                            }});

                        map.addNgwTileLayer('Объезды', ngwUrlForTiles, 43, null, {
                            loading: function () {
                                domClass.add('obd', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('obd', 'loading');
                            }});

                        map.addNgwTileLayer('Датчики', ngwUrlForTiles, 53, null, {
                            loading: function () {
                                domClass.add('datch', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('datch', 'loading');
                            }});

                        map.addNgwTileLayer('Регионы', ngwUrlForTiles, 36, null, {
                            loading: function () {
                                domClass.add('regions', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('regions', 'loading');
                            }});

                        map.addNgwTileLayer('Объекты сервиса', ngwUrlForTiles, 80, null, {
                            loading: function () {
                                domClass.add('services', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('services', 'loading');
                            }});

                        map.addNgwTileLayer('Производственные площадки (пескобазы, теплые стоянки)', ngwUrlForTiles, 83, null, {
                            loading: function () {
                                domClass.add('pp', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('pp', 'loading');
                            }});

                        map.addNgwTileLayer('Водохранилища', ngwUrlForTiles, 57, null, {
                            loading: function () {
                                domClass.add('reservoir', 'loading');
                            },
                            loaded: function () {
                                domClass.remove('reservoir', 'loading');
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