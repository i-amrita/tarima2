import type { RoomState } from "@dealrelay/shared"
import { DEFAULT_SPECS } from "@dealrelay/shared/fixtures"

export const FEEDBACK_DEMO_STATE: RoomState = {
  specs: DEFAULT_SPECS,
  proposals: [
    {
      id: "p1",
      name: "The Grand Loft",
      rawText:
        "Hi! The Grand Loft can host your launch on Nov 20. Capacity 550 standing. Venue hire is $26,000 all in. Music must end by 12:00am per our noise license. AV package (projector, PA) is included.",
      quotedCost: 26000,
      quotedCapacity: 550,
      quotedCurfew: "00:00",
      avIncluded: true,
      status: "REVISING",
      revision: 1,
      audit: {
        budgetDelta: 4000,
        capacityDelta: 50,
        violations: ["curfew earlier than required"],
        counterStrategy: "request curfew extension to 02:00",
        draftCounterProposal: "We propose to proceed if you can extend curfew to 02:00.",
        actedBy: "negotiator",
      },
      feedback: [
        {
          id: "fb-1",
          at: Date.now() - 120000,
          by: "client",
          kind: "comment",
          text: "Tell the negotiator to push the curfew to 02:00 or we walk.",
        },
        {
          id: "fb-2",
          at: Date.now() - 60000,
          by: "agency",
          kind: "comment",
          text: "Agreed with client. Make curfew extension mandatory for contract.",
        },
      ],
    },
    {
      id: "p2",
      name: "Warehouse 9",
      rawText:
        "Warehouse 9 is free on Nov 20. We fit 600 guests. Price is $34,000, plus a $4,000 cleaning deposit. We can run until 3am. Full AV rig is included.",
      quotedCost: 34000,
      quotedCapacity: 600,
      quotedCurfew: "03:00",
      avIncluded: true,
      status: "REJECTED",
      revision: 0,
      audit: {
        budgetDelta: -8000,
        capacityDelta: 100,
        violations: ["budget exceeds $30,000 limit", "cleaning deposit required"],
        counterStrategy: "request removal of cleaning deposit",
        draftCounterProposal: "We can book if the cleaning deposit is waived.",
        actedBy: "negotiator",
      },
      feedback: [
        {
          id: "fb-3",
          at: Date.now() - 30000,
          by: "client",
          kind: "reject",
          text: "Over budget limit and deposit is non-negotiable.",
        },
      ],
    },
  ],
  activity: [
    {
      id: "a1",
      at: Date.now() - 300000,
      actor: "system",
      message: "Specs set for Northwind Product Launch",
    },
    {
      id: "a2",
      at: Date.now() - 240000,
      actor: "scout",
      message: "Extracted facts: cost $26,000, capacity 550, curfew 00:00, AV included",
      attribution: { agent: "scout", verb: "extracted" },
    },
    {
      id: "a3",
      at: Date.now() - 180000,
      actor: "finance",
      message: "Audit complete: budget delta $4,000, capacity delta 50. Violations: curfew earlier than required",
      attribution: { agent: "finance", verb: "audited" },
    },
    {
      id: "a4",
      at: Date.now() - 120000,
      actor: "negotiator",
      message: "Counter strategy: request curfew extension to 02:00",
      attribution: { agent: "negotiator", verb: "strategized" },
    },
    {
      id: "a5",
      at: Date.now() - 60000,
      actor: "client",
      message: "Client feedback received: Tell the negotiator to push the curfew to 02:00 or we walk.",
      attribution: { agent: "client", verb: "steered" },
    },
    {
      id: "a6",
      at: Date.now() - 10000,
      actor: "negotiator",
      message: "Negotiator is revising counter proposal based on client steering...",
      attribution: { agent: "negotiator", verb: "revising" },
    },
  ],
}
