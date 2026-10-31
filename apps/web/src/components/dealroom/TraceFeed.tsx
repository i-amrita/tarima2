import * as React from "react"
import type { ActivityActor, ActivityEvent } from "@dealrelay/shared"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import { cn } from "@/lib/utils"

export type ActivityEventWithAttribution = ActivityEvent & {
  actedBy?: string
  model?: string
  latencyMs?: number
  tokens?: number
}

interface TraceFeedProps {
  activity: ActivityEventWithAttribution[]
  className?: string
}

function getActorDotClass(actor: ActivityActor): string {
  switch (actor) {
    case "scout":
      return "bg-actor-scout"
    case "finance":
      return "bg-actor-finance"
    case "negotiator":
      return "bg-actor-negotiator"
    case "client":
      return "bg-actor-client"
    case "agency":
      return "bg-actor-client"
    case "system":
    default:
      return "bg-actor-system"
  }
}

function formatTime(epochMs: number): string {
  const d = new Date(epochMs)
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function TraceItemRow({ item }: { item: ActivityEventWithAttribution }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [canOverflow, setCanOverflow] = React.useState(false)
  const textRef = React.useRef<HTMLParagraphElement>(null)

  // Measure if the collapsed text overflows the 2-line clamp.
  // Once detected as overflowing, we remember it can overflow so "less" can collapse it back.
  React.useEffect(() => {
    const el = textRef.current
    if (!el || isExpanded) return

    const checkOverflow = () => {
      if (el) {
        const overflowing = el.scrollHeight > el.clientHeight + 1
        setCanOverflow(overflowing)
      }
    }

    checkOverflow()

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(checkOverflow)
      ro.observe(el)
      return () => ro.disconnect()
    }
  }, [item.message, isExpanded])

  const toggle = React.useCallback(() => {
    if (canOverflow || isExpanded) {
      setIsExpanded((prev) => !prev)
    }
  }, [canOverflow, isExpanded])

  const actorLabel = item.actedBy || item.actor

  return (
    <div
      data-testid="trace-run"
      data-actor={item.actor}
      className="group w-full"
    >
      <div
        data-testid="trace-item"
        data-actor={item.actor}
        onClick={canOverflow || isExpanded ? toggle : undefined}
        className={cn(
          "rounded-md p-2 transition-colors text-xs space-y-1 outline-none",
          (canOverflow || isExpanded)
            ? "cursor-pointer hover:bg-black/[0.03]"
            : "hover:bg-black/[0.015]"
        )}
      >
        {/* Header: Timestamp, Dot, Agent Name, Attribution chips */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
            {formatTime(item.at)}
          </span>
          <span
            className={cn("size-1.5 rounded-full shrink-0", getActorDotClass(item.actor))}
            aria-hidden="true"
          />
          <span className="text-[12px] font-sans font-medium text-foreground capitalize shrink-0">
            {actorLabel}
          </span>
          {/* Upper case representation for screen-readers and smoke tests */}
          <span className="sr-only">{actorLabel.toUpperCase()}</span>

          {/* Reserved slots for optional attribution fields */}
          {item.model && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted-foreground/10 text-muted-foreground border border-border/60 shrink-0">
              {item.model}
            </span>
          )}

          {typeof item.latencyMs === "number" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted-foreground/10 text-muted-foreground border border-border/60 shrink-0">
              {item.latencyMs}ms
            </span>
          )}

          {typeof item.tokens === "number" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted-foreground/10 text-muted-foreground border border-border/60 shrink-0">
              {item.tokens} tok
            </span>
          )}
        </div>

        {/* Message body */}
        {isExpanded ? (
          <div className="space-y-1.5 min-w-0">
            <pre className="text-xs font-mono text-foreground/90 leading-relaxed whitespace-pre-wrap break-words p-2 bg-background/60 rounded border border-border/50 select-text">
              {item.message}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                aria-expanded="true"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
              >
                less
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p
              ref={textRef}
              title={item.message}
              className="line-clamp-2 text-[13px] font-sans text-foreground/90 leading-snug break-words"
            >
              {item.message}
            </p>
            {canOverflow && (
              <div className="flex justify-end mt-0.5">
                <button
                  type="button"
                  aria-expanded="false"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle()
                  }}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
                >
                  more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TraceFeed({ activity, className }: TraceFeedProps) {
  return (
    <div
      data-testid="trace-feed"
      className={cn(
        "bg-muted rounded-lg flex flex-col overflow-hidden relative max-h-[calc(100vh-8rem)]",
        className
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <h3 className="text-[13px] font-medium font-sans text-foreground">
          Agent activity
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {activity.length}
        </span>
      </div>

      {/* Chat-style scroll container */}
      <Conversation className="flex-1 min-h-0">
        {activity.length === 0 ? (
          <ConversationEmptyState title="No agent activity yet." />
        ) : (
          <ConversationContent className="p-3 space-y-1">
            {activity.map((item) => (
              <TraceItemRow key={item.id} item={item} />
            ))}
          </ConversationContent>
        )}
      </Conversation>
    </div>
  )
}
