# Hosting the demo with Vercel

Date: 2026-10-31. Status: web preset wired, nothing deployed. Vercel facts below are from memory and unverified (search MCP was down); check current docs before relying on limits.

Vercel hosts `apps/web` only. The actor server (SQLite on disk, long-lived WebSockets) and the relay (long-running Bun server) cannot run as Vercel Functions, so they run elsewhere and the web app reaches them through env vars.

`apps/web/vite.config.ts` uses the Nitro `vercel` preset when `VERCEL` is set and `node-server` otherwise.

## Env on Vercel

- `ACTOR_URL`: public https base of the actor server. The browser opens the WebSocket URL from `getSocketGrant` directly, so this must be reachable from the internet (wss).
- `RELAY_URL`: public or private base of the relay (`POST /run`).
- `DEMO_MODE=fixtures`. Leave `DEMO_ALLOW_KILL` unset; the kill button is a no-op there.

## Where actor and relay run

- A (recommended): `own-agents@ovhcloud` VPS behind caddy or a tunnel. Durable state, no time limit. Needs the repo pushed to a remote.
- B: a Vercel Sandbox session exposing both ports. Everything on Vercel, but sandboxes time out and `.durable-actors/` is lost unless snapshotted. Fine for a recording window.

## Open

User picks A or B. Verify the Nitro vercel build (`VERCEL=1 bun run build` in apps/web) before the first deploy.

## Decision (2026-10-31)

User chose B (Vercel Sandbox session) for the v1 deployment; ovhcloud with a cloudflared port comes later. `scripts/demo/sandbox.ts` boots actor and relay in a sandbox and prints `ACTOR_URL` / `RELAY_URL`. It is untested: it needs Vercel auth (`vercel link`, `vercel env pull`) and the repo pushed to origin. Known risk: `durable-actors dev` has no `--host` flag and may bind localhost only, in which case the sandbox's public port will not reach it; the fallback is the cloudflared route on the VPS. The relay's `RELAY_URL` also needs to be reachable from Vercel Functions.

## Deployed v1 (2026-10-31)

- Project `dealrelay` (team quino-terrasas-projects). Vercel's remote `npm install` fails on the bun workspaces, so deploy prebuilt: in `apps/web` run `vercel pull --yes --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`.
- Aliases: https://dealrelay-pi.vercel.app and https://dealrelay-quino-terrasas-projects.vercel.app. Deployment Protection (SSO) is on, so the URLs redirect to a Vercel login until it is disabled in project settings. `vercel curl <path> --deployment <url>` bypasses it for checks.
- Sandbox: `set -a; . apps/web/.env.local; set +a; bun scripts/demo/sandbox.ts` printed public ACTOR_URL (port 7100, contract endpoint answers) and RELAY_URL (port 7200, /health ok). The `durable-actors dev` server is reachable, so the localhost-bind worry did not materialize. Sandbox URLs change on every run and the sandbox expires (45 min timeout), so re-run, then update `ACTOR_URL`/`RELAY_URL` with `vercel env add ... production --force` and redeploy.
- Not yet verified end to end: the browser WebSocket through the sandbox URL and a full simulate flow on the deployed app.

## Findings from verifying against the sandbox (2026-10-31)

- The generated client ignores `ACTOR_URL`. `actors.RoomActor.get(...)` reads `DURABLE_ACTORS_CONTROL_PLANE_URL`, and remote hosts also need `DURABLE_ACTORS_PROJECT_ID=local`. Both are set on Vercel production alongside `ACTOR_URL`.
- The dev server advertises `ws://127.0.0.1:7100` in socket grants. `getSocketGrant` now rewrites it to the public `ACTOR_URL` origin (`wss`, no port).
- Verified against the live sandbox from this laptop: setSpecs, injectProposal, relay `/run` (202), proposal reaches REQUIRES_APPROVAL, and a `wss` connection receives the initial `state` message.
- Still unchecked: a browser session on the deployed app. Deployment Protection blocks unauthenticated browsers (and Playwright) until it is disabled or a bypass secret is used.
