define([
    'dojo/_base/declare',
    'dojox/widget/Standby'
],
    function (declare, Standby) {
        return declare('rosavto.Loader', null, {
            _standby: null,

            buildLoader: function (domNode) {
                this._standby = new Standby({target: domNode});
                document.body.appendChild(this._standby.domNode);
            },

            showLoader: function () {
                this._standby.show();
            },

            hideLoader: function () {
                this._standby.hide();
            }
        });
    });
