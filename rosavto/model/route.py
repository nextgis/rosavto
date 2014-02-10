from datetime import datetime
from sqlalchemy import (
    Column,
    Text,
    DateTime)
from uuid_type import GUID

from sqlalchemy.ext.declarative import declarative_base
from utilites import GeoJsonMixin, DictionaryMixin

Base = declarative_base()


class Route(Base, DictionaryMixin, GeoJsonMixin):
    __tablename__ = 'route'

    id = Column(GUID, primary_key=True)
    name = Column(Text)
    comment = Column(Text)
    json_path = Column(Text)
    insert_dt_utc = Column(DateTime, default=datetime.utcnow)
    insert_user = Column(Text)