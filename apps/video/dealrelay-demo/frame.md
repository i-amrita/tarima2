# Design truth — DealRelay demo video

Normative tokens for every scene. Sourced from the live app
(`feat/room-redesign` worktree, `apps/web/src/styles.css`), so the video and the
webapp share one design system.

```yaml
canvas: 1920x1080
ground: "#F8F8F5"        # oklch(0.978 0.003 90) warm bone
ink: "#191816"           # oklch(0.21 0.005 90) soft ink
muted: "#F2F2EF"        # oklch(0.96 0.003 90)
ink-muted: "#65635D"     # oklch(0.5 0.01 90)
hairline: "#E7E6E3"      # oklch(0.925 0.004 90)
card: "#FFFFFF"
radius: 10px
pill-radius: 9999px
green: { bg: "#EEF5ED", fg: "#385631", border: "#D4E3D1" }
red: { bg: "#FAEFEF", fg: "#76363D", border: "#F1D6D8" }
amber: { bg: "#F8F4E1", fg: "#785F28", border: "#E9E2C4" }
blue: { bg: "#E3F3FB", fg: "#255C75", border: "#CBE2EE" }
actor-scout: "#255C75"
actor-finance: "#5C4A7B"
actor-negotiator: "#785F28"
actor-neutral: "#74716B"
font-display: Fraunces, ui-serif, Georgia, serif
font-sans: "Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif
font-mono: "Berkeley Mono", ui-monospace, "SF Mono", monospace
```

Fonts are self-hosted from `assets/fonts/*.woff2` (Fraunces Regular/Bold/Italic,
Plus Jakarta Sans Variable). Declare them with `@font-face` in each composition
that uses them. Never reference a font family the renderer cannot resolve.

## One visual register

Every scene uses the app's light editorial theme. There is no dark framing
register: the video is the app, not a trailer about the app. Warm bone ground,
white cards, hairline borders, no shadows (or under 0.05 opacity), pastel chips
as accents only, Fraunces for display type, Plus Jakarta Sans for UI, mono for
timestamps, chip values and eyebrows.

Framing beats (problem, name card, ROI, architecture, CTA) stay in the same
register but scale type up: display 120-160px, subline 36-44px, on the bone
ground with ink type. Depth comes from hairlines and generous whitespace, not
from a dark canvas or a glow band.

## Type scale (video medium)

Display headlines 120-160px, event name 52px (Fraunces), card titles 17px,
chip values 13px mono, rail events 13px sans with 11px mono timestamps.
Everything larger than a web page would use; read at 1080p in motion.

## Motion doctrine

- Entrances: rise 24-40px + fade 500-700ms, staggered 80-140ms; spring only on
  chip/card landing (one overshoot max).
- Approval flip: chip background crossfades 300ms, check icon pops (scale 0.6>1.06>1).
- Stat count-ups: 900-1200ms, ease power3.out, land pulse (scale 1.04>1).
- Never tween `display`/`visibility`/`autoAlpha` on `.clip` elements; animate children.
- Deterministic only. No `Math.random` without seed, no clocks, no network.

## Copy truth

- Event: "Northwind Product Launch." (Fraunces, trailing period as in the app)
- Specs: 2026-11-20, 500 guests, $30,000 max, 02:00 curfew, AV required
- Venues: The Grand Loft ($26,000 / 550 / 00:00 curfew), Warehouse 9 ($34,000 / 600 / 03:00 curfew)
- Agents: Scout, Finance, Negotiator
- Repo: github.com/i-amrita/tarima2
