import { describe, expect, it } from "vitest"
import type { AuditResult, NewVenueProposal, Role, RoomOutgoing, VenueProposal } from "@dealrelay/shared"
import {
  addProposal,
  applyApproval,
  applyAudit,
  applyComment,
  applyReject,
  applyRevision,
  applyVendorAcceptance,
  handleIncomingMessage,
  pushActivity,
} from "./transitions.js"

const input: NewVenueProposal = {
  name: "Harbor Loft",
  rawText: "raw",
  quotedCost: 9000,
  quotedCapacity: 80,
  quotedCurfew: "23:00",
  avIncluded: false,
}

const audit: AuditResult = {
  budgetDelta: -1000,
  capacityDelta: 20,
  violations: ["curfew"],
  counterStrategy: "ask for 01:00",
  draftCounterProposal: "draft",
}

const revisedAudit: AuditResult = {
  budgetDelta: 0,
  capacityDelta: 20,
  violations: [],
  counterStrategy: "extend curfew to 02:00 per client request",
  draftCounterProposal: "draft counter rev 1",
  actedBy: "negotiator",
}

describe("proposal transitions", () => {
  it("walks inject -> audit -> approval -> acceptance without mutating input", () => {
    const start = addProposal([], "p1", input)
    expect(start[0]?.status).toBe("PENDING_AUDIT")
    expect(start[0]?.revision).toBe(0)
    expect(start[0]?.feedback).toEqual([])

    const audited = applyAudit(start, "p1", audit)
    expect(audited[0]?.status).toBe("REQUIRES_APPROVAL")
    expect(audited[0]?.actedBy).toBe("negotiator")
    expect(audited[0]?.revision).toBe(0)

    const approved = applyApproval(audited, "p1", "client")
    expect(approved[0]).toMatchObject({ status: "COUNTER_PROPOSED", approvedBy: "client" })
    expect(applyVendorAcceptance(approved, "p1")[0]?.status).toBe("ACCEPTED")
  })

  it("handles comment -> REVISING -> REQUIRES_APPROVAL with revision incremented", () => {
    const start = addProposal([], "p1", input)
    const audited = applyAudit(start, "p1", audit)
    expect(audited[0]?.status).toBe("REQUIRES_APPROVAL")
    expect(audited[0]?.revision).toBe(0)

    // Agency or client comments
    const commented = applyComment(audited, "p1", "client", "Please extend curfew to 2am", "f1")
    expect(commented[0]?.status).toBe("REVISING")
    expect(commented[0]?.feedback).toHaveLength(1)
    expect(commented[0]?.feedback?.[0]).toEqual({
      id: "f1",
      at: expect.any(Number),
      by: "client",
      kind: "comment",
      text: "Please extend curfew to 2am",
    })

    // Negotiator redrafts revision 1
    const revised = applyRevision(commented, "p1", revisedAudit)
    expect(revised[0]?.status).toBe("REQUIRES_APPROVAL")
    expect(revised[0]?.revision).toBe(1)
    expect(revised[0]?.actedBy).toBe("negotiator")
    expect(revised[0]?.audit?.draftCounterProposal).toBe("draft counter rev 1")

    // Second comment and revision (revision 2)
    const secondComment = applyComment(revised, "p1", "agency", "Double check budget numbers", "f2")
    expect(secondComment[0]?.status).toBe("REVISING")
    expect(secondComment[0]?.feedback).toHaveLength(2)

    const secondRevision = applyAudit(secondComment, "p1", { ...revisedAudit, counterStrategy: "rev 2" })
    expect(secondRevision[0]?.status).toBe("REQUIRES_APPROVAL")
    expect(secondRevision[0]?.revision).toBe(2)
  })

  it("enforces reject as a terminal state", () => {
    const start = addProposal([], "p1", input)
    const audited = applyAudit(start, "p1", audit)

    // Client rejects proposal with optional reason
    const rejected = applyReject(audited, "p1", "client", "Too expensive and outside preferred area", "f-rej")
    expect(rejected[0]?.status).toBe("REJECTED")
    expect(rejected[0]?.feedback?.[0]).toMatchObject({
      id: "f-rej",
      by: "client",
      kind: "reject",
      text: "Too expensive and outside preferred area",
    })

    // Rejection without reason keeps feedback intact
    const rejectedNoReason = applyReject(audited, "p1", "client")
    expect(rejectedNoReason[0]?.status).toBe("REJECTED")

    // Terminal state blocks further transitions
    expect(() => applyApproval(rejected, "p1", "client")).toThrow(/expected REQUIRES_APPROVAL/)
    expect(() => applyComment(rejected, "p1", "client", "Can we reconsider?")).toThrow(/cannot comment/)
    expect(() => applyReject(rejected, "p1", "client")).toThrow(/already REJECTED/)
    expect(() => applyVendorAcceptance(rejected, "p1")).toThrow(/expected COUNTER_PROPOSED/)
  })

  it("blocks transitions on accepted proposals", () => {
    const start = addProposal([], "p1", input)
    const audited = applyAudit(start, "p1", audit)
    const approved = applyApproval(audited, "p1", "client")
    const accepted = applyVendorAcceptance(approved, "p1")

    expect(() => applyComment(accepted, "p1", "client", "new comment")).toThrow(/cannot comment/)
    expect(() => applyReject(accepted, "p1", "client")).toThrow(/cannot reject/)
  })

  it("rejects out-of-order transitions and unknown ids", () => {
    const start = addProposal([], "p1", input)
    expect(() => applyApproval(start, "p1", "client")).toThrow(/expected REQUIRES_APPROVAL/)
    expect(() => applyRevision(start, "p1", revisedAudit)).toThrow(/expected REVISING/)
    expect(() => applyAudit(start, "nope", audit)).toThrow(/unknown proposal/)
  })

  it("caps the activity log", () => {
    let log: ReturnType<typeof pushActivity> = []
    for (let i = 0; i < 250; i++) log = pushActivity(log, { id: `a${i}`, at: i, actor: "system", message: "m" })
    expect(log).toHaveLength(200)
    expect(log[0]?.id).toBe("a50")
  })
})

