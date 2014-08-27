import unittest
import sys, argparse

from sqlalchemy import engine_from_config
from pyramid.paster import get_appsettings

from rosavto.model import DBSession


class RosavtoDatabaseTests(unittest.TestCase):
    # def __init__(self, path_to_config):
    #     self.config = path_to_config

    def setUp(self):
        settings = get_appsettings('production.ini')
        self.engine = engine_from_config(settings, 'sqlalchemy.')

    def test_dbsession_configure(self):
        try:
            DBSession.configure(bind=self.engine)
        except:
            self.fail('DBSession configure is failed')

if __name__ == '__main__':
    unittest.main()