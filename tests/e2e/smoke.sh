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
pw click "getByTestId('inject-grand-loft')" >/dev/null 2>&1 || pw click "getByRole('button', { name: 'Inject Grand Loft' })" >/dev/null
expect "REQUIRES APPROVAL" "proposal audited by relay"
expect "SCOUT" "trace shows scout"
expect "NEGOTIATOR" "trace shows negotiator"
pw eval "document.querySelectorAll('[data-testid*=badge]').length" >/dev/null
pw tab-new "$base/room/$room?role=client" >/dev/null
expect "Approve Counter-Offer" "client sees approval bar"
pw click "getByRole('button', { name: /approve counter/i })" >/dev/null
expect "COUNTER PROPOSED" "client approval flips status"
pw tab-select 0 >/dev/null
expect "COUNTER PROPOSED" "agency window synced"
pw click "getByRole('button', { name: /vendor accepts/i })" >/dev/null
expect "ACCEPTED" "vendor acceptance"
pw click "getByTestId('demo-menu')" >/dev/null
pw click "getByTestId('kill-actor')" >/dev/null
sleep 8
pw reload >/dev/null
expect "ACCEPTED" "state restored after actor kill and refresh"
pw close >/dev/null 2>&1 || true
echo "smoke passed ($room)"
