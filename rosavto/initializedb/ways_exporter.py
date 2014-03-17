import argparse
import os
from sqlalchemy import engine_from_config
from rosavto.model import DBSession
from rosavto.model.way import Way
from rosavto.model.simple_road import SimpleRoad
from logging import log, INFO, ERROR, getLogger
from pyramid.paster import (
    get_appsettings,
    setup_logging,
)

def argparser_prepare():
    class PrettyFormatter(argparse.ArgumentDefaultsHelpFormatter, argparse.RawDescriptionHelpFormatter):
        max_help_position = 35

    parser = argparse.ArgumentParser(description='Export ways or simple roads (federal ways) tables from dev db',
                                     formatter_class=PrettyFormatter)
    parser.add_argument('config_uri', type=str,
                        help='config file path')
    parser.add_argument('output_path', type=str,
                        help='export file path')
    parser.add_argument('-z', '--zip', action='store_true',
                        help='zip exported file')
    parser.add_argument('-s', '--simple-roads', action='store_true',
                        help='export simple roads (federal ways)')
    parser.epilog = '''Samples:
                 %(prog)s development.ini ways.geojson
                 %(prog)s development.ini ways.geojson -z
                 %(prog)s development.ini simple_roads.geojson -s
                 ''' % {'prog': parser.prog}
    return parser


def main():
    #parse args
    parser = argparser_prepare()
    args = parser.parse_args()


    setup_logging(args.config_uri)
    getLogger('sqlalchemy.engine').setLevel(ERROR)
    settings = get_appsettings(args.config_uri)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)

    log(INFO, "Export started...")
    if args.simple_roads:
        SimpleRoad.export_to_geojson_file(args.output_path)
    else:
        Way.export_to_geojson_file(args.output_path)

    if args.zip:
        log(INFO, "Zip file...")
        import zipfile
        zf = zipfile.ZipFile(args.output_path+'.zip', 'w',  zipfile.ZIP_DEFLATED, allowZip64=True)
        zf.write(args.output_path)
        zf.close()
        os.remove(args.output_path)

    log(INFO, "Export successful!")

