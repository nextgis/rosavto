import os
import sys
import datetime

VERSION_BUILD_GIS = sys.argv[1]
server_level = sys.argv[2]

if (server_level != 'tsc') and (server_level != 'fda'):
    raise AttributeError('Unknown type of server "' + server_level + '"')

mnt_dir_path = os.path.expanduser("~") + '/mnt/'
if not os.path.exists(mnt_dir_path):
    raise EnvironmentError('Directory "mnt" by path "' + mnt_dir_path + '" is not found.')

version_dir_path = mnt_dir_path + VERSION_BUILD_GIS
print(version_dir_path)
if not os.path.exists(version_dir_path):
    os.makedirs(version_dir_path)
    print 'Directory for selected version if build was created.'

backup_file_name = 'rosavto-' + server_level + '.gis(' + VERSION_BUILD_GIS + ')' + \
                   datetime.datetime.now().strftime('%d.%m.%Y:%H.%M.%S') + '.backup'

os.system('pg_dump > ' + os.path.join(version_dir_path, backup_file_name))