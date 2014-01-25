<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте. Если в области клика будет несколько объектов - выберите нужный.</p>
    <p>Код с комментариями <a href="${request.route_url('code') + '#attributes'}">здесь</a></p>
</div>

<div id="map"></div>
<div id="attributes">Здесь будут атрибуты выбранного обекта</div>

<%block name="inlineScripts">
    require(['rosavto/Map', 'rosavto/LayersInfo', 'rosavto/MapIdentify', 'rosavto/AttributeGetter', 'dojo/domReady!'], function (Map, LayersInfo, MapIdentify, AttributeGetter) {
        var ngwUrl = 'http://demo.nextgis.ru/ngw_rosavto/',
            map = new Map('map', {
                center: [55.529, 37.584],
                zoom: 7,
                zoomControl: true,
                legend: true
            }),
            layersInfoSettings = {
                url: ngwUrl + 'api/layer_group/0/tree',
                proxy: application_root + '/proxy'
            },
            mapIdentifySettings = {
                urlNgw: ngwUrl,
                proxy: application_root + '/proxy',
                fieldIdentify: 'uniq_uid'
            },
            attributeGetterSettings = {
                urlToNgw: ngwUrl,
                proxy: application_root + '/proxy',
                style: {
                    fill: false,
                    color: '#FF0000',
                    weight: 2
                },
                domSelector: '#attributes',
                urlBuilder: function (id) {
                    return application_root + '/attributes/html/' + id
                }
            };

        map.addNgwTileLayer('Тестовые дороги', ngwUrl, 8);
        map.addNgwTileLayer('Регионы', ngwUrl, 7);
        map.addNgwTileLayer('Нормативные участки дорог', ngwUrl, 10);
        map.addNgwTileLayer('Участки подрядных организаций', ngwUrl, 9);

        var attributeGetter = new AttributeGetter(map, layersInfoSettings, mapIdentifySettings, attributeGetterSettings);
    });
</%block>