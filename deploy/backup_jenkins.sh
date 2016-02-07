#!/bin/bash

set -e

backup () {
    backup_dir="$HOME/mnt/V$1"
    time_label=$(date -u +%d.%m.%Y_%H.%M.%S)
    temporary_dir="$HOME/temp/$time_label"
    zip_file_name="$HOME/temp/V$1-$2-$time_label.tar.gz"

    echo "-----------------------------------------------"
    echo "Starting backup: version - $1, server - $2"

    echo Creating backup_dir - "$backup_dir"
    mkdir -p "$backup_dir"
    echo backup_dir was created

    echo Creating temporary_dir - "$temporary_dir"
    mkdir -p "$temporary_dir"
    echo temporary_dir was created

    echo "Stopping rosavto..."
    supervisorctl -c ~/supervisor/supervisor.conf stop rosavto
    echo "OK"

    echo "Stopping nextgisweb..."
    supervisorctl -c ~/supervisor/supervisor.conf stop nextgisweb
    echo "OK"

    echo "Stopping mapproxy..."
    supervisorctl -c ~/supervisor/supervisor.conf stop mapproxy
    echo "OK"

    echo Dumping database...
    pg_dumpall -c -O > "$temporary_dir/db.backup"
    echo dump was created

    echo Copying ngw dir - "$HOME/projects/ngw/" - to temporary_dir - "$temporary_dir/"
    mkdir -p "$temporary_dir/ngw"
    rsync -a -L --exclude=".*" --exclude ".*/" "$HOME/projects/ngw/" "$temporary_dir/ngw"
    echo OK

    echo Copying widgets dir - "$HOME/projects/widgets/" - to temporary_dir - "$temporary_dir/"
    mkdir -p "$temporary_dir/widgets"
    rsync -a -L --exclude=".*" --exclude ".*/" "$HOME/projects/widgets/" "$temporary_dir/widgets"
    echo OK

    echo "Starting rosavto..."
    supervisorctl -c ~/supervisor/supervisor.conf start rosavto
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

    echo Creating archive "$zip_file_name"
    tar -zhcf "$zip_file_name" -C "$temporary_dir" .
    echo OK

    echo Copying archive to backup_dir - "$backup_dir"
    cp "$zip_file_name" "$backup_dir"
    echo OK

    echo Removing temporary_dir
    rm -r "$temporary_dir"
    echo OK

    echo Removing temporary archive
    rm "$zip_file_name"
    echo OK

    echo "Dump was finished successfully"
    echo "File - V$1-$2-$time_label.tar.gz"
    echo "-----------------------------------------------"
}

backup $1 $2
