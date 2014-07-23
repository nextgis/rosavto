define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'leaflet/leaflet'
], function (declare, lang, array, L) {
    return declare('rosavto.MarkersStateClusterLayer', [L.MarkerClusterGroup], {
        _layer: null,
        _states: {
            states: null,
            count: 0
        },

        constructor: function (states) {
            var self = this;

            this._states.states = states.clusters;
            this._states.count = states.clusters.length;

            this.options.showCoverageOnHover = false;

            this.options.iconCreateFunction = function (cluster) {
                return self.iconCreateFunction(cluster);
            };
        },

        iconCreateFunction: function (cluster) {
            var markers = cluster.getAllChildMarkers(),
                markersCount = markers.length,
                state,
                states = {},
                mainState,
                className,
                i;

            for (i = 0; i < this._states.count; i++) {
                states[this._states.states[i]] = false;
            }

            for (i = 0; i < markersCount; i++) {
                if (markers[i].state) {
                    if (states[markers[i].state] === false) {
                        states[markers[i].state] = true;
                    }
                }
            }

            for (state in states) {
                if (states.hasOwnProperty(state) && states[state] === true) {
                    mainState = state;
                }
            }

            className = 'marker-cluster marker-cluster-' + mainState;
            return new L.DivIcon({
                html: '<div><span>' + markersCount + '</span></div>',
                className: className,
                iconSize: new L.Point(40, 40)
            });
        },

        addMarker: function (marker) {
            this.addLayer(marker);
        }
    });
});