from pyramid.config import Configurator
from pyramid.renderers import JSON
from sqlalchemy import engine_from_config

from rosavto.model import Base, DBSession
from rosavto.model.uuid_type import UuidJsonEncoder

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine
    config = Configurator(settings=settings)
    config.include('pyramid_mako')
    config.include("cornice")
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_route('map', '/')
    config.add_route('layer', '/layer')
    config.add_route('marker', '/marker')
    config.add_route('wms', '/wms')
    config.add_route('realtime', '/realtime')
    config.add_route('attributes', '/attributes')
    config.add_route('attributes_html', '/attributes/html/{id}')
    config.add_route('incident', '/incident')
    config.add_route('center', '/center')
    config.add_route('routing_sample', '/routing_sample')
    config.add_route('code', '/code')

    # proxies url
    config.add_route('proxy_ngw', '/ngw/*target_url')
    config.add_route('proxy_cit', '/cit/*target_url')
    
    # routing url 
    config.add_route('routing', '/routing')
    config.add_route('simple_routing', '/simple_routing')

    #add custom renderer
    config.add_renderer('uuid_json', JSON(serializer=UuidJsonEncoder))

    config.scan()
    return config.make_wsgi_app()
