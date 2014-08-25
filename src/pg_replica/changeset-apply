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
import ConfigParser
from crontab import CronTab
import xml.etree.ElementTree as et

from pgdb import *

logger = logging.getLogger('changeset-apply')
pid_file = 'changeset-apply.pid'

if __name__ == '__main__':
    fp = open(os.path.join('/var/run', pid_file), 'w')
    try:
        fcntl.lockf(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except IOError:
        sys.exit(0)

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

    if cfg.has_section('database'):
        host = cfg.get('database', 'host')
        port = cfg.getint('database', 'port')
        dbname = cfg.get('database', 'database')
        user = cfg.get('database', 'user')
        passwd = cfg.get('database', 'password')
        rep_table = cfg.get('database', 'rep_table')
        rep_schema = cfg.get('database', 'rep_schema')
        com_table = cfg.get('database', 'com_table')
        com_schema = cfg.get('database', 'com_schema')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('path'):
        dirChanges = cfg.get('path', 'changesets')
        dirCommits = cfg.get('path', 'commits')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start changeset applying.')

    db = PgDB(host, port, dbname, user, passwd)
    c = db.con.cursor()

    repl_table = db._table_name(rep_schema, rep_table)
    comm_table = db._table_name(com_schema, com_table)

    cron = CronTab()
    job = cron.find_command('changeset-gen')
    job.enable(False)
    cron.write()

    file_list = sorted(glob.glob(os.path.join(dirChanges, '*.changeset')))
    logger.debug('Found %s changesets.' % len(file_list))
    cfg = ConfigParser.SafeConfigParser()
    for f in file_list:
        logger.debug('Processing file: "%s".' % f)
        cfg.readfp(codecs.open(f, encoding='utf-8'))

        tbl = cfg.get('changeset', 'tbl')
        sql = cfg.get('changeset', 'sql')

        full_table_name = base64.urlsafe_b64decode(tbl.encode('utf-8'))
        sql = base64.urlsafe_b64decode(sql.encode('utf-8')).decode('utf-8')

        schema = full_table_name.split('.')[0]
        table = full_table_name.split('.')[1]

        qry = "ALTER TABLE %s DISABLE TRIGGER %s_rep;" % (full_table_name, table)
        qry += sql
        qry += "ALTER TABLE %s ENABLE TRIGGER %s_rep;" % (full_table_name, table)

        try:
            db._exec_sql_and_commit(qry)
            fName = os.path.splitext(f)[0]
            sql = '''INSERT INTO %s("changest") VALUES('%s')''' % (comm_table, fName)
            db._exec_sql_and_commit(sql)
        except DbError, e:
            logger.error('Error when processing file "%s".' % f)
            break

        os.rename(f, os.path.join(dirCommits, f))
        logger.debug('File "%s" processed and removed.' % f)

    job.enable()
    cron.write()

    logger.debug('Stop changesets applying.')
    logger.info('Stop logging.')
    logging.shutdown()
