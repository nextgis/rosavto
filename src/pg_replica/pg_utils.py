# -*- coding: utf-8 -*-

"""
***************************************************************************
    pg_utils.py
    ---------------------
    Date                 : January 2014
    Copyright            : (C) 2014 by NextGIS
    Email                : info at nextgis dot org
***************************************************************************
*                                                                         *
*   This program is free software; you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation; either version 2 of the License, or     *
*   (at your option) any later version.                                   *
*                                                                         *
***************************************************************************
"""

__author__ = 'NextGIS'
__date__ = 'January 2014'
__copyright__ = '(C) 2014, NextGIS'

# This will get replaced with a git SHA1 when you do a git archive

__revision__ = '$Format:%H$'

import re
import os
import glob
import logging

import psycopg2
import psycopg2.extensions

import requests


psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)


class DbError(Exception):

    def __init__(self, message, query=None):
        self.message = unicode(message, 'utf-8')
        self.query = (unicode(query, 'utf-8') if query is not None else None)

    def __str__(self):
        return 'MESSAGE: %s\nQUERY: %s' % (self.message, self.query)


class PgDB:

    rep_schema = 'public'
    rep_table = 'rep_log'

    def __init__(self, host=None, port=None, dbname=None, user=None,
                 passwd=None):

        self.logger = logging.getLogger('pg_replica')
        self.re_ident_ok = re.compile(r"^\w+$")
        self.re_is_integer = re.compile('int[0-9]')

        self.host = host
        self.port = port
        self.dbname = dbname
        self.user = user
        self.passwd = passwd

        if self.dbname == '' or self.dbname is None:
            self.dbname = self.user

        try:
            self.con = psycopg2.connect(self.con_info())
        except psycopg2.OperationalError, e:
            self.logger.debug(e.message)
            raise DbError(e.message)

        self.has_postgis = self.check_postgis()
        self.logger.debug('PostGIS enabled: %s' % self.has_postgis)

    def con_info(self):
        con_str = ''
        if self.host:
            con_str += "host='%s' " % self.host
        if self.port:
            con_str += 'port=%d ' % self.port
        if self.dbname:
            con_str += "dbname='%s' " % self.dbname
        if self.user:
            con_str += "user='%s' " % self.user
        if self.passwd:
            con_str += "password='%s' " % self.passwd
        return con_str

    def check_postgis(self):
        c = self.con.cursor()
        self._exec_sql(c,
            "SELECT COUNT(*) FROM pg_proc WHERE proname = 'postgis_version'")
        return c.fetchone()[0] > 0

    def list_geotables(self, schema=None):
        c = self.con.cursor()

        if schema:
            schema_where = " AND nspname = '%s' " % self._quote_str(schema)
        else:
            schema_where = \
                " AND (nspname != 'information_schema' AND nspname !~ 'pg_') "

        if not self.has_postgis:
            sql = '''SELECT pg_class.relname, pg_namespace.nspname,
                            pg_class.relkind, pg_get_userbyid(relowner),
                            reltuples, relpages, NULL, NULL, NULL, NULL
                  FROM pg_class
                  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                  WHERE pg_class.relkind IN ('v', 'r') ''' \
                  + schema_where + 'ORDER BY nspname, relname'
        else:
            sql = '''SELECT pg_class.relname, pg_namespace.nspname,
                            pg_class.relkind, pg_get_userbyid(relowner),
                            reltuples, relpages, pg_attribute.attname,
                            pg_attribute.atttypid::regtype, NULL, NULL
                  FROM pg_class
                  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                  LEFT OUTER JOIN pg_attribute ON
                      pg_attribute.attrelid = pg_class.oid AND
                      (pg_attribute.atttypid = 'geometry'::regtype
                      OR pg_attribute.atttypid IN
                          (SELECT oid FROM pg_type
                           WHERE typbasetype='geometry'::regtype))
                  WHERE pg_class.relkind IN ('v', 'r') ''' \
                  + schema_where + 'ORDER BY nspname, relname, attname'

        self._exec_sql(c, sql)
        items = c.fetchall()

        if self.has_postgis:
            sql = '''SELECT relname, nspname, relkind,
                            pg_get_userbyid(relowner), reltuples, relpages,
                            geometry_columns.f_geometry_column,
                            geometry_columns.type,
                            geometry_columns.coord_dimension,
                            geometry_columns.srid
                  FROM pg_class
                  JOIN pg_namespace ON relnamespace=pg_namespace.oid
                  LEFT OUTER JOIN geometry_columns ON
                      relname=f_table_name AND nspname=f_table_schema
                  WHERE (relkind = 'r' or relkind='v') ''' \
                  + schema_where + 'ORDER BY nspname, relname, \
                  f_geometry_column'
            self._exec_sql(c, sql)

            for (i, geo_item) in enumerate(c.fetchall()):
                if geo_item[7]:
                    items[i] = geo_item

        return items

    def get_table_fields(self, table, schema=None):
        c = self.con.cursor()
        schema_where = (" AND nspname='%s' "
                        % self._quote_str(schema) if schema is not None else ''
                       )
        sql = '''SELECT a.attnum AS ordinal_position,
                        a.attname AS column_name,
                        t.typname AS data_type,
                        a.attlen AS char_max_len,
                        a.atttypmod AS modifier,
                        a.attnotnull AS notnull,
                        a.atthasdef AS hasdefault,
                        adef.adsrc AS default_value
              FROM pg_class c
              JOIN pg_attribute a ON a.attrelid = c.oid
              JOIN pg_type t ON a.atttypid = t.oid
              JOIN pg_namespace nsp ON c.relnamespace = nsp.oid
              LEFT JOIN pg_attrdef adef ON adef.adrelid = a.attrelid
                  AND adef.adnum = a.attnum
              WHERE
                  c.relname = '%s' %s AND
                  a.attnum > 0
              ORDER BY a.attnum''' % (self._quote_str(table), schema_where)

        self._exec_sql(c, sql)
        attrs = c.fetchall()
        return attrs


    def register_table(self, schema, table):
        if not self.create_replog_table():
            return False

        table_name = self._table_name(schema, table)
        repl_table = self._table_name(self.rep_schema, self.rep_table)

        fields = self.get_table_fields(table, schema)
        has_uuid = len(
            [f for f in fields if f[1] == 'uniq_uid' and f[2] == 'uuid']) > 0
        if not has_uuid:
            self.logger.error('Can not register table "%s" because it has '
                              'no "uniq_id" field of type "uuid".')
            return False

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
              ''' % (proc_name, proc_name,
                     repl_table, table_name,
                     repl_table, table_name,
                     repl_table, table_name,
                     proc_name,
                     proc_name,
                     table_name, proc_name)
        self._exec_sql_and_commit(sql)
        return True

    def prepare_changes(self, timestamp):
        records = self.list_changes(timestamp)

        data = dict()
        for table, uid in records:
            if table not in data:
                data[table] = [uid]
            else:
                data[table].append(uid)

        repl_table = self._table_name(self.rep_schema, self.rep_table)

        c = self.con.cursor()

        for full_table_name, uids in data.iteritems():
            schema = full_table_name.split('.')[0]
            table = full_table_name.split('.')[1]

            fields = self.get_table_fields(table, schema)
            plain_field_list = []
            select_field_list = []
            for count, field in enumerate(fields):
                field_name = field[1]
                field_type = field[2]
                if field_name == 'ogc_fid':
                    continue
                if field_type in ['geometry']:
                    select_field_list.append(
                        "encode(ST_AsEWKB(%s), 'hex')" % field_name)
                    plain_field_list.append(field_name)
                    geom_name = field_name
                    continue
                plain_field_list.append(field_name)
                select_field_list.append(field_name)

            geom_index = plain_field_list.index(geom_name)

            for uid in uids:
                sql = '''SELECT *
                         FROM %s
                         WHERE uid='%s'
                         ORDER BY stamp DESC
                         LIMIT 1;
                      ''' % (repl_table, uid)
                self._exec_sql(c, sql)
                result = c.fetchone()

                operation = result[1]

                if operation != 1:
                    sql = "SELECT %s FROM %s WHERE uniq_uid='%s';" % (
                        ', '.join(select_field_list), full_table_name, uid)
                    self._exec_sql(c, sql)
                    values = c.fetchone()

                    value_list = []
                    for (count, value) in enumerate(values):
                        if count == geom_index:
                            value_list.append(
                                "ST_GeomFromEWKB(decode('%s', 'hex'))" % value)
                            continue
                        value_list.append(value)

                    values = self.populate_values(
                        fields, value_list, plain_field_list)

                s = ''
                if operation == 1:
                    self.logger.debug('Found DELETE operation.')

                    s = "DELETE FROM %s WHERE uniq_uid='%s'" % (
                        full_table_name, uid)
                    self.logger.debug(
                        'Replication SQL: %s' % ' '.join(s.split()))
                elif operation == 2:
                    self.logger.debug('Found INSERT operation.')

                    s = u'INSERT INTO %s(%s) VALUES(%s);' % (
                        full_table_name, ', '.join(plain_field_list), values)
                    self.logger.debug(
                        'Replication SQL: %s' % ' '.join(s.split()))
                elif operation == 3:
                    self.logger.debug('Found UPDATE operation.')

                    s = u'''UPDATE %s
                           SET (%s) = (%s)
                           WHERE uniq_uid='%s';
                        ''' % (full_table_name,
                               ', '.join(plain_field_list),
                               values,
                               uid)
                    self.logger.debug(
                        'Replication SQL: %s' % ' '.join(s.split()))

        self.clear_old_records(timestamp)

    def apply_changes(self, directory):
        file_list = sorted(glob.glob(os.path.join(directory, '*.sql')))
        self.logger.debug('Found %s changesets' % len(file_list))

        for file_name in file_list:
            self.logger.debug('Processing file: "%s"' % file_name)
            with open(file_name) as f:
                sql = f.readlines()
                self._exec_sql_and_commit(sql)
            os.remove(file_name)
            self.logger.debug('File "%s" processed and removed' % file_name)

    def list_changes(self, timestamp):
        c = self.con.cursor()

        table_name = self._table_name(self.rep_schema, self.rep_table)
        sql = '''SELECT DISTINCT table_name, uid
                 FROM %s
                 WHERE stamp < '%s'::timestamp with time zone
                 ORDER BY table_name;
              ''' % (table_name, timestamp)

        self._exec_sql(c, sql)
        attrs = c.fetchall()
        return attrs

    def clear_old_records(self, timestamp):
        table_name = self._table_name(self.rep_schema, self.rep_table)
        sql = 'DELETE FROM %s WHERE stamp < %s;' % (table_name, timestamp)

        self._exec_sql_and_commit(sql)
        self.logger.info('Old records removed.')
        return True

    def create_replog_table(self):
        schema = self.rep_schema
        table = self.rep_table
        table_name = self._table_name(schema, table)

        tables = self.list_geotables(schema)
        table_exists = len([t for t in tables if t[0] == table]) > 0
        if table_exists:
            self.logger.debug(
                '"%s" table already exists. Skipping creation.' % table_name)
            return True

        sql = '''CREATE TABLE %s (
                     table_name character varying(255) NOT NULL,
                     operation smallint NOT NULL,
                     stamp timestamp with time zone NOT NULL DEFAULT
                         ('now'::text)::timestamp(2) with time zone,
                     uid uuid NOT NULL)
              WITH (OIDS=FALSE);
              ALTER TABLE %s OWNER TO %s;
              COMMENT ON COLUMN %s.operation IS
                  '1 - DELETE, 2 - INSERT, 3 - UPDATE';
              ''' % (table_name, table_name, self.user, table_name)

        self._exec_sql_and_commit(sql)
        self.logger.info('Created table "%s".' % table_name)
        return True

    def populate_values(self, fields, values, field_list):
        out = u''
        for count, field_name in enumerate(field_list):
            field_defn = [f for f in fields if f[1] == field_name][0]
            field_type = field_defn[2]
            value = values[count]

            if field_type in ['text', 'varchar']:
                if value is not None:
                    out += u"'%s', " % value
                else:
                    out += u'NULL, '
            elif field_type == 'bool':
                if value is not None:
                    out += u'%s, ' % value
                else:
                    out += u'NULL, '
            elif field_type == 'uuid':
                if value is not None:
                    out += u"'%s', " % value
                else:
                    out += u'NULL, '
            elif self.re_is_integer.match(field_type) is not None:
                if value is not None:
                    out += '%s, ' % value
                else:
                    out += 'NULL, '
            elif field_type in ['numeric']:
                if value is not None:
                    out += u'%s, ' % value
                else:
                    out += u'NULL, '
            elif field_type in ['timestamp', 'timestamptz', 'date', 'time',
                                'interval']:
                if value is not None:
                    out += u"'%s', " % value
                else:
                    out += u'NULL, '
            elif field_type in ['geometry']:
                if value is not None:
                    out += u'%s, ' % value
                else:
                    out += u'NULL, '

        out = out[:-2]
        return out

    def _exec_sql(self, cursor, sql):
        try:
            self.logger.debug('Execute query: "%s"' % ' '.join(sql.split()))
            cursor.execute(sql)
        except psycopg2.Error, e:
            raise DbError(e.message, e.cursor.query)

    def _exec_sql_and_commit(self, sql):
        try:
            c = self.con.cursor()
            self._exec_sql(c, sql)
            self.con.commit()
        except DbError, e:
            self.logger.debug(e.message)
            self.con.rollback()
            raise

    def _quote(self, identifier):
        identifier = unicode(identifier)

        if self.re_ident_ok.match(identifier) is not None:
            return identifier

        return u'"%s"' % identifier.replace('"', '""')

    def _quote_str(self, txt):
        txt = unicode(txt)
        return txt.replace("'", "''")

    def _table_name(self, schema, table):
        if not schema:
            return self._quote(table)
        else:
            return u'%s.%s' % (self._quote(schema), self._quote(table))
