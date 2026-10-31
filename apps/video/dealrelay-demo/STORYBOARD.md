---
format: 1920x1080
duration: 80s
message: "DealRelay puts AI agents and humans in one live deal room, and the deal closes in under a minute"
arc: Problem → Name → Demo → Proof → Architecture → CTA
audience: hackathon judges
mode: autonomous
---

## Frame 1 — Problem

- scene: Fragmented email/WhatsApp-style chat chain scrolls; timestamps drift apart; the deal gets lost between threads
- duration: 8s
- transition_in: cut
- poster: 6s
- status: outline
- blueprint: kinetic-type-beats (Adapt)
- rules: discrete-text-sequence
- src: compositions/frames/01-problem.html

Dark glow canvas. A mock message chain (email-style bubbles) arrives beat by beat: "Re: venue quote?", forwarded PDF, "which thread are we on?", "bumping this", "3 days later: venue booked elsewhere". Timestamps drift visibly (Mon 09:12, Tue 17:40, Fri 08:03, "3 days later"). A glowing pale band sweeps the frame at the end and wipes it away.

## Frame 2 — Name card

- scene: DealRelay wordmark with light-sweep glow on near-black
- duration: 3s
- transition_in: cut
- poster: 2s
- status: outline
- blueprint: titlecard-reveal (Adapt)
- rules: gradient-text-sweep
- src: compositions/frames/02-name.html

"DealRelay" in large Geist-class type, a traveling glow band crosses the word once, subline fades in: "agents and humans in one live deal room". Hold, then cut.

## Frame 3 — Demo: constraints

- scene: Mock deal-room UI (light editorial, per screen spec): event header with spec chips lands
- duration: 8s
- transition_in: cut
- poster: 7s
- status: outline
- blueprint: compose
- rules: dynamic-content-sequencing
- src: compositions/frames/03-demo-constraints.html

Full-bleed light deal-room view built per `.agents/docs/ui-screen-spec.md` tokens: warm bone bg, white cards, hairline borders, Instrument-Serif-class event name "Northwind Product Launch", spec chips pop in one by one (calendar 2026-11-20, users 500, wallet $30,000 max, moon 02:00, speaker AV). Top bar: DealRelay wordmark + mono room id.

## Frame 4 — Demo: proposals arrive

- scene: Two venue proposals injected; venue cards populate with constraint chips; violations show red
- duration: 12s
- transition_in: cut
- poster: 10s
- status: outline
- blueprint: compose
- rules: dynamic-content-sequencing, press-release-spring
- src: compositions/frames/04-demo-proposals.html

Two venue cards slide in under "Proposals": The Grand Loft ($26,000 / 550 / 00:00 curfew red / AV green) and Warehouse 9 ($34,000 red / 600 green / 03:00 green / AV green). Status chips go from "Pending audit" amber. Statuses update to audited as chips color-code. Layout: proposals column left (8/12), muted agent-activity rail right (4/12).

## Frame 5 — Demo: agents think

- scene: Agent activity rail streams: Scout parses, Finance flags violations, Negotiator drafts counter
- duration: 14s
- transition_in: cut
- poster: 12s
- status: outline
- blueprint: agent-progress-theater (Adapt)
- rules: typewriter-reveal, discrete-text-sequence
- src: compositions/frames/05-demo-agents.html

Same room view; the agent rail streams collapsible runs: pastel actor dots (blue Scout, purple Finance, amber Negotiator) with per-event mono-timestamp lines appearing on a measured cadence (typewriter/streaming rhythm): "Scout: parsed Grand Loft proposal", "Finance: $26,000 within $30,000 cap", "Finance: curfew 00:00 violates 02:00 requirement", "Negotiator: drafting counter-offer". Red violation chips pulse subtly on the cards in sync with Finance flags.

## Frame 6 — Demo: counter and approval

- scene: Approval callout strip appears; counter terms shown; client approves; both flip to accepted
- duration: 14s
- transition_in: cut
- poster: 12s
- status: outline
- blueprint: compose
- rules: dynamic-content-sequencing, press-release-spring, counting-dynamic-scale
- src: compositions/frames/06-demo-approval.html

Slim amber approval callout lands above proposals: "2 counter-offers need approval", rows for both venues with counter essence ("$27,000 if curfew extends to 01:30"). Camera holds; approve button presses on the Grand Loft row; strip row flips to approved green; venue card status chip flips to "Accepted"; Warehouse 9 row shows "Vendor accepted" green. Brief celebratory tick, then the glow band wipes the room away.

## Frame 7 — ROI

- scene: Count-up stat hits on dark glow canvas
- duration: 8s
- transition_in: cut
- poster: 6s
- status: outline
- blueprint: dataviz-countup (Adapt)
- rules: counting-dynamic-scale, ambient-glow-bloom
- src: compositions/frames/07-roi.html

Dark canvas, three stat hits, one at a time, count-up numerals: "4 days" (strikethrough) vs "46 seconds" deal cycle; "3 agents"; "1 approval, 0 lost threads". Each lands with a restrained pulse.

## Frame 8 — Architecture

- scene: Constellation board: hub draws connectors to Scout, Finance, Negotiator nodes, then durable-actors + Agent Relay labels
- duration: 6s
- transition_in: cut
- poster: 5s
- status: outline
- blueprint: constellation-hub (Reproduce)
- rules: ambient-glow-bloom
- src: compositions/frames/08-architecture.html

Dark canvas. Central hub "DealRelay Room" with SVG connectors drawing outward to three actor nodes (Scout, Finance, Negotiator) with pastel dots; then two quiet caption lines fade in: "durable actors: state that survives restarts" and "agent relay: coordination between agents". Use the installed constellation-hub component as the base.

## Frame 9 — CTA

- scene: Wordmark + repo link closing card
- duration: 4s
- transition_in: cut
- poster: 3s
- status: outline
- blueprint: titlecard-reveal (Adapt)
- rules: gradient-text-sweep
- src: compositions/frames/09-cta.html

Dark canvas, DealRelay wordmark centers, one glow sweep, below it in mono: "github.com/espetro/tarima2" and "agents + humans, one deal room". Hold to end.
