import { describe, expect, it, vi } from "vitest"
import type { ActivityActor, AgentAttribution, AuditResult, ProposalFeedback } from "@dealrelay/shared"
import { DEFAULT_SPECS, VENUE_FIXTURES } from "@dealrelay/shared/fixtures"
import {
  generateRevisionRules,
  isCurfewEarlier,
  parseCurfewTo24h,
  parseProposalText,
  RelayPipeline,
  type RoomClient,
} from "./pipeline.js"

function createFakeRoomClient() {
  const activities: Array<{
    actor: ActivityActor
    message: string
    attribution?: AgentAttribution
    actedBy?: ActivityActor
  }> = []
  const audits: Array<{ proposalId: string; audit: AuditResult }> = []

  const room: RoomClient = {
    appendActivity: vi.fn(
      async (
        actor: ActivityActor,
        message: string,
        attribution?: AgentAttribution,
        actedBy?: ActivityActor,
      ) => {
        activities.push({ actor, message, attribution, actedBy })
      },
    ),
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
    expect(audit.actedBy).toBe("negotiator")

    // Activity events order: scout -> finance -> negotiator
    const actors = activities.map((a) => a.actor)
    const scoutIndices = actors.map((a, i) => (a === "scout" ? i : -1)).filter((i) => i !== -1)
    const financeIndices = actors.map((a, i) => (a === "finance" ? i : -1)).filter((i) => i !== -1)
    const negotiatorIndices = actors.map((a, i) => (a === "negotiator" ? i : -1)).filter((i) => i !== -1)

    expect(scoutIndices.length).toBeGreaterThan(0)
    expect(financeIndices.length).toBeGreaterThan(0)
    expect(negotiatorIndices.length).toBeGreaterThan(0)

    // Verify attribution and actedBy on every activity
    for (const act of activities) {
      expect(act.actedBy).toBe(act.actor)
      expect(act.attribution).toBeDefined()
      expect(act.attribution?.agent).toBe(act.actor)
      expect(act.attribution?.verb).toBeDefined()
      expect(act.attribution?.model).toBeDefined()
    }

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

describe("RelayPipeline - Live mode execution", () => {
  it("executes successfully in live mode with ModelClient", async () => {
    const { room, activities, audits } = createFakeRoomClient()
    const mockModelClient = {
      extractFacts: vi.fn(async () => ({
        facts: { cost: 26000, capacity: 550, curfew: "00:00", avIncluded: true },
        attribution: { model: "mock-model", latencyMs: 100, tokens: { total: 150 }, fallbackUsed: false },
      })),
      draftCounter: vi.fn(async () => ({
        counterStrategy: "Counter with curfew extension",
        draftCounterProposal: "Please extend curfew to 02:00",
        attribution: { model: "mock-model", latencyMs: 120, tokens: { total: 200 }, fallbackUsed: false },
      })),
      draftRevision: vi.fn(async () => ({
        counterStrategy: "Revised counter strategy",
        draftCounterProposal: "Revised counter proposal",
        attribution: { model: "mock-model", latencyMs: 120, tokens: { total: 200 }, fallbackUsed: false },
      })),
    }

    const pipeline = new RelayPipeline({
      room,
      mode: "live",
      modelClient: mockModelClient,
      sleep: instantSleep,
    })

    await pipeline.runProposal("p1", "Proposal text", DEFAULT_SPECS)
    expect(mockModelClient.extractFacts).toHaveBeenCalledTimes(1)
    expect(mockModelClient.draftCounter).toHaveBeenCalledTimes(1)
    expect(audits).toHaveLength(1)
    expect(activities.length).toBeGreaterThan(0)
  })

  it("coordinates steps through Agent Relay when coordinator is provided", async () => {
    const { room, activities } = createFakeRoomClient()
    const mockCoordinator = {
      isReady: vi.fn(() => true),
      postAsScout: vi.fn(async () => {}),
      readAsFinance: vi.fn(async () => "Scout posted facts"),
      postAsFinance: vi.fn(async () => {}),
      readAsNegotiator: vi.fn(async () => "Finance posted audit"),
      postAsNegotiator: vi.fn(async () => {}),
      mirrorActivity: vi.fn(async (_room: RoomClient, actor: ActivityActor, message: string) => {
        activities.push({ actor, message })
      }),
    }

    const pipeline = new RelayPipeline({
      room,
      mode: "fixtures",
      coordinator: mockCoordinator as unknown as import("./relay.js").RelayCoordinator,
      sleep: instantSleep,
    })

    const grandLoft = VENUE_FIXTURES.find((v) => v.name === "The Grand Loft")!
    await pipeline.runProposal("p1", grandLoft.rawText, DEFAULT_SPECS)

    expect(mockCoordinator.postAsScout).toHaveBeenCalled()
    expect(mockCoordinator.readAsFinance).toHaveBeenCalled()
    expect(mockCoordinator.postAsFinance).toHaveBeenCalled()
    expect(mockCoordinator.readAsNegotiator).toHaveBeenCalled()
    expect(mockCoordinator.postAsNegotiator).toHaveBeenCalled()
    expect(mockCoordinator.mirrorActivity).toHaveBeenCalled()
    expect(activities.length).toBeGreaterThan(0)
  })
})

describe("RelayPipeline - feedback rules and revision redrafts", () => {
  const facts = { cost: 26000, capacity: 550, curfew: "00:00", avIncluded: true }

  it("handles budget / cheaper keywords with explicit numbers", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Please counter with budget of $25,000" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.budget).toBe(25000)
    expect(rev.updatedSpecs.maxBudget).toBe(25000)
    expect(rev.counterStrategy).toContain("Counter at revised budget of $25,000")
    expect(rev.draftCounterProposal).toContain("revise total cost to $25,000")
  })

  it("handles cheaper keyword with percentage discount when no amount specified", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Can you make it cheaper?" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.budget).toBe(23400) // 26000 * 0.9
    expect(rev.counterStrategy).toContain("Counter at revised budget of $23,400")
  })

  it("handles curfew and 2am keywords", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Curfew must be 2am for afterparty" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.curfew).toBe("02:00")
    expect(rev.updatedSpecs.requiredCurfew).toBe("02:00")
    expect(rev.counterStrategy).toContain("request curfew extension to 02:00")
    expect(rev.draftCounterProposal).toContain("extend curfew to 02:00")
  })

  it("handles AV keyword", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Need full AV package included" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.avRequired).toBe(true)
    expect(rev.counterStrategy).toContain("bundle complimentary AV package")
    expect(rev.draftCounterProposal).toContain("include standard AV package")
  })

  it("handles capacity keyword with guest numbers", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Ensure capacity for 600 guests" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.capacity).toBe(600)
    expect(rev.updatedSpecs.guestCount).toBe(600)
    expect(rev.counterStrategy).toContain("request layout adjustment for 600 guests")
  })

  it("provides polite generic revision for arbitrary feedback", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Can we request custom catering permissions?" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers).toEqual({})
    expect(rev.counterStrategy).toContain("Request revised terms incorporating client feedback")
    expect(rev.draftCounterProposal).toContain("addressing our client feedback: \"Can we request custom catering permissions?\"")
  })

  it("combines multiple keywords seamlessly", () => {
    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 1, by: "client", kind: "comment", text: "Budget $24k and curfew until 2am" },
    ]
    const rev = generateRevisionRules(feedback, DEFAULT_SPECS, facts)
    expect(rev.changedNumbers.budget).toBe(24000)
    expect(rev.changedNumbers.curfew).toBe("02:00")
    expect(rev.counterStrategy).toContain("Counter at revised budget of $24,000, and request curfew extension to 02:00")
  })
})

