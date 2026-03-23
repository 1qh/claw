# Backup & Disaster Recovery: Git-Based Workspace Backup

## Core Principle

Each user's workspace is a git repo. Auto-commit and push to GitHub daily. Free, version-controlled, rollbackable.

## How It Works

```mermaid
graph LR
    subgraph "User's Container"
        WS[Workspace Volume<br/>USER.md, MEMORY.md,<br/>sessions/, memory/, uploads/]
        GIT[Local Git Repo]
    end

    WS --> GIT
    GIT -->|daily push| GH[(GitHub Private Repo<br/>one per user)]
```

1. Each user's workspace is initialized as a git repo
2. A daily cron job (system-level, not LLM) runs `git add . && git commit && git push`
3. Each user has their own private repo under a GitHub org (e.g., `your-org/ws-<user-hash>`)
4. Full version history of every workspace change

## What Gets Backed Up

| Content | Backed Up | Notes |
|---|---|---|
| `USER.md` | Yes | User profile and preferences |
| `MEMORY.md` | Yes | Long-term agent memory |
| `memory/` | Yes | Daily logs |
| `sessions/` | Yes | Full task history (JSONL) |
| `uploads/` | Yes | User-uploaded files (within size limits) |
| `SOUL.md` | No | Shared config, lives in shared volume |
| `AGENTS.md` | No | Shared config, lives in shared volume |

## Why GitHub

- **Free** — unlimited private repos on free plan
- **Version history** — full git log of every change, diffable
- **Rollback** — restore to any point in time with `git checkout`
- **Disaster recovery** — volume dies? `git clone` and the workspace is back
- **No extra infrastructure** — no snapshot service, no S3, no backup jobs to manage

## Rate Limits (Not a Problem)

GitHub allows 500 content-generating requests per hour. Daily pushes:

| Users | Pushes/Day | Pushes/Hour | Within Limit? |
|---|---|---|---|
| 100 | 100 | ~4 | Yes |
| 1,000 | 1,000 | ~42 | Yes |
| 5,000 | 5,000 | ~208 | Yes |
| 10,000 | 10,000 | ~417 | Yes |

Even at 10,000 users with daily pushes, well within limits. Stagger push times across the day for safety.

## Storage Limits

GitHub recommends repos under 1GB, hard limit at 5GB. File uploads capped at 100MB per file.

For workspace files (markdown, JSONL, small uploads), 1GB per user is plenty. The file validation gate enforces upload size limits, so this is controlled.

## Recovery Flow

```mermaid
sequenceDiagram
    participant OP as Operator
    participant CP as Control Plane
    participant GH as GitHub
    participant C as New Container

    Note over OP: Volume lost or corrupted

    OP->>CP: Restore user alice@company.com
    CP->>GH: git clone your-org/ws-alice-hash
    GH->>C: Full workspace restored
    CP->>C: Mount restored volume, boot gateway
    Note over C: User loses at most ~24h of work
```

## Worst Case Data Loss

- Daily push at midnight → volume dies at 11pm → lose ~23 hours of work
- Acceptable tradeoff for a startup — free backup with no infrastructure
- If needed later, increase push frequency (every 6h, every hour) while staying within rate limits

## Scaling Beyond GitHub

If GitHub becomes a bottleneck (unlikely with daily pushes):

| Scale | Strategy |
|---|---|
| 0-10,000 users | GitHub — free, simple |
| 10,000+ users | Self-hosted Gitea (no rate limits) or volume snapshots ($0.05/GB/month) |

## References

### OpenClaw Documentation
- [OpenClaw — Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace) — workspace layout and file structure
- [OpenClaw — Session Management](https://docs.openclaw.ai/concepts/session) — session transcript storage (JSONL)
- [OpenClaw — Memory](https://docs.openclaw.ai/concepts/memory) — memory files and daily logs

### Infrastructure
- [GitHub — Repository Limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits) — size and rate limits
- [GitHub — Rate Limits for REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) — content-generation request limits
- [Gitea](https://gitea.io/) — self-hosted Git service (for scaling beyond GitHub limits)
- [AWS EBS Snapshot Pricing](https://aws.amazon.com/ebs/pricing/) — volume snapshot costs
- [GCP Disk Pricing](https://cloud.google.com/compute/disks-image-pricing) — snapshot and disk costs
