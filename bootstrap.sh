#!/bin/bash

ENVIRONMENT=$1

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

cat setup.sql | mysql -u $USERNAME -p$PASSWORD -h $HOST
cat bootstrap.sql | mysql -u $USERNAME -p$PASSWORD -h $HOST $DBNAME
sequelize --env $ENVIRONMENT db:migrate
