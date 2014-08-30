#!/usr/bin/env python
# -*- coding: utf-8 -*-


import unittest

import os
import shutil
import random
import string

from src.pg_replica.dumper import Dumper, DumperError


CONFIG_FILE = 'data/pg_replica.conf'
LOGFILE = 'data/tmp_log'
DUMPDIR = 'data/dumps'


class NgwServicesTests(unittest.TestCase):
    def setUp(self):
        self.dumper = Dumper(CONFIG_FILE)
        # reset paths
        self.dumper._set_logfile_name(LOGFILE)
        self.dumper._set_dump_path(DUMPDIR)

        self.tmp_filename = 'file_for_store_temp_data'
        self.tmp_path = self.dumper.dump_path
        self.tmp_filename_with_path = \
            os.path.join(self.tmp_path, self.tmp_filename)

    def tearDown(self):
        """Remove temp files
        :return:
        """
        self._drop_tmp_file()
        os.unlink(self.dumper.logfile_name)
        shutil.rmtree(self.dumper.dump_path)

    def _drop_tmp_file(self):
        if os.path.isfile(self.tmp_filename_with_path):
            os.unlink(self.tmp_filename_with_path)

    def _create_rnd_file(self):
        # Create file and fill it by random numbers
        N = 10000
        data = ''.join(
            random.choice(string.ascii_uppercase + string.digits) for _ in range(N)
        )
        with open(self.tmp_filename_with_path, 'w') as f:
            f.write(data)

        return data

    def test_init(self):
        # check directory for dumps is created
        self.assertTrue(os.path.isdir(self.dumper.dump_path))

        # check crucial parameters
        self.assertTrue(len(self.dumper.tables) > 0)

    def test_create_dumpfile(self):
        non_existed_table_name = 'the_table_does_not_exist'
        self.assertFalse(
            self.dumper._create_dumpfile(non_existed_table_name, self.tmp_filename_with_path))

        self.assertTrue(not os.path.isfile(self.tmp_filename_with_path) or
                        os.path.getsize(self.tmp_filename_with_path) == 0)

        # Check we can store dumps
        self._drop_tmp_file()
        tablename = self.dumper.tables[0]
        try:
            self.assertTrue(
                self.dumper._create_dumpfile(tablename, self.tmp_filename_with_path))
            self.assertTrue(os.path.isfile(self.tmp_filename_with_path))
            self.assertTrue(os.path.getsize(self.tmp_filename_with_path) > 0)
        finally:
            self._drop_tmp_file()

    def test_get_dumper(self):
        # Username and other parameters are stored in CONFIG_FILE
        # Changes of the file must be propagated in the test

        expected = """pg_dump  --host=192.168.250.101 --username=voltron --dbname=rosavto --file=DDD --clean --blobs --table=AAA --format=plain"""
        received = self.dumper._get_dumper('AAA', 'DDD')
        self.assertEquals(expected.strip(), received.strip())

    def test_get_file_list(self):
        # create several files and try to find them
        names = ['f1', 'f11', 'f2', 'f3', 'f31']
        names = [os.path.join(self.tmp_path, f) for f in names]
        try:
            for filename in names:
                open(filename, 'w').close()

            found = self.dumper.get_file_list('f')
            self.assertEquals(names, found)

            found = self.dumper.get_file_list('f1')
            self.assertEquals(names[:2], found)

            found = self.dumper.get_file_list('f2')
            self.assertEquals([names[2]], found)
        finally:
            for filename in names:
                os.unlink(filename)

    def test_base64_coding(self):
        """Test for _file_to_base64 and base64_to_file"""

        data = self.dumper._file_to_base64(CONFIG_FILE)
        self.dumper.base64_to_file(data, self.tmp_filename_with_path)
        with open(self.tmp_filename_with_path, 'r') as f:
            received = f.readlines()
        with open(CONFIG_FILE, 'r') as f:
            expected = f.readlines()
        self._drop_tmp_file()

        self.assertEquals(expected, received)

    def test_split_join(self):
        """Test for _split_file and join_files"""

        expected = self._create_rnd_file()

        limit = 203      # Маленькое число, чтобы наплодить много файликов
        self.dumper.max_chapter_size = limit
        files = self.dumper._split_file(self.tmp_filename_with_path)
        self._drop_tmp_file()

        # Check the file is sliced,
        self.assertTrue(len(files) > 0)
        for f in files[:-1]:
            self.assertTrue(os.path.isfile(f))
            self.assertEqual(os.path.getsize(f), limit)
        self.assertLessEqual(os.path.getsize(files[-1]), limit)

        # Check split/join didn't corrupt the data
        self.dumper.join_files(self.tmp_filename)
        with open(self.tmp_filename_with_path, 'r') as f:
            received = f.read()
        self.assertEquals(expected, received)

    def test_compressing(self):

        expected = self._create_rnd_file()

        self.dumper._compressfile(self.tmp_filename_with_path)
        self.dumper._decompressfile(self.tmp_filename_with_path)

        with open(self.tmp_filename_with_path, 'r') as f:
            received = f.read()

        self.assertEquals(expected, received)


    # Не покрытые тестами функции. Написать тесты.
    def dump_table(self):   pass
    def restore_table(self): pass
    def _get_restorer(self): pass
    def _tablename_to_filename(self): pass

if __name__ == '__main__':
    suite = unittest.makeSuite(NgwServicesTests, 'test')
    runner = unittest.TextTestRunner()
    runner.run(suite)