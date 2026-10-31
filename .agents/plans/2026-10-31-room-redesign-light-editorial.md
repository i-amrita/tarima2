# 2026-10-31 room redesign: light editorial deal room

Plan: replace the dark all-mono dashboard at `/room/$roomId` with the light editorial
direction defined in `.agents/docs/ui-screen-spec.md`. Implementation is delegated to
separate agents; this document is the contract they work from.

Status: ready to delegate. No code changed by the planner.

## Context for the delegate

- Repo: `i-amrita/tarima2` (remote `origin`, branch `main`). Bun workspaces, bun 1.4.3
  pinned in `.mise.toml`. Never `npm`/`npx`.
- App: TanStack Start + Nitro + Tailwind v4 + shadcn/ui in `apps/web`. Actors on `:7100`,
  relay on `:7200`, web on `:3100`. Start all three with `bun run dev` from the repo root.
- The product: a venue-procurement deal room. An event has constraints (date, guests,
  budget, curfew, AV). Venue proposals arrive, three agents (Scout, Finance, Negotiator)
  audit them against the constraints, and the client approves a counter-offer. Two browser
  windows (agency + client roles) stay in sync over a durable-actor socket.
- Demo mode is fixture-driven (`DEMO_MODE=fixtures`); the scripted agents stream into the
  trace feed. The video plan is `.agents/docs/demo-video-plan.md`.
- The demo video is the actual deliverable for the hackathon, so the room screen is what
  judges see. Visual quality matters as much as correctness.
- Shared types live in `packages/shared/src/types.ts` and must not be changed by this work.

## Required reading before coding

1. `AGENTS.md` (repo root): conventions, commit format, validation.
2. `~/UILOOP.md`: the UI anti-drift loop. It governs this work and is not optional.
3. `.agents/docs/ui-screen-spec.md`: the screen spec, tokens, layout, invariants, rubric.
4. `.agents/docs/ui-references.md`: the five reference sites with local screenshot paths.
5. `.agents/docs/design-system.md`: component sourcing rules (ui -> ai-elements ->
   dealroom). Update it to the new visual direction as part of this work.

## Work breakdown

Four independent-ish tasks. Recommended order: T1 (tokens/fonts) -> T2 (shell + header) ->
T3 (proposals + approval) -> T4 (activity rail + demo controls). T1 must land first; the
others touch different files and can run in parallel by different agents once T1 is in.

### T1. Theme tokens, fonts, favicon

Files: `apps/web/src/styles.css`, `apps/web/src/routes/__root.tsx`,
`apps/web/package.json`, `apps/web/public/favicon.svg` (new).

- Implement spec S2 exactly: light `:root`, keep the `.dark` block, drop `className="dark"`
  from `<html>`, add `--font-display` with `@fontsource/instrument-serif` (add the
  dependency with bun, no npm).
- Add the favicon and reference it from `__root.tsx` so the console has zero errors.
- No component changes in this task.

Acceptance: page renders light; console shows 0 errors; `bun run validate --quick` green.

### T2. Shell and editorial header

Files: `apps/web/src/routes/room.$roomId.tsx`, new `apps/web/src/components/dealroom/`
components for the top bar and the editorial header (suggest `RoomTopBar.tsx`,
`RoomHeader.tsx`), `apps/web/src/components/dealroom/ConstraintHeader.tsx` (rewrite).

- Implement spec S3.1 and S3.2: one top bar, no stacked bars, editorial display heading with
  the event name in Instrument Serif, quiet inline specs row (not boxed chips), ghost
  "Set demo specs" / "Reset demo specs" button, quiet empty state.
- Keep `room-header`, `switch-role-agency`, `switch-role-client`, `connection-status`,
  `constraint-header`, `set-demo-specs-button` testids.
- Connection state as a dot plus text, colored by status (green/red), never a badge-looking
  pill competing with the role switcher.

Acceptance: 1440/1024/390 screenshots show the intended hierarchy; no layout collapse.

### T3. Proposals and the approval beat

Files: `apps/web/src/components/dealroom/ComparisonCanvas.tsx`,
`VenueCard.tsx`, `ConstraintBadge.tsx`, `ApprovalBar.tsx`; new `ProposalToolbar.tsx` if
the demo controls move here.

