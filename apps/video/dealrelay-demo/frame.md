# Design truth — DealRelay demo video

Normative tokens for every scene. Frontmatter carries the machine-readable tokens.

```yaml
canvas: 1920x1080
ground-dark: "#0A0A14"
ground-light: "#FBFBFA"
ink: "#111111"
ink-muted: "#787774"
hairline: "#EAEAEA"
card: "#FFFFFF"
green: { bg: "#EDF3EC", fg: "#346538" }
red: { bg: "#FDEBEC", fg: "#9F2F2D" }
amber: { bg: "#FBF3DB", fg: "#956400" }
blue: "#1F6C9F"
purple: "#7A3FB8"
glow-band: "rgba(230,232,255,0.14)"
radius: 10px
pill-radius: 9999px
font-display: Instrument Serif, Georgia, 'Times New Roman', serif
font-sans: Geist, Inter, 'Helvetica Neue', Arial, sans-serif
font-mono: Geist Mono, 'SF Mono', Menlo, monospace
```

## Two visual registers

1. **Dark framing register** (frames 1, 2, 7, 8, 9): ground #0A0A14, ink white
   (#F5F5F7), type huge (headline 120-160px, subline 36-44px), one glowing pale
   band sweeps the full frame per transition (a rotated linear-gradient div
   translating across, blur 40px, opacity ~0.14). Status color earned only.
2. **Light deal-room register** (frames 3-6): exactly the real app's screen
   spec: warm bone bg, white cards, hairline borders, no shadows (or <0.05
   opacity), pastel chips only as accents, Instrument Serif for the event name
   (52px), Geist/Inter sans everywhere else, mono for timestamps and chip
   values. Never saturated surfaces.

## Type scale (video medium)

Headlines 120-160px (dark), event name 52px, card titles 17px, chip values
13px mono, rail events 13px sans with 11px mono timestamps. Everything larger
than a web page would use; read at 1080p in motion.

## Motion doctrine

- Entrances: rise 24-40px + fade 500-700ms, staggered 80-140ms; spring only on
  chip/card landing (one overshoot max).
- The glow band: full-frame, 700-900ms, ease power2.inOut, sweeps once, never loops.
- Approval flip: chip background crossfades 300ms, check icon pops (scale 0.6>1.06>1).
- Stat count-ups: 900-1200ms, ease power3.out, land pulse (scale 1.04>1).
- Never tween `display`/`visibility`/`autoAlpha` on `.clip` elements; animate children.
- Deterministic only. No `Math.random` without seed, no clocks, no network.
