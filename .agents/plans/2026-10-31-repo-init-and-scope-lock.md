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

- TanStack Start + Nitro (node-server preset), Tailwind.
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

## Verification

- Baseline log at `/tmp/tarima2-init-baseline-<ts>.log` after A and D land.
- `bun run validate --quick` green, then full gate green.
- Manual: two browser windows sync; kill actor and refresh restores state.
