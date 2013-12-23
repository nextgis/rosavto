import json
from cornice import Service

from rosavto.model import DBSession, Bridge

bridges = Service(name='bridges', path='/bridges', description='Openstreetmap bridges')


@bridges.get()
def get_value(request):
    session = DBSession()
    bridges_db = session.query(Bridge, Bridge.geometry.ST_AsGeoJSON())

    result = {
        'type': 'FeatureCollection',
        'features': []
    }

    for bridge_db in bridges_db:
        feature = {
            'id':bridge_db[0].id,
            "type": "Feature",
            "geometry": json.loads(bridge_db[1]),
            'properties': bridge_db[0].as_properties()
        }
        result['features'].append(feature)

    return result