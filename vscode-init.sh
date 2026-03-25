#!/bin/bash
set -e

DB_URL="${DATABASE_URL:-postgresql://uniclaw:uniclaw@timescaledb:5432/uniclaw}"
MOUNT_PATH="${TIGERFS_MOUNT_PATH:-/mnt/tigerfs}"
DATA_DIR="/root/vscode-data"

apt-get update -qq && apt-get install -y -qq fuse3 curl gcc > /dev/null 2>&1
curl -fsSL https://install.tigerfs.io | HOME=/root sh > /dev/null 2>&1
export PATH="/root/bin:$PATH"

gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl
export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so

mkdir -p "$MOUNT_PATH"
tigerfs mount "$DB_URL" "$MOUNT_PATH" &
sleep 3

mkdir -p "$DATA_DIR/Machine" "$DATA_DIR/User"
cat > "$DATA_DIR/Machine/settings.json" << 'SETTINGS'
{
  "workbench.colorTheme": "Default Dark Modern",
  "editor.readOnly": true,
  "editor.domReadOnly": true,
  "editor.fontSize": 13,
  "editor.minimap.enabled": false,
  "editor.wordWrap": "on",
  "editor.scrollBeyondLastLine": false,
  "files.readonlyInclude": { "**": true },
  "files.watcherExclude": { "**/.history/**": true },
  "explorer.excludeGitIgnore": false,
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "workbench.enableExperiments": false,
  "telemetry.telemetryLevel": "off",
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "update.mode": "none",
  "github.copilot.enable": { "*": false },
  "terminal.integrated.defaultProfile.linux": "bash"
}
SETTINGS
cp "$DATA_DIR/Machine/settings.json" "$DATA_DIR/User/settings.json"

exec /home/.openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 \
  --port 3333 \
  --without-connection-token \
  --server-data-dir "$DATA_DIR" \
  --default-folder "$MOUNT_PATH"
