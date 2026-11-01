import * as React from "react"
import type { EventSpecs, Role, VenueProposal, VenueStatus } from "@dealrelay/shared"
import { ChevronDown, Send } from "lucide-react"
import { TextShimmer } from "@/components/ai-elements/shimmer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { evaluateConstraints } from "@/lib/constraints"
import { ConstraintBadge } from "./ConstraintBadge"
import { cn } from "@/lib/utils"

interface VenueCardProps {
  proposal: VenueProposal
  specs: EventSpecs | null
  role?: Role
  onApprove?: (proposalId: string) => void
  onReject?: (proposalId: string, reason?: string) => void
  onComment?: (proposalId: string, text: string) => void
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
    case "REVISING":
      return {
        label: "Revising",
        className: "bg-status-pending/50 text-status-pending-foreground border-status-pending-border/60",
      }
    case "COUNTER_PROPOSED":
      return {
        label: "Counter proposed",
        className: "bg-status-pending text-status-pending-foreground border-status-pending-border",
      }
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-muted text-muted-foreground border-border opacity-70",
      }
    case "PENDING_AUDIT":
    default:
      return {
        label: "Pending audit",
        className: "bg-muted text-muted-foreground border-border",
      }
  }
}

/** Drop a leading "Strategy:" or "Counter:" label and avoid repeating "Counter" in the line. */
function counterLine(counterStrategy: string): string {
  const text = counterStrategy.replace(/^(Strategy:\s*|Counter:\s*)/i, "")
  return /^counter\b/i.test(text) ? text : `Counter: ${text}`
}

export function VenueCard({
  proposal,
  specs,
  role = "agency",
  onApprove,
  onReject,
  onComment,
}: VenueCardProps) {
  const [isConfirmingReject, setIsConfirmingReject] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState("")
  const [commentText, setCommentText] = React.useState("")

  const constraints = React.useMemo(
    () => evaluateConstraints(specs, proposal),
    [specs, proposal],
  )

  const statusInfo = getStatusInfo(proposal.status)
  const isRejected = proposal.status === "REJECTED"
  const isRevising = proposal.status === "REVISING"
  const isPendingApproval = proposal.status === "REQUIRES_APPROVAL"

  const constraintValues: Record<string, string> = {
    budget: `$${proposal.quotedCost.toLocaleString()}`,
    capacity: `${proposal.quotedCapacity}`,
    curfew: proposal.quotedCurfew,
    av: "AV",
  }

  const handleConfirmReject = () => {
    onReject?.(proposal.id, rejectReason.trim() || undefined)
    setIsConfirmingReject(false)
    setRejectReason("")
  }

  const handleSendComment = () => {
    if (!commentText.trim()) return
    onComment?.(proposal.id, commentText.trim())
    setCommentText("")
  }

  return (
    <div
      data-testid={`proposal-card-${proposal.id}`}
      className={cn(
        "rounded-[10px] border border-border bg-card p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all",
        isRejected && "bg-muted/20 border-border/60 opacity-80",
      )}
    >
      {/* Row 1: venue name left; revision pill + status chip right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={cn(
            "text-[17px] font-semibold text-foreground font-sans tracking-tight truncate",
            isRejected && "line-through text-muted-foreground",
          )}>
            {proposal.name}
          </h3>
          {typeof proposal.revision === "number" && proposal.revision > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
              rev {proposal.revision}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {proposal.approvedBy && (
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
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

      {/* Row 3: status-specific quiet row */}
      {isRevising ? (
        <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-actor-negotiator shrink-0 animate-pulse" />
          <TextShimmer duration={2} className="text-xs font-sans text-muted-foreground">
            Negotiator is revising
          </TextShimmer>
        </div>
      ) : proposal.audit ? (
        <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-actor-negotiator shrink-0" />
          <span className="truncate">
            {counterLine(proposal.audit.counterStrategy)}
          </span>
        </div>
      ) : null}

      {/* Row 4 (collapsed by default): Vendor email disclosure */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-sans transition-colors cursor-pointer group">
          <ChevronDown className="size-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
          <span>Vendor email</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="text-xs font-sans italic text-muted-foreground bg-muted/40 rounded-md p-3 border border-border/40 leading-relaxed">
            &quot;{proposal.rawText}&quot;
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Feedback controls row (when proposal is in REQUIRES_APPROVAL) */}
      {isPendingApproval && (
        <div className="pt-3 border-t border-border/60 space-y-3">
          {/* Client action buttons */}
          {role === "client" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  data-testid="approve-button"
                  size="sm"
                  onClick={() => onApprove?.(proposal.id)}
                  className="h-8 px-3 text-xs font-sans font-medium bg-primary text-primary-foreground hover:bg-neutral-800 rounded shadow-none cursor-pointer"
                >
                  <span className="sr-only">Approve Counter-Offer</span>
                  <span aria-hidden="true">Approve</span>
                </Button>

                {!isConfirmingReject ? (
                  <Button
                    data-testid={`reject-${proposal.id}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsConfirmingReject(true)}
                    className="h-8 px-3 text-xs font-sans font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                  >
                    Reject
                  </Button>
                ) : null}
              </div>

              {/* Inline reject confirmation */}
              {isConfirmingReject && (
                <div className="p-2.5 rounded-md bg-destructive/5 border border-destructive/20 space-y-2">
                  <div className="text-xs font-sans text-destructive font-medium">
                    Confirm rejection for {proposal.name}
                  </div>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    className="w-full h-8 px-2.5 text-xs font-sans rounded border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleConfirmReject}
                      className="h-7 px-3 text-xs font-sans font-medium cursor-pointer"
                    >
                      Confirm reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsConfirmingReject(false)
                        setRejectReason("")
                      }}
                      className="h-7 px-2.5 text-xs font-sans text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comment / steer composer for both Client and Agency */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-muted-foreground tracking-wider">
              Steer negotiator
            </div>
            <div className="space-y-2">
              <Textarea
                data-testid={`comment-input-${proposal.id}`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Tell the negotiator what to change, e.g. push the budget to 28k"
                className="min-h-16 text-xs bg-background resize-y"
              />
              <div className="flex justify-end">
                <Button
                  data-testid={`comment-send-${proposal.id}`}
                  size="sm"
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  className="h-7 px-3 text-xs font-sans font-medium bg-primary text-primary-foreground hover:bg-neutral-800 rounded shadow-none cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="size-3" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
