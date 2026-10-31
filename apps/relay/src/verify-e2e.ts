import { actors } from "@dealrelay/actors"
import { DEFAULT_SPECS, VENUE_FIXTURES } from "@dealrelay/shared/fixtures"
import type { VenueProposal } from "@dealrelay/shared"

const RELAY_PORT = 7200
const RELAY_URL = `http://127.0.0.1:${RELAY_PORT}`

console.log("1. Starting relay server on port", RELAY_PORT)
const proc = Bun.spawn(["bun", "run", "apps/relay/src/server.ts"], {
  env: { ...process.env, RELAY_PORT: String(RELAY_PORT), DEMO_MODE: "fixtures" },
  stdout: "inherit",
  stderr: "inherit",
})

const serverPid = proc.pid
console.log(`Relay server started with PID: ${serverPid}`)

async function cleanup() {
  console.log(`Stopping relay server PID ${serverPid}...`)
  proc.kill()
  await proc.exited
  console.log("Relay server stopped.")
}

async function verifyVenue(venueIndex: number) {
  const venue = VENUE_FIXTURES[venueIndex]!
  const roomId = `e2e-${venueIndex}-${Date.now()}`
  console.log(`Testing venue: ${venue.name} in room ${roomId}`)

  const room = actors.RoomActor.get(roomId)
  await room.setSpecs(DEFAULT_SPECS)
  const proposalId = await room.injectProposal(venue)

  const runRes = await fetch(`${RELAY_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      proposalId,
      rawText: venue.rawText,
      specs: DEFAULT_SPECS,
    }),
  })

  if (runRes.status !== 202) {
    throw new Error(`Expected 202 from POST /run, got ${runRes.status}`)
  }

  const grant = await actors.RoomActor.prepareWebsocket({
    actorId: roomId,
    metadata: { role: "agency" },
  })

  const ws = new WebSocket(grant.websocketUrl)

  const proposal = await new Promise<VenueProposal>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error(`Timed out waiting for proposal ${proposalId} to reach REQUIRES_APPROVAL`))
    }, 10000)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string)
        let proposals: VenueProposal[] = []
        if (data.type === "state" && data.state?.proposals) {
          proposals = data.state.proposals
        } else if (data.type === "state_update" && data.changes?.proposals) {
          proposals = data.changes.proposals
        }

        const found = proposals.find((p) => p.id === proposalId)
        if (found && found.status === "REQUIRES_APPROVAL" && found.audit) {
          clearTimeout(timeout)
          ws.close()
          resolve(found)
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onerror = (err) => {
      clearTimeout(timeout)
      reject(err)
    }
  })

  console.log(`Venue ${venue.name} verified: status=${proposal.status}`)
  console.log(`Violations: ${JSON.stringify(proposal.audit?.violations)}`)
  return proposal
}

try {
  // 2. Wait for /health
  let healthy = false
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${RELAY_URL}/health`)
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; mode: string }
        if (json.ok && json.mode === "fixtures") {
          healthy = true
          break
        }
      }
    } catch {
      // wait for server to bind
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!healthy) {
    throw new Error("Relay server did not become healthy in 3s")
  }
  console.log("Relay server is healthy.")

  // Test both venue fixtures end-to-end
  const p1 = await verifyVenue(0)
  if (!p1.audit?.violations.includes("over budget")) {
    throw new Error("Grand Loft missing over budget violation")
  }

  const p2 = await verifyVenue(1)
  if (!p2.audit?.violations.includes("under capacity")) {
    throw new Error("Warehouse 9 missing under capacity violation")
  }

  console.log("Both venues verified end-to-end successfully!")
} finally {
  await cleanup()
}
