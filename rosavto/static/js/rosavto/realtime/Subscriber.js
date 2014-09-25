define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    "dojo/on",
    'centreit/StompClient',
    'centreit/DragAndDrop',
    'dojox/lang/functional/object',
    'dojox/uuid/_base',
    'dojox/uuid/generateRandomUuid',
    'rosavto/ParametersVerification'
], function (declare, lang, on, StompClient, DnD, object, uuid, generateRandomUuid, ParametersVerification) {
    return declare('rosavto.RealtimeLayer', [ParametersVerification], {
        _debug: false,

        constructor: function (settings) {
            this.verificateRequiredParameters(settings, [
                'subscribeUrl',
                'getHeaders',
                'parseMessage'
            ]);
            lang.mixin(this, settings);
        },

        _subscription: null,
        subscribe: function () {
            var that = this;
            StompClient.connect().then(lang.hitch(this, function (client) {
                that.unsubscribe();
                that._subscription = client.subscribe(
                        that.subscribeUrl + uuid.generateRandomUuid(),
                    lang.hitch(this, that.parseMessage),
                    that.getHeaders(that)
                );
            }));
        },

        unsubscribe: function () {
            if (this._subscription) {
                this._subscription.unsubscribe();
                this._subscription = null;
            }
        }

    });
});