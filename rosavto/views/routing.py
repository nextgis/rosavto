import json
from sqlalchemy.sql import select, text
from sqlalchemy.exc import InternalError
from sqlalchemy import func
from geoalchemy2.elements import WKTElement
from pyramid.view import view_config
from shapely.geometry import Point

from rosavto.model import DBSession
from rosavto.model.way import Way


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

    st_pt = Point(from_x, from_y)
    end_pt = Point(to_x, to_y)

    #parse barriers #TODO: add barriers parser (now only one barrier)
    barriers = []
    try:
        bar_x = float(request.params['bar_x'])
        bar_y = float(request.params['bar_y'])
        bar_pt = Point(bar_x, bar_y)
        barriers.append(bar_pt)
    except KeyError, key:
        pass
    except ValueError, err:
        return create_error_response('Parameter can\'be parsed: ' + str(err))


    #get route
    router = Router()
    try:
        route = router.get_route(st_pt, end_pt, barriers)
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
            'geometry': json.loads(way[4]),
            'properties': {'name': way[1], 'osm_id': way[2], 'length': way[3]}
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
        #get barriers edges
        barrier_edge_ids = []
        for bar_point in barrier_points:
            bar_edge_id = self.get_nearest_edge_id(bar_point)
            barrier_edge_ids.append(bar_edge_id)
        position = 0.5  # TODO: add proportion getter
        #request
        pgr_trsp = select(['id2'], from_obj=func.pgr_trsp(self.get_net_query(), start_edge_id, position,
                                                          end_edge_id, position, True, True,
                                                          self.get_restrict_query(barrier_edge_ids))).alias('trsp')
        try:
            route = self._session.query(Way.gid, Way.name, Way.osm_id, Way.length, Way.the_geom.ST_AsGeoJSON()).select_from(pgr_trsp).join(Way, text('trsp.id2') == Way.gid).all()
        except InternalError, err:
            exc_desc = str(err)
            if 'Path Not Found' in exc_desc:
                raise Exception('Path Not Found')
            else:
                raise
        return route

    def get_net_query(self):
        sel = select([Way.gid.label('id'), Way.source, Way.target, Way.length.label('cost'), Way.reverse_cost])
        return str(sel)

    def get_restrict_query(self, barrier_edge_ids=[]):
        if len(barrier_edge_ids) < 1:
            return ''
        sel = None
        for edge_id in barrier_edge_ids:
            new_sel = select(['100000::float as to_cost', str(edge_id)+'::integer as target_id', '\'\'::text as via_path'])
            if sel is None:
                sel = new_sel
            else:
                sel.union(new_sel)
        return str(sel)

    def get_nearest_edge_id(self, point, max_distance=1):
        wkt_pt = WKTElement(point.wkt, srid=4326)
        wkt_buff = WKTElement(point.buffer(max_distance, 10).envelope.wkt, srid=4326)
        edge_id = self._session.query(Way.gid).filter(Way.the_geom.intersects(wkt_buff)).order_by(Way.the_geom.ST_Distance(wkt_pt)).first()
        if edge_id:
            return edge_id[0]
        else:
            return None