define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/store/Memory',
        'dojo/store/Observable',
        'dojo/request/xhr',
        'dojo/Deferred',
        'dojo/DeferredList',
        'dojox/xml/parser'
    ],
    function (declare, array, lang, Memory, Observable, xhr, Deferred, DeferredList, xmlParser) {
        return declare('rosavto.LayersInfo', null, {
            _filled: false,
            constructor: function (ngwServiceFacade) {
                if (ngwServiceFacade) {
                    this._ngwServiceFacade = ngwServiceFacade;
                } else {
                    throw 'ngwServiceFacade parameter is not defined';
                }

                this.store = new Observable(new Memory());
            },

            _deferredStore: null,
            _deferredLayersInfoFiller: null,
            fillLayersInfo: function () {
                this._deferredStore = new Memory();
                this._deferredLayersInfoFiller = new Deferred();
                this.store = new Observable(new Memory());

                this._getResource(0);

                return this._deferredLayersInfoFiller.promise;
            },

            _processResourceInfo: function (resourceInfo) {
                var that = this;

                array.forEach(resourceInfo, function (resourceInfoItem, index) {
                    that._processResourceInfoItem(resourceInfoItem);
                });

                if (this._deferredStore.query({}, {count: 1}).length < 1) {
                    this._deferredLayersInfoFiller.resolve(this.store);
                    this._filled = true;
                }
            },

            _processResourceInfoItem: function (resourceInfoItem) {
                var resourceType;

                if (resourceInfoItem.resource) {
                    if (!resourceInfoItem.resource.cls) {
                        return false;
                    }

                    resourceType = resourceInfoItem.resource.cls;

                    switch (resourceType) {
                        case 'resource_group':
                            this._getResource(resourceInfoItem.resource.id);
                            break;
                        case 'postgis_layer':
                            this._getResource(resourceInfoItem.resource.id);
                            break;
                        case 'mapserver_style':
                            break;
                        default:
                            return false;
                    }

                    this._saveResourceToStore(resourceInfoItem, resourceType);
                }
            },

            _getResource: function (resourceId) {
                var deferred = this._ngwServiceFacade.getResourceInfo(resourceId);

                this._deferredStore.put({
                    id: resourceId,
                    def: deferred
                });

                deferred.then(lang.hitch(this, function (resourceInfo) {
                    this._deferredStore.remove(resourceId);
                    this._processResourceInfo(resourceInfo);
                }));
            },

            _saveResourceToStore: function (resourceInfoItem, resourceType) {
                var resource = resourceInfoItem.resource,
                    parent,
                    resourceSaved;

                if (resource.parent && resource.parent.id) {
                    parent = this.store.query({id: resource.parent.id})[0];
                    if (parent.link) {
                        parent = parent.object;
                    }
                }

                if (!parent) {
                    this.store.put({id: resource.id, res: resource, type: resourceType});
                    return true;
                }

                switch (resourceType) {
                    case 'resource_group':
                        if (parent.type === 'resource_group') {
                            this._validateParentResourceGroup(parent);
                        }
                        resourceSaved = parent.groups[parent.groups.push({id: resource.id, res: resource, type: resourceType}) - 1];
                        this.store.put({id: resource.id, object: resourceSaved, type: resourceType, link: 'yes'});
                        break;
                    case 'postgis_layer':
                        if (parent.type === 'resource_group') {
                            this._validateParentResourceGroup(parent);
                        }
                        resourceSaved = parent.layers[parent.layers.push({id: resource.id, res: resource, type: resourceType, keyname: resource.keyname}) - 1];
                        this.store.put({id: resource.id, object: resourceSaved, type: resourceType, keyname: resource.keyname, link: 'yes'});
                        break;
                    case 'mapserver_style':
                        this._validateParentLayer(parent);
                        xml_style = xmlParser.parse(resourceInfoItem.mapserver_style.xml);
                        resourceSaved = parent.styles[parent.styles.push({
                            id: resource.id,
                            res: resource,
                            type: resourceType,
                            xml: xml_style}) - 1];
                        this.store.put({
                            id: resource.id,
                            object: resourceSaved,
                            type: resourceType,
                            link: 'yes',
                            xml: xml_style
                        });
                        break;
                    default:
                        return false;
                }
            },

            _validateParentResourceGroup: function (parentResourceGroup) {
                if (!parentResourceGroup.groups || !parentResourceGroup.layers) {
                    parentResourceGroup.groups = [];
                    parentResourceGroup.layers = [];
                }
            },

            _validateParentLayer: function (parentLayer) {
                if (!parentLayer.styles) {
                    parentLayer.styles = [];
                }
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
                        var resourceStyle = this.store.query({id: idStyle});
                        if (resourceStyle.length > 0) {
                            if (resourceStyle[0].link) {
                                resourceStyle[0] = resourceStyle[0].object;
                            }
                            ids.push(resourceStyle[0].res.parent.id);
                        }
                    }));
                }

                return ids;
            },

            getLayerNameByLayerId: function (idLayer) {
                var display_name,
                    res = this.store.query({id: idLayer});

                if (res.length > 0) {
                    display_name = res[0].display_name;
                    return display_name;
                }

                return null;
            },

            getLayerById: function (id) {
                var result = this.store.query({id: id});

                if (result.length > 0) {
                    return result[0].res;
                }

                return null;
            },

            getListLayers: function () {
                var resourceLayers = this.store.query({type: 'postgis_layer'}),
                    listLayers = [];

                array.forEach(resourceLayers, function (resourceLayer, index) {
                    if (resourceLayer.link) {
                        resourceLayer = resourceLayer.object;
                    }
                    listLayers.push({
                        layer_id: resourceLayer.id,
                        display_name: resourceLayer.res.display_name || null,
                        keyname: resourceLayer.res.keyname || null,
                        style_id: resourceLayer.styles ? resourceLayer.styles[0].id : null
                    });
                });

                return listLayers;
            }
        });
    });