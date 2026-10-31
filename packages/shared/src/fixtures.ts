import type { EventSpecs, NewVenueProposal } from "./types.js"

export const DEFAULT_SPECS: EventSpecs = {
  eventName: "Northwind Product Launch",
  targetDate: "2026-11-20",
  guestCount: 500,
  maxBudget: 30000,
  requiredCurfew: "02:00",
  avRequired: true,
}

/** The two pre-authored simulation proposals (PRD scope item 2). */
export const VENUE_FIXTURES: NewVenueProposal[] = [
  {
    name: "The Grand Loft",
    rawText:
      "Hi! The Grand Loft can host your launch on Nov 20. Capacity 550 standing. Venue hire is $26,000 all in. Music must end by 12:00am per our noise license. AV package (projector, PA) is included.",
    quotedCost: 26000,
    quotedCapacity: 550,
    quotedCurfew: "00:00",
    avIncluded: true,
  },
  {
    name: "Warehouse 9",
    rawText:
      "Warehouse 9 is free on Nov 20. We fit 600 guests. Price is $34,000, plus a $4,000 cleaning deposit. We can run until 3am. Full AV rig is included.",
    quotedCost: 34000,
    quotedCapacity: 600,
    quotedCurfew: "03:00",
    avIncluded: true,
  },
]
