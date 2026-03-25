# Phase 0: Infrastructure Experimentation

## Goal

Validate every risky assumption before writing production code. If anything fails here, we rethink the architecture before investing.

## Overview

```mermaid
graph TB
    subgraph "Experiments"
        E1["0.1 TimescaleDB\nLocal Setup"]
        E2["0.2 TigerFS\nMount + Basic Ops"]
        E3["0.3 OpenClaw\non TigerFS"]
        E4["0.4 Benchmarks\nAppend + Watch + Scale"]
    end

    E1 --> E2 --> E3 --> E4
```

---

## Environment Variables Inventory

All environment variables needed across the system. Variables marked ✅ are implemented in `packages/env/src/env.ts`; others are planned for future phases or used only inside Docker containers.

| Variable                | Purpose                                                           | Example                                         | Status |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ------ |
| `DATABASE_URL`          | TimescaleDB connection string (or PgBouncer in production)        | `postgresql://user:pass@localhost:5433/uniclaw` | ✅     |
| `OPENCLAW_MODEL`        | Ollama model ID for the gateway agent                             | `qwen3.5:9b-q4_K_M`                             | ✅     |
| `GATEWAY_PASSWORD`      | Gateway auth (Bearer token for HTTP, password for WS operator)    | `uniclaw-dev`                                   | ✅     |
| `GATEWAY_HOST`          | Gateway hostname (default: `localhost`)                           | `localhost`                                     | ✅     |
| `GATEWAY_PORT`          | Gateway port (default: `18789`)                                   | `18789`                                         | ✅     |
| `GATEWAY_CONTAINER`     | Docker container name for gateway                                 | `claw-gateway-1`                                | ✅     |
| `TIMESCALEDB_CONTAINER` | Docker container name for TimescaleDB                             | `claw-timescaledb-1`                            | ✅     |
| `AUTH_GOOGLE_ID`        | Google OAuth client ID                                            | (from Google Cloud Console)                     | ✅     |
| `AUTH_GOOGLE_SECRET`    | Google OAuth client secret                                        | (from Google Cloud Console)                     | ✅     |
| `VERBOSE_LOGS`          | Enable verbose logging for events SSE (default: `false`)          | `true`                                          | ✅     |
| `BETTER_AUTH_SECRET`    | better-auth session signing secret (read by better-auth directly) | (generated)                                     | env    |
| `OPENCLAW_STATE_DIR`    | Gateway state directory (Docker only, set in gateway-init.sh)     | `/mnt/tigerfs/state/`                           | Docker |
| `TIGERFS_MOUNT_PATH`    | TigerFS mount point (Docker only)                                 | `/mnt/tigerfs`                                  | Docker |
| `CLAMAV_URL`            | ClamAV REST API endpoint                                          | `http://localhost:3310`                         | Future |
| `ANTHROPIC_API_KEY`     | LLM API key (when using Anthropic instead of Ollama)              | `sk-ant-...`                                    | Future |
| `OPENAI_API_KEY`        | LLM API key (when using OpenAI instead of Ollama)                 | `sk-...`                                        | Future |
| `EMBEDDING_MODEL`       | Embedding model for memory-timescaledb plugin                     | `text-embedding-3-small`                        | Future |
| `EMBEDDING_API_KEY`     | API key for embedding provider                                    | `sk-...`                                        | Future |

---

## Stage 0.1: TimescaleDB Local Setup

### Goal

Run TimescaleDB locally with pgvector and pgvectorscale extensions.

### Dependencies

- Docker installed

### Steps

1. Create a `docker-compose.yml` with TimescaleDB image including pgvector
2. Start the container, verify PostgreSQL is accessible
3. Enable pgvector and pgvectorscale extensions
4. Create a test table with a vector column
5. Insert test embeddings, run a similarity query
6. ~~Verify pgai is available~~ — RESOLVED (Phase 0.1): pgai installs and works on self-hosted TimescaleDB (timescale/timescaledb-ha:pg18). Not Cloud-only.

### External References

