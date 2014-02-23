import json
from logging import log, INFO
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    Text,
    Float
)
from geoalchemy2 import Geometry, shape
from utilites import GeoJsonMixin, DictionaryMixin
from rosavto.model import DBSession, Base
from rosavto.model.uuid_type import GUID, UuidJsonEncoder
import geojson
from shapely.geometry import asShape

# Simple routing table
class SimpleRoad(Base, DictionaryMixin, GeoJsonMixin):
    __tablename__ = 'simple_road'
    __table_args__ = {'schema': 'routing'}

    id = Column(Integer, primary_key=True)
    length = Column(Float)
    name = Column(Text)
    name_short = Column(Text)
    road_no = Column(Text)
    road_uid = Column(GUID)
    the_geom = Column(Geometry(spatial_index=True, srid=4326))
    source = Column(Integer, index=True)
    target = Column(Integer, index=True)

    @staticmethod
    def import_from_geojson_file(path_to_file):
        with open(path_to_file, 'r') as geojson_file:
            db_session = DBSession()

            content = geojson_file.read()
            json_file = json.loads(content)
            ways_geojson = geojson.loads(json.dumps(json_file['features']))

            for way in ways_geojson:
                properties = way['properties']
                properties['the_geom'] = shape.from_shape(asShape(way['geometry']), 4326)

                way_inst = SimpleRoad()
                way_inst.set_fields_from_dict(properties)

                db_session.add(way_inst)
                db_session.flush()

    @staticmethod
    def export_to_geojson_file(path_to_file):
        with open(path_to_file, 'w') as ways_geojson_file:
            db_session = DBSession()

            count = db_session.query(SimpleRoad).count()
            log(INFO, 'Total ways: %s' % count)

            log(INFO, 'Get data...')
            all_ways = db_session.query(SimpleRoad, SimpleRoad.the_geom.ST_AsGeoJSON()).all()  # limit(500)  # test

            #create json
            output_content = {
                'type': 'FeatureCollection',
                'generator': "rosavto-data",
                'copyright': "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
                'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S'),
                'features': []
            }

            handled = 0
            for way in all_ways:
                #create feat
                feature = {
                    'type': 'Feature',
                    'id': way[0].id,
                    'geometry': json.loads(way[1]),
                    'properties': {}
                }
                #set attrs
                for prop, val in way[0].as_properties().items():
                    feature['properties'][prop] = val
                #add id column explicit
                feature['properties']['id'] = way[0].id
                #add to collection
                output_content['features'].append(feature)
                #log
                handled += 1
                if handled % 1000 == 0:
                    log(INFO, 'Handled: %s' % handled)

            json.dump(output_content, ways_geojson_file, indent=4, cls=UuidJsonEncoder)