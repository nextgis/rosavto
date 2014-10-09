define([
        'dojo/_base/declare',
        'leaflet/leaflet'
],
function (declare, L) {
    return declare('rosavto.EasyPrint', null, {
        constructor: function () {
            L.Control.EasyPrint = L.Control.extend({
                options: {
                    position: 'topleft',
                    title: 'Печать карты'
                },

                onAdd: function () {
                    var container = L.DomUtil.create('div', 'leaflet-control-easyPrint leaflet-bar leaflet-control');

                    this.link = L.DomUtil.create('a', 'leaflet-control-easyPrint-button leaflet-bar-part', container);
                    this.link.href = 'javascript:void(window.print())';

                    return container;
                },

                _click: function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                }
            });

            L.easyPrint = function() {
                return new L.Control.EasyPrint();
            };
        }
    });
});
