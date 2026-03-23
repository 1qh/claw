# Deferred Features (Post-MVP)

OpenClaw features that are available but not configured or tested in the framework MVP. Deployers can enable these independently.

| Feature | Notes |
|---|---|
| Cron job configuration and UI | OpenClaw supports cron natively; MVP defers user-facing scheduling UI |
| Standing orders | Persistent background directives for agents |
| Lobster deterministic workflows | Structured, repeatable task execution |
| Subagent orchestration | Multi-agent delegation within a single user's context |
| OpenClaw HTTP APIs for third-party integration | `/v1/chat/completions`, `/tools/invoke` |
| Trusted-proxy auth for enterprise SSO | Pass-through authentication for enterprise deployments |
| Canvas / A2UI interactive elements | Rich interactive UI elements rendered by the agent |
| Agent-to-agent messaging | Cross-agent communication within a gateway |
| Admin dashboard UI | Operator uses OpenClaw Control UI per-gateway for now |
| Shared intelligence layer | `crawled_pages` with pgai auto-vectorization for shared knowledge |
