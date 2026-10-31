// The gate. `bun run validate` runs everything, `--quick` skips vitest.
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

const quick = process.argv.includes("--quick")
const root = join(import.meta.dir, "..")

const workspaces = ["packages", "apps"].flatMap((dir) => {
  const base = join(root, dir)
  if (!existsSync(base)) return []
  return readdirSync(base)
    .map((name) => join(base, name))
    .filter((p) => existsSync(join(p, "tsconfig.json")))
})

type Step = { name: string; cmd: string[]; cwd?: string }

const steps: Step[] = [
  ...workspaces.map((cwd) => ({ name: `tsc ${cwd.slice(root.length + 1)}`, cmd: ["bunx", "tsc", "--noEmit"], cwd })),
  { name: "oxlint", cmd: ["bunx", "oxlint"] },
  ...(quick ? [] : [{ name: "vitest", cmd: ["bunx", "vitest", "run", "--passWithNoTests"] }]),
  { name: "actor contract", cmd: ["bun", "scripts/check-actor-contract.ts"] },
]

let failed = 0
const t0 = performance.now()
for (const step of steps) {
  const start = performance.now()
  const proc = Bun.spawn(step.cmd, { cwd: step.cwd ?? root, stdout: "pipe", stderr: "pipe" })
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
  const code = await proc.exited
  const secs = ((performance.now() - start) / 1000).toFixed(1)
  console.log(`${code === 0 ? "ok  " : "FAIL"} ${step.name} (${secs}s)`)
  if (code !== 0) {
    failed++
    console.log((out + err).trim().split("\n").slice(0, 30).join("\n"))
  }
}
console.log(`${failed === 0 ? "validate passed" : `validate FAILED (${failed})`} in ${((performance.now() - t0) / 1000).toFixed(1)}s${quick ? " [quick]" : ""}`)
process.exit(failed === 0 ? 0 : 1)
