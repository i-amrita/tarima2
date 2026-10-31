# DealRelay: AI-first system — implementation brief

Status: research handoff v2, 2026-10-31. Written by the planner for the implementation agent.
Everything marked **VERIFIED** was probed on this machine today and is working, including a
full multi-agent SDK round-trip against a local Relaycast server. Remaining OPEN items:
deployment host (needs a user decision) and model latency. Do not treat OPEN items as facts.

Read first, in this order:
1. `AGENTS.md` (repo root)
2. `~/UILOOP.md` (governs any pixel change; the room redesign is in flight separately)
3. `.agents/docs/ui-screen-spec.md` + `.agents/docs/ui-layout-mock.md` (the room UI target)
4. `.agents/docs/demo-video-plan.md` (the beats the AI must support)
5. `.agents/docs/agent-relay-integration.md` (older notes; superseded where it says so)

---

## 0. The gap this work closes

Today `apps/relay/src/pipeline.ts` contains NO AI. The "agents" are regexes and arithmetic:

- Scout = 4 regexes over `rawText` (`/\$([0-9,]+)/`, `/(?:capacity|fit)\s*(\d+)/i`, curfew
  regex, AV regex) in `pipeline.ts:48`.
- Finance = subtraction plus a minutes comparison, `pipeline.ts:157-172`.
- Negotiator = an if-chain concatenating canned counter phrases, `pipeline.ts:82`.
- The 80ms sleeps between steps are pacing theater, not model latency.

`DEMO_MODE=live` throws immediately at `apps/relay/src/pipeline.ts:139`.
Grep confirms zero LLM SDKs, zero API keys, and **no `@agent-relay/sdk` in any package.json
or in bun.lock**, despite the app being named after it.

Goal: a genuinely AI-first system where (a) a real model does the understanding, (b) Agent
Relay is the real coordination substrate between agents, (c) Terse durable-actors remains the
authoritative state + sync + persistence layer, (d) the whole thing runs locally and on a
public host, (e) fixture data still drives a deterministic multi-agent e2e run.

---

## 1. VERIFIED: Terse AI (durable-actors) — already in place, keep it

- `durable-actors@0.14.6` is the real, open-source Terse AI platform. The hosted `terse-cli`
  needs `terse auth login`; we do not use it and do not need to.
- `packages/actors/src/actors.ts` already uses the durable-actors primitives correctly:
  `@Persisted @Emittable` on `specs`, `proposals`, `activity`; a `RoomActor` extending
  `Actor<RoomSocketMetadata, RoomIncoming, RoomOutgoing>`; `onMessage` handling `approve`
  with role gating; `broadcast`.
- The actor holds authoritative state, websocket fan-out to both browser windows, and
  SQLite persistence (the kill-actor-and-restore demo beat is real and already tested).
- **VERIFIED** the Terse AI house pattern for LLM + actors: the package ships an `ai-chat`
  template at `node_modules/durable-actors/dist/templates/ai-chat/src/backend.ts` where the
  HTTP layer calls the model and then persists the result into the actor. That is exactly the
  seam we want: **the model call lives outside the actor, the result is written into the
  actor.** Do not put LLM calls inside `RoomActor` methods.
- `durable-actors` also exports a `LatencyTimeline` / `TelemetrySink` type
  (`packages/actors/generated/runtime/telemetry.d.ts`) that is currently unused. It is a free
  hook for per-step latency in the trace.

**Decision:** keep the actor as the state authority. The relay service calls the model, then
writes results into the actor via the generated client. No actor code changes except, at
most, accepting richer activity payloads.

---

## 2. VERIFIED: Agent Relay — installable, runs locally, CLI path works today

Package: `agent-relay@15.0.1` on npm. It bundles the CLI (`bin: { relay, agent-relay }`),
the SDK (`@agent-relay/sdk`), the harness definitions and the harness driver. **VERIFIED:**
`npm install agent-relay@15.0.1 zod` in a scratch dir gives you both `agent-relay` and
`@agent-relay/sdk` (the SDK is a dependency of the `agent-relay` package).

**VERIFIED local flow (no cloud account, no signup):**

