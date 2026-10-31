import * as React from "react"
import type { Role, VenueProposal } from "@dealrelay/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

  return (
    <div data-testid="approval-bar" className="space-y-3">
      {pendingApprovals.map((proposal) => (
        <Card
          key={proposal.id}
          className="p-4 border-status-pending/40 bg-status-pending/5 backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-status-pending/40 bg-status-pending/10 text-status-pending text-xs font-mono"
                >
                  Action Required
                </Badge>
                <span className="font-semibold text-sm">
                  Counter-Proposal Ready: {proposal.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {proposal.audit?.counterStrategy ?? "Negotiation counter draft prepared by agents"}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {role === "client" ? (
                <Button
                  data-testid="approve-button"
                  onClick={() => onApprove(proposal.id)}
                  className="bg-primary text-primary-foreground text-xs font-mono hover:opacity-90 shadow-sm"
                >
                  Approve Counter-Offer
                </Button>
              ) : (
                <div
                  data-testid="approval-waiting-state"
                  className="flex items-center gap-2 text-xs font-mono text-status-pending"
                >
                  <span className="h-2 w-2 rounded-full bg-status-pending animate-pulse" />
                  <span>Waiting for client approval...</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
