#!/usr/bin/env python

import re
import os
import sys
import fcntl
import glob
from stat import S_ISREG, ST_CTIME, ST_MODE
import time
import uuid
import base64
import argparse
import datetime
import logging
import ConfigParser
from crontab import CronTab
import xml.etree.ElementTree as et

from pgdb import *

logger = logging.getLogger('changeset-query-list')

if __name__ == '__main__':
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)

    formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    config_name = '/etc/pg_replica.conf'
    if not os.path.isfile(config_name):
        logger.critical('Configuration file "%s" not found.' % config_name)
        sys.exit(1)

    cfg = ConfigParser.SafeConfigParser({'log_file': '/var/log/pg_replica.log', 'log_level': 'debug'})

    cfg.read(config_name)
    log_file = cfg.get('logging', 'log_file')
    log_level = cfg.get('logging', 'log_level')
    num_level = getattr(logging, log_level.upper(), None)
    if not isinstance(num_level, int):
        num_level = 10

    fh = logging.FileHandler(log_file, encoding='utf-8')
    fh.setLevel(num_level)
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    logger.info('Start logging.')

    if cfg.has_section('general'):
        level = cfg.get('general', 'level')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('bus'):
        uri = cfg.get('bus', 'uri')
        user = cfg.get('bus', 'user')
        passwd = cfg.get('bus', 'password')
        addr = cfg.get('bus', 'address')
        peers = cfg.get('bus', 'peers').split(',')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start changeset list query.')

    headers = {'content-type': 'text/xml', 'Accept': 'text/xml'}
    auth = (user, passwd)

    action = 'sm://messages/application/gis/geochanges_reg_to_fda' if level == 'fda' else 'sm://messages/application/gis/geochanges_fda_to_reg'

    for p in peers:
        msg = '<?xml version="1.0" encoding="UTF-8"?>\n'
        msg += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"\n'
        msg += 'xmlns:wsa="http://www.w3.org/2005/08/addressing"\n'
        msg += 'xmlns:sv="urn:sm:interaction:v0.2">\n'
        msg += '<soap:Header>\n'
        msg += '<wsa:To>%s</wsa:To>\n' % p
        msg += '<wsa:From><wsa:Address>%s</wsa:Address></wsa:From>\n' % addr
        msg += '<wsa:MessageID>urn:uuid:%s</wsa:MessageID>\n' % uuid.uuid4()
        msg += '<wsa:Action>%s</wsa:Action>\n' % action
        msg += '</soap:Header><soap:Body>\n'
        msg += '<request>listChangesets</request>\n'
        msg += '</soap:Body></soap:Envelope>'

        r = requests.post(uri, data=msg, headers=headers, auth=auth)
        if r.status_code != 202:
            logger.error('Request failed: %s - %s' % (r.status_code, r.text))

    logger.debug('Stop changesets list query.')
    logger.info('Stop logging.')
    logging.shutdown()
