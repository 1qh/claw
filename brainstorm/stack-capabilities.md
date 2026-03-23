# Stack Capabilities: Deep Inventory

Exhaustive scan of every tool in our stack. Organized by what the framework can leverage now and what's available for future needs.

## [better-auth](https://better-auth.com/)

### Auth Methods
| Method | Status |
|---|---|
| Email & password | Core |
| Social OAuth (40+ providers — Google, GitHub, Microsoft, Apple, Discord, etc.) | Core |
| Magic links | Plugin |
| Passkeys | Plugin |
| OTP (email + phone) | Plugin |
| SAML SSO | Plugin |
| Sign In With Ethereum | Plugin |
| Anonymous auth (try-before-signup) | Plugin |
| Device authorization flow | Plugin |
| API key management | Plugin |
| Agent authentication | Plugin |
| Bearer token auth | Plugin |
| JWT | Plugin |

### Authorization & Multi-Tenancy
| Feature | Status |
|---|---|
| Organization management (teams, members) | Plugin |
| Role-Based Access Control (RBAC) | Plugin |
| Admin dashboard (user management) | Plugin |
| Multi-session support | Core |
| Account linking (merge social + email) | Plugin |
| Cross-subdomain session sharing | Config |

### Security
| Feature | Status |
|---|---|
| Built-in rate limiting (configurable windows) | Core |
| Captcha integration | Plugin |
| Have I Been Pwned breach checking | Plugin |
| Audit logging | Enterprise |
| Security monitoring (Sentinel) | Enterprise |

### Billing Integrations
| Integration | Status |
|---|---|
| Stripe | Plugin |
| Polar | Plugin |
| Autumn Billing | Plugin |
| Dodo Payments | Plugin |

### Developer Features
| Feature | Status |
|---|---|
| Drizzle adapter (native) | Core |
| CLI for migrations/schema | Core |
| MCP server (agents can manage auth) | Core |
| OpenAPI documentation | Plugin |
| Test utilities | Plugin |
| OAuth 2.1 Provider (be an IDP) | Plugin |
| OIDC Provider | Plugin |

### Framework Support
Next.js, Nuxt, SvelteKit, Astro, React Router v7, Solid Start, Express, Fastify, Hono, NestJS, Elysia, Encore, Convex, Electron, Expo, TanStack Start

### Hooks
Before/after hooks for every endpoint — request/response modification, cookie handling, background tasks.

---

## [Drizzle](https://orm.drizzle.team/)

### Query APIs
| Feature | Detail |
|---|---|
| SQL-like query builder | Full SQL compatibility — SELECT, JOIN, WHERE, GROUP BY, aggregates |
| Relational query API | `.query` interface — nested data fetching, always 1 SQL query regardless of depth |
| Dynamic query building | Composable queries at runtime |
| Set operations | UNION, INTERSECT, EXCEPT |
| Transactions | Full ACID |
| Batch operations | Bulk inserts/updates |
| Magic `sql` template | Raw SQL with type safety |

### Schema
| Feature | Detail |
|---|---|
| TypeScript-first schema declaration | `pgTable()` with full type inference |
| Row-Level Security (RLS) | Define PostgreSQL RLS policies in TypeScript |
| Generated columns | Computed columns |
| Sequences | ID generation |
| Views | Complex query views |
| Extensions | PostgreSQL extensions from schema |
| Indexes & constraints | Full support |

### Migration Tools (drizzle-kit)
| Command | What |
|---|---|
| `generate` | Auto-create migration files from schema changes |
| `migrate` | Execute pending migrations |
| `push` | Direct schema push — no migration files (fast iteration) |
| `pull` | Introspect existing database into schema |
| `export` | Export schema snapshots |
| `check` | Validate migration files |
| `studio` | Visual database browser |

### Validation Integration
| Library | Support |
|---|---|
| Zod | Generate validation schemas from DB schema |
| Valibot | Supported |
| TypeBox | Supported |
| ArkType | Supported |
| Effect Schema | Supported |

### Advanced
| Feature | Detail |
|---|---|
| Read replicas | Built-in routing to read replicas |
| Caching | Query result caching |
| Drizzle Studio | Web-based database management UI |
| Drizzle GraphQL | Auto-generate GraphQL from schema |
| Drizzle Proxy | Remote database connections |
| 0 dependencies, 31KB | Minimal footprint |

### Database Support
PostgreSQL, MySQL, SQLite, MSSQL, CockroachDB, SingleStore, Gel + Neon, Supabase, PlanetScale, Turso, Cloudflare D1, Vercel Postgres, AWS Data API, PGLite, Bun SQLite

---

## [AI SDK](https://ai-sdk.dev)

