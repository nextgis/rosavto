define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'rosavto/Layers/StyledGeoJsonLayer',
    'rosavto/ParametersVerification'
], function (declare, lang, xhr, StyledGeoJsonLayer, ParametersVerification) {
    return declare('rosavto.RepairsLayer', [StyledGeoJsonLayer, ParametersVerification], {
        constructor: function () {
            this.verificateRequiredParameters(this.options, [
                'ngwServiceFacade',
                'layersInfo',
                'map',
                'getRepairsStatusUrl',
                'getCurrentTime'
            ]);
            this._workobj_line_id = this.options.layersInfo.getLayersDictByKeyname()['workobj_line'].layer_id;
            this._workobj_point_id = this.options.layersInfo.getLayersDictByKeyname()['workobj_points'].layer_id;
        },

        onAdd: function (map) {
            StyledGeoJsonLayer.prototype.onAdd.call(this, map);
            this._hookMap(map);
            this._buildRepairs();
        },

        onRemove: function (map) {
            this._unhookMap(map);
            StyledGeoJsonLayer.prototype.onRemove.call(this, map);
        },

        _hookMap: function (map) {
            map.on('moveend zoomend', this._buildRepairs, this);
        },

        _unhookMap: function (map) {
            map.off('moveend zoomend', this._buildRepairs, this);
        },

        _buildRepairs: function () {
            var bounds = this.options.map.getLMap().getBounds(),
                extent = [bounds._southWest.lng, bounds._southWest.lat, bounds._northEast.lng, bounds._northEast.lat];
            this.clearLayers();
            this.options.ngwServiceFacade.identifyFeaturesByLayers([this._workobj_line_id, this._workobj_point_id], extent)
                .then(lang.hitch(this, function (repairsGeometry) {
                    var guids = [];

                    for (var i = 0, count = repairsGeometry.features.length; i < count; i++) {
                        guids.push(repairsGeometry.features[i].properties.uniq_uid);
                    }

                    xhr(this.options.getRepairsStatusUrl, {
                        handleAs: 'json',
                        method: 'POST',
                        data: {
                            guids: guids.join(','),
                            time: this.options.getCurrentTime.call(undefined)
                        }
                    }).then(lang.hitch(this, function (repairsStatuses) {
                        var guid;
                        for (var i = 0, count = repairsGeometry.features.length; i < count; i++) {
                            guid = repairsGeometry.features[i].properties.uniq_uid;
                            if (repairsStatuses[guid]) {
                                this.addObject(repairsGeometry.features[i], repairsStatuses[guid].status, guid);
                            } else {
                                if (this.options.debug) {
                                    console.log('RepairsLayer: object with guid "' + guid + '" has no status.');
                                }
                            }

                        }
                    }));
                }));
        }
    });
});