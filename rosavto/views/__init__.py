from pyramid.view import view_config


@view_config(route_name='map', renderer='map.mako')
def map(request):
    return {}

@view_config(route_name='layer', renderer='map.mako')
def layer(request):
    return {}

@view_config(route_name='marker', renderer='map.mako')
def marker(request):
    return {}