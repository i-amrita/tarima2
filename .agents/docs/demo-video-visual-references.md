# Demo video visual references and registry plan

Status: research notes (2026-10-31, explore mode)

## Visual direction (decided from references)

Two reference styles, blended:

1. **Dark glow typographic** (Designedgepro X video, 27s): near-black canvas (#0a0a12-ish), pale glowing band sweeping the frame, big Geist type, one idea per beat. Use for: problem framing, ROI stat hits, architecture, closing card.
2. **OpenDesign Motion scene grammar** (open-design.ai/motion, X reel): problem > product screens > feature callouts > launch message. Their "system board" scene (token cards connected by lines lighting up in sequence) maps directly to our Scout > Finance > Negotiator agent board; doubles as the architecture card.
3. **snapcn.dev** (shadcn-labs, Remotion component library, ~150 components in 9 categories). Catalog-only relevance: confirms the component vocabulary (text reveals, chat threads, counters, terminal simulator, screen-recording cursor zoom). Its `cursor-track` / `screen-recording` ideas map to HF's `cursor-zoom-follow`; its `terminal-simulator` maps to HF's `code-terminal-run`. We build in HyperFrames, so snapcn is inspiration, not a dependency.

## HyperFrames registry shortlist (448 items searched)

Keyed to our beats:

| Beat | Registry item | Type |
| --- | --- | --- |
| Dark glow band sweep | `light-sweep-pass`, `shimmer-sweep`, `transitions-light` | component/block |
| Agent system board (Scout>Finance>Negotiator connectors) | `constellation-hub` (nodes brighten in order, SVG connectors draw from hub) | component |
| Agent trace typewriter | `typewriter`, `streaming-text` (AI token rhythm, closer to our trace), `per-word-rise` | component |
| ROI stat counters | `count-up`, `number-wheel`, `mk-progress-stat` | component/block |
| Demo footage framing | `browser-device-stage` (browser chrome + slot for our recording), `cursor-zoom-follow` (auto-zoom to clicks in screen recordings) | component |
| Problem email/WhatsApp chain | `chat-thread`, `thread-message-stack`, `chat-message`, `typing-indicator` | block/component |
| Kill-the-actor terminal beat | `code-terminal-run` | component |
| Title cards | `announce-title`, `wordmark-cut` (scenes) | block |

## Skills vendored into repo

Copied from `~/.agents/skills` into `.agents/skills/` (5.5MB total):

hyperframes, hyperframes-core, hyperframes-cli, hyperframes-creative,
hyperframes-animation, hyperframes-keyframes, hyperframes-registry,
hyperframes-studio, hyperframes-audio, general-video, media-use

Refresh with `npx hyperframes skills update` when starting the build (installs
the owning workflow, e.g. general-video, on demand). Note: `npx hyperframes
usage --json` returned `status: unknown` (unsupported_harness) in this
environment; report usage as unknown, do not guess render allowance.

## Routing

Hybrid piece (invented motion graphics + recorded demo footage). Expected
route: `/general-video` via the intent interview, which ends by writing
`BRIEF.md`. The refined arc: problem (animated, 8s) > name card (2s) > live
demo beats 2-7 from demo-video-plan.md (~55s) > ROI stats (8s) > architecture
card via agent system board (5s) > repo card (3s), ~80s total.
