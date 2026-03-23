# Architecture: 1 User = 1 Gateway Process

## Core Principle

Every user gets their own dedicated OpenClaw gateway process on a shared host. Process-level isolation via OS user separation, without the overhead of containers or orchestrators.

## Identity Model

Dead simple:

```
1 email = 1 user = 1 OS user = 1 gateway process = 1 workspace directory
```

No multi-email. No shared accounts. No teams (for now). Just one email per user.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Web App"
        FE[Frontend<br/>Chat + Live Feed + Notifications]
    end

    subgraph "Control Plane (single Bun process, always-on)"
        AUTH[Auth Service<br/>OAuth / Magic Link]
        ROUTER[WebSocket Router]
        PM[Process Manager]
        METER[Billing / Metering]
    end

    subgraph "Host Machine"
        subgraph "alice@company.com"
            GW1["OpenClaw Gateway :18789<br/>OS user: oc-alice"]
            WS1["/data/oc-alice/<br/>USER.md, MEMORY.md,<br/>sessions/, memory/"]
        end
        subgraph "bob@gmail.com"
            GW2["OpenClaw Gateway :18809<br/>OS user: oc-bob"]
            WS2["/data/oc-bob/<br/>USER.md, MEMORY.md,<br/>sessions/, memory/"]
        end
        subgraph "carol@startup.io"
            GW3["OpenClaw Gateway :18829<br/>OS user: oc-carol"]
            WS3["/data/oc-carol/<br/>USER.md, MEMORY.md,<br/>sessions/, memory/"]
        end

        SHARED["/shared-config/ (read-only)<br/>SOUL.md, AGENTS.md"]
        CLAM[ClamAV Daemon<br/>shared service]
    end

    FE --> ROUTER
    ROUTER --> AUTH
    AUTH --> ROUTER
    ROUTER --> PM
    PM --> GW1 & GW2 & GW3
    METER -.->|reads usage from disk| WS1 & WS2 & WS3
    SHARED -.->|read by| GW1 & GW2 & GW3
```

## How OpenClaw Supports This Natively

[OpenClaw's `--profile` flag](https://docs.openclaw.ai/gateway/multiple-gateways) provides built-in multi-gateway support on a single host:

```bash
openclaw --profile alice gateway --port 18789
openclaw --profile bob gateway --port 18809
openclaw --profile carol gateway --port 18829
```

Each profile gets fully isolated: config, state dir, workspace, sessions, memory, auth. OpenClaw handles all the path scoping — no custom code needed.

## Isolation Model

Three layers of isolation without containers:

```mermaid
graph TB
    subgraph "Layer 1: OS User Separation"
        A["Each gateway runs as a separate OS user<br/>oc-alice cannot read oc-bob's files<br/>Standard Unix filesystem permissions"]
    end

    subgraph "Layer 2: OpenClaw Profile Isolation"
        B["Each gateway has its own:<br/>OPENCLAW_CONFIG_PATH<br/>OPENCLAW_STATE_DIR<br/>agents.defaults.workspace<br/>gateway.port"]
    end

    subgraph "Layer 3: OpenClaw Tool Policy"
        C["Per-gateway tool restrictions<br/>tools.allow / tools.deny<br/>tools.exec.security<br/>Sandbox configuration"]
    end

    A --> B --> C
```

## Gateway Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Provisioning: User signs up
    Provisioning --> Active: OS user + workspace created, gateway started
    Active --> Idle: No tasks for N minutes
    Idle --> Stopped: Idle timeout exceeded, process killed
    Stopped --> Active: New task arrives, process started
    Active --> Active: Task running
    Idle --> Active: New task arrives
```

Starting a gateway process is fast (~1-2s) — much faster than booting a container.

## Task Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Web App
    participant CP as Control Plane
    participant GW as User's Gateway Process

    User->>FE: "Generate my weekly report"
    FE->>CP: WebSocket message
    CP->>CP: Auth: identify user (email)
    CP->>CP: Lookup: email → host:port

    alt Gateway stopped
        CP->>GW: Start process (~1-2s)
    end

    CP->>GW: Forward task via WebSocket
    GW->>GW: Agent works autonomously
    Note over GW: Events stream back via WebSocket

    GW->>CP: Task complete + result
    CP->>FE: Deliver result
    FE->>User: Notification + result
