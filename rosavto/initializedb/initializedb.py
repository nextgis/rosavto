import os
import sys
import transaction
import zipfile

from sqlalchemy import engine_from_config

from pyramid.paster import (
    get_appsettings,
    setup_logging,
    )

from rosavto.model import Base, DBSession, GasStation, Bridge
from rosavto.model.way import Way


def usage(argv):
    cmd = os.path.basename(argv[0])
    print('usage: %s <config_uri>\n'
          '(example: "%s development.ini")' % (cmd, cmd))
    sys.exit(1)


def main(argv=sys.argv):
    if len(argv) != 2:
        usage(argv)
    config_uri = argv[1]
    setup_logging(config_uri)
    settings = get_appsettings(config_uri)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with transaction.manager:
        GasStation.import_from_geojson_file('rosavto/initializedb/data/fuel.geojson')
        Bridge.import_from_geojson_file('rosavto/initializedb/data/bridges.geojson')
        #load ways for routing
        json_path = 'rosavto/initializedb/data/ways.geojson'
        zf_path = 'rosavto/initializedb/data/ways.geojson.zip'
        if os.path.isfile(zf_path):     # try open zip
            zf = zipfile.ZipFile(zf_path)
            zf.extractall(path='rosavto/initializedb/data/')
        Way.import_from_geojson_file(json_path)
