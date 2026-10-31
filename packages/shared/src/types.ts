// shared contract v2. Bumped from v1: added optional attribution and actedBy fields.
export type Role = "agency" | "client"

export type VenueStatus = "PENDING_AUDIT" | "REQUIRES_APPROVAL" | "COUNTER_PROPOSED" | "ACCEPTED"

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
}

export type NewVenueProposal = Omit<VenueProposal, "id" | "status" | "audit" | "approvedBy" | "actedBy">

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
export type RoomIncoming = { type: "approve"; proposalId: string } | { type: "ping" }
export type RoomOutgoing = { type: "toast"; message: string }
