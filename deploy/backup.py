import os
import sys
import datetime
import subprocess

VERSION_BUILD_GIS = sys.argv[1]
server_level = sys.argv[2]

if (server_level != 'tsc') and (server_level != 'fda'):
    raise AttributeError('Unknown type of server "' + server_level + '"')

mnt_dir_path = os.path.expanduser("~") + '/mnt/'
if not os.path.exists(mnt_dir_path):
    raise EnvironmentError('Directory "mnt" by path "' + mnt_dir_path + '" is not found.')

version_dir_path = mnt_dir_path + VERSION_BUILD_GIS

if not os.path.exists(version_dir_path):
    os.makedirs(version_dir_path)
    print 'Directory for selected version if build was created.'

backup_file_name = 'rosavto-' + server_level + '.gis(' + VERSION_BUILD_GIS + ')' + \
                   datetime.datetime.now().strftime('%d.%m.%Y:%H.%M.%S') + '.backup'

print os.path.join(version_dir_path, backup_file_name)

cmd = ['pg_dumpall -c -O >', os.path.join(version_dir_path, backup_file_name)]

p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
for line in p.stdout:
    print line
p.wait()
print p.returncode