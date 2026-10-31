import type { Role, VenueProposal } from "@dealrelay/shared"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ApprovalBarProps {
  role: Role
  proposals: VenueProposal[]
  onApprove: (proposalId: string) => void
}

export function ApprovalBar({ role, proposals, onApprove }: ApprovalBarProps) {
  const pendingApprovals = proposals.filter((p) => p.status === "REQUIRES_APPROVAL")

  if (pendingApprovals.length === 0) {
    return null
  }

  const count = pendingApprovals.length

  return (
    <div
      data-testid="approval-bar"
      className="rounded-lg border border-status-pending-border bg-status-pending p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-status-pending-foreground text-sm font-medium">
        <AlertCircle className="size-4 shrink-0 text-status-pending-foreground" />
        <span>
          <span className="font-display text-base font-normal">{count}</span>{" "}
          {count === 1 ? "counter-offer needs approval" : "counter-offers need approval"}
        </span>
      </div>

      <div className="space-y-2">
        {pendingApprovals.map((proposal) => {
          const rawStrategy = proposal.audit?.counterStrategy
            ? proposal.audit.counterStrategy.replace(/^(Strategy:\s*|Counter:\s*)/i, "")
            : "Counter draft prepared"
          const strategy =
            rawStrategy.length > 60 ? rawStrategy.slice(0, 57) + "..." : rawStrategy

          return (
            <div
              key={proposal.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-t border-status-pending-border/60 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-sans text-sm font-medium text-foreground truncate">
                  {proposal.name}
                </span>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {strategy}
                </span>
              </div>

              <div className="shrink-0 self-end sm:self-auto">
                {role === "client" ? (
                  <Button
                    data-testid="approve-button"
                    size="sm"
                    onClick={() => onApprove(proposal.id)}
                    className="h-7 px-3 text-xs font-sans font-medium bg-primary text-primary-foreground hover:bg-neutral-800 rounded shadow-none cursor-pointer"
                  >
                    <span className="sr-only">Approve Counter-Offer</span>
                    <span aria-hidden="true">Approve</span>
                  </Button>
                ) : (
                  <div
                    data-testid="approval-waiting-state"
                    className="flex items-center gap-1.5 text-xs text-status-pending-foreground font-sans"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-status-pending-foreground shrink-0" />
                    <span>waiting for client</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
