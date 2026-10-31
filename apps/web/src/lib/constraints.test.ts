import { describe, expect, it } from "vitest"
import { evaluateConstraints, isCurfewViolated } from "./constraints"
import type { EventSpecs, VenueProposal } from "@dealrelay/shared"

const mockSpecs: EventSpecs = {
  eventName: "Launch Event",
  targetDate: "2026-12-12",
  guestCount: 120,
  maxBudget: 18000,
  requiredCurfew: "01:00",
  avRequired: true,
}

describe("isCurfewViolated", () => {
  it("detects 23:00 as earlier than 01:00 (violation)", () => {
    expect(isCurfewViolated("23:00", "01:00")).toBe(true)
  })

  it("detects 02:00 as later than 01:00 (no violation)", () => {
    expect(isCurfewViolated("02:00", "01:00")).toBe(false)
  })

  it("handles same time as no violation", () => {
    expect(isCurfewViolated("01:00", "01:00")).toBe(false)
  })
})

describe("evaluateConstraints", () => {
  it("returns pending status when specs is null", () => {
    const proposal: VenueProposal = {
      id: "p1",
      name: "Grand Loft",
      rawText: "raw",
      quotedCost: 21500,
      quotedCapacity: 150,
      quotedCurfew: "23:00",
      avIncluded: true,
      status: "PENDING_AUDIT",
    }

    const evaluated = evaluateConstraints(null, proposal)
    expect(evaluated.every((c) => c.status === "pending")).toBe(true)
  })

  it("flags budget and curfew violations for Grand Loft", () => {
    const proposal: VenueProposal = {
      id: "p1",
      name: "Grand Loft",
      rawText: "raw",
      quotedCost: 21500,
      quotedCapacity: 150,
      quotedCurfew: "23:00",
      avIncluded: true,
      status: "COUNTER_PROPOSED",
      audit: {
        budgetDelta: -3500,
        capacityDelta: 30,
        violations: ["budget", "curfew"],
        counterStrategy: "Offer 18000 with midnight curfew",
        draftCounterProposal: "We counter at 18000 with 00:00 curfew",
      },
    }

    const evaluated = evaluateConstraints(mockSpecs, proposal)
    const budget = evaluated.find((c) => c.id === "budget")
    const capacity = evaluated.find((c) => c.id === "capacity")
    const curfew = evaluated.find((c) => c.id === "curfew")
    const av = evaluated.find((c) => c.id === "av")

    expect(budget?.status).toBe("violated")
    expect(curfew?.status).toBe("violated")
    expect(capacity?.status).toBe("met")
    expect(av?.status).toBe("met")
  })

  it("shows violated status for audited violations even while awaiting approval", () => {
    const proposal: VenueProposal = {
      id: "p1",
      name: "Grand Loft",
      rawText: "raw",
      quotedCost: 21500,
      quotedCapacity: 150,
      quotedCurfew: "23:00",
      avIncluded: true,
      status: "REQUIRES_APPROVAL",
      audit: {
        budgetDelta: -3500,
        capacityDelta: 30,
        violations: ["budget", "curfew"],
        counterStrategy: "Counter with $18,000",
        draftCounterProposal: "Counter offer drafted",
      },
    }

    const evaluated = evaluateConstraints(mockSpecs, proposal)
    const budget = evaluated.find((c) => c.id === "budget")
    const curfew = evaluated.find((c) => c.id === "curfew")

    expect(budget?.status).toBe("violated")
    expect(curfew?.status).toBe("violated")
  })
})
