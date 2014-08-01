#!/usr/bin/env python

import os
import sys
import uuid
import logging
import ConfigParser
import xml.etree.ElementTree as et

logger = logging.getLogger('changeset-query')

if __name__ == '__main__':
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)

    formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    parser = argparse.ArgumentParser()
    parser.add_argument('changes_list', help='changeset list')
    parser.add_argument('level', help='operation level')
    args = parser.parse_args()
    changes_list = args.changes_list
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

    if cfg.has_section('general'):
        uniq_name = cfg.get('general', 'uniq_name')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('path'):
        directory = cfg.get('path', 'changesets')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('database'):
        host = cfg.get('database', 'host')
        port = cfg.getint('database', 'port')
        dbname = cfg.get('database', 'database')
        db_user = cfg.get('database', 'user')
        db_passwd = cfg.get('database', 'password')
        com_table = cfg.get('database', 'com_table')
        com_schema = cfg.get('database', 'com_schema')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    if cfg.has_section('bus'):
        uri = cfg.get('bus', 'uri')
        bus_user = cfg.get('bus', 'user')
        bus_passwd = cfg.get('bus', 'password')
        addr = cfg.get('bus', 'address')
    else:
        logger.critical('Invalid config file.')
        sys.exit(1)

    logger.debug('Start changesets list processing.')

    db = PgDB(host, port, dbname, user, passwd)
    c = db.con.cursor()
    com_table = db._table_name(com_schema, com_table)

    headers = {'content-type': 'text/xml', 'Accept': 'text/xml'}
    auth = (user, passwd)

    action = 'sm://messages/application/gis/geochanges_reg_to_fda' if level == 'fda' else 'sm://messages/application/gis/geochanges_fda_to_reg'

    tree = et.parse(changes_list)
    root = tree.getroot()
    header = root.find('{http://schemas.xmlsoap.org/soap/envelope/}Header')
    sender = header.find('{http://www.w3.org/2005/08/addressing}From')
    peer = header.find('{http://www.w3.org/2005/08/addressing}Address').text
    body = root.find('{http://schemas.xmlsoap.org/soap/envelope/}Body')
    for ch in body.findall('changeset'):
        if ch.text.startswith(uniq_name):
            continue

        sql = 'SELECT count(*) FROM %s WHERE changest = "%s"' % (com_table, ch.text)
        db._exec_sql(c, sql)
        res = c.fetchone()

        if res[0] != 0:
            continue

        msg = '<?xml version="1.0" encoding="UTF-8"?>\n'
        msg += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"\n'
        msg += 'xmlns:wsa="http://www.w3.org/2005/08/addressing"\n'
        msg += 'xmlns:sv="urn:sm:interaction:v0.2">\n'
        msg += '<soap:Header>\n'
        msg += '<wsa:To>%s</wsa:To>\n' % peer
        msg += '<wsa:From><wsa:Address>%s</wsa:Address></wsa:From>\n' % addr
        msg += '<wsa:MessageID>urn:uuid:%s</wsa:MessageID>\n' % uuid.uuid4()
        msg += '<wsa:Action>%s</wsa:Action>\n' % action
        msg += '</soap:Header><soap:Body>\n'
        msg += '<request>getChangeset</request>'
        msg += '<changeset>%s</changeset>' % ch.text
        msg += '</soap:Body></soap:Envelope>'

        r = requests.post(uri, data=msg, headers=headers, auth=auth)
        if r.status_code != 202:
            logger.error('Request failed: %s - %s' % (r.status_code, r.text))

    logger.debug('Stop changesets list processing.')
    logger.info('Stop logging.')
    logging.shutdown()
