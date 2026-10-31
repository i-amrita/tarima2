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

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activity.length])

  return (
    <div
      data-testid="trace-feed"
      className="bg-muted rounded-lg flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <h3 className="text-[13px] font-medium font-sans text-foreground">
          Agent activity
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {activity.length}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {activity.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-sans">
            No agent activity yet.
          </div>
        ) : (
          runs.map((run, index) => {
            const isLatest = index === runs.length - 1
            return (
              <Collapsible
                key={run.key}
                defaultOpen={isLatest}
                data-testid="trace-run"
                data-actor={run.actor}
                className="space-y-1"
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

                <CollapsibleContent className="pt-1 pb-1.5 pl-3.5 space-y-2 border-l border-border/60 ml-2.5">
                  {run.items.map((item) => (
                    <div
                      key={item.id}
                      data-testid="trace-item"
                      data-actor={item.actor}
                      className="space-y-0.5 text-xs"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                        <span>{formatTime(item.at)}</span>
                        <span className="sr-only">{item.actor.toUpperCase()}</span>
                      </div>
                      <p className="text-[13px] font-sans text-foreground/90 leading-snug break-words">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )
          })
        )}
      </div>
    </div>
  )
}
