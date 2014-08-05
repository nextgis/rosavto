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

logger = logging.getLogger('changeset-gen')
pid_file = 'changeset-gen.pid'

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

    if cfg.has_section('general'):
        uniq_name = cfg.get('general', 'uniq_name')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('database'):
        host = cfg.get('database', 'host')
        port = cfg.getint('database', 'port')
        dbname = cfg.get('database', 'database')
        user = cfg.get('database', 'user')
        passwd = cfg.get('database', 'password')
        rep_table = cfg.get('database', 'rep_table')
        rep_schema = cfg.get('database', 'rep_schema')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('path'):
        directory = cfg.get('path', 'commits')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start changesets generation.')

    timestamp = datetime.datetime.now().isoformat()
    db = PgDB(host, port, dbname, user, passwd)
    c = db.con.cursor()

    repl_table = db._table_name(rep_schema, rep_table)
    sql = "SELECT DISTINCT table_name, uid FROM %s WHERE stamp < '%s'::timestamp with time zone ORDER BY table_name;" % (repl_table, timestamp)
    db._exec_sql(c, sql)
    records = c.fetchall()

    data = dict()
    for table, uid in records:
        if table not in data:
            data[table] = [uid]
        else:
            data[table].append(uid)

    for full_table_name, uids in data.iteritems():
        schema = full_table_name.split('.')[0]
        table = full_table_name.split('.')[1]

        fields = db.get_table_fields(table, schema)
        plain_field_list = []
        select_field_list = []
        for count, field in enumerate(fields):
            field_name = field[1]
            field_type = field[2]
            if field_name == 'ogc_fid':
                continue
            if field_type in ['geometry']:
                select_field_list.append("encode(ST_AsEWKB(%s), 'hex')" % field_name)
                plain_field_list.append(field_name)
                geom_name = field_name
                continue
            plain_field_list.append(field_name)
            select_field_list.append(field_name)

        geom_index = plain_field_list.index(geom_name)

        if not os.path.exists(directory):
            os.makedirs(directory)

        for uid in uids:
            sql = "SELECT * FROM %s WHERE uid='%s' ORDER BY stamp DESC LIMIT 1;" % (repl_table, uid)
            db._exec_sql(c, sql)
            result = c.fetchone()

            operation = result[1]

            if operation != 1:
                sql = "SELECT %s FROM %s WHERE uniq_uid='%s';" % (', '.join(db._quote_field_list(select_field_list)), full_table_name, uid)
                db._exec_sql(c, sql)
                values = c.fetchone()

                value_list = []
                for (count, value) in enumerate(values):
                    if count == geom_index:
                        value_list.append("ST_GeomFromEWKB(decode('%s', 'hex'))" % value)
                        continue
                    value_list.append(value)

                values = db.populate_values(
                    fields, value_list, plain_field_list)

            if operation == 1:
                self.logger.debug('Found DELETE operation.')
                sql = "DELETE FROM %s WHERE uniq_uid='%s';" % (full_table_name, uid)
                self.logger.debug('Replication SQL: %s' % ' '.join(sql.split()))
            elif operation == 2:
                self.logger.debug('Found INSERT operation.')
                sql = 'INSERT INTO %s(%s) VALUES(%s);' % (full_table_name, ', '.join(self._quote_field_list(plain_field_list)), values)
                self.logger.debug('Replication SQL: %s' % ' '.join(sql.split()))
            elif operation == 3:
                self.logger.debug('Found UPDATE operation.')
                sql = "UPDATE %s SET (%s) = (%s) WHERE uniq_uid='%s';" % (full_table_name, ', '.join(self._quote_field_list(plain_field_list)), values, uid)
                self.logger.debug('Replication SQL: %s' % ' '.join(sql.split()))

            encoded_table = base64.urlsafe_b64encode(full_table_name)
            sql = ' '.join(sql.split()).encode('utf-8')
            encoded_sql = base64.urlsafe_b64encode(sql)

            cfg = ConfigParser.SafeConfigParser()
            cfg.add_section('changeset')
            cfg.set('changeset', 'tbl', encoded_table)
            cfg.set('changeset', 'sql', encoded_sql)

            ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
            with codecs.open(os.path.join(directory, uniq_name + '_' + ts + '.changeset'), 'wb', 'utf-8') as f:
                cfg.write(f)

    sql = "DELETE FROM %s WHERE stamp < '%s'::timestamp with time zone;" % (repl_table, timestamp)
    db._exec_sql_and_commit(sql)
    logger.info('Old records removed.')
    logger.debug('Stop changesets generation.')
    logger.info('Stop logging.')
    logging.shutdown()
