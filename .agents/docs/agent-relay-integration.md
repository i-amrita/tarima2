# Agent Relay integration notes

Date: 2026-10-31

## SDKs in play

- `@agent-relay/sdk@15` — messaging, delivery, actions. This is what the app embeds.
- `@agent-relay/harnesses` + `@agent-relay/harness-driver` — spawn real claude/codex/gemini CLI processes (PTY/headless). Only used in `DEMO_MODE=live`.
- CLI `agent-relay` — local broker (`agent-relay up --no-dashboard`), state in `.agent-relay/`. Not used in the happy path.

## Workspace bootstrap (verified)

```ts
import { AgentRelay } from "@agent-relay/sdk";

const relay = await AgentRelay.createWorkspace({ name: "dealrelay" });
console.log(relay.workspaceKey); // rk_live_...
```

Store the key in `.env` as `RELAY_WORKSPACE_KEY` (gitignored). Reconnect with `new AgentRelay({ workspaceKey })`.

Register agents:

```ts
const [scout, finance, negotiator] = await relay.workspace.register([
  { name: "scout", type: "agent" },
  { name: "finance", type: "agent" },
  { name: "negotiator", type: "agent" },
]);
```

Register is idempotent by name; re-registering an existing name adopts it and rotates the token.

## Messaging

- `sendMessage({ to: "#channel" | "@handle" | ["@a", "@b"], text, threadId? })` returns `{ messageId }`.
- `reply({ messageId, text })` threads under a message.
- `react({ messageId, emoji })` adds a reaction.

## Gotchas found while probing

1. `relay.messages.list(channel, opts)` takes the channel positionally and WITH the `#` sigil: `relay.messages.list("#procurement", { limit: 50 })`. Passing `{ channel: "#general" }` throws `value.startsWith is not a function`.
2. `relay.addListener("message.created", ...)` attached to a workspace-only client did not fire for DM traffic in a 3s window. Events fan in through registered agent clients, so the frontend/relay process should register its own participant (e.g. `trace-viewer`) and read from that client's stream instead of relying on the workspace key listener.
3. DMs do not appear in `messages.list("#channel")`; list the DM thread or subscribe on the receiving agent client.
4. Local-only messaging needs a real workspace key; `createRelaycastClient` throws without a credential even with `AGENT_RELAY_LOCAL_ONLY=1`. The truly offline path is the CLI broker, which we are not using.

## Demo fixtures

Scripted participants (Scout, Finance, Negotiator) are just registered relay agents whose `sendMessage` calls are driven by a fixture script with per-chunk delays. The video audience sees real relay messages flowing between real relay identities; the content is pre-authored. This keeps the take deterministic and free of LLM latency.

## Using Agent Relay for the implementation itself (assessed 2026-10-31)

Assessed the workforce/proactive-agents surface as a development harness for building this repo (agents coordinating on the codebase, not in the product).

What exists:
- `agent-relay` CLI: local broker (`agent-relay up`), `spawn <name> <cli> <task>`, `send`, `attach <name> --mode view`, durable delivery queues, `node workflow run workflows/*.ts` for typed multi-step runs, observer mode for watching traffic.
- Agent Relay MCP: `agent-relay mcp` exposes register/spawn/send/inbox/actions as MCP tools, so coding agents can join a shared channel without embedding the SDK.
- Workforce/proactive personas (`agentworkforce deploy`): cron/integration-triggered cloud agents with `ctx.harness.run`, memory, typed Slack/GitHub clients. Cloud-deployed, opinionated.

Verdict: **No for the build loop; maybe for one narrow slice.**
- This repo is small (3 workspaces) with linear deps. Streams A-E finish faster than a relay-coordinated fleet would converge; coordination overhead (channel etiquette, idle detection, handoff prompt quality) exceeds the parallelism win. Maki subagents + git worktrees already cover parallel implementation.
- The proactive/persona runtime requires cloud deploys and OAuth'd integrations; wrong tool for a 1-2 day hackathon.
- The one plausible use: **cross-session worker visibility during stream C (web)**. If 2-3 coding agents run concurrently in separate worktrees, a shared `#tarima2` channel plus `agent-relay attach --mode view` gives a live TUI of who is doing what, and durable delivery means a task sent to a busy agent is queued rather than lost. Nice-to-have; adopt only if we actually run 3+ agents at once, and scope it to observation (attach/view), not task routing.

Revisit trigger: stream C starts while stream B is unfinished AND two or more agents are running concurrently.
