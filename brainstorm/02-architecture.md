# Architecture: 1 User = 1 Gateway = 1 Container

## Core Principle

Every user gets their own dedicated OpenClaw gateway running in an isolated container with a persistent volume. Maximum isolation, maximum scalability.

## Identity Model

Dead simple:

```
1 email = 1 user = 1 gateway = 1 container = 1 persistent volume
```

No multi-email. No shared accounts. No teams (for now). Just one email per user.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Messaging Channels"
        WA[WhatsApp]
        TG[Telegram]
        SL[Slack]
        DC[Discord]
    end

    subgraph "Control Plane (lightweight, always-on)"
        AUTH[Auth Service<br/>OAuth / Magic Link]
        ROUTER[Message Router]
        ORCH[Container Orchestrator]
        METER[Billing / Metering]
    end

    subgraph "User Containers (1 per user)"
        subgraph "alice@company.com"
            GW1[OpenClaw Gateway]
            VOL1[(Persistent Volume<br/>USER.md, MEMORY.md,<br/>sessions/, memory/)]
        end
        subgraph "bob@gmail.com"
            GW2[OpenClaw Gateway]
            VOL2[(Persistent Volume<br/>USER.md, MEMORY.md,<br/>sessions/, memory/)]
        end
        subgraph "carol@startup.io"
            GW3[OpenClaw Gateway]
            VOL3[(Persistent Volume<br/>USER.md, MEMORY.md,<br/>sessions/, memory/)]
        end
    end

    WA & TG & SL & DC --> ROUTER
    ROUTER --> AUTH
    AUTH --> ROUTER
    ROUTER --> ORCH
    ORCH --> GW1 & GW2 & GW3
    METER -.->|tracks usage| ORCH
```

## Container Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Provisioning: User signs up
    Provisioning --> Active: Container + volume created
    Active --> Idle: No tasks for N minutes
    Idle --> Suspended: Idle timeout exceeded
    Suspended --> Active: New task arrives
    Active --> Active: Task running
    Idle --> Active: New task arrives
```

## Task Flow

```mermaid
sequenceDiagram
    actor User
    participant Channel as WhatsApp/Telegram/etc.
    participant CP as Control Plane
    participant Container as User's Gateway Container

    User->>Channel: "Generate my weekly report"
    Channel->>CP: Inbound message
    CP->>CP: Auth: identify user (email)
    CP->>CP: Lookup: email → container

    alt Container suspended
        CP->>Container: Boot from persistent volume
        Note over Container: ~2-5s cold start
    end

    CP->>Container: Forward task
    Container->>Container: Agent works autonomously
    Note over Container: User can watch readonly live feed

    Container->>CP: Task complete + result
    CP->>Channel: Deliver result
    Channel->>User: "Here's your weekly report"
```

## Why 1:1 (Not Multi-Agent Packing)

We evaluated packing multiple user-agents onto shared gateways. OpenClaw's multi-agent feature does provide true isolation (separate workspaces, memory, sessions, auth, tool policies). However:

| | 1:1 Container | Multi-Agent Packed |
|---|---|---|
| **Isolation** | Complete (OS-level) | Shared Node.js process |
| **Failure blast radius** | 1 user | N users |
| **Resource fairness** | Guaranteed per container | Best-effort, shared event loop |
| **Security** | Container boundary | Trust the app code |
| **Scaling** | Add containers | Rebalance agents across gateways |
| **Complexity** | Simple — vanilla OpenClaw | Custom routing, affinity, rebalancing |
| **Cold start** | ~2-5s (acceptable for fire-and-forget) | Instant |

**Verdict:** 1:1 wins for maximum scalability and isolation. The cold start penalty is negligible for the fire-and-forget use case.

## Cost Optimization

Most containers will be idle most of the time (fire-and-forget = bursts, not constant load).

| Strategy | How |
|---|---|
| **Scale to zero** | Suspend containers after idle timeout (Fly.io Machines, Knative, AWS Fargate) |
| **Persistent volumes** | Workspace survives container restarts; memory never lost |
| **Cold start optimization** | Pre-warmed container images, workspace on fast SSD |
| **Tiered infra** | Active users → dedicated containers; inactive users → fully suspended |
| **Resource limits** | Free tier gets less CPU/RAM, premium gets more |

## What Lives Where

```mermaid
graph TB
    subgraph "Control Plane (the only shared state)"
        DB["Minimal Store (basically 1 table)<br/>email → container_id, volume_id,<br/>status, channels, created_at, last_active_at"]
    end

    subgraph "User's Persistent Volume (source of truth)"
        UM["USER.md — profile, preferences"]
        SM["SOUL.md — agent personality (shared template)"]
        AM["AGENTS.md — operating instructions (shared template)"]
        MM["MEMORY.md — long-term learned knowledge"]
        DM["memory/YYYY-MM-DD.md — daily logs"]
        SS["sessions/ — full task history (JSONL)"]
        WF["workspace files — anything agent creates"]
    end

    DB -->|"provisions & routes to"| UM
```

## No Traditional Backend

The gateway IS the database. No Postgres, no Redis, no migrations, no ORM.

**What we avoid:**
- No data model design — agent organizes its own data through markdown
- No migration hell — workspace files evolve naturally
- No sync problems — one source of truth (the workspace)
- No API layer for CRUD — agent reads/writes its own workspace
- No backup complexity — back up the volume, you've backed up everything

**What the backend actually does:**
1. Auth — verify identity (OAuth, magic link)
2. User → Container mapping — route traffic
3. Container lifecycle — boot, suspend, health check
4. Message relay — channels ↔ correct container
5. Billing/metering — track usage

**Risks to monitor:**
- Volume durability — need reliable backups, volume loss = user loses everything
- Cross-user analytics — can't SQL across workspaces; solve with lightweight telemetry at control plane
- GDPR/compliance — actually simpler: delete volume = delete everything
