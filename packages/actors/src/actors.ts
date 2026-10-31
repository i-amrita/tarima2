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
  VenueProposal,
} from "@dealrelay/shared"
import { addProposal, applyApproval, applyAudit, applyVendorAcceptance, pushActivity } from "./transitions.js"

export class RoomActor extends Actor<RoomSocketMetadata, RoomIncoming, RoomOutgoing> {
  @Persisted @Emittable specs: EventSpecs | null = null
  @Persisted @Emittable proposals: VenueProposal[] = []
  @Persisted @Emittable activity: ActivityEvent[] = []
  @Persisted private nextId = 1
  @Persisted private nextActivityId = 1

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
    this.proposals = applyAudit(this.proposals, proposalId, audit, actedBy)
    await this.log(
      "negotiator",
      `Audit complete for ${proposalId}: ${audit.violations.length} violation(s)`,
      { agent: "negotiator", verb: "audited" },
      actedBy,
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
    if (message.type === "approve") {
      if (socket.metadata.role !== "client") {
        socket.send({ type: "toast", message: "Only the client can approve" })
        return
      }
      await this.recordApproval(message.proposalId, "client")
      this.broadcast({ type: "toast", message: `Client approved ${message.proposalId}` })
    }
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
