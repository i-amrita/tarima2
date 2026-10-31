import { describe, expect, it } from "vitest"
import { DEFAULT_SPECS, VENUE_FIXTURES } from "@dealrelay/shared/fixtures"
import { FixtureModelClient } from "./llm/fixture.js"
import { createModelClient } from "./llm/index.js"

describe("ModelClient - Fixture path and attribution", () => {
  it("factory returns FixtureModelClient when mode is fixtures", () => {
    const client = createModelClient("fixtures")
    expect(client).toBeInstanceOf(FixtureModelClient)
  })

  it("extractFacts returns exact fixture facts and zero-latency attribution", async () => {
    const client = new FixtureModelClient()
    const grandLoft = VENUE_FIXTURES.find((v) => v.name === "The Grand Loft")!
    const result = await client.extractFacts(grandLoft.rawText)

    expect(result.facts.cost).toBe(26000)
    expect(result.facts.capacity).toBe(550)
    expect(result.facts.curfew).toBe("00:00")
    expect(result.facts.avIncluded).toBe(true)

    expect(result.attribution.model).toBe("fixture")
    expect(result.attribution.latencyMs).toBe(0)
    expect(result.attribution.fallbackUsed).toBe(false)
  })

  it("draftCounter returns deterministic negotiation strategy and proposal", async () => {
    const client = new FixtureModelClient()
    const facts = { cost: 26000, capacity: 550, curfew: "00:00", avIncluded: true }
    const violations = ["curfew earlier than required"]

    const counter = await client.draftCounter(violations, DEFAULT_SPECS, facts)
    expect(counter.counterStrategy).toContain("request curfew extension to 02:00")
    expect(counter.draftCounterProposal).toContain("extend curfew to 02:00")
    expect(counter.attribution.model).toBe("fixture")
    expect(counter.attribution.latencyMs).toBe(0)
  })
})
