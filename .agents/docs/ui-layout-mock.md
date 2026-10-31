# Layout mock: light editorial, minimal information load

Status: draft v2 companion to `ui-screen-spec.md`. Diagrams, not pixel specs; the spec governs.

## 1. Desktop, agency role, populated

```
+--------------------------------------------------------------------+
| DealRelay  demo                    (•)  Agency | Client    Demo ˅  |
+--------------------------------------------------------------------+

  (PROCUREMENT DEAL ROOM)

  Northwind Product Launch.

  [▦ 2026-11-20] [♟ 500] [$ 30,000 max] [☾ 02:00] [◗ AV]   Reset specs

  +------------------------------------------------------------------+
  | ◔  2 counter-offers need approval                                |
  |    The Grand Loft   extend curfew to 02:00      · waiting for client|
  |    Warehouse 9      counter at $30,000          · waiting for client|
  +------------------------------------------------------------------+

  Proposals (2)              + Inject Grand Loft  + Inject Warehouse 9

  +----------------------------------------------------------+
  | The Grand Loft                            ( requires )    |
  |                                                          |
  | [$ 26,000] [500] [00:00] [AV]                            |
  |                                                          |
  | • Counter: extend curfew to 02:00                        |
  |                                                          |
  | ⌄ Vendor email                                           |
  +----------------------------------------------------------+

  +----------------------------------------------------------+
  | Warehouse 9                              ( counter )      |
  |                                                          |
  | [$ 34,000] [600] [03:00] [AV]                            |
  |                                                          |
  | • Counter: revise cost to $30,000                        |
  |                                                          |
  | ⌄ Vendor email                                           |
  +----------------------------------------------------------+

                              +--------------------------------+
                              | Agent activity            17   |
                              |                                |
                              | • system (2)          ⌄        |
                              | • scout (2)           ⌄        |
                              | • finance (2)         ⌄        |
                              | • negotiator (3)      ⌃        |
                              |                                |
                              |  14:07  Counter strategy:     |
                              |         extend curfew to      |
                              |         02:00                 |
                              |                                |
                              +--------------------------------+
```

Chips carry the color: budget/curfew chips are green when the constraint is met and red when
violated. No constraint is spelled out in words. The activity rail sits on the bone/muted
background so it reads as secondary without a border.

## 2. Same screen, client role

Only the approval callout changes:

```
  +------------------------------------------------------------------+
  | ◔  2 counter-offers need approval                                |
  |    The Grand Loft   extend curfew to 02:00        [ Approve ]    |
  |    Warehouse 9      counter at $30,000            [ Approve ]    |
  +------------------------------------------------------------------+
```

- Ink buttons, one per row, right aligned.
- The demo toolbar disappears (agency-only).
- The "waiting for client" text is replaced by the buttons.

## 3. Empty state

```
+--------------------------------------------------------------------+
| DealRelay  demo                    (•)  Agency | Client    Demo ˅  |
+--------------------------------------------------------------------+

  (PROCUREMENT DEAL ROOM)

  No event on the books yet.                        [ Set demo specs ]

  Proposals (0)

  Nothing here yet. Inject a proposal to start the agent audit.
```

## 4. Disclosure states

```
venue card, vendor email collapsed (default)      venue card, expanded
+---------------------------------+                +---------------------------------+
| The Grand Loft     ( requires ) |                | The Grand Loft     ( requires ) |
| [$26,000] [500] [00:00] [AV]    |                | [$26,000] [500] [00:00] [AV]    |
| • Counter: extend curfew to 02:00|                | • Counter: extend curfew to 02:00|
| ⌄ Vendor email                  |                | ⌃ Vendor email                  |
+---------------------------------+                |   "Hi! The Grand Loft can host  |
                                                     |    your launch on Nov 20..."    |
                                                     +---------------------------------+

activity rail, older run collapsed (default)      latest run expanded
+---------------------------------+                +---------------------------------+
| Agent activity            17   |                | Agent activity            17   |
| • scout (2)            ⌄        |                | • scout (2)            ⌄        |
| • finance (2)          ⌄        |                | • finance (2)          ⌄        |
| • negotiator (3)       ⌃        |                | • negotiator (3)       ⌃        |
|  14:07  Counter strategy:      |                |  14:07  Counter strategy:      |
|         extend curfew to 02:00 |                |         extend curfew to 02:00 |
+---------------------------------+                +---------------------------------+
```

## 5. Mobile (390px)

```
+--------------------------------+
| DealRelay  demo         Demo ˅ |
| (•)   Agency | Client          |
+--------------------------------+

 (PROCUREMENT DEAL ROOM)

 Northwind Product Launch.

 [▦ 2026-11-20]
 [♟ 500] [$ 30,000 max]
 [☾ 02:00] [◗ AV]      Reset specs

+--------------------------------+
| ◔  2 counter-offers need      |
|    approval                    |
|  The Grand Loft               |
|  extend curfew to 02:00       |
|  · waiting for client         |
+--------------------------------+

 Proposals (2)
 [+ Inject Grand Loft]
 [+ Inject Warehouse 9]

+--------------------------------+
| The Grand Loft     ( requires )|
| [$26,000] [500] [00:00] [AV]   |
| • Counter: extend curfew...    |
| ⌄ Vendor email                 |
+--------------------------------+

+--------------------------------+
| Agent activity           17    |
| • negotiator (3)        ⌃       |
|  14:07  Counter strategy...    |
+--------------------------------+
```

## 6. Palette

```
canvas      #FBFBFA   bone, warm off-white
card        #FFFFFF   pure white, hairline #EAEAEA border
ink         #111111   text, primary buttons
muted text  #787774   secondary, mono meta
muted bg    #F7F6F3   activity rail, neutral spec chips

pastel spot colors (bg + text pair, small areas only)
  met       #EDF3EC / #346538   green   constraint ok, accepted
  violated  #FDEBEC / #9F2F2D   red     constraint broken
  pending   #FBF3DB / #956400   amber   awaiting approval
  info      #E1F3FE / #1F6C9F   blue    capacity, scout dot
```

Each pastel appears as a chip fill or a small tint, never as a large surface. Saturation
stays low so four hues can coexist without the screen reading as a warning light.
