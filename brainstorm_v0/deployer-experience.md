# Deployer Experience

## Getting Started

Clone the template repo → configure → deploy.

```bash
git clone https://github.com/uniclaw/template my-saas
cd my-saas
# edit config, write SOUL.md, add CLIs
# deploy
```

## Template Repo Structure

```
my-saas/
  config/
    SOUL.md                ← agent personality and boundaries
    AGENTS.md              ← operating instructions
    auth-profiles.json     ← LLM API keys
  knowledge/               ← shared domain docs (deployer drops files here)
  skills/                  ← custom OpenClaw skills
  apps/
    web/                   ← Next.js reference app (shadcn + Tailwind v4)
  docker-compose.yml       ← TimescaleDB + ClamAV (local dev)
  README.md
```

## Frontend

Three layers:

1. **React hooks** — core primitives (`useChat`, `useTaskFeed`, `useNotifications`, `useUsage`, etc.) connecting to control plane via [Eden Treaty](https://elysiajs.com/eden/overview). Deployers build any UI.
2. **Reference Next.js app** — fully functional, uses all hooks, [shadcn](https://ui.shadcn.com/) + [Tailwind v4](https://tailwindcss.com/). Use as-is or customize.
3. **shadcn components** — pre-built components for the 4 surfaces (chat, live feed, notifications, usage). Copy/paste and customize.

Hooks and components extracted after the first MVP is built.

## What the Deployer Configures

| What | How |
|---|---|
| Agent personality | Write `SOUL.md` |
| Operating instructions | Write `AGENTS.md` |
| Domain knowledge | Drop files in `knowledge/` |
| Backend capabilities | Publish CLIs to npm, agent uses via `bunx` |
| LLM providers + keys | `auth-profiles.json` |
| Tool restrictions | OpenClaw tool policies in config |
| Billing model | Stripe via better-auth plugin |

## What the Deployer Does NOT Configure

| What | Why |
|---|---|
| Database schema | TigerFS + TimescaleDB handles it |
| API endpoints | Elysia control plane is pre-built |
| Auth flow | better-auth handles it |
| Session management | OpenClaw handles it |
| Memory/personalization | OpenClaw workspace handles it |
| Backup | TigerFS `.history/` + `pg_dump` |
| Process management | Nomad handles it |

## Licensing

MIT.
