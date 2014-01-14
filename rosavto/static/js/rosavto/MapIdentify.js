define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/LayersInfo',
    'proj4js/proj4js'
],
    function (declare, array, lang, xhr, LayersInfo, Proj4js) {
        return declare('rosavto.MapIdentify', null, {

            constructor: function (map, layersInfo, settings) {
                this._map = map;
                this._layersInfo = layersInfo;
                lang.mixin(this, settings);
                this.defineCrs();
            },

            defineCrs: function () {
                Proj4js.defs["WGS84"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
                Proj4js.defs["EPSG:3857"] = "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +a=6378137 +b=6378137 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
            },

            on: function () {
                var that = this;

                this._map._lmap.on('click', function (e) {
                    that.getIdsByClick(e);
                });
            },

            off: function () {
                var that = this;

                this._map._lmap.off('click', function (e) {
                    that.getIdsByClick(e);
                });
            },

            getIdsByClick: function (e) {
                var map = this._map._lmap;

                this._layersInfo.getLayersIdByStyles(this._map._ngwTileLayers).then(lang.hitch(this, function (layersId) {
                    var source = new Proj4js.Proj('WGS84'),
                        dest = new Proj4js.Proj('EPSG:3857'),
                        point = map.project([e.latlng.lat, e.latlng.lng], map.getZoom()),
                        pointTopLeft = map.unproject(new L.Point(point.x - 10, point.y - 10), map.getZoom()),
                        pointBottomRight = map.unproject(new L.Point(point.x + 10, point.y + 10), map.getZoom()),
                        wktBounds, postParams, xhrIdentity;

                    wktBounds = 'POLYGON((' + pointTopLeft.lng + ' ' + pointTopLeft.lat + ', ' +
                        pointBottomRight.lng + ' ' + pointTopLeft.lat + ', ' +
                        pointBottomRight.lng + ' ' + pointBottomRight.lat + ', ' +
                        pointTopLeft.lng + ' ' + pointBottomRight.lat + ', ' +
                        pointTopLeft.lng + ' ' + pointTopLeft.lat + '))';

                    postParams = {
                        src: 4326,
                        geom: wktBounds,
                        layers: layersId
                    };

                    xhrIdentity = this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: this.url, params: JSON.stringify(postParams)}}) :
                        xhr(this.url, {handleAs: 'json', method: 'POST', data: postParams, headers: {'X-Requested-With': 'XMLHttpRequest'}});

                    xhrIdentity.then(function (data) {
                        alert(data);
                    });
                }));
            }
        });
    });