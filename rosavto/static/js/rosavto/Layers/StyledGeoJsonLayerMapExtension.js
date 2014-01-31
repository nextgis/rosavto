define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/Layers/StyledGeoJsonLayer',
    '../Map'
], function (declareStyledGeoJsonLayerMapExtension, lang, xhr, StyledGeoJsonLayer, Map) {
    lang.extend(Map, {
        _styledGeoJsonLayers: {},
        createStyledGeoJsonLayer: function (nameLayer, styles, callback) {
            if (this._styledGeoJsonLayers[nameLayer]) {
                throw 'Styled layer with name "' + nameLayer + '" has already been defined. Layer name should be unique.';
            }

            var layer,
                type,
                style,
                marker;

            layer = new StyledGeoJsonLayer(null, {
                pointToLayer: function (feature, latLng) {
                    type = feature.properties.type;
                    style = styles[type];

                    if (style['Point'] && feature.geometry.type === 'Point') {
                        marker = L.marker(latLng, {icon: L.divIcon(style['Point'])});
                        return marker;
                    }
                },

                onEachFeature: function (feature, layer) {
                    layer.on('click', function (e) {
                        callback.call(this.feature, e);
                    });
                }
            });

            this._lmap.addLayer(layer);

            this._styledGeoJsonLayers[nameLayer] = layer;
            this._overlaylayers[name] = layer;
            if (this._legend) {
                this._legend.addOverlay(layer, name);
            }

            return layer;
        }
    });
});