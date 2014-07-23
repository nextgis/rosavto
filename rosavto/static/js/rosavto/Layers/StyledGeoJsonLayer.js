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
            var layer;

            geoJson.properties.__type = type;
            geoJson.properties.__id = id;

            layer = this.addData(geoJson);

            if (layer.layersById[id]._icon) {
                layer.layersById[id]._setPos = function(pos) {
                    L.DomUtil.setPosition(this._icon, pos);

                    if (this._shadow) {
                        L.DomUtil.setPosition(this._shadow, pos);
                    }

                    this._zIndex = this.options.zIndexOffset;

                    this._resetZIndex();
                };
                layer.layersById[id]._zIndex = layer.layersById[id].options.zIndexOffset;
                layer.layersById[id]._resetZIndex();
            }

            if (this.options.styles[type]) {
                this.setPosition(layer, this.options.styles[type]['position']);
            }

            return layer;
        },

        addObjectByProperties: function (geoJson, typeField, idField) {
            if (!geoJson.properties[typeField] || !geoJson.properties[idField]) {
                return false;
            }

            return this.addObject(geoJson, geoJson.properties[typeField], geoJson.properties[idField]);
        },

        addObjectByDefaultProperties: function (geoJson) {
            var options = this.options;

            if (!options.fields || !options.fields['type'] || !options.fields['id'] || !geoJson.properties[options.fields.id]) {
                return false;
            }

            return this.addObject(geoJson, geoJson.properties[options.fields.type], geoJson.properties[options.fields.id]);
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
                if (this.options.zIndex) {
                    marker.setZIndexOffset(this.options.zIndex);
                    marker._zIndex = marker.options.zIndexOffset;
                }
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
        },
        
        setPosition: function (layer, position) {
            if (position) {

                if (!this._map._panes.overlayPane.firstChild) {
                    return;
                }

                switch (position) {
                    case 'front':
                        return layer.bringToFront();
                    case 'back':
                        return layer.bringToBack();
                }
            }
        }
    });
});
