import type { EventSpecs, Role } from "@dealrelay/shared"
import { Calendar, Users, Wallet, Moon, Volume2 } from "lucide-react"

interface ConstraintHeaderProps {
  roomId: string
  specs: EventSpecs | null
  role?: Role
}

export function ConstraintHeader({ specs, role }: ConstraintHeaderProps) {
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
      </div>

      {!specs && (
        <p className="text-xs text-muted-foreground font-sans">
          {role === "client"
            ? "Waiting for the agency to start the demo."
            : "Open Demo, then Actions, to set demo specs."}
        </p>
      )}

      {specs && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
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
      )}
    </div>
  )
}
