# Agent-Native SaaS Framework — Built on OpenClaw

## Motivation

Most SaaS products force users to operate machines — dashboards, forms, settings, navigation. But for a category of SaaS where users only care about outcomes, all that UI is friction.

This is an **open source framework** for building agent-native SaaS products where the product IS the agent. Users fire a task, walk away, and come back when notified. No dashboard to learn. No settings to configure. No process to follow. Just outcomes.

[OpenClaw](https://openclaw.ai) provides the agent runtime, memory, scheduling, file handling, and usage tracking out of the box. The framework wraps it in a thin control plane that handles auth, routing, security, and billing — eliminating the need for traditional backend infrastructure (databases, queues, file storage, search, etc.). Deployers use this framework to build and ship their own agent-native SaaS for any domain.

## Table of Contents

- [**Vision**](vision.md) — the fire-and-forget agent-native SaaS concept
- [**Personalization**](personalization.md) — why memory is core, how OpenClaw's workspace handles it
- [**Architecture**](architecture.md) — 1 user = 1 gateway process, multi-gateway per host, isolation model
- [**Identity**](identity.md) — email as the universal key, control plane data model
- [**Security**](security.md) — 7-layer defense in depth, blocking threats before they reach OpenClaw
- [**File Handling**](file-handling.md) — uploads, validation, antivirus, workspace storage
- [**Observability**](observability.md) — leveraging OpenClaw's native usage tracking, billing integration
- [**SaaS Simplification**](saas-simplification.md) — what OpenClaw eliminates vs what the deployer still builds
- [**Error Handling**](error-handling.md) — infrastructure reliability, agent-level failures, clarification mechanism
- [**Versioning**](versioning.md) — rolling out config changes across all gateways instantly via TigerFS
- [**Backup**](backup.md) — TigerFS `.history/` for versioning, `pg_dump` for disaster recovery
- [**Feedback**](feedback.md) — ratings, redo mechanism, and agent learning
- [**Reliability**](reliability.md) — auto-recovery, health checks, no formal SLA at launch
- [**Agent-Native Paradigm**](agent-native.md) — CLIs as backend, knowledge as files, instructions as markdown, bun as runtime
- [**Data Layer**](data-layer.md) — TimescaleDB + workspace, no overlap, no stale data, real-time streaming
- [**Key Pool**](key-pool.md) — LLM API key rotation, coding plans, multi-provider failover
- [**Tech Stack**](tech-stack.md) — opinionated choices: Bun, TypeScript, Drizzle, TimescaleDB, and what's excluded
- [**Maintenance**](maintenance.md) — OpenClaw updates, workspace cleanup, host ops
- [**TigerFS**](tigerfs.md) — mount TimescaleDB as filesystem, unify all storage into one system
- [**Stack Capabilities**](stack-capabilities.md) — exhaustive inventory of every feature in every tool we use
