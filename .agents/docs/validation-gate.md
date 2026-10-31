# Validation gate

Modeled after brioso's `scripts/validate.ts`, trimmed for a hackathon repo.

## What it runs

1. `tsc --noEmit` across `packages/*` and `apps/*` (typed seams enforced).
2. `oxlint` (fast; same linter family as brioso).
3. `vitest run` (skipped with `--quick`).
4. Actor contract check: every method name the web/relay code calls on `actors.RoomActor` must exist in `packages/actors/generated/index.d.ts`. Prevents "works locally, breaks after regenerating the client" drift.

## Commands

- `bun run validate` — full gate.
- `bun run validate:quick` — skips vitest. Use inside the coding-agent loop.
- Timings printed per step. Target: `--quick` under ~45s warm.

## Baseline rule (~/AGENTS.md 9c)

Before the first verification on a new task, run the full gate and save output to `/tmp/tarima2-<scope>-baseline-<timestamp>.log`. Before declaring done, re-run and diff against the baseline. Anything new failing is a regression introduced by the work, even if it looks unrelated.
