import argparse, re
from os import path

parser = argparse.ArgumentParser(description='Build of release')
parser.add_argument('--release', dest='release', help='version of release (like as 1.3.0)')

args = vars(parser.parse_args())

print 'building release {0}'.format(args['release'])

release_version_regex = ur'V\d.\d.\d'

link_to_rosavto = '/home/cloud/projects/widgets/rosavto'

if path.exists(link_to_rosavto) and path.islink(link_to_rosavto):
    path_to_rosavto = path.realpath(link_to_rosavto)
    version = re.findall(release_version_regex, path_to_rosavto)
    if len(version) == 1:
        if release_version_regex[1:] == args['release']:
            print 'release {0} already assembled'.format(args['release'])
        else:
            print 'building release {0} started...'.format(args['release'])