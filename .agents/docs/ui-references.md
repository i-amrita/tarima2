# UI references: light editorial product surfaces

Status: captured 2026-10-31. Local screenshots live in `.agents/docs/screens/references/`.

Sources: paper.design, town.com, promptql.io, relume.io, agent-swarm.dev. Baseline of our
current UI lives in `.agents/docs/screens/baseline/`.

## Pattern 1: light warm-neutral canvas, near-black ink

Four of five products render light-first: paper.design uses a warm off-white canvas with soft
gray ink; town.com uses cream with near-black type; promptql.io is white with near-black type;
relume.io is a light neutral gray with near-black type. agent-swarm.dev is the single outlier
(full-bleed yellow). Convergence: light canvas is the norm for this product category; the
canvas carries warmth (not pure #fff) on at least two of the four.

Observed:

| Product | Canvas | Ink | Screenshot |
| --- | --- | --- | --- |
| paper.design | warm off-white (~#F5F4EF) | soft near-black | `references/paper-hero.png` |
| town.com | cream (~#FBFAF7) | near-black serif | `references/town-hero.png` |
| promptql.io | white | near-black | `references/promptql-hero.png` |
| relume.io | light neutral gray (~#F2F2F0) | near-black | `references/relume-hero.png` |
| agent-swarm.dev | saturated yellow (outlier) | black | `references/agent-swarm-hero.png` |

## Applies to

- Room screen background, card surfaces, text colors. Checkpoint: any pixel the canvas shows.

## Pattern 2: oversized editorial display heading, sentence case

Four of five open with an oversized display heading (roughly 48-90px), sentence case, often
ending in a period: "Bot, meet humans." (promptql), "design incredible / the connected canvas
for teams shipping with agents" (paper, light-weight sans), "Learns how you work," (town,
serif), "Fastest AI website builder for simple marketing sites" (relume, neutral sans).
Convergence: scale + sentence case + tight tracking. The serif is promptql/town-specific
(2 of 5), so it is an anecdote, not a rule; a light-weight neutral sans at display size
satisfies the pattern (paper and relume prove it).

## Applies to

- The deal room page title (the event name). Checkpoint: room header.

## Pattern 3: product-forward canvas, minimal top chrome

All five keep the top bar to a single slim row: wordmark left, a few quiet links, one or two
actions right (paper, promptql, relume, town, agent-swarm). None stack a second full-width
bar under the header. The product surface itself starts immediately and dominates the first
viewport: paper's editor screenshot fills the hero, relume's input card sits above the product
frame, promptql's video is the hero.

## Applies to

- Room chrome: one slim top bar; no stacked full-width bars between header and content.
- Checkpoint: room shell, demo controls placement.

## Pattern 4: monospace as a utility voice only

Where mono appears at all, it marks small utility metadata: agent-swarm's "OPEN SOURCE · MIT ·
v2.7.6" footer line, relume's mono eyebrow above the hero. Body copy, headings, and buttons
are sans on every light product. Convergence: mono is an eyebrow/timestamp voice, never the
body voice.

## Applies to

- Timestamps, room IDs, eyebrow labels, spec chips. Checkpoint: trace feed, card meta.

## Pattern 5: one accent, earned status color

Each product commits to a single accent used sparingly (relume magenta on the CTA, promptql
lime in product UI, town amber highlight, agent-swarm yellow). Everything else is ink and
neutrals. Color is a signal, not decoration.

## Applies to

- Buttons and status semantics: ink for primary actions; green/red/amber reserved for
  constraint met/violated/pending; no per-actor rainbow palettes beyond small dots.
- Checkpoint: venue cards, approval card, trace feed, demo controls.