### Text & Structured Generation
| Function | What |
|---|---|
| `generateText` | Text generation |
| `streamText` | Streaming text generation |
| `generateObject` | Structured data with schema validation (Zod) |
| `streamObject` | Streaming structured data |

### Embeddings & Search
| Function | What |
|---|---|
| `embed` | Single text embedding |
| `embedMany` | Batch embeddings |
| `cosineSimilarity` | Vector similarity computation |
| `rerank` | Document relevance reordering |

### Media Generation
| Function | What |
|---|---|
| `generateImage` | Text-to-image (DALL-E, Fal AI, Fireworks, etc.) |
| `generateSpeech` | Text-to-speech |
| `transcribe` | Audio-to-text |
| `experimental_generateVideo` | Video generation |

### Agent Framework
| Feature | What |
|---|---|
| `ToolLoopAgent` | Agent with tool-calling loops |
| Subagents | Hierarchical agent composition |
| Memory | Persistent context across interactions |
| Workflow patterns | Sequential, parallel, conditional execution |
| Tool execution approval | Agent asks permission before running tools |
| Loop control | Flow management and termination |

### Tools
| Feature | What |
|---|---|
| `tool` | Basic tool definition |
| `dynamicTool` | Runtime-configurable tools |
| Tool streaming | Real-time tool execution feedback |
| Multi-step tool handling | Automatic roundtrip management |
| MCP client | Discover and call MCP server tools |

### Middleware
| Middleware | What |
|---|---|
| `wrapLanguageModel` | Model-level middleware |
| `extractReasoningMiddleware` | Extract reasoning tokens |
| `simulateStreamingMiddleware` | Streaming for non-streaming models |
| `defaultSettingsMiddleware` | Configuration defaults |
| `extractJsonMiddleware` | JSON extraction from responses |
| Custom middleware | Build your own |

### Observability
| Feature | What |
|---|---|
| DevTools | Browser-based LLM call inspector — input, output, tokens, timing, raw requests |
| OpenTelemetry | Built-in tracing |
| Event callbacks | Lifecycle hooks |

### UI Hooks
| Hook | What |
|---|---|
| `useChat` | Conversational interface |
| `useCompletion` | Completion-style |
| `useObject` | Streaming object generation |
| `useStreamData` | Custom data streaming |
| Message persistence | Browser storage |
| Resume streams | Reconnection |
| Generative UI | Dynamic component streaming from LLM |

### Providers (20+)
Anthropic, OpenAI, Google, xAI Grok, Azure, Amazon Bedrock, Mistral, Cohere, DeepSeek, Perplexity, Groq, DeepInfra, Together.ai, Fireworks, Cerebras, Baseten, Fal AI, Luma AI, Vercel AI Gateway, custom providers

### Framework Support
Next.js (App/Pages Router), SvelteKit, Nuxt (Vue), Solid, Node.js, Expo, TanStack Start

---

## [hai-guardrails](https://github.com/presidio-oss/hai-guardrails)

### Guards (10)

| Guard | Modes | LLM Required |
|---|---|---|
| Injection Guard | Heuristic, Pattern, LLM | Optional |
| Leakage Guard | Heuristic, Pattern, LLM | Optional |
| PII Guard | Pattern matching | No |
| Secret Guard | Pattern + entropy | No |
| Toxic Guard | LLM | Yes |
| Hate Speech Guard | LLM | Yes |
| Bias Detection Guard | LLM | Yes |
| Adult Content Guard | LLM | Yes |
| Copyright Guard | LLM | Yes |
| Profanity Guard | LLM | Yes |

### Configuration
- Per-guard threshold values (0.0 - 1.0)
- Role-based filtering (e.g., only scan 'user' messages)
- Detection mode selection per guard
- Custom LLM provider for LLM-mode guards

### Architecture
- `GuardrailsEngine` — central orchestrator, chains multiple guards
- Detailed scoring and explanations per guard
- LangChain integration via `LangChainChatGuardrails`
- Provider-agnostic — any LLM for LLM-mode guards

---

## [TimescaleDB](https://www.timescale.com/) + [TigerFS](https://tigerfs.io/)

See [data-layer.md](data-layer.md) and [tigerfs.md](tigerfs.md) for full details.