```bash
agent-relay node up            # starts the local broker; prints "Relay API: http://localhost:PORT"
agent-relay workspace create dealrelay   # prints { "workspaceKey": "ar_ws_..." } (local, not rk_live)
agent-relay agent register scout         # prints { id, name, token: "ar_ag_..." }
agent-relay channel create procurement --as scout
agent-relay message post "#procurement" "Scout online" --as scout
agent-relay message list "#procurement" --as scout
```

All of the above **VERIFIED working** against the local broker today (channel created,
message posted, message read back with `from.name === "scout-cli"`). State lands in
`.agentworkforce/relay/` (gitignore it).

**VERIFIED SDK gotchas:**
- `relay.messages.list(channel, opts)` takes the channel **positionally and with the `#`
  sigil**: `list("#procurement", { limit: 50 })`. Passing `{ channel: "#x" }` throws
  `value.startsWith is not a function`.
- A workspace-level `relay.addListener("message.created", ...)` did not fire for DM traffic
  in a 3s window. Events fan in through **registered agent clients**. The consumer must
  register its own participant (e.g. `trace-viewer`) and read from that client's stream, not
  from a workspace-only listener.
- DMs do not appear in `messages.list("#channel")`; list the DM thread instead.
- `relay.workspace.register([...])` returns live agent clients and is **create-only**: an
  existing name is rejected with `name_conflict` (HTTP 409) and its token is unchanged. To
  resume an agent in a fresh process, persist the token and call
  `relay.workspace.reconnect({ apiToken })`.

**RESOLVED (was OPEN-1). There are TWO local servers and they are different things:**

1. **The broker** (`agent-relay node up`, port 53700 in the probe) — a local job/delivery
   coordinator. The SDK's Relaycast client **cannot** talk to it; every combination of
   workspace key / agent token / broker key (`br_...` from `connection.json`) against it
   returned 401 "Missing or invalid API key". Do not point the SDK at the broker. This is
   expected: the broker is for the CLI's spawn/inject/tail surface.
2. **The Relaycast server** — the actual REST API the SDK speaks. Install it with:

```bash
agent-relay init --port 8787 --tools none --yes
# downloads relaycast-engine vX to ~/.agentworkforce/relay/bin/ and starts it:
#   "Relay is running on this machine (http://127.0.0.1:8787), workspace 'local'. No account needed."
agent-relay workspace key local --reveal-secrets   # -> rk_live_... (LOCAL server, not hosted)
```

**VERIFIED full SDK flow against the local Relaycast server** (`rk_live_...` key +
`baseUrl: http://127.0.0.1:8787`):

```ts
import { AgentRelay } from 'agent-relay';
const relay = new AgentRelay({ workspaceKey: process.env.RK, baseUrl: 'http://127.0.0.1:8787' });

const [scout] = await relay.workspace.register([{ name: 'scout', type: 'agent' }]);
await scout.channels.create({ name: 'procurement', topic: 'venue negotiation' }); // 404 channel_not_found if you skip create
await scout.channels.join('#procurement');
await scout.sendMessage({ to: '#procurement', text: 'Facts: $26,000, 550 cap, 00:00 curfew, AV incl.' });
// second agent, real event fan-in:
relay.addListener('message.created', ({ message }) => { ... });   // VERIFIED fires for channel messages
await finance.sendMessage({ to: '@scout', text: 'DM ping' });      // VERIFIED sends; NOT seen by the
                                                                   // channel listener (matches gotcha 3)
const list = await scout.messages.list('#procurement', { limit: 10 }); // VERIFIED, positional + '#'
```

Key details re-verified in the working probe: channel **create** is required before join
(fresh workspace has only `#general`; joining `#procurement` without creating throws
`channel_not_found` 404); `addListener('message.created')` on the same `AgentRelay` instance
**does** fire for channel messages from other registered agents within ~3s; DMs deliver but do
not surface through the channel listener (read the DM thread or a dedicated listener).

