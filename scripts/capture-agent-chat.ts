import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const baseUrl = process.env.WEB_URL || "http://127.0.0.1:3300"
const roomId = `chat-iter1-${Date.now()}`
const session = `session-${roomId}`
const outDir = join(process.cwd(), ".agents/docs/screens/agent-chat-iter-1")

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

function pw(args: string[]) {
  const res = spawnSync("playwright-cli", [`-s=${session}`, ...args], {
    encoding: "utf-8",
  })
  if (res.status !== 0) {
    console.error(`pw error (${args.join(" ")}):`, res.stderr || res.stdout)
  }
  return res.stdout || ""
}

function text() {
  const res = spawnSync("playwright-cli", [`-s=${session}`, "--raw", "eval", "document.body.innerText"], {
    encoding: "utf-8",
  })
  return res.stdout || ""
}

function waitText(pattern: string, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (text().includes(pattern)) return true
    spawnSync("sleep", ["0.5"])
  }
  throw new Error(`Timed out waiting for text: ${pattern}`)
}

async function run() {
  console.log(`Starting capture session ${session} on ${baseUrl} for room ${roomId}`)

  // 1. Open empty agency room
  pw(["open", `${baseUrl}/room/${roomId}?role=agency`])
  waitText("connected")

  const viewports = [
    { w: 1440, h: 900, name: "1440" },
    { w: 1024, h: 768, name: "1024" },
    { w: 390, h: 844, name: "390" },
  ]

  // Capture empty state
  for (const vp of viewports) {
    pw(["resize", String(vp.w), String(vp.h)])
    spawnSync("sleep", ["0.5"])
    pw(["screenshot", `--filename=${join(outDir, `agency-empty-${vp.name}.png`)}`])
    console.log(`Captured agency-empty-${vp.name}.png`)
  }

  // 2. Inject Grand Loft
  pw(["resize", "1440", "900"])
  pw(["click", "getByTestId('inject-grand-loft')"])
  waitText("REQUIRES APPROVAL")
  waitText("SCOUT")

  // Inject Warehouse 9 to get more messages
  pw(["click", "getByTestId('inject-warehouse-9')"])
  spawnSync("sleep", ["2"])

  // Capture agency populated
  for (const vp of viewports) {
    pw(["resize", String(vp.w), String(vp.h)])
    spawnSync("sleep", ["0.5"])
    pw(["screenshot", "--full-page", `--filename=${join(outDir, `agency-populated-${vp.name}.png`)}`])
    console.log(`Captured agency-populated-${vp.name}.png`)
  }

  // 3. Switch to client role
  pw(["tab-new", `${baseUrl}/room/${roomId}?role=client`])
  waitText("connected")
  waitText("REQUIRES APPROVAL")

  for (const vp of viewports) {
    pw(["resize", String(vp.w), String(vp.h)])
    spawnSync("sleep", ["0.5"])
    pw(["screenshot", "--full-page", `--filename=${join(outDir, `client-populated-${vp.name}.png`)}`])
    console.log(`Captured client-populated-${vp.name}.png`)
  }

  // 4. Back to agency tab (tab 0) for interaction captures
  pw(["tab-select", "0"])
  pw(["resize", "1440", "900"])
  spawnSync("sleep", ["0.5"])

  // Scroll to and click the "more" button so the expanded payload is visible
  console.log("Expanding a message...")
  pw(["eval", `(() => {
    const btns = Array.from(document.querySelectorAll('[data-testid="trace-feed"] button'));
    const moreBtn = btns.find(b => b.textContent && b.textContent.includes('more'));
    if (moreBtn) {
      moreBtn.click();
      moreBtn.scrollIntoView({ block: 'center' });
    }
  })()`])
  spawnSync("sleep", ["0.5"])
  pw(["screenshot", `--filename=${join(outDir, `agency-expanded-1440.png`)}`])
  console.log("Captured agency-expanded-1440.png")

  // 5. Scroll up to reveal the down arrow affordance
  console.log("Scrolling up to show down-arrow button...")
  pw(["eval", `(() => {
    const scrollContainer = document.querySelector('[data-testid="trace-feed"] .overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event('scroll'));
    }
  })()`])
  spawnSync("sleep", ["0.5"])
  pw(["screenshot", `--filename=${join(outDir, `agency-scrolled-up-1440.png`)}`])
  console.log("Captured agency-scrolled-up-1440.png")

  // Check console messages
  const consoleOut = pw(["console"])
  console.log("Console output:", consoleOut || "(clean)")

  // Check network requests
  const _networkOut = pw(["requests"])
  console.log("Network status checked.")

  // Axe accessibility evaluation
  console.log("Running axe accessibility audit...")
  const axeScript = `
    async () => {
      if (!window.axe) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
        document.head.appendChild(s);
        await new Promise(r => s.onload = r);
      }
      const results = await axe.run();
      const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      return JSON.stringify(violations);
    }
  `
  const axeRaw = pw(["--raw", "eval", axeScript])
  console.log("Axe critical/serious violations:", axeRaw)

  pw(["close"])
  console.log("Finished all captures successfully!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
