/* Т.к. загрузка асинхронная, после подключения dojo.js объектов dojo и dojox не существует, приходится использовать оставленную возможность для модулей, не переписанных под dojo-AMD */
define(['dojo',
    'dojox',
    'dojo/request/script',
    'dojo/Deferred'
], function (dojo, dojox, script, Deferred) {
    var storage = new Deferred();
    script.get(dojo.baseUrl + '../dojox/storage/Provider.js')
        .then(function () {
            script.get(dojo.baseUrl + '../dojox/storage/manager.js')
                .then(function () {
                    script.get(dojo.baseUrl + '../dojox/storage/LocalStorageProvider.js')
                        .then(function () {
                            script.get(dojo.baseUrl + '../dojox/storage/CookieStorageProvider.js')
                                .then(function () {
                                    dojox.storage.manager.initialize();
                                    var storageProvider = dojox.storage.manager.getProvider();
                                    storageProvider.initialize();
                                    storage.resolve(storageProvider);
                                });
                        });
                });
        });
    return storage.promise;
});