**Design note:** the Agent Relay CLI exposes `agent-relay node workflow run workflows/*.ts`
for typed multi-step runs, plus `agent-relay capabilities` (typed actions with Zod schemas,
fire-and-forget invocation, `action.completed` events delivered to listeners). That action
surface is the natural place to expose "submit audit" and "submit counter-proposal" as typed
capabilities rather than free-text messages. Investigate `agent-relay capabilities --help`
and `agent-relay flows` (relayflows) when designing the coordination step.

---

## 3. VERIFIED: model provider — Bifrost on this machine, no new account

- Bifrost is healthy: `GET http://localhost:8317/health` -> `{"status":"ok"}`.
- Credential lives in the **macOS Keychain**, not in `.env`:
  `security find-generic-password -s "bifrost" -a "$USER" -w` -> `sk-bf-...`.
- OpenAI-compatible endpoint: `POST http://localhost:8317/v1/chat/completions` with
  `Authorization: Bearer sk-bf-...`. **VERIFIED** a real completion round-trips.
- 26 models across 3 providers are exposed on `/v1/models`:
  - `zai-coding-plan/*` (11): glm-4.5 -> glm-5.3, air, turbo
  - `minimax-coding-plan/*` (9): MiniMax-M2 -> M3.1-Flash, highspeed variants
  - `kimi-for-coding/*` (6): k3, k3-256k, k3.1-pro, highspeed variants

**VERIFIED structured-output behavior (this is the part that matters):**

| model | honors `response_format: json_schema` |
| --- | --- |
| `kimi-for-coding/k3.1-pro` | **YES** — returned exactly `{"cost":26000,"capacity":550}` |
| `minimax-coding-plan/MiniMax-M3.1-Flash` | **YES** — returned the full object |
| `zai-coding-plan/glm-4.7` | **NO** — ignored the schema, returned prose and extra keys |

So the Scout extraction step must pin a model that honors JSON schema. Use
`kimi-for-coding/k3.1-pro` or `minimax-coding-plan/MiniMax-M3.1-Flash`. Do not use glm for
structured extraction.

**VERIFIED second gotcha:** `max_tokens` too low makes these reasoning models return
`finish_reason: "length"` with `content: null` and the answer only in a `reasoning` field.
glm-4.7 burned 36s on a trivial extraction and still produced prose. Budget `max_tokens`
>= 1500 for structured calls, and treat `content === null` as a retryable failure.

**Two more VERIFIED Bifrost facts:**
- The response envelope is plain OpenAI shape (`choices[0].message.content`), and
  `extra_fields.routing_info` tells you which provider actually served it. That is a free
  observability hook for the demo.
- Bifrost on `localhost:8317` is **not reachable from a judge-facing host**. For a public
  deployment we need a real provider endpoint, not the local gateway.

**Provider decision for the plan:**
- Local dev / recording: Bifrost at `http://localhost:8317/v1`, key from Keychain, model
  `kimi-for-coding/k3.1-pro` for structured steps.
- Public host: same OpenAI-compatible client, different `baseURL` + key from env
  (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). If OpenRouter is used later, keep the same
  client interface. `OPENROUTER_API_KEY` is currently **unset** on this machine.

**Client choice:** use the Vercel AI SDK (`ai@7` is already a dependency of `apps/web`, and
`@ai-sdk/openai-compatible` is on npm at 3.0.82) rather than raw `fetch`. The AI SDK gives
`generateObject`/`Output.object` with schema validation, and the Terse AI template already
uses the AI SDK, so we stay consistent with the platform's own house style. `apps/web` already
depends on `ai@7.0.159`.

---

## 4. Proposed architecture

```
browser (agency | client)
   |  websocket
   v
RoomActor (durable-actors)  <-- authoritative state, @Persisted, SQLite
   ^            ^
   |            | appendActivity / submitAudit (generated client)
   |            |
   +--- apps/relay (Bun, :7200)  <-- the agent runtime
             |
             +--> Agent Relay  <-- coordination substrate between agents
             |      workspace, channel #procurement, registered agents:
             |      scout, finance, negotiator (+ trace-viewer consumer)
             |
             +--> LLM (Bifrost / OpenAI-compatible, AI SDK)
```

