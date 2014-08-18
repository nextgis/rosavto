#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import subprocess
import datetime
import time
import re
import glob
import shutil

import logging
import ConfigParser


class DumperError(Exception):
    pass

class Dumper():
    def __init__(self, config_name='/etc/pg_replica.conf'):
        """Initialization of Dumper: read the config file, set up internal variables

        :param config_name: The name of the config file
        """

        self.logger = logging.getLogger('dumper')
        self.logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s %(name)s: %(levelname)s: %(message)s', datefmt='%b %d %H:%M:%S')

        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)

        if not os.path.isfile(config_name):
            msg = 'Configuration file "%s" not found.' % config_name
            self.logger.critical(msg)
            raise DumperError(msg)

        config = ConfigParser.ConfigParser()
        config.read(config_name)

        try:
            # Connection info
            self.database = config.get('database', 'database')
            self.host = config.get('database', 'host')
            self.port = config.get('database', 'port')
            self.user = config.get('database', 'user')
            self.password = config.get('database', 'password')

            # Dump options
            self.outdate_interval = config.get('fulldump', 'outdate_interval')  # Hours
            self.outdate_interval = float(self.outdate_interval) * 3600         # Seconds

            self.tables = config.get('fulldump', 'tables_for_dump')
            self.tables = [t.strip() for t in self.tables.split(',')]

            self.max_chapter_size = config.get('fulldump', 'chapter_size')
            self.max_chapter_size = int(self.max_chapter_size)

            ##############################
            # Временно: для проверки работы подсистемы восстановления БД
            ##############################
            self.copy_to_database = config.get('fulldump', 'copy_to_database')

            # Paths
            self.dump_path = config.get('paths', 'dump')
            self.logfile_name = config.get('logging', 'log_file')
        except ConfigParser.NoSectionError as e:
            msg = 'A section does not found in the ' \
                  'configuration file "%s" not found: %s' % (config_name, e.message)
            self.logger.critical(msg)
            raise
        except ConfigParser.NoOptionError as e:
            msg = 'An option does not found in the ' \
                  'configuration file "%s" not found: %s' % (config_name, e.message)
            self.logger.critical(msg)
            raise

        # Add logging into the file:
        ch = logging.FileHandler(self.logfile_name)
        ch.setLevel(logging.DEBUG)
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)

        # pg_dump cant't create directories, so
        # if the dump directory is not created, create it:
        try:
            os.mkdir(self.dump_path)
        except OSError:
            pass    # the directory exists

    def dump_table(self, tablename, filename):
        """Dump table into the file

        :param tablename: The name of the table that has to be stored in the file
        :param filename: The name of the file
        """
        os.putenv('PGPASSWORD', self.password)
        command = self._get_dumper(tablename, filename)

        self.logger.info('Dump of "%s.%s" is starting: %s' % (self.database, tablename, command))

        proc = subprocess.Popen(command, shell=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        (stdoutdata, stderrdata)  = proc.communicate()

        if stderrdata:
            self.logger.critical("The command '%s' returns the error: %s" % (command, stderrdata.strip()))
        else:
            self.logger.info('Dump of "%s.%s" is created' % (self.database, tablename))

    def dump(self, split_files=False, remove_original=False):
        """Dump all tables, specified in the config file (see self.tables)

        :param split_files:  Split dump files into chapters
        :param remove_original: Remove the original dump files after splitting (used if split_files=True)
        :return: list of created dump files
        """

        if remove_original and not split_files:
            msg = 'You mast have a copy of the dump files before removing the ogiginals. Set split_files=True or remove_originals=False.'
            self.logger.error(msg)
            raise DumperError(msg)

        tables = self.tables_for_dump()
        for table in self.tables:
            if table not in tables:
                self.logger.info('Dump of "%s.%s" is skiped: the current dumpfile is not outdated' % (self.database, table))

        dumps = []
        for table in tables:
            filename = self._tablename_to_filename(table)
            dumps.append(filename)
            self.dump_table(table, filename)
            if split_files:
                self.split_file(filename)
                if remove_original:
                    self.logger.info('Remove original dump file: %s', filename)
                    os.unlink(filename)

        return dumps

    def get_file_list(self, prefix):
        """Return list of files that contain chapters of dump file

        :param prefix: The beginning of the file name
        :return: list of the files ordered literally
        """
        return sorted(glob.glob(prefix+".part.*"))

    def join_files(self, prefix, remove_parts=False):
        """Create full dump file from chapters. It's invert operation to self.split_file method.

        :param prefix: The beginning of the file name
        :param remove_parts: boolean value. It indicates to remove or not the chapters after the joining
        """
        chapter_list = self.get_file_list(prefix)
        self.logger.info('Start joining of files %s into one file %s' % (', '.join(chapter_list), prefix))
        with open(prefix, 'wb') as destination:
            for chapter in chapter_list:
                shutil.copyfileobj(open(chapter, 'rb'), destination)
        self.logger.info('File %s is created' % prefix)
        if remove_parts:
            for chapter in chapter_list:
                os.unlink(chapter)
                self.logger.info('Remove file %s', chapter)

    def restore_table(self, filename):
        command = self._get_restorer(filename)
        self.logger.info('Restoring from dump file %s: %s' % (filename, command))

        proc = subprocess.Popen(command, shell=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        (stdoutdata, stderrdata)  = proc.communicate()

        if stderrdata:
            self.logger.error("The command '%s' returns the error: %s" % (command, stderrdata.strip()))
        else:
            self.logger.info('Dump of file %s is restored' % (filename, ))

    def split_file(self, filename, suffix='.part', buffer_size=4*1024):
        """Split file into pieces (chapters) of given size and store them in files

        :param filename: The name of the file that has to be splitted on chapters
        :param suffix: The suffix of the generated filenames of the chapters
        :param buffer_size: Auxiliary value for size of reading buffer (in bytes)
        """
        self.logger.info('Splitting file %s into chapters...' % filename)
        chapter_count = 0
        finished = False
        with open(filename, 'rb') as src:
            while True:
                chapter = open(filename + suffix + '.%04d' % chapter_count, 'wb')
                written = 0
                while written < self.max_chapter_size:
                    byte_count = min(buffer_size, self.max_chapter_size - written)
                    data = src.read(byte_count)
                    chapter.write(data)
                    written += len(data)
                    if len(data) < byte_count:
                        finished = True
                        break
                chapter.close()
                if finished:
                    break
                chapter_count += 1
        self.logger.info('File %s is divided into %s chapters' % (filename, chapter_count+1))

    def tables_for_dump(self):
        """Create list of tables for dump.
        Check dumpfiles, compare their dates with self.outdate_interval

        :return: list of tablenames
        """
        valid_files = []
        for name in os.listdir(self.dump_path):
            if os.path.isfile(os.path.join(self.dump_path, name)):
                if not self._is_file_outdated(name):
                    fileinfo = self._analyze_filename(name)
                    if not fileinfo:    # The file is not dump file
                        continue
                    table = fileinfo['tablename']
                    valid_files.append(table)
        tables_for_dump = [t for t in self.tables if t not in valid_files]
        return tables_for_dump

    def _analyze_filename(self, filename):
        """Inverse operation to _tablename_to_filename method.
        Returns info about the tablename and date of the creation extracted from the filename.

        :param filename: The name of the file
        :return: dict of the 'tablename', 'time' and their values. If the file name does not
                 match the pattern, return None
        """

        # filename mast be smth like 'postgis_connection_20140813144846.fullcopy'
        pattern = r".+_[0-9]{14}\.fullcopy$"
        if not re.match(pattern, filename):
            return None

        dateval = filename[-23:-9]
        date = time.strptime(dateval, '%Y%m%d%H%M%S')
        stump = time.mktime(date)

        result = dict(
            tablename = filename[0:-24],
            time = stump
        )
        return result

    def _get_dumper(self, tablename, filename, compression_level=9):
        """Return string representation of dump command. Use pg_dump as the dumping machine.
        see `pg_dump --help` for details of the parameters

        :param tablename: The name of the table that has to be stored
        :param filename: The name of the dump file
        :param compression_level: compression level
        :return: string of the dump command
        """
        filename = os.path.join(self.dump_path, filename)
        dumper = """pg_dump --clean --create --username %s --host %s --port %s --table %s --compress 0 --file %s --format custom --blobs %s  """ % \
                      (self.user, self.host, self.port, tablename, #compression_level,
                       filename, self.database)

        return dumper

    def _is_file_outdated(self, filename):
        """Check is dump of a table oudtated or not

        :param filename: The name of the file
        :return: boolean value
        """
        fileinfo = self._analyze_filename(filename)
        if not fileinfo:   # The file is not dump file
            return False
        stump = fileinfo['time']
        current_time = time.time()
        return (current_time - stump > self.outdate_interval)

    def _get_restorer(self, filename):
        """Return string representation of dump restoring command. Use pg_restore.
        see `pg_restore --help` for details of the parameters

        :param filename: The name of the dump file
        :return: string of the dump command
        """
        filename = os.path.join(self.dump_path, filename)
        restorer = """pg_restore --clean  --create --host %s --port %s --username %s --dbname %s % s """ % \
                   (self.host, self.port, self.user, self.copy_to_database, filename)
        return restorer

    def _tablename_to_filename(self, tablename):
        """Create filename for dump file.
        :param tablename: Name of the table that has to be stored in the file
        :return:  string of filename
        """
        ts = time.time()
        ts = datetime.datetime.fromtimestamp(ts).strftime('%Y%m%d%H%M%S')
        filename = tablename + '_' + ts + '.fullcopy'
        return os.path.join(self.dump_path, filename)


if __name__ == "__main__":
    try:
        dumper = Dumper(config_name='pg_replica.conf')
        dumps = dumper.dump(split_files=False, remove_original=False)
    except:
        raise

    for dump_file in dumps:
        #dumper.join_files(dump_file, remove_parts=True)
        dumper.restore_table(dump_file)

