define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'rosavto/realtime/Subscriber',
    'rosavto/Layers/MarkersStateClusterLayer',
    'rosavto/ParametersVerification'
], function (declare, lang, array, Subscriber, MarkersStateClusterLayer, ParametersVerification) {
    return declare('rosavto.SensorsLayer', [MarkersStateClusterLayer, ParametersVerification], {

        constructor: function (settings) {
            var self = this;

            this.verificateRequiredParameters(settings, [
                'objectsSubscribedUrl'
            ]);
            lang.mixin(this, settings);

            this._layersSubsriber = new Subscriber({
                subscribeUrl: this.objectsSubscribedUrl,
                getHeaders: lang.hitch(this, this._getHeadersForLayers),
                parseMessage: this._buildMarkers
            });
        },

        _activatedLayers: [],
        _layersSubsriber: [],
        activateLayers: function (layers) {
//            layers:
//              layers array keynames
//              ['Meteo', 'Video', 'Traffic']
            var countLayers = layers.length;
            this._activatedLayers = layers;

            if (countLayers > 0) {
                this._hookMap(this._map);
            } else {
                this._unhookMap(this._map);
            }
        },

        _getHeadersForLayers: function () {
            var bounds = this._map.getBounds(),
                // Добавляем к видимой области слоя по 10% с каждой стороны
                widthDelta = (bounds.getEast() - bounds.getWest()) * 0.1,
                heightDelta = (bounds.getNorth() - bounds.getSouth()) * 0.1;

            return {
                'LatitudeFrom': bounds.getSouth() - heightDelta,
                'LatitudeTo': bounds.getNorth() + heightDelta,
                'LongitudeFrom': bounds.getWest() - widthDelta,
                'LongitudeTo': bounds.getEast() + widthDelta,
                'ObjectTypes': this._activatedLayers
            };
        },

        _buildMarkers: function (json) {
            var obj;

            if (json && json.body) {
                obj = JSON.parse(json.body);
            }
        },

        _setDebug: function (debug) {
            this._debug = debug;
        },

        onAdd: function (map) {
            MarkersStateClusterLayer.prototype.onAdd.call(this, map);
        },

        onRemove: function (map) {
            this._unhookMap(map);
            MarkersStateClusterLayer.prototype.onRemove.call(this, map);
        },

        _hookMap: function (map) {
            map.on('moveend zoomend', this._layersSubsriber.subscribe, this);
            this._layersSubsriber.subscribe();
        },

        _unhookMap: function (map) {
            map.off('moveend zoomend', this._layersSubsriber.unsubscribe, this);
            this._layersSubsriber.unsubscribe();
        }
    });
});
