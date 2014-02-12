import json
from logging import log, INFO
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    Text,
    Float
)
from geoalchemy2 import Geometry
from utilites import GeoJsonMixin, DictionaryMixin
from rosavto.model import DBSession, Base


#osm2pgrouting 'ways' table
class Way(Base, DictionaryMixin, GeoJsonMixin):
    __tablename__ = 'ways'  # temporary! ways

    gid = Column(Integer, primary_key=True)
    class_id = Column(Integer)
    length = Column(Float)
    name = Column(Text)
    x1 = Column(Float)
    y1 = Column(Float)
    x2 = Column(Float)
    y2 = Column(Float)
    reverse_cost = Column(Float)
    rule = Column(Text)
    to_cost = Column(Float)
    maxspeed_forward = Column(Integer)
    maxspeed_backward = Column(Integer)
    osm_id = Column(BigInteger)
    priority = Column(Float)
    the_geom = Column(Geometry(spatial_index=True, srid=4326))
    source = Column(Integer, index=True)
    target = Column(Integer, index=True)

    # @staticmethod
    # def import_from_geojson_file(path_to_file):
    #     with open(path_to_file, 'r') as gas_station_geojson_file:
    #         dbsession = DBSession()
    #
    #         content = gas_station_geojson_file.read()
    #         json_file = json.loads(content)
    #         gas_stations_geojson = geojson.loads(json.dumps(json_file['features']))
    #
    #         for gas_station in gas_stations_geojson:
    #             properties = gas_station['properties']
    #             properties['geometry'] = shape.from_shape(asShape(gas_station['geometry']), 4326)
    #             properties['id'] = long(gas_station['id'].split('/')[1])
    #             if 'fuel:diesel' in properties: properties['fuel_diesel'] = True
    #             if 'fuel:octane_92' in properties: properties['fuel_octane_92'] = True
    #             if 'fuel:octane_95' in properties: properties['fuel_octane_95'] = True
    #             if 'contact:website' in properties: properties['website'] = properties['contact:website']
    #
    #             gas_station = GasStation()
    #             gas_station.set_fields_from_dict(properties)
    #
    #             dbsession.add(gas_station)
    #             dbsession.flush()

    @staticmethod
    def export_to_geojson_file(path_to_file):
        with open(path_to_file, 'w') as ways_geojson_file:
            db_session = DBSession()

            count = db_session.query(Way).count()
            log(INFO, 'Total ways: %s' % count)

            log(INFO, 'Get data...')
            all_ways = db_session.query(Way, Way.the_geom.ST_AsGeoJSON()).all()  # limit(500)  # test

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
                    'id': way[0].gid,
                    'geometry': way[1],
                    'properties': {}
                }
                #set attrs
                for prop, val in way[0].as_properties().items():
                    feature['properties'][prop] = val
                #add to collection
                output_content['features'].append(feature)
                #log
                handled += 1
                if handled % 1000 == 0:
                    log(INFO, 'Handled: %s' % handled)

            json.dump(output_content, ways_geojson_file, indent=4)