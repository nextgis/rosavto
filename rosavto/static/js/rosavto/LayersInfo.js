define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/store/Memory',
    'dojo/store/Observable',
    'dijit/tree/ObjectStoreModel',
    'dojo/request/xhr',
    'dojo/Deferred'
],
    function (declare, array, lang, Memory, Observable, ObjectStoreModel, xhr, Deferred) {
        return declare('rosavto.LayersInfo', null, {

            constructor: function (settings) {
                lang.mixin(this, settings);

                this.store = new Observable(new Memory({
                    data: [
                        {
                            'xid': 'layer_group-0',
                            'type': 'layer_group',
                            'id': 0
                        }
                    ],
                    idProperty: 'xid'
                }));
                this.store.getChildren = function (object) {
                    return this.query({parent: object.xid});
                };
            },

            fillLayersInfo: function () {
                var that = this,
                    xhrGetLayersInfo = this.proxy ? xhr(this.proxy, {handleAs: 'json', method: 'POST', data: {url: this.url}}) : xhr(this.url, {handleAs: 'json'});
                return xhrGetLayersInfo.then(
                    function (data) {
                        function traverse(item, parent_id) {
                            var xid = item.type + '-' + item.id;

                            // корень добавляется при создании дерева
                            if (parent_id) {
                                that.store.add({
                                    'xid': xid,
                                    'type': 'layer_group',
                                    'id': item.id,
                                    'parent': parent_id,
                                    'display_name': item.display_name
                                });
                            }

                            // подгруппы
                            array.forEach(item.children, function (i) {
                                traverse(i, xid);
                            });

                            // слои
                            array.forEach(item.layers, function (l) {
                                that.store.add({
                                    'xid': l.type + '-' + l.id,
                                    'type': 'layer',
                                    'id': l.id,
                                    'parent': xid,
                                    'display_name': l.display_name
                                });

                                // стили
                                array.forEach(l.styles, function (s) {
                                    that.store.add({
                                        'xid': s.type + '-' + s.id,
                                        'type': 'style',
                                        'id': s.id,
                                        'parent': l.type + '-' + l.id,
                                        'display_name': s.display_name,
                                        'layer_display_name': s.layer_display_name
                                    });
                                });
                            });
                        }

                        traverse(data);

                        that._filled = true;
                    },
                    function (err) {
                        console.log(err);
                    }
                );
            },

            getLayersIdByStyles: function (idStyles) {
                var that = this,
                    def;

                if (this._filled) {
                    def = new Deferred();
                    def.resolve(this._getLayersIdByStyles(idStyles));
                    return def;
                } else {
                    return this.fillLayersInfo().then(function () {
                        return that._getLayersIdByStyles(idStyles);
                    });
                }
            },

            _getLayersIdByStyles: function (idStyles) {
                var ids = [];

                if (lang.isArray(idStyles)) {
                    array.forEach(idStyles, lang.hitch(this, function (idStyle) {
                        var res = this.store.query({xid: 'style-' + idStyle});
                        if (res.length > 0) {
                            ids.push(res[0].parent.split('-')[1]);
                        }
                    }));
                }

                return ids;
            },

            getLayerNameByStyleId: function (idStyle) {
                var res = this.store.query({xid: 'style-' + idStyle});
                if (res.length > 0) {
                    return res[0].layer_display_name;
                }
            },

            getLayerNameByLayerId: function (idLayer) {
                var display_name,
                    res = this.store.query({id: idLayer});
                if (res.length > 0) {
                    display_name = res[0].display_name
                    return display_name;
                }
            }
        });
    });