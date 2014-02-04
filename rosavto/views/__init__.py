import urllib
import urllib2
import ast
import json

import random
import os.path as path

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


@view_config(route_name='wms', renderer='wms.mako')
def wms(request):
    return {}


@view_config(route_name='realtime', renderer='realtime.mako')
def realtime(request):
    return {}


@view_config(route_name='attributes', renderer='attributes.mako')
def attributes(request):
    return {}


@view_config(route_name='code', renderer='code.mako')
def code(request):
    return {}


@view_config(route_name='incident', renderer='incident.mako')
def incident(request):
    return {}


@view_config(route_name='attributes_html', renderer='string')
def get_html_attributes(request):
    random_file = path.join(path.dirname(__file__), 'attr/{0}.html'.format(str(random.randint(1, 3))))
    f = open(random_file)
    html = f.read()
    return html


@view_config(route_name='proxy_ngw', renderer='json')
def proxy_ngw(request):
    url = request.registry.settings['proxy_ngw'] + '/'.join(request.matchdict['target_url'])
    return get_response_by_proxy(request, url)


@view_config(route_name='proxy_cit', renderer='json')
def proxy_cit(request):
    url = request.registry.settings['proxy_cit'] + '/'.join(request.matchdict['target_url'])
    return get_response_by_proxy(request, url)


def get_response_by_proxy(request, url):
    data = urllib.urlencode(request.params)
    if request.method == 'GET':
        delimiter = ''
        if request.path[-1] == '/':
            delimiter = '/'
        url = '{0}{1}?{2}'.format(url, delimiter, data)
        req = urllib2.Request(url, None)
    else:
        if request.POST.keys()[0] and request.POST.values()[0] == '':
            data = request.POST.keys()[0]
        req = urllib2.Request(url, data)

    f = urllib2.urlopen(req)
    response = f.read()
    f.close()

    if f.headers['content-type']:
        content_type_header = f.headers['content-type']
        if 'application/json' in content_type_header:
            response = json.loads(response)
        elif 'text' in content_type_header:
            response = response.decode('utf-8')
            request.override_renderer = 'string'

    return response