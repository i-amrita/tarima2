import { execSync } from "node:child_process"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { EventSpecs } from "@dealrelay/shared"
import { generateText } from "ai"
import { z } from "zod"
import { generateNegotiation, parseCurfewTo24h, parseProposalText, type ParsedFacts } from "../pipeline.js"
import type { ModelAttribution, ModelClient, ModelCounterResult, ModelExtractionResult } from "./types.js"

const scoutSchema = z.object({
  cost: z.coerce.number().int().nonnegative(),
  capacity: z.coerce.number().int().nonnegative(),
  curfew: z.string(),
  avIncluded: z.coerce.boolean(),
})

const negotiatorSchema = z.object({
  counterStrategy: z.string().min(1),
  draftCounterProposal: z.string().min(1),
})

function getKeychainBifrostKey(): string {
  try {
    return execSync('security find-generic-password -s "bifrost" -a "$USER" -w', { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

export type LiveModelClientOptions = {
  baseUrl?: string
  apiKey?: string
  model?: string
  maxRetries?: number
}

export class LiveModelClient implements ModelClient {
  private baseUrl: string
  private apiKey: string
  private model: string
  private maxRetries: number
  private provider: ReturnType<typeof createOpenAICompatible>

  constructor(options: LiveModelClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.LLM_BASE_URL ?? "http://localhost:8317/v1"
    this.apiKey = options.apiKey ?? process.env.LLM_API_KEY ?? (this.baseUrl.includes("8317") ? getKeychainBifrostKey() : "")
    this.model =
      options.model ??
      process.env.LLM_MODEL ??
      (this.baseUrl.includes("openrouter.ai")
        ? "nvidia/nemotron-3.5-super-vl:free"
        : "minimax-coding-plan/MiniMax-M2.7-highspeed")
    this.maxRetries = options.maxRetries ?? 2

    this.provider = createOpenAICompatible({
      name: "dealrelay-llm",
      baseURL: this.baseUrl,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
    })
  }

  private cleanJson(raw: string): string {
    return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  }

  async extractFacts(rawText: string): Promise<ModelExtractionResult> {
    const t0 = performance.now()
    const systemPrompt = `You are an event venue specification extraction assistant.
You extract venue facts from inbound proposal emails.
You MUST reply with a single JSON object with these EXACT keys:
- "cost": total rental or quoted cost as integer number
- "capacity": maximum guest count as integer number
- "curfew": curfew time as 24-hour string "HH:MM" (e.g. midnight is "00:00", 11pm is "23:00", 2am is "02:00")
- "avIncluded": boolean, true if standard AV equipment/package is included, false otherwise.
Do not include any prose, markdown fences, or extra commentary. Return ONLY the raw JSON object.`

    let lastError: unknown = null
    const totalAttempts = 1 + this.maxRetries

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const result = await generateText({
          model: this.provider(this.model),
          system: systemPrompt,
          prompt: `Extract venue facts from this inbound proposal text:\n\n${rawText}`,
          maxOutputTokens: 1500,
          temperature: 0.1,
        })

        const text = result.text?.trim()
        if (!text) {
          throw new Error(`Model returned empty content (finishReason: ${result.finishReason})`)
        }

        const cleaned = this.cleanJson(text)
        const parsedJson = JSON.parse(cleaned)
        const validated = scoutSchema.parse(parsedJson)

        // Normalize curfew to 24h
        const normalizedCurfew = parseCurfewTo24h(validated.curfew)

        const latencyMs = Math.round(performance.now() - t0)
        const attribution: ModelAttribution = {
          model: this.model,
          latencyMs,
          tokens: {
            prompt: result.usage?.inputTokens ?? 0,
            completion: result.usage?.outputTokens ?? 0,
            total: result.usage?.totalTokens ?? 0,
          },
          fallbackUsed: false,
        }

        return {
          facts: {
            cost: validated.cost,
            capacity: validated.capacity,
            curfew: normalizedCurfew,
            avIncluded: validated.avIncluded,
          },
          attribution,
        }
      } catch (err: unknown) {
        lastError = err
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[LiveModelClient] Scout attempt ${attempt}/${totalAttempts} failed: ${msg}`)
      }
    }

    // Loud fallback to regex parser
    console.warn(
      `[LiveModelClient] LOUD FALLBACK: Scout model calls failed after ${totalAttempts} attempts. Falling back to regex parser. Last error:`,
      lastError,
    )
    const fallbackFacts = parseProposalText(rawText)
    const latencyMs = Math.round(performance.now() - t0)
    return {
      facts: fallbackFacts,
      attribution: {
        model: this.model,
        latencyMs,
        tokens: { prompt: 0, completion: 0, total: 0 },
        fallbackUsed: true,
      },
    }
  }

  async draftCounter(
    violations: string[],
    specs: EventSpecs,
    facts: ParsedFacts,
  ): Promise<ModelCounterResult> {
    const t0 = performance.now()
    const systemPrompt = `You are a professional event venue negotiator.
Based on the event requirements, quoted venue facts, and audit violations, formulate a negotiation strategy and draft counter-proposal text.
You MUST reply with a single JSON object with these EXACT keys:
- "counterStrategy": concise summary of the counter-offer strategy
- "draftCounterProposal": professional counter proposal text addressed to the venue
Do not include any prose, markdown fences, or extra commentary. Return ONLY the raw JSON object.`

    const prompt = `Event constraints:
- Event: ${specs.eventName}
- Target Date: ${specs.targetDate}
- Guests: ${specs.guestCount}
- Max Budget: $${specs.maxBudget.toLocaleString()}
- Required Curfew: ${specs.requiredCurfew}
- AV Required: ${specs.avRequired}

Quoted venue facts:
- Cost: $${facts.cost.toLocaleString()}
- Capacity: ${facts.capacity}
- Curfew: ${facts.curfew}
- AV Included: ${facts.avIncluded}

Audit violations found:
${violations.length > 0 ? violations.map((v) => `- ${v}`).join("\n") : "None (fully compliant)"}

Generate the negotiation counter strategy and draft counter proposal.`

    let lastError: unknown = null
    const totalAttempts = 1 + this.maxRetries

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const result = await generateText({
          model: this.provider(this.model),
          system: systemPrompt,
          prompt,
          maxOutputTokens: 1500,
          temperature: 0.2,
        })

        const text = result.text?.trim()
        if (!text) {
          throw new Error(`Model returned empty content (finishReason: ${result.finishReason})`)
        }

        const cleaned = this.cleanJson(text)
        const parsedJson = JSON.parse(cleaned)
        const validated = negotiatorSchema.parse(parsedJson)

        const latencyMs = Math.round(performance.now() - t0)
        const attribution: ModelAttribution = {
          model: this.model,
          latencyMs,
          tokens: {
            prompt: result.usage?.inputTokens ?? 0,
            completion: result.usage?.outputTokens ?? 0,
            total: result.usage?.totalTokens ?? 0,
          },
          fallbackUsed: false,
        }

        return {
          counterStrategy: validated.counterStrategy,
          draftCounterProposal: validated.draftCounterProposal,
          attribution,
        }
      } catch (err: unknown) {
        lastError = err
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[LiveModelClient] Negotiator attempt ${attempt}/${totalAttempts} failed: ${msg}`)
      }
    }

    // Loud fallback to deterministic negotiation
    console.warn(
      `[LiveModelClient] LOUD FALLBACK: Negotiator model calls failed after ${totalAttempts} attempts. Falling back to deterministic negotiation. Last error:`,
      lastError,
    )
    const fallback = generateNegotiation(violations, specs, facts)
    const latencyMs = Math.round(performance.now() - t0)
    return {
      counterStrategy: fallback.counterStrategy,
      draftCounterProposal: fallback.draftCounterProposal,
      attribution: {
        model: this.model,
        latencyMs,
        tokens: { prompt: 0, completion: 0, total: 0 },
        fallbackUsed: true,
      },
    }
  }
}
