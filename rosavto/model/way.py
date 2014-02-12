from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    Text,
    Float
    )

from sqlalchemy.ext.declarative import declarative_base
from utilites import GeoJsonMixin, DictionaryMixin
from geoalchemy2 import Geometry

Base = declarative_base()


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
