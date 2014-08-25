# -*- coding: utf-8 -*-

import re
import os
import sys
import glob
import uuid
import base64
import codecs
import datetime
import logging

import psycopg2
import psycopg2.extensions

psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)


logger = logging.getLogger('pg_replica')


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
        self.re_is_float = re.compile('float[0-9]')

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

    def _table_exists(self, schema, table):
        table_name = self._table_name(schema, table)

        tables = self.list_geotables(schema)
        if len([t for t in tables if t[0] == table]) > 0:
            self.logger.debug('Found "%s" table.' % table_name)
            return True
        else:
            self.logger.debug('Table "%s" not found.' % table_name)
            return False

    def _populate_values(self, fields, values, field_list):
        out = u''
        for count, field_name in enumerate(field_list):
            field_defn = [f for f in fields if f[1] == field_name][0]
            field_type = field_defn[2]
            value = values[count]

            if field_type in ['text', 'varchar']:
                if value is not None:
                    out += u"'%s', " % self._quote_str(value)
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
            elif self.re_is_integer.match(field_type) is not None or \
                    self.re_is_float.match(field_type) is not None:
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

    def _quote_field_list(self, field_list):
        quoted_fields = []
        for field in field_list:
            if field.startswith('encode') or field.startswith('ST_GeomFrom'):
                quoted_fields.append(field)
                continue
            quoted_fields.append('"%s"' % field)
        return quoted_fields

    def _table_name(self, schema, table):
        if not schema:
            return self._quote(table)
        else:
            return u'%s.%s' % (self._quote(schema), self._quote(table))
