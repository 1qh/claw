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

### Device identity not needed for operator+password auth

WebSocket connections with `role: "operator"` and password auth (`sharedAuthOk`) skip device pairing entirely — confirmed in [`src/gateway/role-policy.ts`](https://github.com/openclaw/openclaw/blob/main/src/gateway/role-policy.ts): `roleCanSkipDeviceIdentity(role, sharedAuthOk)` returns `true` for operators with shared secret auth.

Previously we sent Ed25519 device identity in the WS handshake, which triggered the pairing flow. Since our Next.js app connects from Docker host (non-loopback), auto-approve didn’t work. **Fix:** Don’t send device identity at all — operator+password is sufficient. Eliminates the entire pairing problem.

### `chat.send` starts a fresh agent run — no automatic session context

Each WS `chat.send` invocation starts a fresh agent run. The gateway does NOT inject previous session messages into the agent’s context. Confirmed in [`src/gateway/server-methods/chat.ts:1390`](https://github.com/openclaw/openclaw/blob/main/src/gateway/server-methods/chat.ts#L1390): `messageForAgent = parsedMessage` — only the current message, no history.

Session continuity in OpenClaw is designed for the CLI/terminal use case where the agent loop runs continuously with compaction. For the `chat.send` API (used by WebChat, Control UI, and us), the **client is responsible for providing conversation context** — same as the OpenAI API pattern.

Additionally, JSONL transcripts store only assistant responses — user messages are never written to disk.

**How we handle this:**

- The frontend sends the full conversation history in each `/api/chat` request
- `/api/chat` formats all previous messages as context (`[User]: ... [Assistant]: ...`) and includes the new message
- The agent sees the full conversation in a single `chat.send` message — this is the designed pattern, not a workaround
- Both user and assistant messages are persisted in a Drizzle-managed `chat_messages` table for session switching
- This table is NOT duplication — user messages don’t exist anywhere in OpenClaw’s storage

See [decisions.md](stack/decisions.md) for the full rationale.

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

### WS `chat.send` drops ~15-25% of responses with small models

When using WS `chat.send`, the OpenClaw agent sometimes calls tools (reading workspace files like SOUL.md, IDENTITY.md, AGENTS.md) and ends the turn without producing any text response. The `chat` `final` event arrives with no `message` field. This is not a network issue — the model (tested with qwen3.5:4b and 9b) decides to use tools and produces no text output.

The HTTP `/v1/chat/completions` endpoint runs the **same agent** but has a built-in fallback: if no assistant text was emitted after the agent completes, [`resolveAgentResponseText()`](https://github.com/openclaw/openclaw/blob/main/src/gateway/openai-http.ts#L399) extracts text from result payloads and falls back to `"No response from OpenClaw."`. The WS protocol has no such fallback.

**Decision:** Use HTTP `/v1/chat/completions` for chat. See [decisions.md](stack/decisions.md) for full analysis.

### OpenVSCode Server iframe limitations

Attempted embedding OpenVSCode Server (`gitpod/openvscode-server`) as an iframe in the Next.js app for a full IDE experience. Blocked by:

- **Settings sync**: VS Code caches settings in IndexedDB, overriding server-side `settings.json`. No reliable way to force settings from the host page.
- **Theme sync**: Cross-origin iframe prevents `postMessage`. No URL parameter for theme. The VS Code instance has its own theme toggle that doesn’t sync with the host app’s `next-themes`.
- **Read-only enforcement**: `editor.readOnly` shows a “Toggle Read-Only” button that users can click to bypass. `files.readonlyInclude` is better but VS Code still allows toggling. Enforced at DB level via read-only PostgreSQL role (`vscode_readonly`).

**Decision:** Dropped VS Code iframe from the app. Kept OpenVSCode Server as an admin-only service on port 3333 for direct filesystem browsing. Built a custom IDE panel with Monaco Editor (`@monaco-editor/react`) for the app’s code viewer, with file tree from TigerFS tables via Drizzle.

## ClamAV

### No ARM64 on Alpine image

`clamav/clamav:stable` (Alpine) has no ARM64 build. Use `clamav/clamav-debian:latest` which supports ARM64 natively.
