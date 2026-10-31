import { describe, expect, it } from "vitest"
import type { AuditResult, NewVenueProposal } from "@dealrelay/shared"
import { addProposal, applyApproval, applyAudit, applyVendorAcceptance, pushActivity } from "./transitions.js"

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

describe("proposal transitions", () => {
  it("walks inject -> audit -> approval -> acceptance without mutating input", () => {
    const start = addProposal([], "p1", input)
    expect(start[0]?.status).toBe("PENDING_AUDIT")
    const audited = applyAudit(start, "p1", audit)
    expect(audited[0]?.status).toBe("REQUIRES_APPROVAL")
    expect(audited[0]?.actedBy).toBe("negotiator")
    expect(start[0]?.status).toBe("PENDING_AUDIT")
    const approved = applyApproval(audited, "p1", "client")
    expect(approved[0]).toMatchObject({ status: "COUNTER_PROPOSED", approvedBy: "client" })
    expect(applyVendorAcceptance(approved, "p1")[0]?.status).toBe("ACCEPTED")
  })

  it("rejects out-of-order transitions and unknown ids", () => {
    const start = addProposal([], "p1", input)
    expect(() => applyApproval(start, "p1", "client")).toThrow(/expected REQUIRES_APPROVAL/)
    expect(() => applyAudit(start, "nope", audit)).toThrow(/unknown proposal/)
  })

  it("caps the activity log", () => {
    let log: ReturnType<typeof pushActivity> = []
    for (let i = 0; i < 250; i++) log = pushActivity(log, { id: `a${i}`, at: i, actor: "system", message: "m" })
    expect(log).toHaveLength(200)
    expect(log[0]?.id).toBe("a50")
  })
})
