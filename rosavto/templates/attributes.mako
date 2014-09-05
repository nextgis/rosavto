<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте. Если в области клика будет несколько
        объектов - выберите нужный.</p>

    <p>Код с комментариями <a href="${request.route_url('code') + '#attributesCode'}">здесь</a></p>
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
            'dojo/domReady!'],

                function (Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade) {
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

                    map.addNgwTileLayer('Сеть дорог ДЕП', ngwUrlForTiles, 4);
                    map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 51);
                    map.addNgwTileLayer('Сеть региональных дорог', ngwUrlForTiles, 50);
                    map.addNgwTileLayer('Объезды', ngwUrlForTiles, 43);
                    map.addNgwTileLayer('Датчики', ngwUrlForTiles, 53);

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    layersInfo.fillLayersInfo().then(function (store) {
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
                            mapIdentify: mapIdentify,
                            cardInnerId: 'attributes',
                            cardBodyId: 'attributes',
                            stylesSettings: {
                                fields: {
                                    id: 'uniq_uid',
                                    type: 'type_name'
                                },
                                styles: {
                                    'Метео': {
                                        point: {className: 'meteo-a'},
                                        line: {opacity: 0.5, weight: 15, color: '#FF0000'}
                                    },
                                    'Видео': {
                                        point: {className: 'camera-a'},
                                        line: {opacity: 0.5, weight: 15, color: '#1E00FF'}
                                    }
                                }
                            }
                        });
                    });
                });
    </script>
</%block>