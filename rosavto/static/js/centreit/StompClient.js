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
define(['dojo/_base/declare', 'when'], function (declare, when) {
    return {

        debug: false, // заменить на true для включения отладочных сообщений Stomp.js и Sock.js
        deferred: null,
        connect: function () {
            var me = this;
            if (!this.deferred) {
                this.deferred = when.defer();
                // todo брать контекст с сервера
                var client = Stomp.over(new SockJS('/monitoring-web/socket', null, {debug: this.debug}));
                if (!this.debug) {
                    client.debug = null;
                }
                client.connect('spring', 'spring', function () {
                    me.deferred.resolve(client);
                });
            }
            return this.deferred.promise;
        }

    };

});
