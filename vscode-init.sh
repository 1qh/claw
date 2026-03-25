#!/bin/bash

DB_URL="${DATABASE_URL:-postgresql://uniclaw:uniclaw@timescaledb:5432/uniclaw}"
MOUNT_PATH="${TIGERFS_MOUNT_PATH:-/mnt/tigerfs}"

echo "Waiting for apt locks..."
sleep 10

echo "Installing dependencies..."
apt-get update -qq 2>&1 || true
apt-get install -y -qq fuse3 curl gcc 2>&1 || true

echo "Installing TigerFS..."
curl -fsSL https://install.tigerfs.io | HOME=/root sh 2>&1 || true
export PATH="/root/bin:$PATH"

echo "Building rename shim..."
gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl 2>&1 || true
export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so

echo "Mounting TigerFS..."
mkdir -p "$MOUNT_PATH"
tigerfs mount "$DB_URL" "$MOUNT_PATH" &
sleep 3

echo "Setting up VS Code..."
USER_DATA="/root/vscode-data"
mkdir -p "$USER_DATA/User" "$USER_DATA/Machine"
cp /vscode-settings.json "$USER_DATA/User/settings.json" 2>/dev/null || true
cp /vscode-settings.json "$USER_DATA/Machine/settings.json" 2>/dev/null || true

echo "Starting OpenVSCode Server..."
exec /home/.openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 \
  --port 3333 \
  --without-connection-token \
  --user-data-dir "$USER_DATA" \
  --default-folder "$MOUNT_PATH"
