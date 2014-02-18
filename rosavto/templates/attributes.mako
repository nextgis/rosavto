<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте. Если в области клика будет несколько объектов - выберите нужный.</p>
    <p>Код с комментариями <a href="${request.route_url('code') + '#attributesCode'}">здесь</a></p>
</div>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<%block name="inlineScripts">
    require([
        'rosavto/Map',
        'rosavto/LayersInfo',
        'rosavto/MapIdentify',
        'rosavto/AttributeGetter',
        'rosavto/AttributesServiceFacade',
        'rosavto/NgwServiceFacade',
        'dojo/domReady!'],

    function (Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade) {
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

        map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 8);
        map.addNgwTileLayer('Объезды', ngwUrlForTiles, 24);
        map.addNgwTileLayer('Датчики', ngwUrlForTiles, 15);

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
    });
</%block>