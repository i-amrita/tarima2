# DealRelay VPS Deployment Runbook

Date: 2026-10-31
Target: `own-agents@ovhcloud` VPS behind Cloudflare Tunnel (or Caddy)

This runbook documents the self-contained, non-automated deployment process for DealRelay. The deployment packages the Nitro node-server web frontend, the durable-actors SQLite actor server (:7100), and the agent-relay coordinator (:7200) into a single bundle.

---

## 1. Architecture & Port Topology

The entire application runs on the VPS with three local services exposed through a single public origin:

```
Browser / Judge
      |
      | https://dealrelay.<DOMAIN> (and wss://dealrelay.<DOMAIN>/v1/socket)
      v
Cloudflare Tunnel (cloudflared) OR Caddy
      |
      +-- /v1/*          --> 127.0.0.1:7100 (durable-actors SQLite & WebSockets)
      |
      +-- /              --> 127.0.0.1:3100 (apps/web Nitro node-server)
      |
      `-- Internal only  --> 127.0.0.1:7200 (apps/relay Bun coordinator)
```

### How Single-Origin Browser WebSockets Work
In `apps/web/src/server/room.ts`, `getSocketGrant` issues WebSocket ticket URLs. When `ACTOR_URL` is set to `https://dealrelay.<DOMAIN>`, `publicGrant` rewrites the dev server's local bind address (`ws://127.0.0.1:7100`) to the public origin (`wss://dealrelay.<DOMAIN>`). 

Because durable-actors serves WebSocket connections and state observation under `/v1/*` (e.g., `/v1/socket?key=...`), the ingress router forwards all `/v1/*` paths to port 7100 and all other traffic to port 3100. The browser connects over standard port 443 with no CORS or mixed-content issues.

If a dedicated hostname is preferred instead, set `ACTOR_URL=https://actor.dealrelay.<DOMAIN>` and route that whole hostname to 127.0.0.1:7100.

---

## 2. VPS Prerequisites

The target VPS is `ovhcloud` (Debian 13 x86_64, reachable via Tailscale alias `ovhcloud`).

1. User account:
   Run all services and commands as user `own-agents` (`ssh own-agents@ovhcloud`), not `debian`.
2. Shared tool pool (mise + Bun 1.4.3):
   The VPS has Bun 1.4.3 installed in the shared tool pool at `/opt/mise/shims` and `/opt/shared-bun`.
   PATH includes `/opt/mise/shims:/usr/local/bin:/usr/bin:/bin` automatically via `/etc/environment`.
   Verify with `bun --version` (must report `1.4.3`).
   If any package install modifies shared stores, run `shared-tool fix` to ensure group `shared` permissions.
3. Bifrost LLM proxy:
   `bifrost.service` runs locally on the VPS at `http://127.0.0.1:8317`. When running in live LLM mode (`DEMO_MODE=live`), DealRelay points to `http://127.0.0.1:8317/v1` with a Bifrost key.

---

## 3. Building and Copying the Bundle

### Step 1: Build the bundle locally
On your development machine, run:

```bash
bash scripts/deploy/build-bundle.sh
```

This command:
- Ensures `VERCEL` is unset and builds `apps/web` with the Nitro `node-server` preset.
- Assembles `dist/dealrelay-bundle/` with runtime sources, locked dependency manifests (`package.json`, `bun.lock`), systemd units, and Cloudflare config.
- Produces `dist/dealrelay-bundle-<sha>.tar.gz` and prints its SHA256 checksum and size (~1.1 MB).

### Step 2: Copy to the VPS
Use rsync over the SSH alias `ovhcloud` (do not run this automatically from CI):

```bash
rsync -avz dist/dealrelay-bundle-*.tar.gz own-agents@ovhcloud:/opt/dealrelay/releases/
```

---

## 4. Directory Structure & Persistence Across Upgrades

To maintain durable actor state across application updates, state and environment files are kept in `/opt/dealrelay/shared/`, while application versions live in `/opt/dealrelay/releases/`.

