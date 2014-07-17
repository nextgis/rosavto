import argparse
import re
import subprocess
import os
from os import path


def install_pyramid_app(path_to_app, path_to_python='/home/cloud/projects/env/python'):
    subprocess.call('cd {0}; {1} setup.py develop;'.format(path_to_app, path_to_python), shell=True)


parser = argparse.ArgumentParser(description='Build of release')
parser.add_argument('--release', dest='release', help='version of release (like as 1.3.0)')

args = vars(parser.parse_args())

release_number = args['release']
print 'building release {0}'.format(release_number)

release_version_regex = ur'V\d.\d.\d'

link_to_rosavto = '/home/cloud/projects/widgets/rosavto'
path_to_release_folder = '/home/cloud/projects/gis/V{0}/'.format(release_number)

if not path.exists(path_to_release_folder):
    raise Exception('path "{0}" to release folder not found'.format(path_to_release_folder))

if not path.exists(link_to_rosavto):
    raise Exception('path "{0}" to ROSAVTO symbolic link folder not found'.format(link_to_rosavto))

if path.islink(link_to_rosavto):
    path_to_rosavto = path.realpath(link_to_rosavto)
    current_release_version = re.findall(release_version_regex, path_to_rosavto)
    if len(current_release_version) == 1:
        if current_release_version[0][1:] == args['release']:
            print 'release {0} already assembled'.format(args['release'])
        else:
            print 'building release {0} started...'.format(release_number)
            new_path = '/home/cloud/projects/gis/V{0}/widgets/'.format(release_number)
            print 'install rosavto V{0}...'.format(release_number)
            subprocess.call('cd {0}; /home/cloud/projects/env/bin/python setup.py develop;'.format(new_path), shell=True)
            print 'replace symlink...'
            old_link = os.readlink(link_to_rosavto)
            os.unlink(link_to_rosavto)
            os.symlink(new_path, link_to_rosavto)
            print 'building release {0} has finished.'.format(release_number)