# Tech Stack

This framework is opinionated. Deployers adopt these choices as-is.

## Core

| Choice | Role |
|---|---|
| [Bun](https://bun.sh/) | Runtime — native TypeScript, `bunx` for CLI execution, 30-40% less memory than Node.js |
| [Elysia](https://elysiajs.com/) | HTTP/WebSocket framework — Bun-native, end-to-end type safety, better-auth adapter |
| TypeScript + ESM | Language — same everywhere (framework, control plane, deployer CLIs) |
| [OpenClaw](https://openclaw.ai) | Agent runtime — [multi-gateway per host](https://docs.openclaw.ai/gateway/multiple-gateways) via `--profile` |
| `bunx cli@latest` | Tool execution — deployer's backend as npm CLIs, always latest |

## Data

| Choice | Role |
|---|---|
| [TimescaleDB](https://www.timescale.com/) | PostgreSQL + hypertables + compression + continuous aggregates + [pgvector](https://github.com/pgvector/pgvector) + [pgvectorscale](https://github.com/timescale/pgvectorscale) + [pgai](https://github.com/timescale/pgai) + background jobs |
| [TigerFS](https://tigerfs.io/) | Mount TimescaleDB as filesystem — agents read/write files, database handles the rest |
| [Drizzle](https://orm.drizzle.team/) | ORM for control plane (auth, billing, routing) |

## Auth & Billing

| Choice | Role |
|---|---|
| [better-auth](https://www.better-auth.com/) | Authentication |
| Stripe | Billing |

## Security

| Choice | Role |
|---|---|
| [hai-guardrails](https://github.com/presidio-oss/hai-guardrails) | Input validation — heuristic + LLM guards |
| [AI SDK](https://ai-sdk.dev) | Model-agnostic provider for LLM guards |
| [ClamAV](https://www.clamav.net/) | Antivirus — self-hosted via [`clamav-rest-api`](https://github.com/benzino77/clamav-rest-api) |
| [`file-type`](https://www.npmjs.com/package/file-type) | MIME sniffing from binary headers |

## Infrastructure

| Choice | Role |
|---|---|
| Linux VM | Host |
| PostgreSQL roles + RLS | Per-user data isolation (via TigerFS) |
| systemd / PM2 | Process management, auto-restart |

## Excluded

| What | Replaced By |
|---|---|
| Docker / Kubernetes | Process-level isolation |
| Redis | TimescaleDB |
| S3 | TigerFS + TimescaleDB |
| Elasticsearch / Algolia | TimescaleDB FTS + pgvector |
| Message queues | OpenClaw gateway |
| Express / Nest / Hono | Elysia (Bun-native, type-safe) |
| MongoDB | TimescaleDB JSONB |
| Separate embedding pipeline | pgai (auto-vectorize inside database) |
| External cron / job scheduler | TimescaleDB background jobs |
| Git sync for config | TigerFS (instant ACID writes) |
| GitHub backup per user | TigerFS `.history/` + `pg_dump` |
| OS user separation | PostgreSQL row-level security via TigerFS |
