---
workflow: general-video
flow: automation
storyboard: no
message: "DealRelay puts AI agents and humans in one live deal room, and the deal closes in under a minute"
destination: file
aspect: 1920x1080
language: en
length: ~80s
angle: product-demo
---

## Intent

Hackathon demo video for DealRelay (repo: tarima2). Arc: problem (fragmented
event-procurement email chaos) > product demo (agency/client deal room, agents
Scout/Finance/Negotiator parsing proposals, flagging violations, countering,
human approves) > ROI stat hits > agent architecture board > repo card.
Tone: dark-tech premium for framing beats (near-black canvas, glow sweeps, big
Geist type), light editorial for the mock deal-room screens (matches the real
app's screen spec: warm bone background, hairline borders, pastel status chips,
Instrument Serif event name). Judges are hackathon reviewers; every judge
criterion must be visible.

## Assets

- `.agents/docs/ui-screen-spec.md` — normative screen spec for the mock deal-room scenes (tokens, layout, component forms). Treat section 2 tokens as brand truth for in-app scenes.
- `.agents/docs/design-system.md` — overall design system context.
- `.agents/docs/demo-video-plan.md` — beat table and fixture content (venue names, prices, constraints).
- `packages/shared/src/fixtures.ts` — canonical fixture data (Northwind Product Launch, Nov 20, $30k, 500 guests, 02:00 curfew, AV; The Grand Loft $26k/550/00:00; Warehouse 9 $34k/600/03:00).

## Customizations

- Framing beats use the "dark glow typographic" style: near-black (#0a0a12-ish) ground, one glowing pale band sweep per transition, large Geist/Inter-class type, one idea per beat.
- Beat "problem": a mock fragmented email/WhatsApp-style chat chain scrolling, timestamps drifting (Mon... Tue... 3 days later), messages from scattered threads. Registry blocks chat-thread / thread-message-stack are candidates; hand-build if they don't fit 16:9.
- Beat "demo" (core, ~50s): mock deal-room UI rebuilt as deterministic HTML sub-compositions styled exactly like the screen spec — NOT real footage in v1. Two-window framing (agency left, client right) or full-bleed agency view cutting to client approval moment. Beats: constraints set > proposals injected > agent trace streams (Scout parses, Finance flags budget+curfew violations, Negotiator drafts counter) > counter card $27,000 / 01:30 curfew > approval bar pulses > client approves > ACCEPTED.
- Beat "ROI": 2-3 count-up stat hits ("4 days of email > 46 seconds", "3 agents, 1 approval, 0 lost threads").
- Beat "architecture": constellation-style agent board, Scout/Finance/Negotiator nodes + connectors drawing from a hub (registry: constellation-hub), labels: durable actors (state) + Agent Relay (coordination).
- Closing card: repo link github.com/espetro/tarima2 (verify before final render), wordmark "DealRelay".
- No voiceover. No music in v1 unless trivially available offline; silence with motion is acceptable.

## Notes

- Mock UI scenes must avoid real-app chrome dependencies; rebuild with plain HTML/CSS + the screen spec tokens. Fonts: use a system-safe stack or bundle an open font that ships with the tooling; Instrument Serif may not be available in renderer, fall back gracefully to a serif stack.
- Deterministic only: no clocks, no unseeded random, no network at render time.
- Canvas 1920x1080 30fps. Every beat hard-cuts or glow-sweeps; no long crossfades.
- v1 is a first iteration for user review; favor clarity over polish in motion, exact fidelity to the screen spec in the mock UI.
