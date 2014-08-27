import unittest
import urllib2, json

from sqlalchemy import engine_from_config
from pyramid.paster import get_appsettings

from rosavto.model import DBSession


class NgwServicesTests(unittest.TestCase):
    def setUp(self):
        settings = get_appsettings('../../production.ini')
        self.engine = engine_from_config(settings, 'sqlalchemy.')

    def test_dbsession_configure(self):
        try:
            DBSession.configure(bind=self.engine)
        except:
            self.fail('DBSession configure is failed')

if __name__ == '__main__':
    unittest.main()