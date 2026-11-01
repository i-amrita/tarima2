# Screen spec: room redesign (light editorial, minimal information load)

Status: draft v2, 2026-10-31. Supersedes v1. Checkpoint: `/room/$roomId` (agency + client
roles, empty + populated states). Evaluator inputs: this spec, `.agents/docs/ui-references.md`,
the rubric below, screenshots under `.agents/docs/screens/`.

Design system basis: minimalist-ui protocol (warm monochrome canvas, pastel spot colors,
ultra-flat components, hairline borders) with the editorial serif display voice from the
high-end visual design skill. Governing principle: information is embedded in component form
(color-coded chips, callouts, collapsibles), never delivered as paragraph text. First view
carries meaning; details are one click away.

## 1. Intent

A light, quiet deal room where a judge reads the story in under five seconds: the event, what
needs a decision, how each venue scores, what the agents did. Chrome is nearly absent;
color is scarce and semantic.

Baseline evidence (approved UILOOP iteration 4, 2026-10-31): `screens/baseline/{agency-empty,agency-populated,client-populated}-{1440,1024,390}.png`. Trace items wrap to two lines with the full text in `title`; the agent activity panel is slated to become a chat-style log (see the follow-up plan).

## 2. Tokens (styles.css)

Light is the default. `:root` carries the values below; keep a `.dark` override block with the
current dark palette for future use; remove `className="dark"` from `<html>` in `__root.tsx`.
No hardcoded colors in components.

Neutrals (warm monochrome):

