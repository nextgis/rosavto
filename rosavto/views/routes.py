from uuid import UUID
from cornice import Service

from rosavto.model import DBSession
from rosavto.model.route import Route
from rosavto.views import create_error_response


routes_service = Service(name='routes', path='/routes', description='Saved routes list')

@routes_service.get()
def get_value(request):
    try:
        session = DBSession()
        routes_list = session.query(Route).all()

        result = {
            'type': 'RouteCollection',
            'routes': []
        }

        for route in routes_list:
            # try parse dt:
            if route.insert_dt_utc is not None:
                dt = route.insert_dt_utc.strptime("%d.%m.%Y %H:%M")
            else:
                dt = None

            route_dict = {
                'id':   str(route.id),
                'name': route.name,
                'comment':      route.comment,
                'insert_dt':    dt,
                'insert_user':  route.insert_user,
            }
            result['routes'].append(route_dict)

        return result
    except Exception, err:
        return create_error_response(err)



route_service = Service(name='route', path='/routes/{id}', description='Saved routes by id')

@route_service.get()
def get_value(request):
    try:
        id = UUID(request.matchdict['id'])
        session = DBSession()
        route_instance = session.query(Route).filter_by(id=id).first()

        if route_instance is None:
            return dict()
        else:
            # try parse dt:
            if route_instance.insert_dt_utc is not None:
                dt = route_instance.insert_dt_utc.strptime("%d.%m.%Y %H:%M")
            else:
                dt = None

            result = {
                'id':   str(route_instance.id),
                'name': route_instance.name,
                'comment':      route_instance.comment,
                'insert_dt':    dt,
                'insert_user':  route_instance.insert_user,
                'type': 'FeatureCollection',
                'features': route_instance.json_path
            }
        return result
    except Exception, err:
        return create_error_response(err)

@route_service.post()
def set_value(request):
    route = request.json_body
    return {'success': True}
