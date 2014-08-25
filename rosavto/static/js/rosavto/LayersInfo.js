define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/query',
        'dojo/dom-attr',
        'dojo/store/Memory',
        'dojo/store/Observable',
        'dojo/request/xhr',
        'dojo/Deferred',
        'dojo/DeferredList',
        'dojox/xml/parser'
    ],
    function (declare, array, lang, query, attr, Memory, Observable, xhr, Deferred, DeferredList, xmlParser) {
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
                    this.store.put({id: resource.id, res: resource, type: resourceType, keyname: resource.keyname});
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
                        json_style = this._parseXmlStyle(xml_style);
                        resourceSaved = parent.styles[parent.styles.push({
                            id: resource.id,
                            res: resource,
                            type: resourceType,
                            xml: xml_style,
                            json: json_style}) - 1];
                        this.store.put({
                            id: resource.id,
                            object: resourceSaved,
                            type: resourceType,
                            link: 'yes',
                            xml: xml_style,
                            json: json_style
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
            },

            getStyles: function () {
                var resourceLayers = this.store.query({type: 'mapserver_style'}),
                    listLayers = [];

                array.forEach(resourceLayers, function (resourceLayer, index) {
                    if (resourceLayer.link) {
                        resourceLayer = resourceLayer.object;
                    }
                    listLayers.push({
                        layer_id: resourceLayer.id,
                        display_name: resourceLayer.res.display_name || null,
                        keyname: resourceLayer.res.keyname || null,
                        style_id: resourceLayer.styles ? resourceLayer.styles[0].id : null,
                        xml_style: resourceLayer.xml
                    });
                });

                return listLayers;
            },

            getStylesByLayersKeynames: function (listKeynames) {
                var layersResources,
                    style,
                    stylesDict = {};

                layersResources = this.store.query(function (res) {
                    if (!res.keyname) {
                        return false;
                    }
                    return array.indexOf(listKeynames, res.keyname) !== -1;
                });

                array.forEach(layersResources, lang.hitch(this, function (layerResource) {
                    if (layerResource.link && layerResource.object && layerResource.object.styles &&
                        lang.isArray(layerResource.object.styles) && layerResource.object.styles.length > 0) {
                        style = layerResource.object.styles[0];
                    } else if (layerResource.styles && lang.isArray(layerResource.styles) &&
                        layerResource.styles.length > 0) {
                        style = layerResource.styles[0];
                    } else {
                        style = null;
                    }

                    stylesDict[layerResource.keyname] = style && style.json ? style.json : null;
                }));

                return stylesDict;
            },

            _parseXmlStyle: function (xmlStyle) {
                var metadataItems = query('metadata item', xmlStyle),
                    jsonStyle = null,
                    parsedMetadataItem;

                if (metadataItems.length > 0) {
                    array.forEach(metadataItems, lang.hitch(this, function (metadataItem) {
                        parsedMetadataItem = this._parseMetadataItem(metadataItem);

                        if (!jsonStyle) {
                            jsonStyle = {};
                        }
                        this._fillJsonStyle(parsedMetadataItem, jsonStyle);
                    }));
                }

                return jsonStyle;
            },

            _parseMetadataItem: function (metadataItem) {
                return {
                    key: attr.get(metadataItem, 'key'),
                    value: attr.get(metadataItem, 'value')
                }
            },

            _fillJsonStyle: function (parsedMetadataItem, jsonStyle) {
                if (!parsedMetadataItem.value) {
                    return false;
                }

                var valueForParsing = parsedMetadataItem.value.replace(/'/g, '"');
                switch (parsedMetadataItem.key) {
                    case 'clusters-states-styles':
                        jsonStyle.clustersStatesStyles = JSON.parse(valueForParsing);
                        break;
                    case 'selected-object-style':
                        jsonStyle.selectedObjectStyle = JSON.parse(valueForParsing);
                        break;
                }
            }
        });
    });