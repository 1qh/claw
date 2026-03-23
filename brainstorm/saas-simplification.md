# SaaS Simplification: What OpenClaw Already Solves

## Single Channel: Web App Only

```mermaid
graph LR
    USER[User] --> WEB[Web App]
    WEB -->|WebSocket via Control Plane| GW[User's Gateway]
```

One frontend talking to the gateway's [WebSocket API](https://docs.openclaw.ai/gateway/protocol). No multi-channel routing.

## What OpenClaw Eliminates

Typical SaaS components the deployer does NOT need to build:

| Component | How OpenClaw Replaces It |
|---|---|
| **Onboarding** | Agent conversations populate `USER.md` |
| **Settings UI** | User tells agent preferences → `USER.md` + [`MEMORY.md`](https://docs.openclaw.ai/concepts/memory) |
| **Task queue** | Gateway IS the task runner |
| **Cron** | Built-in [cron](https://docs.openclaw.ai/automation/cron-jobs) |
| **Search** | Hybrid vector + BM25 over memory |
| **File storage** | Workspace directory |
| **Audit trail** | [Session transcripts](https://docs.openclaw.ai/concepts/session) (append-only JSONL) |
| **Notifications** | WebSocket event stream |
| **Reporting** | Agent queries its own sessions |
| **i18n** | LLM handles it natively |
| **Data export** | Agent packages workspace files |
| **GDPR deletion** | Delete workspace directory |
| **Help / Support** | The agent IS the support |

## What the Deployer Still Builds

```mermaid
graph TB
    subgraph "Deployer Builds"
        AUTH["Auth\n(signup, login, OAuth)"]
        BILLING["Billing\n(Stripe, usage-based)"]
        CP["Control Plane\n(process management, routing)"]
        GATE["Security Gate\n(7-layer validation)"]
        FE["Frontend\n(chat, live feed, notifications, usage)"]
        LANDING["Landing Page / Marketing"]
        ADMIN["Admin Dashboard\n(operator view)"]
    end

    subgraph "OpenClaw Handles"
        AGENT["Agent Runtime"]
        MEMORY["Memory & Personalization"]
        TASKS["Task Execution"]
        SEARCH["Search"]
        CRON["Scheduling"]
        FILES["File Storage"]
        AUDIT["Audit Trail"]
        USAGE["Usage Tracking"]
        EXPORT["Data Export"]
    end
```


