# Tarima2 / DealRelay repo conventions

## Hard rules (from ~/AGENTS.md, restated)

- Bun is the package manager for this repo (bun 1.4.3 pinned in .mise.toml; mise global default 1.3.14 is too old for durable-actors).
- Worktrees live in `$HOME/.worktrees/<ticket>/<keywords>`, never inside the repo.
- Commits are conventional (`<type>(<scope): <subject>`), atomic, no co-author lines.
- Plans live in `.agents/plans/YYYY-MM-DD-<slug>.md` for non-trivial work.
- Never commit secrets. `.env` is gitignored; only `.env.example` is tracked.
- Never restart the oxmgr daemon; use `oxmgr apply --only <name>` per app.

## Backpressure

- `bun run validate` runs typecheck + lint + test + actor contract check. `bun run validate:quick` skips tests. Run before every commit.
- Baseline-first rule from ~/AGENTS.md 9c: before first verification on a new task, capture `/tmp/tarima2-<scope>-baseline-<timestamp>.log`; before declaring done, diff against it. New failures are regressions caused by the work.

## Repo layout

- `apps/web` — TanStack Start + Nitro (node-server preset), React UI.
- `apps/relay` — Agent Relay pipeline process.
- `packages/actors` — durable-actors RoomActor + generated client.
- `packages/shared` — shared TS types (RoomState, VenueProposal, ...) consumed by web, relay, and actors. Single source for seams.
- `scripts/validate.ts` — the gate.
- `.agents/docs/` — vendor docs and runbooks.
- `.agents/plans/` — dated plans.
- `.agents/notes/` — durable learnings.

## Coding conventions

- TS strict, no `any` at seams. Use `type-fest` where it sharpens intent.
- Seams (actor methods, server functions, relay payloads) are defined in `packages/shared` and imported everywhere else. Never redefine a seam type in a consumer.
- No `useEffect` for data sync; state comes from the actor over WebSocket and React renders from the latest snapshot.
- No emdashes in prose or UI copy.
- Prefer editing over creating files. Prefer single-responsibility packages over one big app.

## Working agreements

- Roles come from `?role=agency|client`; no auth.
- Demo mode defaults to fixtures so judges can open a URL with no LLM keys.
- Real harnesses (claude/codex via @agent-relay/harnesses) are opt-in behind `DEMO_MODE=live`.
