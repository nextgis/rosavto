/**
 * Единый клиент STOMP для использования во всех виджетах на странице.
 * Функция connect выполняет подключение при первом вызове. При последующих вызовах
 * выдаётся готовый клиент.
 *
 * Пример использования:
 *
 * require(['StompClient'], function(stomp) {
 *     stomp.connect().then(function (client) {
 *          client.subscribe(...);
 *     });
 * });
 *
 * Для кода на ExtJS экземпляр этого класса помещён в Monitoring.stomp.
 *
 */
define(['dojo/topic', 'dojo/_base/declare', 'when', 'dojo/_base/lang', 'dojox/lang/functional/object','Stomp', 'SockJS'], function (topic, declare, when, lang, object) {
    return {
        topic: topic,
        reconnectDelay: 1000,
        debug: false, // заменить на true для включения отладочных сообщений Stomp.js и Sock.js
        deferred: null,
        client: null,
        connect: function () {
            if (!this.deferred) {
                this.deferred = when.defer();
                this.reconnect();
            }
            return this.deferred.promise;
        },

        reconnect: function() {
            var client = Stomp.over(new SockJS(Monitoring.contextPath+'socket', null, {debug: this.debug}));
            if (!this.debug) {
                client.debug = null;
            }
            client.connect('spring', 'spring', lang.hitch(this, function () {
                this.internalClient.resubscribe(client);
                this.deferred.resolve(this.internalClient);
                topic.publish("connection/status", {
                    closed: false
                });
            }), lang.hitch(this, function(error) {
                console.warn('Подключение по websocket не удалось: ' + error + '. Следующая попытка через ' + this.reconnectDelay + ' мс.');
                topic.publish("connection/status", {
                    closed: true
                });
                setTimeout(lang.hitch(this, this.reconnect), this.reconnectDelay);
            }));
        },

        internalClient: {
            client: null,
            subscriptions: [],
            subscribe: function(destination, callback, headers) {
                var result = this.client.subscribe(destination, callback, headers);
                this.subscriptions[result.id] = {destination: destination, callback: callback, headers: headers, result: result};
                result.unsubscribe = lang.hitch(this, lang.partial(this.unsubscribe, result.id));
                return result;
            },
            unsubscribe: function(id) {
                delete this.subscriptions[id];
                return this.client.unsubscribe(id);
            },
            resubscribe: function(client) {
                var me = this;
                if (me.client) {
                    object.forIn(this.subscriptions, function(subscription, id){
                        me.client.unsubscribe(id);
                    });
                    me.client.disconnect();
                }
                me.client = client;
                object.forIn(this.subscriptions, function(subscription, id){
                    if (subscription.headers) {
                        delete subscription.headers.id;
                    }
                    var newResult = this.client.subscribe(subscription.destination, subscription.callback,
                        subscription.headers === void(0) ? null : subscription.headers);
                    subscription.result.id = newResult.id;
                    subscription.result.unsubscribe = lang.hitch(me, lang.partial(me.unsubscribe, newResult.id));
                });
            }

        }

    };


});
