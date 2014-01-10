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
import logging

import psycopg2
import psycopg2.extensions


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
        if not self._create_replog_table():
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
                                 table_name, operation, stamp, fid)
                             VALUES('%s', 2, current_timestamp, NEW.ogc_fid);
                             RETURN NEW;
                         ELSIF (TG_OP = 'UPDATE') THEN
                             INSERT INTO %s(
                                 table_name, operation, stamp, fid)
                             VALUES('%s', 3, current_timestamp, OLD.ogc_fid);
                             RETURN NEW;
                         ELSIF (TG_OP = 'DELETE') THEN
                             INSERT INTO %s(
                                 table_name, operation, stamp, fid)
                             VALUES('%s', 1, current_timestamp, OLD.ogc_fid);
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

    def _create_replog_table(self):
        schema = self.rep_schema
        table = self.rep_table
        table_name = self._table_name(schema, table)

        tables = self.list_geotables(schema)
        table_exists = len([t for t in tables if t[0] == table]) > 0
        if table_exists:
            self.logger.debug(
                '"%s" table already exists. Skipping creation.' % table_name)
            return True

        sql = u'''CREATE TABLE %s (
                     table_name character varying(255) NOT NULL,
                     operation smallint NOT NULL,
                     stamp timestamp with time zone NOT NULL DEFAULT
                         ('now'::text)::timestamp(2) with time zone,
                     fid integer NOT NULL)
              WITH (OIDS=FALSE);
              ALTER TABLE %s OWNER TO %s;
              COMMENT ON COLUMN %s.operation IS
                  '1 - DELETE, 2 - INSERT, 3 - UPDATE';
              ''' % (table_name, table_name, self.user, table_name)

        self._exec_sql_and_commit(sql)
        self.logger.info('Created table "%s".' % table_name)
        return True

    def _exec_sql(self, cursor, sql):
        try:
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
