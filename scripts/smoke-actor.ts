// Live smoke test against `durable-actors dev` (http://127.0.0.1:7100). Run: bun scripts/smoke-actor.ts [roomId]
import { actors } from "../packages/actors/generated/index.js"

const room = actors.RoomActor.get(process.argv[2] ?? `smoke-${Date.now()}`)
await room.setSpecs({ eventName: "Smoke", targetDate: "2026-12-01", guestCount: 60, maxBudget: 8000, requiredCurfew: "01:00", avRequired: true })
const id = await room.injectProposal({ name: "Harbor Loft", rawText: "raw", quotedCost: 9000, quotedCapacity: 80, quotedCurfew: "23:00", avIncluded: false })
await room.submitAudit(id, { budgetDelta: -1000, capacityDelta: 20, violations: ["curfew"], counterStrategy: "s", draftCounterProposal: "d" })
await room.recordApproval(id, "client")
await room.recordVendorAcceptance(id)
console.log("smoke ok", id)
