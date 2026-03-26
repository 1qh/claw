#!/bin/bash
set -e

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${TIGERFS_MOUNT_PATH:?TIGERFS_MOUNT_PATH is required}"
: "${GATEWAY_PORT:?GATEWAY_PORT is required}"
: "${OPENCLAW_MODEL:?OPENCLAW_MODEL is required}"
: "${OLLAMA_HOST:?OLLAMA_HOST is required}"
: "${GATEWAY_PASSWORD:?GATEWAY_PASSWORD is required}"

apt-get update -qq && apt-get install -y -qq fuse3 curl gcc > /dev/null 2>&1
curl -fsSL https://install.tigerfs.io | HOME=/root sh > /dev/null 2>&1
export PATH="/root/bin:$PATH"

gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl
export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so

for FILE in $(grep -rl 'WORKSPACE_STATE_DIRNAME' /app/dist/*.js 2>/dev/null); do
  sed -i 's|return path.join(dir, WORKSPACE_STATE_DIRNAME, WORKSPACE_STATE_FILENAME);|return path.join(dir, WORKSPACE_STATE_FILENAME);|' "$FILE"
  sed -i 's|await fs\$1.mkdir(path.dirname(statePath), { recursive: true });|/* patched */|' "$FILE"
done

mkdir -p "$TIGERFS_MOUNT_PATH"
tigerfs mount "$DATABASE_URL" "$TIGERFS_MOUNT_PATH" &
sleep 3

echo "markdown,history" > "$TIGERFS_MOUNT_PATH/.build/workspace" 2>/dev/null || true
echo "markdown,history" > "$TIGERFS_MOUNT_PATH/.build/state" 2>/dev/null || true

STATE_DIR="$TIGERFS_MOUNT_PATH/state"
export OPENCLAW_STATE_DIR="$STATE_DIR"
cat > "$STATE_DIR/openclaw.json" << CONF
{
  "agents": {
    "defaults": {
      "workspace": "$TIGERFS_MOUNT_PATH/workspace",
      "model": {
        "primary": "ollama/$OPENCLAW_MODEL"
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "$OLLAMA_HOST",
        "api": "ollama",
        "models": [
          { "id": "$OPENCLAW_MODEL", "name": "$OPENCLAW_MODEL" }
        ]
      }
    }
  },
  "gateway": {
    "port": $GATEWAY_PORT,
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "password",
      "password": "$GATEWAY_PASSWORD"
    },
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "dangerouslyDisableDeviceAuth": true,
      "allowedOrigins": ["http://localhost:3000", "http://localhost:18789"]
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        },
        "responses": {
          "enabled": true
        }
      }
    }
  }
}
CONF

exec openclaw gateway --port "$GATEWAY_PORT"
