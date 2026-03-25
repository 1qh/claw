#!/bin/bash
set -e

DB_URL="${DATABASE_URL:-postgresql://uniclaw:uniclaw@timescaledb:5432/uniclaw}"
MOUNT_PATH="${TIGERFS_MOUNT_PATH:-/mnt/tigerfs}"

apt-get update -qq && apt-get install -y -qq fuse3 curl gcc > /dev/null 2>&1
curl -fsSL https://install.tigerfs.io | HOME=/root sh > /dev/null 2>&1
export PATH="/root/bin:$PATH"

gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl
export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so

mkdir -p "$MOUNT_PATH"
tigerfs mount "$DB_URL" "$MOUNT_PATH" &
sleep 3

USER_DATA="/root/vscode-data"
mkdir -p "$USER_DATA/User" "$USER_DATA/Machine"
cp /vscode-settings.json "$USER_DATA/User/settings.json"
cp /vscode-settings.json "$USER_DATA/Machine/settings.json"

exec /home/.openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 \
  --port 3333 \
  --without-connection-token \
  --user-data-dir "$USER_DATA" \
  --default-folder "$MOUNT_PATH"
