from pyramid.view import view_config
import urllib
import urllib2
import ast
import json


@view_config(route_name='map', renderer='map.mako')
def map(request):
    return {}


@view_config(route_name='layer', renderer='layer.mako')
def layer(request):
    return {}


@view_config(route_name='marker', renderer='marker.mako')
def marker(request):
    return {}


@view_config(route_name='wms', renderer='wms.mako')
def wms(request):
    return {}


@view_config(route_name='realtime', renderer='realtime.mako')
def realtime(request):
    return {}


@view_config(route_name='attributes', renderer='attributes.mako')
def attributes(request):
    return {}


@view_config(route_name='proxy', renderer='json')
def proxy(request):
    result = None

    if 'url' in request.POST:
        url = request.POST['url']
        params = None
        if 'params' in request.POST:
            params = json.loads(request.POST['params'])
        result = ast.literal_eval(urllib2.urlopen(request.POST['url'], data=str(params)).read())

    return result