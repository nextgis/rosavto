import json
from cornice import Service

from rosavto.model import DBSession, GasStation

gas_stations = Service(name='gas_stations', path='/gas_stations', description='Openstreetmap gas stations')


@gas_stations.get()
def get_value(request):
    session = DBSession()
    gas_stations_db = session.query(GasStation, GasStation.geometry.ST_AsGeoJSON())

    result = {
        'type': 'FeatureCollection',
        'features': []
    }

    for gas_station_db in gas_stations_db:
        feature = {
            'id': gas_station_db[0].id,
            "type": "Feature",
            "geometry": json.loads(gas_station_db[1]),
            'properties': gas_station_db[0].as_properties()
        }
        result['features'].append(feature)

    return result


gas_station = Service(name='gas_station', path='/gas_stations/{id}', description='Openstreetmap gas station by id')


@gas_station.get()
def get_value(request):
    id = long(request.matchdict['id'])

    session = DBSession()
    gas_stations_db = session.query(GasStation, GasStation.geometry.ST_AsGeoJSON()).filter_by(id=id)

    result = {
        'type': 'FeatureCollection',
        'features': []
    }

    for gas_station_db in gas_stations_db:
        feature = {
            'id': gas_station_db[0].id,
            "type": "Feature",
            "geometry": json.loads(gas_station_db[1]),
            'properties': gas_station_db[0].as_properties()
        }
        result['features'].append(feature)

    return result