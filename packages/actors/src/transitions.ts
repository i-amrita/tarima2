import type {
  ActivityActor,
  ActivityEvent,
  AuditResult,
  NewVenueProposal,
  ProposalFeedback,
  Role,
  RoomIncoming,
  RoomOutgoing,
  RoomSocketMetadata,
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
  return [...proposals, { ...input, id, status: "PENDING_AUDIT", revision: 0, feedback: [] }]
}

export function applyAudit(
  proposals: VenueProposal[],
  id: string,
  audit: AuditResult,
  actedBy: ActivityActor = audit.actedBy ?? "negotiator",
): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    if (p.status !== "PENDING_AUDIT" && p.status !== "REVISING") {
      throw new Error(`proposal ${p.id} is ${p.status}, expected PENDING_AUDIT or REVISING`)
    }
    const revision = p.status === "REVISING" ? (p.revision ?? 0) + 1 : (p.revision ?? 0)
    return { ...p, audit: { ...audit, actedBy }, status: "REQUIRES_APPROVAL", actedBy, revision }
  })
}

export function applyRevision(
  proposals: VenueProposal[],
  id: string,
  audit: AuditResult,
  actedBy: ActivityActor = audit.actedBy ?? "negotiator",
): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    requireStatus(p, "REVISING")
    const revision = (p.revision ?? 0) + 1
    return { ...p, audit: { ...audit, actedBy }, status: "REQUIRES_APPROVAL", actedBy, revision }
  })
}

export function applyComment(
  proposals: VenueProposal[],
  id: string,
  role: Role,
  text: string,
  feedbackId?: string,
): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    if (p.status === "REJECTED") throw new Error(`proposal ${p.id} is REJECTED, cannot comment`)
    if (p.status === "ACCEPTED") throw new Error(`proposal ${p.id} is ACCEPTED, cannot comment`)
    const feedbackItem: ProposalFeedback = {
      id: feedbackId ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      by: role,
      kind: "comment",
      text,
    }
    const feedback = [...(p.feedback ?? []), feedbackItem]
    return { ...p, status: "REVISING", feedback }
  })
}

export function applyReject(
  proposals: VenueProposal[],
  id: string,
  role: Role,
  reason?: string,
  feedbackId?: string,
): VenueProposal[] {
  return mapProposal(proposals, id, (p) => {
    if (p.status === "REJECTED") throw new Error(`proposal ${p.id} is already REJECTED`)
    if (p.status === "ACCEPTED") throw new Error(`proposal ${p.id} is ACCEPTED, cannot reject`)
    const feedback = [...(p.feedback ?? [])]
    if (reason) {
      feedback.push({
        id: feedbackId ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        by: role,
        kind: "reject",
        text: reason,
      })
    }
    return { ...p, status: "REJECTED", feedback: feedback.length > 0 ? feedback : p.feedback }
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
  event: ActivityEvent,
): ActivityEvent[] {
  return [...activity, event].slice(-ACTIVITY_CAP)
}

export type MessageHost = {
  recordApproval(proposalId: string, role: Role): Promise<void>
  recordReject(proposalId: string, role: Role, reason?: string): Promise<void>
  recordComment(proposalId: string, role: Role, text: string): Promise<void>
  broadcast(message: RoomOutgoing): void
  id?: string
  notifyRelay?(roomId: string, proposalId: string): Promise<void>
}

export async function handleIncomingMessage(
  host: MessageHost,
  socket: { metadata: RoomSocketMetadata; send(message: RoomOutgoing): void },
  message: RoomIncoming,
): Promise<void> {
  if (message.type === "approve") {
    if (socket.metadata.role !== "client") {
      socket.send({ type: "toast", message: "Only the client can approve" })
      return
    }
    await host.recordApproval(message.proposalId, "client")
    host.broadcast({ type: "toast", message: `Client approved ${message.proposalId}` })
    return
  }

  if (message.type === "reject") {
    if (socket.metadata.role !== "client") {
      socket.send({ type: "toast", message: "Only the client can reject" })
      return
    }
    await host.recordReject(message.proposalId, "client", message.reason)
    host.broadcast({ type: "toast", message: `Client rejected ${message.proposalId}` })
    return
  }

  if (message.type === "comment") {
    const role = socket.metadata.role
    if (role !== "client" && role !== "agency") {
      socket.send({ type: "toast", message: "Only client or agency can comment" })
      return
    }
    await host.recordComment(message.proposalId, role, message.text)
    host.broadcast({
      type: "toast",
      message: `${role === "client" ? "Client" : "Agency"} commented on ${message.proposalId}`,
    })

    let roomId = "unknown"
    try {
      if (host.id) roomId = host.id
    } catch {
      // Unit tests without full runtime context
    }

    if (host.notifyRelay) {
      await host.notifyRelay(roomId, message.proposalId)
    } else {
      const relayUrl = process.env.RELAY_URL ?? "http://127.0.0.1:7200"
      fetch(`${relayUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, proposalId: message.proposalId }),
      }).catch(() => {})
    }
    return
  }
}
