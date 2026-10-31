import { actors } from "@dealrelay/actors"
import type { EventSpecs } from "@dealrelay/shared"
import { RelayPipeline } from "./pipeline.js"
import { getRelayCoordinator, type RelayCoordinator } from "./relay.js"

export type RunRequestBody = {
  roomId: string
  proposalId: string
  rawText: string
  specs: EventSpecs
}

export function createRelayServer(port = Number(process.env.RELAY_PORT ?? 7200)) {
  const mode = (process.env.DEMO_MODE === "live" ? "live" : "fixtures") as "fixtures" | "live"
  let coordinator: RelayCoordinator | null = null

  // Eagerly initiate coordinator connection in background
  getRelayCoordinator()
    .then((c) => {
      coordinator = c
      console.log(`[RelayServer] Relay coordinator connected (ready: ${c.isReady()})`)
    })
    .catch((err) => {
      console.warn("[RelayServer] Relay coordinator could not be initialized:", err)
    })

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({ ok: true, mode, relayConnected: coordinator?.isReady() ?? false })
      }

      if (req.method === "POST" && url.pathname === "/run") {
        let body: RunRequestBody
        try {
          body = (await req.json()) as RunRequestBody
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const { roomId, proposalId, rawText, specs } = body
        if (!roomId || !proposalId || !rawText || !specs) {
          return Response.json({ error: "Missing required fields" }, { status: 400 })
        }

        const room = actors.RoomActor.get(roomId)
        const pipeline = new RelayPipeline({ room, mode, coordinator })
        pipeline.runProposal(proposalId, rawText, specs).catch((err) => {
          console.error(`Pipeline execution failed for room ${roomId}, proposal ${proposalId}:`, err)
        })

        return Response.json({ status: "accepted" }, { status: 202 })
      }

      return Response.json({ error: "Not found" }, { status: 404 })
    },
  })

  return server
}

if (import.meta.main) {
  const server = createRelayServer()
  console.log(`Relay server running on http://127.0.0.1:${server.port}`)
}
