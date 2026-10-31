import { createServerFn } from "@tanstack/react-start"
import { actors } from "@dealrelay/actors"
import type { EventSpecs, Role, RoomState } from "@dealrelay/shared"
import { DEFAULT_SPECS, VENUE_FIXTURES } from "@dealrelay/shared/fixtures"

export const getSocketGrant = createServerFn({ method: "POST" })
  .validator((d: { roomId: string; role: Role }) => d)
  .handler(async ({ data }) => {
    const grant = await actors.RoomActor.prepareWebsocket(
      {
        actorId: data.roomId,
        metadata: { role: data.role },
      },
      {
        controlPlaneUrl: process.env.ACTOR_URL ?? "http://127.0.0.1:7100",
      },
    )
    return grant
  })

export const getRoomState = createServerFn({ method: "GET" })
  .validator((d: { roomId: string }) => d)
  .handler(async ({ data }): Promise<RoomState> => {
    const actorUrl = process.env.ACTOR_URL ?? "http://127.0.0.1:7100"
    try {
      const res = await fetch(
        `${actorUrl}/v1/projects/local/observe/state?actorName=RoomActor&actorId=${encodeURIComponent(data.roomId)}`,
      )
      if (res.ok) {
        const json = (await res.json()) as { snapshot?: { state?: Partial<RoomState> } }
        if (json.snapshot?.state) {
          const s = json.snapshot.state
          return {
            specs: s.specs ?? null,
            proposals: s.proposals ?? [],
            activity: s.activity ?? [],
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch room state from actor server:", e)
    }
    return { specs: null, proposals: [], activity: [] }
  })

export const setRoomSpecs = createServerFn({ method: "POST" })
  .validator((d: { roomId: string; specs: EventSpecs }) => d)
  .handler(async ({ data }) => {
    const room = actors.RoomActor.get(data.roomId)
    await room.setSpecs(data.specs)
    return { ok: true }
  })

export const triggerSimulation = createServerFn({ method: "POST" })
  .validator((d: { roomId: string; kind: "grand-loft" | "warehouse-9" }) => d)
  .handler(async ({ data }) => {
    const fixtureIndex = data.kind === "grand-loft" ? 0 : 1
    const fixture = VENUE_FIXTURES[fixtureIndex]
    if (!fixture) {
      throw new Error(`Fixture not found for kind: ${data.kind}`)
    }

    const room = actors.RoomActor.get(data.roomId)
    const existing = await getRoomState({ data: { roomId: data.roomId } })
    const specs = existing.specs ?? DEFAULT_SPECS
    if (!existing.specs) await room.setSpecs(specs)
    const proposalId = await room.injectProposal(fixture)

    const relayUrl = process.env.RELAY_URL ?? "http://127.0.0.1:7200"
    try {
      const response = await fetch(`${relayUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: data.roomId,
          proposalId,
          rawText: fixture.rawText,
          specs,
        }),
      })

      if (!response.ok) {
        console.warn(`Relay returned status ${response.status} for proposal ${proposalId}`)
      }
    } catch (err) {
      console.warn(`Relay service unreachable at ${relayUrl}, proceeding anyway:`, err)
    }

    return { proposalId }
  })

export const vendorAcceptsCounter = createServerFn({ method: "POST" })
  .validator((d: { roomId: string; proposalId: string }) => d)
  .handler(async ({ data }) => {
    const room = actors.RoomActor.get(data.roomId)
    await room.recordVendorAcceptance(data.proposalId)
    return { ok: true }
  })

export const killActor = createServerFn({ method: "POST" })
  .validator((d: { roomId: string }) => d)
  .handler(async ({ data }) => {
    // Demo beat: kill and relaunch the actor server so a refresh proves durable state.
    // Gated so a stray click cannot restart anything outside a recording session.
    if (process.env.DEMO_ALLOW_KILL !== "1") {
      console.info(`[Demo] killActor ignored for room ${data.roomId} (set DEMO_ALLOW_KILL=1 to enable)`)
      return { ok: true, killed: false }
    }
    const { spawn } = await import("node:child_process")
    const script = new URL("../../../../scripts/demo/restart-actor.sh", import.meta.url).pathname
    spawn("bash", [script], { detached: true, stdio: "ignore" }).unref()
    return { ok: true, killed: true }
  })
