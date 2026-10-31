import * as React from "react"
import type { EventSpecs, VenueProposal, VenueStatus } from "@dealrelay/shared"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { evaluateConstraints } from "@/lib/constraints"
import { ConstraintBadge } from "./ConstraintBadge"
import { cn } from "@/lib/utils"

interface VenueCardProps {
  proposal: VenueProposal
  specs: EventSpecs | null
}

function getStatusBadgeClass(status: VenueStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "border-status-met/40 bg-status-met/10 text-status-met"
    case "REQUIRES_APPROVAL":
      return "border-status-pending/40 bg-status-pending/10 text-status-pending"
    case "COUNTER_PROPOSED":
      return "border-status-pending/30 bg-status-pending/10 text-status-pending"
    case "PENDING_AUDIT":
    default:
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
  }
}

export function VenueCard({ proposal, specs }: VenueCardProps) {
  const constraints = React.useMemo(
    () => evaluateConstraints(specs, proposal),
    [specs, proposal],
  )

  return (
    <Card
      data-testid={`proposal-card-${proposal.id}`}
      className="p-5 border-border bg-card/80 backdrop-blur-sm space-y-4 hover:border-border/80 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{proposal.id}</span>
            <Badge
              data-testid={`proposal-status-${proposal.id}`}
              variant="outline"
              className={cn("text-xs font-mono uppercase", getStatusBadgeClass(proposal.status))}
            >
              {proposal.status.replace("_", " ")}
            </Badge>
          </div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {proposal.name}
          </h3>
        </div>

        {proposal.approvedBy && (
          <Badge variant="secondary" className="text-[11px] font-mono">
            Approved by {proposal.approvedBy}
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground italic rounded bg-muted/20 p-2.5 border border-border/40 font-mono">
        "{proposal.rawText}"
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Constraint Audit
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {constraints.map((c) => (
            <ConstraintBadge
              key={c.id}
              id={c.id}
              label={c.label}
              status={c.status}
              detail={c.detail}
            />
          ))}
        </div>
      </div>

      {proposal.audit && (
        <>
          <Separator className="bg-border/60" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground uppercase">Agent Strategy</span>
              <span className="text-status-pending">
                {proposal.audit.violations.length} violation(s) identified
              </span>
            </div>

            <div className="rounded border border-border/60 bg-muted/30 p-2.5 space-y-1 font-mono text-[11px]">
              <div className="text-foreground font-semibold">
                Strategy: {proposal.audit.counterStrategy}
              </div>
              <div className="text-muted-foreground">
                Draft: {proposal.audit.draftCounterProposal}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
