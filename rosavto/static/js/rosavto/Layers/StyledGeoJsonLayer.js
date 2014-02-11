define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr'
], function (declare, lang, xhr) {
    return declare('rosavto.StyledGeoJsonLayer', [L.GeoJSON], {

        constructor: function () {
            var self = this;

            this.options.pointToLayer = function (feature, latlng) {
                return self.pointToLayer(feature, latlng);
            };

            this.options.onEachFeature = function (feature, layer) {
                self.onEachFeature(feature, layer);
            };

            if (!this.options.fieldStyleType) {
                this.options.fieldStyleType = 'type';
            }

            this._layersById = {};
        },

        addObject: function (geoJson, type, id) {
            geoJson.properties.__type = type;
            geoJson.properties.__id = id;
            this.addData(geoJson);
        },

        removeObject: function (id) {
            if (this._layersById[id]) {
                this.removeLayer(this._layersById[id]);
                delete this._layersById[id];
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

            layer.on('click', function (e) {
                if (self.options.callbackClick) {
                    self.options.callbackClick.apply(this, e);
                }
            });

            if (feature.geometry.type !== 'Point' && feature.properties.__type) {
                type = feature.properties.__type;

                if (this.options.styles[type] && this.options.styles[type].line) {
                    layer.setStyle(this.options.styles[type].line);
                }
            }

            if (feature.properties.__id) {
                id = feature.properties.__id;
                if (this._layersById[id]) {
                    this.removeLayer(this._layersById[id]);
                    delete this._layersById[id];
                    this._layersById[id] = layer;
                } else {
                    this._layersById[id] = layer;
                }
            }
        }
    });
});