Design rules:
- The model call happens in `apps/relay`, **not** inside the actor. The actor persists the
  result. This matches the Terse AI `ai-chat` template.
- Agent Relay carries the **agent-to-agent** conversation (Scout posts extracted facts,
  Finance reacts with the audit, Negotiator posts the counter). The room actor carries the
  **user-facing** state. Do not conflate them: the relay channel is the agents' private
  deliberation, the trace feed is the public summary of it.
- Fixture mode keeps working exactly as today, but as the **same code path with a fake
  model client**: the Scout/Finance/Negotiator steps call a `ModelClient` interface; the
  fixture implementation returns pre-authored JSON, the live implementation calls the LLM.
  That way the fixture mode is genuinely the same pipeline, and the e2e test exercises it.
- The negotiator's counter text should be model-generated (it is prose), while the violation
  list and deltas stay deterministic arithmetic (money math should not be a model; that is
  a defensible design point we can state out loud in the demo).

---

## 5. Task breakdown

Recommended order. T0 first, it is the blocker.

**T0. Local Agent Relay stack (S)** — mostly done, see the RESOLVED note above. Deliverable:
a script `scripts/relay-dev.ts` (or documented shell sequence) that (1) runs
`agent-relay init --port 8787 --tools none --yes`, (2) reads the local `rk_live_...` key into
`.env` (gitignored), (3) creates the `#procurement` channel, (4) registers `scout`, `finance`,
`negotiator` + `trace-viewer`, and (5) prints a verified SDK channel round-trip. Persist the
agent tokens in `.env` so restarts use `relay.workspace.reconnect({ apiToken })` instead of
re-registering (registration is create-only and will 409 `name_conflict` on the second run).

**T1. LLM client + structured Scout (M)**
- New `packages/llm` (or `apps/relay/src/llm/`): `ModelClient` interface with
  `extractFacts(rawText) -> {cost, capacity, curfew, avIncluded}` and
  `draftCounter(violations, specs, facts) -> {counterStrategy, draftCounterProposal}`.
- AI SDK + `@ai-sdk/openai-compatible`, `baseURL` from `LLM_BASE_URL`, key from
  `LLM_API_KEY`, model from `LLM_MODEL` (default `kimi-for-coding/k3.1-pro`).
- Zod schema for the extraction output; `max_tokens` >= 1500; retry on `content === null`
  or schema failure (2 attempts), then fall back to the current regex parser so the demo
  never hard-fails. The fallback path must log loudly.
- Local dev: key from macOS Keychain (`security find-generic-password -s bifrost -a "$USER" -w`),
  never committed.

**T2. Agent Relay as the coordination substrate (M)**
- Register `scout`, `finance`, `negotiator` agents in the workspace; create + join
  `#procurement`.
- Each pipeline step posts to the channel and reads the responses, so the agents genuinely
  talk to each other through Relay rather than the relay calling three functions in a row.
- A `trace-viewer` registered agent consumes the channel and mirrors the deliberation into
  `RoomActor.appendActivity` so the UI trace feed stays a faithful relay transcript.
- Persist agent tokens in `.env` (gitignored) so a restart re-registers via
  `relay.workspace.reconnect({ apiToken })`.

**T3. Evals (M)** - this is what makes it defensible and it is a judge-facing artifact.
- A golden set of ~15-20 realistic venue emails (varied currency formats, "up to N guests",
  "24hr AV included", "until 3am", deposits, taxes) with expected facts and expected
  violations.
- A vitest suite that runs the Scout extractor over the golden set and reports
  "N/M correct" as a single assertion plus a readable table.
- Wire it into `bun run validate` as a separate step so it cannot silently rot.
- Second golden set: given the same spec + fixture, the audit must produce identical
  violations and deltas every time (determinism of the arithmetic layer).

**T4. Observability (S)**
- Per-step latency + token usage + model id captured per agent step and stored in the
  activity stream or a side file; `durable-actors` exposes `LatencyTimeline` for this.
- The trace feed can show "1.2s, 340 tok, k3.1-pro" per step. That is the demo answer to
  "how do you know it is working" without standing up a dashboard.
- Bifrost `extra_fields.routing_info` gives the serving provider for free.

