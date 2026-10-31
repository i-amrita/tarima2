#!/usr/bin/env bash
# Boots a fresh Vercel Sandbox (actor + relay), points the production env at it, rebuilds and redeploys apps/web.
# Needs: vercel login + link (apps/web/.vercel), origin pushed. Run from the repo root: bash scripts/demo/redeploy-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH=$HOME/.local/share/mise/installs/bun/1.4.3/bin:$PATH
set -a; . apps/web/.env.local; set +a
out=$(SANDBOX_MINUTES="${SANDBOX_MINUTES:-45}" bun scripts/demo/sandbox.ts)
echo "$out"
actor=$(echo "$out" | sed -n 's/^ACTOR_URL=//p'); relay=$(echo "$out" | sed -n 's/^RELAY_URL=//p')
sleep 15
cd apps/web
setenv() { printf %s "$2" | vercel env add "$1" production --force >/dev/null 2>&1 || { echo "env $1 failed"; exit 1; }; }
setenv ACTOR_URL "$actor"; setenv DURABLE_ACTORS_CONTROL_PLANE_URL "$actor"; setenv RELAY_URL "$relay"
setenv DURABLE_ACTORS_PROJECT_ID local; setenv DEMO_MODE fixtures
vercel pull --yes --environment=production >/dev/null 2>&1
vercel build --prod >/dev/null 2>&1
vercel deploy --prebuilt --prod --yes 2>&1 | grep -o "https://dealrelay-[a-z0-9]*-quino[^ \"]*" | head -1
