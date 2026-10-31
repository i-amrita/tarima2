import type { ActivityActor, AgentAttribution, AuditResult, EventSpecs } from "@dealrelay/shared"
import { createModelClient, type ModelClient } from "./llm/index.js"
import type { RelayCoordinator } from "./relay.js"

export type RoomClient = {
  appendActivity(
    actor: ActivityActor,
    message: string,
    attribution?: AgentAttribution,
    actedBy?: ActivityActor,
  ): Promise<void>
  submitAudit(proposalId: string, audit: AuditResult): Promise<void>
}

export type RelayPipelineOptions = {
  room: RoomClient
  mode: "fixtures" | "live"
  modelClient?: ModelClient
  coordinator?: RelayCoordinator | null
  sleep?: (ms: number) => Promise<void>
}

export type ParsedFacts = {
  cost: number
  capacity: number
  curfew: string
  avIncluded: boolean
}

export function parseCurfewTo24h(timeStr: string): string {
  const trimmed = timeStr.trim().toLowerCase()
  const isPm = trimmed.includes("pm")
  const isAm = trimmed.includes("am")
  const timeOnly = trimmed.replace(/[ap]m/, "").trim()
  const [hStr = "0", mStr = "00"] = timeOnly.split(":")
  let hours = parseInt(hStr, 10)
  const minutes = parseInt(mStr, 10)
  if (isPm && hours < 12) {
    hours += 12
  }
  if (isAm && hours === 12) {
    hours = 0
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function parseAvIncluded(rawText: string): boolean {
  if (/av\s+is\s+not\s+included/i.test(rawText) || /av[^.]*not\s+included/i.test(rawText)) {
    return false
  }
  if (/av[^.]*included/i.test(rawText)) {
    return true
  }
  return false
}

export function parseProposalText(rawText: string): ParsedFacts {
  // Cost: first dollar amount, e.g. "$21,500" -> 21500
  const costMatch = rawText.match(/\$([0-9,]+)/)
  const cost = costMatch && costMatch[1] ? parseInt(costMatch[1].replace(/,/g, ""), 10) : 0

  // Capacity: match "Capacity 150" or "fit 110 guests"
  const capMatch = rawText.match(/(?:capacity|fit)\s*(\d+)/i)
  const capacity = capMatch && capMatch[1] ? parseInt(capMatch[1], 10) : 0

  // Curfew: match "end by 11:00pm" or "until 2am"
  const curfewMatch = rawText.match(/(?:end by|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  const curfew = curfewMatch && curfewMatch[1] ? parseCurfewTo24h(curfewMatch[1]) : "00:00"

  // AV package status
  const avIncluded = parseAvIncluded(rawText)

  return { cost, capacity, curfew, avIncluded }
}

export function curfewToMinutes(timeStr: string): number {
  const [hStr = "0", mStr = "00"] = timeStr.split(":")
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  // For evening/night events: post-midnight hours (00:00 - 11:59) represent the next day
  if (h < 12) {
    h += 24
  }
  return h * 60 + m
}

export function isCurfewEarlier(quotedCurfew: string, requiredCurfew: string): boolean {
  return curfewToMinutes(quotedCurfew) < curfewToMinutes(requiredCurfew)
}

export function generateNegotiation(
  violations: string[],
  specs: EventSpecs,
  _facts: ParsedFacts,
): {
  counterStrategy: string
  draftCounterProposal: string
} {
  const strategyParts: string[] = []
  const draftParts: string[] = []

  if (violations.includes("over budget")) {
    strategyParts.push(`Counter at max budget of $${specs.maxBudget.toLocaleString()}`)
    draftParts.push(`revise total cost to $${specs.maxBudget.toLocaleString()}`)
  }
  if (violations.includes("curfew earlier than required")) {
    strategyParts.push(`request curfew extension to ${specs.requiredCurfew}`)
    draftParts.push(`extend curfew to ${specs.requiredCurfew}`)
  }
  if (violations.includes("under capacity")) {
    strategyParts.push(`request layout adjustment for ${specs.guestCount} guests`)
    draftParts.push(`reconfigure space to accommodate ${specs.guestCount} guests`)
  }
  if (violations.includes("AV missing when required")) {
    strategyParts.push("bundle complimentary AV package")
    draftParts.push("include standard AV package in quoted price")
  }

  if (strategyParts.length === 0) {
    return {
      counterStrategy: "Accept proposal as quoted within all event specifications",
      draftCounterProposal: "We are pleased to accept your proposal as submitted.",
    }
  }

  const counterStrategy = strategyParts.join(", and ")
  const draftCounterProposal = `We propose to proceed if you can ${draftParts.join(", and ")}.`

  return {
    counterStrategy,
    draftCounterProposal,
  }
}

export class RelayPipeline {
  private room: RoomClient
  private mode: "fixtures" | "live"
  private modelClient: ModelClient
  private coordinator: RelayCoordinator | null
  private sleep: (ms: number) => Promise<void>

  constructor(options: RelayPipelineOptions) {
    this.room = options.room
    this.mode = options.mode
    this.modelClient = options.modelClient ?? createModelClient(options.mode)
    this.coordinator = options.coordinator ?? null
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  private async emitActivity(
    actor: ActivityActor,
    message: string,
    attribution?: AgentAttribution,
    actedBy?: ActivityActor,
  ): Promise<void> {
    if (this.coordinator?.isReady()) {
      if (actor === "scout") await this.coordinator.postAsScout(message)
      else if (actor === "finance") await this.coordinator.postAsFinance(message)
      else if (actor === "negotiator") await this.coordinator.postAsNegotiator(message)

      await this.coordinator.mirrorActivity(this.room, actor, message, attribution, actedBy)
    } else {
      await this.room.appendActivity(actor, message, attribution, actedBy)
    }
  }

  async runProposal(proposalId: string, rawText: string, specs: EventSpecs): Promise<void> {
    const viaRelay = Boolean(this.coordinator?.isReady())

    // 1. Scout step
    await this.emitActivity(
      "scout",
      "Scanning inbound proposal text and extracting venue specifications...",
      { agent: "scout", verb: "scan", model: this.mode === "fixtures" ? "fixture" : "live", latencyMs: 0, viaRelay },
      "scout",
    )
    await this.sleep(80)

    const extraction = await this.modelClient.extractFacts(rawText)
    const facts = extraction.facts
    await this.emitActivity(
      "scout",
      `Extracted facts: cost $${facts.cost.toLocaleString()}, capacity ${facts.capacity}, curfew ${facts.curfew}, AV ${facts.avIncluded ? "included" : "not included"}`,
      {
        agent: "scout",
        verb: "extracted",
        model: extraction.attribution.model,
        latencyMs: extraction.attribution.latencyMs,
        tokens: extraction.attribution.tokens,
        viaRelay,
      },
      "scout",
    )
    await this.sleep(80)

    // 2. Finance step (reads from #procurement and calculates deltas/violations deterministically)
    if (this.coordinator?.isReady()) {
      await this.coordinator.readAsFinance()
    }
    await this.emitActivity(
      "finance",
      "Evaluating proposal against event constraints and budget...",
      { agent: "finance", verb: "evaluated", model: "deterministic", latencyMs: 0, viaRelay },
      "finance",
    )
    await this.sleep(80)

    const budgetDelta = specs.maxBudget - facts.cost
    const capacityDelta = facts.capacity - specs.guestCount
    const violations: string[] = []

    if (budgetDelta < 0) {
      violations.push("over budget")
    }
    if (capacityDelta < 0) {
      violations.push("under capacity")
    }
    if (isCurfewEarlier(facts.curfew, specs.requiredCurfew)) {
      violations.push("curfew earlier than required")
    }
    if (specs.avRequired && !facts.avIncluded) {
      violations.push("AV missing when required")
    }

    await this.emitActivity(
      "finance",
      `Audit complete: budget delta $${budgetDelta.toLocaleString()}, capacity delta ${capacityDelta}. Violations: ${violations.length > 0 ? violations.join(", ") : "none"}`,
      { agent: "finance", verb: "audited", model: "deterministic", latencyMs: 0, viaRelay },
      "finance",
    )
    await this.sleep(80)

    // 3. Negotiator step (reads from #procurement and drafts counter strategy)
    if (this.coordinator?.isReady()) {
      await this.coordinator.readAsNegotiator()
    }
    await this.emitActivity(
      "negotiator",
      "Reviewing audit findings and formulating counter-proposal strategy...",
      { agent: "negotiator", verb: "reviewed", model: this.mode === "fixtures" ? "fixture" : "live", latencyMs: 0, viaRelay },
      "negotiator",
    )
    await this.sleep(80)

    const counterResult = await this.modelClient.draftCounter(violations, specs, facts)
    const counterStrategy = counterResult.counterStrategy
    const draftCounterProposal = counterResult.draftCounterProposal

    await this.emitActivity(
      "negotiator",
      `Counter strategy: ${counterStrategy}. Drafted proposal: "${draftCounterProposal}"`,
      {
        agent: "negotiator",
        verb: "countered",
        model: counterResult.attribution.model,
        latencyMs: counterResult.attribution.latencyMs,
        tokens: counterResult.attribution.tokens,
        viaRelay,
      },
      "negotiator",
    )
    await this.sleep(80)

    const audit: AuditResult = {
      budgetDelta,
      capacityDelta,
      violations,
      counterStrategy,
      draftCounterProposal,
      actedBy: "negotiator",
    }

    await this.room.submitAudit(proposalId, audit)
  }
}