**T5. Deterministic fixture e2e (M)**
- `DEMO_MODE=fixtures` must still produce a byte-identical trace (the video depends on it).
- `DEMO_MODE=live` must produce the same *shape* of trace from real model calls.
- Extend `tests/e2e/smoke.sh` to cover: agent relay messages posted during a run, model
  called (assert on the trace or the telemetry file), multi-agent ordering preserved.

**T6. Deployment (M)** - see OPEN-4.

---

## 6. OPEN questions to resolve (with the probe already written)

**OPEN-4. Where do the judges run it?** The user asked for "local and ideally VPS or Vercel".
Constraints found:
- The actor needs a persistent writable dir for SQLite (`.durable-actors/`), which a
  Vercel serverless function does not give you. `apps/web` already has a Vercel preset
  (`nitro({ preset: process.env.VERCEL ? "vercel" : "node-server" })` in
  `apps/web/vite.config.ts`) and a runbook in `.agents/docs/vercel-hosting.md`, plus
  `scripts/redeploy-vercel.sh` and a one-shot sandbox script. Someone else has been working
  the Vercel path in parallel (see `git log` around `ba9a351`, `ebea241`).
- The other agent's commit `ba9a351` rewrote the socket grant to expose a **public
  ACTOR_URL origin**, which means the actor must be publicly reachable for the web app.
  A VPS (or any always-on box) is the only place the actor + relay + web can all live with
  the agent socket in the same origin.
- Recommendation to evaluate: **VPS for actor + relay + web** (one origin, no CORS, durable
  SQLite on disk), and keep Vercel only as a fallback for the web tier. The repo already
  documents a VPS default (`~/.worktrees` plan mentions `own-agents@ovhcloud`).
- Decision is blocked on the user (it was already blocked in the earlier plan). Surface the
  tradeoff and pick a default rather than stalling.

**OPEN-5. Bifrost on a public host.** The local gateway is unreachable from outside. The
public deployment needs a real provider key in env, or Bifrost deployed with them, or the
demo host stays local/LAN. The Vercel Sandbox path in `.agents/docs/vercel-hosting.md` may
already answer this; read it before deciding.

**OPEN-6. Model latency in the demo.** A three-agent live run means 3+ model calls. VERIFIED
that a glm-4.7 trivial extraction took 36s. A judge-facing demo with 30s of silence is dead.
Mitigations: pin a fast model, run the three steps concurrently where independent
(Scout -> Finance -> Negotiator is sequential, so at least 3 sequential calls), and keep the
**fixture mode for the recorded video** while live mode is the Q&A answer. Measure the real
p50 before committing to live mode for the video.

**OPEN-7. Relay server on a VPS.** RESOLVED for local: `agent-relay init` installs and runs a
local Relaycast server (relaycast-engine binary, no account). On a VPS the same command
works headless and gives the SDK a real `rk_live_...` key bound to that box. State lives in
`~/.agentworkforce/` + the project `.agentworkforce/` (gitignore both). The hosted
Relaycast (`cast.agentrelay.com`) remains the multi-machine option but adds an account
dependency for judges.

---

## 7. Non-negotiables for the implementation agent

- `packages/shared` types: adding fields is fine, but keep `shared contract v1` versioning
  discipline (bump and call it out). Do not break existing field names.
- The **fixture** path must keep producing the exact same trace as today. The video
  (`.agents/docs/demo-video-plan.md`) is already scripted around the current output.
- Every `data-testid` in `.agents/docs/ui-screen-spec.md` S4 must survive. The e2e smoke
  depends on them.
- `bun run validate` green: tsc, oxlint, vitest, actor contract check.
- Conventional commits, one logical change per commit.
- Another agent is working this repo concurrently: `git pull` before starting, and commit
  early so work is not swept into someone else's commit.
- Never commit keys. Bifrost key = Keychain; relay tokens = `.env` (gitignored).
- Do not touch the room redesign (`apps/web/src/routes/room.$roomId.tsx`, `styles.css`,
  `components/dealroom/*`) beyond what an AI-first change strictly requires; that work is in
  flight with its own UILOOP run.
