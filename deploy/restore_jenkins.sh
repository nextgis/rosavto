#!/bin/bash

set -e

restore () {

    if [[ $1 =~ (V[[0-9.]*) ]]; then
        version="${BASH_REMATCH[1]}"
    else
        echo "pattern failed"
        exit 125
    fi

    echo "-----------------------------------------------"
    echo "Starting restore: version - $version, file - $1"

    backup_file="$HOME/mnt/$version/$1"
    echo "backup_file was set to $backup_file"

    time_label=$(date -u +%d.%m.%Y_%H.%M.%S)
    temporary_dir="$HOME/temp/$time_label"

    echo Creating temporary_dir - "$temporary_dir"
    mkdir -p "$temporary_dir"
    echo temporary_dir was created

    echo Unzip backup archive...
    tar -xzf "$backup_file" -C "$temporary_dir"
    echo Unzip finished successfully

    echo "Stopping rosavto..."
    supervisorctl -c ~/supervisor/supervisor.conf stop rosavto
    echo "OK"

    echo "Stopping nextgisweb..."
    supervisorctl -c ~/supervisor/supervisor.conf stop nextgisweb
    echo "OK"

    echo "Stopping mapproxy..."
    supervisorctl -c ~/supervisor/supervisor.conf stop mapproxy
    echo "OK"

    echo "Restoring database..."
    psql -d postgres <  "$temporary_dir/db.backup"
    echo "OK"

    echo "Removing existent rosavto app..."
    rosavto_dir="$HOME/projects/widgets/rosavto"
    if [[ -L "$rosavto_dir" || -d "$rosavto_dir" ]]
    then
        rm -r "$rosavto_dir"
        echo "rosavto dir - $rosavto_dir - was removed"
    fi

    rosavto_config_file="$HOME/projects/widgets/production.ini"
    if [[ -f "$rosavto_config_file" ]]
    then
        rm "$rosavto_config_file"
        echo "rosavto config - $rosavto_config_file - was removed"
    fi
    echo "OK"

    echo "Copying rosavto backup..."
    rsync -a "$temporary_dir/widgets/" "$HOME/projects/widgets/"
    echo "OK"

    echo "Starting rosavto..."
    supervisorctl -c ~/supervisor/supervisor.conf start rosavto
    echo "OK"

    echo "Removing existent nextgisweb_rosavto app..."
    ngw_rosavto_dir="$HOME/projects/ngw/nextgisweb_rosavto"
    if [[ -L "$ngw_rosavto_dir" || -d "$ngw_rosavto_dir" ]]
    then
        rm -r "$ngw_rosavto_dir"
        echo "nextgisweb_rosavto dir - $ngw_rosavto_dir - was removed"
    fi
    echo "OK"

    echo "Copying nextgisweb_rosavto backup..."
    rsync -a "$temporary_dir/ngw/nextgisweb_rosavto/" "$HOME/projects/ngw/nextgisweb_rosavto/"
    echo "OK"

    echo "Starting nextgisweb..."
    supervisorctl -c ~/supervisor/supervisor.conf start nextgisweb
    echo "OK"

    echo "Starting mapproxy..."
    supervisorctl -c ~/supervisor/supervisor.conf start mapproxy
    echo "OK"

    echo "Getting status applications"
    supervisorctl -c ~/supervisor/supervisor.conf status
    echo "OK"

    echo Removing temporary_dir
    rm -r "$temporary_dir"
    echo OK

    echo Restore was finished successfully.
    echo "-----------------------------------------------"
}

restore $1
