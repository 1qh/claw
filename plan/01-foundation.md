# Phase 1: Foundation

## Goal

Set up the monorepo, control plane skeleton, authentication, and database schema. Everything needed before integrating OpenClaw.

## Overview

```mermaid
graph TB
    subgraph "Stage 1.1: Monorepo"
        M1[Bun workspace]
        M2[Directory structure]
        M3[Linting + formatting]
    end

    subgraph "Stage 1.2: Database Schema"
        D1[Drizzle setup]
        D2[Core tables]
        D3[RLS policies]
    end

    subgraph "Stage 1.3: Control Plane"
        C1[Elysia server]
        C2[WebSocket support]
        C3[Health endpoint]
    end

    subgraph "Stage 1.4: Auth"
        A1[better-auth integration]
        A2[OAuth providers]
        A3[Session management]
    end

    M1 --> M2 --> M3
    M3 --> D1 --> D2 --> D3
    M3 --> C1 --> C2 --> C3
    D3 --> A1 --> A2 --> A3
```

---

## Stage 1.1: Monorepo Setup

### Goal

Initialize a Bun workspace monorepo with the project structure.

### Dependencies

- Phase 0 complete (TigerFS validated)
- Bun installed

### Steps

1. Initialize the repo with Bun workspace configuration
2. Create package structure:
   ```
   packages/
     control-plane/     ← Elysia server
     hooks/             ← React hooks (empty for now)
   apps/
     web/               ← Next.js app (empty for now)
   config/
     SOUL.md            ← default agent personality
     AGENTS.md          ← default operating instructions
   docker-compose.yml   ← TimescaleDB + TigerFS + ClamAV (from Phase 0)
   ```
3. Configure TypeScript (strict, ESM, path aliases)
4. Set up Oxlint + Oxfmt (matching OpenClaw’s tooling)
5. Set up Vitest for testing
6. Create `bun run` scripts: `dev`, `build`, `test`, `lint`, `format`

### External References

