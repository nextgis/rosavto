#!/usr/bin/env python
# -*- coding: utf-8 -*-

import uuid
import requests

class BusCommunicatorError(Exception):
    pass

class BusCommunicator(object):
    def __init__(self, uri, send_to, send_from, user, password):
        self.uri = uri
        self.send_to = send_to
        self.senf_from = send_from
        self.user = user
        self.password = password
        self.headers = {'content-type': 'text/xml', 'Accept': 'text/xml'}

    def _message(self, request, action):
        params = dict(
            send_to = self.send_to,
            send_from = self.senf_from,
            id = uuid.uuid4(),
            action = action,
            request = request
        )
        msg = '''<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/
            xmlns:wsa="http://www.w3.org/2005/08/addressing" xmlns:sv="urn:sm:interaction:v0.2">
            <soap:Header>
                <wsa:To>%(send_to)s</wsa:To>
                <wsa:From><wsa:Address>%(send_from)s</wsa:Address></wsa:From>
                <wsa:MessageID>urn:uuid:%(id)s</wsa:MessageID>
                <wsa:Action>%(action)s</wsa:Action>
            </soap:Header>
            <soap:Body>
                <request>%(request)s</request>
            </soap:Body>
        </soap:Envelope>''' % params
        return msg

    def send_message(self, request, action):
            message = self._message(request, action)
            print message
            r = requests.post(self.uri, data=message, headers=self.headers, auth=(self.user, self.password))

            if r.status_code != 202:
                msg = ('Request failed: %s - %s' % (r.status_code, r.text))
                raise BusCommunicatorError(msg)


if __name__ == "__main__":

    uri = 'http://192.168.255.1:2002/interaction'
    address = 'urn:sm:gis@rosavtodor'
    user = 'gis'
    passwd = '!QAZxsw2'

    action = 'sm://messages/application/gis/geochanges_fda_to_reg'
    request = 'listChangesets'

    sender = BusCommunicator(uri, send_to='urn:sm:gis@uprdor-rus', send_from=address, user=user, password=passwd)
    sender.send_message(request, action)
