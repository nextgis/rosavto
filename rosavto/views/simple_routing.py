import json
from sqlalchemy.sql import select, text
from sqlalchemy import func
from geoalchemy2.elements import WKTElement
from pyramid.view import view_config
from shapely.geometry import Point

from rosavto.model import DBSession
from rosavto.model.simple_road import SimpleRoad


@view_config(route_name='simple_routing', renderer='uuid_json')
def simple_routing(request):
    #parse args (coord)
    try:
        from_x = float(request.params['from_x'])
        from_y = float(request.params['from_y'])
        to_x = float(request.params['to_x'])
        to_y = float(request.params['to_y'])
    except KeyError, key:
        return create_error_response('Required parameter is not specified: ' + str(key))
    except ValueError, err:
        return create_error_response('Required parameter can\'be parsed: ' + str(err))

    st_pt = Point(from_x, from_y)
    end_pt = Point(to_x, to_y)

    #get route
    router = SimpleRouter()
    try:
        route = router.get_route(st_pt, end_pt)
    except Exception, err:
        return create_error_response(err)

    #create response
    result = {
        'type': 'FeatureCollection',
        'features': []
    }

    for way in route:
        feature = {
            'id': way[0],
            'type': 'Feature',
            'geometry': json.loads(way[5]),
            'properties': {'name': way[1], 'name_short': way[2], 'road_no': way[3], 'road_uid': way[4]}
        }
        result['features'].append(feature)

    return result


def create_error_response(error_msg):
    result = {
        'type': 'ServiceException',
        'description': str(error_msg)
    }
    return result


class SimpleRouter():
    def __init__(self):
        self._session = DBSession()

    def get_route(self, from_point, to_point):
        #get edges
        start_edge_id = self.get_nearest_edge_id(from_point)
        if not start_edge_id:
            raise Exception('Start point is too far from road!')
        end_edge_id = self.get_nearest_edge_id(to_point)
        if not end_edge_id:
            raise Exception('End point is too far from road!')
        position = 0.5  # TODO: add proportion getter
        #request
        pgr_trsp = select(['id2'], from_obj=func.pgr_trsp(self.get_net_query(), start_edge_id, position,
                                                          end_edge_id, position, False, False)).alias('trsp')
        route = self._session.query(SimpleRoad.id, SimpleRoad.name, SimpleRoad.name_short, SimpleRoad.road_no, SimpleRoad.road_uid, SimpleRoad.the_geom.ST_AsGeoJSON()).select_from(pgr_trsp).join(SimpleRoad, text('trsp.id2') == SimpleRoad.id).all()
        return route

    def get_net_query(self):
        sel = select([SimpleRoad.id, SimpleRoad.source, SimpleRoad.target, SimpleRoad.length.label('cost')])
        return str(sel)

    def get_nearest_edge_id(self, point, max_distance=1):
        wkt_pt = WKTElement(point.wkt, srid=4326)
        wkt_buff = WKTElement(point.buffer(max_distance, 10).envelope.wkt, srid=4326)
        edge_id = self._session.query(SimpleRoad.id).filter(SimpleRoad.the_geom.intersects(wkt_buff)).order_by(SimpleRoad.the_geom.ST_Distance(wkt_pt)).first()
        if edge_id:
            return edge_id[0]
        else:
            return None