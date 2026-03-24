#!/bin/bash
set -e

DB_URL="${DATABASE_URL:-postgresql://uniclaw:uniclaw@timescaledb:5432/uniclaw}"
MOUNT_PATH="${TIGERFS_MOUNT_PATH:-/mnt/tigerfs}"
GATEWAY_PORT="${GATEWAY_PORT:-18789}"
MODEL="${OPENCLAW_MODEL:-qwen3.5:4b-q4_K_M}"

apt-get update -qq && apt-get install -y -qq fuse3 curl gcc > /dev/null 2>&1
curl -fsSL https://install.tigerfs.io | HOME=/root sh > /dev/null 2>&1
export PATH="/root/bin:$PATH"

gcc -shared -fPIC -o /usr/local/lib/tigerfs-rename-shim.so /tigerfs-rename-shim.c -ldl
export LD_PRELOAD=/usr/local/lib/tigerfs-rename-shim.so

FILE="/app/dist/workspace-D4K6QX9X.js"
if [ -f "$FILE" ]; then
  sed -i 's|return path.join(dir, WORKSPACE_STATE_DIRNAME, WORKSPACE_STATE_FILENAME);|return path.join(dir, WORKSPACE_STATE_FILENAME);|' "$FILE"
  sed -i 's|await fs\$1.mkdir(path.dirname(statePath), { recursive: true });|/* patched */|' "$FILE"
fi

mkdir -p "$MOUNT_PATH"
tigerfs mount "$DB_URL" "$MOUNT_PATH" &
sleep 3

echo "markdown,history" > "$MOUNT_PATH/.build/workspace" 2>/dev/null || true
echo "markdown,history" > "$MOUNT_PATH/.build/state" 2>/dev/null || true

STATE_DIR="$MOUNT_PATH/state"
export OPENCLAW_STATE_DIR="$STATE_DIR"
cat > "$STATE_DIR/openclaw.json" << CONF
{
  "agents": {
    "defaults": {
      "workspace": "$MOUNT_PATH/workspace",
      "model": {
        "primary": "ollama/$MODEL"
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "${OLLAMA_HOST:-http://host.docker.internal:11434}",
        "api": "ollama",
        "models": [
          { "id": "$MODEL", "name": "$MODEL" }
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
      "password": "${GATEWAY_PASSWORD:-uniclaw-dev}"
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
        }
      }
    }
  }
}
CONF

exec openclaw gateway --port "$GATEWAY_PORT"
