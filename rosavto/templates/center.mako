<%inherit file="master.mako"/>

<%block name="title">Аттрибуты</%block>

<div class="code-description">
    <p>Для получения сведений о атрибутах объекта кликните по объекту на карте. Если в области клика будет несколько
        объектов - выберите нужный.</p>

    <p>Код с комментариями <a href="${request.route_url('code') + '#attributesCode'}">здесь</a></p>
</div>

<div>
    <p>
        <button id="selectMeteo">Выбрать метеостанцию с ID = d2f77a8b-48b8-46bc-9fc4-adc42caa4fad</button>
    </p>
    <p>
        <button id="selectRoads">Выбрать дороги в Архангельской области (ID = f0313d5c-9f5f-4e24-8005-503d54dd4f22)
        </button>
    </p>
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
                    'dojo/request/xhr',
                    'rosavto/Layers/StyledGeoJsonLayer',
                    'dojo/domReady!'],

                function (Map, LayersInfo, MapIdentify, AttributeGetter, AttributesServiceFacade, NgwServiceFacade, query, xhr, StyledGeoJsonLayer) {
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
                            attributeGetter,
                            styledGeoJsonLayer;

                    layersInfo = new LayersInfo(ngwServiceFacade);

                    layersInfo.fillLayersInfo().then(function (store) {

                        map.addBaseLayers(layersInfo.getBaseLayers());
                        map.addNgwTileLayer('Сеть дорог ДЕП', ngwUrlForTiles, 4);
                        map.addNgwTileLayer('Сеть федеральных дорог', ngwUrlForTiles, 51);
                        map.addNgwTileLayer('Сеть региональных дорог', ngwUrlForTiles, 50);
                        map.addNgwTileLayer('Объезды', ngwUrlForTiles, 43);
                        map.addNgwTileLayer('Датчики', ngwUrlForTiles, 53);

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

                    query('#selectMeteo').on('click', function () {
                        attributeGetter.selectObject(18, 'd2f77a8b-48b8-46bc-9fc4-adc42caa4fad');
                    });

                    query('#selectRoads').on('click', function () {
                        xhr(ngwProxyUrl + 'geocollection/rosavto?layers=22&boundary=20&boundary_guid=f0313d5c-9f5f-4e24-8005-503d54dd4f22', {handleAs: 'json', method: 'GET'})
                                .then(function (data) {
                                    if (styledGeoJsonLayer) {
                                        styledGeoJsonLayer.clearLayers();
                                    } else {
                                        styledGeoJsonLayer = new StyledGeoJsonLayer(null, {styles: {default: {
                                            position: 'front',
                                            point: {className: 'accident'},
                                            line: {opacity: 0.8, weight: 5, color: '#FF0000'}
                                        }}});
                                        map._lmap.addLayer(styledGeoJsonLayer);
                                    }
                                    var countFeatures = data.features.length;
                                    for (var i = 0; i < countFeatures; i++) {
                                        styledGeoJsonLayer.addObject(data.features[i], 'default', data.features[i].properties['uniq_uid'])
                                    }
                                    map.getLMap().fitBounds(styledGeoJsonLayer.getBounds());
                                });
                    });
                });
    </script>
</%block>