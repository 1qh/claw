# Claw — Agent-Native SaaS Framework

## The Problem

Build SaaS products where the product IS the agent. Users fire a task, walk away, come back when notified. No dashboards, no forms, no learning curve.

## Hard Requirements (from experiment)

1. **Full audit chain** — every step traceable: user input → tool calls → tool results → reasoning → response
2. **No upstream black boxes** — if we can't observe it, we can't ship it
3. **Observability IS the product** — the live feed is the trust mechanism
4. **Enterprise grade** — every response must be explainable and reproducible

## Architecture

```
pi-agent-core (agent loop, full event stream)
  + pi-ai (multi-provider LLM abstraction)
  + Custom tools (web search, domain-specific)
  + E2B sandbox per user (isolated micro-VM)
  + Next.js app (auth, chat UI, live feed, file explorer)
```

## Why This Stack

### pi-agent-core + pi-ai
- Same engine powering OpenClaw (29K stars, used by thousands)
- Full event system: tool_execution_start/end with actual result content
- Tool results split into `content` (LLM sees) and `details` (UI only)
- Compaction built in (long-running tasks)
- Multi-turn tool chaining (agent loops until done)
- beforeToolCall/afterToolCall hooks
- MIT licensed, 205+ releases

### E2B Sandboxes
- Firecracker micro-VMs (same tech as AWS Lambda)
- Full Linux per user: bash, filesystem, network
- Volumes for persistent storage across sessions
- Snapshot/resume with auto-pause (pay only when active)
- Per-second billing (~$0.10/hr default)
- Open source, self-hostable
- Used by Perplexity, Hugging Face, Manus, Groq

### What We Build
- Next.js app: auth, chat, live event feed, file explorer
- Custom tools: web search (DuckDuckGo), domain-specific per deployer
- Event streaming: pi-agent-core events → SSE → frontend
- Session persistence: postgres for chat history, E2B volumes for workspace

## What We Don't Build
- Agent loop (pi-agent-core)
- LLM abstraction (pi-ai)
- Sandbox infrastructure (E2B)
- Compaction (pi-agent-core)
- Tool chaining (pi-agent-core)

## Experiment Lessons

### OpenClaw was a detour
OpenClaw wraps pi-agent-core with a gateway that hides the event stream. We spent weeks fighting the gateway to get observability that the underlying engine already provides natively.

### TigerFS v0.6.0 is unstable
Breaking changes in FUSE write model, schema migrations, TLS enforcement. Not ready for production SaaS infrastructure.

### The gateway is the bottleneck
HTTP `/v1/chat/completions` doesn't emit tool events. WS operator connections don't include tool result content. The full audit chain exists in pi-agent-core but OpenClaw's gateway filters it out.

## Open Questions

- How to communicate between Next.js app and pi-agent-core running in E2B? (RPC mode over stdin/stdout via E2B process API)
- Memory across sessions? (workspace files in E2B volume, or postgres with pgvector)
- Cron/scheduled tasks? (server-side timer triggers agent prompt in sandbox)
- Cost model for deployers? (E2B per-second billing pass-through + margin)
- pi-agent-core API stability? (pre-1.0, 6 minor versions in 13 days)

## Proven

- [x] pi-agent-core runs with Ollama
- [x] Custom tools (web_search) work
- [x] Full event stream: tool calls + tool results + text streaming
- [x] Zero OpenClaw dependency