Recommended layout on the VPS:

```
/opt/dealrelay/
  ├── current -> /opt/dealrelay/releases/dealrelay-bundle-<sha>
  ├── shared/
  │     ├── .env
  │     └── .durable-actors/
  └── releases/
        ├── dealrelay-bundle-<old-sha>/
        └── dealrelay-bundle-<sha>/
```

### Initial Setup on VPS
Run once as `own-agents` on `ovhcloud`:

```bash
mkdir -p /opt/dealrelay/releases /opt/dealrelay/shared/.durable-actors
```

### Extracting a New Release

```bash
VERSION="<sha>"
RELEASE_DIR="/opt/dealrelay/releases/dealrelay-bundle-${VERSION}"

mkdir -p "$RELEASE_DIR"
tar -xzf "/opt/dealrelay/releases/dealrelay-bundle-${VERSION}.tar.gz" -C "/opt/dealrelay/releases/"

# Symlink persistent SQLite database into the actor package
ln -sfn /opt/dealrelay/shared/.durable-actors "$RELEASE_DIR/packages/actors/.durable-actors"

# Symlink shared environment file
ln -sfn /opt/dealrelay/shared/.env "$RELEASE_DIR/.env"

# Install production dependencies using frozen lockfile
cd "$RELEASE_DIR"
bun install --production

# Switch the current pointer
ln -sfn "$RELEASE_DIR" /opt/dealrelay/current
```

---

## 5. Environment Configuration

Create or update `/opt/dealrelay/shared/.env`:

```bash
# Network Ports
PORT=3100
HOST=127.0.0.1
ACTOR_PORT=7100
RELAY_PORT=7200

# Public Origin
# Single-origin ingress routing /v1/* to 7100:
ACTOR_URL=https://dealrelay.<DOMAIN>

# Internal Control Plane
DURABLE_ACTORS_CONTROL_PLANE_URL=http://127.0.0.1:7100
DURABLE_ACTORS_PROJECT_ID=local
RELAY_URL=http://127.0.0.1:7200

# Demo Mode (fixtures for deterministic judge review)
DEMO_MODE=fixtures
DEMO_ALLOW_KILL=0

# LLM Configuration (if DEMO_MODE=live)
LLM_BASE_URL=http://127.0.0.1:8317/v1
LLM_API_KEY=sk-bf-...
LLM_MODEL=zai-coding-plan/glm-5-turbo

# Agent Relay Coordination (local Relaycast broker)
RELAY_BASE_URL=http://127.0.0.1:8787
RELAY_WORKSPACE_KEY=rk_live_...
RELAY_TOKEN_SCOUT=at_live_...
RELAY_TOKEN_FINANCE=at_live_...
RELAY_TOKEN_NEGOTIATOR=at_live_...
RELAY_TOKEN_TRACE_VIEWER=at_live_...
```

---

## 6. Running Services

### Option 1: systemd (Recommended)
Copy the service files from the bundle to `/etc/systemd/system/`:

```bash
sudo cp /opt/dealrelay/current/deploy/systemd/dealrelay-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dealrelay-actor dealrelay-relay dealrelay-web
sudo systemctl start dealrelay-actor dealrelay-relay dealrelay-web
```

To inspect status:

```bash
sudo systemctl status dealrelay-actor dealrelay-relay dealrelay-web
```

### Option 2: tmux (Interactive testing)

```bash
tmux new-session -s dealrelay
cd /opt/dealrelay/current
./run-bundle.sh all
```

---

## 7. Ingress Options

### Option A: Reviving the Existing Cloudflare Tunnel
A cloudflared tunnel is already configured on `ovhcloud` with UUID `1dad9cd2-857b-421f-822c-a2bc2cf7f389` and credentials JSON at `/etc/cloudflared/1dad9cd2-857b-421f-822c-a2bc2cf7f389.json`.

