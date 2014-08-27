import unittest
import urllib2, json

from sqlalchemy import engine_from_config
from pyramid.paster import get_appsettings

from rosavto.model import DBSession


class NgwServicesTests(unittest.TestCase):
    # def __init__(self, path_to_config):
    #     self.config = path_to_config

    def setUp(self):
        self.ngwUrl = 'http://localhost/'

    def test_get_resource_available(self):
        service_url = self.ngwUrl + 'resource/0/child/'
        request = urllib2.Request(service_url)
        response = urllib2.urlopen(request)
        self.assertEqual(response.getcode(), 200)

    def test_get_resource_as_json(self):
        service_url = self.ngwUrl + 'resource/0/child/'
        request = urllib2.Request(service_url)
        response = urllib2.urlopen(request)
        try:
            json.loads(response.read())
        except ValueError, err:
            self.fail('Resources service answer is not json format')

if __name__ == '__main__':
    unittest.main()