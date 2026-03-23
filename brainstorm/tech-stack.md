# Tech Stack

This framework is opinionated. Deployers adopt these choices as-is.

## Core

| Choice | Role |
|---|---|
| [Bun](https://bun.sh/) | Runtime — native TypeScript, `bunx` for CLI execution, 30-40% less memory than Node.js |
| TypeScript + ESM | Language — same everywhere (framework, control plane, deployer CLIs) |
| [OpenClaw](https://openclaw.ai) | Agent runtime — [multi-gateway per host](https://docs.openclaw.ai/gateway/multiple-gateways) via `--profile` |
| `bunx cli@latest` | Tool execution — deployer's backend as npm CLIs, always latest |

## Data

| Choice | Role |
|---|---|
| [TimescaleDB](https://www.timescale.com/) | PostgreSQL + time-series + [pgvector](https://github.com/pgvector/pgvector) + [pgvectorscale](https://github.com/timescale/pgvectorscale) — one database for everything shared |
| [Drizzle](https://orm.drizzle.team/) | ORM — type-safe, SQL-like |

## Auth & Billing

| Choice |
|---|
| [better-auth](https://www.better-auth.com/) |
| Stripe |

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
| OS user separation | Per-gateway isolation |
| systemd / PM2 | Process management, auto-restart |
| Git + GitHub | Config sync + workspace backup |

## Excluded

| What | Replaced By |
|---|---|
| Docker / Kubernetes | OS user isolation |
| Redis | TimescaleDB |
| S3 | Local workspace + TimescaleDB for shared data |
| Elasticsearch / Algolia | TimescaleDB FTS + pgvector |
| Message queues | OpenClaw gateway |
| REST API frameworks | WebSocket proxy in control plane |
| MongoDB | TimescaleDB JSONB |
