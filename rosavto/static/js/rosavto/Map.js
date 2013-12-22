define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'http://cdn.leafletjs.com/leaflet-0.7.1/leaflet.js?2'
], function (declare, _WidgetBase) {
    return declare('Map', [], {
        constructor: function (domNode, settings) {
            this._map = new L.Map(domNode, settings);
        },

        addTileLayer: function (url, settings) {
            this._map.addLayer(new L.TileLayer(url, settings));
        }
    });
});