import * as React from "react"
import type { ActivityActor, ActivityEvent } from "@dealrelay/shared"
import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface TraceFeedProps {
  activity: ActivityEvent[]
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

/**
 * Strip drafted proposal quotes from displayed text so only the short strategy phrase shows.
 * The full message remains preserved in the title attribute.
 */
function cleanTraceMessage(message: string): string {
  const stripped = message
    .replace(/\.?\s*Drafted proposal:\s*["“'][^"”']*["”']?\.?/gi, "")
    .replace(/\.?\s*Drafted proposal:.*$/gi, "")
    .trim()
  return stripped || message
}

type ActivityRun = { key: string; actor: ActivityActor; items: ActivityEvent[] }

/** Contiguous events from the same actor become one collapsible run. */
function groupRuns(activity: ActivityEvent[]): ActivityRun[] {
  const runs: ActivityRun[] = []
  for (const item of activity) {
    const last = runs[runs.length - 1]
    if (last && last.actor === item.actor) {
      last.items.push(item)
    } else {
      runs.push({ key: item.id, actor: item.actor, items: [item] })
    }
  }
  return runs
}

export function TraceFeed({ activity }: TraceFeedProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const runs = React.useMemo(() => groupRuns(activity), [activity])
  // Only the latest run is open by default; a user toggle overrides that for its run.
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Auto-scroll when activity updates
  React.useEffect(() => {
    scrollToBottom()
    const rafId = requestAnimationFrame(scrollToBottom)
    return () => cancelAnimationFrame(rafId)
  }, [activity.length, runs.length, overrides, scrollToBottom])

  // Auto-scroll when container or content resizes (e.g. viewport change, collapsible expansion)
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const ro = new ResizeObserver(() => {
      el.scrollTop = el.scrollHeight
    })
    ro.observe(el)
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild)
    }
    return () => ro.disconnect()
  }, [])

  return (
    <div
      data-testid="trace-feed"
      className={cn(
        "bg-muted rounded-lg flex flex-col overflow-hidden relative",
        activity.length === 0 ? "h-auto" : "h-full",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <h3 className="text-[13px] font-medium font-sans text-foreground">
          Agent activity
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {activity.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0",
          activity.length > 0 && "pb-6",
        )}
      >
        {activity.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-sans">
            No agent activity yet.
          </div>
        ) : (
          <div className="space-y-1.5 min-w-0">
            {runs.map((run, index) => {
              const isLatest = index === runs.length - 1
              return (
                <Collapsible
                  key={run.key}
                  open={overrides[run.key] ?? isLatest}
                  onOpenChange={(open) => setOverrides((prev) => ({ ...prev, [run.key]: open }))}
                  data-testid="trace-run"
                  data-actor={run.actor}
                  className="space-y-1 min-w-0"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-2 hover:bg-black/[0.03] rounded-md transition-colors cursor-pointer group text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full shrink-0", getActorDotClass(run.actor))}
                      />
                      <span className="text-[13px] font-sans font-medium text-foreground capitalize">
                        {run.actor}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({run.items.length})
                      </span>
                      <span className="sr-only">{run.actor.toUpperCase()}</span>
                    </div>
                    <ChevronDown className="size-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform shrink-0" />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pt-1 pb-1.5 pl-3.5 space-y-2 border-l border-border/60 ml-2.5 min-w-0">
                    {run.items.map((item) => (
                      <div
                        key={item.id}
                        data-testid="trace-item"
                        data-actor={item.actor}
                        title={item.message}
                        className="space-y-0.5 text-xs min-w-0"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                          <span>{formatTime(item.at)}</span>
                          <span className="sr-only">{item.actor.toUpperCase()}</span>
                        </div>
                        <p
                          title={item.message}
                          className="line-clamp-1 text-[13px] font-sans text-foreground/90 leading-snug"
                        >
                          {cleanTraceMessage(item.message)}
                        </p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </div>

      {activity.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-muted to-transparent rounded-b-lg"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
