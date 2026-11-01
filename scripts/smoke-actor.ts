// Live smoke test against `durable-actors dev` (http://127.0.0.1:7100).
// Usage:
//   bun scripts/smoke-actor.ts [roomId]
//   bun scripts/smoke-actor.ts comment <roomId> <proposalId> <text>
//   bun scripts/smoke-actor.ts reject <roomId> <proposalId> [reason]
//   bun scripts/smoke-actor.ts approve <roomId> <proposalId>
import { actors } from "../packages/actors/generated/index.js"

const controlPlaneUrl = process.env.ACTOR_URL ?? "http://127.0.0.1:7100"

export async function sendSocketMessage(
  roomId: string,
  role: "client" | "agency",
  message: unknown,
): Promise<void> {
  const grant = await actors.RoomActor.prepareWebsocket(
    { actorId: roomId, metadata: { role } },
    { controlPlaneUrl },
  )

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(grant.websocketUrl)
    ws.onopen = () => {
      ws.send(JSON.stringify(message))
      setTimeout(() => {
        ws.close()
        resolve()
      }, 400)
    }
    ws.onerror = (err) => reject(err)
  })
}

const args = process.argv.slice(2)
const command = args[0]

if (command === "comment") {
  const [, roomId, proposalId, ...textParts] = args
  if (!roomId || !proposalId) {
    console.error("Usage: bun scripts/smoke-actor.ts comment <roomId> <proposalId> <text>")
    process.exit(1)
  }
  const text = textParts.join(" ") || "Please extend curfew to 2am"
  try {
    await sendSocketMessage(roomId, "client", { type: "comment", proposalId, text })
    console.log(`ok comment sent over socket for ${proposalId} in ${roomId}`)
  } catch {
    // Fallback directly to actor RPC if socket is unreachable
    const room = actors.RoomActor.get(roomId)
    await room.recordComment(proposalId, "client", text)
    console.log(`ok comment recorded via actor RPC for ${proposalId} in ${roomId}`)
  }
} else if (command === "reject") {
  const [, roomId, proposalId, ...reasonParts] = args
  if (!roomId || !proposalId) {
    console.error("Usage: bun scripts/smoke-actor.ts reject <roomId> <proposalId> [reason]")
    process.exit(1)
  }
  const reason = reasonParts.join(" ") || undefined
  try {
    await sendSocketMessage(roomId, "client", { type: "reject", proposalId, reason })
    console.log(`ok reject sent over socket for ${proposalId} in ${roomId}`)
  } catch {
    // Fallback directly to actor RPC if socket is unreachable
    const room = actors.RoomActor.get(roomId)
    await room.recordReject(proposalId, "client", reason)
    console.log(`ok reject recorded via actor RPC for ${proposalId} in ${roomId}`)
  }
} else if (command === "approve") {
  const [, roomId, proposalId] = args
  if (!roomId || !proposalId) {
    console.error("Usage: bun scripts/smoke-actor.ts approve <roomId> <proposalId>")
    process.exit(1)
  }
  try {
    await sendSocketMessage(roomId, "client", { type: "approve", proposalId })
    console.log(`ok approve sent over socket for ${proposalId} in ${roomId}`)
  } catch {
    const room = actors.RoomActor.get(roomId)
    await room.recordApproval(proposalId, "client")
    console.log(`ok approve recorded via actor RPC for ${proposalId} in ${roomId}`)
  }
} else {
  // Default legacy behavior: walk inject -> audit -> revision -> approve -> accept
  const roomId = command ?? `smoke-${Date.now()}`
  const room = actors.RoomActor.get(roomId)
  await room.setSpecs({
    eventName: "Smoke",
    targetDate: "2026-12-01",
    guestCount: 60,
    maxBudget: 8000,
    requiredCurfew: "01:00",
    avRequired: true,
  })
  const id = await room.injectProposal({
    name: "Harbor Loft",
    rawText: "raw",
    quotedCost: 9000,
    quotedCapacity: 80,
    quotedCurfew: "23:00",
    avIncluded: false,
  })
  await room.submitAudit(id, {
    budgetDelta: -1000,
    capacityDelta: 20,
    violations: ["curfew"],
    counterStrategy: "s",
    draftCounterProposal: "d",
  })
  // Feedback comment and revision
  await room.recordComment(id, "client", "Please counter at 2am")
  await room.submitAudit(id, {
    budgetDelta: -1000,
    capacityDelta: 20,
    violations: [],
    counterStrategy: "counter at 02:00",
    draftCounterProposal: "draft v2",
    actedBy: "negotiator",
  })
  await room.recordApproval(id, "client")
  await room.recordVendorAcceptance(id)
  console.log("smoke ok", id)
}
