import type { EventSpecs, NewVenueProposal } from "./types.js"

export const DEFAULT_SPECS: EventSpecs = {
  eventName: "Northwind Product Launch",
  targetDate: "2026-12-12",
  guestCount: 120,
  maxBudget: 18000,
  requiredCurfew: "01:00",
  avRequired: true,
}

/** The two pre-authored simulation proposals (PRD scope item 2). */
export const VENUE_FIXTURES: NewVenueProposal[] = [
  {
    name: "The Grand Loft",
    rawText:
      "Hi! The Grand Loft can host your launch on Dec 12. Capacity 150 standing. Venue hire is $21,500 all in. Music must end by 11:00pm per our noise license. AV package (projector, PA) is included.",
    quotedCost: 21500,
    quotedCapacity: 150,
    quotedCurfew: "23:00",
    avIncluded: true,
  },
  {
    name: "Warehouse 9",
    rawText:
      "Warehouse 9 is free on Dec 12. We fit 110 guests. Price is $15,800. We can run until 2am. AV is not included, bring your own or rent ours for $1,900.",
    quotedCost: 15800,
    quotedCapacity: 110,
    quotedCurfew: "02:00",
    avIncluded: false,
  },
]