Steps to revive:
1. Copy the configuration template:
   ```bash
   sudo cp /opt/dealrelay/current/deploy/cloudflared/config.yml /etc/cloudflared/config.yml
   ```
2. Replace `<DOMAIN>` with the actual Cloudflare zone domain (for example, `illo.fyi`).
3. Add the DNS route in Cloudflare:
   ```bash
   cloudflared tunnel route dns 1dad9cd2-857b-421f-822c-a2bc2cf7f389 dealrelay.<DOMAIN>
   ```
   Alternatively, add a CNAME record in the Cloudflare dashboard:
   `dealrelay` CNAME `1dad9cd2-857b-421f-822c-a2bc2cf7f389.cfargotunnel.com` (Proxied).
4. Install and enable the systemd service:
   ```bash
   sudo cloudflared service install
   sudo systemctl enable --now cloudflared
   ```

### Option B: Caddy + DNS Record (Simpler alternative)
If direct inbound HTTP/HTTPS ports (80/443) can be opened in the firewall, Caddy provides automatic Let's Encrypt certificates.

Example `/etc/caddy/Caddyfile`:

```caddy
dealrelay.<DOMAIN> {
    # Route actor websocket and control plane
    handle /v1/* {
        reverse_proxy 127.0.0.1:7100
    }

    # Route web application
    handle {
        reverse_proxy 127.0.0.1:3100
    }
}
```

Reload with: `sudo systemctl reload caddy`.

---

## 8. Health Checks

Verify each tier on localhost:

```bash
# 1. Relay Health Check
curl -s http://127.0.0.1:7200/health
# Expected: {"ok":true,"mode":"fixtures","relayConnected":...}

# 2. Actor HTTP Interface
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:7100/v1/projects/local/contract
# Expected: 200 or valid JSON response

# 3. Web Nitro Server
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/
# Expected: 307 (redirect to active room) or 200

# 4. Public End-to-End Smoke Test
WEB_URL=https://dealrelay.<DOMAIN> bash tests/e2e/smoke.sh
```

---

## 9. Rollback Procedure

If a release needs to be rolled back to a previous build:

1. Update the `current` symlink to the previous release directory:
   ```bash
   ln -sfn /opt/dealrelay/releases/dealrelay-bundle-<previous-sha> /opt/dealrelay/current
   ```
2. Restart the systemd services:
   ```bash
   sudo systemctl restart dealrelay-actor dealrelay-relay dealrelay-web
   ```
Because the SQLite database resides in `/opt/dealrelay/shared/.durable-actors/`, all room history and proposals remain intact after rollback.

---

## 10. What Could Not Be Verified Remotely

The following items cannot be tested from the local machine because remote SSH was intentionally prohibited for this task:
1. Whether the existing Cloudflare Tunnel credentials (`1dad9cd2-857b-421f-822c-a2bc2cf7f389`) have an active authentication session or require `cloudflared tunnel login`.
2. Whether the DNS CNAME record for `dealrelay.<DOMAIN>` exists in the Cloudflare zone.
3. Whether Bifrost HTTP API on `127.0.0.1:8317` has valid model credentials loaded for `zai-coding-plan/glm-5-turbo`.

What WAS fully verified locally:
- Clean build of `apps/web` with Nitro `node-server` preset (VERCEL unset).
- Assembly of `dist/dealrelay-bundle/` and generation of `dealrelay-bundle-<sha>.tar.gz` (1.1 MB, SHA256 logged).
- Extraction to a temporary directory outside the repo.
- Parallel execution of actor (:7110), relay (:7210), and web (:3110) via `run-bundle.sh`.
- Local health checks against all three services.
- Full browser end-to-end smoke test via Playwright (`WEB_URL=http://127.0.0.1:3110 bash tests/e2e/smoke.sh`), passing all 10 assertions (socket connection, relay audit, scout trace, negotiator trace, attribution badges, client approval, sync, vendor acceptance, and durable state restore).