- [TimescaleDB self-hosted install](https://www.tigerdata.com/docs/self-hosted/latest/install)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvectorscale GitHub](https://github.com/timescale/pgvectorscale)
- [pgai GitHub](https://github.com/timescale/pgai)
- [TimescaleDB Docker image](https://hub.docker.com/r/timescale/timescaledb-ha)

### Verification Checklist

- [x] TimescaleDB container running and accessible on localhost
- [x] `CREATE EXTENSION vector` succeeds — vector 0.8.2
- [x] `CREATE EXTENSION vectorscale` succeeds — vectorscale 0.9.0
- [x] Insert + KNN query on vector column returns correct results
- [x] pgai extension available on self-hosted TimescaleDB (timescale/timescaledb-ha:pg18) — not Cloud-only
- [ ] `CREATE EXTENSION pg_textsearch` succeeds — pre-installed in timescaledb-ha:pg18. Verify BM25 index creation: `CREATE INDEX ON test_table USING bm25 (content)` and query: `SELECT * FROM test_table ORDER BY content <@> 'test query' LIMIT 5`
- [x] Hypertable creation succeeds on a test table — timescaledb 2.25.2
- [x] Compression policy can be applied to hypertable
- [ ] PgBouncer (transaction pooling mode): install, verify `SET LOCAL app.agent_id` persists within a transaction, verify `SET ROLE` works per-transaction, verify RLS policy using `current_setting('app.agent_id')` returns correct rows through PgBouncer. This validates the RLS model before Phase 7 depends on it.

---

## Stage 0.2: TigerFS Mount + Basic Operations

### Goal

Mount TimescaleDB via TigerFS and verify basic file operations.

### Dependencies

- Stage 0.1 complete

### Steps

1. Install TigerFS on local machine
2. Mount the local TimescaleDB instance via TigerFS
3. Create a “markdown,history” app via `.build/`
4. Write a markdown file with YAML frontmatter, verify it appears as a row
5. Read the file back, verify content matches
6. Append to a file, verify append works
7. Check `.history/` — verify version history is tracked
8. Test pipeline queries (`.by/`, `.filter/`, `.export/`)
9. Test bulk import via `.import/`
10. Test concurrent writes from two terminals

### External References

- [TigerFS docs](https://tigerfs.io/docs)
- [TigerFS GitHub](https://github.com/timescale/tigerfs)

### Platform Note

TigerFS uses FUSE on Linux and NFS on macOS. Benchmark results may differ between platforms. Run Phase 0 benchmarks on Linux (matching production target). macOS developers can use Docker for TimescaleDB + TigerFS in a Linux container, or accept NFS-mode differences for local dev.

### Verification Checklist

- [x] TigerFS mount succeeds — verified on FUSE (Linux Docker). NFS on macOS has limitations (no dot-prefixed entries).
- [x] File write creates a row in TimescaleDB (verify via SQL)
- [x] File read returns correct content
- [x] File append works correctly (content grows, not replaced)
- [x] `.history/` shows timestamped versions after edits
- [x] Pipeline queries return correct filtered results
- [x] `.import/.append/csv` ingests data correctly
- [x] Two concurrent writes from different terminals don’t corrupt data
- [x] Rename to new target works on TigerFS FUSE
- [x] Rename over existing target fails with EIO on TigerFS FUSE — fixed via LD_PRELOAD shim (`tigerfs-rename-shim.c`)
- [x] File delete removes the row from TimescaleDB
- [x] Directory creation and listing work as expected

---

## Stage 0.3: OpenClaw on TigerFS

### Goal

Run a single OpenClaw gateway with its workspace on TigerFS. Validate that OpenClaw’s core operations work correctly.

### Dependencies

- Stage 0.2 complete
- OpenClaw installed (`npm install -g openclaw@latest`)

### Steps

```mermaid
graph TB
    A["Install OpenClaw"] --> B["Create workspace on TigerFS"]
    B --> C["Point OPENCLAW_STATE_DIR to TigerFS"]
    C --> D["Start gateway"]
    D --> E["Send a message, verify agent responds"]
    E --> F["Check session JSONL written to TigerFS"]
    F --> G["Check MEMORY.md writes"]
    G --> H["Test file watcher — edit SOUL.md externally"]
    H --> I["Test O_NOFOLLOW — verify no errors"]
```

1. Create workspace directory structure on TigerFS mount:
   ```
   /mnt/tigerfs/test-workspace/
     SOUL.md
     AGENTS.md
     USER.md
   ```
2. Configure OpenClaw to use TigerFS paths:
   - `OPENCLAW_STATE_DIR` → TigerFS path
   - `agents.defaults.workspace` → TigerFS path
3. Start gateway, send a test message via CLI
4. Verify agent responds correctly
5. Check that session JSONL was written to TigerFS path
6. Verify `MEMORY.md` and `memory/` files are written to TigerFS
7. Edit `SOUL.md` externally (from another terminal), verify OpenClaw detects the change via hot-reload
8. Check logs for any `O_NOFOLLOW`, `ELOOP`, or `symlink` errors
9. Run multiple conversations, verify sessions accumulate correctly
10. Kill the gateway, restart, verify it picks up existing sessions from TigerFS

### External References

- [OpenClaw getting started](https://docs.openclaw.ai/start/getting-started)
- [OpenClaw agent workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw configuration](https://docs.openclaw.ai/gateway/configuration)

### Verification Checklist

- [x] Gateway starts with workspace on TigerFS — verified with runtime patch (PR #53326 pending for native support)
- [x] Agent responds to messages correctly
- [x] Session JSONL files appear on TigerFS (verifiable via SQL)
- [x] Memory files (MEMORY.md, memory/\*.md) written to TigerFS
- [x] Hot-reload triggers when SOUL.md is edited externally
- [x] No `O_NOFOLLOW` or symlink errors in logs
- [x] Gateway restart picks up existing sessions from TigerFS
- [x] Auth profiles (auth-profiles.json) read/write correctly from TigerFS
- [x] `/usage` command returns correct token counts
- [x] Ollama integration working
- [ ] Cron job (if configured) executes and persists results to TigerFS

---

## Stage 0.4: Benchmarks

### Goal

Quantify performance to validate or invalidate the architecture.

### Dependencies

- Stage 0.3 complete

### Steps

```mermaid
graph TB
    subgraph "Benchmark Suite"
        B1["JSONL Append Latency\n(session writes)"]
        B2["File Read Latency\n(workspace bootstrap)"]
        B3["File Watch Latency\n(config hot-reload)"]
        B4["Concurrent Agent Load\n(multi-agent simulation)"]
    end
```

#### Benchmark 1: JSONL Append Latency

- Write a script that appends lines to a JSONL file on TigerFS
- Measure latency per append at file sizes: 1KB, 10KB, 100KB, 500KB, 1MB
- Compare against local filesystem baseline
- Run 1000 appends, report p50, p95, p99 latencies

#### Benchmark 2: File Read Latency

- Read workspace bootstrap files (SOUL.md, AGENTS.md, USER.md, MEMORY.md) from TigerFS
- Measure latency per read at file sizes: 1KB, 10KB, 50KB, 100KB
- Compare against local filesystem baseline
- Run 1000 reads, report p50, p95, p99 latencies

#### Benchmark 3: File Watch Latency

- Start a chokidar watcher on a TigerFS directory
- Write a file from another process
- Measure time from write to watcher event firing
- Run 100 write-watch cycles, report latencies

#### Benchmark 4: Cross-Mount Change Detection

- Write a file directly to TimescaleDB via SQL (simulating write from another host)
- Measure time until TigerFS mount reflects the change (via stat or chokidar)
- Report detection latency

#### Benchmark 5: Concurrent Multi-Agent Simulation

- Configure OpenClaw with 5, 10, 15, 20 agents on one gateway
- Send simultaneous messages to different agents
- Measure response latency per agent
- Monitor memory usage and CPU
- Report at what agent count performance degrades

### Verification Checklist

- [x] JSONL append p95 latency: 7ms @ 500KB (target was <50ms)
- [x] File read p95 latency: 2ms @ 100KB (target was <20ms)
- [x] File watch p50 latency: 5ms, 80% detection rate (target was <500ms)
- [x] Cross-mount change detection: 28ms (target was <1s)
- [ ] 10 concurrent agents: response latency within 2x of single-agent baseline
- [ ] 20 concurrent agents: response latency within 3x of single-agent baseline
- [x] Memory usage: gateway ~700MB RSS
- [ ] No data corruption under concurrent load
- [x] All benchmark results documented with exact numbers

### Optimization Gate

Benchmark results inform tuning, not architecture decisions. If any benchmark underperforms:

- **Append latency high** → tune TigerFS config or TimescaleDB WAL settings
- **Watch latency high** → accept polling interval or add explicit refresh on config writes
- **Multi-agent degradation** → reduce agents per gateway (tune `max_agents` default)
