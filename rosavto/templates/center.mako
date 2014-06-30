<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте. Если в области клика будет несколько объектов - выберите нужный.</p>
    <p>Код с комментариями <a href="${request.route_url('code') + '#attributesCode'}">здесь</a></p>
</div>

<div>
    <p><button id="selectMeteo">Выбрать метеостанцию с ID = d2f77a8b-48b8-46bc-9fc4-adc42caa4fad</button></p>
</div>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<%block name="inlineScripts">
    <script>
        require([
            'rosavto/Map',
            'rosavto/LayersInfo',
            'rosavto/MapIdentify',
            'rosavto/AttributeGetter',
            'rosavto/AttributesServiceFacade',
            'rosavto/NgwServiceFacade',
            'dojo/query',
            'dojo/domReady!'],

                function (Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade, query) {
                    var ngwServiceFacade = new NgwServiceFacade(ngwProxyUrl),
                            attributesBaseUrl = application_root + '/cit/',
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

                    map.addNgwTileLayer('Тестовые дороги', ngwUrlBase, 8);
                    map.addNgwTileLayer('Регионы', ngwUrlBase, 7);
                    map.addNgwTileLayer('Нормативные участки дорог', ngwUrlBase, 10);
                    map.addNgwTileLayer('Участки подрядных организаций', ngwUrlBase, 9);
                    map.addNgwTileLayer('Метеостанции', ngwUrlBase, 11);

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    mapIdentify = new MapIdentify({
                        map: map,
                        ngwServiceFacade: ngwServiceFacade,
                        layersInfo: layersInfo,
                        fieldIdentify: 'uniq_uid'
                    });
                    mapIdentify.on();

                    attributeGetter = new AttributeGetter({
                        map: map,
                        ngwServiceFacade: ngwServiceFacade,
                        attributesServiceFacade: attributesServiceFacade,
                        mapIdentify: mapIdentify,
                        domSelector: '#attributes',
                        style: {
                            fill: false,
                            color: '#FF0000',
                            weight: 2
                        }
                    });

                    query('#selectMeteo').on('click', function () {
                        attributeGetter.selectObject(18, 'd2f77a8b-48b8-46bc-9fc4-adc42caa4fad');
                    });
                });
    </script>
</%block>