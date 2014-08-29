#!/usr/bin/env python
# -*- coding: utf-8 -*-

import uuid
import requests

class BusCommunicatorError(Exception):
    pass

class BusCommunicator(object):
    def __init__(self, uri, send_from, user, password):
        self.uri = uri
        self.senf_from = send_from
        self.user = user
        self.password = password
        self.headers = {'content-type': 'text/xml', 'Accept': 'text/xml'}

    def _message(self, send_to, request, action, addition_info):
        params = dict(
            send_to = send_to,
            send_from = self.senf_from,
            id = uuid.uuid4(),
            action = action,
            request = request,
            addition = addition_info
        )
        msg = '''<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:wsa="http://www.w3.org/2005/08/addressing" xmlns:sv="urn:sm:interaction:v0.2">
            <soap:Header>
                <wsa:To>%(send_to)s</wsa:To>
                <wsa:From><wsa:Address>%(send_from)s</wsa:Address></wsa:From>
                <wsa:MessageID>urn:uuid:%(id)s</wsa:MessageID>
                <wsa:Action>%(action)s</wsa:Action>
            </soap:Header>
            <soap:Body>
                <request>%(request)s</request>
                %(addition)s
            </soap:Body>
        </soap:Envelope>''' % params
        return msg

    def send_message(self, send_to, request, action, addition_info=''):
        message = self._message(send_to, request, action, addition_info)

        r = requests.post(self.uri, data=message, headers=self.headers, auth=(self.user, self.password))

        if r.status_code != 202:
            msg = 'Request failed: %s - %s' % (r.status_code, r.text)
            raise BusCommunicatorError(msg)


if __name__ == "__main__":

    uri = 'http://192.168.255.1:2001/interaction'
    user = 'gis'
    passwd = '!QAZxsw2'
    
    logic_addr1 = 'urn:sm:gis@rosavtodor'
    logic_addr2 = 'urn:sm:gis@uprdor-rus'
    

    action = 'sm://messages/application/gis/geochanges_reg_to_fda'
    request = 'listChangesets'

    sender = BusCommunicator(uri, send_from=logic_addr1, user=user, password=passwd)
    sender.send_message(logic_addr2, request, action)
