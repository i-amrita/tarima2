# 2026-10-31 repo init and scope lock

Plan: initialize the DealRelay monorepo (bun workspaces, no turborepo yet), land streams A (actors + shared types) and D (validation gate), then B (relay), then C (web).

## Why no turborepo (for now)

Three workspaces with linear dependencies. Bun workspaces plus two root scripts (`dev`, `validate`) cover it. Add turbo when a fourth package lands or when `validate --quick` exceeds ~45s because steps run serially. Revisit, do not debate.

## Ticket-style breakdown

### A. packages/actors + packages/shared (S)

- `packages/shared/src/types.ts`: Role, VenueStatus, EventSpecs, VenueProposal, AuditResult, ActivityEvent, RoomState, NewVenueProposal. No imports.
- `packages/actors/src/actors.ts`: RoomActor with methods from ARCHITECTURE.md. @Persisted + @Emittable on specs, proposals, activity.
- `bunx durable-actors generate`, commit `generated/`.
- Vitest: state transitions (inject -> submitAudit -> recordApproval -> recordVendorAcceptance) and persistence across simulated restart.

### D. Validation gate + toolchain (S)

- Root `package.json` with bun workspaces, `dev`, `validate`, `validate:quick`.
- `.mise.toml` pinning bun 1.4.3.
- `scripts/validate.ts` (tsc, oxlint, vitest, actor contract check).
- oxlint config, tsconfig base, `.gitignore` (.env, .durable-actors/, .agent-relay/, generated client exceptions documented).

### B. apps/relay (M)

- `RelayPipeline` with `runProposal(proposalId, rawText, specs)`.
- Fixture mode: scripted Scout/Finance/Negotiator messages with cadence; then `roomActor.submitAudit(...)`.
- Live mode stub behind `DEMO_MODE=live` (harness spawns; can land after video is recorded).
- Vitest: fixture run produces expected audit result and activity events.

### C. apps/web (M)

- TanStack Start + Nitro (node-server preset), Tailwind v4.
- Design system: **shadcn/ui with a Geist-style theme** (see `.agents/docs/design-system.md`). Every component is built from shadcn/ui base components (`components/ui/*`); complex components compose base components or libraries layered on shadcn/ui (`components/ai-elements/*`, `components/prompt-kit/*`). No ad-hoc styled divs where a base component exists.
- shadcn AI Elements (`@ai-elements/*` registry, shadcn-native version — NOT the deprecated `elements.ai-sdk.dev` package) for the agent surfaces: Trace for the agent feed, Reasoning for streamed thinking, Confirmation for the approval bar, Task/Subagent for per-agent work units.
- Routes per ARCHITECTURE.md. Socket grant server function. Trace feed, comparison canvas, approval bar, simulation drawer.
- Reads room state over WebSocket; mutations go through server functions (typed RPC).
- Playwright smoke via `playwright-cli` skill for the happy path (per global rule, not raw @playwright/test in-repo).

### E. Demo assets (S)

- `scripts/demo/restart-actor.sh`, fixture copy finalization, dress rehearsal, record.

## Version pins (verified against npm 2026-10-31)

- `nitro` v3 is still RC (`3.0.261029-rc`); brioso already runs it via `nitro/vite`, so we inherit a proven config. Pin the same RC line.
- `@tanstack/react-start` 1.169.x, `@tanstack/react-router` 1.170.x.
- TypeScript: use `^7.0` (7.1 exists only as `7.1.0-dev` nightlies; do not pin a nightly for the hackathon). `type-fest` latest stable.
- `durable-actors` 0.14.6, `@agent-relay/sdk` 15.0.1 (both verified working today).

## Open decisions

- Cloud demo host: VPS (Hetzner, own-agents user) vs fly.io. Decide after first local run. Default VPS since we already have the user and can caddy it.
- Whether to check in `.durable-actors/` seeded state for judges: no, judges get the empty-room flow; the video carries the state story.
- Using Agent Relay itself as the dev-coordination harness for building this repo: assessed in `.agents/docs/agent-relay-integration.md`. Verdict: no for the build loop (repo too small, coordination overhead exceeds parallelism win); revisit only if stream C runs with 3+ concurrent coding agents, and then only for observation (attach/view), not task routing.

## Verification

- Baseline log at `/tmp/tarima2-init-baseline-<ts>.log` after A and D land.
- `bun run validate --quick` green, then full gate green.
- Manual: two browser windows sync; kill actor and refresh restores state.

## Status 2026-10-31 (end of session)

- A, D, B, C landed on main. E: restart script, persistence check and e2e smoke landed; dress rehearsal and recording remain (manual).
- Verification: `bun run validate` green (baseline had zero failures, no regressions). `bash tests/e2e/smoke.sh` covers inject, relay audit, two-window approval sync, vendor acceptance, and actor kill with state restored. `bun scripts/demo/persistence-check.ts` covers durability.
- Delegation verdict (per HARNESSES.md and REMOTE.md): A and D stayed with the orchestrator because they share root config and gate everything else. B and C ran in parallel as local `agy` sessions in worktrees under `~/.worktrees/tarima2/`. The VPS (`own-agents@ovhcloud`) was not used: the repo has no pushed remote, and the placement rule needs one. Benefit: B and C finished in about 15 minutes of wall time while the orchestrator verified; cost: one real bug (StrictMode socket) and one wrong registry URL that only orchestrator-side browser QA and a registry probe caught. Verdict: worth it for B and C, not for A and D. For stream E or a second web iteration, push the repo and use `harness r own-agents@ovhcloud`.
- Deferred by this plan, unchanged: live mode (`DEMO_MODE=live`, after the video is recorded) and the cloud demo host (decide after first local run; default VPS).