```

## Why Multiple Gateways Per Host (Not Containers)

Three approaches were evaluated:

| | Multi-Gateway Per Host | Containers (1:1) | Multi-Agent Packed |
|---|---|---|---|
| **Isolation** | OS user + process level | OS-level (cgroups) | Shared Node.js process |
| **Failure blast radius** | 1 user | 1 user | N users |
| **Security boundary** | Filesystem permissions | Container sandbox | Trust the app code |
| **Infrastructure** | One VM, no orchestrator | Docker/Kubernetes required | One gateway, custom routing |
| **Cold start** | ~1-2s (start process) | ~2-5s (boot container) | Instant |
| **Resource overhead** | Low — just Node.js processes | Higher — container runtime per user | Lowest — shared process |
| **Cost (100 users)** | ~$100-150/mo (one VM) | ~$300-500/mo (K8s + containers) | ~$100-150/mo (one VM) |
| **Complexity** | Low | High (K8s, images, networking) | Medium (custom routing) |
| **Scaling** | Add more VMs | Orchestrator handles it | Rebalance agents |
| **Native OpenClaw support** | Yes — built-in profiles | Deployer configures it | Yes — [multi-agent](https://docs.openclaw.ai/concepts/multi-agent) |

**Verdict:** Multi-gateway per host wins for early-stage deployments. Same isolation guarantees as containers (via OS users), dramatically simpler and cheaper. Migrate to containers later only if needed.

## Cost Projection

Most gateways will be idle most of the time (fire-and-forget = bursts, not constant load). Each active gateway uses ~50-100MB RAM.

| Users | Infrastructure | Est. Monthly Cost |
|---|---|---|
| 0-200 | 1 large VM (32GB RAM, 8 vCPU) | ~$100-150 |
| 200-500 | 2-3 VMs | ~$300-450 |
| 500-1000 | 5 VMs | ~$500-750 |
| 1000+ | Consider containers or keep adding VMs | Depends |

## Scaling: Adding Hosts

No load balancer needed. The control plane has a lookup table:

```
alice@co.com  → host-1:18789
bob@gmail.com → host-1:18809
carol@io.com  → host-2:18789
```

When a host fills up, add another VM and assign new users to it. The routing logic doesn't change — it's still email → host:port.

## What Lives Where

```mermaid
graph TB
    subgraph "Control Plane State (minimal)"
        DB["Lookup Table<br/>email → host, port, OS user,<br/>workspace_dir, status, created_at, last_active_at"]
    end

    subgraph "Shared Config (read-only, all gateways)"
        SC["SOUL.md — product agent personality<br/>AGENTS.md — product operating instructions<br/>tool-policies.json — product tool restrictions"]
    end

    subgraph "User Workspace (per user, isolated)"
        UM["USER.md — profile, preferences"]
        MM["MEMORY.md — long-term learned knowledge"]
        DM["memory/YYYY-MM-DD.md — daily logs"]
        SS["sessions/ — full task history (JSONL)"]
        UF["uploads/ — user uploaded files"]
    end

    DB -->|"routes to"| UM
    SC -->|"read by all gateways"| UM
```

## No Traditional Backend

The gateway IS the database. No Postgres, no Redis, no migrations, no ORM.

**What the framework avoids:**
- No data model design — agent organizes its own data through markdown
- No migration hell — workspace files evolve naturally
- No sync problems — one source of truth (the workspace)
- No API layer for CRUD — agent reads/writes its own workspace
- No backup complexity — daily git push to GitHub

**What the control plane actually does:**
1. Auth — verify identity (OAuth, magic link)
2. User → Gateway mapping — route WebSocket traffic
3. Process lifecycle — start, stop, health check
4. Message relay — frontend ↔ correct gateway
5. Billing/metering — read usage data from disk

## The Complete Stack On One Host

```
One Linux VM:
  ├── Control plane          (1 Bun process)
  ├── TimescaleDB            (1 system service)
  ├── TigerFS mount          (/mnt/tigerfs/ — all data)
  ├── ClamAV daemon          (1 system service)
  └── User gateway processes  (N OpenClaw processes, all read/write via TigerFS)
```

No per-user directories. No git sync. No separate backup infra. Just processes on a Linux box with [TigerFS](tigerfs.md) unifying all storage.

