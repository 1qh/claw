# Boundaries: What Uniclaw Is NOT For

## Not a Good Fit

| Use Case                                                                                           | Why Not                                                               |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Real-time collaborative apps** (Google Docs, Figma)                                              | Agents work async, not real-time multi-user collaboration             |
| **High-frequency transactional systems** (trading, payment processing)                             | Agents are too slow and non-deterministic for sub-second transactions |
| **UI-centric products** (design tools, video editors, dashboards)                                  | Uniclaw is UI-minimal — the agent IS the product, not the interface   |
| **Guaranteed deterministic output** (accounting ledgers, compliance reports with exact formatting) | LLMs are probabilistic — same input may produce different output      |
| **Low-latency apps** (autocomplete, live search, gaming)                                           | Agent response time is seconds, not milliseconds                      |
| **Massive concurrent users on one task** (multiplayer, live auctions, chat rooms)                  | One agent handles one user at a time                                  |
| **Data that must never touch an LLM** (some healthcare/defense contexts)                           | Agent processes all user requests through LLM providers               |

## Good Fit

Fire-and-forget workflows where:

- Users care about outcomes, not process
- Tasks take seconds to hours, not milliseconds
- Personalization over time is valuable
- The domain can be encoded in instructions + CLIs
- Async delivery (notification when done) is acceptable
