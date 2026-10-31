import type { Role, VenueProposal } from "@dealrelay/shared"
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation"

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
        <Confirmation key={proposal.id} approval={{ id: proposal.id }} state="approval-requested">
          <ConfirmationTitle>
            <span className="font-semibold">Counter-Proposal Ready: {proposal.name}</span>
            <span className="block text-xs text-muted-foreground font-mono">
              {proposal.audit?.counterStrategy ?? "Negotiation counter draft prepared by agents"}
            </span>
          </ConfirmationTitle>
          <ConfirmationRequest>
            {role === "client" ? (
              <ConfirmationActions>
                <ConfirmationAction data-testid="approve-button" onClick={() => onApprove(proposal.id)}>
                  Approve Counter-Offer
                </ConfirmationAction>
              </ConfirmationActions>
            ) : (
              <div data-testid="approval-waiting-state" className="flex items-center gap-2 text-xs font-mono text-status-pending">
                <span className="h-2 w-2 rounded-full bg-status-pending animate-pulse" />
                <span>Waiting for client approval...</span>
              </div>
            )}
          </ConfirmationRequest>
        </Confirmation>
      ))}
    </div>
  )
}
