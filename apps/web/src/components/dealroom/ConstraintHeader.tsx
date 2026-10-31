import * as React from "react"
import type { EventSpecs } from "@dealrelay/shared"
import { DEFAULT_SPECS } from "@dealrelay/shared/fixtures"
import { Calendar, Users, Wallet, Moon, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div data-testid="constraint-header" className="space-y-3">
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase bg-muted text-muted-foreground select-none">
          PROCUREMENT DEAL ROOM
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <h1
          className="text-4xl sm:text-5xl font-normal tracking-[-0.02em] text-foreground font-display"
        >
          {specs
            ? specs.eventName.endsWith(".")
              ? specs.eventName
              : `${specs.eventName}.`
            : "No event on the books yet."}
        </h1>

        {!specs && (
          <Button
            data-testid="set-demo-specs-button"
            variant="default"
            size="sm"
            onClick={handleSetSpecs}
            disabled={isPending}
            className="text-xs font-sans bg-primary text-primary-foreground hover:bg-neutral-800 rounded-md shadow-none self-start sm:self-auto cursor-pointer"
          >
            {isPending ? "Setting..." : "Set demo specs"}
          </Button>
        )}
      </div>

      {specs && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>{specs.targetDate}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
              <Users className="size-3.5 text-muted-foreground" />
              <span>{specs.guestCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
              <Wallet className="size-3.5 text-muted-foreground" />
              <span>${specs.maxBudget.toLocaleString()} max</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
              <Moon className="size-3.5 text-muted-foreground" />
              <span>{specs.requiredCurfew}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-mono">
              <Volume2 className="size-3.5 text-muted-foreground" />
              <span>AV {specs.avRequired ? "Required" : "Optional"}</span>
            </span>
          </div>

          <Button
            data-testid="set-demo-specs-button"
            variant="ghost"
            size="sm"
            onClick={handleSetSpecs}
            disabled={isPending}
            className="h-7 px-2 text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-transparent shadow-none cursor-pointer"
          >
            {isPending ? "Setting..." : "Reset demo specs"}
          </Button>
        </div>
      )}
    </div>
  )
}
