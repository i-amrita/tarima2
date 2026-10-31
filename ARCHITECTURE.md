# DealRelay Architecture

Status: draft v1 (2026-10-31)

## Layer diagram

```
+---------------------------+      WebSocket (terse grant)      +---------------------------+
| apps/web (TanStack Start) | <-------------------------------> | packages/actors           |
| role=agency | role=client |                                   | RoomActor                 |
| React UI, Tailwind        |                                   | @Persisted specs/proposals|
+------------+--------------+                                   | activityLog (SQLite)      |
             |                                                  +------------+--------------+
             | server function (typed RPC)                                   | method call
             v                                                               v
      apps/web server -------- relay trigger -------> apps/relay (AgentRelay SDK)
             ^                                              |  Scout -> Finance -> Negotiator
             |                                              v
             +<----------- submitAuditResult ------- relay pipeline writes back to RoomActor
```

Key rule: Terse owns room state, Relay owns agent coordination. Neither crosses into the other's job.

## Data model (packages/actors/src/types.ts)

```ts
type Role = "agency" | "client";
type VenueStatus = "PENDING_AUDIT" | "REQUIRES_APPROVAL" | "COUNTER_PROPOSED" | "ACCEPTED";

type EventSpecs = {
  eventName: string;
  targetDate: string;
  guestCount: number;
  maxBudget: number;
  requiredCurfew: string; // HH:MM 24h
  avRequired: boolean;
};

type VenueProposal = {
  id: string;
  name: string;
  rawText: string;
  quotedCost: number;
  quotedCapacity: number;
  quotedCurfew: string;
  avIncluded: boolean;
  status: VenueStatus;
  audit?: AuditResult;
  approvedBy?: Role;
};

type AuditResult = {
  budgetDelta: number;
  capacityDelta: number;
  violations: string[];
  counterStrategy: string;
  draftCounterProposal: string;
};

type ActivityEvent = {
  id: string;
  at: number; // epoch ms
  actor: string; // "scout" | "finance" | "negotiator" | "client" | "agency" | "system"
  message: string;
};

type RoomState = {
  specs: EventSpecs | null;
  proposals: VenueProposal[]; // persisted via reassign, never push
  activity: ActivityEvent[];
};
```

`RoomState` lives on `RoomActor` as `@Persisted @Emittable` fields so every connected client receives `state` on connect and `state_update` diffs afterwards.

## Component contracts

### RoomActor (packages/actors)

Public methods (generated client seam):

- `setSpecs(specs: EventSpecs): void`
- `injectProposal(proposal: NewVenueProposal): string` (returns proposal id)
- `submitAudit(proposalId: string, audit: AuditResult): void` (status -> REQUIRES_APPROVAL)
- `recordApproval(proposalId: string, role: Role): void` (status -> COUNTER_PROPOSED)
- `recordVendorAcceptance(proposalId: string): void` (status -> ACCEPTED)
- `appendActivity(actor: string, message: string): void`

Socket contract:

- Metadata: `{ role: Role }`
- Incoming: `{ type: "approve"; proposalId: string }` (client role only) or `{ type: "ping" }`
- Outgoing: emitted state + `{ type: "toast"; message: string }` for cross-window nudges

### Relay pipeline (apps/relay)

`RelayPipeline` runs in a small bun process started alongside the web dev server.

- Constructor takes `{ relayWorkspaceKey, actorClient }`.
- `runProposal(proposalId: string, rawText: string, specs: EventSpecs): Promise<void>`
- Registers three agents: `scout`, `finance`, `negotiator` in channel `#procurement`.
- Sequence: system DMs scout raw text; scout DMs finance structured facts; finance DMs negotiator audit summary; negotiator calls `roomActor.submitAudit(...)` via the generated client.
- In `DEMO_MODE=fixtures` the three agents are scripted participants: deterministic output streamed with 60-120ms per-chunk cadence so the video looks alive.
- Real-harness mode (`DEMO_MODE=live`) swaps each scripted participant for `@agent-relay/harnesses` spawns of claude/codex. Kept behind the flag.

### Web app (apps/web)

Routes (TanStack Router):

- `/` — redirects to `/room/$roomId?role=agency` (agency is the default entry)
- `/room/$roomId` — split view
  - Left: constraint header + comparison canvas (one card per proposal, badges per constraint)
  - Right: agent trace feed + approval bar
  - Bottom drawer (agency only): simulation triggers + "kill actor" demo button
- Server functions:
  - `getRoomState(roomId)` — typed passthrough to actor
  - `triggerSimulation(roomId, kind)` — injects pre-authored proposals and kicks the relay pipeline
  - `getSocketGrant(roomId, role)` — wraps `actors.RoomActor.prepareWebsocket`, returns `websocketUrl`

Deployment seams:

- `DEMO_MODE=fixtures|live` — fixture agents vs real harnesses
- `ACTOR_URL` — local `http://127.0.0.1:7100` or deployed actor host
- `RELAY_WORKSPACE_KEY` — hosted Relaycast key (gitignored `.env`)

## Deployment paths

1. Local (primary iteration): `durable-actors dev` + `bun run dev` for web + `bun run relay` for the pipeline. One command via a root `dev` script (concurrently).
2. Cloud demo (judge URL): single VPS (Hetzner, `own-agents` user) running all three processes behind caddy; demo mode forced to `fixtures` so no LLM keys needed. Alternatively fly.io if we want a URL without VPS ops. Decide after first local run.
3. Demo video: recorded locally against the same build.

## Backpressure (scripts/validate.ts)

Modeled after brioso's gate but leaner:

1. `bunx tsc --noEmit` per package (typed seams enforced)
2. `bun run lint` (oxlint)
3. `bun run test` (vitest; skipped with `--quick`)
4. Contract check: actor method names referenced by web/relay exist in the generated client (`scripts/check-actor-contract.ts`)

Aim: `--quick` under ~45s warm so coding agents can loop without babysitting.

## Decisions log (high level)

- Use OSS `durable-actors` instead of hosted Terse CLI: hosted requires `terse auth login` before init; OSS runs fully local with the same SDK shape. See .agents/docs/terse-local-dev.md.
- Agent messaging runs on hosted Relaycast (free `rk_live_` workspace key). Truly offline mode is CLI-broker-only and not worth it for the hackathon.
- Three agents, not two: multi-agent coordination is the pitch.
- TanStack Start + Nitro (node-server preset), mirroring brioso's proven setup.
