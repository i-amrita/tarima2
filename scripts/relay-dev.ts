import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { AgentRelay } from "agent-relay"

const envPath = resolve(process.cwd(), ".env")

function parseEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const content = readFileSync(path, "utf-8")
  const result: Record<string, string> = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      result[key] = val
    }
  }
  return result
}

function updateEnv(path: string, newVars: Record<string, string>): void {
  const current = parseEnv(path)
  const merged = { ...current, ...newVars }
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`)
  writeFileSync(path, lines.join("\n") + "\n", "utf-8")
}

async function isServerRunning(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

async function ensureServer(port = 8787): Promise<void> {
  const baseUrl = `http://127.0.0.1:${port}`
  if (await isServerRunning(baseUrl)) {
    console.log(`Relaycast server is already running on ${baseUrl}`)
    return
  }
  console.log(`Starting local Relaycast server on port ${port}...`)
  execSync(`bunx agent-relay init --port ${port} --tools none --yes`, { stdio: "inherit" })
  for (let i = 0; i < 20; i++) {
    if (await isServerRunning(baseUrl)) {
      console.log(`Relaycast server is ready on ${baseUrl}`)
      return
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Failed to start Relaycast server on port ${port}`)
}

function getLocalWorkspaceKey(): string {
  try {
    const key = execSync("bunx agent-relay workspace key local --reveal-secrets", { encoding: "utf-8" }).trim()
    if (key.startsWith("rk_")) return key
  } catch (err) {
    console.warn("Failed to get local workspace key via CLI:", err)
  }
  return ""
}

export async function setupRelayDev() {
  const port = 8787
  const baseUrl = `http://127.0.0.1:${port}`
  await ensureServer(port)

  const env = parseEnv(envPath)
  let workspaceKey = env.RELAY_WORKSPACE_KEY || getLocalWorkspaceKey()
  if (!workspaceKey) {
    throw new Error("Unable to obtain RELAY_WORKSPACE_KEY")
  }

  console.log(`Using Relaycast baseUrl=${baseUrl}, workspaceKey=${workspaceKey.slice(0, 8)}...`)
  const relay = new AgentRelay({ workspaceKey, baseUrl })

  const agentNames = ["scout", "finance", "negotiator", "trace-viewer"] as const
  type RelayAgent = Awaited<ReturnType<AgentRelay["workspace"]["reconnect"]>>
  const tokens: Record<string, string> = {}
  const agentClients: Partial<Record<(typeof agentNames)[number], RelayAgent>> = {}

  for (const name of agentNames) {
    const envVar = `RELAY_TOKEN_${name.toUpperCase().replace(/-/g, "_")}`
    const existingToken = env[envVar]
    let client: RelayAgent | null = null

    if (existingToken) {
      try {
        client = await relay.workspace.reconnect({ apiToken: existingToken })
        tokens[envVar] = existingToken
        console.log(`Reconnected agent "${name}" using existing token`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`Failed to reconnect agent "${name}", re-registering:`, msg)
      }
    }

    if (!client) {
      try {
        const [registered] = await relay.workspace.register([{ name, type: "agent" }])
        client = registered
        tokens[envVar] = registered.token
        console.log(`Registered fresh agent "${name}" (token: ${registered.token.slice(0, 10)}...)`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("name_conflict")) {
          console.warn(`Name conflict for "${name}". Workspace already knows this agent.`)
        }
        throw err
      }
    }

    agentClients[name] = client
  }

  // Create channel #procurement if not exists
  const scout = agentClients["scout"]
  if (!scout) throw new Error("Scout client missing")
  try {
    await scout.channels.create({ name: "procurement", topic: "venue negotiation" })
    console.log('Created channel "#procurement"')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already exists")) {
      console.log('Channel "#procurement" already exists')
    } else {
      throw err
    }
  }

  // All agents join #procurement
  for (const [name, client] of Object.entries(agentClients)) {
    if (!client) continue
    try {
      await client.channels.join("#procurement")
      console.log(`Agent "${name}" joined "#procurement"`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`Agent "${name}" join status: ${msg}`)
    }
  }

  // Write env vars
  updateEnv(envPath, {
    RELAY_BASE_URL: baseUrl,
    RELAY_WORKSPACE_KEY: workspaceKey,
    ...tokens,
  })
  console.log("Updated .env with Relay configuration and agent tokens")

  // Verified SDK channel round-trip test
  const testMsg = `[probe] Scout roundtrip verification at ${new Date().toISOString()}`
  await scout.sendMessage({ to: "#procurement", text: testMsg })
  console.log(`Scout posted message to #procurement: "${testMsg}"`)

  const traceViewer = agentClients["trace-viewer"]
  if (!traceViewer) throw new Error("Trace-viewer client missing")
  const messages = await traceViewer.messages.list("#procurement", { limit: 10 })
  const found = messages.some((m) => typeof m.text === "string" && m.text.includes(testMsg))
  if (!found) {
    throw new Error("SDK channel round-trip verification failed: posted message not found in list")
  }
  console.log("Verified SDK channel round-trip successful!")
}

if (import.meta.main) {
  setupRelayDev()
    .then(() => {
      console.log("relay-dev setup complete.")
      process.exit(0)
    })
    .catch((err) => {
      console.error("relay-dev failed:", err)
      process.exit(1)
    })
}
