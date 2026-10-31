import { FixtureModelClient } from "./fixture.js"
import { LiveModelClient } from "./live.js"
import type { ModelClient } from "./types.js"

export * from "./types.js"
export * from "./fixture.js"
export * from "./live.js"

export function createModelClient(mode: "fixtures" | "live"): ModelClient {
  if (mode === "live") {
    return new LiveModelClient()
  }
  return new FixtureModelClient()
}
