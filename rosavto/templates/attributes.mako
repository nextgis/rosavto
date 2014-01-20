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
        var map = new Map('map', {
                center: [55.529, 37.584],
                zoom: 7,
                zoomControl: true,
                legend: true
            }),
            layersInfoSettings = {
                url: 'http://demo.nextgis.ru/ngw_rosavto/api/layer_group/0/tree',
                proxy: application_root + '/proxy'
            },
            mapIdentifySettings = {
                url: 'http://demo.nextgis.ru/ngw_rosavto/feature_layer/identify',
                proxy: application_root + '/proxy',
                fieldIdentify: 'guid'
            },
            attributeGetterSettings = {
                domSelector: '#attributes',
                urlBuilder: function (id) {
                    return application_root + '/attributes/html/' + id
                }
            };

        map.addNgwTileLayer('Тестовые дороги', 'http://demo.nextgis.ru/ngw_rosavto', 8);
        map.addNgwTileLayer('Регионы', 'http://demo.nextgis.ru/ngw_rosavto', 7);
        map.addNgwTileLayer('Нормативные участки дорог', 'http://demo.nextgis.ru/ngw_rosavto', 10);
        map.addNgwTileLayer('Участки подрядных организаций', 'http://demo.nextgis.ru/ngw_rosavto', 9);

        var attributeGetter = new AttributeGetter(map, layersInfoSettings, mapIdentifySettings, attributeGetterSettings);
    });
</%block>