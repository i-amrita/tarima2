// shared contract v3. v2: optional attribution and actedBy. v3: client/agency feedback loop (reject, comment, revisions), additive.
export type Role = "agency" | "client"

export type VenueStatus =
  | "PENDING_AUDIT"
  | "REQUIRES_APPROVAL"
  /** feedback received, negotiator is redrafting the counter */
  | "REVISING"
  | "COUNTER_PROPOSED"
  | "ACCEPTED"
  /** client rejected the venue; terminal */
  | "REJECTED"

export type FeedbackKind = "comment" | "reject"

/** Human feedback on a proposal. Comments steer the negotiator; a reject closes the venue. */
export type ProposalFeedback = {
  id: string
  /** epoch ms */
  at: number
  by: Role
  kind: FeedbackKind
  text: string
}

export type EventSpecs = {
  eventName: string
  targetDate: string
  guestCount: number
  maxBudget: number
  /** HH:MM 24h */
  requiredCurfew: string
  avRequired: boolean
}

export type AgentAttribution = {
  agent: ActivityActor
  verb?: string
  model?: string
  latencyMs?: number
  tokens?: {
    prompt?: number
    completion?: number
    total?: number
  }
  viaRelay?: boolean
}

export type AuditResult = {
  budgetDelta: number
  capacityDelta: number
  violations: string[]
  counterStrategy: string
  draftCounterProposal: string
  actedBy?: ActivityActor
}

export type VenueProposal = {
  id: string
  name: string
  rawText: string
  quotedCost: number
  quotedCapacity: number
  quotedCurfew: string
  avIncluded: boolean
  status: VenueStatus
  audit?: AuditResult
  approvedBy?: Role
  actedBy?: ActivityActor
  /** human feedback in order; the negotiator reads this to redraft */
  feedback?: ProposalFeedback[]
  /** 0 for the first draft, +1 per redraft after feedback */
  revision?: number
}

export type NewVenueProposal = Omit<VenueProposal, "id" | "status" | "audit" | "approvedBy" | "actedBy" | "feedback" | "revision">

export type ActivityActor = "scout" | "finance" | "negotiator" | "client" | "agency" | "system"

export type ActivityEvent = {
  id: string
  /** epoch ms */
  at: number
  actor: ActivityActor
  message: string
  attribution?: AgentAttribution
  actedBy?: ActivityActor
}

export type RoomState = {
  specs: EventSpecs | null
  proposals: VenueProposal[]
  activity: ActivityEvent[]
}

export type RoomSocketMetadata = { role: Role }
export type RoomIncoming =
  | { type: "approve"; proposalId: string }
  /** client only; closes the venue (status REJECTED) */
  | { type: "reject"; proposalId: string; reason?: string }
  /** client or agency; steers the negotiator, which redrafts (REVISING, then REQUIRES_APPROVAL with revision+1) */
  | { type: "comment"; proposalId: string; text: string }
  | { type: "ping" }
export type RoomOutgoing = { type: "toast"; message: string }
