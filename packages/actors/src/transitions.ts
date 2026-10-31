import type {
  ActivityActor,
  ActivityEvent,
  AuditResult,
  NewVenueProposal,
  Role,
  VenueProposal,
} from "@dealrelay/shared"

const ACTIVITY_CAP = 200

function mapProposal(
  proposals: VenueProposal[],
  id: string,
  fn: (p: VenueProposal) => VenueProposal,
): VenueProposal[] {
  if (!proposals.some((p) => p.id === id)) throw new Error(`unknown proposal ${id}`)
  return proposals.map((p) => (p.id === id ? fn(p) : p))
}

function requireStatus(p: VenueProposal, expected: VenueProposal["status"]): void {
  if (p.status !== expected) throw new Error(`proposal ${p.id} is ${p.status}, expected ${expected}`)
}

export function addProposal(proposals: VenueProposal[], id: string, input: NewVenueProposal): VenueProposal[] {
  return [...proposals, { ...input, id, status: "PENDING_AUDIT" }]
}

export function applyAudit(proposals: VenueProposal[], id: string, audit: AuditResult): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    requireStatus(p, "PENDING_AUDIT")
    return { ...p, audit, status: "REQUIRES_APPROVAL" }
  })
}

export function applyApproval(proposals: VenueProposal[], id: string, role: Role): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    requireStatus(p, "REQUIRES_APPROVAL")
    return { ...p, approvedBy: role, status: "COUNTER_PROPOSED" }
  })
}

export function applyVendorAcceptance(proposals: VenueProposal[], id: string): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    requireStatus(p, "COUNTER_PROPOSED")
    return { ...p, status: "ACCEPTED" }
  })
}

export function pushActivity(
  activity: ActivityEvent[],
  event: { id: string; at: number; actor: ActivityActor; message: string },
): ActivityEvent[] {
  return [...activity, event].slice(-ACTIVITY_CAP)
}
