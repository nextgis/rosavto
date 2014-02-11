import os
import sys
from sqlalchemy import engine_from_config
from rosavto.model import DBSession
from rosavto.model.way import Way

from pyramid.paster import (
    get_appsettings,
    setup_logging,
)


def usage(argv):
    cmd = os.path.basename(argv[0])
    print('usage: %s <config_uri> <export_file_name>\n'
          '(example: "%s development.ini export_file.geojson")' % (cmd, cmd))
    sys.exit(1)


def main(argv=sys.argv):
    if len(argv) != 3:
        usage(argv)
    config_uri = argv[1]
    #setup_logging(config_uri)
    settings = get_appsettings(config_uri)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Way.export_to_geojson_file(argv[2])