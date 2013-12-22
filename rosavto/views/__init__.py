from pyramid.view import view_config


@view_config(route_name='map', renderer='map.mako')
def map(request):
    return {}

@view_config(route_name='layer', renderer='layer.mako')
def layer(request):
    return {}

@view_config(route_name='marker', renderer='marker.mako')
def marker(request):
    return {}