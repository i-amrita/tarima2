#!/usr/bin/env bash
# Start the full demo stack in separate tmux sessions (actor, relay, web) so the kill-actor beat survives.
# Usage: scripts/demo/up.sh [fixtures|live]   (default fixtures). Idempotent: restarts sessions it owns.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
mode="${1:-fixtures}"
have() { tmux has-session -t "=$1" 2>/dev/null; }
stop_session() { have "$1" && tmux kill-session -t "=$1" || true; }
free_port() { local p; p="$(lsof -ti "tcp:$1" -sTCP:LISTEN || true)"; [ -n "$p" ] && kill $p || true; }

for s in demo-actor demo-relay demo-web tarima2-actors tarima2-relay; do stop_session "$s"; done
for port in 7100 7200 3100; do free_port "$port"; done

env_file=""
[ -f "$root/.env" ] && env_file="set -a; . $root/.env; set +a;"
# The actor session name must match scripts/demo/restart-actor.sh (tarima2-actors).
tmux new-session -d -s tarima2-actors -c "$root/packages/actors" "bunx durable-actors dev 2>&1 | tee /tmp/tarima2-actors.log"
tmux new-session -d -s demo-relay -c "$root/apps/relay" "$env_file DEMO_MODE=$mode bun run dev 2>&1 | tee /tmp/demo-relay.log"
tmux new-session -d -s demo-web -c "$root/apps/web" "DEMO_ALLOW_KILL=1 bun run dev 2>&1 | tee /tmp/demo-web.log"

for _ in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/ || true)" != "000" ] && break
  sleep 1
done
echo "demo up (mode=$mode): web http://127.0.0.1:3100  actor :7100  relay :7200"
echo "logs: /tmp/tarima2-actors.log /tmp/demo-relay.log /tmp/demo-web.log"
