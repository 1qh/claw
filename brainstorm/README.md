# Agent-Native SaaS — Built on OpenClaw

## Motivation

Most SaaS products force users to operate machines — dashboards, forms, settings, navigation. But for a category of SaaS where users only care about outcomes, all that UI is friction.

This project explores building a SaaS where the product IS the agent. Users fire a task, walk away, and come back when notified. No dashboard to learn. No settings to configure. No process to follow. Just outcomes.

[OpenClaw](https://openclaw.ai) provides the agent runtime, memory, scheduling, file handling, and usage tracking out of the box. We wrap it in a thin control plane that handles auth, routing, security, and billing — eliminating the need for traditional backend infrastructure (databases, queues, file storage, search, etc.).

## Table of Contents

- [**Vision**](vision.md) — the fire-and-forget agent-native SaaS concept
- [**Personalization**](personalization.md) — why memory is core, how OpenClaw's workspace handles it
- [**Architecture**](architecture.md) — 1 user = 1 gateway process, multi-gateway per host, isolation model
- [**Identity**](identity.md) — email as the universal key, control plane data model
- [**Security**](security.md) — 7-layer defense in depth, blocking threats before they reach OpenClaw
- [**File Handling**](file-handling.md) — uploads, validation, antivirus, workspace storage
- [**Observability**](observability.md) — leveraging OpenClaw's native usage tracking, billing integration
- [**SaaS Simplification**](saas-simplification.md) — what OpenClaw eliminates vs what we still build
- [**Error Handling**](error-handling.md) — infrastructure reliability, agent-level failures, clarification mechanism
- [**Versioning**](versioning.md) — rolling out config changes across all gateways via shared volume
- [**Backup**](backup.md) — git-based daily workspace backup to GitHub
- [**Feedback**](feedback.md) — ratings, redo mechanism, and agent learning
