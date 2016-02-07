#!/bin/bash

set -e

deploy () {
    version_deploy=$1

    echo "-----------------------------------------------"
    echo "Starting deploying: version - $1"

    echo "Stopping apps..."
    supervisorctl -c ~/supervisor/supervisor.conf stop rosavto
    supervisorctl -c ~/supervisor/supervisor.conf stop nextgisweb
    echo "OK

    echo "Getting changes from SVN..."
    svn up /home/cloud/projects/gis
    echo "OK"

    echo "Running SQL functions..."
    bash ~/projects/backup_restore/upgrade_db.sh
    crontab ~/projects/backup_restore/crontab.data
    psql -a -d rosavto -f ~/projects/backup_restore/sql/ng_functions.sql
    echo "OK"

    echo "Building..."
    echo "-----------"
    /home/cloud/projects/env/bin/python ~/projects/backup_restore/build.py --release "$version_deploy"
    echo "-----------"
    echo "OK"

    echo "Starting apps..."
    supervisorctl -c ~/supervisor/supervisor.conf start rosavto
    supervisorctl -c ~/supervisor/supervisor.conf start nextgisweb
    echo "OK"

    echo "Getting status applications"
    supervisorctl -c ~/supervisor/supervisor.conf status
    echo "OK"

    echo "Building version $version_deploy was finished successfully"
    echo "-----------------------------------------------"
}

deploy $1
