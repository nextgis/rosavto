from utilites import DictionaryMixin

from sqlalchemy import (
    Column,
    Index,
    Integer,
    BigInteger,
    Text,
    Boolean
    )
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    )
from zope.sqlalchemy import ZopeTransactionExtension

from geoalchemy2 import Geometry

from shapely.geometry import asShape

import json
import geojson

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()


class GasStation(Base, DictionaryMixin):
    __tablename__ = 'gas_stations'

    id = Column(BigInteger, primary_key=True)
    name = Column(Text, index=True)
    brand = Column(Text)
    fuel_diesel = Column(Boolean)
    fuel_octane_92 = Column(Boolean)
    fuel_octane_95 = Column(Boolean)
    opening_hours = Column(Text)
    operator = Column(Text)
    website = Column(Text)
    geometry = Column(Geometry(spatial_index=True, srid=4326))

    @staticmethod
    def import_from_geojson_file(path_to_file):
        with open(path_to_file, 'r') as gas_station_geojson_file:
            dbsession = DBSession()

            content = gas_station_geojson_file.read()
            json_file = json.loads(content)
            gas_stations_geojson = geojson.loads(json.dumps(json_file['features']))

            for gas_station in gas_stations_geojson:
                properties = gas_station['properties']
                properties['geometry'] = asShape(gas_station['geometry'])
                properties['id'] = long(gas_station['id'].split('/')[1])
                if 'fuel:diesel' in properties: properties['fuel_diesel'] = True
                if 'fuel:octane_92' in properties: properties['fuel_octane_92'] = True
                if 'fuel:octane_95' in properties: properties['fuel_octane_95'] = True
                if 'contact:website' in properties: properties['website'] = properties['contact:website']

                gas_station = GasStation()
                gas_station.set_fields_from_dict(properties)

                dbsession.add(gas_station)


class Bridge(Base, DictionaryMixin):
    __tablename__ = 'bridges'

    id = Column(BigInteger, primary_key=True)
    geometry = Column(Geometry(spatial_index=True, srid=4326))

    @staticmethod
    def import_from_geojson_file(path_to_file):
        with open(path_to_file, 'r') as bridge_geojson_file:
            dbsession = DBSession()

            content = bridge_geojson_file.read()
            json_file = json.loads(content)
            bridge_geojson = geojson.loads(json.dumps(json_file['features']))

            for bridge in bridge_geojson:
                properties = bridge['properties']
                properties['geometry'] = asShape(bridge['geometry'])
                properties['id'] = long(bridge['id'].split('/')[1])

                bridge = Bridge()
                bridge.set_fields_from_dict(properties)

                dbsession.add(bridge)