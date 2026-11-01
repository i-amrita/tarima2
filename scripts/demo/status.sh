#!/usr/bin/env bash
# One-line health per service.
for pair in "actor:7100" "relay:7200" "web:3100"; do
  code="$(curl -s -m 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${pair#*:}/" || true)"
  [ "$code" = "000" ] && echo "DOWN ${pair%%:*} (:${pair#*:})" || echo "UP   ${pair%%:*} (:${pair#*:}) http $code"
done
grep -h "Relay coordinator" /tmp/demo-relay.log 2>/dev/null | tail -1 || true
