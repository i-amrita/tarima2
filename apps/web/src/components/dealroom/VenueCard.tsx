import * as React from "react"
import type { EventSpecs, VenueProposal, VenueStatus } from "@dealrelay/shared"
import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { evaluateConstraints } from "@/lib/constraints"
import { ConstraintBadge } from "./ConstraintBadge"
import { cn } from "@/lib/utils"

interface VenueCardProps {
  proposal: VenueProposal
  specs: EventSpecs | null
}

function getStatusInfo(status: VenueStatus) {
  switch (status) {
    case "ACCEPTED":
      return {
        label: "Accepted",
        className: "bg-status-met text-status-met-foreground border-status-met-border",
      }
    case "REQUIRES_APPROVAL":
      return {
        label: "Requires approval",
        className: "bg-status-pending text-status-pending-foreground border-status-pending-border",
      }
    case "COUNTER_PROPOSED":
      return {
        label: "Counter proposed",
        className: "bg-status-pending text-status-pending-foreground border-status-pending-border",
      }
    case "PENDING_AUDIT":
    default:
      return {
        label: "Pending audit",
        className: "bg-muted text-muted-foreground border-border",
      }
  }
}

export function VenueCard({ proposal, specs }: VenueCardProps) {
  const constraints = React.useMemo(
    () => evaluateConstraints(specs, proposal),
    [specs, proposal],
  )

  const statusInfo = getStatusInfo(proposal.status)

  const constraintValues: Record<string, string> = {
    budget: `$${proposal.quotedCost.toLocaleString()}`,
    capacity: `${proposal.quotedCapacity}`,
    curfew: proposal.quotedCurfew,
    av: "AV",
  }

  return (
    <div
      data-testid={`proposal-card-${proposal.id}`}
      className="rounded-[10px] border border-border bg-card p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      {/* Row 1: venue name left; status chip right */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-foreground font-sans tracking-tight">
          {proposal.name}
        </h3>

        <div className="flex items-center gap-2">
          {proposal.approvedBy && (
            <span className="text-xs font-mono text-muted-foreground">
              Approved by {proposal.approvedBy}
            </span>
          )}
          <span
            data-testid={`proposal-status-${proposal.id}`}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-sans font-medium transition-colors",
              statusInfo.className,
            )}
          >
            {statusInfo.label}
            <span className="sr-only">{proposal.status.replace("_", " ")}</span>
          </span>
        </div>
      </div>

      {/* Row 2: four constraint chips */}
      <div className="flex flex-wrap items-center gap-2">
        {constraints.map((c) => (
          <ConstraintBadge
            key={c.id}
            id={c.id}
            label={c.label}
            status={c.status}
            detail={c.detail}
            value={constraintValues[c.id]}
          />
        ))}
      </div>

      {/* Row 3 (only when audit exists): one-line agent strategy */}
      {proposal.audit && (
        <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-actor-negotiator shrink-0" />
          <span className="truncate">
            Counter: {proposal.audit.counterStrategy.replace(/^(Strategy:\s*|Counter:\s*)/i, "")}
          </span>
        </div>
      )}

      {/* Row 4 (collapsed by default): Vendor email disclosure */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-sans transition-colors cursor-pointer group">
          <ChevronDown className="size-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
          <span>Vendor email</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="text-xs font-sans italic text-muted-foreground bg-muted/40 rounded-md p-3 border border-border/40 leading-relaxed">
            "{proposal.rawText}"
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
