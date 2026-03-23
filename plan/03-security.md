# Phase 3: Security Gate

## Goal

Build the 7-layer security gate that validates all input BEFORE it reaches OpenClaw. See [brainstorm security](../brainstorm/architecture/security.md) for the full design.

## Overview

```mermaid
graph TB
    MSG[Inbound Message] --> L1
    FILE[File Upload] --> FL1

    subgraph "Message Gate"
        L1["Layer 1: Input Sanitizer"] --> L2
        L2["Layer 2: Heuristic Guards\n(hai-guardrails)"] --> L3
        L3["Layer 3: LLM Guards\n(hai-guardrails + AI SDK)"] --> L4
        L4["Layer 4: Domain Scope\n(AI SDK structured output)"]
    end

    subgraph "File Gate"
        FL1["Format Validation\n(file-type + blocklist)"] --> FL2
        FL2["Antivirus\n(ClamAV)"] --> FL3
        FL3["Deep Inspection\n(archives, PDFs)"]
    end

    L4 --> PASS[Forward to Gateway]
    FL3 --> PASS
    L1 & L2 & L3 & L4 -->|fail| BLOCK[Reject with reason]
    FL1 & FL2 & FL3 -->|fail| BLOCK
```

**Parallelizable:** Stage 3.1 (message gate) and Stage 3.2 (file gate) can be built in parallel. Stage 3.3 (rate limiting) can be built alongside 3.1/3.2.

---

## Stage 3.1: Message Security Gate

### Goal
Validate every user message through 4 layers before forwarding to the gateway.

### Dependencies
- Phase 1 complete (control plane with auth)

### Steps

```mermaid
graph LR
    subgraph "Layer 1 — Sanitizer (custom)"
        S1[Strip zero-width chars]
        S2[Enforce length limits]
        S3[Validate structure]
    end

    subgraph "Layer 2 — Heuristic (hai-guardrails)"
        H1[Injection Guard]
        H2[Leakage Guard]
        H3[PII Guard]
        H4[Secret Guard]
    end

    subgraph "Layer 3 — LLM (hai-guardrails + AI SDK)"
        LLM1[Toxic Guard]
        LLM2[Hate Speech Guard]
        LLM3[Bias Guard]
        LLM4[Adult Content Guard]
        LLM5[Copyright Guard]
        LLM6[Profanity Guard]
    end

    subgraph "Layer 4 — Scope (AI SDK)"
        SC[Domain classifier]
        SR[Structured block reason]
    end
```

#### Layer 1: Input Sanitizer
1. Strip hidden unicode characters, zero-width spaces, invisible markup
2. Enforce max message length (configurable by deployer)
3. Reject malformed payloads
4. Test: known unicode trick payloads are stripped, oversized messages rejected

#### Layer 2: Heuristic Guards
1. Install `@presidio-dev/hai-guardrails`
2. Configure guards in heuristic mode (no LLM call):
   - Injection Guard — known prompt injection patterns
   - Leakage Guard — system prompt extraction attempts
   - PII Guard — personal data detection
   - Secret Guard — API keys, credentials
3. Each guard returns a score (0.0–1.0) + explanation
4. Configurable threshold per guard (deployer can tune)
5. Test: known injection patterns blocked, clean messages pass

#### Layer 3: LLM Content Guards
1. Install `ai` (Vercel AI SDK)
2. Configure hai-guardrails LLM-mode guards with AI SDK as the model provider
3. Guards: Toxic, Hate Speech, Bias, Adult Content, Copyright, Profanity
4. Use a fast/cheap model (e.g., Haiku-tier) for classification
5. Test: toxic content blocked, normal business messages pass

