# Versioning & Updates: Rolling Out Changes Across All Gateways

## What Changes and How Often

In a deployed instance, agent behavior is iterated constantly — daily or multiple times a day:

- [`SOUL.md`](https://docs.openclaw.ai/concepts/agent-workspace) — agent personality, tone, boundaries
- `AGENTS.md` — operating instructions, workflows
- [Tool policies](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated) — what tools are enabled/disabled

These are product-level files shared across ALL users. They must update instantly across all gateways.

**Per-user files (`USER.md`, [`MEMORY.md`](https://docs.openclaw.ai/concepts/memory), `memory/`, `sessions/`) are never touched by updates.**

## Solution: Shared Config Directory

```mermaid
graph LR
    GH[GitHub Repo<br/>source of truth] -->|system cron: git pull| DIR["/shared-config/<br/>(local directory)"]

    DIR -->|read by| G1[Gateway 1]
    DIR -->|read by| G2[Gateway 2]
    DIR -->|read by| G3[Gateway 3]
    DIR -->|read by| GN[Gateway N]
```

### How It Works

1. Shared config files live in a GitHub repo (version controlled, auditable, rollbackable)
2. A system-level cron job runs `git pull` in `/shared-config/` every minute
3. All gateway processes on the host read from `/shared-config/`
4. OpenClaw reads `SOUL.md`, `AGENTS.md` from this shared path
5. When the file changes on disk, OpenClaw detects it and hot-reloads

### Update Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant Cron as System Cron (git pull)
    participant Dir as /shared-config/
    participant GW as All Gateways

    Dev->>GH: git push (update SOUL.md)
    Note over Cron: Runs every minute
    Cron->>GH: git pull
    GH->>Dir: Updated file on disk
    Dir->>GW: All gateways read new file
    Note over GW: OpenClaw detects file change → hot-reload
```

Properties: zero fan-out, zero per-gateway work, no restart (hot-reload), rollback via git revert.

### Workspace Layout Per Gateway

```
/shared-config/          ← shared directory (read-only)
  SOUL.md                ← product agent personality
  AGENTS.md              ← product operating instructions
  tool-policies.json     ← product tool restrictions

/workspace/              ← per-user workspace directory (read-write)
  USER.md                ← user profile, preferences
  MEMORY.md              ← user long-term memory
  memory/                ← user daily logs
  sessions/              ← user task history
  uploads/               ← user uploaded files
```

### Stopped Gateways

Get the latest version automatically when they start.

### Alternatives Considered and Rejected

| Approach | Why Rejected |
|---|---|
| Bake into process startup script | Too slow for frequent iteration — restart all processes every time |
| GitHub webhook → fan-out to gateways | Per-gateway work, control plane complexity |
| Agent fetches from URL per task | Burns tokens, adds latency, fragile |
| OpenClaw [cron](https://docs.openclaw.ai/automation/cron-jobs) job to git pull | LLM cost per gateway per interval |
| Git clone in workspace + periodic pull | Polling, per-gateway work |
| Entrypoint fetch + webhook restart | Restart required, slower |