describe("handleIncomingMessage role gating", () => {
  function createTestHost() {
    let proposals: VenueProposal[] = [
      {
        id: "p1",
        name: "Grand Loft",
        rawText: "raw",
        quotedCost: 20000,
        quotedCapacity: 100,
        quotedCurfew: "23:00",
        avIncluded: true,
        status: "REQUIRES_APPROVAL",
        revision: 0,
        feedback: [],
      },
    ]
    const broadcastEvents: RoomOutgoing[] = []
    const notified: Array<{ roomId: string; proposalId: string }> = []

    const host = {
      id: "room-test",
      get proposals() {
        return proposals
      },
      broadcast(message: RoomOutgoing) {
        broadcastEvents.push(message)
      },
      async recordApproval(proposalId: string, role: Role) {
        proposals = applyApproval(proposals, proposalId, role)
      },
      async recordReject(proposalId: string, role: Role, reason?: string) {
        proposals = applyReject(proposals, proposalId, role, reason)
      },
      async recordComment(proposalId: string, role: Role, text: string) {
        proposals = applyComment(proposals, proposalId, role, text)
      },
      async notifyRelay(roomId: string, proposalId: string) {
        notified.push({ roomId, proposalId })
      },
      broadcastEvents,
      notified,
    }

    return host
  }

  it("role-gates approve to client only", async () => {
    const host = createTestHost()
    const agencyToasts: RoomOutgoing[] = []
    const agencySocket = {
      metadata: { role: "agency" as const },
      send: (m: RoomOutgoing) => agencyToasts.push(m),
    }

    await handleIncomingMessage(host, agencySocket, { type: "approve", proposalId: "p1" })
    expect(agencyToasts).toEqual([{ type: "toast", message: "Only the client can approve" }])
    expect(host.proposals[0]?.status).toBe("REQUIRES_APPROVAL")

    const clientToasts: RoomOutgoing[] = []
    const clientSocket = {
      metadata: { role: "client" as const },
      send: (m: RoomOutgoing) => clientToasts.push(m),
    }

    await handleIncomingMessage(host, clientSocket, { type: "approve", proposalId: "p1" })
    expect(host.proposals[0]?.status).toBe("COUNTER_PROPOSED")
    expect(host.broadcastEvents).toContainEqual({
      type: "toast",
      message: "Client approved p1",
    })
  })

  it("role-gates reject to client only", async () => {
    const host = createTestHost()
    const agencyToasts: RoomOutgoing[] = []
    const agencySocket = {
      metadata: { role: "agency" as const },
      send: (m: RoomOutgoing) => agencyToasts.push(m),
    }

    await handleIncomingMessage(host, agencySocket, { type: "reject", proposalId: "p1", reason: "not interested" })
    expect(agencyToasts).toEqual([{ type: "toast", message: "Only the client can reject" }])
    expect(host.proposals[0]?.status).toBe("REQUIRES_APPROVAL")

    const clientToasts: RoomOutgoing[] = []
    const clientSocket = {
      metadata: { role: "client" as const },
      send: (m: RoomOutgoing) => clientToasts.push(m),
    }

    await handleIncomingMessage(host, clientSocket, { type: "reject", proposalId: "p1", reason: "budget exceeded" })
    expect(host.proposals[0]?.status).toBe("REJECTED")
    expect(host.broadcastEvents).toContainEqual({
      type: "toast",
      message: "Client rejected p1",
    })
    expect(host.proposals[0]?.feedback?.[0]?.text).toBe("budget exceeded")
  })

  it("allows both client and agency to comment and flips status to REVISING", async () => {
    const host = createTestHost()
    const clientSocket = {
      metadata: { role: "client" as const },
      send: () => {},
    }

    await handleIncomingMessage(host, clientSocket, { type: "comment", proposalId: "p1", text: "Ask for 2am curfew" })
    expect(host.proposals[0]?.status).toBe("REVISING")
    expect(host.proposals[0]?.feedback).toHaveLength(1)
    expect(host.broadcastEvents).toContainEqual({
      type: "toast",
      message: "Client commented on p1",
    })
    expect(host.notified).toContainEqual({ roomId: "room-test", proposalId: "p1" })

    const agencySocket = {
      metadata: { role: "agency" as const },
      send: () => {},
    }
    await handleIncomingMessage(host, agencySocket, { type: "comment", proposalId: "p1", text: "Agency note: good venue" })
    expect(host.proposals[0]?.feedback).toHaveLength(2)
    expect(host.broadcastEvents).toContainEqual({
      type: "toast",
      message: "Agency commented on p1",
    })
  })
})
