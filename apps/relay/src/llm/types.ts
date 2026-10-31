import type { EventSpecs } from "@dealrelay/shared"
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

export interface ModelClient {
  extractFacts(rawText: string): Promise<ModelExtractionResult>
  draftCounter(
    violations: string[],
    specs: EventSpecs,
    facts: ParsedFacts,
  ): Promise<ModelCounterResult>
}
