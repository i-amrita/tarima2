# VPS hosting (ovhcloud)

Status: assessment 2026-10-31, by a research subagent. Nothing deployed yet.
Companion to `vercel-hosting.md` (the parallel path). VPS is the recommended target.

## Host

- Alias `ovhcloud` in `~/.ssh/config` (lines 12-23), key `~/.ssh/vps-key-new`.
  App work as `own-agents@ovhcloud`, admin as `debian@ovhcloud`. Both BatchMode-capable.
- Hostname `ovhcloud.tail876c20.ts.net` (tailnet `100.105.198.36`), public IP `37.187.62.157`.
- Debian 13 (trixie), kernel 6.12, x86_64, 11 GB RAM, 6 CPUs, 48 GB disk free, up 115 days.
- Sustained load ~6.5 from other agent services (warp-svc, camofox, crw, orca, microclaw).
  Fine for a demo; re-check before judging day.
- Shared tool pool via `/opt/mise/shims`: node 26.8.1, **bun 1.4.3** (exact repo pin).
  Node is not on `debian`'s non-login PATH; use a login shell or the shims.

## Cloudflared verdict: exists but STALE, never had real ingress

- Binary `/usr/local/bin/cloudflared` (2026.6.1) present. **No `cloudflared.service`**, no
  running process.
- `/etc/cloudflared/` holds a tunnel UUID + credentials JSON
  (`1dad9cd2-857b-421f-822c-a2bc2cf7f389.json`) and a `config.yml` containing **only the
  catch-all 404 ingress**; hostname lines are commented placeholders.
- No origin cert (`~/.cloudflared/` absent; `cloudflared tunnel list` fails).
- `/var/log/cloudflared.log` ends 2026-07-11 with "Cannot determine default origin cert".
- Conclusion: started in June, never completed, service uninstalled in July. Scaffolding, not
  a working tunnel. Reviving needs an origin cert plus a real hostname in the CF zone.

## Existing infra that helps

- **Bifrost already runs on this box**: `bifrost.service` (system, as own-agents) exposing
  `bifrost-http` on `127.0.0.1:8317`, config in `~/.config/bifrost/config.db` (SQLite).
  The "VPS has no LLM access" concern largely disappears: DealRelay points at
  `http://127.0.0.1:8317` with a Bifrost API key, and Bifrost holds the provider keys.
  (Do not touch `config.db` directly; use the REST API.)
- **A complete deploy kit exists in the previous project**: `~/src/tarima` (repo
  `sigilco/tarima`, branch `beta/integration`) has `deploy/caddy/Caddyfile` serving
  `tarima.events` + `tarima.illo.fyi` with Let's Encrypt -> `127.0.0.1:3001`,
  `deploy/systemd/tarima.service`, litestream, and a SOPS/age secrets manifest
  (`~/.config/age/own-agents.key`). Copy that convention.
- No caddy, no nginx, no `/var/www`. Nothing listens on 80/443. ufw is active and allows
  everything on `tailscale0` only.
- tarima2 is **not** on the box yet (`~/src` holds only the old tarima). Origin is pushed:
  `git@github.com:i-amrita/tarima2.git`, main at `ebea241`.

## Recommended topology (option 1)

Single public https origin, three services on localhost, Caddy routing.

```
judge -> https://dealrelay.illo.fyi
          |
        caddy (443, Let's Encrypt)
          |-- /            -> 127.0.0.1:3100   (apps/web, nitro node-server)
          |-- actor ws     -> 127.0.0.1:7100   (durable-actors)
          `-- relay       -> 127.0.0.1:7200   (apps/relay)
```

`apps/web/src/server/room.ts` already rewrites the socket grant to the public `ACTOR_URL`
origin, so one https domain yields https + wss with no protocol work. The
`DURABLE_ACTORS_CONTROL_PLANE_URL` and `DURABLE_ACTORS_PROJECT_ID=local` env vars learned
from the Vercel path apply verbatim.

Services bind to 127.0.0.1 only; caddy is the sole ingress. `durable-actors dev` binding is
localhost-only by default, which is what we want.

## Ranked options

| Option | Effort | Judge URL | Notes |
| --- | --- | --- | --- |
| **1. Caddy + systemd, subdomain** | ~half a day | `https://dealrelay.illo.fyi` | Reuses the tarima convention, real TLS, wss works, durable. **Recommended.** |
| 2. Cloudflared tunnel | medium | `https://dealrelay.<cf-domain>` | TLS via CF, no open ports, but the setup is half-dead and adds a moving part |
| 3. Plain IP:port | lowest | `http://37.187.62.157:3100` | No TLS breaks `wss`, ugly URL. Not acceptable for a judge link |

## Deployment checklist

1. `git clone git@github.com:i-amrita/tarima2.git ~/src/tarima2` (as own-agents), `bun install`,
   build web with the nitro `node-server` preset (`VERCEL` unset).
2. Three systemd units (actor :7100, relay :7200, web :3100), modelled on
   `~/src/tarima/deploy/systemd/tarima.service`. Env reaches systemd through the shared-tool
   wiring (`/etc/environment`).
3. Install caddy (`apt install caddy`), site block proxying :3100 plus the actor websocket
   path to :7100 and relay to :7200. DNS A record in the existing CF zone (`illo.fyi` or
   `tarima.events`).
4. Secrets: web needs `ACTOR_URL`, `RELAY_URL`, `DEMO_MODE`; relay needs `RELAY_PORT`;
   the LLM path needs the Bifrost base URL and key. Use the age/SOPS manifest pattern from
   the tarima deploy kit. Never commit them.
5. `DEMO_MODE=fixtures` by default; leave `DEMO_ALLOW_KILL` unset for the judge-facing
   deployment (the kill-actor button is a demo-video beat, not a judge affordance).
6. Agent Relay on the box: `agent-relay init --port 8787 --tools none --yes` gives a local
   Relaycast server with an `rk_live_...` key and no account. Persist the key in the
   service env.

## Open

- Which hostname to use, and whether the CF zone for `illo.fyi` is the one to point at.
  The stale cloudflared tunnel belongs to some zone; confirm before reusing it.
- Whether to run the AI-first (live LLM) path on the public deployment or keep the judge
  build on fixtures with live mode as a Q&A switch. Latency data from the implementation
  work decides this.
