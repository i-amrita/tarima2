# Plan: Feedback UI, Expandable Cards, and Storytelling on Stage

Status: planned 2026-10-31. Branch: `feat/feedback-ui`.

## Objectives

Implement human-in-the-loop feedback controls, expandable proposal cards with agent provenance, and stage storytelling elements (role banner and "How it works" popover) in the DealRelay web client.

## Scope & Constraints

- apps/web UI and documentation only. No changes to packages/actors or apps/relay.
- Wire types from packages/shared/src/types.ts (v3 contract) must be respected without unauthorized changes.
- UI must gracefully handle new statuses (REVISING, REJECTED) even before backend implementation lands.
- Keep every existing data-testid; add required new testids: `reject-<id>`, `comment-input-<id>`, `comment-send-<id>`.
- Bun only. No emdashes in UI or prose copy. No useEffect for data sync.
- Ports: use 7150 (actors), 7250 (relay), 3150 (web) for verification; never touch 7100/7200/3100.

## Implementation Steps & Commits

1. **Step 1: Feedback controls and socket actions**
   - Update `useRoomSocket` to expose `reject(proposalId, reason?)` and `comment(proposalId, text)`.
   - Update `ComparisonCanvas` and `VenueCard` to render feedback controls when `status === "REQUIRES_APPROVAL"`:
     - Client role: Approve button (primary), Reject button (`reject-<id>`) with inline confirm and optional reason, Comment/steer composer (single textarea `comment-input-<id>`, send button `comment-send-<id>`).
     - Agency role: Comment/steer composer (no approve/reject).
     - REVISING status: quiet "Negotiator is revising" status with `<TextShimmer>` from `components/ai-elements/shimmer.tsx`.
     - REJECTED status: muted terminal card state.
   - Commit: `feat(web): add proposal feedback controls and revising state`

2. **Step 2: Expandable proposal cards**
   - Implement keyboard-accessible expand button with `aria-expanded` on `VenueCard`.
   - Expanded section contains:
     - Vendor email (rawText) with Scout agent attribution dot + name.
     - Audit table (budget delta, capacity delta, violations chips) with Finance agent attribution dot + name.
     - Counter strategy and draft counter text with Negotiator agent attribution dot + name.
     - Feedback thread (chronological list of comments/rejections, role, timestamp, revision) with role attribution dot + name.
   - Keep collapsed state clean and quiet.
   - Commit: `feat(web): support expandable proposal cards with agent provenance`

3. **Step 3: Storytelling on stage & demo script**
   - Add role banner directly beneath the top bar:
     - Agency: "You are Northwind Events, the agency. Your agents scout and negotiate venues; you steer them."
     - Client: "You are the client, Northwind's launch owner. Agents bring you counter-offers; you approve, reject or push back."
   - Add compact "How it works" popover reachable from the top bar with the 3 steps (no emdashes).
   - Write `.agents/docs/demo-script.md` (90-second script, click order, dialogue, audience takeaways, failure recovery plan).
   - Update `.agents/docs/ui-screen-spec.md` with new specifications.
   - Commit: `feat(web): add role banner, how-it-works popover, and stage demo script`

4. **Step 4: Verification & Screenshots**
   - Spin up isolated dev stack on ports 7150 / 7250 / 3150.
   - Run `bun run validate` (typecheck, lint, test, contract).
   - Capture screenshots for both roles at 1440x900, 1024x768, 390x844 plus expanded card and comment thread into `.agents/docs/screens/feedback-ui-iter-1/`.
   - Audit axe accessibility (critical/serious = 0), console logs (errors = 0, warnings = 0).
   - Final summary in `/tmp/feedback-ui.md` and touch `/tmp/feedback-ui.done`.
