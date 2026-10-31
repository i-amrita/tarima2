import { createServerFn } from "@tanstack/react-start"
import { actors } from "@dealrelay/actors"
import type { Role, RoomState } from "@dealrelay/shared"

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