- [Bun workspace docs](https://bun.sh/docs/install/workspaces)
- [Bun quickstart](https://bun.sh/docs/quickstart)
- [Vitest with Bun](https://vitest.dev/guide/)

### Verification Checklist

- [ ] `bun install` succeeds from repo root
- [ ] `bun run build` succeeds (even if empty)
- [ ] `bun run test` runs Vitest (even with zero tests)
- [ ] `bun run lint` runs Oxlint with zero errors
- [ ] `bun run format` runs Oxfmt
- [ ] TypeScript strict mode enabled, no errors
- [ ] Workspace packages can import from each other

---

## Stage 1.2: Database Schema

### Goal

Define the core TimescaleDB schema via Drizzle with RLS policies.

### Dependencies

- Stage 1.1 complete
- docker-compose running (TimescaleDB from Phase 0)

### Steps

```mermaid
erDiagram
    users {
        uuid id PK
        text email UNIQUE
        text name
        timestamptz created_at
        timestamptz last_active_at
    }

    gateways {
        text id PK
        text host
        int port
        text status
        int agent_count
        int max_agents
        timestamptz created_at
    }

    user_gateway {
        uuid user_id FK
        text gateway_id FK
        text agent_id
        text workspace_path
        text status
        timestamptz created_at
    }

    cache {
        text key PK
        jsonb value
        timestamptz ttl
        timestamptz created_at
    }

    usage_events {
        timestamptz time PK
        uuid user_id FK
        text gateway_id FK
        text model
        text provider
        int input_tokens
        int output_tokens
        numeric cost_usd
        int latency_ms
        text task_type
    }

    users ||--o{ user_gateway : "assigned to"
    gateways ||--o{ user_gateway : "hosts"
    users ||--o{ usage_events : "generates"
```

1. Install Drizzle ORM + drizzle-kit as dependencies
2. Define schema tables:
   - `users` — managed by better-auth via Drizzle adapter (UUID `id` column as PK, not email). Do not define a conflicting custom `users` table. Use better-auth’s schema as the source of truth and extend it if needed.
   - `gateways` — id, host, port, status, agent_count, max_agents
   - `user_gateway` — email → gateway mapping with agent_id and workspace_path
   - `cache` — shared key-value store with TTL. Used by deployer CLIs and the shared intelligence layer for cross-user data deduplication (e.g., caching API responses, crawled content). The framework provides the table; deployers decide what to cache.
   - `usage_events` — TimescaleDB hypertable (partitioned by time) for usage tracking. Control plane writes token counts, cost, model, latency from gateway WebSocket events. Continuous aggregates in Phase 6 query this table for billing and analytics.
3. Define RLS policies:
   - Each gateway connection can only access its own agents’ data
   - Control plane has full access
4. Create per-gateway PostgreSQL roles: when creating a gateway, the control plane also creates a PostgreSQL role for that gateway with RLS policies scoped to its agents. TigerFS mounts for that gateway use this scoped role.
5. **Set database-level default for RLS:** `ALTER DATABASE uniclaw SET app.agent_id = '__none__'`. This ensures any connection that forgets to `SET LOCAL app.agent_id` gets no data (no rows match `__none__`).
6. Run `drizzle-kit push` to apply schema to local TimescaleDB
7. Write tests: schema creation, RLS enforcement, basic CRUD

### External References

- [Drizzle + PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Drizzle RLS](https://orm.drizzle.team/docs/rls)
- [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview)

### Verification Checklist

- [ ] All tables created in TimescaleDB
- [ ] `drizzle-kit push` succeeds without errors
- [ ] Insert + read on every table works
- [ ] RLS policy blocks cross-agent data access (test with different roles)
- [ ] RLS policy blocks cross-gateway data access (test with different roles)
- [ ] Cache table: insert with TTL, read before expiry succeeds, read after expiry returns null
- [ ] Schema types are inferred correctly in TypeScript
- [ ] Unset session returns zero rows from memory_chunks (RLS default blocks access)
- [ ] Migration is reproducible (drop + push from scratch)

---

## Stage 1.3: Control Plane Skeleton

### Goal

Elysia HTTP + WebSocket server with basic routing, health check, and CORS.

### Dependencies

- Stage 1.1 complete

### Steps

```mermaid
graph LR
    subgraph "Elysia Control Plane"
        HEALTH["/health"]
        WS["WebSocket /ws"]
        CORS["CORS middleware"]
        HELMET["Security Headers middleware"]
    end

    CLIENT["Browser / Test"] --> CORS --> HEALTH
    CLIENT --> CORS --> WS
    HELMET -.-> HEALTH
    HELMET -.-> WS
```

1. Create Elysia server in `packages/control-plane/`
2. Add plugins: CORS, security headers. Set security headers manually in Elysia middleware (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection) or use a community plugin like `elysia-helmet` if available. Elysia does not have an official Helmet plugin
3. Add `/health` endpoint returning server status
4. Add WebSocket endpoint `/ws` — accept connections, echo messages (placeholder for gateway proxy)
5. Export server type for Eden Treaty (frontend type safety)
6. Write tests: health check returns 200, WebSocket connects, CORS headers present, Helmet headers present

### External References

- [Elysia quick start](https://elysiajs.com/quick-start)
- [Elysia CORS plugin](https://elysiajs.com/plugins/cors)
- [Elysia WebSocket](https://elysiajs.com/patterns/websocket)
- [Eden Treaty overview](https://elysiajs.com/eden/treaty/overview)

### Verification Checklist

- [ ] `bun run dev` starts Elysia server
- [ ] `GET /health` returns 200 with status JSON
- [ ] WebSocket connection to `/ws` succeeds
- [ ] WebSocket echo: send message, receive same message back
- [ ] CORS headers present in response (`Access-Control-Allow-Origin`)
- [ ] Security headers present (CSP, X-Frame-Options, HSTS, etc.)
- [ ] Server type exported for Eden Treaty
- [ ] All tests pass

---

## Stage 1.4: Authentication

### Goal

Integrate better-auth with Elysia for user signup, login, and session management.

### Dependencies

- Stage 1.2 complete (database schema)
- Stage 1.3 complete (Elysia server)

### Steps

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (test client)
    participant CP as Control Plane (Elysia)
    participant BA as better-auth
    participant DB as TimescaleDB

    User->>FE: Sign up with email
    FE->>CP: POST /api/auth/signup
    CP->>BA: Create user
    BA->>DB: Insert user record
    BA->>CP: Session token
    CP->>FE: Set cookie + return user
    FE->>CP: GET /api/auth/session
    CP->>BA: Validate session
    BA->>FE: User data
```

1. Install better-auth and Elysia adapter
2. Configure better-auth with Drizzle adapter pointing to TimescaleDB
3. Mount better-auth handler on Elysia server
4. Enable email + password signup (minimal for testing)
5. Enable at least one OAuth provider (GitHub — easiest for dev)
6. Configure session management (cookie-based)
7. Add auth middleware to WebSocket — reject unauthenticated connections
8. **Email normalization at signup:** Email normalization (lowercase + strip `+` aliases) MUST be applied by better-auth BEFORE creating the user record. The `email` column in the users table stores the NORMALIZED email. This prevents two accounts (`alice+1@company.com` and `alice@company.com`) from creating separate auth records that map to the same workspace. Add a better-auth `beforeSignup` hook that normalizes email before account creation.
9. **Enable better-auth CAPTCHA for signup** to prevent bot-driven account creation.
10. **Admin role assignment:** The first user does NOT auto-become admin. Admin role is assigned explicitly by the deployer via better-auth CLI or database. The admin plugin must be configured with `requireAdminCreation: true` or equivalent. Document this in the template repo README.
11. Write tests: signup, login, session validation, logout, unauthenticated rejection

### External References

- [better-auth installation](https://www.better-auth.com/docs/installation)
- [better-auth Elysia integration](https://www.better-auth.com/docs/integrations/elysia)
- [better-auth Drizzle adapter](https://www.better-auth.com/docs/storage/drizzle)

### Verification Checklist

- [ ] User signup creates record in TimescaleDB
- [ ] User login returns session token
- [ ] Session token validates on subsequent requests
- [ ] Logout invalidates session
- [ ] Unauthenticated WebSocket connection is rejected
- [ ] Authenticated WebSocket connection succeeds
- [ ] OAuth flow works (GitHub)
- [ ] better-auth admin plugin accessible (user management)
- [ ] Two signups with `user+tag@gmail.com` and `user@gmail.com` result in ONE account (not two)
- [ ] Regular user cannot access /admin/\* endpoints
- [ ] All tests pass
