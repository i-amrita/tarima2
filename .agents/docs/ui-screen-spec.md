# Screen spec: room redesign (light editorial)

Status: draft v1, 2026-10-31. Checkpoint: `/room/$roomId` (agency + client roles, empty +
populated states). Evaluator inputs: this spec, `.agents/docs/ui-references.md`, the rubric
below, screenshots under `.agents/docs/screens/`.

## 1. Intent

Replace the dark all-mono dashboard with a light, editorial, canvas-forward deal room. The
event, the proposals, and the agent activity are the product; chrome shrinks to one slim top
bar. Direction and rationale: `.agents/docs/ui-references.md` (patterns converge across
paper.design, town.com, promptql.io, relume.io; agent-swarm is the color outlier).

Baseline evidence (current UI, to be replaced): `screens/baseline/before-agency-1440.png`,
`before-agency-populated-1440.png`, `before-client-populated-1440.png`, plus 1024/390 variants.

## 2. Tokens (styles.css)

Light is the default. `:root` carries the light values below; keep a `.dark` override block
with the current dark palette for future use; remove `className="dark"` from `<html>` in
`__root.tsx`. No hardcoded colors in components.

- `--background`: warm off-white, oklch(0.975 0.004 90). Evidence: paper + town warm canvases
  (2 of 5, pattern 1).
- `--foreground`: warm near-black, oklch(0.19 0.005 90).
- `--card`: pure white oklch(1 0 0); cards float on the warm canvas (relume, paper).
- `--muted`: oklch(0.955 0.004 90); `--muted-foreground`: oklch(0.5 0.01 90).
- `--border` / `--input`: hairline oklch(0.9 0.005 90); `--ring`: oklch(0.4 0.01 90).
- `--primary`: ink (same as foreground); `--primary-foreground`: white. Primary buttons are
  near-black on light, the paper/relume CTA pattern (pattern 5).
- `--radius`: 0.625rem (slightly softer than current 0.5rem; cards read friendlier in light).
- Status tokens become tint systems for light bg: met = green tint bg oklch(0.96 0.03 150),
  text oklch(0.42 0.12 150), border oklch(0.85 0.07 150); violated = red tint bg
  oklch(0.96 0.02 25), text oklch(0.5 0.19 25), border oklch(0.87 0.08 25); pending = amber
  tint bg oklch(0.97 0.04 85), text oklch(0.55 0.12 70), border oklch(0.89 0.07 85). Keep the
  existing var names (`--status-met` etc. plus `-foreground`/`-border` additions). Color is
  earned: green only met/approved, red only violated/destructive, amber only awaiting (pattern 5).
- Fonts: add `@fontsource/instrument-serif` (verified on npm, 5.3.0) as `--font-display`.
  Geist Sans stays the body font, Geist Mono the meta font (pattern 4: mono is a utility
  voice, never body or headings).
- Add a favicon (inline SVG data URI or a small svg in `public/`): the current app logs one
  console error for the missing favicon and the hard gate is zero console errors.

## 3. Layout

Max width `max-w-6xl`, generous vertical rhythm (py-10 desktop). Regions top to bottom:

1. **Top bar** (one row, h-14, hairline bottom border, white bg): left = wordmark
   "DealRelay" (sans semibold, sentence case) + mono room id in muted; right = connection
   indicator (small dot + "connected" text, green/red by status), role switcher as a compact
   segmented control (Agency / Client, active = ink bg white text), and a "Demo" popover
   holding the env-gated kill action. No second stacked bar anywhere (pattern 3).
2. **Editorial header** (the event): mono eyebrow "PROCUREMENT DEAL ROOM"; the event name as
   an oversized display heading in Instrument Serif, 44-52px desktop, sentence case, tight
   tracking (pattern 2). Below it one quiet inline specs row separated by hairlines or dots:
   date, guests, budget, curfew, AV in mono values with tiny sans labels; not boxed chip
   cards. Contextual action: "Set demo specs" / "Reset demo specs" as a ghost button aligned
   right of the specs row. Empty state: heading "No event on the books yet." + the set-specs
   button; no amber dot pulse.
