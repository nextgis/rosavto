define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojo/topic',
    'rosavto/ParametersVerification',
    'rosavto/Layers/StyledGeoJsonLayer'
], function (declare, lang, xhr, topic, ParametersVerification, StyledGeoJsonLayer) {
    return declare('rosavto.StyledGeoJsonLayer', [StyledGeoJsonLayer, ParametersVerification], {
        constructor: function () {
            this.verificateRequiredParameters(this.options, ['ngwServiceFacade']);
        },

        showIncidentLine: function (guid, pointStart, pointFinish) {
            var xhr;
            // для показа отрезка нам не надо блокировать карту
            //отрезок показывается только точно для таких координат, как в примере, иначе ошибка 500 и все висит
            //topic.publish('map/identityUi/block');

            xhr = this.options.ngwServiceFacade.getIncidentLine(guid, pointStart, pointFinish);
            xhr.then(lang.hitch(this, function (lineGeoJson) {
                var geojson = this.addData(lineGeoJson);
                //невозможно посмотреть realtime объекты
                //this._map.fitBounds(geojson.getBounds());
                //topic.publish('map/identityUi/unblock');
            }));
        },

        hideIncidentLine: function (guid, pointStart, pointFinish) {
            console.log("hideIncidentLine " + guid);
            //TODO

        }

    });
});