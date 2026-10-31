import type { EventSpecs, VenueProposal } from "@dealrelay/shared"

export type ConstraintStatus = "met" | "violated" | "pending"

export interface EvaluatedConstraint {
  id: "budget" | "capacity" | "curfew" | "av"
  label: string
  status: ConstraintStatus
  detail: string
}

function parseTimeMinutes(timeStr: string): number {
  const [hoursStr = "0", minsStr = "0"] = timeStr.split(":")
  const hours = parseInt(hoursStr, 10) || 0
  const mins = parseInt(minsStr, 10) || 0
  // Handle curfew past midnight (e.g. 01:00 or 02:00 vs 23:00)
  // Times between 00:00 and 06:00 are considered early morning (next day)
  const adjustedHours = hours < 6 ? hours + 24 : hours
  return adjustedHours * 60 + mins
}

export function isCurfewViolated(quotedCurfew: string, requiredCurfew: string): boolean {
  const quotedMins = parseTimeMinutes(quotedCurfew)
  const requiredMins = parseTimeMinutes(requiredCurfew)
  // If quoted ends earlier than required, it is a curfew violation
  return quotedMins < requiredMins
}

export function evaluateConstraints(
  specs: EventSpecs | null,
  proposal: VenueProposal,
): EvaluatedConstraint[] {
  if (!specs) {
    return [
      { id: "budget", label: "Budget", status: "pending", detail: `$${proposal.quotedCost.toLocaleString()}` },
      { id: "capacity", label: "Capacity", status: "pending", detail: `${proposal.quotedCapacity} guests` },
      { id: "curfew", label: "Curfew", status: "pending", detail: proposal.quotedCurfew },
      { id: "av", label: "AV", status: "pending", detail: proposal.avIncluded ? "Included" : "Not included" },
    ]
  }

  const isPendingAudit = proposal.status === "PENDING_AUDIT"
  const auditViolations = proposal.audit?.violations ?? []

  // 1. Budget
  let budgetStatus: ConstraintStatus
  let budgetDetail: string
  const budgetViolated = auditViolations.some((v) => v.toLowerCase().includes("budget")) || proposal.quotedCost > specs.maxBudget

  if (isPendingAudit) {
    budgetStatus = "pending"
    budgetDetail = `$${proposal.quotedCost.toLocaleString()}`
  } else if (budgetViolated) {
    budgetStatus = "violated"
    const diff = proposal.quotedCost - specs.maxBudget
    budgetDetail = `$${proposal.quotedCost.toLocaleString()} (+$${diff.toLocaleString()} over)`
  } else {
    budgetStatus = "met"
    budgetDetail = `$${proposal.quotedCost.toLocaleString()} (max $${specs.maxBudget.toLocaleString()})`
  }

  // 2. Capacity
  let capacityStatus: ConstraintStatus
  let capacityDetail: string
  const capacityViolated = auditViolations.some((v) => v.toLowerCase().includes("capacity")) || proposal.quotedCapacity < specs.guestCount

  if (isPendingAudit) {
    capacityStatus = "pending"
    capacityDetail = `${proposal.quotedCapacity} guests`
  } else if (capacityViolated) {
    capacityStatus = "violated"
    const diff = specs.guestCount - proposal.quotedCapacity
    capacityDetail = `${proposal.quotedCapacity} (${diff} short of ${specs.guestCount})`
  } else {
    capacityStatus = "met"
    capacityDetail = `${proposal.quotedCapacity} fits ${specs.guestCount}`
  }

  // 3. Curfew
  let curfewStatus: ConstraintStatus
  let curfewDetail: string
  const curfewViolated = auditViolations.some((v) => v.toLowerCase().includes("curfew")) || isCurfewViolated(proposal.quotedCurfew, specs.requiredCurfew)

  if (isPendingAudit) {
    curfewStatus = "pending"
    curfewDetail = proposal.quotedCurfew
  } else if (curfewViolated) {
    curfewStatus = "violated"
    curfewDetail = `${proposal.quotedCurfew} (req: ${specs.requiredCurfew})`
  } else {
    curfewStatus = "met"
    curfewDetail = `${proposal.quotedCurfew} meets ${specs.requiredCurfew}`
  }

  // 4. AV
  let avStatus: ConstraintStatus
  let avDetail: string
  const avViolated = specs.avRequired && !proposal.avIncluded

  if (isPendingAudit) {
    avStatus = "pending"
    avDetail = proposal.avIncluded ? "Included" : "Not included"
  } else if (avViolated) {
    avStatus = "violated"
    avDetail = "Required but missing"
  } else {
    avStatus = "met"
    avDetail = proposal.avIncluded ? "Included" : "Not required"
  }

  return [
    { id: "budget", label: "Budget", status: budgetStatus, detail: budgetDetail },
    { id: "capacity", label: "Capacity", status: capacityStatus, detail: capacityDetail },
    { id: "curfew", label: "Curfew", status: curfewStatus, detail: curfewDetail },
    { id: "av", label: "AV", status: avStatus, detail: avDetail },
  ]
}
