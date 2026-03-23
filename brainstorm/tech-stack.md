# Tech Stack: Opinionated Choices

## Core Principle

This framework is opinionated. These are not suggestions — they are the stack. Deployers adopt them as-is.

## Runtime & Language

| Choice | What | Why |
|---|---|---|
| [Bun](https://bun.sh/) | Runtime | Fastest JavaScript runtime, 30-40% less memory than Node.js, native TypeScript, `bunx` for CLI execution |
| TypeScript | Language | Type safety, same language everywhere (framework, control plane, CLIs), OpenClaw is TypeScript |
| ESM | Module system | Modern standard, tree-shakeable, matches OpenClaw |

## Database & ORM

| Choice | What | Why |
|---|---|---|
| [PostgreSQL](https://www.postgresql.org/) | Database | Battle-tested, concurrent access, JSON support, extensible |
| [pgvector](https://github.com/pgvector/pgvector) + [pgvectorscale](https://github.com/timescale/pgvectorscale) | Vector search | Semantic search, reranking, embeddings — all inside PostgreSQL |
| [Drizzle](https://orm.drizzle.team/) | ORM | Type-safe, lightweight, SQL-like API, no magic |

## Auth & Billing

| Choice | What | Why |
|---|---|---|
| [better-auth](https://www.better-auth.com/) | Authentication | TypeScript-native, framework-agnostic, supports OAuth/magic link |
| Stripe | Billing | Industry standard, usage-based billing support |

## Agent Runtime

| Choice | What | Why |
|---|---|---|
| [OpenClaw](https://openclaw.ai) | Agent gateway | Multi-channel agent runtime with memory, tools, cron, usage tracking — the foundation |
| OpenClaw `--profile` | Multi-tenancy | [Native multi-gateway per host](https://docs.openclaw.ai/gateway/multiple-gateways), process-level isolation |
| `bunx cli@latest` | Tool execution | Deployer's backend as CLIs, always up to date, zero install |

## Security

| Choice | What | Why |
|---|---|---|
| [hai-guardrails](https://github.com/presidio-oss/hai-guardrails) | Input validation | TypeScript-native, heuristic + LLM guards, model-agnostic |
| [AI SDK](https://ai-sdk.dev) | Model provider for guards | Model-agnostic LLM calls, middleware pattern |
| [ClamAV](https://www.clamav.net/) | Antivirus | Self-hosted, open source, files never leave infra |

## File Handling

| Choice | What | Why |
|---|---|---|
| [`file-type`](https://www.npmjs.com/package/file-type) | MIME sniffing | Detect real file format from binary headers |
| [`clamav-rest-api`](https://github.com/benzino77/clamav-rest-api) | ClamAV interface | Simple REST API for scanning |

## Infrastructure

| Choice | What | Why |
|---|---|---|
| Linux VM | Host | Simple, no orchestrator needed |
| OS user separation | Isolation | Filesystem permissions per gateway, no containers |
| systemd / PM2 | Process management | Auto-restart, health checks |
| Git + GitHub | Config sync & backup | Version controlled, auditable, free |

## What Is NOT In the Stack

| Excluded | Why |
|---|---|
| Docker / Kubernetes | Over-engineering for early-stage, OS user isolation is sufficient |
| Redis | PostgreSQL handles caching |
| S3 | Workspace directories on local disk, PostgreSQL for shared data |
| Elasticsearch / Algolia | PostgreSQL FTS + pgvector covers search |
| Message queues (RabbitMQ, Kafka) | OpenClaw gateway is the task runner |
| REST API framework (Express, Nest, Hono) | Control plane is thin, no API surface beyond WebSocket proxy |
| Next.js / React frameworks | Frontend is a separate concern — framework provides the backend |
| MongoDB | PostgreSQL with JSONB covers all JSON storage needs |
