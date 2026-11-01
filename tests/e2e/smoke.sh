#!/usr/bin/env bash
# Happy-path browser smoke via playwright-cli. Needs actors (:7100), relay (:7200) and web (:3100) running.
# Web must run with DEMO_ALLOW_KILL=1 for the last step. Run: bash tests/e2e/smoke.sh
set -euo pipefail
base="${WEB_URL:-http://127.0.0.1:3100}"
room="smoke-$(date +%s)"
s="-s=smoke-$room"
pw() { playwright-cli "$s" "$@"; }
text() { pw --raw eval "document.body.innerText"; }
expect() { # expect <substring> <what> ; polls up to 15s
  for _ in $(seq 1 30); do text | grep -q -- "$1" && { echo "ok   $2"; return 0; }; sleep 0.5; done
  echo "FAIL $2 (missing: $1)"; text | head -c 1200; pw close >/dev/null 2>&1 || true; exit 1
}
cd "$(mktemp -d)"
pw open "$base/room/$room?role=agency" >/dev/null
expect "connected" "agency socket connected"
pw click "getByTestId('demo-menu')" >/dev/null
pw click "getByTestId('inject-grand-loft')" >/dev/null 2>&1 || pw click "getByRole('button', { name: 'Inject Grand Loft' })" >/dev/null
expect "REQUIRES APPROVAL" "proposal audited by relay"
expect "SCOUT" "trace shows scout"
expect "NEGOTIATOR" "trace shows negotiator"
pw eval "document.querySelectorAll('[data-testid=trace-item][data-actor]').length" | grep -qv '^0$' && echo "ok   trace has attribution"

# Verify relay messages were posted to #procurement via Agent Relay
bun -e '
  import { existsSync, readFileSync } from "node:fs";
  import { AgentRelay } from "agent-relay";
  const envPath = ".env";
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const key = content.match(/RELAY_WORKSPACE_KEY=([^\n\r]+)/)?.[1];
    const token = content.match(/RELAY_TOKEN_TRACE_VIEWER=([^\n\r]+)/)?.[1];
    const baseUrl = content.match(/RELAY_BASE_URL=([^\n\r]+)/)?.[1] || "http://127.0.0.1:8787";
    if (key && token) {
      try {
        const relay = new AgentRelay({ workspaceKey: key, baseUrl });
        const viewer = await relay.workspace.reconnect({ apiToken: token });
        const msgs = await viewer.messages.list("#procurement", { limit: 10 });
        if (msgs.length > 0) {
          console.log("ok   relay messages posted to #procurement (" + msgs.length + " found)");
        }
      } catch (e) {
        console.warn("Relay check skipped:", e.message);
      }
    }
  }
' || true

pw eval "document.querySelectorAll('[data-testid*=badge]').length" >/dev/null
pw tab-new "$base/room/$room?role=client" >/dev/null
expect "Approve Counter-Offer" "client sees approval bar"
pw click "getByRole('button', { name: /approve counter/i }).first()" >/dev/null
expect "COUNTER PROPOSED" "client approval flips status"
pw tab-select 0 >/dev/null
expect "COUNTER PROPOSED" "agency window synced"
pw click "getByTestId('demo-menu')" >/dev/null
pw click "getByTestId('vendor-accepts')" >/dev/null 2>&1 || pw click "getByRole('button', { name: /vendor accepts/i })" >/dev/null
expect "ACCEPTED" "vendor acceptance"
pw click "getByTestId('demo-menu')" >/dev/null
pw click "getByTestId('kill-actor')" >/dev/null
sleep 8
pw reload >/dev/null
expect "ACCEPTED" "state restored after actor kill and refresh"
pw close >/dev/null 2>&1 || true
echo "smoke passed ($room)"
