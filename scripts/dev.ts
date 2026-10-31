// One-command local dev: actor server, then relay and web when those apps exist.
import { existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const procs: { name: string; cwd: string; cmd: string[] }[] = [
  { name: "actors", cwd: "packages/actors", cmd: ["bunx", "durable-actors", "dev"] },
  { name: "relay", cwd: "apps/relay", cmd: ["bun", "run", "dev"] },
  { name: "web", cwd: "apps/web", cmd: ["bun", "run", "dev"] },
].filter((p) => existsSync(join(root, p.cwd, "package.json")))

const children = procs.map((p) => {
  const child = Bun.spawn(p.cmd, { cwd: join(root, p.cwd), stdout: "pipe", stderr: "pipe" })
  for (const stream of [child.stdout, child.stderr]) {
    ;(async () => {
      const decoder = new TextDecoder()
      for await (const chunk of stream) for (const line of decoder.decode(chunk).split("\n")) if (line) console.log(`[${p.name}] ${line}`)
    })()
  }
  return child
})
const stop = () => children.forEach((c) => c.kill())
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
await Promise.race(children.map((c) => c.exited))
stop()
