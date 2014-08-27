import unittest

import os
import shutil

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

    def test_dump_table_schema(self):
        non_existed_table_name = 'the_table_does_not_exist'
        self.assertFalse(
            self.dumper.dump_table(non_existed_table_name, self.tmp_filename_with_path))

        self.assertTrue(not os.path.isfile(self.tmp_filename_with_path) or
                        os.path.getsize(self.tmp_filename_with_path) == 0)

        # Check we can store dumps
        self._drop_tmp_file()
        tablename = self.dumper.tables[0]
        try:
            self.assertTrue(
                self.dumper.dump_table(tablename, self.tmp_filename_with_path))
            self.assertTrue(os.path.isfile(self.tmp_filename_with_path))
            self.assertTrue(os.path.getsize(self.tmp_filename_with_path) > 0)
        finally:
            self._drop_tmp_file()

        # dump schema:
        schema_filename = self.dumper.dump_schema()
        self.assertTrue(os.path.isfile(schema_filename))
        self.assertTrue(os.path.getsize(schema_filename) > 0)

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




if __name__ == '__main__':
    suite = unittest.makeSuite(NgwServicesTests, 'test')
    runner = unittest.TextTestRunner()
    runner.run(suite)