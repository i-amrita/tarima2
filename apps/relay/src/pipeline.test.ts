import { describe, expect, it, vi } from "vitest"
import type { ActivityActor, AuditResult } from "@dealrelay/shared"
import { DEFAULT_SPECS, VENUE_FIXTURES } from "@dealrelay/shared/fixtures"
import {
  isCurfewEarlier,
  parseCurfewTo24h,
  parseProposalText,
  RelayPipeline,
  type RoomClient,
} from "./pipeline.js"

function createFakeRoomClient() {
  const activities: Array<{ actor: ActivityActor; message: string }> = []
  const audits: Array<{ proposalId: string; audit: AuditResult }> = []

  const room: RoomClient = {
    appendActivity: vi.fn(async (actor: ActivityActor, message: string) => {
      activities.push({ actor, message })
    }),
    submitAudit: vi.fn(async (proposalId: string, audit: AuditResult) => {
      audits.push({ proposalId, audit })
    }),
  }

  return { room, activities, audits }
}

const instantSleep = async () => {}

describe("RelayPipeline - parsing and curfew helpers", () => {
  it("parses various curfew representations into 24h format", () => {
    expect(parseCurfewTo24h("11:00pm")).toBe("23:00")
    expect(parseCurfewTo24h("2am")).toBe("02:00")
    expect(parseCurfewTo24h("12:00am")).toBe("00:00")
    expect(parseCurfewTo24h("01:00")).toBe("01:00")
  })

  it("accurately evaluates late-night curfews", () => {
    // 23:00 (11pm) is earlier than 01:00 (1am next day)
    expect(isCurfewEarlier("23:00", "01:00")).toBe(true)
    // 02:00 (2am next day) is later than 01:00 (1am next day)
    expect(isCurfewEarlier("02:00", "01:00")).toBe(false)
  })

  it("extracts facts accurately from Grand Loft raw text", () => {
    const grandLoft = VENUE_FIXTURES.find((v) => v.name === "The Grand Loft")!
    const facts = parseProposalText(grandLoft.rawText)
    expect(facts.cost).toBe(26000)
    expect(facts.capacity).toBe(550)
    expect(facts.curfew).toBe("00:00")
    expect(facts.avIncluded).toBe(true)
  })

  it("extracts facts accurately from Warehouse 9 raw text", () => {
    const warehouse9 = VENUE_FIXTURES.find((v) => v.name === "Warehouse 9")!
    const facts = parseProposalText(warehouse9.rawText)
    expect(facts.cost).toBe(34000)
    expect(facts.capacity).toBe(600)
    expect(facts.curfew).toBe("03:00")
    expect(facts.avIncluded).toBe(true)
  })
})

describe("RelayPipeline - Grand Loft run", () => {
  it("audits Grand Loft with expected violations, deltas, and activity order", async () => {
    const { room, activities, audits } = createFakeRoomClient()
    const pipeline = new RelayPipeline({ room, mode: "fixtures", sleep: instantSleep })
    const grandLoft = VENUE_FIXTURES.find((v) => v.name === "The Grand Loft")!

    await pipeline.runProposal("p1", grandLoft.rawText, DEFAULT_SPECS)

    // submitAudit called exactly once
    expect(room.submitAudit).toHaveBeenCalledTimes(1)
    expect(audits).toHaveLength(1)

    const audit = audits[0]!.audit
    expect(audits[0]!.proposalId).toBe("p1")

    // Deltas: maxBudget 30000 - quoted 26000 = 4000; cap 550 - 500 = 50
    expect(audit.budgetDelta).toBe(4000)
    expect(audit.capacityDelta).toBe(50)

    // Grand Loft violations: curfew only (midnight vs 2 AM)
    expect(audit.violations).toEqual(["curfew earlier than required"])
    expect(audit.violations).not.toContain("over budget")
    expect(audit.violations).not.toContain("under capacity")
    expect(audit.violations).not.toContain("AV missing when required")

    // Counter proposal derived from violations
    expect(audit.counterStrategy).toMatch(/curfew/i)
    expect(audit.draftCounterProposal).toMatch(/02:00/)

    // Activity events order: scout -> finance -> negotiator
    const actors = activities.map((a) => a.actor)
    const scoutIndices = actors.map((a, i) => (a === "scout" ? i : -1)).filter((i) => i !== -1)
    const financeIndices = actors.map((a, i) => (a === "finance" ? i : -1)).filter((i) => i !== -1)
    const negotiatorIndices = actors.map((a, i) => (a === "negotiator" ? i : -1)).filter((i) => i !== -1)

    expect(scoutIndices.length).toBeGreaterThan(0)
    expect(financeIndices.length).toBeGreaterThan(0)
    expect(negotiatorIndices.length).toBeGreaterThan(0)

    const lastScout = Math.max(...scoutIndices)
    const firstFinance = Math.min(...financeIndices)
    const lastFinance = Math.max(...financeIndices)
    const firstNegotiator = Math.min(...negotiatorIndices)

    expect(lastScout).toBeLessThan(firstFinance)
    expect(lastFinance).toBeLessThan(firstNegotiator)
  })
})

describe("RelayPipeline - Warehouse 9 run", () => {
  it("audits Warehouse 9 with expected violations, deltas, and activity order", async () => {
    const { room, activities, audits } = createFakeRoomClient()
    const pipeline = new RelayPipeline({ room, mode: "fixtures", sleep: instantSleep })
    const warehouse9 = VENUE_FIXTURES.find((v) => v.name === "Warehouse 9")!

    await pipeline.runProposal("p2", warehouse9.rawText, DEFAULT_SPECS)

    // submitAudit called exactly once
    expect(room.submitAudit).toHaveBeenCalledTimes(1)
    expect(audits).toHaveLength(1)

    const audit = audits[0]!.audit
    expect(audits[0]!.proposalId).toBe("p2")

    // Deltas: maxBudget 30000 - quoted 34000 = -4000; cap 600 - 500 = 100
    expect(audit.budgetDelta).toBe(-4000)
    expect(audit.capacityDelta).toBe(100)

    // Warehouse 9 violations: over budget only
    expect(audit.violations).toEqual(["over budget"])

    // Activity events order: scout -> finance -> negotiator
    const actors = activities.map((a) => a.actor)
    const scoutIndices = actors.map((a, i) => (a === "scout" ? i : -1)).filter((i) => i !== -1)
    const financeIndices = actors.map((a, i) => (a === "finance" ? i : -1)).filter((i) => i !== -1)
    const negotiatorIndices = actors.map((a, i) => (a === "negotiator" ? i : -1)).filter((i) => i !== -1)

    const lastScout = Math.max(...scoutIndices)
    const firstFinance = Math.min(...financeIndices)
    const lastFinance = Math.max(...financeIndices)
    const firstNegotiator = Math.min(...negotiatorIndices)

    expect(lastScout).toBeLessThan(firstFinance)
    expect(lastFinance).toBeLessThan(firstNegotiator)
  })
})

describe("RelayPipeline - Live mode stub", () => {
  it("throws clear error when DEMO_MODE=live", async () => {
    const { room } = createFakeRoomClient()
    const pipeline = new RelayPipeline({ room, mode: "live", sleep: instantSleep })
    await expect(pipeline.runProposal("p1", "some text", DEFAULT_SPECS)).rejects.toThrow(
      "DEMO_MODE=live not implemented yet",
    )
  })
})
