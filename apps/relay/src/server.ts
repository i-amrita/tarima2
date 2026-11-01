import { actors } from "@dealrelay/actors"
import type { EventSpecs } from "@dealrelay/shared"
import { DEFAULT_SPECS } from "@dealrelay/shared/fixtures"
import { RelayPipeline } from "./pipeline.js"
import { getRelayCoordinator, type RelayCoordinator } from "./relay.js"

export type RunRequestBody = {
  roomId: string
  proposalId: string
  rawText: string
  specs: EventSpecs
}

export type FeedbackRequestBody = {
  roomId: string
  proposalId?: string
}

export function createRelayServer(port = Number(process.env.RELAY_PORT ?? 7200)) {
  const mode = (process.env.DEMO_MODE === "live" ? "live" : "fixtures") as "fixtures" | "live"
  let coordinator: RelayCoordinator | null = null
  const activeRooms = new Set<string>()
  const revising = new Set<string>()

  // Eagerly initiate coordinator connection in background
  getRelayCoordinator()
    .then((c) => {
      coordinator = c
      console.log(`[RelayServer] Relay coordinator connected (ready: ${c.isReady()})`)
    })
    .catch((err) => {
      console.warn("[RelayServer] Relay coordinator could not be initialized:", err)
    })

  async function triggerRevision(roomId: string, proposalId?: string): Promise<void> {
    try {
      const room = actors.RoomActor.get(roomId)
      const state = await room.getState()
      if (!state || !state.proposals) return

      const targets = state.proposals.filter(
        (p) => p.status === "REVISING" && (!proposalId || p.id === proposalId),
      )

      for (const proposal of targets) {
        const key = `${roomId}:${proposal.id}:${proposal.revision ?? 0}`
        if (revising.has(key)) continue
        revising.add(key)

        const pipeline = new RelayPipeline({ room, mode, coordinator })
        pipeline
          .runRevision(
            proposal.id,
            proposal.rawText,
            state.specs ?? DEFAULT_SPECS,
            proposal.feedback ?? [],
            proposal.audit,
            proposal.revision ?? 0,
          )
          .catch((err) => {
            console.error(`Revision execution failed for room ${roomId}, proposal ${proposal.id}:`, err)
          })
          .finally(() => {
            revising.delete(key)
          })
      }
    } catch (err) {
      console.warn(`[RelayServer] Failed to check room ${roomId} for revisions:`, err)
    }
  }

  // Periodic reconciliation loop: checks active rooms so revisions recover automatically after actor restart
  const pollTimer = setInterval(() => {
    if (activeRooms.size === 0) return
    for (const roomId of activeRooms) {
      triggerRevision(roomId).catch(() => {})
    }
  }, 1500)
  pollTimer.unref?.()

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({
          ok: true,
          mode,
          relayConnected: coordinator?.isReady() ?? false,
          activeRoomsCount: activeRooms.size,
        })
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

        activeRooms.add(roomId)
        const room = actors.RoomActor.get(roomId)
        const pipeline = new RelayPipeline({ room, mode, coordinator })
        pipeline.runProposal(proposalId, rawText, specs).catch((err) => {
          console.error(`Pipeline execution failed for room ${roomId}, proposal ${proposalId}:`, err)
        })

        return Response.json({ status: "accepted" }, { status: 202 })
      }

      if (req.method === "POST" && (url.pathname === "/feedback" || url.pathname === "/revise")) {
        let body: FeedbackRequestBody
        try {
          body = (await req.json()) as FeedbackRequestBody
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const { roomId, proposalId } = body
        if (!roomId) {
          return Response.json({ error: "Missing roomId" }, { status: 400 })
        }

        activeRooms.add(roomId)
        triggerRevision(roomId, proposalId).catch((err) => {
          console.error(`Feedback revision trigger failed for room ${roomId}:`, err)
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