- `--background`: warm bone oklch(0.978 0.003 90) (~#FBFBFA).
- `--foreground`: soft ink oklch(0.21 0.005 90) (~#111111); never pure black.
- `--card`: white oklch(1 0 0).
- `--muted`: oklch(0.96 0.003 90) (~#F7F6F3); `--muted-foreground`: oklch(0.55 0.01 90)
  (~#787774).
- `--border` / `--input`: hairline oklch(0.925 0.004 90) (~#EAEAEA); `--ring`: oklch(0.4 0.01 90).
- `--primary`: ink; `--primary-foreground`: white. Primary buttons: ink bg, 4-6px radius, no
  shadow, hover #333, active scale 0.98.

Pastel spot colors (chips and tints only, never large surfaces). Each is a background/text
pair; add `-foreground` and `-border` companions:

- `--status-met`: bg oklch(0.962 0.012 140) (~#EDF3EC), fg oklch(0.42 0.07 140) (~#346538),
  border oklch(0.9 0.03 140).
- `--status-violated`: bg oklch(0.96 0.012 15) (~#FDEBEC), fg oklch(0.42 0.09 15) (~#9F2F2D),
  border oklch(0.9 0.03 15).
- `--status-pending`: bg oklch(0.965 0.025 95) (~#FBF3DB), fg oklch(0.5 0.08 85) (~#956400),
  border oklch(0.91 0.04 95).
- `--info`: bg oklch(0.955 0.02 230) (~#E1F3FE), fg oklch(0.45 0.07 230) (~#1F6C9F), for
  capacity/guest chips and the activity rail's quiet accents.
- Pastel actor dots (6px circles): scout `--info` fg blue, finance purple oklch(0.45 0.08 300),
  negotiator `--status-pending` fg amber, client/system `--muted-foreground`. Dots only, never
  tinted text badges.

Typography:

- `--font-display`: Fraunces (self-hosted woff2 in `apps/web/public/fonts`, declared in `apps/web/src/fonts.css`, same files as dits) for the event
  name and the approval callout's count figure only.
- Plus Jakarta Sans (variable): all body, UI, buttons. Mono stack (Berkeley Mono, then ui-monospace): room id, timestamps, chip values, eyebrow. Same type system as dits.
  Mono never for headings or body sentences.
- `--radius`: 0.625rem (10px). Chips are pills (9999px) per the tag spec; cards never pills.

Icons: keep `lucide-react` (already installed; accepted deviation from the skill's Phosphor
preference) at size-3.5, single stroke weight, muted color. No emoji anywhere.

Favicon: add `apps/web/public/favicon.svg` and reference it; the current app logs one console
error for the missing favicon and zero console errors is a hard gate.

## 3. Layout

Max width `max-w-6xl`, py-10 desktop, generous gaps (space-y-8 minimum between regions).

```
top bar
editorial event header (eyebrow pill, serif name, neutral spec chips, set-specs ghost button)
[approval callout - only when something is REQUIRES_APPROVAL]
proposals column (8)                     | agent activity rail (4, muted, sticky)
  section head + demo toolbar            |   collapsible agent runs
  venue cards (white, flat)
```

### 3.1 Top bar and role banner

One row, h-14, hairline bottom border, canvas bg (not white). Left: wordmark "DealRelay"
(sans semibold, sentence case) + mono room id in `--muted-foreground`, no "Room:" label.
Right: role switcher as a compact segmented control (Agency / Client; active = ink bg, white
text); connection = a 6px dot only (green `--status-met` fg when connected, red when
disconnected/error, amber pulse while connecting) with `title`/`aria-label` carrying the
status word; compact "How it works" popover (3 steps: agents read vendor emails, agents audit and counter, humans decide and steer); a quiet "Demo" disclosure (outline button, size
icon-sm + chevron, `demo-menu` testid).

The Demo disclosure contains:
- Agency role:
  - An "Actions" section (`demo-actions-section` testid): "Inject Grand Loft", "Inject Warehouse 9", "Vendor accepts", and "Set demo specs" / "Reset demo specs" (`set-demo-specs-button` testid). Buttons are keyboard accessible, display in-flight loading states, and close the menu once the action completes.
  - A "Resilience" section: "Kill actor" (`kill-actor` testid, env gating with DEMO_ALLOW_KILL=1 unchanged).
- Client role:
  - Keeps no demo actions; contains only the "Resilience" section with "Kill actor".

Directly under the top bar, a one-line role banner explains the current window:
- Agency: "You are Northwind Events, the agency. Your agents scout and negotiate venues; you steer them."
- Client: "You are the client, Northwind's launch owner. Agents bring you counter-offers; you approve, reject or push back."

### 3.2 Editorial event header

- Eyebrow pill: "PROCUREMENT DEAL ROOM" as a microscopic pill tag (10px, uppercase,
  tracking 0.2em, muted bg, mono). No status dots, no pulsing.
- Event name: Fraunces, 44-52px desktop, sentence case, tracking -0.02em.
- Empty state: "No event on the books yet." accompanied by a quiet guidance line pointing to the menu ("Open Demo, then Actions, to set demo specs." in agency role; "Waiting for the agency to start the demo." in client role).
- Spec chips (when specs exist): one quiet row of neutral pills, icon + value in mono,
  e.g. `calendar 2026-11-20`, `users 500`, `wallet $30,000 max`, `moon 02:00`, `speaker AV`.
  Neutral bg (`--muted`) with ink text; color is NOT used here - specs are requirements, not
  results. Hairline separators or gap-2; no boxed stat cards, no labels like "DATE"/"GUESTS".
- Specs management ("Set demo specs" / "Reset demo specs") is accessed via the top bar Demo menu rather than body buttons.

### 3.3 Approval callout (replaces the per-proposal cards)

One slim strip, `--status-pending` bg tint, pending-border hairline, rounded-lg, no heavy
border, only when proposals are `REQUIRES_APPROVAL`. Content:

- Left: a small bell/alert icon (amber fg) + one sentence: "2 counter-offers need approval"
  (count in display serif or semibold sans; sentence is the only copy on the strip).
- Below it, one row per pending venue, single line each: venue name (sans medium) + the
  counter essence as short muted text (strategy, max ~60 chars) + right-aligned action.
- Client role: one ink button per row, "Approve" (plus the venue name makes it explicit).
  `approve-button` testid per row.
- Agency role: no buttons; a muted "waiting for client" text with the amber dot, one per row
  (`approval-waiting-state` testid).
- No counter-draft quotes, no deltas, no timestamps on the strip - those live in the card.

The callout must be readable in one glance in both roles' screenshots.

### 3.4 Proposals column (8/12)

Section head: "Proposals" (sans semibold 15px) + count in `--muted-foreground`
("Proposals (2)" is fine). Body demo controls are removed from the canvas; all demo orchestration actions live in the top bar Demo menu.

Empty state: when no proposals exist, the area displays a single quiet line pointing at the menu ("Open Demo, then Actions, to inject a proposal." for agency; "Waiting for the agency to start the demo." for client).

Venue card (white, `--border` hairline, 10px radius, no shadow or shadow < 0.05 opacity,
no backdrop-blur):

- Row 1: venue name (sans semibold 17px) left; revision indicator ("rev X") if revision > 0;
  status chip right - pill, pastel tint by status (met-green for ACCEPTED, pending-yellow for
  REQUIRES_APPROVAL / COUNTER_PROPOSED, REVISING shows soft pending shimmer, REJECTED shows
  muted terminal state, neutral for PENDING_AUDIT).
- Row 2: four constraint chips, pill, each icon + mono value, color-coded by evaluated
  status: budget `wallet $26,000` green/red, capacity `users 550` green (or `--info` when
  met? no - keep green/red/amber consistent: met=green, violated=red, pending=amber),
  curfew `moon 00:00` red when violated, AV `speaker` green/neutral. `constraint-badge-*`
  testids stay on these chips. The chip's title attribute carries the full detail sentence
  (e.g. "+$4,000 over the $30,000 cap"); the visible text is value-only. This is the
  color-coding the judge reads.
- Row 3: status-specific quiet row. When REVISING, shows amber dot with quiet shimmer
  "Negotiator is revising". When audit exists, shows one-line agent strategy in sans, muted,
  prefixed with a tiny negotiator dot - "Counter: extend curfew to 02:00". Clamped to one line.
- Expandable disclosure button: keyboard-accessible button with `aria-expanded` ("View details" /
  "Hide details"). Collapsed card stays quiet as today.
- Expanded section: reveals four detailed blocks with explicit agent provenance (agent dot + name):
  1. Vendor email: Scout dot + Scout label with raw text quote in muted container.
  2. Audit table: Finance dot + Finance label with budget delta, capacity delta, and violations as chips.
  3. Counter strategy and draft counter text: Negotiator dot + Negotiator label with strategy and draft text.
  4. Feedback thread: Client/Agency dot + role name, timestamps, revision numbers, and feedback messages.
- Feedback controls row (on proposals in REQUIRES_APPROVAL):
  - Client role: Approve button (primary ink), Reject button (`reject-<id>`, destructive-quiet,
    confirm inline with optional reason input), and Comment/steer composer (single textarea
    `comment-input-<id>`, send button `comment-send-<id>`, placeholder "Tell the negotiator what to change, e.g. push the budget to 28k").
  - Agency role: Comment/steer composer (`comment-input-<id>`, `comment-send-<id>`), no approve/reject buttons.

### 3.5 Agent activity rail (4/12, muted, sticky)

- Container: `--muted` bg, no border (or hairline same as muted), rounded-lg, sticky,
  fits content when short and caps at `calc(100vh - 8rem)` when long, internal scroll (`trace-feed` testid).
- Header inside: "Agent activity" (sans medium 13px) + count in muted mono; no green pulse
  dot, no "FEED" caps.
- Chat-style flat log: flat chronological list of all messages with no collapsed per-agent groups.
- Per-message layout:
  - Timestamp in mono 11px (`--muted-foreground`).
  - Pastel actor dot (6px circle: scout blue, finance purple, negotiator amber, client/system muted).
  - Agent name in sans 12px font-medium, capitalized. Screen reader uppercase tag preserved.
  - Attribution slots: optional model badge, latency badge (`Xms`), and token count badge (`X tok`), rendered only when present.
  - 2-line preview in sans 13px (`line-clamp-2`, leading-snug).
  - Progressive disclosure: keyboard-accessible "more" / "less" toggle button (`aria-expanded`) that only appears when text overflows 2 lines. Expanded state renders full text preserving line breaks in mono (`font-mono text-xs whitespace-pre-wrap break-words`) on a subtle tinted card. Clicking row or button toggles expand/collapse.
- Scroll affordances:
  - Pinned to newest messages by default.
  - Up-arrow button at top edge when messages exist above the viewport.
  - Down-arrow button at bottom edge when scrolled up away from bottom (jump to latest).
  - New incoming messages while scrolled up do not yank scroll position.
- Empty state: single muted line "No agent activity yet." (`trace-run` and `trace-item` testids preserved on render).

### 3.6 Mobile (<lg)

Single column: header, approval callout, proposals, activity rail (static, not sticky, muted
bg still distinguishes it). Toolbar wraps under the section head. Chips wrap. No horizontal
scroll or layout collapse at 390x844.

## 4. Invariants

- All existing `data-testid`s survive: `room-header`, `switch-role-agency|client`,
  `connection-status` (now the dot), `constraint-header`, `set-demo-specs-button`,
  `approval-bar`, `approve-button`, `approval-waiting-state`, `comparison-canvas`,
  `proposal-card-*`, `proposal-status-*`, `constraint-badge-*`, `trace-feed`, `trace-run`,
  `trace-item`, `simulation-drawer` (lives on the demo actions wrapper),
  `inject-grand-loft`, `inject-warehouse-9`, `vendor-accepts`, `kill-actor`.
- Feedback UI & demo menu testids added: `reject-<id>`, `comment-input-<id>`, `comment-send-<id>`, `role-banner`, `how-it-works-trigger`, `demo-actions-section`.
- No behavior changes: socket flow, server functions, status transitions, env gating,
  approvals, auto-scroll stay as-is.
- Component sourcing rules from `design-system.md` still apply (ui primitives, ai-elements,
  dealroom compositions only). Chips = Badge; callout = Alert; disclosures = Collapsible/Task.
- Role-gated rendering unchanged: toolbar only for agency; approve only for client.
- Motion: subtle only - 150-200ms hover shifts, optional 400-600ms fade-up on first paint.
  Nothing that delays screenshots or e2e asserts.

## 5. Rubric (evaluator-only; do not hand to the generator as a checklist)

Hard gates first, any red is FAIL without judgment: console errors 0 (favicon fix counts),
console warnings 0, network 5xx 0, axe critical/serious 0, no layout collapse at
1440x900 / 1024x768 / 390x844, `bash tests/e2e/smoke.sh` green.

Then, each scored pass/fail with evidence:

1. Quiet canvas: bone bg, white cards, hairline borders, soft ink text; no dark remnants,
   no shadows heavier than 0.05, no backdrop-blur on scrolling content.
2. Pastel discipline: the four pastel pairs appear only as chip/tint/callout accents; no
   saturated surfaces; no large tinted areas besides the approval callout and activity rail.
3. Serif display voice: event name in Fraunces >= 44px; mono never for headings or
   body; sans everywhere else.
4. Embedded information: specs as neutral icon chips (no labeled stat boxes); venue
   constraints as color-coded chips whose hue alone communicates met/violated/pending; the
   full detail hidden in title/tooltip, not on-screen.
5. Top bar: one bar, no status word, connection is a dot; role switcher segmented; kill
   action inside the Demo disclosure.
6. Approval callout: single slim strip, one line per venue, per-role action state, readable
   at a glance in both roles' screenshots.
7. Progressive disclosure: vendor email collapsed by default; older activity runs collapsed;
   strategy clamped to one line; no paragraph-length text visible without expansion.
8. Layout: 8/4 split, muted sticky rail, ghost demo toolbar; mobile stacks cleanly.
9. Invariants: all testids present (S4), behavior unchanged, role gating unchanged.

Verdict schema per UILOOP S5; max 3 iterations; anti-oscillation ledger required.
