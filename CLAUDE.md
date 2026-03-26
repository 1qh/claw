## Reviewer Loop

When asked to do a “reviewer loop” on docs:

1. **Self rounds**: Read every doc with fresh eyes, find all issues (stale, wrong, missing, inconsistent), fix them, repeat until 0 findings.
2. **Fresh agent rounds**: Spawn a new agent with NO context to read the entire codebase docs + source code. It finds issues with zero bias. Fix what it finds, spawn another fresh agent. Repeat until it raises 0 concerns.

**Critical: keep the fresh agent UNBIASED.** Give it ONLY the task ("read all docs, read all source code, find inconsistencies"). Do NOT tell it what to look for, what was already fixed, what the expected answers are, or what specific files to check. Any hints bias it toward confirming your work instead of auditing it.

---

## Philosophy

Nothing is locked in. Every library, pattern, and architecture choice is an experiment. If rebuilding from scratch produces a cleaner, more robust result — do it. Don’t preserve effort for its own sake. Always ask: “if we started fresh today, what’s the best way?” AI SDK, shadcn, even the Next.js structure — all replaceable if something better exists. The goal is the cleanest, most robust solution for the long run.

---

## OpenClaw Fork

Local fork: `~/openclaw-repo` (origin = upstream, fork = `github.com/1qh/openclaw`). PR branch: `fix/workspace-state-no-dot-dir` (#53326).

**Pinned version:** We develop against a pinned OpenClaw release (`2026.3.24` in `docker-compose.yml`). The fork checkout matches: `cd ~/openclaw-repo && git checkout 2026.3.24`. This ensures the source code we read matches the Docker image we run. When reading OpenClaw code, always read from the pinned tag, not `main` — upstream `main` may have unreleased changes that don’t exist in our image.

**Upgrade workflow:** When a new OpenClaw release drops: read the release notes, checkout the new tag in the fork, update `docker-compose.yml`, wipe services (`docker compose down && docker volume rm claw_tsdb_data`), start fresh, test everything, fix breaking changes, update docs.

---

## Dependencies & Scripts

- All deps use `latest` tag in package.json — no pinned versions during development
- `bun clean` — removes node_modules, lockfile, dist, .cache, .next — like a fresh clone
- `bun install` after clean always resolves latest upstream
- `q` wrapper for all scripts — silent on success, verbose on failure
- Git pre-commit hook runs `bun clean && bun i && bun fix` — fresh install from latest upstream + full lint on every commit. Commit is rejected if any step fails. Never use `--no-verify`.

---

## Code Style

- Only `bun` — yarn/npm/npx/pnpm forbidden
- `bun fix` must always pass before committing
- Only arrow functions — no `function` declarations
- All exports at end of file
- `.tsx` with single component → `export default`; utilities/backend → named exports
- `for` loops instead of `reduce()` or `forEach()`
- Exhaustive `switch` with `default: never`
- `catch (error)` enforced by oxlint — name state vars descriptively to avoid shadow (`chatError`, `formError`)
- Short map callback names: `t`, `m`, `i`
- Max 3 positional args — use destructured object for 4+
- Co-locate components with their page; only move to `~/components` when reused
- Explicit imports from exact file paths — no barrel `index.ts` files
- Prefer existing libraries over new dependencies
- Scripts: silent on success, verbose on failure. Prefer `q ...` for noisy commands.
- **Environment variables:** Never use `process.env` directly — import `env` from `@a/env` (or `~/lib/env` which re-exports it). Never use fallback defaults (`??`, `:-`) for env vars — not in TypeScript, not in bash scripts, not anywhere. Fail fast with a clear error when a required env var is missing. Single `.env` at project root. Schema in `packages/env/src/env.ts` (all fields required, no `.default()`). Bash scripts use `: "${VAR:?VAR is required}"` syntax.
- **Credentials philosophy:** Use stock defaults for infrastructure (e.g., `postgres/postgres/postgres` for DB) — minimize things to memorize. Only customize real secrets (OAuth keys, auth secrets). The `.env` file is the single source of truth for all values. Docker containers read from `.env` via `${VAR:?}` — never hardcode credentials in compose files or scripts.
- **Database queries:** Always use Drizzle — no raw SQL. This includes TigerFS-backed tables (`_state`, `_workspace`) which have Drizzle schemas declared as read-only.
- **Next.js 16 + React 19:** Use server components by default, `'use client'` only when needed (hooks, interactivity). Use server actions for mutations. Leverage `@a/ui` (shadcn + ai-elements) components everywhere applicable — don’t rebuild what’s already available.

### Must NOT do

- NEVER write comments (lint ignores allowed)
- NEVER use `!` (non-null assertion), `any`, `as any`, `@ts-ignore`, `@ts-expect-error`
- NEVER disable lint rules globally/per-directory — fix the code
- NEVER ignore written source code from linters — only auto-generated code (`_generated/`, `generated/`, `module_bindings/`)
- NEVER reduce lintmax strictness — if upstream removes rules, find replacements
- NEVER use `git clean` — it deletes `.env` and uncommitted files. Use explicit `rm -rf`.
- NEVER use fallback/default values for env vars — no `??`, no `:-`, no `.default()`, no hardcoded values. Every env var must be explicitly required and fail fast when missing. This applies to TypeScript (`env.ts`), bash scripts (`${VAR:?}`), drizzle config, docker-compose — EVERYWHERE. `.env` is the ONLY source of truth.

---

## Linters & Lintmax

**lintmax** is our own max-strict lint/format orchestrator. Source at `~/z/lintmax`. We own it — read the source code to understand the pipeline, and feel free to suggest improvements that bring better strictness or better defaults.

### Ignore syntax

| Linter | File-level                                           | Per-line                                         |
| ------ | ---------------------------------------------------- | ------------------------------------------------ |
| oxlint | `/* oxlint-disable rule-name */`                     | `// oxlint-disable-next-line rule-name`          |
| eslint | `/* eslint-disable rule-name */`                     | `// eslint-disable-next-line rule-name`          |
| biome  | `/** biome-ignore-all lint/category/rule: reason */` | `/** biome-ignore lint/category/rule: reason */` |

### Ignore strategy

1. **Fix the code** — always first choice
2. **File-level disable** — when a file has many unavoidable violations of the same rule
3. **Per-line ignore** — isolated unavoidable violations
4. **Consolidate** — if file-level `biome-ignore-all` exists, remove redundant per-line `biome-ignore` for the same rule
5. NEVER 5+ per-line ignores for the same rule — use file-level

- File-level directives go at absolute file top, above any imports/code (including `'use client'`/`'use node'`).
- Remove duplicate directives; keep one canonical directive block.
- Use one top `eslint-disable` line per file; combine multiple rules with commas.

### Cross-linter rules

- 2 linters with the same rule (biome `noAwaitInLoops` + oxlint `no-await-in-loop`) = double enforcement, NOT a conflict. Never disable one because the other covers it.
- To suppress a shared eslint/oxlint rule: suppress eslint’s version — oxlint auto-picks up eslint rules and is faster.

### Safe-to-ignore rules

**oxlint:** `promise/prefer-await-to-then` (Promise.race, ky chaining)

**eslint:** `no-await-in-loop`, `max-statements`, `max-depth`, `complexity` (sequential ops) · `@typescript-eslint/no-unnecessary-condition` (type narrowing) · `@typescript-eslint/promise-function-async` (thenable returns) · `@typescript-eslint/max-params` · `@next/next/no-img-element` (external images) · `react-hooks/refs`

**biome:** `style/noProcessEnv` (env files) · `performance/noAwaitInLoops` (sequential ops) · `nursery/noForIn` · `performance/noImgElement` · `suspicious/noExplicitAny` (generic boundaries)

---

## Minimal DOM (React + Tailwind)

Same UI, fewest DOM nodes. Every element must earn its place. If you can delete it and nothing breaks (semantics, layout, behavior, required styling) → it shouldn’t exist.

**A node is allowed only if it provides:**

- **Semantics/a11y** — correct elements (`ul/li`, `button`, `label`, `form`, `nav`, `section`), ARIA patterns, focus behavior
- **Layout constraint** — needs its own containing block / positioning / clipping / scroll / stacking context (`relative`, `overflow-*`, `sticky`, `z-*`, `min-w-0`)
- **Behavior** — measurement refs, observers, portals, event boundary, virtualization
- **Component API** — can’t pass props/classes to the real root (and you tried `as`/`asChild`/prop forwarding)

**Before adding wrappers:**

- Spacing → parent `gap-*` (flex/grid) or `space-x/y-*`
- Separators → parent `divide-y / divide-x`
- Alignment → `flex`/`grid` on existing parent
- Visual (padding/bg/border/shadow/radius) → on the element that owns the box
- JSX grouping → `<>...</>` (Fragment), not `<div>`

**Styling children — props first, selectors second:**

- Mapped component → pass `className` to the item
- Uniform direct children → `*:` or `[&>tag]:` to avoid repeating classes

```tsx
<div className="divide-y [&>p]:px-3 [&>p]:py-2">
  <p>A</p>
  <p>B</p>
</div>
```

**Tailwind selector tools:**

- `*:` direct children · `[&>li]:py-2` targeted · `[&_a]:underline` descendant (sparingly)
- `group`/`peer` on existing nodes → `group-hover:*`, `peer-focus:*`
- `data-[state=open]:*`, `aria-expanded:*`, `disabled:*`
- `first:` `last:` `odd:` `even:` `only:` — structural variants

**Review checklist:** Can I delete this node? → delete. Can `gap/space/divide` replace it? → do it. Can I pass `className`? → do it. Can `[&>...]:` remove repetition? → do it.
