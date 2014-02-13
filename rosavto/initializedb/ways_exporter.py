import os
import sys
from sqlalchemy import engine_from_config
from rosavto.model import DBSession
from rosavto.model.way import Way
from logging import log, INFO, ERROR, getLogger
from pyramid.paster import (
    get_appsettings,
    setup_logging,
)


def usage(argv):
    cmd = os.path.basename(argv[0])
    print('usage: %s <config_uri> <export_file_name>\n [-z]'
          '(example: "%s development.ini ways.geojson")' % (cmd, cmd))
    sys.exit(1)


def main(argv=sys.argv):
    if len(argv) < 3:
        usage(argv)
    config_uri = argv[1]
    out_path = argv[2]
    setup_logging(config_uri)
    getLogger('sqlalchemy.engine').setLevel(ERROR)
    settings = get_appsettings(config_uri)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)

    log(INFO, "Export started...")
    Way.export_to_geojson_file(out_path)

    if '-z' in argv:
        log(INFO, "Zip file...")
        import zipfile
        zf = zipfile.ZipFile(out_path+'.zip', 'w',  zipfile.ZIP_DEFLATED, allowZip64=True)
        zf.write(out_path)
        zf.close()
        os.remove(out_path)

    log(INFO, "Export successful!")

