#!/bin/bash

set -e

deploy () {
    version_deploy=$1

    supervisorctl -c ~/supervisor/supervisor.conf stop rosavto
    supervisorctl -c ~/supervisor/supervisor.conf stop nextgisweb

    svn up /home/cloud/projects/gis
    bash ~/projects/backup_restore/upgrade_db.sh
    crontab ~/projects/backup_restore/crontab.data
    psql -a -d rosavto -f ~/projects/backup_restore/sql/ng_functions.sql
    /home/cloud/projects/env/bin/python ~/projects/backup_restore/build.py --release "$version_deploy"

    supervisorctl -c ~/supervisor/supervisor.conf start rosavto
    supervisorctl -c ~/supervisor/supervisor.conf start nextgisweb
    supervisorctl -c ~/supervisor/supervisor.conf status
}

deploy $1
