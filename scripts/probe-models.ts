import { execSync } from "node:child_process"
import { z } from "zod"

const scoutSchema = z.object({
  cost: z.number().int().positive(),
  capacity: z.number().int().positive(),
  curfew: z.string(), // e.g. "00:00" or "24h time"
  avIncluded: z.boolean(),
})

export type ScoutExtraction = z.infer<typeof scoutSchema>

const grandLoftText =
  "Thank you for considering The Grand Loft for your event. We can host up to 550 guests with full banquet seating. Our total rental fee is $26,000 for the evening. The event must end by 12:00am midnight. Standard AV equipment and technical support are included in the package."

const models = [
  "zai-coding-plan/glm-5-turbo",
  "zai-coding-plan/glm-4.5-air",
  "minimax-coding-plan/MiniMax-M2.7-highspeed",
]

function getBifrostKey(): string {
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY
  try {
    return execSync('security find-generic-password -s "bifrost" -a "$USER" -w', { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

async function testModel(model: string, apiKey: string, testText: string) {
  const t0 = performance.now()
  const systemPrompt = `You are an event venue specification extraction assistant.
You extract venue facts from proposal text.
You MUST reply with a single JSON object with these EXACT keys:
- "cost": total rental or quoted cost as integer number
- "capacity": maximum guest count as integer number
- "curfew": curfew time as 24-hour string "HH:MM" (e.g. midnight is "00:00", 11pm is "23:00")
- "avIncluded": boolean, true if AV is included, false otherwise.
Do not include any prose, markdown fences, or extra commentary. Return ONLY the raw JSON object.`

  const res = await fetch("http://localhost:8317/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract venue facts from this text:\n\n${testText}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.1,
    }),
  })

  const latencyMs = Math.round(performance.now() - t0)
  if (!res.ok) {
    const errText = await res.text()
    return {
      model,
      ok: false,
      latencyMs,
      contentNull: true,
      error: `HTTP ${res.status}: ${errText.slice(0, 100)}`,
      parsed: null,
    }
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    extra_fields?: { routing_info?: string }
  }
  const choice = json.choices?.[0]
  const rawContent = choice?.message?.content
  const contentNull = !rawContent || rawContent.trim() === ""

  if (contentNull) {
    return {
      model,
      ok: false,
      latencyMs,
      contentNull: true,
      error: `Content null or empty (finish_reason: ${choice?.finish_reason})`,
      parsed: null,
    }
  }

  // Parse JSON
  try {
    // Strip markdown fence if model wrapped it
    const cleanJson = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleanJson)
    const validated = scoutSchema.parse(parsed)
    return {
      model,
      ok: true,
      latencyMs,
      contentNull: false,
      parsed: validated,
      routing: json.extra_fields?.routing_info ?? "direct",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      model,
      ok: false,
      latencyMs,
      contentNull: false,
      error: `Schema/JSON error: ${msg}. Raw: ${rawContent.slice(0, 120)}`,
      parsed: null,
    }
  }
}

async function runProbe() {
  const apiKey = getBifrostKey()
  if (!apiKey) {
    console.error("No Bifrost API key available")
    process.exit(1)
  }

  console.log("Starting model probe for Scout schema across 3 candidate models (3 trials each)...")
  const results: Record<
    string,
    { latencies: number[]; successes: number; contentNulls: number; lastError?: string; sampleParsed?: ScoutExtraction }
  > = {}

  for (const model of models) {
    results[model] = { latencies: [], successes: 0, contentNulls: 0 }
    for (let trial = 1; trial <= 3; trial++) {
      process.stdout.write(`Testing ${model} trial ${trial}/3... `)
      const res = await testModel(model, apiKey, grandLoftText)
      results[model].latencies.push(res.latencyMs)
      if (res.ok) {
        results[model].successes++
        results[model].sampleParsed = res.parsed
        console.log(`OK (${res.latencyMs}ms)`)
      } else {
        if (res.contentNull) results[model].contentNulls++
        results[model].lastError = res.error
        console.log(`FAIL (${res.latencyMs}ms): ${res.error}`)
      }
    }
  }

  console.log("\n--- Probe Summary ---")
  console.log("| Model | Success Rate | Latency (avg ms) | Content Null | Sample Output |")
  console.log("| --- | --- | --- | --- | --- |")
  for (const [model, stats] of Object.entries(results)) {
    const avgLatency = Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
    const successRate = `${stats.successes}/${stats.latencies.length} (${Math.round((stats.successes / stats.latencies.length) * 100)}%)`
    const sample = stats.sampleParsed ? JSON.stringify(stats.sampleParsed) : (stats.lastError ?? "none")
    console.log(`| \`${model}\` | ${successRate} | ${avgLatency}ms | ${stats.contentNulls} | ${sample} |`)
  }
}

if (import.meta.main) {
  runProbe().catch(console.error)
}
