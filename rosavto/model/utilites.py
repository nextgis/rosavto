import datetime


class DictionaryMixin():
    def __init__(self):
        pass

    def set_fields_from_dict(self, dictionary):
        if type(dictionary) is dict:
            for k, v in dictionary.items():
                if v == '':
                    v = None
                if hasattr(self, k): setattr(self, k, v)


class GeoJsonMixin():
    __exlude_columns = ['id', 'geometry', 'the_geom']

    def __init__(self):
        pass

    def as_properties(self, **init):
        d = dict()
        for c in self.__table__.columns:
            if c.name not in self.__exlude_columns:
                v = getattr(self, c.name)
                if isinstance(v, datetime.datetime):
                    v = v.isoformat()
                if v is not None:
                    d[c.name] = v

        for k, v in init.items():
            d[k] = v

        return d