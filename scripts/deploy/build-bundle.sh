#!/usr/bin/env bash
# Builds self-contained DealRelay deployment bundle for VPS (web + actor + relay).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Ensure mise / bun 1.4.3 is in PATH
export PATH="$HOME/.local/share/mise/installs/bun/1.4.3/bin:/opt/mise/shims:$PATH"

# Make sure VERCEL is unset so Nitro builds node-server preset
unset VERCEL

echo "==> Resolving Git version..."
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "snapshot")"
echo "    Version SHA: $GIT_SHA"

echo "==> Building web application with node-server Nitro preset..."
(
  cd "$REPO_ROOT/apps/web"
  unset VERCEL
  bun run build
)

DIST_DIR="$REPO_ROOT/dist"
BUNDLE_DIR="$DIST_DIR/dealrelay-bundle"
ARCHIVE_PATH="$DIST_DIR/dealrelay-bundle-${GIT_SHA}.tar.gz"

echo "==> Assembling bundle in $BUNDLE_DIR..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

# 1. VERSION
echo "$GIT_SHA" > "$BUNDLE_DIR/VERSION"

# 2. .env.example with every required variable documented
cat << 'EOF' > "$BUNDLE_DIR/.env.example"
# DealRelay Environment Configuration

# Ports and Bind Addresses
PORT=3100
HOST=127.0.0.1
ACTOR_PORT=7100
RELAY_PORT=7200

# Public Origin URLs
# ACTOR_URL: Public URL of the actor service for browser WebSockets.
# - Single-origin setup (cloudflared/caddy routing /v1/* to :7100): https://dealrelay.<DOMAIN>
# - Dedicated hostname setup: https://actor.dealrelay.<DOMAIN>
# - Local / non-TLS testing: http://127.0.0.1:7100
ACTOR_URL=http://127.0.0.1:7100

# Internal Actor Settings (for backend SSR and relay)
DURABLE_ACTORS_CONTROL_PLANE_URL=http://127.0.0.1:7100
DURABLE_ACTORS_PROJECT_ID=local

# Relay URL (used by web server to invoke proposal runs)
RELAY_URL=http://127.0.0.1:7200

# Application Mode
# "fixtures": Deterministic fixtures (recommended default, no LLM keys required)
# "live": Real multi-agent deliberation with live LLM calls
DEMO_MODE=fixtures

# Demo Controls
# 0: Disabled (safe for judge review, kill button is ignored)
# 1: Enabled (enables demo kill actor button to test durability)
DEMO_ALLOW_KILL=0

# LLM Configuration (used when DEMO_MODE=live)
# On ovhcloud VPS, Bifrost runs locally on port 8317
LLM_BASE_URL=http://127.0.0.1:8317/v1
LLM_API_KEY=sk-bf-placeholder
LLM_MODEL=zai-coding-plan/glm-5-turbo

# Agent Relay Coordination
RELAY_BASE_URL=http://127.0.0.1:8787
RELAY_WORKSPACE_KEY=rk_live_placeholder
RELAY_TOKEN_SCOUT=at_live_placeholder
RELAY_TOKEN_FINANCE=at_live_placeholder
RELAY_TOKEN_NEGOTIATOR=at_live_placeholder
RELAY_TOKEN_TRACE_VIEWER=at_live_placeholder

# Deployment Protection Bypass (Vercel only)
# Not needed on VPS behind cloudflared or Caddy. Only relevant when testing
# against Vercel preview/production deployments with Deployment Protection enabled.
# VERCEL_PROTECTION_BYPASS=
EOF

# 3. Workspace manifests and lockfile
cp "$REPO_ROOT/package.json" "$BUNDLE_DIR/package.json"
cp "$REPO_ROOT/bun.lock" "$BUNDLE_DIR/bun.lock"

# 4. Shared package
mkdir -p "$BUNDLE_DIR/packages/shared"
cp "$REPO_ROOT/packages/shared/package.json" "$BUNDLE_DIR/packages/shared/"
cp -r "$REPO_ROOT/packages/shared/src" "$BUNDLE_DIR/packages/shared/"

# 5. Actors package
mkdir -p "$BUNDLE_DIR/packages/actors"
cp "$REPO_ROOT/packages/actors/package.json" "$BUNDLE_DIR/packages/actors/"
cp -r "$REPO_ROOT/packages/actors/src" "$BUNDLE_DIR/packages/actors/"
cp -r "$REPO_ROOT/packages/actors/generated" "$BUNDLE_DIR/packages/actors/"

# 6. Relay app
mkdir -p "$BUNDLE_DIR/apps/relay"
cp "$REPO_ROOT/apps/relay/package.json" "$BUNDLE_DIR/apps/relay/"
cp -r "$REPO_ROOT/apps/relay/src" "$BUNDLE_DIR/apps/relay/"

# 7. Web app (manifest + built server output)
mkdir -p "$BUNDLE_DIR/apps/web"
cp "$REPO_ROOT/apps/web/package.json" "$BUNDLE_DIR/apps/web/"
cp -r "$REPO_ROOT/apps/web/.output" "$BUNDLE_DIR/apps/web/"

# 8. Deploy configs and run script
mkdir -p "$BUNDLE_DIR/deploy" "$BUNDLE_DIR/scripts/deploy"
cp -r "$REPO_ROOT/deploy/systemd" "$BUNDLE_DIR/deploy/"
cp -r "$REPO_ROOT/deploy/cloudflared" "$BUNDLE_DIR/deploy/"
cp "$REPO_ROOT/scripts/deploy/run-bundle.sh" "$BUNDLE_DIR/scripts/deploy/run-bundle.sh"
cp "$REPO_ROOT/scripts/deploy/run-bundle.sh" "$BUNDLE_DIR/run-bundle.sh"
chmod +x "$BUNDLE_DIR/scripts/deploy/run-bundle.sh" "$BUNDLE_DIR/run-bundle.sh"

echo "==> Creating compressed tarball: $ARCHIVE_PATH..."
rm -f "$ARCHIVE_PATH"
tar -czf "$ARCHIVE_PATH" -C "$DIST_DIR" dealrelay-bundle

# Compute SHA256 and size
if command -v sha256sum >/dev/null 2>&1; then
  BUNDLE_SHA="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  BUNDLE_SHA="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"
else
  BUNDLE_SHA="unknown"
fi

BUNDLE_SIZE="$(ls -lh "$ARCHIVE_PATH" | awk '{print $5}')"

echo "=================================================="
echo "DealRelay Deployment Bundle Ready"
echo "  Archive: $ARCHIVE_PATH"
echo "  Size:    $BUNDLE_SIZE"
echo "  SHA256:  $BUNDLE_SHA"
echo "  Version: $GIT_SHA"
echo "=================================================="
