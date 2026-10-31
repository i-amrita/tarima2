# Demo video plan

Status: draft v1 (2026-10-31)
Target length: 90s, 16:9 1920x1080, recorded locally.

## Assets

- Two browser windows tiled side-by-side (agency left, client right), each ~960x1080.
- A terminal window below or offscreen for the "kill the actor" beat.
- No voiceover in v1; title cards carry the story. Add VO only if judges ask.

## Beats

| # | t | Beat | Capture |
| --- | --- | --- | --- |
| 1 | 0:00-0:04 | Title card: "DealRelay: agents and humans in one live deal room" | Static |
| 2 | 0:04-0:09 | Agency window: fill constraints (Nov 20, $30k, 500 guests, 2 AM curfew, AV required) | Live |
| 3 | 0:09-0:14 | Click "Simulate inbound proposals" in the drawer; two cards appear in both windows | Live |
| 4 | 0:14-0:34 | Agent trace lights up: Scout parses, Finance flags budget + curfew violations, Negotiator drafts counter | Live, fixture stream |
| 5 | 0:34-0:46 | Counter-offer card appears: "$27,000 if curfew extends to 1:30 AM". Client window shows pulsing approval bar | Live |
| 6 | 0:46-0:54 | Client clicks Approve. Both windows flip to COUNTER_PROPOSED; simulated vendor replies ACCEPTED | Live |
| 7 | 0:54-1:06 | Cut to terminal: kill the actor process, refresh both browsers, state restored from SQLite | Live |
| 8 | 1:06-1:14 | Architecture card: Terse actors (state) + Agent Relay (coordination) + TanStack Start (UI) | Static |
| 9 | 1:14-1:20 | Closing card: repo link | Static |

## Fixture requirements

- `DEMO_MODE=fixtures` must reproduce beats 2-6 deterministically with a 60-120ms per-chunk typewriter cadence on the trace.
- The two proposals are pre-authored: The Grand Loft ($26k, 550 cap, midnight curfew, AV included) and Warehouse 9 ($34k, 600 cap, 3 AM curfew, +$4k cleaning deposit).
- Beat 7 needs a quick restart script: `scripts/demo/restart-actor.sh` that kills `durable-actors dev` and relaunches it so the refresh lands on a warm server.

## Recording setup

- Screen capture the two tiled browser windows; terminal only for beat 7.
- Hide bookmarks bar, use a neutral desktop, zoom UI to ~110% so badges read on video.
- Do a full dress rehearsal against `DEMO_MODE=fixtures` before recording.