### TimescaleDB
- Hypertables (auto time-partitioning)
- 90%+ compression on historical data
- Continuous aggregates (auto-refreshing materialized views)
- Real-time aggregates (continuous + latest raw data)
- Background jobs (built-in scheduler)
- [pgvector](https://github.com/pgvector/pgvector) + [pgvectorscale](https://github.com/timescale/pgvectorscale) (vector search at scale)
- [pgai](https://github.com/timescale/pgai) (auto-embed, semantic catalog, natural language to SQL)
- 100+ hyperfunctions (time-series analysis)
- Full PostgreSQL compatibility (FTS, JSONB, RLS, etc.)

### TigerFS
- Mount PostgreSQL as filesystem (FUSE on Linux, NFS on macOS)
- ACID transactions on every write
- Concurrent multi-agent access
- Pipeline queries via file paths (`.by/`, `.filter/`, `.order/`, `.export/`)
- Built-in version history (`.history/`)
- Bulk import/export (`.import/`, `.export/`)
- Schema management via staging (`.create/`, `.modify/`, `.delete/`)
- App creation (`.build/` — markdown with auto-typed columns)
- Ghost (instant throwaway databases)
- Fork (clone database with one command)
- Agent skills included

---

## [Bun](https://bun.sh/)

### Runtime APIs
| API | What |
|---|---|
| `Bun.serve()` | HTTP/WebSocket server with routing, TLS, cookies |
| `Bun.shell()` | Shell scripting API — run commands programmatically |
| `Bun.spawn()` / `Bun.spawnSync()` | Child process management with IPC |
| `Bun.file()` / `Bun.write()` | File I/O with MIME detection |
| `Bun.tar()` / `Bun.untarStream()` | Archive creation/extraction |
| `Bun.gzip()` / `Bun.deflate()` | Compression/decompression |
| `HTMLRewriter` | Transform HTML with CSS selectors (web crawling) |
| JSONL parser | Streaming newline-delimited JSON |
| Workers API | Multi-threaded JavaScript |

### Data Format Support (Built-in imports)
JSON5, TOML, YAML, Markdown (GFM), JSX/TSX — all importable directly.

### Package Manager
- 30x faster than npm
- `bunx` — execute npm packages without install (100x faster than npx)
- `bun audit` — security vulnerability scanning
- `bun patch` — persistently patch node_modules
- Workspaces + catalogs for monorepos
- Private registry support (.npmrc)

### Bundler & Compiler
- `bun build` — native bundler with code splitting, tree shaking, minification
- `bun compile` — standalone single-file executables from TypeScript
- Bytecode caching for faster startup
- Standalone HTML bundling (single-page apps)
- Macros (`bun:macro`) — run code at bundle-time

### Test Runner
- Jest-compatible with TypeScript-first
- Snapshots, mocking, DOM testing (happy-dom)
- Code coverage with thresholds
- Watch mode
- `setSystemTime()` — time manipulation in tests

### Deployment
Documented support for: AWS Lambda, Google Cloud Run, DigitalOcean, Railway, Render, Docker, PM2, systemd

---

## [OpenClaw](https://openclaw.ai) — Extended Capabilities

See [architecture.md](architecture.md) for core usage. Below are capabilities beyond basic agent runtime.

### Automation
| Feature | What |
|---|---|
| [Cron jobs](https://docs.openclaw.ai/automation/cron-jobs) | One-shot + recurring schedules, timezone support, per-job model/thinking overrides, delivery to channels/webhooks |
| [Standing orders](https://docs.openclaw.ai/automation/standing-orders) | Autonomous programs with approval gates, escalation rules, execute-verify-report pattern |
| [Heartbeat](https://docs.openclaw.ai/concepts/agent-workspace) | Periodic agent wakeup with system events |
| [Hooks](https://docs.openclaw.ai/concepts/agent-workspace) | 15+ event types (message received/sent, session compact, gateway startup, etc.) |

### Workflow Engine
| Feature | What |
|---|---|
| [Lobster](https://docs.openclaw.ai/tools/lobster) | Deterministic multi-step pipelines with approval gates, JSON piping, resume tokens, timeout enforcement |
| [llm-task](https://docs.openclaw.ai/tools/llm-task) | Structured LLM steps with JSON schema validation and thinking levels, composable with Lobster |
| [Subagents](https://docs.openclaw.ai/tools/subagents) | Hierarchical agent spawning with isolated sessions, announce-back delivery |

### HTTP API Endpoints
| Endpoint | What |
|---|---|
| `/v1/chat/completions` | [OpenAI-compatible API](https://docs.openclaw.ai/gateway/openai-http-api) — third-party tools can talk to agents |
| `/v1/responses` | [OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api) — richer input types, file/image support |
| `/tools/invoke` | [Direct tool invocation](https://docs.openclaw.ai/gateway/tools-invoke-http-api) — run tools without LLM call |
| `/hooks/agent` | [Webhook ingress](https://docs.openclaw.ai/automation/cron-jobs) — trigger agent tasks via HTTP |
| `/hooks/wake` | System events + heartbeat trigger |

### Security & Auth
| Feature | What |
|---|---|
| [Trusted-proxy auth](https://docs.openclaw.ai/gateway/trusted-proxy-auth) | Delegate auth to reverse proxy (Pomerium, Caddy, nginx) — enterprise SSO |
| [Exec approvals](https://docs.openclaw.ai/tools/exec-approvals) | Operator allowlist for host execution |
| [Elevated mode](https://docs.openclaw.ai/tools/elevated) | Sender-based approval for sensitive operations |
| [Tool loop detection](https://docs.openclaw.ai/tools/loop-detection) | Detect repeat patterns, ping-pong, no-progress loops |

### Memory & Retrieval
| Feature | What |
|---|---|
| Hybrid search | BM25 + vector similarity |
| MMR diversity re-ranking | Avoid redundant results |
| Temporal decay | Recent memories weighted higher |
| QMD sidecar | Advanced retrieval backend |
| Multiple embedding providers | OpenAI, Gemini, Voyage, Mistral, Ollama, GGUF |

### Web Interfaces (Built-in)
| Interface | What |
|---|---|
| [Control UI](https://docs.openclaw.ai/web/control-ui) | Full browser admin — chat, sessions, cron, skills, channels, config, logs, debug |
| [WebChat](https://docs.openclaw.ai/web/webchat) | Native chat client via WebSocket |
| [Dashboard](https://docs.openclaw.ai/web/dashboard) | Entry point UI with i18n (en, zh-CN, zh-TW, pt-BR, de, es) |
| [TUI](https://docs.openclaw.ai/web/tui) | Terminal UI |

### Media & Multimodal
| Feature | What |
|---|---|
| Image understanding | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI |
| Audio transcription | OpenAI, Groq, Deepgram, Google, Mistral + CLI fallbacks |
| Video understanding | Google, Moonshot |
| Text-to-speech | Multiple providers |
| [Diffs viewer](https://docs.openclaw.ai/tools/diffs) | Visual diff with PNG/PDF rendering |

### Advanced
| Feature | What |
|---|---|
| [Canvas / A2UI](https://docs.openclaw.ai/platforms/mac/canvas) | Interactive UI rendered by agent — forms, buttons, text inputs |
| [Agent-to-agent messaging](https://docs.openclaw.ai/tools/agent-send) | Inter-agent communication with explicit allowlists |
| [Polls](https://docs.openclaw.ai/tools/reactions) | Create polls on Telegram, WhatsApp, Discord, Teams |
| Queue modes | `steer` (inject into current run), `followup`, `collect` (batch + debounce) |
| 35+ model providers | Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, Ollama, vLLM, etc. |

---

## What We Get for Free (No Custom Code)

| Need | Provided By |
|---|---|
| Auth (all methods) | better-auth |
| Rate limiting | better-auth |
| Audit logging (auth events) | better-auth |
| API key management | better-auth |
| Billing (Stripe) | better-auth plugin |
| Admin user management | better-auth admin plugin |
| Anonymous / demo mode | better-auth anonymous plugin |
| Organization / teams | better-auth organization plugin |
| SSO (enterprise) | better-auth SAML plugin |
| Per-user data isolation (RLS) | Drizzle RLS + TimescaleDB |
| Database admin browser | Drizzle Studio |
| Schema validation | Drizzle + Zod |
| Read replicas | Drizzle built-in |
| Structured gate responses | AI SDK `generateText()` + `Output.object()` + Zod (block reason + category) |
| Embedding generation | pgai (auto-generates inside database) |
| Input validation (prompt injection, PII, etc.) | hai-guardrails |
| Usage analytics (cross-user) | TimescaleDB continuous aggregates |
| Auto-embedding sync | pgai Vectorizer |
| Cache cleanup / DB maintenance | TimescaleDB background jobs |
| Data compression | TimescaleDB compression |
| Version history | TigerFS `.history/` |
| Backup | `pg_dump` |
| HTTP/WebSocket server | `Bun.serve()` |
| Process management | `Bun.spawn()` + `Bun.shell()` |
| JSONL parsing (session transcripts) | Bun native JSONL |
| HTML transformation (crawling) | `HTMLRewriter` |
| Archive creation (data export) | `Bun.tar()` |
| Deterministic workflows | OpenClaw Lobster |
| Scheduled tasks | OpenClaw cron |
| Webhook ingress | OpenClaw `/hooks/agent` |
| OpenAI-compatible API | OpenClaw `/v1/chat/completions` |
| Direct tool invocation | OpenClaw `/tools/invoke` |
| Enterprise SSO (gateway) | OpenClaw trusted-proxy auth |
| Admin dashboard | OpenClaw Control UI |
| Agent orchestration | OpenClaw subagents |
| Autonomous programs | OpenClaw standing orders |
