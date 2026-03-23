# Feedback: Ratings, Redo, and Agent Learning

The conversation IS the feedback mechanism. The memory system IS the learning mechanism.

## UX When a Result Arrives

```mermaid
graph TD
    RESULT[Result Delivered to User] --> LEAVE
    RESULT --> REDO
    RESULT --> RATE

    LEAVE["Leave / Ignore\n(implicit acceptance)"]
    REDO["[Redo] + optional note\n(agent retries)"]
    RATE["[Rate] 👍/👎 + optional note\n(agent learns)"]

    REDO --> AGENT_RETRY[Agent sees previous result +\nrejection note in same session\n→ tries different approach\n→ learns from correction]

    RATE --> AGENT_LEARN[Agent processes rating\n→ updates MEMORY.md if pattern found\n→ reinforces or adjusts behavior]

    LEAVE --> SILENT[No signal sent\nAgent assumes good enough]
```

## The Three Actions

### 1. Leave (Implicit Acceptance)
User sees the result and moves on. No action needed. Strongest positive signal is when the user actually uses the output.

### 2. Redo + Optional Note
User needs the task done again differently.

| Redo Input | What Agent Receives |
|---|---|
| Redo (no note) | "User rejected the output. Try a different approach." |
| Redo + "too formal" | "User rejected: too formal. Make it more casual." |
| Redo + "keep charts, redo the text" | "User rejected partially: keep charts, redo the text." |
| Redo + "wrong data, use Q3" | "User rejected: wrong data source. Use Q3 data." |

**Redo is an action** — the agent must produce a new result.

### 3. Rate (👍/👎) + Optional Note
User wants to leave feedback without requesting new work.

| Rating Input | What Agent Receives |
|---|---|
| 👍 (no note) | "User rated positively." |
| 👍 + "loved the chart format" | "User rated positively: loved the chart format." |
| 👎 (no note) | "User rated negatively." |
| 👎 + "too verbose" | "User rated negatively: too verbose." |

**Rating is feedback** — the agent learns but doesn't produce new output.

## Distinction: 👎 vs Redo

```mermaid
graph LR
    BAD[User unhappy with result]
    BAD --> THUMB["👎\n'I don't love this but\nI'll live with it'"]
    BAD --> REDO_BTN["Redo\n'I need this\ndone again'"]

    THUMB --> LOG[Agent logs feedback\nUpdates memory for future]
    REDO_BTN --> ACT[Agent retries immediately\nProduces new result]
```

- **👎** = passive feedback, agent learns for next time
- **Redo** = active request, agent acts now

## How Ratings Reach the Agent

Every rating is sent directly to the agent as a message. No batching, no deferred processing, no feedback files.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant CP as Control Plane
    participant GW as Gateway

    User->>FE: Taps 👍 + "loved the charts"
    FE->>CP: rating event
    CP->>GW: Send as message in session
    GW->>GW: Agent processes rating
    GW->>GW: Agent updates MEMORY.md:<br/>"User prefers chart-heavy reports"
```

Rating cost (~500 tokens) is negligible vs the task (50,000+ tokens). Positive ratings reinforce behavior via OpenClaw's [memory](https://docs.openclaw.ai/concepts/memory) system.

## Multiple Redos

After 2-3 redos on the same task, the problem is understanding, not execution. The agent should switch to clarification:

```mermaid
stateDiagram-v2
    [*] --> Result: Task complete
    Result --> Redo1: User hits Redo
    Redo1 --> Result2: Agent retries
    Result2 --> Redo2: User hits Redo again
    Redo2 --> Result3: Agent retries more carefully
    Result3 --> Redo3: User hits Redo again
    Redo3 --> Clarification: Agent asks what user actually wants
    Clarification --> Result4: User explains → agent retries with clear understanding
```

This is handled via `AGENTS.md` instructions, not a system feature:
> "After 2 failed redo attempts, stop retrying and ask the user to describe specifically what they want."

## Long-Term Learning from Feedback

The agent is instructed (via `AGENTS.md`) to look for patterns across feedback:

| Pattern | Agent Action |
|---|---|
| User rates 👎 "too formal" 3 times | Update `USER.md`: "Prefers casual tone" |
| User rates 👍 on chart-heavy reports | Update `MEMORY.md`: "Charts are valued" |
| User always redoes executive summaries | Update `MEMORY.md`: "Summaries need extra care for this user" |
| User never uses Redo | No action — agent is performing well |


## What the Agent Notices (Summary)

| Event | Source | How Agent Learns |
|---|---|---|
| Task request | User via frontend | Normal session message |
| Redo + note | User via frontend | Session message → retry + learn |
| Rating + note | User via frontend | Session message → update memory |
| File upload | User via frontend | File appears in workspace |
| Profile changes | User tells agent | Conversation → updates USER.md |
| Returns after absence | User opens app | Agent has memory/session history |
| Scheduled task done | OpenClaw [cron](https://docs.openclaw.ai/automation/cron-jobs) | Results in [session transcripts](https://docs.openclaw.ai/concepts/session) |
| Config updates | Shared config directory | Hot-reload, automatic |
| Tier/plan change | Control plane | Config patch via gateway API |
| Account deletion | Control plane | Gateway process killed, agent not notified |

