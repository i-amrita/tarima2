import * as React from "react"
import type { EventSpecs } from "@dealrelay/shared"
import { DEFAULT_SPECS } from "@dealrelay/shared/fixtures"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { setRoomSpecs } from "@/server/room"

interface ConstraintHeaderProps {
  roomId: string
  specs: EventSpecs | null
}

export function ConstraintHeader({ roomId, specs }: ConstraintHeaderProps) {
  const [isPending, startTransition] = React.useTransition()

  const handleSetSpecs = () => {
    startTransition(async () => {
      try {
        await setRoomSpecs({
          data: {
            roomId,
            specs: DEFAULT_SPECS,
          },
        })
      } catch (err) {
        console.error("Failed to set demo specs:", err)
      }
    })
  }

  return (
    <Card
      data-testid="constraint-header"
      className="p-4 border-border bg-card/60 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Event Specification
            </span>
            {specs ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-status-met" />
            ) : (
              <span className="inline-flex h-2 w-2 rounded-full bg-status-pending animate-pulse" />
            )}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {specs?.eventName ?? "No Event Specs Configured"}
          </h2>
        </div>

        {specs ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="rounded border border-border/60 bg-muted/30 p-2">
              <span className="block text-muted-foreground font-mono text-[10px] uppercase">
                Date
              </span>
              <span className="font-mono font-medium">{specs.targetDate}</span>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 p-2">
              <span className="block text-muted-foreground font-mono text-[10px] uppercase">
                Guests
              </span>
              <span className="font-mono font-medium">{specs.guestCount}</span>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 p-2">
              <span className="block text-muted-foreground font-mono text-[10px] uppercase">
                Max Budget
              </span>
              <span className="font-mono font-medium">
                ${specs.maxBudget.toLocaleString()}
              </span>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 p-2">
              <span className="block text-muted-foreground font-mono text-[10px] uppercase">
                Curfew
              </span>
              <span className="font-mono font-medium">{specs.requiredCurfew}</span>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 p-2">
              <span className="block text-muted-foreground font-mono text-[10px] uppercase">
                AV Setup
              </span>
              <span className="font-mono font-medium">
                {specs.avRequired ? "Required" : "Optional"}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            data-testid="set-demo-specs-button"
            variant="outline"
            size="sm"
            onClick={handleSetSpecs}
            disabled={isPending}
            className="text-xs font-mono"
          >
            {isPending ? "Setting..." : specs ? "Reset Demo Specs" : "Set Demo Specs"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
