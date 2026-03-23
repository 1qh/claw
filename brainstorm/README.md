# Agent-Native SaaS Framework — Built on OpenClaw

## Motivation

An **open source framework** for building agent-native SaaS where the product IS the agent. Users fire a task, walk away, get notified when done.

[OpenClaw](https://openclaw.ai) provides the agent runtime, memory, scheduling, file handling, and usage tracking. The framework wraps it in a thin control plane (auth, routing, security, billing) — eliminating traditional backend infrastructure. Deployers use this to ship agent-native SaaS for any domain.

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
- [**Versioning**](versioning.md) — rolling out config changes across all gateways via shared config directory
- [**Backup**](backup.md) — git-based daily workspace backup to GitHub
- [**Feedback**](feedback.md) — ratings, redo mechanism, and agent learning
- [**Reliability**](reliability.md) — auto-recovery, health checks, no formal SLA at launch
- [**Agent-Native Paradigm**](agent-native.md) — CLIs as backend, knowledge as files, instructions as markdown, bun as runtime
- [**Data Layer**](data-layer.md) — PostgreSQL + workspace, no overlap, no stale data, real-time streaming
- [**Key Pool**](key-pool.md) — LLM API key rotation, coding plans, multi-provider failover
- [**Tech Stack**](tech-stack.md) — opinionated choices: Bun, TypeScript, Drizzle, PostgreSQL, and what's excluded
