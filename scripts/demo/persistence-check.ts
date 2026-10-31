// Writes room state, kills and relaunches the actor server, then asserts the state survived.
// Needs the actor server running on :7100. Run: bun scripts/demo/persistence-check.ts
import { actors } from "../../packages/actors/generated/index.js"

const roomId = `persist-${Date.now()}`
const room = actors.RoomActor.get(roomId)
const id = await room.injectProposal({ name: "Harbor Loft", rawText: "raw", quotedCost: 9000, quotedCapacity: 80, quotedCurfew: "23:00", avIncluded: false })

const restart = Bun.spawn(["bash", `${import.meta.dir}/restart-actor.sh`], { stdout: "inherit", stderr: "inherit" })
if ((await restart.exited) !== 0) throw new Error("restart failed")

await room.submitAudit(id, { budgetDelta: 0, capacityDelta: 0, violations: [], counterStrategy: "s", draftCounterProposal: "d" })
const res = await fetch(`http://127.0.0.1:7100/v1/projects/local/observe/state?actorName=RoomActor&actorId=${roomId}`)
const text = await res.text()
if (!text.includes(id) || !text.includes("REQUIRES_APPROVAL")) throw new Error(`state lost after restart: ${text.slice(0, 200)}`)
console.log("persistence ok:", id, "survived restart and accepted a new transition")
