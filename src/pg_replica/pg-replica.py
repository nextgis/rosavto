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
import requests
import subprocess
import ConfigParser
from crontab import CronTab
import xml.etree.ElementTree as et

from pgdb import *

logger = logging.getLogger('pg-replica')

if __name__ == '__main__':
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)

    formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    parser = argparse.ArgumentParser()
    parser.add_argument('query_file', help='query file')
    args = parser.parse_args()
    query_file = args.query_file

    #config_name = '/etc/pg_replica.conf'
    config_name = 'pg_replica.conf'
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

    tree = et.parse(query_file)
    root = tree.getroot()
    header = root.find('{http://schemas.xmlsoap.org/soap/envelope/}Header')
    sender = header.find('{http://www.w3.org/2005/08/addressing}From')
    peer = sender.find('{http://www.w3.org/2005/08/addressing}Address').text
    action = header.find('{http://www.w3.org/2005/08/addressing}Action').text
    body = root.find('{http://schemas.xmlsoap.org/soap/envelope/}Body')
    req = body.find('request')
    if req is not None:
        if req.text == 'listChangesets':
            cmd = 'changeset-list.py'
        elif req.text == 'getChangeset':
            cmd = 'changeset-send.py'
        elif req.text == 'listing':
            cmd = 'changeset-process-list.py'
    else:
        if body.find('chn') is not None:
            cmd = 'changeset-save.py'

    cmd += ' ' + query_file
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=False).stdout

    logger.info('Stop logging.')
    logging.shutdown()
