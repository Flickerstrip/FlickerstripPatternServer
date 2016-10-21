#!/bin/bash

ENVIRONMENT=$1
NAME=$2
BACKUP=$NAME`date +"%Y%m%d_%H%M%S"`_$ENVIRONMENT.sql

if [[ -z  $ENVIRONMENT  ]]
then
    echo "ERR: No environment given"
    exit
fi

CONFIG=`cat config/config.json | json $ENVIRONMENT`

HOST=`echo $CONFIG | json host`
USERNAME=`echo $CONFIG | json username`
PASSWORD=`echo $CONFIG | json password`
DBNAME=`echo $CONFIG | json database`

mysqldump -u $USERNAME -p$PASSWORD -h $HOST $DBNAME > $BACKUP
cp $BACKUP backups/
