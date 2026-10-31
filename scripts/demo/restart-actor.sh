#!/usr/bin/env bash
# Demo beat 7: kill the durable-actors dev server and relaunch it warm. Keeps .durable-actors/ state.
# Targets only the listener on ACTOR_PORT (default 7100) so other projects' actors are untouched.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
port="${ACTOR_PORT:-7100}"
session="${ACTOR_TMUX_SESSION:-tarima2-actors}"

pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN || true)"
if [ -n "$pids" ]; then
  # shellcheck disable=SC2086
  kill $pids
  for _ in $(seq 1 20); do lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null || break; sleep 0.25; done
fi
tmux kill-session -t "$session" 2>/dev/null || true
tmux new-session -d -s "$session" -c "$root/packages/actors" "bunx durable-actors dev 2>&1 | tee /tmp/${session}.log"
for _ in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/" || true)"
  [ "$code" != "000" ] && { echo "actor server back on :${port}"; exit 0; }
  sleep 0.5
done
echo "actor server did not come back" >&2
exit 1
