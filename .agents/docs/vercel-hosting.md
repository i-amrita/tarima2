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
