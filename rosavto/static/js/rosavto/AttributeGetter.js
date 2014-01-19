define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/request/xhr',
    'rosavto/LayersInfo',
    'rosavto/MapIdentify'
],
    function (declare, array, lang, topic, xhr, LayersInfo, MapIdentify) {
        return declare('rosavto.AttributeGetter', null, {

            constructor: function (map, layersInfoSettings, mapIdentifysettings) {
                this._map = map;

                this.layersInfo = new LayersInfo(layersInfoSettings);

                this.mapIdentify = new MapIdentify(map, this.layersInfo, mapIdentifysettings);
                this.mapIdentify.on();

                this.subscribe();
            },

            subscribe: function() {
                topic.subscribe('map/identity', function (data) {

                });
            }
        });
    });