- Implement spec S3.3, S3.4, S3.5: single amber approval panel above the proposals list
  (not one card per proposal), per-row approve button for client and waiting state for
  agency; white venue cards with sans name, tinted status badge, sans italic quote, 4-up
  constraint cells with mono details, sans agent strategy.
- Keep `approval-bar`, `approve-button`, `approval-waiting-state`, `comparison-canvas`,
  `proposal-card-*`, `proposal-status-*`, `constraint-badge-*` testids.
- Status text becomes sentence case ("Requires approval"), still uppercase-friendly for
  the trace.

Acceptance: client screenshot shows the approve affordance; agency screenshot shows the
waiting state; e2e smoke passes.

### T4. Activity rail, demo controls, mobile

Files: `apps/web/src/components/dealroom/TraceFeed.tsx`,
`SimulationDrawer.tsx`, new `DemoControls.tsx` or reuse, `apps/web/src/components/ui/`
primitives if a popover/dropdown is needed (shadcn CLI, not hand-rolled).

- Implement spec S3.6 and S3.7: agent activity rail with sans messages, mono timestamps,
  dot instead of rainbow actor badges; demo actions as an inline ghost-button toolbar in the
  proposals column with one ink primary CTA; "Kill actor" moved into a top-bar popover with
  destructive styling only in the confirmation, behavior and env gating unchanged
  (`DEMO_ALLOW_KILL`).
- Keep `trace-feed`, `trace-run`, `trace-item`, `simulation-drawer`, `inject-grand-loft`,
  `inject-warehouse-9`, `vendor-accepts`, `kill-actor` testids. The kill button may move
  into the popover but must remain clickable by testid.
- Mobile: single column, rail below proposals, toolbar wraps.

Acceptance: e2e smoke passes with the moved kill button; 390px screenshot has no horizontal
scroll.

### T5. Docs and reference updates (after the UI lands)

Files: `.agents/docs/design-system.md` (rewrite the theme section to the new direction and
keep the sourcing rules), `.agents/docs/ui-screen-spec.md` (update with the final
decisions), `.agents/docs/screens/baseline/` (replace the "before" screenshots with the
approved "after" screenshots in the same commit, per UILOOP S8), `ARCHITECTURE.md` (only if
the layout description changed).

## Definition of done (UILOOP)

- The loop ran: generate -> capture -> evaluate (isolated subagent, different model family)
  -> verdict -> fix. Maximum 3 iterations, ledger kept.
- Hard gates green: console errors 0, console warnings 0, network 5xx 0, axe critical/serious
  0, no layout collapse at 1440x900 / 1024x768 / 390x844, `bash tests/e2e/smoke.sh` green.
- The evaluator receives only: screenshots, `ui-screen-spec.md`, `ui-references.md`, the
  rubric section of the spec, console log, axe report, e2e result. Never the diff, never the
  generator's rationale, never prior verdicts. The evaluator must be a fresh subagent on a
  different model family.
- The approved iteration updates the screen spec and the baseline screenshot in the same
  commit as the code.
- `bun run validate` green (tsc, oxlint, vitest, actor contract).
- Conventional commits, one logical change per commit.

## Risks and gotchas

- `bun run dev` starts all three services; stray processes cause EADDRINUSE. Kill leftovers
  before restarting.
- The actor persists room state, so a stale room id still shows old proposals. Use a fresh
  room id per test run (`/room/<random>?role=agency`).
- `data-testid` drift silently breaks `tests/e2e/smoke.sh`. Keep every id listed in the spec.
- Tailwind v4: tokens live in `@theme` in `styles.css`; adding a color there is the only
  sanctioned way to introduce one.
- `@fontsource/instrument-serif` must be added to `apps/web/package.json` with bun and the
  import added to `styles.css`; a missing font file breaks the build silently.
- The favicon 404 is currently the only console error. Fixing it is a hard-gate
  requirement, not a nicety.
- Do not touch `packages/shared`, the actor, or the relay pipeline. Visual work only.
- Do not commit `.env`, `.durable-actors/`, `.agent-relay/`.

## Explicitly out of scope

- `DEMO_MODE=live` (deferred until after the video).
- Cloud hosting choice (VPS vs Vercel Sandbox): still blocked on the user.
- Changing the demo fixtures, the beat list, or the video plan.
- Any new npm dependency other than the display font.
