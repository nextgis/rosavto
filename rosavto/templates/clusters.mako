<%inherit file="master.mako"/>

<%block name="title">Маркер</%block>

<div id="map"></div>

<%block name="inlineScripts">
    <script src="${request.static_url('rosavto:static/json/stations.js')}"></script>

    <style>
        .marker-cluster-critical {
            background-color: rgba(240, 12, 12, 0.6);
        }

        .marker-cluster-normal {
            background-color: rgba(12, 240, 58, 0.6);
        }

        .marker-cluster-tolerable {
            background-color: rgba(222, 240, 12, 0.6);
        }
    </style>

    <script>
        require(['rosavto/Map',
            'rosavto/Layers/MarkersStateClusterLayer',
            'dojo/domReady!'],
                function (Map, MarkersStateClusterLayer) {
                    var map = new Map('map', {
                                center: [55.7501, 37.6687],
                                zoom: 7,
                                zoomControl: true
                            }),
                            states = {
                                clusters: ['normal', 'tolerable', 'critical']
                            },
                            clustersLayer = new MarkersStateClusterLayer(states),
                            stationsCount = stations.features.length;

                    for (var i = 0; i < stationsCount; i++) {
                        var feature = stations.features[i],
                                title = feature.properties.name ? feature.properties.name : null,
                                icon = L.icon({
                                    iconUrl: '/static/css/images/states/marker-icon-' + feature.properties.state + '.png'
                                }),
                                marker = L.marker(new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), {
                                    title: title,
                                    icon: icon
                                });
                        marker.state = feature.properties.state;
                        marker.bindPopup(title);
                        clustersLayer.addMarker(marker);
                    }

                    map.addVectorLayer(clustersLayer);
                });
    </script>
</%block>