# Design system

Status: decided 2026-10-31. Applies to `apps/web` and any future UI surface.

## Decision

**shadcn/ui as the design system. Geist-style theme (Vercel aesthetic), semantic token classes only.**

Not daisyUI. daisyUI ships semantic class names (`btn`, `card`) but keeps a closed component set with its own theme layer; shadcn/ui copies source into the repo, which is what a hackathon codebase with several agents working in parallel needs: components are readable, editable, and versioned with the code.

## Theme: light editorial (Geist-style structure)

- Font: Plus Jakarta Sans (variable) for UI, Fraunces for display, mono stack (Berkeley Mono, then ui-monospace) for the agent trace, IDs, and any tabular data. Matches dits.
- Look: light bone canvas, flat white cards with 1px hairline borders, pastel status chips, generous spacing. Status color is earned, not decorative: red only for constraint violations, amber only for awaiting approval, green only for met/approved. Exact values live in `ui-screen-spec.md` section 2.
- Tokens come from Tailwind CSS variables in the shadcn theme block (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--destructive`, ...). Light is the default; a `.dark` override block exists but is not the demo theme.
- No hardcoded hex values in components. If a color is not a token, add the token first.

## Component sourcing rules

1. **Base layer (`components/ui/*`)**: shadcn/ui components via the CLI (`npx shadcn@latest add button card badge ...`). These are the only place raw primitives (Button, Card, Badge, Dialog, Tabs, Tooltip, Separator, ScrollArea) come from.
2. **Composition layer (`components/dealroom/*`)**: deal-room components (VenueCard, ConstraintBadge, ApprovalBar, SimulationDrawer, TraceFeed) are composed ONLY from base components, ai-elements, or prompt-kit. They may add layout and data wiring, but never restyle a base component with one-off classes; overrides go through the token layer or a variant.
3. **AI layer (`components/ai-elements/*`)**: install from the shadcn-native AI Elements registry (`npx shadcn@latest add @ai-elements/<pattern>`).
4. **Prompt layer (`components/prompt-kit/*`)**: prompt-kit components where a small AI building block is needed that ai-elements does not cover.
5. Nothing else. No importing component code from blog posts, no copy-pasted Tailwind snippets, no second component library.

## Why shadcn AI Elements (not Vercel ai-elements, not assistant-ui)

Evaluated 2026-10-31:

| Option | Verdict |
| --- | --- |
| shadcn/ui AI Elements (`@ai-elements/*`) | **Chosen.** Patterns composed from shadcn/ui, copied into the repo, runtime-agnostic (we feed them our actor snapshot, not useChat state). This is where Vercel's ai-elements is being merged; the standalone package is deprecated end of November 2026, so starting on the successor avoids a migration. |
| Vercel ai-elements (`elements.ai-sdk.dev`) | Deprecated Nov 2026; shaped around AI SDK `useChat` message parts which we do not use (our state is the Terse actor socket). |
| assistant-ui | Chat-state machine with runtime adapters (AI SDK, LangGraph, AG-UI). Strong if the product is a chat thread; ours is a deal-room canvas with an agent trace. Coupling to its runtime buys nothing here. |
| prompt-kit | Good shadcn-style pieces (PromptInput, Message, Reasoning, streaming text). Narrower than ai-elements; use as a supplement, not the base. |

### ai-elements patterns we will use

- **Trace** — the shape every agent step renders with; the trace feed is a list of Traces.
- **Reasoning** — streamed agent thinking (fixture mode streams text with cadence).
- **Confirmation** — the human-in-the-loop approval card (client approves counter-offer).
- **Task / Subagent** — per-agent work units with status (Scout, Finance, Negotiator).
- **Terminal** — for the demo's "kill the actor" beat and vendor reply simulation.
- Chat/Message/Prompt Input are available if we add a free-text command surface later.

## Screenshot/source-of-truth rule for agents

Before adding any UI component, check in order: (1) `components/ui/*` already has it, (2) an ai-elements pattern provides it, (3) prompt-kit has it, (4) only then compose a new component from 1-3. Never introduce a new dependency to style something a base component already does.

## References

- shadcn AI Elements: https://ui.shadcn.com/docs/ai-elements
- prompt-kit: https://www.prompt-kit.com/docs/introduction
- assistant-ui (rejected, rationale above): https://www.assistant-ui.com/
- Vercel ai-elements deprecation notice: https://github.com/vercel/ai-elements