3. **Approval panel** (only when proposals are `REQUIRES_APPROVAL`): one amber-tinted panel
   above the proposals list, not one white card per proposal. Title "Awaiting your approval",
   one row per pending proposal (venue name + counter strategy + delta), and a single ink
   "Approve counter-offer" button per row for the client; agency sees "Waiting for client
   approval" with a subtle pulse. This is the human-in-the-loop beat; it must be
   unmistakable in both roles.
4. **Content split 8/4** (lg): left = "Proposals" section, stacked white VenueCards; right =
   "Agent activity" rail, sticky, height `calc(100vh - 8rem)` with internal scroll. Proposal
   count moves into the section heading as quiet text ("Proposals (2)").
5. **Proposal cards** (white, hairline border, no backdrop-blur): venue name in sans
   semibold 18px; status badge top-right (tinted, sentence case "Requires approval"); vendor
   rawText as a muted quote block in sans italic; constraint audit as a 4-up row of quiet
   tinted cells with mono details; agent strategy section only when audit exists, counter
   text in sans, not mono. Remove per-actor rainbow badge palettes (pattern 5); actors get a
   small colored dot at most.
6. **Agent activity rail**: white card, header "Agent activity" + count; grouped runs keep
   Task/Collapsible; actor label with a small dot, message in sans 13px, timestamp in mono
   11px muted (pattern 4). Auto-scroll behavior preserved.
7. **Demo controls**: inject + vendor-accept actions become an inline toolbar row at the top
   of the proposals column: ghost buttons for "Inject Grand Loft" / "Inject Warehouse 9" /
   "Vendor accepts", exactly one ink primary action "Simulate inbound proposal" style CTA.
   "Kill actor" lives in the top-bar Demo popover, destructive only in confirmation, and
   keeps its current env-gating behavior unchanged.
8. **Mobile** (<lg): single column; specs row wraps; approval panel above proposals; activity
   rail becomes a normal section below proposals (no sticky); toolbar wraps. No layout
   collapse or horizontal scroll at 1440/1024/390.

## 4. Invariants

- All existing `data-testid`s survive: `room-header`, `switch-role-agency|client`,
  `connection-status`, `constraint-header`, `set-demo-specs-button`, `approval-bar`,
  `approve-button`, `approval-waiting-state`, `comparison-canvas`,
  `proposal-card-*`, `proposal-status-*`, `constraint-badge-*`, `trace-feed`, `trace-run`,
  `trace-item`, `simulation-drawer`, `inject-grand-loft`, `inject-warehouse-9`,
  `vendor-accepts`, `kill-actor`.
- No behavior changes: socket flow, server functions, status transitions, env gating,
  approvals, auto-scroll stay as-is.
- Component sourcing rules from `design-system.md` still apply (ui primitives, ai-elements,
  dealroom compositions only).
- Role-gated rendering unchanged: SimulationDrawer/toolbar only for agency; approve button
  only for client.

## 5. Rubric (evaluator-only; do not hand to the generator as a checklist)

Hard gates first, any red is FAIL without judgment: console errors 0 (favicon fix counts),
console warnings 0, network 5xx 0, axe critical/serious 0, no layout collapse at
1440x900 / 1024x768 / 390x844, `bash tests/e2e/smoke.sh` green.

Then, each scored pass/fail with evidence:

1. Light editorial canvas: warm off-white bg, white cards, near-black ink; no dark-mode
   remnants (cites spec S2, references pattern 1).
2. Display heading: event name in Instrument Serif >= 44px sentence case; mono never used
   for headings or body (S2, S3.2; pattern 2, 4).
3. Single top bar; no stacked full-width bars; product surface starts immediately (S3.1;
   pattern 3).
4. Approval beat: single panel, amber tint, distinct per-role states, present in both roles'
   screenshots (S3.3).
5. Status color earned: green/red/amber only for met/violated/pending; no rainbow actor
   badges; primary CTA is ink (S2, S3.5; pattern 5).
6. Mono restricted to meta: timestamps, room id, spec values, eyebrows (pattern 4).
7. Layout: 8/4 split at lg, sticky activity rail, inline demo toolbar, kill in popover;
   empty states for specs and proposals exist and are quiet (S3).
8. Invariants: all testids present (S4), behavior unchanged, role gating unchanged.

Verdict schema per UILOOP S5; max 3 iterations; anti-oscillation ledger required.
