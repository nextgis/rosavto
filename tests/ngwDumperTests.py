#!/usr/bin/env python
# -*- coding: utf-8 -*-

import unittest

import os
import shutil
import random
import string

from src.pg_replica.dumper import Dumper, DumperError

CONFIG_FILE = 'data/pg_replica.conf'


class NgwServicesTests(unittest.TestCase):
    def setUp(self):
        self.dumper = Dumper(CONFIG_FILE)
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

    def test_dump(self):
        current_files = set(
            [f for f in os.listdir(self.tmp_path)
                    if os.isfile(os.path.join(self.tmp_path, f))]
        )
        self.dumper.dump()
        all_files = set(
            [f for f in os.listdir(self.tmp_path)
                    if os.path.isfile(os.path.join(self.tmp_path, f))]
        )

        new_files = all_files - current_files
        self.assertTrue(len(new_files) > 0)     # Dumps are created
        for filename in new_files:
            full_name = os.path.join(self.tmp_path, filename)
            self.assertTrue(os.path.getsize(full_name) > 0)      # The dump is not empty

        self.assertRaises(DumperError, self.dumper.dump,
                          split_files=False, remove_original=True)

    def test_get_dumper(self):
        # Username and other parameters are stored in CONFIG_FILE
        # Changes of the file must be propagated in the test

        expected = """pg_dump --username=klsvd --host=192.168.250.106 --port=5432 --table=AAA --compress=0 --file=DDD --format=custom --blobs rosavto"""
        received = self.dumper._get_dumper('AAA', 'DDD', schema_only=False)
        self.assertEquals(expected.strip(), received.strip())

        expected = """pg_dump --clean --schema-only --username=klsvd --host=192.168.250.106 --port=5432 --compress=0 --file=DDD --format=plain rosavto"""
        received = self.dumper._get_dumper(None, 'DDD', schema_only=True)
        self.assertEquals(expected.strip(), received.strip())

        self.assertRaises(DumperError, self.dumper._get_dumper, tablename='A', filename='B', schema_only=True)

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
        """Test for _file_to_base64 and _base64_to_file"""

        data = self.dumper._file_to_base64(CONFIG_FILE)
        self.dumper._base64_to_file(data, self.tmp_filename_with_path)
        with open(self.tmp_filename_with_path, 'r') as f:
            received = f.readlines()
        with open(CONFIG_FILE, 'r') as f:
            expected = f.readlines()
        self._drop_tmp_file()

        self.assertEquals(expected, received)

    def test_split_join(self):
        """Test for _split_file and _join_files"""

        # Create file and fill it by random numbers
        N = 10000
        data = ''.join(
            random.choice(string.ascii_uppercase + string.digits) for _ in range(N)
        )
        with open(self.tmp_filename_with_path, 'w') as f:
            f.write(data)

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
        self.dumper._join_files(self.tmp_filename)
        with open(self.tmp_filename_with_path, 'r') as f:
            received = f.read()
        self.assertEquals(data, received)

    # Не покрытые тестами функции. Написать тесты.
    def get_outdated_tables(self): pass
    def restore_table(self): pass
    def restore(self): pass
    def _analyze_filename(self): pass
    def _is_file_outdated(self): pass
    def _get_restorer(self): pass
    def _tablename_to_filename(self): pass

if __name__ == '__main__':
    suite = unittest.makeSuite(NgwServicesTests, 'test')
    runner = unittest.TextTestRunner()
    runner.run(suite)