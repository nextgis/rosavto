from pyramid.config import Configurator
from sqlalchemy import engine_from_config

from rosavto.model import Base, DBSession


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
    config.add_route('proxy', '/proxy')
    config.add_route('code', '/code')
    config.add_route('incident', '/incident')
    config.add_route('routing', '/routing')
    config.add_route('routing_sample', '/routing_sample')
    config.scan()
    return config.make_wsgi_app()
