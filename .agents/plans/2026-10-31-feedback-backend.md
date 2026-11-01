# Feedback-Based Agentic Workflow Implementation Plan

## Goal
Implement a feedback-driven negotiation loop across packages/actors, apps/relay, tests, and scripts.
Allow client and agency to comment on proposals, role-gate reject (client only, terminal), enable the negotiator loop to redraft counters with revision increments, and maintain deterministic offline fixtures mode alongside live mode.

## Steps
1. Package & Actor Transitions:
   - Update `packages/actors/src/transitions.ts`:
     - `applyComment`: append ProposalFeedback, transition active proposal to `REVISING`.
     - `applyReject`: terminal transition to `REJECTED`, reject reason optional (appended to feedback if present).
     - `applyAudit` / `applyRevision`: accept `REVISING` proposals, increment revision (+1 from current), set status `REQUIRES_APPROVAL`, actedBy `negotiator`.
     - Unit tests in `packages/actors/src/transitions.test.ts`.
2. RoomActor Methods and onMessage:
   - Update `packages/actors/src/actors.ts`:
     - Handle `reject` in `onMessage`: role-gate client only (toast "Only the client can reject"), call `recordReject`, broadcast toast.
     - Handle `comment` in `onMessage`: role-gate client or agency (toast "Only client or agency can comment"), call `recordComment`, broadcast toast, notify relay at `POST /feedback`.
     - Implement `getState()` on RoomActor to allow clean state observation by Relay.
     - Regenerate client via `bun --cwd packages/actors generate` and verify `bun run check-actor-contract`.
3. Relay Negotiator Loop & Model Clients:
   - In `apps/relay/src/llm/types.ts`:
     - Add `draftRevision` to `ModelClient` with `ModelRevisionResult`.
   - In `apps/relay/src/pipeline.ts`:
     - Add `generateRevisionRules` for rule-based redrafting on keywords (budget, cheaper, curfew, 2am, AV, capacity, generic fallback).
     - Add `runRevision` method to `RelayPipeline` executing the deliberation loop (negotiator reviews feedback, scout/finance re-checks on changed numbers, negotiator counters at revision+1, submits audit to actor).
   - In `apps/relay/src/llm/fixture.ts`:
     - Implement `draftRevision` using deterministic rule-based redraft.
   - In `apps/relay/src/llm/live.ts`:
     - Implement `draftRevision` using model for prose only while money math stays deterministic.
   - In `apps/relay/src/server.ts`:
     - Add `POST /feedback` and `POST /revise` endpoints.
     - Add active room tracking and reconciliation poll loop for actor recovery after restarts.
4. Testing:
   - Add unit tests in `apps/relay/src/pipeline.test.ts` and `apps/relay/src/llm.test.ts` for fixture redraft rules, revisions, and scout/finance re-checks.
   - Add actor integration / unit tests for role gating, terminal state, comment -> REVISING -> REQUIRES_APPROVAL.
   - Extend `tests/e2e/smoke.sh` and `scripts/smoke-actor.ts`.
5. Validation:
   - Run `bun run validate`.
   - Capture final validate log and diff against baseline `/tmp/tarima2-feedback-backend-baseline-1793492466.log`.
   - Write `/tmp/feedback-backend.md` and touch `/tmp/feedback-backend.done`.
