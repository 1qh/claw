#!/bin/bash
set -e

DB_URL="${DATABASE_URL:-postgresql://uniclaw:uniclaw@timescaledb:5432/uniclaw}"
MOUNT_PATH="${TIGERFS_MOUNT_PATH:-/mnt/tigerfs}"
GATEWAY_PORT="${GATEWAY_PORT:-18789}"

apt-get update -qq && apt-get install -y -qq fuse3 curl > /dev/null 2>&1
curl -fsSL https://install.tigerfs.io | HOME=/root sh > /dev/null 2>&1
export PATH="/root/bin:$PATH"

FILE="/app/dist/workspace-D4K6QX9X.js"
if [ -f "$FILE" ]; then
  sed -i 's|return path.join(dir, WORKSPACE_STATE_DIRNAME, WORKSPACE_STATE_FILENAME);|return path.join(dir, WORKSPACE_STATE_FILENAME);|' "$FILE"
  sed -i 's|await fs\$1.mkdir(path.dirname(statePath), { recursive: true });|/* patched */|' "$FILE"
fi

mkdir -p "$MOUNT_PATH"
tigerfs mount "$DB_URL" "$MOUNT_PATH" &
sleep 3

echo "markdown,history" > "$MOUNT_PATH/.build/workspace" 2>/dev/null || true

mkdir -p /root/.openclaw
cat > /root/.openclaw/openclaw.json << CONF
{
  "agents": {
    "defaults": {
      "workspace": "$MOUNT_PATH/workspace",
      "model": {
        "primary": "ollama/qwen3.5:9b-q4_K_M"
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "${OLLAMA_HOST:-http://host.docker.internal:11434}",
        "api": "ollama",
        "models": [
          { "id": "qwen3.5:9b-q4_K_M", "name": "qwen3.5:9b-q4_K_M" }
        ]
      }
    }
  },
  "gateway": {
    "port": $GATEWAY_PORT,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true
    }
  }
}
CONF

exec openclaw gateway --port "$GATEWAY_PORT"
