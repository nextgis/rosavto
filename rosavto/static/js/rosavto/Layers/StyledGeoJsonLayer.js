define([
    'dojo/_base/declare',
    'leaflet/leaflet'
], function (declare, L) {
    return declare('rosavto.StyledGeoJsonLayer', [L.GeoJSON], {

        constructor: function () {
            var self = this;

            this.layersById = {};

            this.options.pointToLayer = function (feature, latlng) {
                return self.pointToLayer(feature, latlng);
            };

            this.options.onEachFeature = function (feature, layer) {
                self.onEachFeature(feature, layer);
            };

            if (!this.options.fieldStyleType) {
                this.options.fieldStyleType = 'type';
            }
        },

        addObject: function (geoJson, type, id) {
            geoJson.properties.__type = type;
            geoJson.properties.__id = id;
            return this.addData(geoJson);
        },

        removeObject: function (id) {
            if (this.layersById[id]) {
                this.removeLayer(this.layersById[id]);
                delete this.layersById[id];
            }
        },

        pointToLayer: function (feature, latlng) {
            if (!feature.properties.__type) {
                return new L.Marker(latlng);
            }

            var type = feature.properties.__type,
                style,
                marker;

            if (!this.options.styles[type]) {
                console.log('StyledGeoJsonLayer: "' + type + '" type is not found into styles');
                return new L.Marker(latlng);
            }

            style = this.options.styles[type];


            if (style.point) {
                marker = L.marker(latlng, {
                    icon: L.divIcon(style.point)
                });
                return marker;
            } else {
                return new L.Marker(latlng);
            }
        },

        onEachFeature: function (feature, layer) {
            var self = this,
                type,
                id;

            if (this.options.callbackClick) {
                layer.on('click', function () {
                    self.options.callbackClick.call(this, feature.properties.__id, feature);
                });
            }

            if (feature.geometry.type !== 'Point' && feature.properties.__type) {
                type = feature.properties.__type;

                if (this.options.styles[type] && this.options.styles[type].line) {
                    layer.setStyle(this.options.styles[type].line);
                }
            }

            if (feature.properties.__id) {
                id = feature.properties.__id;
                this.removeObject(id);
                this.layersById[id] = layer;
            }
        }
    });
});