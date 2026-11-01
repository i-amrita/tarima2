import type { AuditResult, EventSpecs, ProposalFeedback } from "@dealrelay/shared"
import {
  generateNegotiation,
  generateRevisionRules,
  parseProposalText,
  type ParsedFacts,
} from "../pipeline.js"
import type {
  ModelClient,
  ModelCounterResult,
  ModelExtractionResult,
  ModelRevisionResult,
} from "./types.js"

export class FixtureModelClient implements ModelClient {
  async extractFacts(rawText: string): Promise<ModelExtractionResult> {
    const facts = parseProposalText(rawText)
    return {
      facts,
      attribution: {
        model: "fixture",
        latencyMs: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        fallbackUsed: false,
      },
    }
  }

  async draftCounter(
    violations: string[],
    specs: EventSpecs,
    facts: ParsedFacts,
  ): Promise<ModelCounterResult> {
    const { counterStrategy, draftCounterProposal } = generateNegotiation(violations, specs, facts)
    return {
      counterStrategy,
      draftCounterProposal,
      attribution: {
        model: "fixture",
        latencyMs: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        fallbackUsed: false,
      },
    }
  }

  async draftRevision(
    feedback: ProposalFeedback[],
    specs: EventSpecs,
    facts: ParsedFacts,
    currentAudit?: AuditResult,
  ): Promise<ModelRevisionResult> {
    const { counterStrategy, draftCounterProposal, updatedSpecs, changedNumbers } = generateRevisionRules(
      feedback,
      specs,
      facts,
      currentAudit,
    )
    return {
      counterStrategy,
      draftCounterProposal,
      updatedSpecs,
      changedNumbers,
      attribution: {
        model: "fixture",
        latencyMs: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        fallbackUsed: false,
      },
    }
  }
}
