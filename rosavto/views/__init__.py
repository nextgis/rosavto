from pyramid.view import view_config
import urllib2
import ast


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


@view_config(route_name='getLayersInfo', renderer='json')
def get_layers_info(request):
    result = None
    if 'url' in request.POST:
        result = ast.literal_eval(urllib2.urlopen(request.POST['url']).read())
    return result