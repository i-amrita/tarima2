import { Actor, Emittable, Persisted } from "durable-actors"
import type {
  ActivityActor,
  ActivityEvent,
  AgentAttribution,
  AuditResult,
  EventSpecs,
  NewVenueProposal,
  Role,
  RoomIncoming,
  RoomOutgoing,
  RoomSocketMetadata,
  RoomState,
  VenueProposal,
} from "@dealrelay/shared"
import {
  addProposal,
  applyApproval,
  applyAudit,
  applyComment,
  applyReject,
  applyRevision,
  applyVendorAcceptance,
  handleIncomingMessage,
  pushActivity,
} from "./transitions.js"

export class RoomActor extends Actor<RoomSocketMetadata, RoomIncoming, RoomOutgoing> {
  @Persisted @Emittable specs: EventSpecs | null = null
  @Persisted @Emittable proposals: VenueProposal[] = []
  @Persisted @Emittable activity: ActivityEvent[] = []
  @Persisted private nextId = 1
  @Persisted private nextActivityId = 1
  @Persisted private nextFeedbackId = 1

  async setSpecs(specs: EventSpecs): Promise<void> {
    this.specs = specs
    await this.log("system", `Specs set for ${specs.eventName}`)
  }

  async injectProposal(proposal: NewVenueProposal): Promise<string> {
    const id = `p${this.nextId++}`
    this.proposals = addProposal(this.proposals, id, proposal)
    await this.log("system", `Proposal received from ${proposal.name}`)
    return id
  }

  async submitAudit(proposalId: string, audit: AuditResult): Promise<void> {
    const actedBy = audit.actedBy ?? "negotiator"
    const existing = this.proposals.find((p) => p.id === proposalId)
    const isRevision = existing?.status === "REVISING"
    this.proposals = applyAudit(this.proposals, proposalId, audit, actedBy)
    const updated = this.proposals.find((p) => p.id === proposalId)
    const rev = updated?.revision ?? 0
    await this.log(
      "negotiator",
      isRevision
        ? `Revision ${rev} complete for ${proposalId}: ${audit.violations.length} violation(s)`
        : `Audit complete for ${proposalId}: ${audit.violations.length} violation(s)`,
      { agent: "negotiator", verb: isRevision ? "revised" : "audited" },
      actedBy,
    )
  }

  async submitRevision(proposalId: string, audit: AuditResult): Promise<void> {
    const actedBy = audit.actedBy ?? "negotiator"
    this.proposals = applyRevision(this.proposals, proposalId, audit, actedBy)
    const updated = this.proposals.find((p) => p.id === proposalId)
    const rev = updated?.revision ?? 1
    await this.log(
      "negotiator",
      `Revision ${rev} complete for ${proposalId}: ${audit.violations.length} violation(s)`,
      { agent: "negotiator", verb: "revised" },
      actedBy,
    )
  }

  async recordComment(proposalId: string, role: Role, text: string): Promise<void> {
    const feedbackId = `f${this.nextFeedbackId++}`
    this.proposals = applyComment(this.proposals, proposalId, role, text, feedbackId)
    await this.log(
      role,
      `Feedback on ${proposalId}: "${text}"`,
      { agent: role, verb: "commented" },
      role,
    )
  }

  async recordReject(proposalId: string, role: Role, reason?: string): Promise<void> {
    const feedbackId = reason ? `f${this.nextFeedbackId++}` : undefined
    this.proposals = applyReject(this.proposals, proposalId, role, reason, feedbackId)
    await this.log(
      role,
      `Rejected proposal ${proposalId}${reason ? `: "${reason}"` : ""}`,
      { agent: role, verb: "rejected" },
      role,
    )
  }

  async recordApproval(proposalId: string, role: Role): Promise<void> {
    this.proposals = applyApproval(this.proposals, proposalId, role)
    await this.log(role, `Approved counter for ${proposalId}`)
  }

  async recordVendorAcceptance(proposalId: string): Promise<void> {
    this.proposals = applyVendorAcceptance(this.proposals, proposalId)
    await this.log("system", `Vendor accepted counter for ${proposalId}`)
  }

  async getState(): Promise<RoomState> {
    return {
      specs: this.specs,
      proposals: this.proposals,
      activity: this.activity,
    }
  }

  async appendActivity(
    actor: ActivityActor,
    message: string,
    attribution?: AgentAttribution,
    actedBy?: ActivityActor,
  ): Promise<void> {
    await this.log(actor, message, attribution, actedBy)
  }

  async onMessage(
    socket: { metadata: RoomSocketMetadata; send(message: RoomOutgoing): void },
    message: RoomIncoming,
  ): Promise<void> {
    let roomId = "unknown"
    try {
      roomId = this.id
    } catch {
      // Unit tests without full runtime context
    }

    await handleIncomingMessage(
      {
        recordApproval: (pid, role) => this.recordApproval(pid, role),
        recordReject: (pid, role, reason) => this.recordReject(pid, role, reason),
        recordComment: (pid, role, text) => this.recordComment(pid, role, text),
        broadcast: (msg) => this.broadcast(msg),
        id: roomId,
      },
      socket,
      message,
    )
  }

  private async log(
    actor: ActivityActor,
    message: string,
    attribution?: AgentAttribution,
    actedBy?: ActivityActor,
  ): Promise<void> {
    this.activity = pushActivity(this.activity, {
      id: `a${this.nextActivityId++}`,
      at: Date.now(),
      actor,
      message,
      attribution: attribution ?? { agent: actor, verb: "announced" },
      actedBy: actedBy ?? actor,
    })
  }
}
