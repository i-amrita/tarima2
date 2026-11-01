import type { AuditResult, EventSpecs, ProposalFeedback } from "@dealrelay/shared"
import type { ParsedFacts } from "../pipeline.js"

export type ModelAttribution = {
  model: string
  latencyMs: number
  tokens?: {
    prompt?: number
    completion?: number
    total?: number
  }
  fallbackUsed?: boolean
}

export type ModelExtractionResult = {
  facts: ParsedFacts
  attribution: ModelAttribution
}

export type ModelCounterResult = {
  counterStrategy: string
  draftCounterProposal: string
  attribution: ModelAttribution
}

export type ModelRevisionResult = {
  counterStrategy: string
  draftCounterProposal: string
  updatedSpecs?: Partial<EventSpecs>
  changedNumbers?: {
    budget?: number
    curfew?: string
    capacity?: number
    avRequired?: boolean
  }
  attribution: ModelAttribution
}

export interface ModelClient {
  extractFacts(rawText: string): Promise<ModelExtractionResult>
  draftCounter(
    violations: string[],
    specs: EventSpecs,
    facts: ParsedFacts,
  ): Promise<ModelCounterResult>
  draftRevision(
    feedback: ProposalFeedback[],
    specs: EventSpecs,
    facts: ParsedFacts,
    currentAudit?: AuditResult,
  ): Promise<ModelRevisionResult>
}
