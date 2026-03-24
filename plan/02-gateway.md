# Phase 2: Gateway Integration

## Goal

Connect the Next.js app to an OpenClaw gateway. Relay chat messages via API routes and stream agent events via SSE. Build the memory-timescaledb plugin.

**Architecture:**

- Chat: HTTP (`/v1/chat/completions` with Bearer token auth)
- Events/logs: WebSocket (operator connection) for real-time lifecycle events in Terminal panel

## Overview

```mermaid
graph TB
    subgraph "Stage 2.1"
        G1["Single Gateway\nStart + Connect"]
    end

    subgraph "Stage 2.2"
        W1["WebSocket Proxy\nFrontend ↔ Gateway"]
    end

    subgraph "Stage 2.3"
        M1["memory-timescaledb\nPlugin"]
    end

    subgraph "Stage 2.4"
        E2E["End-to-End\nUser → Agent → Result"]
    end

    G1 --> W1 --> E2E
    G1 --> M1 --> E2E
```

---

## Stage 2.1: Single Gateway Lifecycle

### Goal

Control plane can start, stop, and health-check a single OpenClaw gateway process.

### Dependencies

- Phase 1 complete
- OpenClaw installed
- TigerFS mounted (from Phase 0)

### Steps

```mermaid
stateDiagram-v2
    [*] --> Starting: Control plane calls Bun.spawn
    Starting --> Running: Gateway binds to port
    Running --> Healthy: Health check passes
    Healthy --> Running: Periodic health check
    Running --> Stopped: Control plane kills process
    Running --> Crashed: Process exits unexpectedly
    Crashed --> Starting: Auto-restart
    Stopped --> [*]
```

1. **Create a per-gateway PostgreSQL role** for this gateway (even for the first single gateway in Phase 2). The role is scoped via RLS policies to only see its own agents’ data. Configure the gateway’s database connection and TigerFS mount to use this role. This ensures RLS is tested from Phase 2 onward, not deferred to Phase 5.
2. Control plane spawns OpenClaw gateway via `Bun.spawn()` with:
   - `OPENCLAW_STATE_DIR` pointing to TigerFS
   - `agents.defaults.workspace` pointing to TigerFS
   - Unique port assignment
   - Gateway auth token for control plane connection
   - Database connection string using the per-gateway PostgreSQL role (not superuser)
   - **Explicitly set `tools.exec.security: "allowlist"` with `safeBins: ["bunx"]` in the shared config** — this permits ONLY `bunx` (the CLI execution mechanism) while blocking all other shell commands. Setting `"deny"` would break the agent-native CLI paradigm entirely
   - **TigerFS mount permissions:** TigerFS mount should use restricted permissions (only accessible to the gateway process user group). Combined with exec deny default, this prevents FUSE-level bypass of RLS
3. Control plane waits for gateway to be ready (poll `/health` or wait for WebSocket handshake)
4. Control plane connects to gateway via WebSocket (device identity + token auth)
5. Implement health check loop — periodic ping, restart on failure
6. Implement graceful shutdown — wait for active tasks, then kill
7. **Secrets management:** For production, deployers should use environment variables or a secrets manager for API keys, not plaintext files on TigerFS. The framework supports both `auth-profiles.json` (for development) and environment variable injection (for production).
8. Write tests: start gateway, verify health, send message via gateway API, stop gateway, verify restart on crash
9. **Gateway device identity:** Gateway WebSocket protocol requires device identity: generate Ed25519 keypair, persist to `.cache/`, implement v3 challenge-response handshake. Use `gateway.auth.mode: 'password'` for non-local connections (Docker, remote). New devices must be approved on the gateway before they can connect.

### External References

