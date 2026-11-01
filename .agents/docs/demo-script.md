# DealRelay 90-Second Stage Demo Script

Status: live demo runbook (2026-10-31)
Target length: 90 seconds
Layout: Two browser windows side by side (Agency on the left at 960x1080, Client on the right at 960x1080).
Core architecture: Terse AI actor keeps state, Agent Relay is the agents' communication channel, TanStack Start delivers the real-time UI.

---

## 90-Second Beat Outline

| Beat | Time | Action & Click Order | Who Says What | Audience Notice |
|---|---|---|---|---|
| 1 | 0:00 - 0:12 | Open tiled windows (`?role=agency` left, `?role=client` right). Point out top role banners and "How it works". | "Welcome to DealRelay. On the left is Northwind Events, the agency. On the right is the corporate client. Autonomous agents handle the grunt work of venue procurement, but humans stay in the steering seat." | Notice role banners ("You are Northwind Events..." vs "You are the client..."). Connection indicator dot is green. |
| 2 | 0:12 - 0:25 | On Agency window, click "Set demo specs" (Nov 20, $30,000 budget, 500 guests, 02:00 curfew, AV required). | "The agency sets client constraints. Watch both windows sync in real time through the Terse actor over WebSocket." | Specs render identically as neutral requirement chips in both windows instantly. |
| 3 | 0:25 - 0:42 | On Agency window, click "Inject Grand Loft". | "A vendor proposal arrives by email. Scout parses raw terms, Finance audits constraints and flags a curfew violation, and Negotiator drafts a counter-offer over Agent Relay." | Activity feed streams in real time with agent attribution dots (Scout blue, Finance purple, Negotiator amber). The card updates to REQUIRES_APPROVAL. |
| 4 | 0:42 - 0:58 | On Client window, expand the card ("View details") and show feedback controls. Type in steer box: "Push curfew to 02:00 or reject". Click "Send". | "The client inspects the email and audit table. Instead of approving blindly, the client steers the agent. Watch the status transition to Revising with our real-time shimmer." | Expandable card shows raw email from Scout, audit deltas from Finance, and draft strategy from Negotiator. Steer composer sends feedback without page refresh. Status shows "Negotiator is revising". |
| 5 | 0:58 - 1:12 | Client clicks "Approve" on revised counter-offer. In Agency window, click "Vendor accepts". | "The client approves the terms. Both windows flip to Counter Proposed, and the vendor accepts. The deal is closed." | Client approval immediately updates both windows. Proposal flips to Accepted with green met chips. |
| 6 | 1:12 - 1:30 | In Demo menu, click "Kill actor". Refresh both browser tabs. Show preserved state. | "Now for the hard test. What if the server crashes mid-negotiation? We kill the Terse AI actor process. We reload both browsers. Everything, including feedback history and audit state, restores instantly from durable storage." | Complete recovery. State, proposal status, constraints, and feedback history remain intact. |

---

## Exact Presenter Click Order

1. **Agency window**: Click "How it works" popover to give judges a 3-second visual orientation of the 3-step pipeline (read emails, audit and counter, humans decide and steer). Close popover.
2. **Agency window**: Click "Set demo specs". Verify chip row renders on both windows.
3. **Agency window**: Click "Inject Grand Loft" in the Proposals toolbar.
4. **Both windows**: Watch the Agent Activity rail stream Scout, Finance, and Negotiator actions.
5. **Client window**: Click "View details" on The Grand Loft card. Point out:
   - Scout raw email
   - Finance audit table with budget delta ($26,000 vs $30,000 cap), capacity delta (550 vs 500 guests), and curfew violation
   - Negotiator counter strategy
6. **Client window**: In the "Steer negotiator" textarea, enter: `Push curfew to 02:00 or reject`. Click "Send".
7. **Client window**: Point out the "Negotiator is revising" status with shimmer.
8. **Client window**: Click "Approve" (primary ink button).
9. **Agency window**: Click "Vendor accepts".
10. **Agency window**: Open "Demo" dropdown, click "Kill actor". Wait 4 seconds.
11. **Both windows**: Press Command+R to reload. Show that the room state is restored.

---

## Key Pillars for the Audience

1. **Agents act autonomously**: Scout extracts structure, Finance checks numbers, Negotiator strategies are synthesized automatically.
2. **Humans steer with precision**: Clients and agencies do not just click yes/no; they comment, provide rationale, and request revisions before commitments are made.
3. **Terse AI actor guarantees durability**: The room is backed by a stateful durable actor. Restarts and network drops lose zero context.
4. **Agent Relay coordinates agents**: Relay routes communication between autonomous specialist agents without fragile point-to-point glue code.

---

## Stage Recovery Plan

If something unexpected happens during a live presentation, execute these exact fallbacks:

### Scenario A: Socket disconnected (Amber or Red dot in top bar)
- Cause: Local network switch or background actor pause.
- Action: Click the role switcher button to re-trigger route hydration, or press Command+R. The socket automatically reconnects with exponential backoff within 2 seconds.

### Scenario B: Relay pipeline hangs or takes longer than 5 seconds
- Cause: LLM rate limit or fixture stream delay.
- Action: The web client runs against local fixtures by default (`DEMO_MODE=fixtures`). In fixtures mode, actions resolve in under 500 milliseconds. If in live mode and an API times out, toggle back to fixtures by running `./scripts/demo/restart-actor.sh`.

### Scenario C: Card does not expand on click
- Cause: Focus or click intercepted by modal.
- Action: Press the Spacebar or Enter key on the "View details" button. The toggle is fully keyboard accessible with native `aria-expanded` attributes.

### Scenario D: Accidental actor kill during presentation
- Cause: Clicking "Kill actor" before Beat 6.
- Action: The actor restarts automatically via the demo supervisor. Refresh the browser tab after 3 seconds. All completed steps and proposals will reappear unharmed.
