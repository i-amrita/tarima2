import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { AgentRelay } from "agent-relay"
import type { ActivityActor } from "@dealrelay/shared"
import type { RoomClient } from "./pipeline.js"

export type RelayAgentClient = Awaited<ReturnType<AgentRelay["workspace"]["reconnect"]>>

function loadEnv(): Record<string, string> {
  let curr = import.meta.dir
  let envPath = ""
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(curr, ".env")
    if (existsSync(candidate)) {
      envPath = candidate
      break
    }
    const parent = resolve(curr, "..")
    if (parent === curr) break
    curr = parent
  }
  if (!envPath) return {}
  const content = readFileSync(envPath, "utf-8")
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

export class RelayCoordinator {
  public scout: RelayAgentClient | null = null
  public finance: RelayAgentClient | null = null
  public negotiator: RelayAgentClient | null = null
  public traceViewer: RelayAgentClient | null = null
  private connected = false

  constructor() {}

  async connect(): Promise<boolean> {
    const env = { ...loadEnv(), ...process.env }
    const baseUrl = env.RELAY_BASE_URL || "http://127.0.0.1:8787"
    const workspaceKey = env.RELAY_WORKSPACE_KEY

    if (!workspaceKey) {
      console.warn("[RelayCoordinator] No RELAY_WORKSPACE_KEY configured, Relay disabled")
      return false
    }

    try {
      const relay = new AgentRelay({ workspaceKey, baseUrl })
      const scoutToken = env.RELAY_TOKEN_SCOUT
      const financeToken = env.RELAY_TOKEN_FINANCE
      const negotiatorToken = env.RELAY_TOKEN_NEGOTIATOR
      const traceViewerToken = env.RELAY_TOKEN_TRACE_VIEWER

      if (!scoutToken || !financeToken || !negotiatorToken || !traceViewerToken) {
        console.warn("[RelayCoordinator] Missing agent tokens in env, Relay disabled")
        return false
      }

      this.scout = await relay.workspace.reconnect({ apiToken: scoutToken })
      this.finance = await relay.workspace.reconnect({ apiToken: financeToken })
      this.negotiator = await relay.workspace.reconnect({ apiToken: negotiatorToken })
      this.traceViewer = await relay.workspace.reconnect({ apiToken: traceViewerToken })

      // Ensure channel exists and agents join
      try {
        await this.scout.channels.create({ name: "procurement", topic: "venue negotiation" })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!msg.includes("already exists")) {
          console.warn("[RelayCoordinator] Channel create notice:", msg)
        }
      }

      for (const [name, client] of [
        ["scout", this.scout],
        ["finance", this.finance],
        ["negotiator", this.negotiator],
        ["trace-viewer", this.traceViewer],
      ] as const) {
        try {
          await client.channels.join("#procurement")
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          if (!msg.includes("already")) {
            console.warn(`[RelayCoordinator] Agent ${name} join:`, msg)
          }
        }
      }

      this.connected = true
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn("[RelayCoordinator] Failed to connect to Relay:", msg)
      this.connected = false
      return false
    }
  }

  isReady(): boolean {
    return this.connected && !!this.scout && !!this.finance && !!this.negotiator && !!this.traceViewer
  }

  async postAsScout(text: string): Promise<void> {
    if (this.scout) {
      await this.scout.sendMessage({ to: "#procurement", text })
    }
  }

  async readAsFinance(): Promise<string | null> {
    if (!this.finance) return null
    try {
      const msgs = await this.finance.messages.list("#procurement", { limit: 5 })
      return msgs[0]?.text ?? null
    } catch {
      return null
    }
  }

  async postAsFinance(text: string): Promise<void> {
    if (this.finance) {
      await this.finance.sendMessage({ to: "#procurement", text })
    }
  }

  async readAsNegotiator(): Promise<string | null> {
    if (!this.negotiator) return null
    try {
      const msgs = await this.negotiator.messages.list("#procurement", { limit: 5 })
      return msgs[0]?.text ?? null
    } catch {
      return null
    }
  }

  async postAsNegotiator(text: string): Promise<void> {
    if (this.negotiator) {
      await this.negotiator.sendMessage({ to: "#procurement", text })
    }
  }

  /**
   * Trace-viewer mirrors the channel message into the actor activity stream.
   */
  async mirrorActivity(
    room: RoomClient,
    actor: ActivityActor,
    message: string,
    attribution?: unknown,
  ): Promise<void> {
    // When connected to Relay, trace-viewer is the agent reading and mirroring the message to the room actor
    await room.appendActivity(actor, message, attribution)
  }
}

let singletonCoordinator: RelayCoordinator | null = null

export async function getRelayCoordinator(): Promise<RelayCoordinator> {
  if (!singletonCoordinator) {
    singletonCoordinator = new RelayCoordinator()
    await singletonCoordinator.connect()
  }
  return singletonCoordinator
}
