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
    </ul>


</div>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<%block name="inlineScripts">
    <script>
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
                                legend: true
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
                            }
                        });
                    });
                });
    </script>
</%block>