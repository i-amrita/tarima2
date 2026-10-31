# DealRelay PRD

Status: draft v1 (2026-10-31)
Owner: josocjoq
Hackathon deliverable: demo video first; live demo only if selected.

## Pitch

One paragraph: live event procurement dies in email chains between producers, clients, and vendors. DealRelay is a shared deal room where a multi-agent workforce (Agent Relay) evaluates vendor venue proposals in real time against the event's constraints, drafts a counter-offer, and a human approves it. Every action lands in a durable actor (Terse durable-actors) that keeps agency and client browsers in sync with zero latency and zero race conditions.

## Judge criteria mapping

| Criterion | What we show |
| --- | --- |
| Multi-agent workflow | Three relay agents (Scout, Finance, Negotiator) with visible inter-agent messages |
| Durable state | RoomActor state survives a server restart (killed on camera) |
| Real-time sync | Two windows (agency + client) update simultaneously |
| Human in the loop | Client must approve the counter-offer before it is sent |

## Users

- Agency producer: sets constraints, injects proposals, watches agent trace. URL role `?role=agency`.
- Client: watches the same room, approves or rejects the counter-offer. URL role `?role=client`.

## Scope

### In

1. Constraint setup (target date, budget, capacity, curfew, AV requirement).
2. Simulation drawer injecting two pre-authored venue proposals (The Grand Loft, Warehouse 9).
3. Relay pipeline: Scout extracts structured facts from raw proposal text; Finance audits against constraints; Negotiator drafts a counter-offer strategy.
4. Comparison canvas: side-by-side venue scorecards, green/red constraint badges, status per proposal.
5. Agent trace panel: relay messages rendered as a live feed (agent name, verb, target, summary).
6. Approval bar on the client view; approval relays accepted terms to a simulated venue agent.
7. Demo mode (`DEMO_MODE=fixtures`): deterministic scripted agent output streamed with a typewriter cadence for clean recording.

### Out

Auth, email/calendar integrations, attendee comms, ticketing, multi-stage sponsor management, vendor portal, mobile, i18n, real LLM calls in the recorded path.

## Demo script (60-90s video)

1. Problem title card: fragmented email chain mock (3s).
2. Agency window: set constraints (5s).
3. Inject Venue A and B from simulation drawer (5s).
4. Agents light up: trace shows Scout -> Finance -> Negotiator messages; venue cards populate with badges (20s).
5. Negotiator posts counter-offer card; approval bar pulses on client window (10s).
6. Client approves; both windows flip to ACCEPTED; simulated vendor accepts (10s).
7. Kill the actor server and refresh: state restored from SQLite (durable) (10s).
8. Architecture card: Terse actors + Agent Relay + TanStack Start (5s).

## Success criteria

- Video: compelling, under 2 min, no dead air, shows all four judge criteria.
- Live demo (if selected): full happy path runs locally on one laptop with two browser windows and survives an actor restart.
- Iteration speed: `bun run validate --quick` under ~45s on a warm run so coding agents can loop.