describe("RelayPipeline - runRevision execution", () => {
  it("deliberates revision, triggers scout/finance re-checks on number changes, and submits revision audit", async () => {
    const { room, activities, audits } = createFakeRoomClient()
    const pipeline = new RelayPipeline({ room, mode: "fixtures", sleep: instantSleep })
    const grandLoft = VENUE_FIXTURES.find((v) => v.name === "The Grand Loft")!

    const feedback: ProposalFeedback[] = [
      { id: "f1", at: 100, by: "client", kind: "comment", text: "Budget must be $25000 and 2am curfew" },
    ]

    await pipeline.runRevision("p1", grandLoft.rawText, DEFAULT_SPECS, feedback, undefined, 0)

    expect(room.submitAudit).toHaveBeenCalledTimes(1)
    expect(audits).toHaveLength(1)
    const audit = audits[0]!.audit
    expect(audit.actedBy).toBe("negotiator")
    expect(audit.counterStrategy).toContain("Counter at revised budget of $25,000")

    // Scout and Finance were triggered because numbers changed
    const scoutActivities = activities.filter((a) => a.actor === "scout")
    const financeActivities = activities.filter((a) => a.actor === "finance")
    const negotiatorActivities = activities.filter((a) => a.actor === "negotiator")

    expect(scoutActivities.length).toBeGreaterThan(0)
    expect(financeActivities.length).toBeGreaterThan(0)
    expect(negotiatorActivities.length).toBeGreaterThan(0)

    // Finance re-calculated budget delta against new budget $25000: 25000 - 26000 = -1000 (over budget)
    expect(audit.budgetDelta).toBe(-1000)
    expect(audit.violations).toContain("over budget")
  })
})
