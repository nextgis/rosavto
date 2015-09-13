define([
        'dojo/_base/declare',
        'dojox/widget/Standby',
        'dojo/topic'
    ],
    function (declare, Standby, topic) {
        return declare('rosavto.Loader', null, {
            _standby: null,
            _componentName: null,

            buildLoader: function (domNode, componentName) {
                this._standby = new Standby({target: domNode});
                document.body.appendChild(this._standby.domNode);
                if (componentName) {
                    this._componentName = componentName;
                }
            },

            showLoader: function () {
                this._standby.show();
            },

            hideLoader: function () {
                this._standby.hide();
                if (this._componentName) {
                    topic.publish('loader/for/' + this._componentName + '/hidden');
                }
            }
        });
    });