#!/usr/bin/env bash
# Stop the demo sessions started by up.sh.
set -euo pipefail
for s in demo-actor demo-relay demo-web tarima2-actors tarima2-relay; do
  tmux has-session -t "=$s" 2>/dev/null && tmux kill-session -t "=$s" || true
done
for port in 7100 7200 3100; do
  p="$(lsof -ti "tcp:$port" -sTCP:LISTEN || true)"; [ -n "$p" ] && kill $p || true
done
echo "demo down"
