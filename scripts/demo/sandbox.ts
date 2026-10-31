// Boots the actor server and relay inside a Vercel Sandbox and prints the public URLs for the web app's ACTOR_URL / RELAY_URL.
// Needs auth: `vercel link` then `vercel env pull .env.local` (VERCEL_OIDC_TOKEN), and the repo pushed to origin.
// Run: bun scripts/demo/sandbox.ts [gitUrl] [revision]
import { Sandbox } from "@vercel/sandbox"

const url = process.argv[2] ?? "https://github.com/i-amrita/tarima2.git"
const revision = process.argv[3] ?? "main"
const ACTOR_PORT = 7100
const RELAY_PORT = 7200

const sandbox = await Sandbox.create({
  source: { type: "git", url, revision },
  runtime: "node24",
  ports: [ACTOR_PORT, RELAY_PORT],
  timeout: Number(process.env.SANDBOX_MINUTES ?? 45) * 60 * 1000,
})

async function sh(script: string, detached = false): Promise<void> {
  const res = await sandbox.runCommand({ cmd: "bash", args: ["-lc", script], detached })
  if (!detached && res.exitCode !== 0) throw new Error(`failed: ${script}\n${await res.stderr()}`)
}

await sh("curl -fsSL https://bun.sh/install | bash -s bun-v1.4.3")
const bun = 'export PATH=$HOME/.bun/bin:$PATH'
await sh(`${bun} && bun install`)
await sh(`${bun} && cd packages/actors && bunx durable-actors dev --port ${ACTOR_PORT}`, true)
await sh(`${bun} && DEMO_MODE=fixtures RELAY_PORT=${RELAY_PORT} bun apps/relay/src/server.ts`, true)

console.log(`sandbox ${sandbox.sandboxId}`)
console.log(`ACTOR_URL=${sandbox.domain(ACTOR_PORT)}`)
console.log(`RELAY_URL=${sandbox.domain(RELAY_PORT)}`)
