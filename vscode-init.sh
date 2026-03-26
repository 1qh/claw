#!/bin/bash

: "${DATABASE_URL_READONLY:?DATABASE_URL_READONLY is required}"
: "${TIGERFS_MOUNT_PATH:?TIGERFS_MOUNT_PATH is required}"

echo "Building rename shim..."
if command -v gcc > /dev/null 2>&1 && [ -f /tigerfs-rename-shim.c ]; then
  gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl 2>&1
  export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so
fi

echo "Mounting TigerFS..."
mkdir -p "$TIGERFS_MOUNT_PATH"
tigerfs mount --read-only "$DATABASE_URL_READONLY" "$TIGERFS_MOUNT_PATH" &
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
  --default-folder "$TIGERFS_MOUNT_PATH"
