# Isolation Audit: Code-Level Verification

Deep code-level verification that two users' agents on the same gateway can never access each other's data.

## Verified Boundaries

### File Read/Write — ✅ Isolated
`src/infra/fs-safe.ts:171` — every file operation passes through `isPathInside(workspaceRoot, requestedPath)`. Blocks:
- Absolute paths outside workspace
- Relative path traversal (`../../../`)
- Symlink escapes (real-path re-check after resolution)
- Hardlink attacks (`nlink > 1` rejection)

### Sessions — ✅ Isolated
`src/routing/session-key.ts:73-76` — session keys encode agent ID (`agent:<agentId>:<rest>`). Agent A cannot access Agent B's session history. Server validates key ownership.

### Memory Search — ✅ Isolated
`src/agents/tools/memory-tool.ts:35-103` — memory manager instantiated per-agent, indexes only files from that agent's workspace. No cross-agent search.

### Context/Prompts — ✅ Isolated
`src/agents/workspace.ts:56-88` — bootstrap files (SOUL.md, USER.md, MEMORY.md) loaded from agent's own workspace only via `readWorkspaceFileWithGuards()`.

### Inter-Agent Communication — ✅ Isolated
Off by default. No tool exposes agent enumeration or cross-agent messaging.

### Auth/API Keys — ✅ Not a user isolation concern
API keys are process-global but belong to the deployer, not individual users. All agents should use the same key pool.

## Gaps Requiring Configuration

### Exec Commands — ⚠️ Requires tool policy
Shell commands bypass OpenClaw's file boundary checks. A command like `cat /other-user/file` could theoretically succeed.

**Framework must enforce:**
- `tools.exec.security: "deny"` as default (already OpenClaw's default)
- Deployer configures `safeBins` for allowed commands
- Security gate blocks prompt injection before OpenClaw

### memory-timescaledb Plugin — ⚠️ Our responsibility
Shared pgvector table in TimescaleDB. Every query MUST include `WHERE agent_id = $1`.

## Framework Security Defaults

The framework ships with these non-negotiable defaults:

```json5
{
  tools: {
    exec: {
      security: "deny",     // block exec unless allowlisted
      safeBins: []           // deployer explicitly allows what's needed
    },
    deny: ["browser"]        // deny browser by default
  }
}
```

Deployers can relax these for their use case, but the defaults are secure.
