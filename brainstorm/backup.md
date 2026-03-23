# Backup & Disaster Recovery: Git-Based Workspace Backup

Each user's workspace is a git repo. Auto-commit and push to GitHub daily.

## How It Works

```mermaid
graph LR
    subgraph "User's Gateway Process"
        WS[Workspace Directory<br/>USER.md, MEMORY.md,<br/>sessions/, memory/, uploads/]
        GIT[Local Git Repo]
    end

    WS --> GIT
    GIT -->|daily push| GH[(GitHub Private Repo<br/>one per user)]
```

1. Each user's workspace is initialized as a git repo
2. A daily cron job (system-level, not LLM) runs `git add . && git commit && git push`
3. Each user has their own private repo under a GitHub org (e.g., `<deployer-org>/ws-<user-hash>`)
4. Full version history of every workspace change

## What Gets Backed Up

| Content | Backed Up | Notes |
|---|---|---|
| `USER.md` | Yes | User profile and preferences |
| [`MEMORY.md`](https://docs.openclaw.ai/concepts/memory) | Yes | Long-term agent memory |
| `memory/` | Yes | Daily logs |
| `sessions/` | Yes | Full task history (JSONL) |
| `uploads/` | Yes | User-uploaded files (within size limits) |
| [`SOUL.md`](https://docs.openclaw.ai/concepts/agent-workspace) | No | Shared config, lives in shared config directory |
| `AGENTS.md` | No | Shared config, lives in shared config directory |

## Why GitHub

- Free unlimited private repos
- Full version history, diffable, rollbackable
- Disaster recovery: `git clone` restores everything

## Rate Limits (Not a Problem)

GitHub allows 500 content-generating requests per hour. Daily pushes:

| Users | Pushes/Day | Pushes/Hour | Within Limit? |
|---|---|---|---|
| 100 | 100 | ~4 | Yes |
| 1,000 | 1,000 | ~42 | Yes |
| 5,000 | 5,000 | ~208 | Yes |
| 10,000 | 10,000 | ~417 | Yes |

Even at 10,000 users with daily pushes, well within limits.

## Storage Limits

GitHub: repos under 1GB recommended, 5GB hard limit, 100MB per file. Workspace files (markdown, JSONL, small uploads) fit easily.

## Recovery Flow

```mermaid
sequenceDiagram
    participant OP as Operator
    participant CP as Control Plane
    participant GH as GitHub
    participant GW as New Gateway Process

    Note over OP: Workspace lost or corrupted

    OP->>CP: Restore user alice@company.com
    CP->>GH: git clone your-org/ws-alice-hash
    GH->>GW: Full workspace restored
    CP->>GW: Start gateway process with restored workspace
    Note over GW: User loses at most ~24h of work
```

## Worst Case Data Loss

- Daily push at midnight → workspace lost at 11pm → lose ~23 hours of work
- Increase push frequency later if needed (every 6h, every hour) while staying within rate limits

## Scaling Beyond GitHub

If GitHub becomes a bottleneck (unlikely with daily pushes):

| Scale | Strategy |
|---|---|
| 0-10,000 users | GitHub — free, simple |
| 10,000+ users | Self-hosted [Gitea](https://gitea.io/) (no rate limits) or filesystem snapshots ($0.05/GB/month) |

