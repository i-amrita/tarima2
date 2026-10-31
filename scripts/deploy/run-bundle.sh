#!/usr/bin/env bash
# Starts DealRelay processes from an extracted bundle.
# Usage:
#   ./run-bundle.sh          # starts all 3 processes (actor, relay, web) with trap cleanup
#   ./run-bundle.sh actor    # starts actor only (:7100)
#   ./run-bundle.sh relay    # starts relay only (:7200)
#   ./run-bundle.sh web      # starts web only (:3100)
set -euo pipefail

# Resolve bundle root directory regardless of how script was invoked
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/VERSION" ]; then
  BUNDLE_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../../VERSION" ]; then
  BUNDLE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
  BUNDLE_DIR="$SCRIPT_DIR"
fi

cd "$BUNDLE_DIR"

# Ensure mise / bun shims are in PATH
export PATH="/opt/mise/shims:$HOME/.local/share/mise/installs/bun/1.4.3/bin:$PATH"

# Load environment configuration if present
if [ -f "$BUNDLE_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$BUNDLE_DIR/.env"
  set +a
fi

# Ensure production dependencies are installed
if [ ! -d "$BUNDLE_DIR/node_modules" ] || [ ! -d "$BUNDLE_DIR/packages/actors/node_modules" ]; then
  echo "[run-bundle] Installing production dependencies via bun..."
  bun install --production
fi

# Configuration defaults
ACTOR_PORT="${ACTOR_PORT:-7100}"
RELAY_PORT="${RELAY_PORT:-7200}"
WEB_PORT="${PORT:-${WEB_PORT:-3100}}"
WEB_HOST="${HOST:-127.0.0.1}"
DEMO_MODE="${DEMO_MODE:-fixtures}"
DEMO_ALLOW_KILL="${DEMO_ALLOW_KILL:-0}"
DURABLE_ACTORS_PROJECT_ID="${DURABLE_ACTORS_PROJECT_ID:-local}"
ACTOR_URL="${ACTOR_URL:-http://127.0.0.1:${ACTOR_PORT}}"
DURABLE_ACTORS_CONTROL_PLANE_URL="${DURABLE_ACTORS_CONTROL_PLANE_URL:-http://127.0.0.1:${ACTOR_PORT}}"
RELAY_URL="${RELAY_URL:-http://127.0.0.1:${RELAY_PORT}}"

MODE="${1:-all}"

start_actor() {
  echo "[run-bundle] Starting actor service on port ${ACTOR_PORT}..."
  cd "$BUNDLE_DIR/packages/actors"
  export DURABLE_ACTORS_PORT="${ACTOR_PORT}"
  unset DURABLE_ACTORS_PROJECT
  exec bunx durable-actors dev --port "${ACTOR_PORT}" --no-watch
}

start_relay() {
  echo "[run-bundle] Starting relay service on port ${RELAY_PORT}..."
  cd "$BUNDLE_DIR"
  export RELAY_PORT="${RELAY_PORT}"
  export DURABLE_ACTORS_CONTROL_PLANE_URL="${DURABLE_ACTORS_CONTROL_PLANE_URL}"
  export DURABLE_ACTORS_PROJECT_ID="${DURABLE_ACTORS_PROJECT_ID}"
  export DEMO_MODE="${DEMO_MODE}"
  exec bun run apps/relay/src/server.ts
}

start_web() {
  echo "[run-bundle] Starting web service on ${WEB_HOST}:${WEB_PORT}..."
  cd "$BUNDLE_DIR"
  export PORT="${WEB_PORT}"
  export HOST="${WEB_HOST}"
  export NITRO_PORT="${WEB_PORT}"
  export NITRO_HOST="${WEB_HOST}"
  export ACTOR_URL="${ACTOR_URL}"
  export DURABLE_ACTORS_CONTROL_PLANE_URL="${DURABLE_ACTORS_CONTROL_PLANE_URL}"
  export DURABLE_ACTORS_PROJECT_ID="${DURABLE_ACTORS_PROJECT_ID}"
  export RELAY_URL="${RELAY_URL}"
  export DEMO_MODE="${DEMO_MODE}"
  export DEMO_ALLOW_KILL="${DEMO_ALLOW_KILL}"
  exec bun apps/web/.output/server/index.mjs
}

case "$MODE" in
  actor)
    start_actor
    ;;
  relay)
    start_relay
    ;;
  web)
    start_web
    ;;
  all)
    echo "[run-bundle] Starting all services (actor:${ACTOR_PORT}, relay:${RELAY_PORT}, web:${WEB_PORT})..."
    
    # Start actor
    (
      cd "$BUNDLE_DIR/packages/actors"
      export DURABLE_ACTORS_PORT="${ACTOR_PORT}"
      unset DURABLE_ACTORS_PROJECT
      exec bunx durable-actors dev --port "${ACTOR_PORT}" --no-watch
    ) &
    PID_ACTOR=$!

    # Start relay
    (
      cd "$BUNDLE_DIR"
      export RELAY_PORT="${RELAY_PORT}"
      export DURABLE_ACTORS_CONTROL_PLANE_URL="${DURABLE_ACTORS_CONTROL_PLANE_URL}"
      export DURABLE_ACTORS_PROJECT_ID="${DURABLE_ACTORS_PROJECT_ID}"
      export DEMO_MODE="${DEMO_MODE}"
      exec bun run apps/relay/src/server.ts
    ) &
    PID_RELAY=$!

    # Start web
    (
      cd "$BUNDLE_DIR"
      export PORT="${WEB_PORT}"
      export HOST="${WEB_HOST}"
      export NITRO_PORT="${WEB_PORT}"
      export NITRO_HOST="${WEB_HOST}"
      export ACTOR_URL="${ACTOR_URL}"
      export DURABLE_ACTORS_CONTROL_PLANE_URL="${DURABLE_ACTORS_CONTROL_PLANE_URL}"
      export DURABLE_ACTORS_PROJECT_ID="${DURABLE_ACTORS_PROJECT_ID}"
      export RELAY_URL="${RELAY_URL}"
      export DEMO_MODE="${DEMO_MODE}"
      export DEMO_ALLOW_KILL="${DEMO_ALLOW_KILL}"
      exec bun apps/web/.output/server/index.mjs
    ) &
    PID_WEB=$!

    cleanup() {
      echo "[run-bundle] Stopping child processes..."
      kill "$PID_ACTOR" "$PID_RELAY" "$PID_WEB" 2>/dev/null || true
      wait "$PID_ACTOR" "$PID_RELAY" "$PID_WEB" 2>/dev/null || true
    }

    trap cleanup INT TERM EXIT

    wait -n "$PID_ACTOR" "$PID_RELAY" "$PID_WEB"
    ;;
  *)
    echo "Unknown component: $MODE. Choose: all, actor, relay, web" >&2
    exit 1
    ;;
esac
