import json
from rosavto.model import DBSession
from rosavto.model.way import Way
from uuid import uuid4
from geoalchemy2.elements import WKTElement
from sqlalchemy.sql import select
from sqlalchemy import func
from pyramid.view import view_config
from shapely.geometry import Point

@view_config(route_name='routing', renderer='json')
def routing(request):
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

    st_pt = Point(from_x, from_y)  # 47.905, 54.586
    end_pt = Point(to_x, to_y)  # 46.726	54.120
    #TODO: add barriers parser

    #get route
    router = Router()
    #route = router.get_route(st_pt, end_pt)
    try:
        route = router.get_route(st_pt, end_pt)
    except Exception, err:
        return create_error_response(err)

    edge_id = router.get_nearest_edge_id(st_pt)  # test

    #create response
    result = {
        'type': 'FeatureCollection',
        'features': []
    }

    feature = {
        'id': str(uuid4()),
        'type': 'Feature',
        'geometry': None,  # json.loads(),
        'properties': {'gid': edge_id}
    }

    result['features'].append(feature)

    return result


def create_error_response(error_msg):
    result = {
        'type': 'ServiceException',
        'description': str(error_msg)
    }
    return result


class Route():
    def __init__(self):
        pass


class Router():
    def __init__(self):
        self._session = DBSession()

    def get_route(self, from_point, to_point, barrier_points=[]):
        #get edges
        start_edge_id = self.get_nearest_edge_id(from_point)
        if not start_edge_id:
            raise Exception('Start point is too far from road!')
        end_edge_id = self.get_nearest_edge_id(to_point)
        if not end_edge_id:
            raise Exception('End point is too far from road!')
        #TODO: add barriers id getter

        #route = self._session.query(Way.gid, Way.name, Way.osm_id, Way.the_geom.ST_Asgeojson(),
        #    func.pgr_trsp(self.get_net_query(), start_edge_id, end_edge_id, True, True,).label('p')).join(Way, 'p.id2' == Way.gid)
        return Route()

    def get_net_query(self):
        sel = select([Way.gid.label('id'), Way.source, Way.target, Way.length.label('cost'), Way.reverse_cost])
        return str(sel)

    def get_nearest_edge_id(self, point, max_distance=1):
        wkt_pt = WKTElement(point.wkt, srid=4326)
        wkt_buff = WKTElement(point.buffer(max_distance, 10).envelope.wkt, srid=4326)
        edge_id = self._session.query(Way.gid).filter(Way.the_geom.intersects(wkt_buff)).order_by(Way.the_geom.ST_Distance(wkt_pt)).first()
        return edge_id