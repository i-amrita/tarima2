# Plan: Rebuild Agent Activity Panel as Chat-Style Log

Status: planned 2026-10-31. Branch: `feat/agent-chat-panel`.

## Context & Objectives

Rebuild the "Agent activity" panel in the DealRelay deal room from collapsible per-agent runs into a flat, chronological, chat-style activity log.
This addresses known nits from iteration 4 of the room redesign (rail showed repetitive agent sets with no venue context, messages hidden behind nested collapsibles) and aligns with the shadcn AI Elements Conversation component pattern.

## Requirements

1. **Flat chronological list**: All messages displayed in order without collapsible per-agent grouping. Each message displays:
   - Timestamp in mono (e.g., `14:23:01`).
   - Agent name with colored dot (`bg-actor-scout`, `bg-actor-finance`, `bg-actor-negotiator`, `bg-actor-client`, `bg-actor-system`).
   - Message text.
2. **2-line preview with progressive disclosure**:
   - Preview trimmed to 2 lines (`line-clamp-2`).
   - "more" / "less" control toggles full text.
   - Logs-viewer style: preview row with expand/collapse toggle.
   - Keyboard accessible (`button` with `aria-expanded`).
   - Only appears when text actually overflows 2 lines (DOM measurement).
   - When expanded, preserves line breaks and renders in mono (`font-mono whitespace-pre-wrap`).
3. **Scroll affordances**:
   - Up-arrow button at top edge when messages exist above the viewport.
   - Down-arrow button at bottom edge when messages exist below the viewport (jump to latest).
   - Scrolled-up state does not yank scroll on new incoming messages; only reveals down-arrow.
   - Default pinned to newest messages (bottom).
4. **Agent attribution & optional fields**:
   - Dot and agent name always visible per message.
   - Reserved slot for optional `model`, `latencyMs`, `tokens` chips (rendered only when present; `ActivityEvent` not altered in `packages/shared`).
   - Screen reader text `<span className="sr-only">ACTOR</span>` preserved for smoke tests and accessibility.
5. **Layout & Quiet Aesthetics**:
   - Warm monochrome / light editorial styling using design tokens only.
   - Fits content when short; caps at viewport height (`calc(100vh - 8rem)`) when long.
   - Zero clipped lines at 1440x900, 1024x768, and 390x844.
   - All existing `data-testid`s preserved (`trace-feed`, `trace-run`, `trace-item`).

## Implementation Steps

1. Create `apps/web/src/components/ai-elements/conversation.tsx`:
   - `Conversation`: Root scroll container with scroll detection (atTop, atBottom, userScrolledUp), auto-stick to bottom.
   - `ConversationContent`: Message list wrapper.
   - `ConversationScrollAffordances`: Up/Down navigation buttons at top/bottom edges with smooth scroll.
   - `ConversationEmptyState`: Quiet empty state.
2. Update `apps/web/src/components/dealroom/TraceFeed.tsx`:
   - Flat list rendering with `TraceItem` subcomponent.
   - Overflow detection using `ResizeObserver` / scroll height measurement.
   - Expand/collapse toggle ("more" / "less").
   - Optional attribution badge slot (`model`, `latencyMs`, `tokens`).
   - Preserve all data-testids and sr-only actor strings.
3. Update `apps/web/src/routes/room.$roomId.tsx`:
   - Allow activity container to fit content when short and cap at `calc(100vh - 8rem)` when long.
4. Update `.agents/docs/ui-screen-spec.md`:
   - Update Section 3.5 to document the flat chat-style log and scroll affordances.
5. Verification:
   - Run `bun run validate` (tsc, oxlint, vitest, actor contract check).
   - Start local dev server on port 3300 (`DEMO_ALLOW_KILL=1`).
   - Run `WEB_URL=http://127.0.0.1:3300 bash tests/e2e/smoke.sh`.
   - Run axe a11y audit, check console logs for 0 errors/warnings, 0 5xx.
   - Capture required screenshots at 1440, 1024, 390 for agency and client, including expanded long message and scrolled-up state with down arrow.
6. Commit, push branch, write summary to `/tmp/agent-chat-panel.md`, and touch `/tmp/agent-chat-panel.done`.
