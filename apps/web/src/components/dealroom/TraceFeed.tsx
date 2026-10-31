import * as React from "react"
import type { ActivityActor, ActivityEvent } from "@dealrelay/shared"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface TraceFeedProps {
  activity: ActivityEvent[]
}

function getActorBadgeClass(actor: ActivityActor): string {
  switch (actor) {
    case "scout":
      return "border-sky-500/30 bg-sky-500/10 text-sky-400"
    case "finance":
      return "border-purple-500/30 bg-purple-500/10 text-purple-400"
    case "negotiator":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400"
    case "client":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    case "agency":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
    case "system":
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
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

export function TraceFeed({ activity }: TraceFeedProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activity.length])

  return (
    <Card
      data-testid="trace-feed"
      className="flex flex-col h-full border-border bg-card/60 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/80">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-status-met animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-muted-foreground">
            Agent Trace Feed
          </h2>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {activity.length} events
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-mono">
            No agent activity recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {activity.map((item) => (
              <div
                key={item.id}
                data-testid="trace-item"
                data-actor={item.actor}
                className="flex items-start gap-2.5 text-xs font-mono p-2 rounded bg-muted/20 border border-border/30 hover:border-border/60 transition-colors"
              >
                <span className="text-[11px] text-muted-foreground shrink-0 select-none">
                  {formatTime(item.at)}
                </span>
                <Badge
                  variant="outline"
                  className={cn("h-4 px-1.5 text-[10px] uppercase font-mono shrink-0", getActorBadgeClass(item.actor))}
                >
                  {item.actor}
                </Badge>
                <span className="text-foreground/90 break-words flex-1">
                  {item.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}
