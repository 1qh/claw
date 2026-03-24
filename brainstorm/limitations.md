# Known Limitations

Accumulated discoveries about upstream dependencies and constraints. Plan docs reference this file instead of duplicating details.

## OpenClaw Gateway

### No per-token streaming (150ms throttle)

[`src/gateway/server-chat.ts:534`](https://github.com/openclaw/openclaw/blob/main/src/gateway/server-chat.ts#L534): `if (now - last < 150) return` — batches all tokens into one delta event. Applies to both WebSocket and HTTP transports (`/v1/chat/completions` with `stream: true`).

[`src/gateway/protocol/client-info.ts:45`](https://github.com/openclaw/openclaw/blob/main/src/gateway/protocol/client-info.ts#L45): `GATEWAY_CLIENT_CAPS = { TOOL_EVENTS: "tool-events" }` — no opt-in for finer granularity.

Depends on OpenClaw upstream making the throttle configurable.

### Session keys must be unique per chat

`agent:main:main` causes stale sessions — gateway returns `final` immediately with no content. Must use unique session key per chat: `agent:main:${userId}-${Date.now()}`.

### `idempotencyKey` required for WebSocket `chat.send`

Newer gateway versions reject `chat.send` without `idempotencyKey`. Not needed for HTTP `/v1/chat/completions`.

### Reasoning stream not yet populated

[`src/gateway/sessions-patch.ts:238`](https://github.com/openclaw/openclaw/blob/main/src/gateway/sessions-patch.ts#L238): Session config accepts `thinkingLevel` but the gateway does not emit a separate reasoning stream type.

[`src/infra/agent-events.ts:5`](https://github.com/openclaw/openclaw/blob/main/src/infra/agent-events.ts#L5): `AgentEventStream = "lifecycle" | "tool" | "assistant" | "error"` — no `reasoning` type. Reasoning output comes through `assistant` stream as part of the text.

### Device identity pairing

WebSocket operator connections require Ed25519 device identity + gateway password. Device re-approval needed after gateway restart or metadata changes (e.g. new caps). Each WS connection attempt with changed metadata triggers a new pairing request — `docker exec claw-gateway-1 openclaw devices approve` must be run before WS-based tests. Auto-skip only works for loopback clients; Docker host connections (`172.18.0.1`) are non-local. `DEVICE_IDENTITY_PATH` env var needed since Next.js CWD may differ from repo root. HTTP endpoints use simpler Bearer token auth (gateway password) and don’t require pairing.

### TigerFS rejects dot-prefixed entries

Files AND directories starting with `.` are rejected by TigerFS. Workaround: `OPENCLAW_STATE_DIR` set to non-dot path (`/mnt/tigerfs/state/`) — avoids `.openclaw/` entirely. Workspace-state.json still needs a runtime patch (`sed` in `gateway-init.sh`) because it creates a `.openclaw/` subdir inside the workspace. PR #53326 submitted upstream.

## better-auth

### False positive entropy warning

`estimateEntropy()` in `context/secret-utils.mjs` flags 64-char hex secrets (256 bits) as low-entropy. The formula `Math.log2(Math.pow(unique, str.length))` gives 256 for hex, well above the 120-bit threshold. Cosmetic warning only, secret is secure.

## TigerFS + OpenClaw Integration

### Hardcoded workspace JS filename

`gateway-init.sh` patches a specific built JS filename (`workspace-D4K6QX9X.js`). This is version-dependent and breaks on OpenClaw updates. Must be updated whenever the OpenClaw Docker image is upgraded.

### FUSE rename over existing file returns EIO

TigerFS FUSE does not support POSIX `rename(2)` when the target file already exists — returns `EIO` instead of atomically replacing the target. OpenClaw uses atomic rename patterns (`write tmp → rename over existing`) extensively for `sessions.json`, `models.json`, `openclaw.json`, and other state files. Without a fix, only the first write succeeds; all subsequent updates fail.

**Fix:** LD_PRELOAD shim (`tigerfs-rename-shim.c`) intercepts `rename()` at the libc level. If rename fails with `EIO` and the target exists, it does `unlink(target) + rename(src, target)`. Version-independent — works across all OpenClaw releases without patching built JS files.

**Upstream:** Should be reported to TigerFS — `rename(2)` atomically replacing an existing target is POSIX-required behavior.

### FUSE mount bypasses RLS

Any process with filesystem access to the TigerFS FUSE mount can read/write data, bypassing PostgreSQL row-level security. RLS only applies to direct database connections. Filesystem-level access control must be handled separately (e.g., Unix permissions, mount namespaces).

### File watch 80% detection rate

chokidar misses ~20% of file change events in benchmarks on TigerFS FUSE mounts. Acceptable for config hot-reload but not suitable for operations requiring guaranteed delivery. Use direct database notifications (LISTEN/NOTIFY) for critical change detection.

## Gateway Connections

### Events SSE creates per-request gateway connections

Each `/api/events` SSE request opens a new WebSocket operator connection to the gateway. Multiple browser tabs = multiple connections. Connection pooling is a future optimization.

## ClamAV

### No ARM64 on Alpine image

`clamav/clamav:stable` (Alpine) has no ARM64 build. Use `clamav/clamav-debian:latest` which supports ARM64 natively.
