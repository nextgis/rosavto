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

logger = logging.getLogger('changeset-list')

if __name__ == '__main__':
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)

    formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    parser = argparse.ArgumentParser()
    parser.add_argument('dst', help='destination url')
    parser.add_argument('level', help='operation level')
    args = parser.parse_args()
    dst = args.dst
    level = args.level

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

    if cfg.has_section('bus'):
        uri = cfg.get('bus', 'uri')
        user = cfg.get('bus', 'user')
        passwd = cfg.get('bus', 'password')
        addr = cfg.get('bus', 'address')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('path'):
        directory = cfg.get('path', 'commits')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start changesets listing.')

    entries = (os.path.join(directory, fn) for fn in os.listdir(directory))
    entries = ((os.stat(path), path) for path in entries)
    entries = ((stat[ST_CTIME], path) for stat, path in entries if S_ISREG(stat[ST_MODE]))

    action = 'sm://messages/application/gis/geochanges_reg_to_fda' if level == 'fda' else 'sm://messages/application/gis/geochanges_fda_to_reg'

    msg = '<?xml version="1.0" encoding="UTF-8"?>\n'
    msg += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"\n'
    msg += 'xmlns:wsa="http://www.w3.org/2005/08/addressing"\n'
    msg += 'xmlns:sv="urn:sm:interaction:v0.2">\n'
    msg += '<soap:Header>\n'
    msg += '<wsa:To>%s</wsa:To>\n' % dst
    msg += '<wsa:From><wsa:Address>%s</wsa:Address></wsa:From>\n' % addr
    msg += '<wsa:MessageID>urn:uuid:%s</wsa:MessageID>\n' % uuid.uuid4()
    msg += '<wsa:Action>%s</wsa:Action>\n' % action
    msg += '</soap:Header><soap:Body>\n'

    for cdate, p in sorted(entries):
        msg += '<changeset>%s</changeset>\n' % os.path.split(p)[1]
    msg += '</soap:Body></soap:Envelope>'

    headers = {'content-type': 'text/xml', 'Accept': 'text/xml'}
    auth = (user, passwd)
    r = requests.post(uri, data=msg, headers=headers, auth=auth)
    if r.status_code != 202:
        logger.error('Request failed: %s - %s' % (r.status_code, r.text))

    logger.debug('Stop changesets listing.')
    logger.info('Stop logging.')
    logging.shutdown()
