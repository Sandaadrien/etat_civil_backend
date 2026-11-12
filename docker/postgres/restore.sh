#!/bin/sh
set -eu

pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  /docker-entrypoint-initdb.d/etat_civil.dump
