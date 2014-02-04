define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr'
], function (declare, lang, xhr) {
    return declare('rosavto.StyledGeoJsonLayer', [L.GeoJSON], {
        _styles: null,

        setStyles: function (styles) {
            this._styles = styles;
        },

        getStyles: function () {
            return this._styles;
        }
    });
});