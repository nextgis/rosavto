define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/topic',
    'dojo/request/xhr',
    'rosavto/LayersInfo',
    'rosavto/MapIdentify'
],
    function (declare, array, lang, query, topic, xhr, LayersInfo, MapIdentify) {
        return declare('rosavto.AttributeGetter', null, {
            _container: null,

            constructor: function (map, layersInfoSettings, mapIdentifysettings, settings) {
                lang.mixin(this, settings);

                var container = query(this.domSelector);
                if (container.length === 1) {
                    this._container = container[0];
                } else {
                    throw 'There is multiple attributes elements or element was not found';
                }


                this._map = map;

                this.layersInfo = new LayersInfo(layersInfoSettings);

                this.mapIdentify = new MapIdentify(map, this.layersInfo, mapIdentifysettings);
                this.mapIdentify.on();

                this.subscribe();
            },

            subscribe: function () {
                topic.subscribe('map/identity', function (id) {
                    console.log(id);
                });
            }
        });
    });