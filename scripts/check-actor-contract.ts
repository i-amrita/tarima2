// Every `<x>.method(` called on a RoomActor reference in web/relay must exist in the generated client.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const dts = join(root, "packages/actors/generated/types.d.ts")
if (!existsSync(dts)) {
  console.error("generated client missing: run `bun run generate` with `bun run actors` running")
  process.exit(1)
}
const generated = readFileSync(dts, "utf8")

const lifecycle = new Set(["onConnect", "onMessage", "onDisconnect", "onAlarm", "log"])
const methods = new Set(
  [...readFileSync(join(root, "packages/actors/src/actors.ts"), "utf8").matchAll(/^  async (\w+)\(/gm)].map((m) => m[1]!).filter((m) => !lifecycle.has(m)),
)
const missing = [...methods].filter((m) => !generated.includes(m))
if (missing.length) {
  console.error(`generated client is stale, missing: ${missing.join(", ")}. Run \`bun run generate\`.`)
  process.exit(1)
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    if (n === "node_modules" || n === ".output" || n === "dist") return []
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

// Heuristic: variables bound from `actors.RoomActor.get(...)` and the methods called on them.
const bad: string[] = []
for (const file of [...walk(join(root, "apps")), ...walk(join(root, "scripts"))]) {
  const src = readFileSync(file, "utf8")
  const vars = [...src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*actors\.RoomActor\.get\(/g)].map((m) => m[1]!)
  for (const v of vars) {
    for (const m of src.matchAll(new RegExp(`\\b${v}\\.(\\w+)\\(`, "g"))) {
      if (!methods.has(m[1]!)) bad.push(`${file.slice(root.length + 1)}: ${v}.${m[1]}()`)
    }
  }
}
if (bad.length) {
  console.error(`unknown RoomActor methods:\n${bad.join("\n")}`)
  process.exit(1)
}
console.log(`contract ok (${methods.size} methods)`)
