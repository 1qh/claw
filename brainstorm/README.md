# Uniclaw — Agent-Native SaaS Framework Built on OpenClaw

## Motivation

Most SaaS products force users to operate machines — dashboards, forms, settings, navigation. But for a category of SaaS where users only care about outcomes, all that UI is friction.

This is an **open source framework** for building agent-native SaaS products where the product IS the agent. Users fire a task, walk away, and come back when notified. No dashboard to learn. No settings to configure. No process to follow. Just outcomes.

[OpenClaw](https://openclaw.ai) provides the agent runtime, memory, scheduling, file handling, and usage tracking out of the box. The framework wraps it in a thin control plane that handles auth, routing, security, and billing — eliminating the need for traditional backend infrastructure (databases, queues, file storage, search, etc.). Deployers use this framework to build and ship their own agent-native SaaS for any domain.

## Table of Contents

### Concept
- [**Vision**](concept/vision.md) — the fire-and-forget agent-native SaaS concept
- [**Agent-Native Paradigm**](concept/agent-native.md) — CLIs as backend, knowledge as files, instructions as markdown, bun as runtime
- [**Boundaries**](concept/boundaries.md) — what uniclaw is and is NOT good for
- [**SaaS Simplification**](concept/saas-simplification.md) — what OpenClaw eliminates vs what the deployer still builds

### Architecture
- [**Overview**](architecture/overview.md) — multi-agent per gateway, fully stateless via TigerFS, isolation model, identity as email
- [**Data Layer**](architecture/data.md) — TimescaleDB + TigerFS, no overlap, no stale data, real-time streaming, unified storage
- [**Security**](architecture/security.md) — 7-layer defense in depth, blocking threats before they reach OpenClaw, isolation audit
- [**Scaling**](architecture/scaling.md) — multi-host orchestration with Nomad, 10K users target

### Stack
- [**Decisions**](stack/decisions.md) — opinionated choices: Bun, TypeScript, Drizzle, TimescaleDB, and what's excluded
- [**Capabilities**](stack/capabilities.md) — exhaustive inventory of every feature in every tool we use

### Features
- [**Personalization**](features/personalization.md) — why memory is core, how OpenClaw's workspace handles it
- [**Feedback**](features/feedback.md) — ratings, redo mechanism, and agent learning
- [**Error Handling**](features/error-handling.md) — infrastructure reliability, agent-level failures, clarification mechanism
- [**File Handling**](features/file-handling.md) — uploads, validation, antivirus, workspace storage
- [**Observability**](features/observability.md) — leveraging OpenClaw's native usage tracking, billing integration
- [**Key Pool**](features/key-pool.md) — LLM API key rotation, coding plans, multi-provider failover

### Operations
- [**Reliability**](operations/reliability.md) — auto-recovery, health checks, no formal SLA at launch
- [**Versioning**](operations/versioning.md) — rolling out config changes across all gateways instantly via TigerFS
- [**Backup**](operations/backup.md) — TigerFS `.history/` for versioning, `pg_dump` for disaster recovery
- [**Maintenance**](operations/maintenance.md) — OpenClaw updates, workspace cleanup, host ops

### Deferred
- [**Deferred Features**](deferred.md) — OpenClaw features available but not configured in MVP

### Deployer
- [**Experience**](deployer/experience.md) — template repo, frontend hooks, what deployers configure vs what's pre-built
- [**Open Questions**](deployer/open-questions.md) — signup flow, CLI env access, local dev, gateway capacity management