- [OpenClaw gateway CLI](https://docs.openclaw.ai/cli/gateway)
- [OpenClaw gateway protocol](https://docs.openclaw.ai/gateway/protocol)
- [OpenClaw gateway configuration](https://docs.openclaw.ai/gateway/configuration)
- [Bun.spawn docs](https://bun.sh/docs/api/spawn)

### Verification Checklist

- [ ] Control plane starts gateway process successfully
- [ ] Gateway binds to assigned port
- [ ] Control plane connects via WebSocket with auth
- [ ] Health check detects healthy gateway
- [ ] Health check detects crashed gateway and restarts it
- [ ] Graceful shutdown waits for active task then stops
- [ ] Gateway reads workspace from TigerFS (validates Phase 0 findings)
- [ ] `tools.exec.security` is set to `"allowlist"` with `safeBins: ["bunx"]` in shared config (verified via gateway config dump)
- [ ] All tests pass

---

## Stage 2.2: Chat + Events API Routes

### Goal

Relay chat messages from the frontend to the gateway via Next.js API routes. Stream agent lifecycle events via SSE.

### Dependencies

- Stage 2.1 complete

### Steps

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (React)
    participant API as Next.js API Routes
    participant GW as Gateway

    User->>FE: “Generate my report”
    FE->>API: POST /api/chat (AI SDK sendMessage)
    API->>API: Validate auth (better-auth session)
    API->>API: Lookup user → gateway
    API->>GW: POST /v1/chat/completions (Bearer token auth)

    GW->>API: Streamed HTTP response
    API->>FE: TextStreamChatTransport response
    FE->>User: Text appears

    Note over FE,API: Agent lifecycle events via GET /api/events (SSE)
```

1. `/api/chat` route handler:
   - Authenticate via better-auth session
   - Look up user’s gateway assignment
   - Forward message to gateway via HTTP `POST /v1/chat/completions` with Bearer token auth
   - Return response via `createTextStreamResponse` (AI SDK `TextStreamChatTransport`)
   - Chat response rendered with AI SDK `TextStreamChatTransport`
2. `/api/events` SSE route handler:
   - Stream agent lifecycle events (tool calls, progress, errors) in real-time
   - Events sourced from gateway `agent` events
3. Classify gateway events:
   - `agent` events → SSE `/api/events` feed
   - `chat` events with `state: “delta”` → response stream
   - `chat` events with `state: “final”` → task complete
4. The API route intercepts `chat` events with `state: ‘final’` and extracts token counts, cost, model, and latency. Writes to `usage_events` hypertable.
5. **Concurrent sessions per user:** When a user sends a second task while the first is running, use OpenClaw’s queue mode. Default: `collect` — new messages are batched and delivered after the current task completes.
6. Write tests: full message round-trip, event streaming, auth rejection

### External References

- [OpenClaw WebSocket protocol](https://docs.openclaw.ai/gateway/protocol)
- [AI SDK TextStreamChatTransport](https://ai-sdk.dev)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Verification Checklist

- [ ] POST `/api/chat` relays message to gateway and returns streamed response
- [ ] GET `/api/events` streams agent lifecycle events via SSE
- [ ] Unauthenticated requests to `/api/chat` are rejected
- [ ] Message from frontend reaches gateway (verify in gateway logs)
- [ ] Agent response flows back to frontend via TextStreamChatTransport
- [ ] Tool call events visible in SSE event stream
- [ ] Bearer token auth is used for HTTP `/v1/chat/completions`
- [ ] Multiple users can interact simultaneously
- [ ] `usage_events` table has rows after a task completes
- [ ] All tests pass

---

## Stage 2.5: Clarification Mechanism

### Goal

Allow the agent to request clarification from the user mid-task, using the exec approval pattern — no new event types needed.

### Dependencies

- Stage 2.2 complete (chat + events API routes)

### Steps

1. Create a custom OpenClaw plugin package (`extensions/clarification-tool/`) following the same pattern as `memory-timescaledb`. The plugin uses `api.registerTool()` to register the `request_clarification` tool with the gateway. The tool’s `execute()` function triggers an exec approval event via `callGatewayTool('exec.approval.request', ...)` and waits for resolution.
2. Implement `request_clarification` as a custom tool registered on the gateway:
   - Tool accepts `{ question: string, options?: string[] }` as input
   - When the agent calls this tool, the gateway emits an exec approval event (the same pattern used for tool execution approval)
   - The API route intercepts this event and forwards a clarification prompt to the frontend via SSE
3. Frontend displays the clarification prompt to the user (interactive prompt UI implemented in Phase 4)
4. User’s response is sent back through the API route to the gateway, which provides it as the tool result
5. **Important:** The `clarification.requested` event type does NOT exist in OpenClaw. This implementation reuses the existing exec approval flow — the gateway broadcasts a tool approval request, and the Next.js app recognizes `request_clarification` as a special case requiring user input rather than auto-approval. The control plane inspects the tool name in the exec approval event. If the tool name is `request_clarification`, it routes to the frontend as a clarification prompt. All other exec approvals are handled normally (auto-approved or denied based on tool policy)
6. **Clarification timeout reaper:** The control plane runs a periodic reaper (every 60s) that checks for timed-out clarification requests. If a clarification has been pending longer than the timeout (default 5 min), the Next.js app sends a timeout response to the gateway, freeing the agent to abort gracefully. This prevents stuck agents from consuming gateway capacity.
7. Write tests: agent requests clarification, user responds, agent continues with the answer

### External References

- [OpenClaw tool approval](https://docs.openclaw.ai/gateway/configuration#exec-approval)
- [OpenClaw custom tools](https://docs.openclaw.ai/tools/plugin)

### Verification Checklist

- [ ] `request_clarification` tool registered on gateway
- [ ] Agent calling the tool triggers exec approval event (not a custom event type)
- [ ] Control plane intercepts and forwards clarification to frontend
- [ ] User response flows back to agent as tool result
- [ ] Agent continues task with clarification answer
- [ ] Timeout: if user doesn’t respond within configurable window, agent proceeds with a default
- [ ] Timed-out clarification releases the agent slot (verify gateway agent count doesn’t grow with stuck clarifications)
- [ ] This stage must be complete before Phase 4 frontend can show interactive prompts
- [ ] All tests pass

---

## Stage 2.3: memory-timescaledb Plugin

### Goal

Build an OpenClaw memory plugin that stores vector embeddings in TimescaleDB via pgvector, replacing the default file-based memory (`memory-core`) and LanceDB-based vector memory (`memory-lancedb`). Note: `memory-core` is file-based (not SQLite), and `memory-lancedb` uses LanceDB (not SQLite). `memory-timescaledb` replaces both by providing pgvector-backed vector search.

### Dependencies

- Stage 2.1 complete
- Phase 0 benchmarks confirm pgvector works

### Steps

```mermaid
graph TB
    subgraph "Plugin Architecture"
        REG["Register as exclusive\nmemory slot plugin"]
        TOOLS["Register tools:\nmemory_recall\nmemory_store\nmemory_forget"]
        HOOKS["Register hooks:\nbefore_agent_start (auto-recall)\nagent_end (auto-capture)"]
        CLI["Register CLI:\nltm list / search / stats"]
    end

    subgraph "TimescaleDB Backend"
        TABLE["memory_chunks table\n(agent_id, chunk, embedding,\nsource_file, created_at)"]
        RLS["RLS policy:\nagent_id scoping"]
        IDX["pgvectorscale index:\nStreamingDiskANN"]
    end

    REG --> TOOLS --> HOOKS --> CLI
    TOOLS --> TABLE
    TABLE --> RLS
    TABLE --> IDX
```

1. Study the existing `memory-lancedb` plugin structure:
   - `extensions/memory-lancedb/index.ts` (676 LOC reference)
   - `extensions/memory-lancedb/config.ts` (180 LOC reference)
2. Create `extensions/memory-timescaledb/` following the same pattern
3. Implement `TimescaleMemoryDB` class:
   - `init()` — create table if not exists, with RLS policy
   - `store(agentId, chunks[])` — insert with embeddings
   - `search(agentId, query, limit)` — pgvector similarity search with `WHERE agent_id = $1`
   - `delete(agentId, filter)` — delete by agent_id + filter
   - `count(agentId)` — count chunks for agent
4. Implement embedding generation (reuse OpenAI embeddings provider or make configurable). The embedding provider is configurable via env var `EMBEDDING_MODEL` (default: `text-embedding-3-small` at 1536 dimensions). The `vector(1536)` column dimension must match the model. If switching models, re-index is required. Add `EMBEDDING_MODEL` and `EMBEDDING_API_KEY` to the env var inventory.
5. Register tools: `memory_recall`, `memory_store`, `memory_forget` (matching `memory-lancedb`’s tool names — NOT `memory_search`/`memory_get` from `memory-core`)
6. Register hooks: `before_agent_start` (auto-recall), `agent_end` (auto-capture)
7. Register CLI commands: `ltm list`, `ltm search`, `ltm stats`
8. Configure as exclusive memory slot: `plugins.slots.memory: "memory-timescaledb"`
9. **Critical: every query MUST scope by agent_id. RLS policy allows own rows + `__shared__` rows.** Policy: `USING (agent_id = current_setting('app.agent_id') OR agent_id = '__shared__')` — enforce in code AND via RLS
   > **Note:** The `memory-timescaledb` plugin generates embeddings in application code (not via pgai). If pgai is available locally, it can be used for auto-vectorizing the shared intelligence layer (crawled_pages) in a future phase, but the memory plugin does not depend on it.
10. **Implement a shared knowledge indexer:** On startup and on file change (via chokidar), read all files from the shared knowledge directory (`/mnt/tigerfs/knowledge/`), chunk them, generate embeddings, and insert/update rows in `memory_chunks` with `agent_id = '__shared__'`. The control plane runs this indexer (not individual gateways) to avoid duplicate indexing.
11. Write comprehensive tests: store/search/delete, agent isolation, concurrent access

### External References

- [OpenClaw plugin docs](https://docs.openclaw.ai/tools/plugin)
- [OpenClaw memory concepts](https://docs.openclaw.ai/concepts/memory)
- [pgvector usage](https://github.com/pgvector/pgvector#usage)
- [pgvectorscale DiskANN](https://github.com/timescale/pgvectorscale)

### Verification Checklist

- [ ] Plugin registers as exclusive memory slot
- [ ] `memory_recall` returns relevant results from TimescaleDB
- [ ] `memory_store` persists chunks with embeddings to TimescaleDB
- [ ] `memory_forget` deletes specific memories
- [ ] Auto-recall injects relevant memories before agent starts
- [ ] Auto-capture stores conversation facts after agent ends
- [ ] **Agent A cannot search Agent B’s memories** (RLS enforced)
- [ ] **Every SQL query includes `WHERE agent_id`** (code review)
- [ ] CLI commands work: `ltm list`, `ltm search`, `ltm stats`
- [ ] Performance: search latency < 100ms for 10K chunks
- [ ] Gateway with memory-timescaledb has no SQLite files on disk
- [ ] Files dropped in knowledge/ directory are searchable by any agent via memory_recall
- [ ] All tests pass

---

## Stage 2.6: LLM Key Pool Configuration

### Goal

Configure multiple LLM API keys with fallback strategy to avoid rate limits and single-key failures.

### Dependencies

- Stage 2.1 complete (single gateway running)

### Steps

OpenClaw handles key rotation natively. This stage is about CONFIGURING the key pool, not building custom rotation code.

1. Configure multiple auth profiles in `auth-profiles.json`:
   - Multiple Anthropic API keys (for load distribution)
   - Multi-provider fallback: Anthropic → OpenAI → other providers
2. Test that OpenClaw rotates between them on rate limits
3. Verify fallback to secondary provider works
4. Store key pool configuration on TigerFS so all gateways share the same pool

### External References

- [OpenClaw auth profiles](https://docs.openclaw.ai/gateway/configuration#auth-profiles)
- [OpenClaw multi-provider](https://docs.openclaw.ai/concepts/models)

### Verification Checklist

- [ ] Multiple auth profiles configured in `auth-profiles.json`
- [ ] OpenClaw rotates between keys on rate limits
- [ ] Fallback to secondary provider works when primary is exhausted
- [ ] Key pool config shared across gateways via TigerFS
- [ ] All tests pass

---

## Stage 2.4: End-to-End Validation

### Goal

Complete round-trip: user authenticates → sends task → agent works → result delivered.

### Dependencies

- Stages 2.1, 2.2, 2.3 complete

### Steps

```mermaid
sequenceDiagram
    actor User
    participant FE as Test Client
    participant API as Next.js API Routes
    participant BA as better-auth
    participant DB as TimescaleDB
    participant GW as Gateway
    participant TFS as TigerFS

    User->>API: Sign up
    API->>BA: Create account
    BA->>DB: User record
    API->>DB: Assign to gateway
    API->>GW: Create agent (agents.create)

    User->>API: POST /api/chat (sendMessage)
    API->>API: Validate auth, generate session key + idempotencyKey
    API->>GW: chat.send
    GW->>GW: Agent processes
    GW->>TFS: Session JSONL written
    GW->>API: Response
    API->>FE: TextStreamChatTransport response
    FE->>User: "4"

    Note over GW: Agent writes to MEMORY.md via TigerFS
    Note over DB: memory-timescaledb indexes the memory
```

1. Run the full flow manually first, then automate as an integration test
2. Verify every piece of data lands in the right place:
   - User record in TimescaleDB (via better-auth)
   - User-gateway mapping in TimescaleDB
   - Agent workspace on TigerFS
   - Session JSONL on TigerFS
   - Memory embeddings in TimescaleDB (via memory-timescaledb plugin)
3. Verify event stream contains expected events:
   - `agent` events during processing
   - `chat` event with final result
4. Verify gateway usage tracking returns correct token counts

### Verification Checklist

- [ ] User signup → gateway assignment → agent creation works end-to-end
- [ ] User sends message → receives correct response
- [ ] Session transcript exists on TigerFS (verifiable via SQL)
- [ ] Memory embeddings exist in TimescaleDB
- [ ] Event stream contains `agent` progress events
- [ ] Event stream contains `chat` final result
- [ ] `/usage` returns non-zero token count
- [ ] Second message in same session retains context
- [ ] All data in TimescaleDB, nothing on local disk (except gateway process itself)
- [ ] Integration test passes end-to-end
