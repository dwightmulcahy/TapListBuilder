#!/bin/sh
set -eu
if [ -z "${LIBRARY_TOKEN:-}" ]; then
    echo "Shared library disabled: LIBRARY_TOKEN not configured"
    exit 0
fi
mkdir -p "${LIBRARY_DATA_DIR:-/data}"
cd /opt/taplistbuilder
gunicorn --bind 127.0.0.1:8766 --workers 2 --daemon 'server.library_api:application()'