#### Layer 4: Domain Scope Classifier
1. Use AI SDK `generateText()` with `Output.object()` + Zod schema
2. Schema returns: `{ allowed: boolean, reason: string, category: string }`
3. Prompt is deployer-configurable (defines what's in-scope for their product)
4. Test: in-scope requests pass, out-of-scope requests blocked with reason

#### Integration
1. Wire all 4 layers as Elysia middleware on the WebSocket message handler
2. Messages pass through layers sequentially (fast layers first)
3. On block: return structured reason to frontend, do NOT forward to gateway
4. On pass: forward to gateway
5. Log all blocks (message hash, layer that blocked, reason) for operator dashboard

### External References
- [hai-guardrails](https://github.com/presidio-oss/hai-guardrails#readme)
- [AI SDK generating text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK getting started](https://ai-sdk.dev/docs/getting-started)

### Verification Checklist
- [ ] Layer 1: unicode tricks stripped, oversized messages rejected
- [ ] Layer 2: known prompt injection patterns blocked (test with OWASP examples)
- [ ] Layer 2: PII detected and flagged (test with SSN, email, phone patterns)
- [ ] Layer 2: API key/secret patterns detected
- [ ] Layer 3: toxic/harmful content blocked
- [ ] Layer 3: normal business messages pass without false positives
- [ ] Layer 4: out-of-scope requests blocked with structured reason
- [ ] Layer 4: in-scope requests pass
- [ ] Blocked messages return structured JSON reason to frontend
- [ ] Blocked messages logged with layer, reason, and message hash
- [ ] Clean messages forward to gateway without modification
- [ ] Gate adds < 200ms total latency (layers 1-2 < 5ms, layers 3-4 < 200ms)
- [ ] All tests pass (unit + integration)

---

## Stage 3.2: File Security Gate

### Goal
Validate all file uploads before they reach the agent's workspace.

### Dependencies
- Phase 1 complete (control plane)
- ClamAV running (from docker-compose)

### Steps

```mermaid
sequenceDiagram
    actor User
    participant CP as Control Plane
    participant FT as file-type
    participant CLAM as ClamAV
    participant TFS as TigerFS

    User->>CP: Upload file
    CP->>CP: Layer 1: size + extension + MIME
    CP->>FT: Sniff real MIME from binary headers
    alt MIME mismatch or blocked extension
        CP->>User: Reject with reason
    end
    CP->>CLAM: POST /scan (file bytes)
    alt Malware detected
        CP->>User: Reject with reason
    end
    CP->>CP: Layer 3: deep inspection (archives, PDFs)
    CP->>TFS: Write to user's workspace/uploads/
    CP->>User: Upload accepted
```

#### Layer 1: Format Validation
1. Install `file-type` package
2. Enforce file size limits (configurable per-type)
3. Extension blocklist: `.exe`, `.dll`, `.bat`, `.sh`, `.ps1`, `.com`, `.scr`, etc.
4. MIME sniff from binary headers, compare with declared content-type
5. Reject on mismatch or blocked type
6. Filename validation: reject path separators, null bytes, traversal

#### Layer 2: Antivirus
1. ClamAV running via docker-compose (from Phase 0 infra)
2. Install or configure `clamav-rest-api` container
3. On file upload, POST file to ClamAV REST API
4. If infected, reject with reason
5. If clean, proceed

#### Layer 3: Deep Inspection
1. For ZIP/TAR/RAR files: extract and scan contents before accepting
2. For PDF files: check for embedded JavaScript, suspicious objects
3. For Office files: flag macros

#### Integration
1. Wire as Elysia route: `POST /upload` with auth middleware
2. After all layers pass, write file to user's workspace on TigerFS: `/mnt/tigerfs/users/{email}/uploads/{filename}`
3. Return success response with file path (relative to workspace)

### External References
- [file-type npm](https://www.npmjs.com/package/file-type)
- [clamav-rest-api](https://github.com/benzino77/clamav-rest-api#readme)
- [ClamAV docs](https://docs.clamav.net/)

### Verification Checklist
- [ ] File size limits enforced (oversized files rejected)
- [ ] Blocked extensions rejected (`.exe`, `.dll`, etc.)
- [ ] MIME sniffing detects real file type (renamed `.jpg` that's actually `.exe`)
- [ ] ClamAV scans file and returns clean/infected status
- [ ] EICAR test file (antivirus test) is detected and rejected
- [ ] Clean files pass all layers and appear in TigerFS workspace
- [ ] ZIP with malicious contents detected (if implementing deep inspection)
- [ ] Filename validation blocks path traversal (`../../etc/passwd`)
- [ ] Upload endpoint requires authentication
- [ ] All tests pass

---

## Stage 3.3: Rate Limiting

### Goal
Per-user rate limiting to prevent abuse and resource exhaustion.

### Dependencies
- Phase 1 complete (control plane with auth)

### Steps

1. Implement per-user rate limits using Elysia middleware:
   - **Task submissions:** max concurrent tasks per user (default: 3), max tasks per minute (default: 10)
   - **File uploads:** max uploads per minute (default: 20), max total upload size per hour (default: 100MB)
   - **WebSocket messages:** max messages per second (default: 5) to prevent flooding
2. Store rate limit counters in the TimescaleDB cache table (or in-memory with periodic sync)
3. Return structured `429 Too Many Requests` responses with `Retry-After` header
4. Make all limits configurable per deployer (via shared config)
5. Admin override: deployers can set per-user limit overrides for premium users
6. Write tests: exceed each limit, verify rejection; stay under limits, verify pass-through

### External References
- [Elysia rate limiting patterns](https://elysiajs.com/plugins/overview)
- [better-auth rate limiting](https://www.better-auth.com/docs/concepts/rate-limit)

### Verification Checklist
- [ ] Exceeding max concurrent tasks returns 429 with structured reason
- [ ] Exceeding max tasks/minute returns 429 with `Retry-After` header
- [ ] Exceeding file upload rate returns 429
- [ ] Exceeding WebSocket message rate: messages are dropped with notification
- [ ] Within limits: no interference with normal operation
- [ ] Rate limit counters are per-user (User A's limits don't affect User B)
- [ ] Admin can override limits for specific users
- [ ] All tests pass

---

## Stage 3.4: Output Validation Gate

### Goal
Scan agent responses for PII, secrets, and sensitive data before delivery to the user. This mirrors the input gate (Stage 3.1) but on the output side.

### Dependencies
- Stage 3.1 complete (message security gate — reuses the same hai-guardrails infrastructure)
- Phase 2 complete (gateway integration — need agent responses to scan)

### Steps

1. Intercept agent response events in the WebSocket proxy before forwarding to the frontend
2. Run hai-guardrails in heuristic mode on agent output:
   - **PII Guard** — detect if the agent is leaking user PII from other users or from its own training data
   - **Secret Guard** — detect if the agent is outputting API keys, database credentials, or tokens
   - **Leakage Guard** — detect if the agent is leaking system prompt content or internal configuration
3. On detection:
   - Redact the sensitive content (replace with `[REDACTED]`) and deliver the sanitized response
   - Log the incident (agent ID, guard that triggered, redacted content hash)
   - Do NOT block the entire response — redact and deliver
4. Make output guards configurable (deployer can enable/disable, set thresholds)
5. Write tests: agent response with embedded API key is redacted, clean responses pass through unmodified

### Verification Checklist
- [ ] Agent response containing an API key pattern is redacted before reaching the user
- [ ] Agent response containing PII (SSN, phone, email of other users) is redacted
- [ ] Agent response leaking system prompt content is redacted
- [ ] Clean agent responses pass through without modification or added latency
- [ ] Redacted responses still make sense to the user (only sensitive parts removed)
- [ ] All redaction events logged with agent ID and guard type
- [ ] Output gate adds < 10ms latency for heuristic-only scanning
- [ ] All tests pass

---

## Stage 3.5: Gate Integration Test

### Goal
Verify the complete security gate works end-to-end with the gateway proxy.

### Dependencies
- Stages 3.1 and 3.2 complete
- Phase 2 complete (gateway integration)

### Verification Checklist
- [ ] Clean message → passes gate → reaches gateway → agent responds
- [ ] Prompt injection → blocked at Layer 2 → user sees reason → gateway never receives it
- [ ] Toxic message → blocked at Layer 3 → user sees reason
- [ ] Out-of-scope request → blocked at Layer 4 → user sees reason
- [ ] Infected file → blocked at ClamAV → user sees reason
- [ ] Clean file → passes gate → appears in agent workspace → agent can read it
- [ ] Gate doesn't interfere with agent events flowing back to frontend
- [ ] Performance: gate adds < 200ms to message flow, < 2s to file upload
