# Phase 2: Gateway Integration

## Goal

Connect the control plane to an OpenClaw gateway. Proxy WebSocket traffic between the frontend and the gateway. Build the memory-timescaledb plugin.

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

1. Control plane spawns OpenClaw gateway via `Bun.spawn()` with:
   - `OPENCLAW_STATE_DIR` pointing to TigerFS
   - `agents.defaults.workspace` pointing to TigerFS
   - Unique port assignment
   - Gateway auth token for control plane connection
2. Control plane waits for gateway to be ready (poll `/health` or wait for WebSocket handshake)
3. Control plane connects to gateway via WebSocket (device identity + token auth)
4. Implement health check loop — periodic ping, restart on failure
5. Implement graceful shutdown — wait for active tasks, then kill
6. Write tests: start gateway, verify health, send message via gateway API, stop gateway, verify restart on crash

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
- [ ] All tests pass

---

## Stage 2.2: WebSocket Proxy

### Goal
Proxy WebSocket traffic from the frontend through the control plane to the correct gateway.

### Dependencies
- Stage 2.1 complete

### Steps

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (test client)
    participant CP as Control Plane
    participant GW as Gateway

    User->>FE: Connect
    FE->>CP: WebSocket /ws (auth token)
    CP->>CP: Validate auth, lookup user → gateway
    CP->>GW: Connect to gateway WebSocket
    Note over CP: Bidirectional proxy established

    User->>FE: "Generate my report"
    FE->>CP: Forward message
    CP->>GW: Forward to gateway (chat.send)

    GW->>CP: Agent events (progress, tool calls)
    CP->>FE: Forward events to frontend

    GW->>CP: Task complete (chat final)
    CP->>FE: Forward result
    FE->>User: Show result
```

1. When user connects to control plane WebSocket:
   - Authenticate via session token (better-auth)
   - Look up user's gateway assignment in TimescaleDB
   - Open a WebSocket connection to that gateway (using gateway auth token)
   - Establish bidirectional proxy: frontend ↔ control plane ↔ gateway
2. Forward all messages from frontend to gateway
3. Forward all events from gateway to frontend
4. Handle disconnections: if frontend disconnects, keep gateway connection alive (task continues). If gateway disconnects, notify frontend.
5. Classify gateway events for the frontend:
   - `agent` events → live feed
   - `chat` events with `state: "delta"` → live feed
   - `chat` events with `state: "final"` → task complete notification
   - `clarification.requested` → interactive prompt (future, placeholder)
6. Write tests: full message round-trip, event forwarding, disconnect handling

### External References
- [OpenClaw WebSocket protocol](https://docs.openclaw.ai/gateway/protocol)
- [Elysia WebSocket](https://elysiajs.com/patterns/websocket)

### Verification Checklist
- [ ] Frontend WebSocket connects to control plane with auth
- [ ] Control plane connects to correct gateway for the authenticated user
- [ ] Message from frontend reaches gateway (verify in gateway logs)
- [ ] Agent response events flow back to frontend
- [ ] Tool call events visible in event stream
- [ ] Frontend disconnect doesn't kill the gateway task
- [ ] Gateway disconnect notifies frontend
- [ ] Multiple users can connect simultaneously to different gateways
- [ ] All tests pass

---

## Stage 2.3: memory-timescaledb Plugin

### Goal
Build an OpenClaw memory plugin that stores vector embeddings in TimescaleDB via pgvector, replacing the default SQLite-based memory.

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
4. Implement embedding generation (reuse OpenAI embeddings provider or make configurable)
5. Register tools: `memory_recall`, `memory_store`, `memory_forget`
6. Register hooks: `before_agent_start` (auto-recall), `agent_end` (auto-capture)
7. Register CLI commands: `ltm list`, `ltm search`, `ltm stats`
8. Configure as exclusive memory slot: `plugins.slots.memory: "memory-timescaledb"`
9. **Critical: every query MUST include `WHERE agent_id = $1`** — enforce in code AND via RLS
10. Write comprehensive tests: store/search/delete, agent isolation, concurrent access

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
- [ ] **Agent A cannot search Agent B's memories** (RLS enforced)
- [ ] **Every SQL query includes `WHERE agent_id`** (code review)
- [ ] CLI commands work: `ltm list`, `ltm search`, `ltm stats`
- [ ] Performance: search latency < 100ms for 10K chunks
- [ ] Gateway with memory-timescaledb has no SQLite files on disk
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
    participant CP as Control Plane
    participant BA as better-auth
    participant DB as TimescaleDB
    participant GW as Gateway
    participant TFS as TigerFS

    User->>CP: Sign up
    CP->>BA: Create account
    BA->>DB: User record
    CP->>DB: Assign to gateway
    CP->>GW: Create agent (agents.add)

    User->>CP: WebSocket connect (auth)
    CP->>GW: Proxy WebSocket

    User->>CP: "What is 2+2?"
    CP->>GW: Forward message
    GW->>GW: Agent processes
    GW->>TFS: Session JSONL written
    GW->>CP: Response events
    CP->>FE: Forward events
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
