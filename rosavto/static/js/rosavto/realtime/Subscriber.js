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
            StompClient.connect().then(lang.hitch(this, function (client) {
                this.unsubscribe();
                this._subscription = client.subscribe(
                        this.subscribeUrl + uuid.generateRandomUuid(),
                    this.parseMessage,
                    this.getHeaders()
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