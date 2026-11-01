import type { EventSpecs, Role, VenueProposal } from "@dealrelay/shared"
import { VenueCard } from "./VenueCard"

interface ComparisonCanvasProps {
  roomId: string
  role: Role
  specs: EventSpecs | null
  proposals: VenueProposal[]
  onApprove?: (proposalId: string) => void
  onReject?: (proposalId: string, reason?: string) => void
  onComment?: (proposalId: string, text: string) => void
}

export function ComparisonCanvas({
  role,
  specs,
  proposals,
  onApprove,
  onReject,
  onComment,
}: ComparisonCanvasProps) {
  return (
    <div data-testid="comparison-canvas" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-semibold text-foreground font-sans">
            Proposals
          </h2>
          <span className="text-sm font-sans text-muted-foreground">
            ({proposals.length})
          </span>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-sans">
          {role === "agency"
            ? "Open Demo, then Actions, to inject a proposal."
            : "Waiting for the agency to start the demo."}
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <VenueCard
              key={proposal.id}
              proposal={proposal}
              specs={specs}
              role={role}
              onApprove={onApprove}
              onReject={onReject}
              onComment={onComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
