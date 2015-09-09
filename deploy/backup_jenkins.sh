#!/bin/bash
backup () {
    mkdir -p ~/mnt/V$1

    BACKUP_FILE_NAME=rosavto-$2.gis'('$1')'$(date -d "$xx -1 day" -u +%d.%m.%Y-%H.%M.%S).backup
    rm -f ~/mnt/V$1/$BACKUP_FILE_NAME

    pg_dumpall -c -O > ~/mnt/V$1/$BACKUP_FILE_NAME
    if ! [ -s ~/mnt/V$1/$BACKUP_FILE_NAME ] ; then
        rm -f ~/mnt/V$1/$BACKUP_FILE_NAME
        echo created backup file was removed
        exit 1
    else
            echo ------------
            echo SERVER: gis-$2 [192.168.255.101]
            echo VERSION_BUID_GIS: $1
            echo BACKUP_FILE_NAME: $BACKUP_FILE_NAME
            echo ------------
    fi ;
}

sudo mount //archi-ctr.tesad.fad.ru/backup/gis/
backup $1 $2
sudo unmount //archi-ctr.tesad.fad.ru/backup/gis/
