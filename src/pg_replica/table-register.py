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
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)

    formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    parser = argparse.ArgumentParser()
    parser.add_argument('table_name', help='table to be registered.')
    args = parser.parse_args()
    table_name = args.table_name

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
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start table registration.')

    db = PgDB(host, port, dbname, user, passwd)
    c = db.con.cursor()

    tname = db._table_name(rep_schema, rep_table)

    if not db._table_exists(rep_schema, rep_table):
        sql = '''CREATE TABLE %s (
                     table_name character varying(255) NOT NULL,
                     operation smallint NOT NULL,
                     stamp timestamp with time zone NOT NULL DEFAULT
                         ('now'::text)::timestamp(2) with time zone,
                     uid CHARACTER VARYING(50) NOT NULL)
              WITH (OIDS=FALSE);
              ALTER TABLE %s OWNER TO %s;
              COMMENT ON COLUMN %s.operation IS
                  '1 - DELETE, 2 - INSERT, 3 - UPDATE';''' % (tname, tname, user, tname)

        db._exec_sql_and_commit(sql)
        logger.info('Created table "%s".' % tname)

    schema = table_name.split('.')[0]
    table = table_name.split('.')[1]

    table_name = db._table_name(schema, table)
    repl_table = db._table_name(rep_schema, rep_table)

    fields = db.get_table_fields(table, schema)
    has_uuid = len([f for f in fields if f[1] == 'uniq_uid' and f[2] == 'varchar']) > 0
    if not has_uuid:
        logger.error('Can not register table "%s" because it has no "uniq_uid" field of type "varchar".' % table_name)
        sys.exit(1)

    proc_name = table + '_rep'

    sql = '''CREATE OR REPLACE FUNCTION %s() RETURNS trigger AS $%s$
                 BEGIN
                     IF (TG_OP = 'INSERT') THEN
                         INSERT INTO %s(
                             table_name, operation, stamp, uid)
                         VALUES('%s', 2, current_timestamp, NEW.uniq_uid);
                         RETURN NEW;
                     ELSIF (TG_OP = 'UPDATE') THEN
                         INSERT INTO %s(
                             table_name, operation, stamp, uid)
                         VALUES('%s', 3, current_timestamp, OLD.uniq_uid);
                         RETURN NEW;
                     ELSIF (TG_OP = 'DELETE') THEN
                         INSERT INTO %s(
                             table_name, operation, stamp, uid)
                         VALUES('%s', 1, current_timestamp, OLD.uniq_uid);
                         RETURN NEW;
                     END IF;
                 END;
             $%s$ LANGUAGE plpgsql;
             CREATE TRIGGER %s AFTER INSERT OR UPDATE OR DELETE
                 ON %s FOR EACH ROW EXECUTE PROCEDURE %s();
          ''' % (proc_name, proc_name, repl_table, table_name, repl_table, table_name, repl_table, table_name, proc_name, proc_name, table_name, proc_name)
    db._exec_sql_and_commit(sql)

    logger.debug('Stop table registration.')
    logger.info('Stop logging.')
    logging.shutdown()
