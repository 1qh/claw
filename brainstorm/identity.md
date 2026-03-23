# Identity: Email as the Universal Key

## The Model

```
email (primary key)
    → auth identity (OAuth provider)
    → gateway routing (which host:port to hit)
    → gateway workspace (USER.md has the email)
    → web app frontend (single channel, user interacts through your SaaS)
```

## What Email Gives Us for Free

| Benefit | Why |
|---|---|
| **Auth identity** | Google/Microsoft/GitHub OAuth all return email |
| **Gateway routing** | Email maps deterministically to host, port, OS user |
| **Fallback notifications** | Email itself is a delivery channel |
| **Deterministic gateway naming** | Hash email → OS user + port, no lookup needed |
| **Human readable** | Admin sees `alice@company.com` in logs, not a UUID |

## Control Plane Data Model

Essentially one table:

```
email (PK) → {
    host            // which host this user's gateway runs on
    port            // gateway process port
    os_user         // dedicated OS user (e.g., oc-<hash>)
    workspace_dir   // workspace directory path
    status          // active | stopped | provisioning
    created_at
    last_active_at
}
```

Could be a database table, a key-value store, or even a flat file.

## Identity Split

```mermaid
graph LR
    subgraph "Control Plane"
        A["email = auth/routing key<br/>Owns: gateway mapping, billing"]
    end

    subgraph "Gateway Workspace"
        B["email in USER.md = personalization anchor<br/>Owns: preferences, memory, history, knowledge"]
    end

    A -->|"provisions gateway with email at creation"| B
    B -->|"agent builds on top over time"| B
```

The two stay in sync naturally:
- Control plane provisions gateway with email at creation
- Agent builds the full user profile on top through conversation
- No sync mechanism needed — email is set once, everything else grows organically

## Simplicity Constraints

- 1 email per user (no multi-email)
- No shared/team accounts (for now)
- No org hierarchy (for now)

