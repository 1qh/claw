# Versioning & Updates: Rolling Out Changes Across All Gateways

## What Changes and How Often

At a startup, agent behavior is iterated constantly — daily or multiple times a day:

- `SOUL.md` — agent personality, tone, boundaries
- `AGENTS.md` — operating instructions, workflows
- Tool policies — what tools are enabled/disabled

These are product-level files shared across ALL users. They must update instantly across all gateways.

**Per-user files (`USER.md`, `MEMORY.md`, `memory/`, `sessions/`) are never touched by updates.**

## Solution: Shared Network Volume

```mermaid
graph LR
    GH[GitHub Repo<br/>source of truth] -->|git push triggers sync| VOL[(Shared Network Volume<br/>EFS / NFS / GCS Filestore)]

    VOL -->|read-only mount| C1[Container 1]
    VOL -->|read-only mount| C2[Container 2]
    VOL -->|read-only mount| C3[Container 3]
    VOL -->|read-only mount| CN[Container N]
```

### How It Works

1. Shared config files live in a GitHub repo (version controlled, auditable, rollbackable)
2. A single sync process keeps one network volume in sync with the repo
3. All containers mount that volume as a read-only path (e.g., `/shared-config/`)
4. OpenClaw reads `SOUL.md`, `AGENTS.md` from the mounted path
5. When the file changes on the volume, OpenClaw detects it and hot-reloads

### Update Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant Sync as Sync Process
    participant Vol as Shared Volume
    participant GW as All Gateways

    Dev->>GH: git push (update SOUL.md)
    GH->>Sync: Webhook or poll trigger
    Sync->>Vol: Write updated file
    Vol->>GW: All mounts see new file instantly
    Note over GW: OpenClaw detects file change → hot-reload
```

### Why This Is Optimal

| Property | |
|---|---|
| **Write operations** | One (to the shared volume) |
| **Fan-out** | Zero (filesystem handles distribution) |
| **Per-container work** | Zero (no sync, no pull, no webhook handler) |
| **Latency** | Near-instant (NFS/EFS propagation) |
| **Polling** | None |
| **Restart required** | No (OpenClaw hot-reloads on file change) |
| **Version control** | Git history |
| **Rollback** | Git revert → sync → all gateways rolled back |
| **Scales with containers** | Adding containers just means another mount point |

### Workspace Layout Per Container

```
/shared-config/          ← shared network volume (read-only)
  SOUL.md                ← product agent personality
  AGENTS.md              ← product operating instructions
  tool-policies.json     ← product tool restrictions

/workspace/              ← per-user persistent volume (read-write)
  USER.md                ← user profile, preferences
  MEMORY.md              ← user long-term memory
  memory/                ← user daily logs
  sessions/              ← user task history
  uploads/               ← user uploaded files
```

### Suspended Containers

Suspended containers don't need updating — they have no mount. When they boot and mount the shared volume, they automatically get the latest version. No special handling.

### Alternatives Considered and Rejected

| Approach | Why Rejected |
|---|---|
| Bake into container image | Too slow for frequent iteration — rebuild + rolling restart every time |
| Kubernetes ConfigMap | Propagation delay (up to 60s), K8s-specific |
| GitHub webhook → fan-out to containers | Per-container work, control plane complexity |
| Agent fetches from URL per task | Burns tokens, adds latency, fragile |
| OpenClaw cron job to git pull | LLM cost per container per interval |
| Git clone in container + periodic pull | Polling, per-container work |
| Entrypoint fetch + webhook restart | Restart required, slower |
