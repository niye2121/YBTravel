# 04-SCREEN-INVENTORY.md

The complete screen map of the YB Travel operations platform. The design language is CONSULATE.

This document tells a design agent the whole territory and tells a build agent exactly what exists. It does not restate the visual system. Every colour, size, height and spacing value is defined in `assets/tokens.css` and `01-CONSULATE-DESIGN-SYSTEM.md`. Everything those two left open is settled in `00-DECISIONS.md`. Read all three before building anything here.

### Authority order

When two files disagree, the higher one wins:

1. `assets/tokens.css`, every colour, size and spacing value
2. `01-CONSULATE-DESIGN-SYSTEM.md`, the locked design language
3. `00-DECISIONS.md`, the arbiter, which resolves everything 01 left open
4. **this file**, alongside `02-COMPONENT-LIBRARY.md` and `03-WINDOW-TYPES.md`
5. `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md`, `07-BUILD-STANDARDS.md`
6. `assets/consulate-reference.html`

If a file below `00-DECISIONS.md` contradicts it, **the arbiter is right and that file is a defect.** Report it, do not follow it. That rule applies to this file too, and section 0.8 lists the defects found in other files while this one was corrected.

### What this revision changed

An audit found 129 contradictions across the package, 26 of them against this file. The largest correction here is the **surface taxonomy**. An earlier draft of this document listed eight surfaces, invented a "full page record" as S3, a "settings surface" as S7 and a "report surface" as S8, and numbered the confirm as S5 and the workspace as S6. `00-DECISIONS.md` D1 settles **five surfaces, S1 to S5, and no more, ever**, and `03-WINDOW-TYPES.md` is already corrected against it. Every surface code in this file has been renumbered to match. If you are holding a copy of this document that says S6, S7 or S8, it is stale.

The other structural corrections: queue tabs are capped at seven per object (D12), the chrome is a flex column rather than a stack of fixed y offsets (D11), booking stages are seven (D9), there are exactly four deadline labels and the supplier's stated number never appears in a grid cell (D8), tabular figures apply to any right aligned numeric or currency column (D7), the Requests reference grid takes its column widths from D13, and the empty state is D6's two line block.

---

## 0. HOW TO READ THIS DOCUMENT

### 0.1 What the numbered references mean

Files are referenced by their exact canonical names, per `00-DECISIONS.md` D15. Any cross reference in any file to `02-COMPONENTS.md`, `03-SURFACES.md` or similar is a defect.

| Short form used below | File |
|---|---|
| 00 | `00-DECISIONS.md`, the arbiter |
| 01 | `01-CONSULATE-DESIGN-SYSTEM.md`, the locked design language |
| 02 | `02-COMPONENT-LIBRARY.md`, the component anatomy |
| 03 | `03-WINDOW-TYPES.md`, every surface, the feedback states, and print |
| 04 | this document |
| 05 | `05-CLAUDE-DESIGN-BRIEF.md` |
| 06 | `06-CLAUDE-SPECIFIC.md` |
| 07 | `07-BUILD-STANDARDS.md` |

If a component name or a surface code here does not match `02-COMPONENT-LIBRARY.md` or `03-WINDOW-TYPES.md`, those two win and this file is corrected. The mapping is one to one.

#### The component name index

Every name that appears in a **Components** list below exists in `02-COMPONENT-LIBRARY.md` at the section given here. Nothing else may be named. If a screen needs something not on this list, that is a gap in `02-COMPONENT-LIBRARY.md` and it must be raised there before the screen is built, not invented in a screen entry.

| Name used below | `02-COMPONENT-LIBRARY.md` |
|---|---|
| Crown | 1.1 |
| Crest tile | 1.2 |
| Wordmark, crown rule, desk label | 1.3 |
| Crown search field | 1.4 |
| Utility links | 1.5 |
| User label | 1.6 |
| Object tabs | 1.7 |
| The More overflow | 1.8 |
| Queue tab band | 1.9 |
| Page header | 1.10 |
| Admin section navigation | 1.11 |
| The canvas | 2.1 |
| The box | 2.2 |
| Section header strip | 2.3 |
| Control strip | 2.4 |
| Record window | 2.5 |
| Window tab strip | 2.6 |
| Bordered section | 2.7 |
| Column header row | 3.1 |
| Group header | 3.2 |
| Data row | 3.3 |
| Record-ID link | 3.4 |
| Deadline cell | 3.5 |
| Stage cell | 3.6 |
| Fare cell | 3.7 |
| Agent cell | 3.8 |
| Pagination | 3.10 |
| Timeline row | 3.11 |
| Checklist row | 3.12 |
| Attachment row | 3.13 |
| Primary button | 4.2 |
| Secondary button | 4.3 |
| Destructive button | 4.4 |
| Text input | 4.5 |
| Select | 4.6 |
| Checkbox | 4.7 |
| Radio | 4.8 |
| The View picker | 4.9 |
| Date field | 4.10 |
| Inline links | 4.11 |
| Textarea | 4.12 |
| Form field row | 5.1 |
| Required marker | 5.2 |
| Validation error | 5.3 |
| Client has not provided this yet | 5.4 |
| Help text | 5.5 |
| Partial completion display | 5.6 |
| Page-level message band | 6.2 |
| The confirm | 6.3 |
| Empty state | 6.4 |
| Loading state | 6.5 |

**Names this file used to use and no longer does.** `Row link` is the **Record-ID link** (3.4). `Pagination bar` is **Pagination** (3.10). `Read-only field row` is the **Form field row** (5.1) in its read-only state. `Initials square` is the **Agent cell** (3.8), whose square dimension and fill are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. `Confirm dialog` is **The confirm** (6.3), which is surface S3. `Match row` and `two-column body` do not exist as components at all and have been removed; the intake match list is built from the column header row and the data row, and the two column split is flagged at RQ-11.

`Timeline row` (3.11), `Checklist row` (3.12) and `Attachment row` (3.13) now have full entries in `02-COMPONENT-LIBRARY.md` and are legal names.

### 0.2 The five surfaces

These are the only surfaces in the product, settled by `00-DECISIONS.md` D1 and restated in `03-WINDOW-TYPES.md` 1.1. See that file for full anatomy. **There is no sixth surface, and there never will be.**

| # | Surface | What it is | Sits on |
|---|---|---|---|
| **S1** | **The box** | One white rectangle, 2px `--c-border-container`, on the `--c-canvas` field. Holds all list and detail content. | The page |
| **S2** | **The window** | A modal rectangle over a dimmed page. 2px `--c-crown` border, a 40px `--c-crown` title bar, `--shadow-window`. | Over S1 |
| **S3** | **The confirm** | A small modal for a yes/no decision only. Same construction as S2, but no tab strip and no scrolling body. | Over S1 or S2 |
| **S4** | **The panel** | A dropdown menu. White, 1px `--c-border-control`, **no shadow**, no radius. | Over anything |
| **S5** | **The workspace** | A full page with no box, for tasks that need the whole viewport: WhatsApp intake, the proposal builder, exchange and refund flows, and any record opened by `Open in full page`. Crown and page header remain. | The page |

**S2 has three sizes and no others:**

| Size | Dimensions | Position | Used for |
|---|---|---|---|
| `large` | 1120 × 760 | x=160, y=70 | Record windows and every editable form |
| `medium` | 820 × 620 | centred, y=90 | Document preview, message viewer, audit entry, help, the deadline explainer, the proposal preview |
| `small` | 520 × auto, max 420 tall | centred, y=200 | S3 confirms only |

**There is no read-only viewer surface, no help window surface, no settings surface, no report surface and no toast.** Those are all S2 at a different size with different content, or S1 under a section band. A settings screen is the ordinary box (D10). A report is the ordinary box.

**The layering law, settled by D1.** Only one modal exists at a time. An S3 confirm may open over an S1, an S2 or an S5. **Nothing else stacks.** If a flow appears to need three layers, it is a workspace (S5), not a stack.

- **No S2 opens over an S2.** Where a screen below is reached from inside a record window, the current window **closes first**, subject to the unsaved changes rule in `03-WINDOW-TYPES.md` 4.7, and the new window opens in the same rectangle. This is stated once here and is not repeated in every screen entry.
- Whether an S2 `medium` preview may sit over an S2 `large` record window is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and is carried as an open item in `03-WINDOW-TYPES.md` 1.3. The safe build until then is that the preview replaces the record window body in place, or the record window closes first.
- An earlier draft of this file claimed the confirm was "the only thing permitted on top of a record window", which was an exclusivity claim two files were making about two different surfaces. D1 settles it, and that phrasing is gone.

**The full page record is S5, not a surface of its own.** `Open in full page` renders the same record as a workspace. **The window tab strip does not appear on S5.** The tabs become bordered sections stacked down the page in tab order (D2, and `03-WINDOW-TYPES.md` 4.8). It replaces the current page rather than opening a browser tab, and browser Back restores the list with the window closed.

### 0.3 URL grammar

Extended so that a router can be generated from it. The earlier version did not cover create routes or multi segment actions, and five screens broke it.

```
/{object}                                   redirect to that object's default queue
/{object}/{queue}                           list screen                             S1
/{object}/{queue}?view={view}&page=2&sort=  list narrowed by an L3 saved view       S1
/{object}/{queue}/{id}/{tab}                record window over that live list       S2 large
/{object}/{id}/{tab}/full                   the same record as a full page          S5
/{object}/new                               create a record of that object          S2 large
/{object}/{action}                          an object-level action with no id        S2 large or S5
/{object}/{id}/{action}                     a record-level action                    S2 large or S5
/{object}/{id}/{action}/{step}              a multi-segment record action            S2 large or S5
/admin/{section}                            an Admin section, in the box            S1
/reports/{report}                           a report, in the box                    S1
```

Rules:

- The queue segment is kept in the record window URL on purpose. The list behind the window is real and must render, because 01 states the visible list is the reason this product needs no record pager. Deep linking straight to `/requests/needs-action-today/R-10482/details` renders the queue list first, then the window over it.
- `{tab}` is the window tab slug. For a request: `details`, `itinerary`, `fares`, `payments`, `documents`, `history`.
- `{action}` slugs are single words or hyphenated words and never collide with a queue slug. Where a queue and an action would collide, the action is renamed, not the queue.
- Surface is a property of the screen, not of the URL shape. `/requests/{id}/proposal` is S5 and `/requests/{id}/markup` is S2 `large`, and both are legal instances of the same route form.
- An S3 confirm has **no URL**. It is raised over whatever is on screen and is never deep linkable, because a confirmation without the context that produced it is a trap.
- An S4 panel has no URL either.

### 0.4 Navigation levels, restated in one line each

- **L1, object tabs** in the crown: Requests, Clients, Travellers, Bookings, Tickets, Reports, then right aligned **More** holding Suppliers, Commissions, Agents, Admin.
- **L2, queue tabs**, all visible at rest with live counts, never hidden behind a control. **Seven per object maximum** (D12). A count of zero prints as nothing at all. A count prints `--c-urgent` when that queue holds anything due inside four hours.
- **L3, the View select** in the box control strip. Choosing a view does not change the queue, it narrows it, and the section header strip appends the view name: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`.

There is no fourth level. Screens that are not object tabs, meaning servicing, supervisor review and finance, are queues or views under an existing object tab. This is called out explicitly wherever it happens.

### 0.5 The empty state pattern, defined once

**Verbatim from `00-DECISIONS.md` D6.** Inside the box, below the column headers.

```
Height     160px, content centred vertically
Alignment  left-aligned at --pad-box
Line 1     14px/400 --c-ink, states what is empty
Line 2     13px/400 --c-ink-2, states the way out
Extras     no illustration, no icon, no emoji, no button
```

`--pad-box` is a real token. It is declared in `assets/tokens.css` at 14px as the inset inside the box, and D6 names it directly. An earlier audit finding claimed it did not exist and asked for a raw 14px in its place. That finding was wrong, the token is correct, and colours and spacings are referenced by token name in this product, never as raw values.

Rules:

- The box keeps its border, its section header strip, its control strip and its column header row. The user needs the View picker to get out, so it never disappears with the rows.
- Line 2 is mandatory. An empty state that only says "No records found" is incomplete. It must state what **does** exist elsewhere and how to get there.
- Where the way out is a link rather than a sentence, line 2 is an underlined `--c-link` link, per `02-COMPONENT-LIBRARY.md` 6.4 and 4.11.
- Empty because filtered and empty because nothing exists get different sentences.
- Each screen entry below gives its two lines. **Use them verbatim.** `03-WINDOW-TYPES.md` 9.3 deliberately shows placeholders rather than competing copy, because this file owns the strings.
- Whether the section header strip prints an item count alongside an empty grid, and the format of that count string in general, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (`02-COMPONENT-LIBRARY.md` 2.3). An earlier draft of this file invented `0 items` and `03-WINDOW-TYPES.md` independently invented `12 items`. Both are withdrawn. Do not print a count until the format is settled.
- Whether the pagination band renders below an empty state is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (`03-WINDOW-TYPES.md` 9.3).

### 0.6 Phase tags

Phases are the ones defined in the product brief: 0 validation and architecture, 1 CRM and intake, 2 request to quote to booking workflow, 3 Sabre and ticketing, 4 active trip servicing, 5 ticket lifecycle, 6 finance, 7 fare optimisation, 8 client portal (de-prioritised, not designed).

### 0.7 Cross-cutting rules every screen below obeys

These are settled. They are collected here so that no screen entry has to restate them and no build agent has to hunt for them.

**Booking stages are seven, not eight** (D9): `Accepted` · `Payment pending` · `Paid` · `Ready to issue` · `Sent to ticketing` · `Ticket issued` · `Confirmation sent`. Stage carries no colour anywhere. `OVERDUE` replaces the stage word at 11px/700 uppercase `--c-overdue`, no tracking. An earlier draft of this file carried an open question about the name of an eighth stage. There is no eighth stage. The question is closed and D17 lists "eight stages" among the phrases every file must stop saying.

**Ticket status is a different vocabulary and is not the stage list**: `issued` · `exchanged` · `refunded` · `voided` · `partially flown`. It belongs to the ticket record, it has five values, and it never appears in a Stage cell. Coupon status is a third vocabulary again, `open` · `flown` · `exchanged` · `refunded` · `void`, and belongs to the coupon row. Do not merge any two of the three.

**The client onboarding machine is a separate lifecycle** belonging to the client record, with six states, and **one screen never shows two steppers** (D9). CL-02 is the only screen in the product that shows the onboarding stepper.

**Deadlines: four labels, never abbreviated** (D8): `Ticketing limit` · `Hold expires` · `Follow up` · `Check-in opens`. There is no fifth type. Any document naming `Airline limit`, `Issue by`, `TTL` or similar is a defect, and an earlier draft of this file carried exactly that defect on the reference grid. Only `Ticketing limit` and `Hold expires` ever go red. `Follow up` and `Check-in opens` stay in ordinary ink at all times, because they are not money.

**The two-deadline split** (D8). Every obligation stores two times: the supplier's stated number, immutable and exactly as given with the IANA zone it was quoted in, and our own derived action-by time. **The grid cell shows our derived action-by time as the sentence and nothing else.** The supplier's stated number appears in the record window Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer (GL-02). **It does not appear in the grid cell**, and it never appears as a second line under the grid sentence, because the grid cell is one sentence in a 44px row. Sorting and counting run on ours. Which instant triggers the overdue state, theirs or ours, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and is carried as an open item in `03-WINDOW-TYPES.md` 4.6.1. All of the arithmetic is server side under `server/deadlines/` (D15), never in the browser.

**Tabular figures** (D7). `font-variant-numeric: tabular-nums` applies to **any right aligned numeric column and any currency value**: fares, fees, totals, balances, penalties, commissions, differences and pagination counts. Left aligned text, dates, times and deadline sentences stay proportional. There is still no monospace font anywhere in the product. The earlier "exactly two places" rule is withdrawn and D17 lists it among the phrases to stop using.

**The chrome is a flex column, never absolute y offsets** (D11). The crown is 84px and the page header is 64px. The queue tab band is 38px **when present**. **Reports, Admin and every S5 workspace have no queue band, and everything below simply moves up 38px.** Any component or screen that hard codes y=122 or y=186 is a defect. Minimum viewport is **1300px** (160 + 1120 + a 20px gutter). Below that the page scrolls horizontally. Desktop only, and no mobile build is in scope.

**Queue tabs cap at seven per object** (D12), so they never overflow, never scroll and never collapse. There is no overflow control on the band and there never will be. An object needing more than seven piles has too many piles, and the surplus goes into the View dropdown, which is what it is for. Section 1 applies this to every object and names exactly which queues moved.

**Reference grid column widths** come from D13 and are used exactly at RQ-01. Widths for every other grid in the product are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, because D13 fixes the reference grid only.

**There is no permission-denied state** (D6). The product has two roles, Booking agent and Supervising agent, and both can do everything operational. Supervisor review is after the fact, not a gate. No screen below hides a queue, hides a row, or disables a button by role. The single exception is changing a user's role, which is supervisor only and is type-to-confirm (D3 item 4). How that one control presents to a booking agent is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

**Confirmations are exhaustive and are D3's list, not this file's.** Four type-to-confirm actions, five plain confirms, and nothing else confirms at all. Section 13 maps every one of them to a screen. If a screen entry below does not name a confirm, there is no confirm, including for saves, navigation, filter changes, creating records, marking work complete, issuing tickets, applying a schedule change, merging records and clearing a flag. Unnecessary confirmations train the reflex that defeats the necessary ones.

**Urgency is a sentence, not a colour block** (01 section 7). It lives in exactly five places and none of them move the row: the deadline cell text, the `OVERDUE` word in the stage cell, the group header label, the queue tab count, and nothing else. No fill, no tint, no left bar, no icon, no glyph column, no extra height, no pinning, no lifting out of sort order. Because the default sort is deadline ascending and the default grouping is by day, urgent rows are already at the top.

**Partial completion is a first-class outcome.** It prints as the bare fraction in ordinary ink, for example `Passports on file 3/5`, per `02-COMPONENT-LIBRARY.md` 5.6, and the countdown for a partial obligation runs from the **earliest unsatisfied person**. Never a progress bar, never a ring, never a segmented meter, never a colour that shifts from red to green. The assembled string grammar and the placement of the fraction are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and until they are, screen entries below use the bare fraction after a plain label and nothing more elaborate.

**Nothing is mandatory at intake** (D5). Every field a client is expected to supply carries the checkbox `Client has not provided this yet`. Ticking it clears and disables the field, records the state and satisfies the form. Missing-information reports read that value and never count blanks. This is the mechanism that stops offshore staff typing a fake passport number under time pressure, and D5 says it is not optional.

**Finance placement.** 01 fixes the object tab list and there is no Finance tab. All Phase 6 finance screens therefore sit as queues or views under the **Commissions** tab. If finance deserves its own object tab, that is an amendment to 01 and must be agreed there, not invented here.

### 0.8 Defects found in other files while correcting this one

Per the arbiter's own instruction, these are reported rather than followed.

| File | Defect | Correct reading |
|---|---|---|
| `01-CONSULATE-DESIGN-SYSTEM.md` section 5 | "Eight stages, zero colours" | Seven stages, zero colours. D9 settles the count and D17 names "eight stages" as a phrase to stop using. The "zero colours" half of the sentence is correct and load bearing. |
| `01-CONSULATE-DESIGN-SYSTEM.md` section 6 | `tabular-nums` "is applied in exactly two places" | D7 extends it to any right aligned numeric column and any currency value. D17 names "exactly two places" as a phrase to stop using. |
| `assets/tokens.css` closing comment | "Numerals: tabular ONLY in the Fare column and pagination counts" and the `.fare, .pagination-count` selector list | Same defect as above. The token file's **values** remain authoritative; this comment and selector list need widening to D7. |
| `02-COMPONENT-LIBRARY.md` 1.4 | The crown search states table asserts "Results are a page result" and "Handled on the results screen", asserting a results page | Section 16 of this file states no search results page exists and the many-results behaviour is unspecified. The two must be reconciled, and the assertion is the weaker claim. |
| `02-COMPONENT-LIBRARY.md` 3.5 | The grid deadline cell carries no `Why this date` link | `03-WINDOW-TYPES.md` 4.11 opens the deadline explainer from the grid cell as well as the record window. The link is missing from the component. |
| `02-COMPONENT-LIBRARY.md` 4.9 and `03-WINDOW-TYPES.md` 6.4 | 02 settles the View picker panel at 320px wide, 03 marks all panel widths as unspecified | Two peer-tier files disagree. This file builds RQ-02 at 320px and flags the disagreement. Raise it and settle all four panel widths together. |
| `02-COMPONENT-LIBRARY.md` 1.9 | The queue tab band states table says an empty band "cannot occur" | Reports, Admin and S5 workspaces carry no band at all (D11). The row should read that the band is absent on those screen classes, not that the case cannot occur. |

### 0.9 How an open value is written

Where a value is settled by neither `01-CONSULATE-DESIGN-SYSTEM.md` nor `00-DECISIONS.md`, this file either marks it **DERIVED** and names the rule it was derived from, or writes it as **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. It never invents one. Section 17 collects every open item in this file into one list so that a build agent can raise them in a single pass.

---

## 1. OBJECT TAB AND QUEUE MAP

L2 queue tabs per object. All queues are always visible at rest with live counts, never behind a control. **Seven per object maximum, per D12.** Counts print `--c-urgent` when that queue holds anything due inside four hours, and a count of zero prints as nothing at all.

Two objects were over the cap in the earlier draft, Requests at nine and Bookings at ten. Both are cut to seven below, and the surplus has been **moved into the View dropdown**, which is exactly what D12 says to do with it. A view is not a demotion: it keeps its live count, it keeps its section header strip name, and it is one click away in the control strip. What it loses is a permanent seat in the chrome, which is the scarce thing.

### Requests (default queue: Needs Action Today)

| Queue tab | Slug | Holds |
|---|---|---|
| My Requests | `my-requests` | Open requests owned by the signed-in agent |
| Needs Action Today | `needs-action-today` | Requests with a derived action-by time falling today |
| New Inquiries | `new-inquiries` | Intake done, no research started |
| In Research | `in-research` | Research notes open, no fare recorded |
| Quoted | `quoted` | Proposal sent, awaiting client response |
| On Hold | `on-hold` | A reservation hold exists with a live ticketing limit |
| All Requests | `all` | Everything, including won and closed |

**Moved into the View dropdown** on `all`, per D12:

| View | URL | Why it is a view and not a tab |
|---|---|---|
| Blocked | `/requests/all?view=blocked` | Blocked is a flag, never a stage, and the same flag is already surfaced across every object at AG-05. A request can be blocked in any of the seven piles above, so blocked is a filter cutting across them rather than a pile of its own. |
| Declined | `/requests/all?view=declined` | Terminal. It is read for RP-02 far more often than it is worked, and terminal states are what a view is for. |

### Clients (default: All Clients)

| Queue tab | Slug |
|---|---|
| My Clients | `my-clients` |
| Onboarding | `onboarding` |
| Missing Information | `missing-information` |
| Possible Duplicates | `possible-duplicates` |
| All Clients | `all` |

Five tabs, under the cap.

### Travellers (default: All Travellers)

| Queue tab | Slug |
|---|---|
| My Travellers | `my-travellers` |
| Document Attention | `document-attention` |
| Incomplete | `incomplete` |
| Possible Duplicates | `possible-duplicates` |
| All Travellers | `all` |

Five tabs, under the cap.

### Bookings (default: Ticketing Deadlines)

| Queue tab | Slug | Holds |
|---|---|---|
| Ticketing Deadlines | `ticketing-deadlines` | Live ticketing limits and hold expiries, the daily booking screen |
| Held | `held` | A reservation exists, nothing paid |
| Awaiting Payment | `awaiting-payment` | Accepted, invoice out, money not in |
| Ready to Issue | `ready-to-issue` | Paid and cleared, waiting on the send-to-issue gate |
| Travelling Now | `travelling-now` | In the air or between flights, Phase 4 servicing |
| Check-in Due | `check-in-due` | The shared critical queue, Phase 4 servicing |
| All Bookings | `all` | Everything |

**Moved into the View dropdown** on `all`, per D12:

| View | URL | Why it is a view and not a tab |
|---|---|---|
| Ticketed | `/bookings/all?view=ticketed` | Terminal for the booking flow. A ticketed booking that still needs work appears in `travelling-now` or `check-in-due` on its own merits. |
| Schedule Changes | `/bookings/all?view=schedule-changes` | An exception, not a stage. Every schedule change also raises an anchored obligation that lands in `ticketing-deadlines` or in the service timeline, so nothing is lost by making the standing list a view. |
| Support Cases | `/bookings/all?view=support-cases` | Cases are worked from BK-19's own record screen and escalate through AG-06. The standing list is a view over the same rows. |

Servicing is not a separate object tab. It is where a booking goes after issuance, which is why `travelling-now` and `check-in-due` are Bookings queues and not a tab of their own.

### Tickets (default: All Tickets)

| Queue tab | Slug |
|---|---|
| Issued | `issued` |
| Pending Exchange | `pending-exchange` |
| Pending Refund | `pending-refund` |
| Voided | `voided` |
| EMD and MCO | `emd-mco` |
| Reconciliation | `reconciliation` |
| All Tickets | `all` |

Seven tabs, exactly at the cap. Nothing further may be added to this object without moving something out.

### Reports

**Reports carries no queue tab band** (D11). The page header sits directly under the crown and everything below moves up 38px. The box lists the available reports. See section 7.

### More group

| Tab | Default queue | Other queues | Count |
|---|---|---|---|
| Suppliers | `carriers` | `pccs`, `hotels`, `insurance`, `all` | 5 |
| Commissions | `earned` | `recalls`, `invoices`, `credit-memos`, `uatp`, `reconciliation` | 6 |
| Agents | `workload` | `review-queue`, `flagged`, `override-log`, `escalations`, `all-agents` | 6 |
| Admin | none | Admin carries no band of queues. It carries the same 38px band component as **section navigation**, per D10 and `03-WINDOW-TYPES.md` 8.1. See section 11. | n/a |

`review-queue`, `flagged`, `override-log` and `escalations` are the supervisor screens. Supervising agent is a role, not a place, so supervisor work lives under Agents rather than a tab of its own.

**Both roles see every one of these tabs and every row in them.** An earlier draft of this file said a booking agent "sees only their own items in them", which is a role-based filter and therefore a permission gate. D6 removes it. Safety in this product comes from workflow gates, from the `Client has not provided this yet` mechanism and from append-only financial records, not from hiding rows.

---

## 2. REQUESTS

The organising object. Everything else in the product hangs off a travel request.

The Request record window carries **six window tabs**: `Details` · `Itinerary` · `Fares & Quotes` · `Payments` · `Documents` · `History`. The cap is eight (D2), so six is legal and there is room for two more. Tabs never scroll and never overflow. A tab label carries a plain count in parentheses when it holds records, and **a count of zero prints as nothing at all**.

### RQ-01 Requests Queue List

- **URL** `/requests/{queue}`, default `/requests/needs-action-today`
- **Tab / queue** Requests, all seven queues
- **Purpose** The daily working screen. Every open obligation in the agency, sorted by the deadline that is closest to biting.
- **Surface** S1
- **Components** Crown, Crest tile, Wordmark, crown rule, desk label, Crown search field, Utility links, User label, Object tabs, The More overflow, Queue tab band, Page header, The canvas, The box, Section header strip, Control strip, The View picker, Select, Inline links, Column header row, Group header, Data row, Record-ID link, Deadline cell, Stage cell, Fare cell, Agent cell, Pagination, Empty state, Loading state, Page-level message band, Primary button, Secondary button

**Columns, exactly as `00-DECISIONS.md` D13 fixes them.** This is the reference grid. Build it to these numbers and do not adjust them to fit another column in.

| Column | Width | Alignment | Notes |
|---|---|---|---|
| Request # | 88px | left, underlined link | The Record-ID link (02 3.4). Single click opens the record window. |
| Client | 150px | left, 600 weight | The household account name, not a person. |
| Trip | 190px | left | Origin, destination and dates compressed into one phrase. |
| Stage | 130px | left | One of the seven stages in ordinary ink, or `OVERDUE` at 11px/700 uppercase `--c-overdue`. |
| Waiting on | fills | left | What the request is waiting on, in words. The vocabulary of values is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. It is the column that answers "why has this not moved", and a made-up list here would be worse than an empty one. |
| Fare | 100px | right, tabular | Fare cell (02 3.7), tabular per D7. |
| Deadline | 340px | right | Deadline cell (02 3.5), all three states. Wide because the sentence is the design. |
| Agent | 74px | right | Agent cell (02 3.8). Initials in a square, never a circle, never a photograph. |

- **Grouping and sort** Default grouping by day, default sort deadline ascending, so urgent rows are already at the top and are never lifted out of order. The group header prints the full sentence, for example `DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS`, with the label in `--c-urgent` and the band fill staying `--c-band-service`. Sorting is the Sort select in the control strip. **Column headers are never sortable and never resizable** (D17).
- **Urgency** Exactly as 01 section 7 specifies. The deadline cell gains a clause, the Stage cell prints `OVERDUE`, the group header speaks, the queue tab count goes red. The row does not move, tint, thicken or gain a glyph.
- **The deadline cell, and only one time in it** The cell prints **our derived action-by time** as a single sentence: `Ticketing limit — today 3:20 PM`, gaining `, 3 hours left` inside four hours at 15px/700 `--c-urgent`, and reading `Ticketing limit — expired 11:40 AM, 24 minutes ago` at 15px/700 `--c-overdue` when it has passed. **The supplier's stated number is not in this cell.** It is a labelled field reading `Stated by supplier` in the record window Deadlines section (RQ-03) and in the deadline explainer (GL-02). An earlier draft of this file printed a second line reading `Airline limit 3:20 PM` underneath, which invented a fifth deadline label and put two lines in a 44px row. Both are defects and both are gone.
- **Why this date** Each deadline cell carries an underlined `Why this date` link opening GL-02, the deadline explainer, as an S2 `medium`. This link is currently missing from the deadline cell component and must be added there, see 0.8.
- **Primary action** `New Request` (primary button, page header right), which opens RQ-10
- **Secondary actions** `Intake from WhatsApp`, which opens RQ-11 and is a **page header button, not a menu item on a button dropdown**, closing the question raised in `03-WINDOW-TYPES.md` 6.6. Then `Print` and `Export`.
- **Empty state**
  - Line 1 `No requests in this queue.`
  - Line 2 `Show all requests` (underlined link to `/requests/all`)
- **Loading** Up to 10 rows of 44px `--c-band-service` fill. No spinner, no shimmer, no progress bar. Past 10 seconds the page message band prints `Still loading. The connection to Sabre may be slow.`
- **Phase** 1 (shell, list, intake-only data), completed in 2

This is the **reference implementation**. Every other list in the product is this screen with different columns. Build it first and build it exactly. Column widths for those other lists are not settled anywhere, because D13 fixes this grid only.

### RQ-02 View picker

- **URL** none, it is a panel over RQ-01 and over every list
- **Purpose** L3. Narrow the current queue without leaving it.
- **Surface** S4, the panel. White `--c-surface`, 1px `--c-border-control`, **no shadow**, no radius, simply on top.
- **Components** The View picker, Select, Inline links
- **Width** 320px, per `02-COMPONENT-LIBRARY.md` 4.9. Note that `03-WINDOW-TYPES.md` 6.4 marks every panel width as unspecified, so two peer files disagree. Build 320px and raise the disagreement, see 0.8.
- **Groups** `MY VIEWS`, `PRICING GROUPS`, `BY AGENT`, `ALL`. Group captions 11px/700 uppercase 0.7px `--c-ink-3`. Item rows 30px with right aligned counts, tabular per D7.
- **The pricing group names are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** The package variously names three groups, three with `Standard` substituted for one of them, and four including both. A build agent cannot tell whether `Standard` and `Community All` are the same thing, two things, or a view label against a business object. Do not hard code any list. This is the same open item carried at `03-WINDOW-TYPES.md` 6.4, and it also blocks CL-02, CL-12 and the Admin pricing group area.
- **The queues moved out under D12 appear here as named views** with live counts: Blocked and Declined for Requests, Ticketed, Schedule Changes and Support Cases for Bookings.
- **Behaviour** The section header strip appends the view name: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`. **The queue tab does not change.** Open by clicking the select, close by choosing an item, clicking outside or `Esc`. `Down` and `Up` skip group captions, `Enter` selects, `Esc` reverts to the previously selected view, type-ahead matches item labels. `--focus-ring` on every item.
- **Sorting is not here.** Sorting is the Sort select in the control strip.
- **Empty state**
  - Line 1 `No saved views yet.`
  - Line 2 `Create New View` (underlined link in the control strip)
- **Phase** 1

### RQ-03 Request Record Window, Details tab

- **URL** `/requests/{queue}/{id}/details`
- **Purpose** Everything known about one request: who is going, where, when, what they asked for, who owns it, what is blocking it.
- **Surface** S2 `large`, 1120 × 760 at x=160 y=70. Opened by double-clicking a row or single-clicking the underlined Request # link. Title bar reads `REQUEST R-10482 — KAPLAN, 5 PASSENGERS`.
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Required marker, Validation error, Client has not provided this yet, Help text, Data row, Deadline cell, Stage cell, Agent cell, Inline links, Primary button, Secondary button, Partial completion display
- **Default tab** Details, always.
- **Sections in the body, in order**
  1. `REQUEST` request number, opened date, owning agent, source (WhatsApp, phone, walk-in), pricing group, and booking stage as a plain word in `--c-ink`. **No colour on stage.** Seven stages (D9).
  2. `CLIENT` household account link, preferred representative, secondary representative, fee group, and onboarding state as a **read-only word**, linked to the client record. Never a second stepper on this screen.
  3. `BLOCKED` appears only when the blocked flag is set. Carries the mandatory reason and the follow-up date. **Blocked is a flag, never a stage**, so it never appears in the stage field. Edited in place here, see RQ-23.
  4. `TRAVELLERS` one 44px row per traveller: legal passport name, date of birth, passenger type, passport status. Partial completion prints as a fraction, `Passports on file 3/5`.
  5. `DEADLINES` one row per obligation. Each row carries the deadline type spelled out in full, our derived action-by time as the sentence, a separate labelled field reading **`Stated by supplier`** carrying the supplier's number immutably with the IANA zone it was quoted in, the anchor it hangs off, the owner and the outcome. Each row carries an underlined `Why this date` link opening GL-02.
  6. `TRIP SUMMARY` origin, destination, dates, cabin, flexibility, carrier preference, special requirements.
  7. `INTAKE` every intake field with its explicit `Client has not provided this yet` state visible **as a value, not as a blank** (D5). No field on this tab is mandatory to save. Missing-information reports read that value and never count blanks.

> **Open item.** Whether `CLIENT` is a section in its own right or is folded into `REQUEST`, and whether `INTAKE` and `TRIP SUMMARY` stay separate, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `03-WINDOW-TYPES.md` 4.6 carries the same open item from the other side. The two files previously listed different section sets for the single most important tab in the product. The list above is the union of both, in a defensible order. **Do not silently drop either section**, because the household model hangs off the client link and the missing-information report hangs off the intake values.

- **Stepper rule** This screen shows the **booking** stage machine only. Client onboarding state appears as a read-only word. One lifecycle per record, one stepper per screen.
- **Footer** 52px, `[Save]` secondary then `[Save & Close]` primary, right aligned, 10px gap. Closing a dirty window raises the S3 discard confirm, see section 13.
- **Empty state** Not applicable, the record always exists. Individual fields print `Client has not provided this yet` where that is the stored state. That is an explicit value, not a blank.
- **Phase** 1 for the shell and sections 1 to 4, deadlines and the blocked section in 2

### RQ-04 Request Record Window, Itinerary tab

- **URL** `/requests/{queue}/{id}/itinerary`
- **Purpose** The proposed and confirmed flight segments for this request.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Inline links, Secondary button
- **Sections** `SEGMENTS` one row per flight segment: carrier, flight number, RBD, departure and arrival airports, departure and arrival local times **with the IANA zone printed**, aircraft, duration, connection time. Then `SEATING`, `MEALS AND SSRs`, and `PROPOSAL`, the client-facing itinerary document being assembled, carrying a `Preview` button that opens GL-04, the proposal preview, as an S2 `medium`.
- **Storage rule** Segment times display in the segment's own zone. Every time is stored as a UTC instant plus the IANA zone it was quoted in, never as a naive local timestamp. All arithmetic is server side.
- **Tab label** carries a plain count when options exist, for example `Itinerary (3)`
- **Primary action** `Build Proposal`, which opens RQ-16. RQ-16 is an S5 workspace and it **replaces the page**, so the record window closes first under the unsaved changes rule.
- **Empty state**
  - Line 1 `No itinerary options recorded yet.`
  - Line 2 `Start research` (underlined link to RQ-13)
- **Phase** 2, live Sabre segments in 3

### RQ-05 Request Record Window, Fares & Quotes tab

- **URL** `/requests/{queue}/{id}/fares`
- **Purpose** Every fare recorded against this request, what it costs, what we add, when it was last verified.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Fare cell, Inline links, Help text, Primary button
- **Sections** `QUOTES` one row per quote with the verified-at stamp and the fare. Then `PRICING GROUP AND BOOKING FEE`, the effective-dated per-passenger fee that applied when this request was created, printed with its version sentence and an underlined `See fee history` link. Then `MARKUP REVIEW` and `DECLINED OFFERS`.
- **Content per quote** Base fare, taxes itemised, carrier, fare type (published, branded, private, net, NDC), tour code, ticket designator, per-passenger booking fee derived from the client's effective-dated fee group, markup, total.
- **Fare freshness is not solved with colour.** Each quote row prints a verified-at stamp as a sentence in ordinary ink, for example `Verified in Sabre 9 August, 10:14 AM`. **An aged quote states its age in words, in ordinary `--c-ink`, with a clause appended.** It does not turn `--c-urgent`, it does not gain a warning icon and it does not take an amber fill. `--c-urgent` is confined to the deadline cell and to the places 01 section 7 names, and spending it on a stale quote devalues the one signal the deadline model depends on. The stamp is left aligned text, so it stays **proportional**, not tabular (D7).
- **The freshness window in hours is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** So is the placement of the verified-at stamp within the row. Do not guess either; the send-to-issue gate at RQ-22 tests against this window, so a guessed number becomes a false gate.
- **Numerals** Fares, fees, markups and totals are right aligned currency and are therefore **tabular** per D7.
- **Primary action** `Record Fare`, which opens RQ-14
- **Empty state**
  - Line 1 `No fares recorded for this request.`
  - Line 2 `Record a fare` (underlined link to RQ-14)
- **Phase** 2, Sabre-verified pricing in 3

### RQ-06 Request Record Window, Payments tab

- **URL** `/requests/{queue}/{id}/payments`
- **Purpose** What has been invoiced, what has been paid, what is still outstanding, and the reference that ties it to QuickBooks.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Fare cell, Form field row, Inline links, Primary button
- **Sections** `INVOICE REFERENCE` the QuickBooks Online invoice number and link. Then `PAYMENTS RECEIVED`, `ADJUSTMENTS` and `REFUNDS`.
- **Content** Invoice reference, amount, method, received date, owner, status. Records are append-only and a correction names what it corrects. **Voided records stay visible and searchable, marked void with a plain word in `--c-ink-2`**, never a coloured fill and never a pill, because there are no chips or badges in this product.
- **Numerals** Every currency column is right aligned and tabular per D7.
- **Tab label** `Payments (2)` when records exist
- **Primary action** `Confirm Payment`. **This raises no confirmation.** Recording a payment is not on either D3 list, and D3's no-confirmation list names recording a payment explicitly. An earlier draft of this file raised a confirm here "because it is a gate for issuance". The gate is the send-to-issue checklist at RQ-22, which is a real gate with computed answers, not a dialog asking the user whether they meant it.
- **Empty state**
  - Line 1 `No payments recorded.`
  - Line 2 `Create invoice` (underlined link to CM-04)
- **Phase** 2, QuickBooks link in 6

### RQ-07 Request Record Window, Documents tab

- **URL** `/requests/{queue}/{id}/documents`
- **Purpose** Passports, visas, signed authorisations and anything else attached to this request or its travellers.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Attachment row, Inline links, Primary button
- **Content** One row per document **version**. Documents version, they never overwrite. A renewed passport is a new document with a new number, and the superseded book stays listed and stays openable, because it may still carry a valid visa and its number may be printed on an issued ticket. Columns: document type, holder, number, issued, expires, version, uploaded by, uploaded at, and an underlined `View` link opening GL-03 as an S2 `medium`.
- **Validity** Passport validity is never rendered as a red date. It is the sentence produced by the rule engine, for example `Valid for this trip. Thailand requires six months beyond entry, expires 14 months after entry date.`
- **Security** Passport data and payment data live in controlled secret storage. Fields render **masked** with an explicit reveal action that writes to the audit log. Never in ordinary documents, spreadsheets, prompts or user-visible configuration. The masked form and the reveal control's appearance are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.
- **Primary action** `Upload Document`. Upload is a page header or section action, never a drop zone, because there is no drag and drop in this product.
- **Empty state**
  - Line 1 `No documents on file for this request.`
  - Line 2 `Upload a document` (underlined link)
- **Phase** 1

### RQ-08 Request Record Window, History tab

- **URL** `/requests/{queue}/{id}/history`
- **Purpose** What happened to this request and what we said to the client. Two different records, shown as two sections, never merged.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Inline links, Primary button
- **Sections**
  1. `COMMUNICATION LOG` who we spoke to, on what channel, when, what was said, what they agreed. `We told Ruth on the phone on 28 July and she approved it.` This is the record that helps in a dispute. Each entry opens GL-05 as an S2 `medium`.
  2. `CHANGE HISTORY` field-level changes with owner, timestamp, before and after. `Price changed from 4,200 to 4,650` lives here and only here. Each entry opens GL-05 as an S2 `medium`.
- **Primary action** `Log Communication`
- **Empty state** Each section prints its own two lines.
  - `COMMUNICATION LOG`: Line 1 `No communications logged.` Line 2 `Log the first communication` (underlined link)
  - `CHANGE HISTORY`: Line 1 `No changes recorded.` Line 2 `Changes appear here as soon as a field is edited.`
- **Phase** 1

### RQ-09 Request, full page

- **URL** `/requests/{id}/{tab}/full`
- **Purpose** The same record for printing, for reading across a desk, and for two-monitor work.
- **Surface** **S5, the workspace.** Reached by the underlined `Open in full page` link in the record window title bar, which is present on the `large` size only.
- **Components** Page header, The canvas, Bordered section, Section header strip, Form field row, Column header row, Data row, Timeline row, Attachment row, Deadline cell, Stage cell, Fare cell, Agent cell, Inline links, Primary button, Secondary button
- **Construction** The crown remains, 84px, with Requests active. The page header remains, 64px, carrying the record title, the context line and the buttons. **There is no queue tab band** (D11), so everything below the crown moves up 38px. **There is no box.** The record's content sits in bordered sections directly on the canvas, 2px `--c-border-container`, 16px vertical gaps, each with a 32px `--c-band-header` strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`. Page gutter is `--gutter` (20px).
- **There is no window tab strip.** The six window tabs become six stacked blocks in tab order: `DETAILS`, `ITINERARY`, `FARES & QUOTES`, `PAYMENTS`, `DOCUMENTS`, `HISTORY`. Window tabs exist only inside S2 `large`. They are tabs on a dialog, not places in the app, and they never appear on a page. An earlier draft of this file gave the full page record "the same window tab strip", which broke that rule in the one place it is most tempting to break it.
- **Actions** Page header buttons, `Save` and `Save & Close`. There is no window footer on a page, because there is no window. `Save & Close` returns to the queue list. Browser Back also returns to the list with the window closed.
- **Print** Printing this page and printing the record window produce the same output. `03-WINDOW-TYPES.md` section 10 owns the print specification and is authoritative for it.
- **Empty state** Inherits the empty state of each block from the corresponding tab above.
- **Phase** 1

### RQ-10 New Request

- **URL** `/requests/new`
- **Purpose** Create a request from scratch when the client called or walked in.
- **Surface** S2 `large`, opened empty over the current list, title bar reads `NEW REQUEST`. Same window, same tabs, same footer. **There is no separate create surface.**
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Textarea, Checkbox, Client has not provided this yet, Required marker, Validation error, Help text, Inline links, Primary button, Secondary button
- **Fields** Client (lookup, with an inline `Create new client` link opening CL-09), travellers (multi-select from the client household), origin, destination, dates, cabin, passenger count, source, owning agent, notes
- **Mandatory field rule** Almost nothing is mandatory. Every intake field carries the explicit `Client has not provided this yet` checkbox (D5). Mandatory fields cause fabricated data, and offshore staff under volume pressure will type a placeholder passport number rather than fail to save. Missing-information reporting reads the explicit value, never blanks. Inline errors on intake are therefore only for **malformed** values, never for **absent** ones.
- **Primary action** `Save & Close`. No confirmation, per D3.
- **Empty state** Not applicable
- **Phase** 1

### RQ-11 WhatsApp Intake

- **URL** `/requests/intake`
- **Purpose** A pasted or received WhatsApp message becomes structured records. This is the offshore intake employee's screen and they live in it all day.
- **Surface** **S5, the workspace.** Named by D1 as a workspace use.
- **Components** Page header, The canvas, Bordered section, Section header strip, Textarea, Form field row, Text input, Select, Date field, Checkbox, Radio, Client has not provided this yet, Column header row, Data row, Help text, Validation error, Primary button, Secondary button
- **Construction** Crown 84px with Requests active. Page header 64px, eyebrow `REQUESTS`, H1 `WhatsApp Intake`, count line `3 in progress`. **No queue tab band** (D11), everything below moves up 38px. **No box.** Bordered sections sit directly on the canvas.
- **Actions live in the page header**, per 01 and `02-COMPONENT-LIBRARY.md` 2.2. `Create Request` is the primary button, `Save Draft` and `Discard` are secondary. An earlier draft of this file drew a button footer inside a box on this screen; there is no box on an S5 and buttons do not live in a footer strip on a page.

```
[ crown, 84px, "Requests" object tab active ]
+------------------------------------------------------------------+
| [tile] REQUESTS                  [Create Request][Save Draft][Discard]
|        WhatsApp Intake                                            | 64 page header
|        3 in progress                                              |
+------------------------------------------------------------------+
|  canvas --c-canvas, --gutter 20px                                 |
|  +--------------------------------+  +-------------------------+  |
|  | MESSAGE                        |  | STRUCTURED RECORD       |  | 32 --c-band-header
|  +--------------------------------+  +-------------------------+  |
|  | the pasted thread, 14px/400,   |  | Client     [lookup]     |  | 2px --c-border-container
|  | selectable, never edited,      |  | Travellers [one row per |  |
|  | stored verbatim                |  |             person]     |  |
|  |                                |  | Trip       [origin dest |  |
|  |                                |  |             dates]      |  |
|  |                                |  | Deadlines  [anchored,   |  |
|  |                                |  |             never typed]|  |
|  +--------------------------------+  +-------------------------+  |
|  +--------------------------------------------------------------+ |
|  | MATCH REVIEW                                                 | | 32
|  +--------------------------------------------------------------+ |
|  | candidate households and travellers, evidence, choice        | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

- **The two-column split ratio is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `03-WINDOW-TYPES.md` 7 settles that an S5 holds bordered sections on the canvas with 16px vertical gaps, but no file settles a side-by-side column rule, a horizontal gap between two sections, or a split ratio. The safe build until it is settled is the two sections stacked at full width, which is legal today, with the split raised as an enhancement.
- **Behaviour** The raw message is stored verbatim and attached to the request's communication log. Parsed values are **proposals**, and an agent confirms each one. Any field the agent cannot fill is set to `Client has not provided this yet`, never left blank and never guessed.
- **Duplicate detection** As the client is identified, the `MATCH REVIEW` section fills. See RQ-12, which is a section on this screen and not a dialog.
- **Primary action** `Create Request`
- **Empty state**
  - Line 1 `No message pasted yet.`
  - Line 2 `Paste a WhatsApp message into the message panel to begin.`
- **Phase** 1

### RQ-12 Intake Match Review

- **URL** `/requests/intake?match={candidate-set}`
- **Purpose** Decide whether this message belongs to an existing client and existing travellers before creating anything.
- **Surface** **A bordered section inside RQ-11, on S5.** Not a dialog. An earlier draft of this file made it an S3 confirm carrying a column header row, data rows and radios. An S3 is 520px wide, has no scrolling body and exists for a yes/no decision only (D1), so a candidate comparison grid does not fit its anatomy or its width. D1's own guidance applies: if a flow appears to need another layer, it is a workspace, not a stack. It already is one.
- **Components** Bordered section, Section header strip, Column header row, Data row, Radio, Inline links, Secondary button
- **Content** Candidate clients and travellers with the evidence that matched (phone number, name, date of birth, passport number), a side-by-side of the incoming values against the stored values, and three choices as square radios: use the existing record, create a new record, or merge later. Radios are 14×14 **squares** with a 6×6 `--c-crown` centre square when on, because there are no circles in this product.
- **Primary action** `Use Existing`, a secondary button inside the section. Confirming the whole intake stays on the page header's `Create Request`.
- **Empty state**
  - Line 1 `No existing client matches this message.`
  - Line 2 `Create new client` (underlined link to CL-09)
- **Phase** 1

### RQ-13 Research Notes

- **URL** `/requests/{id}/research`
- **Purpose** Where the agent records what they looked at, what was available, what they ruled out and why. This is the memory that makes a second agent able to pick the request up.
- **Surface** **S5, the workspace.** No box, bordered sections on the canvas, no queue tab band, actions in the page header.
- **Components** Page header, The canvas, Bordered section, Section header strip, Textarea, Column header row, Data row, Fare cell, Form field row, Inline links, Primary button, Secondary button
- **Sections** `WHAT THE CLIENT ASKED FOR` read-only from the request. `OPTIONS CONSIDERED` one row per option with carrier, route, fare and a rejection reason. `NOTES` free text, timestamped, append-only, each entry owned.
- **Primary action** `Save Notes`
- **Empty state**
  - Line 1 `No research recorded yet.`
  - Line 2 `Add the first note` (underlined link)
- **Phase** 2

### RQ-14 Record Fare

- **URL** `/requests/{id}/fares/new`
- **Purpose** Capture a priced fare with its provenance and a verified-at stamp.
- **Surface** S2 `large`. Reached from RQ-05, so the request window closes first under the unsaved changes rule, per 0.2.
- **Components** Record window, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Fare cell, Help text, Validation error, Primary button, Secondary button
- **Fields** Carrier, fare basis, fare type (published, branded, private, net, NDC), base, taxes itemised, currency, PCC used, tour code, ticket designator, per-passenger booking fee (derived from the client's effective-dated fee group, shown with its version sentence, **not editable here**), source (Sabre PQ or manual), verified at (stamped server side, **never typed**)
- **Ageing** A quoted fare ages. The verified-at stamp is displayed everywhere the fare is displayed, as a sentence in ordinary ink. See RQ-05 for why it never changes colour, and for the unspecified freshness window.
- **Numerals** Every money field is right aligned and tabular per D7.
- **Primary action** `Save Fare`
- **Empty state** Not applicable
- **Phase** 2, populated from Sabre pricing in 3

### RQ-15 Markup and Fee Review

- **URL** `/requests/{id}/markup`
- **Purpose** Show cost, fee and margin per passenger before anything is sent to the client, and let a supervisor see what was applied.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Fare cell, Form field row, Textarea, Inline links, Primary button, Secondary button
- **Content** One row per passenger: base, taxes, booking fee with its fee group and version sentence, markup, total, margin. A footer row totals the request. Every one of those columns is right aligned currency and is therefore tabular per D7.
- **Override rule** Any override of the standard fee requires a reason and is written to the **override log, AG-04**. An earlier draft of this file sent the developer to AG-05, which is Flagged Items. AG-04 is the Override Log. Every other reference in this file has been checked against section 10.
- **Primary action** `Approve Pricing`. No confirmation, per D3. Supervisor review is after the fact, at AG-03.
- **Empty state**
  - Line 1 `No fare recorded, so there is nothing to price.`
  - Line 2 `Record a fare` (underlined link to RQ-14)
- **Phase** 2

### RQ-16 Proposal Builder

- **URL** `/requests/{id}/proposal`
- **Purpose** Assemble the itinerary options, prices and conditions the client will see. This replaces Yaalago, so it is a first-class screen in this product, not an export.
- **Surface** **S5, the workspace.** Named by D1 as a workspace use.
- **Components** Page header, The canvas, Bordered section, Section header strip, Column header row, Data row, Fare cell, Textarea, Select, Inline links, Primary button, Secondary button
- **Construction** Crown, page header with the actions, **no queue band, no box**. Three bordered sections stacked on the canvas with 16px gaps.
- **Sections** `OPTIONS` ordering is by an explicit up and down control, because **01 forbids drag and drop**. `PRICING` pulled from RQ-15, read-only here. `CONDITIONS AND NOTES` approved template text, editable, with the template name and version printed.
- **Primary action** `Preview Proposal`, opening GL-04 as an S2 `medium` over this page. `Send to Client` is the second page header button and opens RQ-18.
- **Empty state**
  - Line 1 `No options added.`
  - Line 2 `Go to itinerary` (underlined link to RQ-04) to add an itinerary option first.
- **Phase** 2

### RQ-17 Deleted, folded into GL-04

The earlier draft of this file carried RQ-17 Proposal Preview as a second workspace page at `/requests/{id}/proposal/preview`, while `03-WINDOW-TYPES.md` opened the proposal preview as a read-only window and `07-BUILD-STANDARDS.md` described one server-rendered template producing the on-screen preview, the PDF and the page-one image from the same bytes. Three mechanisms for one artifact.

**Settled here:** the proposal preview is **GL-04, an S2 `medium`**, which is what D1 names it as. It renders the stored server-rendered artifact, so the preview, the PDF and the sent document are literally the same bytes. The ID RQ-17 is retired rather than reused, so that a stale reference to it fails loudly instead of landing on a different screen.

### RQ-18 Send Proposal

- **URL** `/requests/{id}/proposal/send`
- **Purpose** Send the proposal on the channel the client uses, from an approved template, and log it.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Form field row, Select, Textarea, Inline links, Help text, Primary button, Secondary button
- **Fields** Channel select, template select, recipient, message body pre-filled from the template and editable
- **Behaviour** Sending writes two records: an entry in the communication log (RQ-08 section 1) and a **follow-up deadline anchored to the send event, never typed**. The request stage moves to `Quoted` and the request appears in the `quoted` queue. The sent message records **which template version was used**.
- **Primary action** `Send`. No confirmation, per D3, which names sending a message on its no-confirmation list.
- **Empty state**
  - Line 1 `No approved template for this channel.`
  - Line 2 `Manage templates` (underlined link to Admin, Message Templates)
- **Phase** 1 for templates, 2 for sending

### RQ-19 Client Response Capture

- **URL** `/requests/{id}/response`
- **Purpose** Record what the client actually said, in their words, with who heard it and when. This is the record that settles disputes.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Radio, Textarea, Form field row, Date field, Primary button, Secondary button
- **Outcomes** Accepted, Asked for changes, Declined, No response yet. Square radios, per D5.
- **Behaviour** Accepted routes to RQ-21 or BK-09. Asked for changes returns the request to `in-research` and re-anchors the follow-up. Declined opens RQ-20. No response yet re-anchors the follow-up deadline and leaves the request in `quoted`.
- **Primary action** `Save Response`
- **Empty state** Not applicable
- **Phase** 2

### RQ-20 Decline Capture

- **URL** `/requests/{id}/decline`
- **Purpose** Capture why we lost the sale in a structured way, because the decline reasons report is only as good as this screen.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Select, Textarea, Form field row, Fare cell, Inline links, Primary button, Secondary button
- **Fields** Reason from the admin-managed list, detail, competitor and the price they got where known
- **Behaviour** The request moves to the `declined` view. Any live holds are surfaced with an explicit prompt to release them, since an abandoned hold still carries a ticketing limit. Releasing that hold is BK-23 and **is** a plain S3 confirm, per D3.
- **Primary action** `Record Decline`
- **Empty state** Not applicable
- **Phase** 1, since the declined-offer workflow is named in Phase 1

### RQ-21 Place Hold

- **URL** `/requests/{id}/hold`
- **Purpose** Take a reservation without payment, and create the two deadlines that come with it.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Form field row, Select, Date field, Deadline cell, Inline links, Primary button, Secondary button
- **Behaviour** Creates the booking record (BK-02) and both deadlines: the airline's stated ticketing limit stored **exactly as given and immutable** with the IANA zone it was quoted in, and our derived action-by time, which is the supplier time minus client payment time minus issuance time, pulled into office hours through the Israeli business calendar. Sorting and counting run on ours. All of that arithmetic is server side under `server/deadlines/` (D15).
- **Confirmation** None. Placing a hold is not on either D3 list. **Releasing** a hold is, and it is BK-23.
- **Primary action** `Place Hold`
- **Empty state**
  - Line 1 `Instant purchase required for this fare, so a hold is not available.`
  - Line 2 `Go to payment` (underlined link to RQ-06)
- **Phase** 2, live in Sabre in 3

### RQ-22 Send-to-Issue Checklist

- **URL** `/requests/{id}/send-to-issue`
- **Purpose** The safety gate. Because there are only two roles and both can do everything, safety comes from workflow, not from permissions.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Checklist row, Checkbox, Partial completion display, Help text, Inline links, Primary button, Secondary button
- **This screen answers an open item in another file.** `03-WINDOW-TYPES.md` 5.4 asks where the send-to-issue checklist lives now that issuing tickets raises no dialog. It lives here, as its own S2 `large` window with its own URL, and it always did. It is a real gate and it is not lost.
- **Checklist items** Payment confirmed. Legal passport names match documents exactly. Passport validity evaluated against the destination rule for these trip dates. Fare re-verified within the freshness window. Fee group and markup approved. SSRs and seating recorded. Client has seen and accepted the final price. Ticketing limit not passed.
- **Behaviour** Each item shows a **live computed answer**, not just a tick box. An item that cannot be satisfied prints the reason as a sentence in the same row, not as a colour or a glyph. A satisfied item may print its confirming sentence in `--c-good`, which is text only. An unsatisfied item prints in ordinary ink, because a checklist item that is not done yet is not urgent by itself. `Send to Ticketing` stays disabled until every item passes, and the disabled button's context prints the sentence naming what is outstanding, for example `Cannot send, 1 of 5 passports still missing`. The countdown for a partial item runs from the **earliest unsatisfied person**.
- **The disabled button appearance is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** So is the row height when a computed answer wraps to a second line. Do not shrink the type to fit.
- **Primary action** `Send to Ticketing`. **No confirmation**, per D3. The gate is the checklist.
- **Empty state** Not applicable
- **Phase** 2

### RQ-23 Blocked Flag

- **URL** `/requests/{queue}/{id}/details`, the `BLOCKED` section
- **Purpose** Mark a request as blocked without corrupting the stage machine. **Blocked is a flag, never a stage.**
- **Surface** **S2 `large`, edited in place in the `BLOCKED` section of RQ-03.** An earlier draft made this an S3 confirm carrying a mandatory reason select, a follow-up date field and a textarea. An S3 is a yes/no decision only (D1). A form-bearing dialog is an unspecified surface and this product has exactly five.
- **Components** Bordered section, Section header strip, Form field row, Select, Date field, Textarea, Required marker, Validation error, Primary button
- **Fields** Reason, mandatory, from the admin-managed list. Follow-up date, mandatory, anchored to an event wherever possible rather than typed. Free text detail.
- **Confirmation** None, per D3, which names setting and clearing the blocked flag on its no-confirmation list. **The mandatory reason field is the gate.**
- **Primary action** `Save` in the window footer, as for any other section of the record
- **Empty state** The section does not render when the flag is not set
- **Phase** 1

### RQ-24 Request Audit, full page

- **URL** `/requests/{id}/history/full`
- **Purpose** The complete, printable, filterable history of one request, for a dispute or a supervisor review.
- **Surface** **S5, the workspace**, being the `HISTORY` block of RQ-09 with its own filter control
- **Components** Page header, The canvas, Bordered section, Section header strip, Control strip (Show select: communications, changes, both), Column header row, Timeline row, Pagination, Secondary button
- **Actions** `Print` and `Export`, both page header buttons. Print output is owned by `03-WINDOW-TYPES.md` section 10.
- **Empty state**
  - Line 1 `Nothing recorded for this request yet.`
  - Line 2 `Entries appear here as soon as a communication is logged or a field is edited.`
- **Phase** 1

### RQ-25 Cancel Request

- **URL** none, an S3 confirm raised from the request record window or the row context menu
- **Purpose** Close a live request that the agency is no longer working.
- **Surface** **S3, the confirm.** Plain, no typing. Named by D3 on the plain confirm list.
- **Components** The confirm, Destructive button, Secondary button
- **Content** Title bar names the action and the object, `CANCEL REQUEST R-10482`. Body states the consequence in a sentence. Facts block: request, client, stage, any live hold and its ticketing limit. Buttons `[Keep request]` secondary and `[Cancel request]` destructive, which is a secondary button with `--c-urgent` label text and a 1px `--c-urgent` border. **There is no filled red button anywhere in this product.**
- **Phase** 1

### RQ-26 Delete Draft Proposal

- **URL** none, an S3 confirm raised from RQ-16
- **Purpose** Discard a proposal that was never sent.
- **Surface** **S3, the confirm.** Plain, no typing. Named by D3 on the plain confirm list.
- **Components** The confirm, Destructive button, Secondary button
- **Content** Facts block: request, number of options, when the draft was started, who by. Buttons `[Keep draft]` and `[Delete draft]`.
- **Phase** 2

---

## 3. CLIENTS

A client is a household account, not a person. **The client owns the onboarding lifecycle**, which is a separate machine from the booking stage machine, with six states, and it appears on exactly one screen in this product.

The Client record window carries **seven window tabs**: `Details` · `Travellers` · `Requests & Bookings` · `Onboarding` · `Communications` · `Documents` · `History`. **The cap is eight (D2), so seven is legal.** Tabs never scroll and never overflow. Any statement that a seventh tab is forbidden is a defect, and `03-WINDOW-TYPES.md` 4.6 names Clients at seven explicitly as a legal case.

### CL-01 Client List

- **URL** `/clients/{queue}`, default `/clients/all`
- **Purpose** Find a household, see its onboarding state and its fee group at a glance.
- **Surface** S1
- **Components** Same shell and box set as RQ-01: Crown, Object tabs, Queue tab band, Page header, The box, Section header strip, Control strip, The View picker, Column header row, Group header, Data row, Record-ID link, Agent cell, Pagination, Empty state, Loading state
- **Columns** Client (underlined link) | Household size | Fee group | Preferred representative | Onboarding state | Open requests | Last contact
- **Column widths NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D13 fixes the Requests reference grid only. Every other grid in this document carries the same note, stated once here and not repeated per screen.
- **Onboarding state** A plain word in ordinary ink. No colour, no stepper graphic in a grid cell.
- **Primary action** `New Client`, which opens CL-09
- **Empty state**
  - Line 1 `No clients in this queue.`
  - Line 2 `Show all clients` (underlined link to `/clients/all`)
- **Phase** 1

### CL-02 Client Record Window, Details tab

- **URL** `/clients/{queue}/{id}/details`
- **Purpose** The household record: who they are, who speaks for them, what they pay.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Textarea, Agent cell, Fare cell, Inline links, Help text, Primary button, Secondary button
- **Sections**
  1. `HOUSEHOLD` name, phone, email, address, preferred language, notes
  2. `REPRESENTATIVES` preferred representative and secondary representative, each a named traveller or contact with role and contact rules
  3. `CATEGORY AND FEES` the community pricing group, plus the effective-dated per-passenger booking fee currently in force with its effective date printed and an underlined `See fee history` link. **The canonical pricing group list is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Do not hard code names here, at RQ-02, at CL-12 or in Admin until it is settled.
  4. `ONBOARDING` the client lifecycle in six states: new inquiry, welcome sent, waiting for information, information received, review complete, fully onboarded. **This is the only screen in the product that shows the onboarding stepper**, and it never appears alongside the booking stage machine, because one screen never shows two steppers (D9).
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 1

### CL-03 Client Record Window, Travellers tab

- **URL** `/clients/{queue}/{id}/travellers`
- **Purpose** Everyone in the household, with document readiness.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Agent cell, Partial completion display, Inline links, Primary button
- **Columns** Traveller (link) | Passenger type | Date of birth | Nationality | Passport status | Loyalty
- **Passport status is a sentence, never a colour**: `Valid for this trip`, `Expires 12 March 2027`, `Client has not provided this yet`, `Too short for Thailand entry`. Passport validity is never rendered as a red date.
- **Tab label** `Travellers (5)`
- **Primary action** `Add Traveller`, which opens TV-09
- **Removing a traveller** is done from a booking, not from here, and **that** action raises a plain S3 confirm per D3. See BK-24.
- **Empty state**
  - Line 1 `No travellers recorded for this household.`
  - Line 2 `Add a traveller` (underlined link to TV-09)
- **Phase** 1

### CL-04 Client Record Window, Requests & Bookings tab

- **URL** `/clients/{queue}/{id}/requests`
- **Purpose** Everything this household has ever asked for and everything they have flown.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Stage cell, Deadline cell, Fare cell, Inline links, Primary button
- **Sections** `OPEN REQUESTS`, `BOOKINGS`, `CLOSED AND DECLINED`
- **Numerals** Fares and totals are right aligned currency and are tabular per D7.
- **Primary action** `New Request`, which opens RQ-10 pre-filled with this client
- **Empty state**
  - Line 1 `No requests for this client yet.`
  - Line 2 `Create a request` (underlined link to RQ-10)
- **Phase** 1

### CL-05 Client Record Window, Onboarding tab

- **URL** `/clients/{queue}/{id}/onboarding`
- **Purpose** Run the onboarding checklist and see exactly what is still missing.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Checklist row, Checkbox, Client has not provided this yet, Partial completion display, Form field row, Help text, Inline links, Primary button
- **Content** Checklist items from the admin-managed template. Each item carries an owner, a completed-at stamp and an explicit `Client has not provided this yet` state. Partial outcomes print as bare fractions, for example `Passports 3/5`. The row renders whatever the template defines and never hard codes the item list.
- **Relationship to the stepper** The six-state onboarding lifecycle is displayed on CL-02. This tab runs the checklist that moves it. The stepper itself is not repeated here.
- **Primary action** `Send Welcome Message` when the state is new inquiry, otherwise `Mark Item Complete`. Neither confirms, per D3, which names marking work complete and sending a message on its no-confirmation list.
- **Empty state**
  - Line 1 `No onboarding checklist assigned.`
  - Line 2 `Assign a checklist` (underlined link to the Admin section that owns checklist templates)
- **Phase** 1

### CL-06 Client Record Window, Communications tab

- **URL** `/clients/{queue}/{id}/communications`
- **Purpose** Every conversation with this household across every request.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Record-ID link, Inline links, Primary button
- **Content** Channel, direction, who, when, summary, linked request. **Separate from change history, always.** Each entry opens GL-05 as an S2 `medium`.
- **Primary action** `Log Communication`
- **Empty state**
  - Line 1 `No communications logged for this client.`
  - Line 2 `Log the first communication` (underlined link)
- **Phase** 1

### CL-07 Client Record Window, Documents tab

- **URL** `/clients/{queue}/{id}/documents`
- **Purpose** Household-level documents that are not tied to one traveller: authorisations, agreements, correspondence.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Attachment row, Inline links, Primary button
- **Content** Versioned, never overwritten, exactly as RQ-07. Superseded versions stay listed and stay openable. Each row carries a `View` link opening GL-03 as an S2 `medium`.
- **Primary action** `Upload Document`
- **Empty state**
  - Line 1 `No documents on file for this household.`
  - Line 2 `Upload a document` (underlined link)
- **Phase** 1

### CL-08 Client Record Window, History tab

- **URL** `/clients/{queue}/{id}/history`
- **Purpose** Change history for the household record.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Inline links
- **Content** Field-level audit with owner, timestamp, before and after. Each entry opens GL-05 as an S2 `medium`.
- **Primary action** None, read only. The window footer carries `[Save]` and `[Save & Close]` for the record as a whole, because all tabs belong to one form and one save.
- **Empty state**
  - Line 1 `No changes recorded.`
  - Line 2 `Changes appear here as soon as a field is edited.`
- **Phase** 1

### CL-09 New Client

- **URL** `/clients/new`
- **Purpose** Create a household.
- **Surface** S2 `large`, opened empty, title bar reads `NEW CLIENT`
- **Components** Record window, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Textarea, Client has not provided this yet, Required marker, Validation error, Column header row, Data row, Radio, Help text, Primary button, Secondary button
- **Behaviour** Duplicate detection runs as the name and phone are entered and fills a **`POSSIBLE DUPLICATES` bordered section inside this window**, above the footer. An earlier draft raised that check as an S3 confirm carrying a comparison grid, which does not fit an S3's anatomy or its 520px width (D1). It is a section, not a dialog.
- **The `POSSIBLE DUPLICATES` section** lists candidate households with the evidence that matched and a square radio per candidate: use the existing record, or continue creating a new one. It renders only when candidates exist.
- **Primary action** `Save & Close`. No confirmation, per D3.
- **Empty state** Not applicable
- **Phase** 1

### CL-10 Duplicate Detection Queue

- **URL** `/clients/possible-duplicates`
- **Purpose** The standing queue of households that look like the same family.
- **Surface** S1. The inline check during creation is **not** a second surface, it is the `POSSIBLE DUPLICATES` section of CL-09.
- **Components** The box, Section header strip, Control strip, Column header row, Data row, Record-ID link, Pagination, Empty state, Secondary button
- **Columns** Candidate A | Candidate B | Matched on | Confidence | Requests each | Last contact
- **Confidence** A word, not a coloured bar and not a percentage ring. Whether it is a word or a number, and the vocabulary if it is a word, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Primary action** `Review`, which opens CL-11
- **Empty state**
  - Line 1 `No possible duplicates found.`
  - Line 2 `New candidates appear here as clients are created.`
- **Phase** 1

### CL-11 Merge Clients

- **URL** `/clients/{id}/merge?with={other-id}`
- **Purpose** Combine two household records without losing anything.
- **Surface** **S5, the workspace.** A field-by-field comparison of two whole records needs the viewport, and D1 names that as exactly what a workspace is for.
- **Components** Page header, The canvas, Bordered section, Section header strip, Column header row, Data row, Radio, Record-ID link, Inline links, Primary button, Secondary button
- **Construction** Crown, page header with the actions, **no queue band, no box**. Bordered sections on the canvas, one per record area: household fields, travellers, requests, bookings, documents, communications.
- **Layout** Field by field side by side, with a square radio per field choosing the surviving value. Travellers, requests, bookings, documents and communications are all listed with their destination. **Nothing is deleted.** The losing record is retained and marked merged, and the merge names what it merged, because a correction cannot exist without naming what it corrects.
- **Primary action** `Merge`. **No confirmation.** Merging is not on either D3 list, and nothing is destroyed by it. The retained losing record is the undo.
- **Empty state** Not applicable
- **Phase** 1

### CL-12 Fee Group Assignment

- **URL** `/clients/{id}/fee-group`
- **Purpose** Move a household between pricing groups with an effective date, without rewriting history.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Form field row, Select, Date field, Column header row, Data row, Fare cell, Inline links, Primary button, Secondary button
- **Sections** `NEW ASSIGNMENT` group select and effective-from date. `ASSIGNMENT HISTORY` a dated table of previous assignments with `Effective from`, `Effective to`, `Value`, `Set by`, `Recorded on`, and an 80px leading status column printing `Current` at 11px/700 uppercase `--c-good` on the row that applies, `Scheduled` on future rows and **nothing at all on past rows** (D10).
- **Behaviour** Fees are effective dated. Changing the group **never** changes a fee already applied to an existing quote or an issued ticket. Editing never overwrites a row, it closes the current row and opens a new one.
- **`Recorded on` is a real column, not decoration.** "We were told on 30 July that the fee changed effective 1 June" is a normal week here, and it decides whether you chase the client or absorb the difference.
- **Column widths beyond D10's 80px status column are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Primary action** `Save`. No confirmation, including for a backdated row. The `Recorded on` column, not a dialog, is what makes a backdated change legible after the fact.
- **Empty state** Not applicable
- **Phase** 1

### CL-13 Delete Client

- **URL** none, an S3 confirm raised from the client record window
- **Purpose** Remove a household record.
- **Surface** **S3, the confirm, type-to-confirm** where the client has bookings. Named by D3 as type-to-confirm item 3.
- **Components** The confirm, Text input, Destructive button, Secondary button
- **Content** Title bar names the action and the object. Body states the consequence in a sentence. Facts block: client, household size, number of requests, number of bookings, number of issued tickets. Then a 30px `--h-input` text input, 1px `--c-border-control`, above the footer.
- **The literal string the user must type is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D3 settles that there is a word and that there are four such actions. It does not name the words. Do not assume `DELETE`.
- **Behaviour** The destructive button stays disabled until the typed string matches exactly, case-sensitive. `Enter` inside the field does not submit. Focus lands on the input on open.
- **Where the client has no bookings**, deleting is not on either D3 list and therefore raises **no confirmation at all**. D3 scopes item 3 to a client record that has bookings.
- **Phase** 1

---

## 4. TRAVELLERS

A traveller is a person with a legal passport identity. Travellers belong to households but exist in their own right, because the same person can travel under more than one account.

The Traveller record window carries **six window tabs**: `Identity` · `Documents` · `Loyalty` · `Preferences` · `Trips` · `History`. Under the cap of eight (D2).

### TV-01 Traveller List

- **URL** `/travellers/{queue}`, default `/travellers/all`
- **Purpose** Find a person, see whether their documents will actually get them on the plane.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Traveller (link) | Household | Passenger type | Date of birth | Nationality | Passport status | Next trip
- **Passport status** A sentence in ordinary ink, never a red date and never a badge.
- **Primary action** `New Traveller`, which opens TV-09
- **Empty state**
  - Line 1 `No travellers in this queue.`
  - Line 2 `Show all travellers` (underlined link to `/travellers/all`)
- **Phase** 1

### TV-02 Traveller Record Window, Identity tab

- **URL** `/travellers/{queue}/{id}/identity`
- **Purpose** The legal identity used to issue a ticket.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Agent cell, Client has not provided this yet, Required marker, Validation error, Help text, Primary button, Secondary button
- **Fields** Legal passport name (given, middle, surname, exactly as printed), date of birth, gender as printed, nationality, passenger type (adult, child, infant, **derived from date of birth against the travel date, never typed**), household links, contact
- **Rule** The ticketed name must match the passport exactly. This screen is the source of that string, and every ticket in the product depends on it.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 1

### TV-03 Traveller Record Window, Documents tab

- **URL** `/travellers/{queue}/{id}/documents`
- **Purpose** Passport and visa history, versioned.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Attachment row, Client has not provided this yet, Inline links, Help text, Primary button
- **Content** One row per document version: type, number, issuing country, issued date, expiry date, place of issue, version, superseded by, uploaded by, uploaded at, and a `View` link opening GL-03 as an S2 `medium`. **A renewed passport is a new document with a new number.** The old book stays listed and stays searchable, because it often still carries a valid visa and its number may be printed on an already issued ticket.
- **Under-16 rule** Under-16 passports are five-year books against ten for adults. The record stores the **actual** expiry and never assumes ten years.
- **Security** Numbers render masked with an explicit reveal action that writes to the audit log. The masked form and the reveal control's appearance are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Tab label** `Documents (4)`
- **Primary action** `Add Document Version`
- **Empty state**
  - Line 1 `No documents on file, and the client has not provided any yet.`
  - Line 2 `Add a document` (underlined link)
- **Phase** 1

### TV-04 Passport Validity Evaluation

- **URL** `/travellers/{id}/validity?trip={request-or-booking-id}`
- **Purpose** Answer the only question that matters: will this passport get this person into that country on those dates. **Passport validity is not a date alarm.**
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Help text, Inline links, Primary button, Secondary button
- **Content** One row per destination on the trip, each printing the rule that applies and the verdict as a sentence:
  - Thailand and the UAE, six months beyond entry
  - India, six months at the time of **visa application**, not at entry
  - Schengen, three months beyond departure **and** issued within the previous ten years
  - Canada and Australia, validity at entry only
  - Other destinations, from the admin-managed destination entry rule table
- **The verdict is a sentence, in ordinary ink, and it is not red.** A failure reads `Fails. Expires 4 February 2027, and Thailand requires validity to 18 February 2027.` `03-WINDOW-TYPES.md` is explicit that passport validity is never rendered as a red date and is always the sentence the rule engine produced. An earlier draft of this file set a failed verdict in `--c-urgent`, which extends the deadline ink into a second meaning and weakens both. No badge, no colour fill, no icon.
- **Where the urgency does live** A passport that fails for a trip with a live ticketing limit shows up as an unsatisfied item on the RQ-22 checklist and as a partial fraction on the request, and the **deadline** carries the urgency. The verdict states the fact.
- **Primary action** `Save Evaluation to Request`
- **Empty state**
  - Line 1 `No trip selected, so there is nothing to evaluate against.`
  - Line 2 `Choose a request or a booking to evaluate this passport against.`
- **Phase** 1 for the rules, wired into the send-to-issue gate in 2

### TV-05 Traveller Record Window, Loyalty tab

- **URL** `/travellers/{queue}/{id}/loyalty`
- **Purpose** Frequent flyer and Matmid numbers so they get onto the PNR.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Form field row, Primary button
- **Columns** Programme | Number | Tier | Verified at | Applied to bookings
- **Primary action** `Add Programme`
- **Empty state**
  - Line 1 `No loyalty programmes recorded.`
  - Line 2 `Add a programme` (underlined link)
- **Phase** 1

### TV-06 Traveller Record Window, Preferences tab

- **URL** `/travellers/{queue}/{id}/preferences`
- **Purpose** Seating, meals and special service requests, stored once and reused on every booking.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Form field row, Select, Text input, Date field, Column header row, Data row, Help text, Primary button
- **Sections** `SEATING` preferred position and together-with rules. `MEALS` special meal code, including the kosher options this agency actually uses. `SSRs` wheelchair, medical, unaccompanied minor and other, each with a free-text detail and an expiry where relevant.
- **Primary action** `Save & Close`
- **Empty state**
  - Line 1 `No preferences recorded.`
  - Line 2 `Preferences recorded here are applied to every future booking.`
- **Phase** 1, pushed to Sabre in 3

### TV-07 Traveller Record Window, Trips tab

- **URL** `/travellers/{queue}/{id}/trips`
- **Purpose** Everywhere this person has flown with us and everywhere they are going.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Deadline cell, Stage cell
- **Primary action** None, read only. Rows link to bookings.
- **Empty state**
  - Line 1 `No trips recorded for this traveller.`
  - Line 2 `Trips appear here once this person is added to a booking.`
- **Phase** 2

### TV-08 Traveller Record Window, History tab

- **URL** `/travellers/{queue}/{id}/history`
- **Purpose** Change history for the person record, including every document version added and **every masked-field reveal**.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Inline links
- **Empty state**
  - Line 1 `No changes recorded.`
  - Line 2 `Changes appear here as soon as a field is edited or a document is revealed.`
- **Phase** 1

### TV-09 New Traveller

- **URL** `/travellers/new`
- **Purpose** Create a person.
- **Surface** S2 `large`, opened empty, title bar reads `NEW TRAVELLER`
- **Components** Record window, Bordered section, Section header strip, Form field row, Text input, Select, Date field, Client has not provided this yet, Required marker, Validation error, Column header row, Data row, Radio, Primary button, Secondary button
- **Behaviour** Duplicate check on name plus date of birth plus passport number before save, presented as a `POSSIBLE DUPLICATES` bordered section inside this window, exactly as CL-09. **Nothing is mandatory except a name**, and everything else offers `Client has not provided this yet`.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 1

### TV-10 Traveller Duplicate Merge

- **URL** `/travellers/{id}/merge?with={other-id}`
- **Purpose** Combine two person records without losing anything.
- **Surface** **S5, the workspace**, identical construction to CL-11: no box, bordered sections on the canvas, no queue band, actions in the page header
- **Components** Page header, The canvas, Bordered section, Section header strip, Column header row, Data row, Radio, Record-ID link, Primary button, Secondary button
- **Primary action** `Merge`. **No confirmation**, per D3. Nothing is deleted, the losing record is retained and marked merged, and the merge names what it merged.
- **Empty state** Not applicable
- **Phase** 1

---

## 5. BOOKINGS

A booking is a PNR. It is created when a request is accepted or a hold is taken, and it is where the trip lives from that point until the passenger is home.

The Booking record window carries **seven window tabs**: `Summary` · `Segments` · `Passengers` · `Deadlines` · `Payments` · `Tickets` · `History`. The cap is eight (D2), so seven is legal and one seat remains.

### BK-01 Booking List

- **URL** `/bookings/{queue}`, default `/bookings/ticketing-deadlines`
- **Purpose** Every live reservation and what is about to expire on it.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** PNR (link) | Client | Passengers | Route | Departure | Stage | Waiting on | Total | Deadline | Agent
- **Numerals** `Total` is a right aligned currency column and is therefore **tabular** per D7. So is every other money column in the product. An earlier audit finding asked for the annotation to be removed on the grounds that tabular figures were capped at two sites. D7 replaces that cap, D17 names it as a phrase to stop using, and the annotation is correct as written.
- **Column widths NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D13 fixes the Requests grid only. The Deadline column should not be narrowed below the reference grid's 340px, because the sentence is the design, but that is a recommendation and not a settled value.
- **Urgency** The same five places as RQ-01, and none of them move the row. `Ticketing limit` and `Hold expires` go red. `Follow up` and `Check-in opens` never do, because they are not money.
- **Deadline cell** Our derived action-by time as the sentence, one line, no supplier number. `Why this date` opens GL-02.
- **Primary action** `Retrieve PNR`, which opens BK-10
- **Empty state**
  - Line 1 `No bookings in this queue.`
  - Line 2 `Show all bookings` (underlined link to `/bookings/all`)
- **Phase** 2

### BK-02 Booking Record Window, Summary tab

- **URL** `/bookings/{queue}/{id}/summary`
- **Purpose** One booking at a glance: who, where, when, what stage, what is owed.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Data row, Deadline cell, Stage cell, Fare cell, Agent cell, Inline links, Primary button, Secondary button
- **Sections**
  1. `BOOKING` record locator, carrier locator where it differs, PCC, created by, created at, and stage as a plain word in `--c-ink`, one of the seven (D9)
  2. `CLIENT AND REQUEST` links back to the household and the originating request
  3. `MONEY` total, paid, outstanding, and the fee group applied with its version sentence. Right aligned currency, tabular per D7.
  4. `DEADLINES` one row per obligation, our derived action-by time as the sentence, plus a separate labelled field reading **`Stated by supplier`** carrying the immutable supplier number with its IANA zone, plus the anchor, the owner and the outcome. Each row carries `Why this date`.
- **Booking stage** The only stepper here is the booking machine. **Client onboarding does not appear**, because one screen never shows two steppers.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 2

### BK-03 Booking Record Window, Segments tab

- **URL** `/bookings/{queue}/{id}/segments`
- **Purpose** The actual flights, in the actual PNR, with the actual status codes.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Help text, Primary button
- **Columns** Seq | Carrier | Flight | RBD | From | To | Departs (local, zone printed) | Arrives (local, zone printed) | Status | Equipment
- **Storage rule** Every time is stored as a **UTC instant plus the IANA zone it was quoted in**. Never a naive local timestamp. Display is in the segment's own zone with the zone named.
- **Tab label** `Segments (6)`
- **Primary action** `Refresh from Sabre`
- **Empty state**
  - Line 1 `No segments in this booking.`
  - Line 2 `Retrieve from Sabre` (underlined link to BK-10)
- **Phase** 3

### BK-04 Booking Record Window, Passengers tab

- **URL** `/bookings/{queue}/{id}/passengers`
- **Purpose** Who is on this PNR, with the name exactly as it will be ticketed.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Agent cell, Partial completion display, Inline links, Primary button, Secondary button
- **Columns** Passenger | Type | Ticketed name | Document | Seat | Meal | SSRs | Ticket number
- **Partial rule** Where something is satisfied for some passengers and not others, the section header strip prints the bare fraction, for example `SEATS CONFIRMED 4/5`, and any countdown runs from the **earliest unsatisfied person**. The assembled grammar and placement of that fraction are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, so use the bare fraction and nothing more elaborate.
- **Primary action** `Update Passenger Data in Sabre`
- **Removing a passenger** raises a plain S3 confirm, per D3. See BK-24.
- **Empty state**
  - Line 1 `No passengers on this booking.`
  - Line 2 `Add a traveller from the client household, or retrieve the PNR again.`
- **Phase** 3

### BK-05 Booking Record Window, Deadlines tab

- **URL** `/bookings/{queue}/{id}/deadlines`
- **Purpose** Every obligation attached to this booking, both times, and what happens if one passes.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Deadline cell, Form field row, Date field, Select, Agent cell, Inline links, Primary button
- **Columns** Obligation | Anchored to | `Stated by supplier` (immutable, with zone) | Our action-by time | Owner | Outcome | `Why this date`
- **This is one of the two places the supplier's number appears** (D8). The other is the deadline explainer, GL-02. It never appears in a grid cell on a list screen.
- **Anchoring** Every deadline is anchored to an event, **never typed**. `24 hours before this flight`, where the flight can move. If the flight moves, the deadline recomputes and any obsolete reminder is suppressed.
- **Business calendar** Our derived time is pulled into office hours through the Israeli business calendar: Sunday to Thursday weeks, Friday half days, Shabbat, moving holidays. This is a correctness dependency, not formatting, and it lives under `server/calendar/` (D15).
- **Why this date** Every row carries the underlined link opening GL-02, which prints the arithmetic in words with each subtraction naming the rule that supplied it.
- **Primary action** `Add Obligation`
- **Empty state**
  - Line 1 `No deadlines on this booking.`
  - Line 2 `Add an obligation, or place a hold to create the ticketing deadlines automatically.`
- **Phase** 2, live recomputation in 3 and 4

### BK-06 Booking Record Window, Payments tab

- **URL** `/bookings/{queue}/{id}/payments`
- **Purpose** Money in against this booking.
- **Surface** S2 `large`. Content, components, append-only rule and empty state are identical to RQ-06.
- **Numerals** Right aligned currency, tabular per D7.
- **Phase** 2, QuickBooks link in 6

### BK-07 Booking Record Window, Tickets tab

- **URL** `/bookings/{queue}/{id}/tickets`
- **Purpose** The tickets issued from this booking. **One record per passenger, never one per booking.**
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Fare cell, Agent cell, Inline links, Primary button
- **Columns** Ticket number (link) | Passenger | Status | Issued at | Issued by | Fare | Commission
- **Status** One of the five ticket statuses, `issued` · `exchanged` · `refunded` · `voided` · `partially flown`, as a word in ordinary ink. **This is not the booking stage list and never renders in a Stage cell.**
- **Tab label** `Tickets (5)`
- **Primary action** `Issue Tickets`, which opens TK-08
- **Empty state**
  - Line 1 `No tickets issued for this booking.`
  - Line 2 `Run the send-to-issue checklist` (underlined link to RQ-22)
- **Phase** 3

### BK-08 Booking Record Window, History tab

- **URL** `/bookings/{queue}/{id}/history`
- **Purpose** Two sections again: communication log and change history. **Never merged.**
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Inline links, Primary button
- **Primary action** `Log Communication`
- **Empty state** Each section prints its own two lines.
  - `COMMUNICATION LOG`: Line 1 `No communications logged.` Line 2 `Log the first communication` (underlined link)
  - `CHANGE HISTORY`: Line 1 `No changes recorded.` Line 2 `Changes appear here as soon as a field is edited.`
- **Phase** 2

### BK-09 Create Booking from Proposal

- **URL** `/requests/{id}/book`
- **Purpose** Turn an accepted proposal into a real PNR, on one of the two paths.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Radio, Form field row, Select, Date field, Fare cell, Help text, Primary button, Secondary button
- **Two paths** `Hold available` creates the PNR and both ticketing deadlines, and routes to RQ-21. `Instant purchase required` skips the hold, **states plainly in a sentence that payment must be taken before the fare is lost**, and routes straight to payment and then to RQ-22.
- **Primary action** `Create Booking`. No confirmation, per D3, which names creating any record on its no-confirmation list.
- **Empty state**
  - Line 1 `No accepted proposal on this request.`
  - Line 2 `Capture client response` (underlined link to RQ-19)
- **Phase** 2, real PNR creation in 3

### BK-10 Retrieve PNR

- **URL** `/bookings/retrieve`
- **Purpose** Pull an existing PNR out of Sabre by locator and attach it to a client and a request.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Form field row, Text input, Select, Column header row, Data row, Validation error, Primary button, Secondary button
- **Fields** Record locator, PCC select, then the retrieved segments and passengers for confirmation before attaching
- **Primary action** `Retrieve`
- **Empty state**
  - Line 1 `No record locator entered.`
  - Line 2 `Enter a six-character record locator and choose the PCC it lives in.`
- **Phase** 3

### BK-11 Schedule Change Review

- **URL** `/bookings/{queue}/{id}/schedule-change`
- **Purpose** A carrier moved a flight. Decide what happens, tell the client, and clean up every deadline that just became wrong.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Deadline cell, Radio, Textarea, Inline links, Primary button, Secondary button
- **Sections** `BEFORE AND AFTER` segments side by side. `CONNECTIONS` the impact on every connection, in words. `DEADLINE IMPACT` every anchored deadline recomputed and shown, old value and new value. `DECISION` accept, rebook, refund or escalate, as square radios, with a reason textarea.
- **Suppression rule** Accepting the change **suppresses obsolete reminders**. A 24-hour check-in reminder for a flight that no longer exists must not fire. This is a correctness requirement, not a nicety.
- **Primary action** `Apply Change`. **No confirmation**, per D3. Applying a schedule change is not on either list, and the decision radios plus the reason field are the deliberation.
- **Empty state**
  - Line 1 `No schedule changes on this booking.`
  - Line 2 `Changes notified by the carrier appear here automatically.`
- **Phase** 4

### BK-12 Seating

- **URL** `/bookings/{id}/seating`
- **Purpose** Assign seats per passenger.
- **Surface** **S5, the workspace.** No box, bordered sections on the canvas, no queue band, actions in the page header.
- **Components** Page header, The canvas, Bordered section, Section header strip, Column header row, Data row, Select, Partial completion display, Help text, Primary button, Secondary button
- **Sections** `PASSENGERS AND SEATS` one row per passenger with a seat field. `AVAILABILITY` the seats currently open on each segment, as rows.
- **Note** Seat selection is a list of passengers with seat fields plus an availability list. **A graphical seat map is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** There is no drag and drop in this product, so a map would need a click-to-assign model that nothing specifies.
- **Partial rule** `Seats confirmed 4/5`, bare fraction, ordinary ink.
- **Primary action** `Assign Seats`
- **Empty state**
  - Line 1 `Seat map not available for this flight.`
  - Line 2 `Record the seat request as an SSR instead` (underlined link to BK-13)
- **Phase** 3

### BK-13 SSR Management

- **URL** `/bookings/{id}/ssr`
- **Purpose** Push special service requests to the PNR and track whether the carrier confirmed them.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Select, Textarea, Partial completion display, Primary button, Secondary button
- **Columns** Passenger | SSR | Segment | Requested at | Carrier status | Confirmed at
- **Partial rule** The section header strip prints `SSRs CONFIRMED 2/4`.
- **Primary action** `Send to Carrier`
- **Empty state**
  - Line 1 `No special service requests on this booking.`
  - Line 2 `Add an SSR` (underlined link)
- **Phase** 3

### BK-14 Cancel Booking

- **URL** `/bookings/{id}/cancel`
- **Purpose** Cancel a live reservation, with the consequences on screen before the decision.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Select, Textarea, Column header row, Data row, Fare cell, Required marker, Validation error, Help text, Primary button, Secondary button
- **Sections** `CONSEQUENCES` printed in plain words: which tickets exist, whether they can still be voided, what the refund exposure is, what the client has paid, what commission is at risk. Then `REASON`, a mandatory select from the admin-managed list plus free text.
- **Behaviour** Writes to the override log (AG-04) if it bypasses anything. Any live hold on the booking is released through BK-23, which **is** a plain S3 confirm.
- **There is no "I understand this cannot be undone" checkbox.** That pattern does not exist in this product, and `03-WINDOW-TYPES.md` 5.4 names any file specifying it as a defect. The earlier draft of this file specified one, and it is gone.

> **Open item.** Whether cancelling a **booking** is covered by D3's plain-confirm entry `Cancel a request`, or is a separate action with no confirmation at all, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D3's list is exhaustive and names the request, not the booking. The two readings differ by a dialog on the most consequential reversible action in the product. Until it is settled, build the mandatory reason field, which is the gate under either reading, and leave the confirm out rather than inventing one.

- **Primary action** `Cancel Booking`
- **Empty state** Not applicable
- **Phase** 2

### BK-15 Active Trips

- **URL** `/bookings/travelling-now`
- **Purpose** Everyone in the air or between flights right now, in their own time zones.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** PNR (link) | Client | Passengers | Current position | Next event | Local time at next event (zone printed) | Agent
- **Grouping** By day of the next event. Group headers speak, exactly as RQ-01.
- **Primary action** `Open Service Timeline`, which opens BK-16
- **Empty state**
  - Line 1 `Nobody is travelling right now.`
  - Line 2 `Show all bookings` (underlined link to `/bookings/all`)
- **Phase** 4

### BK-16 Service Timeline

- **URL** `/bookings/{queue}/{id}/timeline`
- **Purpose** One trip laid out as a sequence of time-anchored obligations, each in the correct local zone.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Timeline row, Deadline cell, Agent cell, Select, Textarea, Inline links, Primary button
- **Content** One row per event: check-in opens, check-in due, boarding pass issued, departure, arrival, connection, post-arrival follow-up. Each row prints the event's own local time **with its zone**, our derived action-by time, the owner and the outcome. Recurring rules and single occurrences are **separate records**, and each occurrence carries its own outcome.
- **Timeline row rules** It is a data row with a fixed column set. **No dot, no rail, no spine, no alternating left and right layout, no icon per event type.** A deadline inside a timeline row is the deadline cell with all of its states, not a plain date.
- **Primary action** `Log Outcome`
- **Empty state**
  - Line 1 `No service events for this trip.`
  - Line 2 `Events appear here once the booking is ticketed and the flights are confirmed.`
- **Phase** 4

### BK-17 Check-in Escalation Ladder

- **URL** `/bookings/check-in-due`
- **Purpose** The shared critical queue. Everyone whose check-in is unresolved, ordered by how close to the aircraft door they are.
- **Surface** S1
- **Components** Same shell and box set as RQ-01, with Group header carrying the rung
- **Ladder** Four rungs, each its own group header: `24 HOUR REMINDER`, `12 HOUR FOLLOW UP`, `6 HOUR URGENT`, `1 HOUR CRITICAL`. The group header speaks the count and the number inside four hours. **The rung does not change the row's shape, fill or height. It changes what the row says.**
- **Columns** PNR (link) | Passengers | Flight | Departs (local, zone) | Rung | Checked in | Boarding pass | Agent
- **Partial rule** `Checked in 3/5`, and the countdown runs from the earliest unsatisfied passenger.
- **Deadline ink** `Check-in opens` never goes red at any time, because it is not money. The urgency on this screen is carried by the rung name in the group header and by the count line, not by recolouring a check-in deadline.
- **Primary action** `Confirm Check-in`, which opens BK-18
- **Secondary action** `Escalate to Supervisor`, which creates an AG-06 escalation
- **Empty state**
  - Line 1 `No check-ins outstanding.`
  - Line 2 `Show all bookings` (underlined link to `/bookings/all`)
- **Phase** 4

### BK-18 Check-in Confirmation

- **URL** `/bookings/{id}/check-in`
- **Purpose** Record that a passenger is actually checked in, with a boarding pass status, a seat check and a baggage check.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Checkbox, Form field row, Agent cell, Partial completion display, Primary button, Secondary button
- **Content** One row per passenger: checked in, boarding pass status, seat confirmed, baggage confirmed, who confirmed, when. Partial states print as bare fractions.
- **Primary action** `Save Check-in`. No confirmation, per D3, which names marking work complete on its no-confirmation list.
- **Empty state**
  - Line 1 `No passengers on this booking.`
  - Line 2 `Retrieve the PNR to load its passengers` (underlined link to BK-10)
- **Phase** 4

### BK-19 Support Cases

- **URL** `/bookings/all?view=support-cases` for the standing list, `/bookings/{queue}/{id}/case/{case-id}` for the record
- **Purpose** A passenger in trouble mid-trip and what we are doing about it.
- **Surface** S1 for the list, S2 `large` for the record
- **Components** The box, Section header strip, Control strip, Column header row, Data row, Record-ID link, Deadline cell, Agent cell, Pagination, Record window, Bordered section, Textarea, Timeline row, Select, Primary button
- **Note on placement** Support Cases is one of the three Bookings queues moved into the View dropdown under D12's cap of seven. It keeps its live count and its section header strip name. The case **record** is unaffected and keeps its own route.
- **Columns** Case (link) | PNR | Passenger | Opened | Type | Severity as a word | Agent | Next action | Deadline
- **Severity is a word in ordinary ink**, never a colour, never a chip. The severity vocabulary is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Primary action** `Open Case` on the list, `Log Action` on the record
- **Empty state**
  - Line 1 `No open support cases.`
  - Line 2 `Cases opened from a booking appear here until they are closed.`
- **Phase** 4

### BK-20 Post-arrival Follow-up

- **URL** `/bookings/{queue}/{id}/follow-up`
- **Purpose** The last obligation of a trip. Confirm arrival, ask the questions, close the loop.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Form field row, Textarea, Select, Date field, Deadline cell, Primary button, Secondary button
- **Behaviour** Anchored to arrival, never typed. `Follow up` is a deadline type that **never goes red**, because it is not money.
- **Primary action** `Complete Follow-up`
- **Empty state**
  - Line 1 `This trip has not arrived yet.`
  - Line 2 `The follow-up opens automatically once the last segment lands.`
- **Phase** 4

### BK-21 Agent Assistance Request

- **URL** `/bookings/{id}/assistance`
- **Purpose** An agent asks another agent, or a supervisor, to take something over right now.
- **Surface** **S2 `large`.** An earlier draft made this an S3 confirm carrying an assignee select, a textarea and an anchored date field. An S3 is a yes/no decision only (D1), so a form-bearing dialog would be a sixth surface. It is a small window instead.
- **Components** Record window, Bordered section, Section header strip, Form field row, Select, Textarea, Date field, Agent cell, Required marker, Primary button, Secondary button
- **Fields** Assignee, the reason, and a needed-by time which is **anchored** to the event driving it wherever possible rather than typed
- **Primary action** `Request Assistance`. No confirmation, per D3.
- **Empty state** Not applicable
- **Phase** 4

### BK-22 Fare Watch

- **URL** `/bookings/{queue}/{id}/fare-watch`
- **Purpose** Watch an issued premium or business booking for a lower booking class and tell a human when it clears.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Fare cell, Form field row, Select, Help text, Inline links, Primary button, Secondary button
- **Content** Watch criteria, target RBD, current availability, the saving if it cleared, and the consequence analysis against refund, voucher, penalty and reissue cost. A recommendation is printed as a sentence. **A human approves before any ticket change. Nothing here acts automatically.**
- **CRITICAL STRUCTURAL RULE** The fare watch is a **child of the confirmed booking, never a sibling.** It must never render as, be listed as, or be mistaken for a second booking. EL AL, United, Delta, American and Qatar all treat a second PNR for the same passenger as a duplicate booking, subject to cancellation and ADM charges. If a second locator exists at all it is stored as an **optional attribute of this record**, printed as a labelled field, and it never appears in the Bookings list as its own row. The default assumption is that the waitlist lives inside the confirmed PNR.
- **Numerals** Savings, penalties and reissue costs are right aligned currency and are tabular per D7.
- **Primary action** `Request Reissue Approval`
- **Empty state**
  - Line 1 `No fare watch on this booking.`
  - Line 2 `Start a fare watch` (underlined link)
- **Phase** 7

### BK-23 Release Hold

- **URL** none, an S3 confirm raised from the booking record window or from RQ-20
- **Purpose** Give back a reservation the agency is not going to ticket.
- **Surface** **S3, the confirm.** Plain, no typing. Named by D3 on the plain confirm list.
- **Components** The confirm, Destructive button, Secondary button
- **Content** Title bar names the action and the object, `RELEASE HOLD ON PNR ABCDEF`. Body states the consequence in a sentence: the seats go back, the fare is not guaranteed on rebooking. Facts block: PNR, passengers, route, the ticketing limit that will disappear, and the fare currently held. Buttons `[Keep hold]` secondary and `[Release hold]` destructive.
- **Phase** 2

### BK-24 Remove Traveller from Booking

- **URL** none, an S3 confirm raised from BK-04
- **Purpose** Take a passenger off a PNR.
- **Surface** **S3, the confirm.** Plain, no typing. Named by D3 on the plain confirm list.
- **Components** The confirm, Destructive button, Secondary button
- **Content** Facts block: passenger, PNR, whether a ticket has been issued for them, whether a seat or an SSR is held. Buttons `[Keep passenger]` and `[Remove passenger]`.
- **Note** If a ticket has already been issued for that passenger, removing them from the PNR does not void the ticket. Voiding is TK-09 and is a separate, type-to-confirm act. The confirm body says so in a sentence.
- **Phase** 3

---

## 6. TICKETS

One ticket record **per passenger**. Never one per booking. This is the single most consequential data rule in the ticketing area.

The Ticket record window carries **six window tabs**: `Ticket` · `Coupons` · `Fare Rules` · `Relationships` · `Financials` · `History`. Under the cap of eight (D2).

**Ticket status is its own vocabulary** and it is not the booking stage list: `issued` · `exchanged` · `refunded` · `voided` · `partially flown`. Five values, a word in ordinary ink, no colour fills. **Coupon status is a third vocabulary again**, `open` · `flown` · `exchanged` · `refunded` · `void`, and belongs to the coupon row. Do not merge any two of the three, and never render a ticket status in a Stage cell.

### TK-01 Ticket List

- **URL** `/tickets/{queue}`, default `/tickets/all`
- **Purpose** Every ticket the agency has issued and its current state.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Ticket number (link) | Passenger | PNR | Carrier | Route | Issued | Status | Fare | Commission | Agent
- **Numerals** `Fare` and `Commission` are right aligned currency and are tabular per D7.
- **Status** One of the five ticket statuses, as a word in ordinary ink. No colour fills, no badges.
- **Primary action** `Issue Tickets`, which opens TK-08
- **Empty state**
  - Line 1 `No tickets in this queue.`
  - Line 2 `Show all tickets` (underlined link to `/tickets/all`)
- **Phase** 3

### TK-02 Ticket Record Window, Ticket tab

- **URL** `/tickets/{queue}/{id}/ticket`
- **Purpose** The document itself.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Fare cell, Agent cell, Inline links, Primary button, Secondary button
- **Fields** Ticket number, passenger, PNR, carrier, issuing PCC, issued at, issued by, fare basis, tour code, ticket designator, endorsements, form of payment, base, taxes itemised, total, commission
- **Voided tickets** stay visible and searchable, with the word `VOID` printed in the record and in the list **as a plain word in `--c-ink-2`**, never a coloured fill and never a badge, because there are no chips or badges in this product. Financial records are append-only.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 3

### TK-03 Ticket Record Window, Coupons tab

- **URL** `/tickets/{queue}/{id}/coupons`
- **Purpose** Per-coupon usage status. This is what decides whether a refund is full or partial.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Primary button
- **Columns** Coupon | Segment | Carrier | Flight | Date | Status | Checked at
- **Status** The coupon vocabulary, `open` · `flown` · `exchanged` · `refunded` · `void`, as a word in ordinary ink.
- **Tab label** `Coupons (4)`
- **Primary action** `Refresh Status`
- **Empty state**
  - Line 1 `No coupon data retrieved.`
  - Line 2 `Refresh from Sabre` (underlined link)
- **Phase** 5

### TK-04 Ticket Record Window, Fare Rules tab

- **URL** `/tickets/{queue}/{id}/rules`
- **Purpose** What this fare actually allows, in the categories that govern voluntary action.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Help text, Primary button
- **Content** **Category 31** for voluntary changes and **Category 33** for voluntary refunds. Category 16 is stale and is not used. Each rule prints the retrieved text, the retrieved-at stamp and **the practical consequence stated in one sentence**, because the raw rule text is not readable under time pressure.
- **Primary action** `Retrieve Rules`
- **Empty state**
  - Line 1 `Fare rules not retrieved for this ticket.`
  - Line 2 `Retrieve rules` (underlined link)
- **Phase** 5

### TK-05 Ticket Record Window, Relationships tab

- **URL** `/tickets/{queue}/{id}/relationships`
- **Purpose** The chain. Which ticket this one replaced, which replaced it, which EMDs and MCOs attach to it.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Record-ID link, Fare cell, Agent cell
- **Columns** Related record (link) | Relationship (exchanged from, exchanged to, refunded by, EMD for, MCO for, replaced by) | Date | Amount | Agent
- **Rule** **A correction cannot exist without naming what it corrects.** Every row here names both ends.
- **Empty state**
  - Line 1 `This ticket has no related records.`
  - Line 2 `Exchanges, refunds, EMDs and MCOs appear here as they are created.`
- **Phase** 5

### TK-06 Ticket Record Window, Financials tab

- **URL** `/tickets/{queue}/{id}/financials`
- **Purpose** Everything money did to this ticket.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Data row, Fare cell, Inline links, Primary button
- **Content** Original fare and taxes, commission earned, commission recalled, change fees, additional collections, residual value, refund amounts, supplier refund status, credit memos, QuickBooks references
- **Numerals** Every one of those is a right aligned currency column and is tabular per D7.
- **Primary action** `Add Financial Adjustment`
- **Empty state**
  - Line 1 `No financial adjustments on this ticket.`
  - Line 2 `Adjustments appear here as exchanges, refunds and recalls are recorded.`
- **Phase** 5, QuickBooks in 6

### TK-07 Ticket Record Window, History tab

- **URL** `/tickets/{queue}/{id}/history`
- **Purpose** Every action taken on the ticket with owner, timestamp, status and outcome.
- **Surface** S2 `large`
- **Components** Window tab strip, Bordered section, Section header strip, Column header row, Timeline row, Inline links
- **Empty state**
  - Line 1 `No ticket history recorded.`
  - Line 2 `Actions appear here as soon as the ticket is touched.`
- **Phase** 3

### TK-08 Issue Tickets

- **URL** `/requests/{id}/issue`
- **Purpose** Actually issue. Reached only after RQ-22 passes.
- **Surface** S2 `large`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Checkbox, Agent cell, Fare cell, Validation error, Help text, Inline links, Primary button, Secondary button
- **Content** One row per passenger, each becoming its own ticket record. **Passenger selection is explicit**, because issuing five of five and issuing three of five are different acts.
- **Duplicate prevention** The screen checks for an existing issued ticket for the same passenger and the same segments and **refuses, naming the ticket it found**.
- **Primary action** `Issue`. **No confirmation.** Issuing tickets is not on either D3 list. An earlier draft of this file put it behind a confirm dialog and an earlier draft of `03-WINDOW-TYPES.md` had it as type-to-confirm. Both are wrong for the same reason: the gate is RQ-22, which computes eight real answers, and a dialog asking "are you sure" after that gate adds nothing except the reflex that defeats the four confirmations that matter.
- **Empty state**
  - Line 1 `The send-to-issue checklist is not complete.`
  - Line 2 `Open the checklist` (underlined link to RQ-22)
- **Phase** 3

### TK-09 Void Ticket

- **URL** none, an S3 confirm raised from the ticket record window
- **Purpose** Void inside the void window.
- **Surface** **S3, the confirm, type-to-confirm.** Named by D3 as type-to-confirm item 1.
- **Components** The confirm, Text input, Destructive button, Secondary button
- **Content** Title bar names the action and the object, `VOID TICKET 114-2938471023`. Body states the consequence in a sentence: the void is reported to the carrier, the commission is recalled, and the ticket stays visible and searchable marked void. It also states the **void deadline in the ticket's own zone**. Facts block: ticket, passenger, issued at, fare, commission. Then a 30px `--h-input` text input, 1px `--c-border-control`.
- **The literal string the user must type is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Do not assume `VOID`.
- **Buttons** `[Keep ticket]` secondary and `[Void ticket]` destructive, which is a secondary button with `--c-urgent` label text and a 1px `--c-urgent` border. **No filled red button.** The destructive button stays disabled until the typed string matches exactly, case-sensitive, and `Enter` inside the field does not submit.
- **Phase** 5

### TK-10 Exchange and Reissue

- **URL** `/tickets/{id}/exchange`
- **Purpose** The hardest workflow in the product. Change a ticket correctly, with the client's informed agreement on the record.
- **Surface** **S5, the workspace.** Named by D1 as a workspace use.
- **Components** Page header, The canvas, Bordered section, Section header strip, Column header row, Data row, Fare cell, Select, Checkbox, Radio, Textarea, Help text, Inline links, Primary button, Secondary button
- **Construction** Crown 84px with Tickets active. Page header 64px carrying the title, the context line and the buttons. **No queue tab band** (D11), so everything below moves up 38px. **No box.** Eight bordered sections stacked directly on the canvas, 2px `--c-border-container`, 16px vertical gaps, each with a 32px `--c-band-header` strip. This is the same section construction as an S2 body, which is why it reads as familiar, but it is a page and not a window. An earlier draft of this file drew these eight sections inside a box, which is not a legal box content order and is not what an S5 is.
- **Sections in order**
  1. `PASSENGER SELECTION` which tickets on this booking are being exchanged. Selecting some and not others is normal.
  2. `USAGE` coupon status from TK-03. A partially flown ticket exchanges differently.
  3. `RULE CHECK` the Category 31 outcome, printed as a sentence.
  4. `NEW ITINERARY` proposed segments with **RBD validation** against the fare.
  5. `MONEY` fare difference, tax difference, change fee, additional collection, residual value, and where the residual goes, MCO or EMD. Right aligned currency, tabular per D7.
  6. `WAIVER` the waiver code if one applies, with who authorised it.
  7. `CLIENT DISCLAIMER` the exact text shown to the client, with the confirmation that they agreed, who heard it, and when. **Written to the communication log, not just the change history.**
  8. `APPROVAL` reissue approval by a supervising agent, recorded in the override log (AG-04).
- **Primary action** `Reissue`. **No confirmation**, per D3. Reissuing is not on either list, and the disclaimer section plus the approval section are the deliberation. Note that reissue approval is the one place in the product where a supervisor's decision is a **blocking** step rather than after the fact, and that is a workflow gate rather than a permission.
- **Empty state**
  - Line 1 `No ticket selected to exchange.`
  - Line 2 `Select at least one ticket from the passenger selection above.`
- **Phase** 5

### TK-11 Refund

- **URL** `/tickets/{id}/refund`
- **Purpose** Refund a ticket fully or partially, and track the money all the way back from the supplier.
- **Surface** **S5, the workspace.** Same construction as TK-10: no box, bordered sections on the canvas, no queue band, actions in the page header.
- **Components** Same set as TK-10
- **Sections in order** `PASSENGER SELECTION`, `USAGE` with partially flown handled explicitly, `RULE CHECK` against Category 33, `CALCULATION` (refundable fare, refundable taxes, penalty, net to client), `COMMISSION RECALL` (what we give back), `SUPPLIER REFUND` (submitted at, reference, received at, reconciled), `CLIENT DISCLAIMER`, `APPROVAL`
- **Numerals** Every money column here is right aligned and tabular per D7.
- **Primary action** `Submit Refund`, which **raises an S3 type-to-confirm**, per D3 item 2. The confirm's facts block names the ticket, the passenger, the net amount to the client and the commission being recalled. The literal string is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Empty state**
  - Line 1 `No ticket selected to refund.`
  - Line 2 `Select at least one ticket from the passenger selection above.`
- **Phase** 5

### TK-12 EMD Record

- **URL** `/tickets/{queue}/{id}/ticket` where the record type is EMD
- **Purpose** Electronic miscellaneous documents: baggage, seats, services, residuals.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Column header row, Data row, Fare cell, Record-ID link, Primary button
- **Content** EMD number, type, passenger, related ticket, amount, status, issued at, used at
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 5

### TK-13 MCO Record

- **URL** `/tickets/{queue}/{id}/ticket` where the record type is MCO
- **Purpose** Miscellaneous charge orders, most often carrying a residual value from an exchange.
- **Surface** S2 `large`, same shape as TK-12, with an added `RESIDUAL SOURCE` bordered section naming the ticket the value came from and linking to it
- **Components** Same as TK-12
- **Primary action** `Save & Close`
- **Phase** 5

### TK-14 Commission Recall

- **URL** `/commissions/recalls`
- **Purpose** Commission we earned and then had to give back, tracked until it is settled.
- **Surface** S1, under the Commissions object tab
- **Components** The box, Section header strip, Control strip, Column header row, Data row, Record-ID link, Fare cell, Pagination, Empty state, Primary button
- **Columns** Ticket (link) | Passenger | Original commission | Recalled amount | Reason | Recalled at | Settled | QuickBooks reference
- **Numerals** Both money columns are right aligned and tabular per D7.
- **Primary action** `Record Recall`
- **Empty state**
  - Line 1 `No commission recalls outstanding.`
  - Line 2 `Recalls appear here when a ticket is voided, refunded or exchanged.`
- **Phase** 5

### TK-15 Ticket Reconciliation

- **URL** `/tickets/reconciliation`
- **Purpose** Match what we think we issued against what the carrier and the accounting system think we issued.
- **Surface** S1
- **Components** The box, Section header strip, Control strip, Column header row, Group header, Data row, Record-ID link, Fare cell, Pagination, Empty state, Primary button
- **Columns** Ticket (link) | Our record | Carrier record | QuickBooks record | Difference | Status
- **Grouping** By exception type, with the group header naming the exception in words.
- **Numerals** `Difference` is a right aligned numeric column and is tabular per D7.
- **Primary action** `Resolve Exception`
- **Empty state**
  - Line 1 `Everything reconciles.`
  - Line 2 `Exceptions appear here when our ledger, the carrier and QuickBooks disagree.`
- **Phase** 6

---

## 7. REPORTS

**Reports carries no queue tab band** (D11). The page header sits directly under the crown and everything below moves up 38px. Build the chrome as a flex column, never as absolute offsets.

Every report is a list of rows in the box with a control strip, **not a dashboard**. **No charts are specified anywhere in this product. If a chart is wanted, its design is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Numbers are rows.

### RP-00 Reports Index

- **URL** `/reports`
- **Purpose** Choose a report.
- **Surface** S1, with no queue band
- **Components** Crown, Object tabs, Page header, The canvas, The box, Section header strip, Column header row, Data row, Record-ID link, Pagination
- **Columns** Report (link) | What it answers | Last run | Agent
- **Primary action** None, rows are links
- **Empty state** Not applicable, the report list is fixed
- **Phase** 1

Every report below shares one anatomy: **S1 with no queue band**, one box, a control strip carrying a date range, a grouping select and a saved-view select, a column header row, group headers that speak, data rows, and explicit numbered pagination. There is no infinite scroll anywhere in this product. Every report has `Print` and `Export` secondary actions, and print output is owned by `03-WINDOW-TYPES.md` section 10.

**Every right aligned numeric or currency column in every report is tabular per D7**, which in practice means counts, rates, values, fares, commissions, margins and differences. Left aligned labels, dates and sentences stay proportional.

**Every report's empty state:**
- Line 1 `No data for the selected period.`
- Line 2 `Widen the date range` (underlined link)

**Column widths for every report grid are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, because D13 fixes the Requests reference grid only.

| ID | Report | URL | What it answers | Key columns | Phase |
|---|---|---|---|---|---|
| RP-01 | Conversion | `/reports/conversion` | How many requests became bookings, by agent, by pricing group, by source | Period, requests, quoted, accepted, declined, no response, conversion rate | 2 |
| RP-02 | Decline Reasons | `/reports/declines` | Why we lose | Reason, count, value lost, competitor where known, agent | 1 |
| RP-03 | Booking Fees | `/reports/fees` | What each pricing group actually generated | Fee group, passengers, fee per passenger with its effective date, total | 1 |
| RP-04 | Ticket Volume | `/reports/ticket-volume` | How much we issued | Period, carrier, tickets, passengers, agent, PCC | 3 |
| RP-05 | Commissions | `/reports/commissions` | What we earned, by PCC and carrier, since PCCs carry different commission rules | Carrier, PCC, tickets, gross fare, commission rate, commission, recalled, net | 3 |
| RP-06 | Margins | `/reports/margins` | What we actually made per booking after fees, markup and commission | Booking, cost, fee, markup, commission, margin, margin percent | 6 |
| RP-07 | Refunds | `/reports/refunds` | What went back out and whether the supplier paid us back | Ticket, refunded, penalty, commission recalled, supplier refund status, days outstanding | 5 |
| RP-08 | UATP | `/reports/uatp` | UATP bills against tickets issued | Bill, period, tickets matched, unmatched, difference | 6 |
| RP-09 | Deadline Risk | `/reports/deadline-risk` | What is about to be missed and what has been missed | Obligation, request or booking, `Stated by supplier`, our action-by time, hours remaining, agent, outcome | 2 |
| RP-10 | Check-in Exceptions | `/reports/check-in-exceptions` | Who did not get checked in and why | Booking, passengers, flight, rung reached, resolved, agent, outcome | 4 |
| RP-11 | Agent Workload | `/reports/agent-workload` | Who is carrying what | Agent, open requests, open bookings, obligations today, obligations overdue, cases | 2 |
| RP-12 | Missing Information | `/reports/missing-information` | What clients have not given us, **read from the explicit not-provided value, never from blanks** | Client, traveller, field, marked not provided at, days outstanding, agent | 1 |

**RP-09 is the one report that prints both deadline times.** It is a risk report, its whole job is the gap between the supplier's number and ours, and D8 permits the supplier number in the record window Deadlines section and in the deadline explainer. A report column is neither of those, so **whether RP-09 may print the supplier column is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Until it is settled, build the report with our action-by time and the hours remaining, and leave the supplier column out rather than widening D8 by implication.

**RP-12 depends on D5.** It reads the `Client has not provided this yet` value and never counts blanks. If that control is ever made optional, this report stops working, which is one of the reasons D5 says it is not optional.

---

## 8. MORE, SUPPLIERS

Reached from the `More` panel in the crown, which is surface S4 and holds Suppliers, Commissions, Agents and Admin. Suppliers carries a queue tab band with five tabs, under the cap of seven.

### SU-01 Supplier List

- **URL** `/suppliers/{queue}`, default `/suppliers/carriers`
- **Purpose** Carriers, PCCs, hotels and insurance providers we deal with.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Supplier (link) | Type | Code | Commission rule | Active | Agent
- **Primary action** `New Supplier`
- **Empty state**
  - Line 1 `No suppliers in this queue.`
  - Line 2 `Show all suppliers` (underlined link to `/suppliers/all`)
- **Phase** 3

### SU-02 Supplier Record

- **URL** `/suppliers/{queue}/{id}/details`
- **Purpose** What this carrier's rules are and how we ticket on them.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Text input, Select, Column header row, Data row, Textarea, Inline links, Primary button, Secondary button
- **Sections** `SUPPLIER`. Then `PCCs`, each PCC with its commission rule, tour codes and ticket designators, because multiple PCCs carry different commission rules and that difference is the whole reason the Commissions report is grouped the way it is. Then `CONTACTS` and `NOTES`.
- **Credentials are never displayed.** The field shows `Stored in secret storage` and a `Replace` button. Replacing a credential is **not** on either D3 list, so it raises no confirmation. If it should, that is an amendment to D3, not a local exception here.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 3

### SU-03 Hotels

- **URL** `/suppliers/hotels`
- **Purpose** Hotel suppliers and the bookings placed with them.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Hotel (link) | City | Chain | Commission rule | Bookings placed | Active
- **Primary action** `New Hotel Supplier`
- **Empty state**
  - Line 1 `No hotel suppliers recorded.`
  - Line 2 `Add a hotel supplier` (underlined link)
- **Phase** 6

### SU-04 Insurance Options

- **URL** `/suppliers/insurance`
- **Purpose** Track which insurance option was offered on each request and what the client chose, **including declining it**, because the record of the offer is the point.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Request (link) | Client | Option offered | Offered at | Client decision | Recorded by
- **Primary action** `Record Offer`
- **Empty state**
  - Line 1 `No insurance options recorded.`
  - Line 2 `Offers recorded on a request appear here, including declined ones.`
- **Phase** 6

---

## 9. MORE, COMMISSIONS AND FINANCE

The Commissions object tab carries all Phase 6 finance screens, because 01 fixes the object tab list and there is no Finance tab. See 0.7. Six queue tabs, under the cap of seven.

All of these use the same components as RQ-01 for lists and the same as RQ-03 for records. **All financial records are append-only.** Voided records stay visible and searchable, marked void with a plain word in `--c-ink-2`, never a coloured fill and never a badge. **Every money column is right aligned and tabular per D7.** Column widths are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

| ID | Screen | URL | Surface | Purpose | Primary action | Phase |
|---|---|---|---|---|---|---|
| CM-01 | Commissions Earned | `/commissions/earned` | S1 | Commission by ticket, carrier and PCC | `Export` | 3 |
| CM-02 | Commission Record | `/commissions/{queue}/{id}/details` | S2 `large` | One commission, its rule, its ticket, its status | `Save & Close` | 3 |
| CM-03 | Recalls | `/commissions/recalls` | S1 | The same screen as TK-14, reached from this tab | `Record Recall` | 5 |
| CM-04 | Invoices | `/commissions/invoices` | S1 | QuickBooks invoices raised against bookings | `Create Invoice` | 6 |
| CM-05 | Invoice Record | `/commissions/invoices/{id}/details` | S2 `large` | One invoice, its lines, its payment reference, its QuickBooks id | `Save & Close` | 6 |
| CM-06 | Credit Memos | `/commissions/credit-memos` | S1 | Credits issued, each naming the record it corrects | `Create Credit Memo` | 6 |
| CM-07 | UATP Bills | `/commissions/uatp` | S1 | UATP bills and their line matching | `Import Bill` | 6 |
| CM-08 | Reconciliation | `/commissions/reconciliation` | S1 | Our ledger against QuickBooks against the carrier | `Resolve Exception` | 6 |
| CM-09 | Refund Expenses | `/commissions/refund-expenses` | S1 | Refund-side costs and replacement-ticket adjustments | `Record Expense` | 6 |

**Empty states, two lines each:**

| ID | Line 1 | Line 2 |
|---|---|---|
| CM-01 | `No commissions in this period.` | `Widen the date range` (link) |
| CM-02 | Not applicable | |
| CM-03 | `No commission recalls outstanding.` | `Recalls appear here when a ticket is voided, refunded or exchanged.` |
| CM-04 | `No invoices in this period.` | `Create an invoice` (link) |
| CM-05 | Not applicable | |
| CM-06 | `No credit memos issued.` | `Create a credit memo` (link) |
| CM-07 | `No UATP bills loaded.` | `Import a bill` (link) |
| CM-08 | `Everything reconciles.` | `Exceptions appear here when our ledger, QuickBooks and the carrier disagree.` |
| CM-09 | `No refund expenses in this period.` | `Widen the date range` (link) |

**Sending an invoice and recording a payment raise no confirmation**, per D3, which names both on its no-confirmation list.

---

## 10. MORE, AGENTS AND SUPERVISOR

Six queue tabs, under the cap of seven. Supervising agent is a role, not a place, so supervisor work lives here rather than on an object tab of its own.

**Both roles see every screen in this section and every row in it.** There is no permission-denied state (D6) and no role-based row filter. Safety comes from review after the fact, from workflow gates and from append-only records.

### AG-01 Agent Workload

- **URL** `/agents/workload`
- **Purpose** Who is carrying what, right now.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Agent | Open requests | Open bookings | Due today | Overdue | Open cases | Oldest untouched
- **Numerals** Every count column is right aligned numeric and is tabular per D7.
- **Primary action** `Reassign`
- **Empty state**
  - Line 1 `No agents with open work.`
  - Line 2 `Show all agents` (underlined link to `/agents/all-agents`)
- **Phase** 2

### AG-02 Agent Record

- **URL** `/agents/{queue}/{id}/details`
- **Purpose** One agent: their role, their queues, their saved views, their activity.
- **Surface** S2 `large`
- **Components** Record window, Window tab strip, Bordered section, Section header strip, Form field row, Select, Agent cell, Column header row, Data row, Inline links, Primary button, Secondary button
- **Sections** `AGENT` name, email, and role. **The role field is a two-option select, Booking agent or Supervising agent, and nothing else, because there are exactly two roles.** It is not a permission matrix. Then `ASSIGNMENT`, the queues and pricing groups they cover, and `ACTIVITY`.
- **Changing a role is the single supervisor-only action in the product** and it is type-to-confirm (D3 item 4, D6). It is performed in the Admin `Users & Roles` section, not here. **How the role field presents to a booking agent is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D6 removes the denied state and D3 makes the action supervisor-only, so the two meet at exactly one control and nothing settles what that control looks like. Do not invent a disabled treatment and do not hide the field.
- **Note** The offshore intake employee is a **job**, not a role. They are a booking agent whose day is spent in RQ-11. Do not create a third role here without agreement.
- **Primary action** `Save & Close`
- **Empty state** Not applicable
- **Phase** 1

### AG-03 Supervisor Review Queue

- **URL** `/agents/review-queue`
- **Purpose** After-the-fact review. Because both roles can do everything, safety comes from review, not from permissions.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Item (link) | Type (pricing override, waiver, reissue, refund, void, cancel, merge) | Agent | Value | Occurred at | Reviewed | Reviewer | Outcome
- **Grouping** By type, with group headers that speak. Unreviewed items inside four hours print their count in `--c-urgent`, exactly as a queue tab count does, and nothing else changes.
- **Numerals** `Value` is right aligned currency and is tabular per D7.
- **Primary action** `Review`. **Review is after the fact and never blocks an action**, with the single exception of reissue approval at TK-10, which is a workflow gate rather than a permission.
- **Empty state**
  - Line 1 `Nothing awaiting review.`
  - Line 2 `Items appear here as overrides, waivers, reissues, refunds, voids, cancellations and merges occur.`
- **Phase** 2

### AG-04 Override Log

- **URL** `/agents/override-log`
- **Purpose** Every time somebody went around a default: a fee override, a waiver, a bypassed checklist item, a forced merge.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Override | What it bypassed | Reason given | Agent | Occurred at | Related record (link) | Reviewed
- **Rule** **An override cannot be recorded without naming what it overrode and why.** Read only, append only.
- **This is the screen RQ-15, BK-14 and TK-10 write to.** An earlier draft of this file sent RQ-15 to AG-05, which is Flagged Items. Every override reference in this document now points here.
- **Primary action** `Export`
- **Empty state**
  - Line 1 `No overrides recorded in this period.`
  - Line 2 `Widen the date range` (underlined link)
- **Phase** 2

### AG-05 Flagged Items

- **URL** `/agents/flagged`
- **Purpose** Everything currently carrying a blocked flag or a supervisor flag, across every object.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Record (link) | Object | Flag | Reason | Set by | Set at | Follow up | Agent
- **Note** This is where the Requests `blocked` view surfaces across objects, which is part of why blocked is a view rather than one of the seven Requests queue tabs under D12.
- **Primary action** `Clear Flag`. **No confirmation**, per D3, which names setting and clearing the blocked flag on its no-confirmation list. The mandatory reason on the flag is the gate, and clearing is reversible by setting it again.
- **Empty state**
  - Line 1 `Nothing flagged.`
  - Line 2 `Flagged records from every object appear here.`
- **Phase** 1

### AG-06 Escalations

- **URL** `/agents/escalations`
- **Purpose** Live escalations from servicing, needing a supervisor now.
- **Surface** S1
- **Components** Same shell and box set as RQ-01
- **Columns** Escalation (link) | Booking | Passenger | Raised by | Raised at | Reason | Deadline | Agent
- **Deadline cell** Our derived action-by time as the sentence, with all three states.
- **Primary action** `Take Ownership`
- **Empty state**
  - Line 1 `No open escalations.`
  - Line 2 `Escalations raised from the check-in ladder or a support case appear here.`
- **Phase** 4

---

## 11. MORE, ADMIN

Admin is reached from the `More` panel in the crown. **Admin is not a surface.** Its screens are the ordinary box, S1, under a section band. There is no settings surface (D1), and the earlier S7 code in this file is retired.

**The band.** Per D10, Admin screens **reuse the queue tab band component** as their section navigation, with the same 38px geometry, the same 13px/600 labels and the same active treatment, a 3px `--c-gold` rule flush along the tab's bottom edge. It is specifically **not a left sidebar**. There is nothing on the left edge of this product at any time, and Admin gets no exemption. Admin sections carry no counts, because they are not queues.

**Reading D10 against D11.** D10 says Admin reuses the queue tab band. D11 says Admin has no queue band. Read together: Admin carries no band **of queues**, and it carries the same 38px band **component** as section navigation. That is the reading `03-WINDOW-TYPES.md` 8.1 builds on and it is the reading this file builds on. If it is the wrong reading, that paragraph and this one are the defect. Raise it against `00-DECISIONS.md`.

**Editing an Admin record opens S2 `large`, unchanged.** A user record, a fee version, a template, a deadline rule are all records. There is no bespoke settings form surface.

### 11.1 The eight sections, named exactly as D10 names them

| Section | URL | Contains |
|---|---|---|
| Users & Roles | `/admin/users` | User list, email, role, status, last sign-in. Exactly two roles, Booking agent and Supervising agent. **Changing a role is the one supervisor-only action in the product and it is type-to-confirm** (D3 item 4). |
| Categories & Fees | `/admin/categories-fees` | Client categories and their effective-dated per-passenger booking fees. See 11.3. |
| Message Templates | `/admin/templates` | Approved client message templates by channel and by purpose. Templates version, editing creates a new version, and sent messages always record which version was used. |
| Deadline Rules | `/admin/deadline-rules` | The named rules that supply the terms in the deadline explainer: client payment time, issuance time, per-carrier overrides, the office-hours definition, and the Israeli business calendar (Sunday to Thursday, Friday half days, Shabbat, moving holidays). Every rule row carries a `Preview` link opening GL-02 against a sample deadline, so the person editing sees the arithmetic they are about to change. The calendar itself lives under `server/calendar/` (D15). |
| Escalation Ladders | `/admin/escalation-ladders` | The check-in ladder (24h reminder, 12h follow-up, 6h urgent, 1h critical) and other reminder ladders. A recurring rule and a single occurrence are different records. **This section edits rules only.** Occurrences live on the request or the booking, and editing a rule never rewrites past occurrences. |
| Sabre Accounts | `/admin/sabre-accounts` | Multiple PCCs, each with its commission rules, tour codes and ticket designators. **Credentials are never displayed.** The field shows `Stored in secret storage` and a `Replace` button, which raises no confirmation because it is on neither D3 list. |
| QuickBooks Mapping | `/admin/quickbooks` | Account mappings, invoice defaults, refund expense accounts, credit memo mapping, UATP bill mapping. |
| Audit & Security | `/admin/audit-security` | Sign-in history, the system-wide audit log including every reveal of a masked passport or payment field, audit log export, session policy, secret-storage status. Read-only lists whose rows open S2 `medium` (GL-05), never editable rows. |

**Every Admin screen is the same box**: section header strip, control strip, column header row, 44px data rows, pagination. **There is no Admin index screen and there is no ninth tab.** The earlier `AD-01 Admin index` at `/admin` is deleted, per D10 and `03-WINDOW-TYPES.md` 8.2. `/admin` redirects to `/admin/users`, the first section, exactly as an object tab redirects to its default queue.

**Empty states** follow 0.5. For each section, line 1 names what is not configured and line 2 names the way to configure it, for example:
- Line 1 `No users configured.` Line 2 `Add a user` (underlined link)
- Line 1 `No deadline rules configured, so no deadline can be derived.` Line 2 `Add a rule` (underlined link)

### 11.2 The nineteen documented areas, and how they map into the eight sections

An earlier draft of this file enumerated nineteen Admin areas reached from an index screen. D10 settles Admin at eight sections in a band and the arbiter outranks this file, so the nineteen must map into the eight. **The mapping is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `03-WINDOW-TYPES.md` 8.2 carries the same open item. The table below preserves the coverage so that nothing is lost, and marks the proposed home of each area as a proposal, not a settled value. **Do not build an index screen and do not build a ninth tab.**

| Documented area | What it holds | Proposed section | Confidence |
|---|---|---|---|
| Users and Roles | Two roles only | Users & Roles | Certain, D10 names it |
| Pricing Groups | The community pricing groups | Categories & Fees | High, D10's section is named "Categories" |
| Booking Fees | Per-passenger fee per group, effective dated | Categories & Fees | Certain, D10 names booking fees there |
| Message Templates | Approved client-facing text per channel and purpose, versioned | Message Templates | Certain |
| Onboarding Checklists | Checklist templates assigned to clients at intake | **Unmapped** | None. No section obviously owns it. |
| Deadline Rules | Anchors and offsets, client payment time, issuance time | Deadline Rules | Certain |
| Business Calendar | Israeli working week, Friday half days, Shabbat, moving holidays, office hours, US desk hours | Deadline Rules | High, `03-WINDOW-TYPES.md` 8.3 places the calendar inside Deadline Rules |
| Destination Entry Rules | Passport validity per destination, the Schengen ten-year rule, the India visa-application rule | **Unmapped** | None |
| Document Types | Types, versioning behaviour, retention | **Unmapped** | None |
| Decline Reasons | The picklist behind RQ-20 and RP-02 | **Unmapped** | None |
| Stages and Flags | The two stage machines and the flag definitions | **Unmapped** | None |
| Sabre PCCs | PCCs, commission rules, tour codes, ticket designators | Sabre Accounts | Certain |
| QuickBooks Mapping | Account mappings | QuickBooks Mapping | Certain |
| WhatsApp Channel | Channel configuration and message retention for intake | **Unmapped** | None |
| Integration Status | Sabre, QuickBooks, WhatsApp: connected, last successful call, last error, in words | **Unmapped**, possibly Audit & Security | Low |
| Audit and Security | The system-wide audit trail | Audit & Security | Certain |
| Saved Views | Shared saved views, their owners and their queue bindings | **Unmapped** | None |
| Intake Fields | Which fields exist at intake and the wording of each explicit not-provided value | **Unmapped** | None |
| Escalation ladders | The check-in ladder and other reminder ladders | Escalation Ladders | Certain, D10 names it, and it had **no counterpart** among the nineteen |

Two things fall out of that table and both need raising. **Eight of the nineteen areas have no home**, and every one of them is load bearing: onboarding checklists drive CL-05, destination entry rules drive TV-04, decline reasons drive RQ-20 and RP-02, intake fields drive D5 and RP-12. And **Escalation Ladders, which D10 names as a section, had no counterpart at all in the nineteen**, so that content has never been specified. Neither problem can be solved by inventing a ninth tab.

### 11.3 Effective-dated values

The part that is expensive to retrofit. Booking fees, and any other effective-dated value, are edited and displayed exactly as D10 specifies. **A fee is never a single number. It is a list of dated rows, and the list is the record.**

D10 fixes the columns: an 80px leading status column, then `Effective from`, `Effective to`, `Value`, `Set by`, `Recorded on`.

```
+--------------------------------------------------------------------------------+
| BOOKING FEE — BELEV ECHAD                                        4 versions    | 32 --c-band-header
+--------------------------------------------------------------------------------+
|          | Effective from | Effective to | Value | Set by  | Recorded on       | 30 --c-band-service
+--------------------------------------------------------------------------------+
| SCHEDULED| 1 Jan 2027     | open         | 45.00 | M. Roth | 4 Aug 2026        | 44
| CURRENT  | 1 Mar 2026     | 31 Dec 2026  | 40.00 | M. Roth | 30 Jul 2026       | 44
|          | 1 Jun 2025     | 28 Feb 2026  | 35.00 | S. Katz | 2 Jun 2025        | 44
|          | 1 Jan 2024     | 31 May 2025  | 30.00 | S. Katz | 20 Dec 2023       | 44
+--------------------------------------------------------------------------------+
   80px
```

- The status column is **80px** and leads the row. The currently applying row is marked by the word `Current` in 11px/700 uppercase `--c-good`. Future rows show `Scheduled`. **Past rows show nothing at all.** They do not read `Superseded`.
- `--c-good` is ink on a word here, for a current state. Never a fill, never a chip.
- `Effective to` is **derived, never typed**. It is the day before the next row's `Effective from`. The newest row reads `open`.
- **`Recorded on` is a real column, not decoration.**
- The `Value` column is right aligned currency, so it is **tabular** per D7.
- **Editing never overwrites a row.** It closes the current row and opens a new one. Adding a row is `New Fee Version` in the page header, opening S2 `large` with `Effective from` and `Value`. Correcting a mistake means adding a new row, because a correction cannot exist without naming what it corrects.
- Saving a fee version, forward dated or backdated, raises **no confirmation**, because neither appears on either D3 list. The `Recorded on` column, not a dialog, is what makes a backdated change legible after the fact.
- **Column widths beyond the 80px status column are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

**Showing what a rule was when a historical record was created.** Every record that consumed an effective-dated value stores the **version identifier** of the row it used, not just the resulting number. On RQ-05 the fee line reads:

```
Booking fee     40.00 per passenger
                Belev Echad, fee version effective 1 Mar 2026, recorded 30 Jul 2026.
                See fee history
```

The version sentence is 13px/400 `--c-ink-2` under the value. `See fee history` is an underlined `--c-link` link opening GL-05 as an S2 `medium` on that fee's version list, with the row that was used marked `Used by this request`. The same pattern applies to deadline rules, message templates and escalation ladders: the record stores the version, the record displays the version in words, and the link goes to a read-only version list.

---

## 12. GLOBAL SCREENS

Screens that belong to no single object because they open from everywhere. All five are **S2 `medium`**, 820 × 620, horizontally centred at y=90, which D1 names as the read-only size. Same construction as any S2: 2px `--c-crown` border, a 40px `--c-crown` title bar with a 15px/700 `--c-ink-invert` title, `--shadow-window`, the same `rgba(28,31,27,0.42)` backdrop with no blur, the same 26×26 square close button.

**`medium` has no window tab strip** (D2). Topic navigation inside one of these is a list of bordered sections in the body, one topic per window, with the topic named in the title bar.

**The footer is 52px with a 1px `--c-border-item` top rule and carries a single `[Close]` secondary button. No Save, ever.** A read-only window with a Save button is a bug report. `Esc`, backdrop click and the close button all close.

**Body height is 528px, that is 620 less the 40px title bar and the 52px footer. DERIVED** from D1 and D2.

These five screens had **no screen ID and no build phase** in the earlier draft of this file, which `03-WINDOW-TYPES.md` 4.10 and 4.11 correctly name as a gap in this file. They now have both.

### GL-01 Help

- **URL** none, opened from the crown `Help` utility link, which is present on every screen at the same pixel
- **Purpose** Instructional content written in the same sections-in-boxes structure as a record body, so it looks like the product rather than like a documentation site.
- **Surface** S2 `medium`
- **Components** Record window, Bordered section, Section header strip, Help text, Inline links, Secondary button
- **There is no icon rail and no floating question-mark button.** Where a screen has a help topic, the page header's secondary button row may carry a `Help` button opening the relevant topic. It is a button in the header, never a floating icon.
- **Body copy** 14px/400 `--c-ink`, maximum 640px measure
- **Open items** The help **topic list**, its **content owners**, and **search inside help** are all **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Phase** 1

**First-run guidance** is not a screen and not a surface. It is a page message band (`02-COMPONENT-LIBRARY.md` 6.2) at the top of the page on a user's first sessions, carrying one sentence and an underlined link into help, with an explicit `Dismiss` link. It never auto-dismisses. **No overlay, no coach mark, no spotlight tour, no tooltip sequence, no modal welcome dialog, no product tour.** How many sessions it persists for is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

### GL-02 Deadline Explainer

- **URL** none, opened by the underlined `Why this date` link
- **Purpose** The single most important instructional surface in the product. It shows the arithmetic **written out with named terms**. Not a formula, not a diagram, not a timeline graphic. Sentences and a table.
- **Surface** S2 `medium`
- **Components** Record window, Bordered section, Section header strip, Column header row, Data row, Fare cell, Inline links, Secondary button
- **Opened from** three places: the `DEADLINES` section of a record window (RQ-03, BK-02, BK-05), the deadline cell in a list grid (RQ-01, BK-01, AG-06 and every other grid carrying a deadline), and the `Preview` link on a Deadline Rules row in Admin.
- **Sections** `STATED BY SUPPLIER`, `OUR ACTION-BY TIME`, `ANCHOR`, and `PARTIAL COMPLETION` where the obligation is partial
- **Rules** The first section is titled with D8's exact field name, `Stated by supplier`, because it is the same value the record window Deadlines section shows and it must be recognisable as the same thing. Every subtraction is a labelled line naming the rule that supplied the number, with an underlined link to that rule in Admin, Deadline Rules. The office-hours pull always prints a sentence naming the calendar decision, including Friday half days, Shabbat and moving holidays. The IANA zone name is printed on every instant. `PARTIAL COMPLETION` names the specific person driving the countdown. Right aligned durations and amounts are tabular per D7, and the date and time sentences are proportional. **No Save, no editing.**
- **The arithmetic is computed under `server/deadlines/` (D15).** The explainer renders what the server returns and never recomputes anything in the browser.
- **The deep-link target for a Deadline Rules row is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `03-WINDOW-TYPES.md` 4.11 names this as a gap in this file. Admin is now eight sections rather than nineteen areas, so the route to a single rule inside `Deadline Rules` needs settling along with the Admin mapping in 11.2.
- **Phase** 2, with the Admin preview link in 2 as well

### GL-03 Document Preview

- **URL** none, opened by the `View` link on any attachment row
- **Purpose** Look at a passport scan, a PDF itinerary or an invoice without leaving the record.
- **Surface** S2 `medium`
- **Components** Record window, Bordered section, Section header strip, Form field row, Inline links, Secondary button
- **Anatomy** The who-and-when metadata is the **first bordered section of the body**, not a separate strip. **DERIVED** from D2, which states that the body of an S2 is a stack of bordered sections each with a `--c-band-header` header strip. There is no third band type inside a window. The document render fills the rest of the body, which is the only scrolling region.
- **Versioning** For versioned documents, `Version 2 of 3` sits in the footer with underlined `Previous` and `Next` links stepping through versions in place. Superseded versions stay openable.
- **Footer** `Download`, `Print`, the version indicator, then `[Close]`
- **Masked data** Where the document carries a masked field, revealing it writes to the audit log. The masked form and the reveal control's appearance are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**
- **Phase** 1

### GL-04 Proposal Preview

- **URL** none, opened by the `Preview` button on RQ-04's `PROPOSAL` section or on RQ-16
- **Purpose** Exactly what the client will receive, before it is sent.
- **Surface** S2 `medium`, read only
- **Components** Record window, Bordered section, Section header strip, Secondary button
- **The one artifact rule.** The preview renders the **stored server-rendered artifact**, the same bytes that become the PDF and the page-one image described in `07-BUILD-STANDARDS.md`. The preview, the PDF and the document the client receives are not three renderings of one design, they are one rendering shown three ways. This replaces the three competing mechanisms the audit found: a workspace preview page in this file, a read-only viewer in `03-WINDOW-TYPES.md`, and a server template in `07-BUILD-STANDARDS.md`.
- **The client-facing proposal document is an outbound artifact and is NOT governed by `01-CONSULATE-DESIGN-SYSTEM.md`. Its visual design is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** The CONSULATE chrome around the preview is governed by 01 and is the ordinary `medium` window.
- **Footer** `[Close]` only. **Sending is not done from here**, because a read-only `medium` carries a single Close button (D2). `Send to Client` is a page header button on RQ-16 and it opens RQ-18.
- **Phase** 2

### GL-05 Entry Viewer

- **URL** none, opened by clicking a row in a communication log, a change history, an audit list or a version list
- **Purpose** Read one entry in full: a sent message, a historical document version, a single audit or change-history entry, a fee version list.
- **Surface** S2 `medium`, read only
- **Components** Record window, Bordered section, Section header strip, Form field row, Column header row, Data row, Inline links, Secondary button
- **Content** The entry's own fields as a bordered section, then the full body of whatever it records. A sent message shows the channel, the recipient, the template and **the template version used**. A change-history entry shows field, before, after, owner and timestamp. A fee version list marks the row that was used as `Used by this request`.
- **Footer** `[Close]` only
- **Phase** 1

---

## 13. THE CONFIRM INVENTORY

**Unnecessary confirmations train the reflex that defeats the necessary ones.** D3's two lists are exhaustive and they are the arbiter's, not this file's. Every confirm in the product is below, mapped to the screen that raises it. Anything not here gets no confirmation at all.

### 13.1 Type-to-confirm. Exactly four, and no others.

The user types a specific word into a 30px `--h-input` text input, 1px `--c-border-control`, before the destructive button enables. Each of these dialogs prints a facts block: which ticket, which passenger, which amount, which user, which role.

| # | Action | Raised from | Screen |
|---|---|---|---|
| 1 | Void a ticket | The ticket record window | TK-09 |
| 2 | Issue a refund | The refund workspace, on `Submit Refund` | TK-11 |
| 3 | Delete a client record **that has bookings** | The client record window | CL-13 |
| 4 | Change a user's role | Admin, Users & Roles | Section 11.1 |

**The four literal strings are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D3 settles that there is a word and that there are four actions. It does not name the words. Do not assume `VOID`, `REFUND`, `DELETE` or similar.

Item 4 is also the **only supervisor-only action in the product** (D6).

### 13.2 Plain S3 confirm. Exactly five, no typing.

| Action | Raised from | Screen |
|---|---|---|
| Release a hold | The booking record window, and RQ-20 when a decline leaves a live hold | BK-23 |
| Discard unsaved changes | Every S2, on close by the close button, backdrop click or `Esc` | Global, see 13.4 |
| Cancel a request | The request record window and the row context menu | RQ-25 |
| Delete a draft proposal | The proposal builder | RQ-26 |
| Remove a traveller from a booking | The booking Passengers tab | BK-24 |

### 13.3 No confirmation at all. Just do it.

Everything else, explicitly including: every save, including `Save` and `Save & Close`. Every navigation, meaning object tabs, queue tabs, window tabs, views, sort and page. Every filter change. Marking work complete. **Setting or clearing the blocked flag**, because the mandatory reason field is the gate (RQ-23, AG-05). Adding a note, a research note or a communication log entry. Uploading a document and superseding a document version. Creating any record. Editing any field before save. Reassigning a follow-up date or changing the owning agent. **Sending a message or an invoice, and recording a payment** (RQ-06, RQ-18, CM-04). **Issuing tickets** (TK-08). **Applying a schedule change** (BK-11). **Merging two records** (CL-11, TV-10). **Placing a hold** (RQ-21). **Reissuing** (TK-10). **Replacing a Sabre credential** (SU-02, Admin Sabre Accounts). Every Admin save except changing a user's role, including a backdated fee version (CL-12, 11.3). Anything reversible by simply doing the opposite.

If someone proposes a confirmation for an action not on 13.1 or 13.2, the answer is no, and the reference is D3, not this file.

**Any file specifying an `I understand this cannot be undone` checkbox in place of a confirm is a defect.** That pattern does not exist here, and the earlier draft of this file specified one at BK-14.

### 13.4 The discard confirm, which every record window carries

Closing a dirty S2 by the close button, by backdrop click or by `Esc` raises an S3 reading:

```
Body:    Discard your changes to this request?
Buttons: [ Discard ] destructive   [ Keep editing ] secondary
```

Two buttons, not three. `Discard` is the destructive button, which per D3 is a **secondary button with `--c-urgent` label text and a 1px `--c-urgent` border**. There is no filled red button anywhere in this product. Switching between window tabs never discards anything, because all tabs belong to one form and one save. Backdrop click on a **clean** window closes it without a confirm.

### 13.5 The shape of every S3 in this product

Settled by D1, D2 and D3, and specified in full at `03-WINDOW-TYPES.md` section 5. Repeated here only so that a screen entry above does not need to.

- 520px wide, height auto to a maximum of 420px, horizontally centred at y=200, 0 radius, 2px `--c-crown` border, `--shadow-window`, the same backdrop as S2. **No tab strip. The body does not scroll.**
- Title bar 40px `--c-crown`, 15px/700 `--c-ink-invert`. **It names the action and the object**, never the word "Confirm" alone.
- Body 20px inset, 14px/400 `--c-ink`. It **states the consequence in a sentence, not a question**. `This cannot be reversed` is a fact, not a warning colour. No warning icon, no coloured band, no red panel.
- A facts block of label and value pairs, so the user re-reads what they are about to act on. This does more work than any amount of red.
- Footer 52px, 1px `--c-border-item` top rule, 20px inset, 10px button gap. **DERIVED** from D1's "same construction as S2" plus D2's footer specification.
- The destructive button's label is **the verb and the object**, `Void ticket`, never `OK` and never `Yes`. The other button names the safe outcome, `Keep ticket`, `Keep editing`.
- `Esc` and backdrop click both equal the non-destructive button. `Enter` activates the destructive button **only when there is no type-to-confirm field**. Focus lands on the non-destructive button for plain confirms and on the input for type-to-confirm dialogs.

---

## 14. FLOW, WHATSAPP MESSAGE TO ISSUED TICKET TO SERVICED TRIP

The end-to-end path. Each step names the screen, its ID and its surface.

### Main path

1. A WhatsApp message arrives. The intake agent opens **RQ-11 WhatsApp Intake** (S5) from the `Intake from WhatsApp` **page header button** on **RQ-01** (S1). The raw message is stored verbatim and will be attached to the request's communication log.
2. As the client is identified, the **`MATCH REVIEW` section of RQ-11** raises candidate households and travellers with the evidence that matched. The agent picks an existing client or creates a new one via **CL-09 New Client** (S2 `large`), whose own `POSSIBLE DUPLICATES` section runs the same check. Anything the client has not said is set to `Client has not provided this yet`, never left blank and never guessed.
3. `Create Request` produces the request. The agent lands on **RQ-03 Request Details** (S2 `large`) over the **RQ-01** list, which stays exactly where it was. The request appears in the `new-inquiries` queue.
4. If the client is new, **CL-05 Onboarding** (S2 `large`) runs in parallel on the client record. **CL-02 is the only screen that shows the onboarding stepper.** The request's booking stage is untouched, because one screen never shows two steppers.
5. Missing traveller documents are chased. **TV-03 Documents** (S2 `large`) records each passport as a new version, never an edit. **TV-04 Validity Evaluation** (S2 `large`) answers whether these documents work for this destination on these dates, as a sentence in ordinary ink.
6. The agent researches in **RQ-13 Research Notes** (S5) and records what was ruled out and why.
7. Fares are captured in **RQ-14 Record Fare** (S2 `large`), each with a server-stamped verified-at time. They appear on **RQ-05 Fares & Quotes** (S2 `large`), where an ageing quote states its age in words in ordinary ink and never changes colour.
8. **RQ-15 Markup and Fee Review** (S2 `large`) applies the client's effective-dated booking fee and the markup. Any override writes to **AG-04 Override Log**.
9. **RQ-16 Proposal Builder** (S5) assembles the options. **GL-04 Proposal Preview** (S2 `medium`) shows exactly what the client will get, rendered from the stored server artifact.
10. **RQ-18 Send Proposal** (S2 `large`) sends from an approved template, records which template version was used, writes the communication log entry, and creates a **follow-up deadline anchored to the send event, never typed**. The request moves to `quoted`.

### Branch at the client's answer

11. The agent opens **RQ-19 Client Response Capture** (S2 `large`) and records what the client actually said, in their words, with who heard it and when.

| Client says | Path |
|---|---|
| **Accepts** | Go to step 12. |
| **Asks for changes** | Return to **RQ-13** (S5), re-quote, re-send via **RQ-18**. The follow-up deadline re-anchors. The request returns to `in-research`. |
| **Declines** | **RQ-20 Decline Capture** (S2 `large`). The reason is structured, so **RP-02** is only as good as this screen. Any live hold is surfaced with an explicit prompt to release it through **BK-23** (S3), which is one of the five plain confirms. The request moves to the `declined` view. |
| **Does not respond** | The follow-up deadline re-anchors to the next interval. The request stays in `quoted` and surfaces in **RQ-01** when it is due. `Follow up` never prints red, because it is not money. |

### Branch at the booking path

12. **BK-09 Create Booking from Proposal** (S2 `large`) asks which of the two paths applies.

| Path | What happens |
|---|---|
| **Hold available** | **RQ-21 Place Hold** (S2 `large`) creates the PNR and both deadlines: the airline's stated ticketing limit stored exactly as given and immutable with its IANA zone, and our derived action-by time pulled into office hours through the Israeli business calendar. The booking appears in the `held` and `ticketing-deadlines` queues on **BK-01** (S1). Sorting and counting run on our time. **The grid cell prints ours and only ours**; theirs lives in the booking's Deadlines section and in **GL-02**. |
| **Instant purchase required** | No hold exists. The screen states plainly, in a sentence, that the fare will be lost. The agent goes straight to payment, then to step 14. |

13. The client pays. **RQ-06 Payments** (S2 `large`) records the invoice reference and the confirmation. **This raises no confirmation**, per D3.
14. **RQ-22 Send-to-Issue Checklist** (S2 `large`). Every item shows a live computed answer, not a tick box. `Send to Ticketing` stays disabled and prints what is outstanding, for example `Cannot send, 1 of 5 passports still missing`. Partial obligations count from the **earliest unsatisfied person**. This screen is the gate, and it is where `03-WINDOW-TYPES.md` 5.4's open item about the checklist's home is answered.
15. **TK-08 Issue Tickets** (S2 `large`). Passenger selection is explicit. Duplicate prevention checks for an existing ticket for the same passenger and the same segments and refuses, naming the ticket it found. **One ticket record is created per passenger.** No confirmation, because the gate was step 14. Booking stage moves to `Ticket issued`.
16. Confirmation is sent from an approved template through the same mechanism as **RQ-18**. Booking stage moves to `Confirmation sent`, which is the seventh and last stage. The booking leaves `ready-to-issue` and appears under the `ticketed` view.
17. A supervising agent reviews the pricing override, the waiver or the issuance **after the fact** in **AG-03 Supervisor Review Queue** (S1). Review never blocks an action, with the single exception of reissue approval inside **TK-10**, which is a workflow gate rather than a permission.

### Servicing

18. The booking's anchored obligations populate **BK-16 Service Timeline** (S2 `large`), each printed in its own local zone with the zone named.
19. **BK-17 Check-in Escalation Ladder** (S1) works the four rungs: 24 hour reminder, 12 hour follow up, 6 hour urgent, 1 hour critical. **Rows do not move, tint or change shape between rungs.** The group header and the deadline sentence change. `Check-in opens` never goes red.
20. **BK-18 Check-in Confirmation** (S2 `large`) records checked in, boarding pass, seat and baggage per passenger. Partial states print as bare fractions.
21. If a carrier moves a flight, **BK-11 Schedule Change Review** (S2 `large`) recomputes every anchored deadline and **suppresses obsolete reminders**. A 24-hour check-in reminder for a flight that no longer exists must not fire.
22. Trouble mid-trip becomes a case in **BK-19 Support Cases** (S1 for the list, S2 `large` for the record), escalating through **BK-21** (S2 `large`) and **AG-06** (S1).
23. On arrival, **BK-20 Post-arrival Follow-up** (S2 `large`) closes the trip.

### After the trip

24. Exchanges run through **TK-10** (S5) and refunds through **TK-11** (S5). Both require a client disclaimer **written to the communication log, not just the change history**, and both write a relationship row in **TK-05** naming what they corrected. `Submit Refund` raises the type-to-confirm S3, per D3 item 2. `Reissue` does not, because it is not on either list.
25. Commission, recalls and reconciliation land in **CM-01**, **CM-03** and **CM-08**, and reporting reads from there.
26. For eligible issued premium and business bookings, **BK-22 Fare Watch** (S2 `large`) runs as a **child of the confirmed booking and never as a second booking**. A human approves any resulting reissue. Nothing here acts automatically.

### The surfaces this flow touches, counted

S1 at steps 1, 17, 19, 22 and 25. S2 `large` at 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 15, 18, 20, 21, 22, 23 and 26. S2 `medium` at 9. S3 at the decline branch and at 24. S5 at 1, 6, 9 and 24. S4 wherever a menu opens. **Five surfaces cover the entire product end to end**, which is the point of D1.

---

## 15. BUILD ORDER

### The six screens that must exist before anything else is useful

Nothing in this product works until these are real. Build them in this order.

1. **RQ-01 Requests Queue List** (S1). The reference implementation. Every other list in the product is this screen with different columns. Get the crown, the queue band, the page header, the box, the group headers, the deadline sentences, the D13 column widths and the pagination exactly right once, and the rest of the product is assembly. **Build the chrome as a flex column** while you do it, because every band-suppressed screen depends on that decision being made here.
2. **RQ-03 Request Record Window, Details** (S2 `large`). The record window pattern: the backdrop, the shadow, the window tab strip, the bordered sections, the 52px footer with `[Save]` then `[Save & Close]`, and the discard confirm that comes with it.
3. **CL-02 Client Record, Details** (S2 `large`). Proves the pattern generalises to a seven-tab window, and establishes the household, fee group and onboarding model.
4. **TV-02 Traveller Record, Identity** (S2 `large`). Establishes the legal-name identity that every ticket in the product depends on.
5. **RQ-11 WhatsApp Intake** (S5). The first workspace, and the screen that actually fills the database. It is also the first screen with no queue band, which proves the flex column from step 1.
6. **Admin, Deadline Rules** (S1 under the section band), which owns the Israeli business calendar. Not glamorous. **Nothing derived is correct without it, and every deadline in the product is derived.** Build `server/calendar/` and `server/deadlines/` behind it, and test them first, because date arithmetic is the code an AI assistant writes confidently and wrongly.

### Phase 0, validation, security, architecture

Admin `Users & Roles`, Admin `Deadline Rules` including the business calendar, Admin `Audit & Security`. Integration status, wherever 11.2 settles that it lives. Plus `assets/tokens.css`, the component library restyled onto the `shadcn/ui` base that D14 permits, and the two shells, list and record, with no real data.

**No date arithmetic in the browser.** Everything under `server/` owns it: `server/deadlines/` for anchor resolution, the two-deadline split and all date arithmetic, `server/calendar/` for the Israeli business calendar, `server/documents/` for passport versioning and validity, `server/fees/` for category and effective-date resolution (D15).

**Restyle the component base to the tokens at install time**, before forty screens exist. Material UI, Ant Design, Chakra, Bootstrap and PrimeReact are forbidden as dependencies (D14).

### Phase 1, CRM, intake, documents, history

RQ-01, RQ-02, RQ-03, RQ-07, RQ-08, RQ-09, RQ-10, RQ-11, RQ-12, RQ-20, RQ-23, RQ-24, RQ-25
CL-01 through CL-13
TV-01 through TV-10
RP-00, RP-02, RP-03, RP-12
AG-02, AG-05
GL-01, GL-03, GL-05
Admin: `Categories & Fees`, `Message Templates`, plus whichever sections 11.2 settles as the home of onboarding checklists, destination entry rules, document types, decline reasons, stages and flags, the WhatsApp channel, saved views and intake fields

At the end of Phase 1 the agency can run its client book, its people, its documents and its intake in this product, and can report on what is missing and why deals are lost. It cannot yet quote or book.

### Phase 2, request to quote to booking workflow

RQ-04, RQ-05, RQ-06, RQ-13, RQ-14, RQ-15, RQ-16, RQ-18, RQ-19, RQ-21, RQ-22, RQ-26
BK-01, BK-02, BK-05, BK-06, BK-08, BK-09, BK-14, BK-23
TV-07
GL-02, GL-04
RP-01, RP-09, RP-11
AG-01, AG-03, AG-04
Admin: `Deadline Rules` content beyond the calendar

At the end of Phase 2 a request goes end to end, with deadlines that are anchored and derived correctly, but bookings are recorded rather than transacted.

### Phase 3, Sabre and ticketing operations

BK-03, BK-04, BK-07, BK-10, BK-12, BK-13, BK-24
TK-01, TK-02, TK-07, TK-08
SU-01, SU-02
CM-01, CM-02
RP-04, RP-05
Admin: `Sabre Accounts`

### Phase 4, active trip servicing

BK-11, BK-15, BK-16, BK-17, BK-18, BK-19, BK-20, BK-21
AG-06
RP-10
Admin: `Escalation Ladders`

### Phase 5, ticket lifecycle

TK-03, TK-04, TK-05, TK-06, TK-09, TK-10, TK-11, TK-12, TK-13, TK-14
RP-07

### Phase 6, finance and supporting

TK-15
CM-04, CM-05, CM-06, CM-07, CM-08, CM-09
SU-03, SU-04
RP-06, RP-08
Admin: `QuickBooks Mapping`

### Phase 7, fare optimisation

BK-22 only. It depends on Phase 5 being complete, because the consequence analysis is meaningless without exchange and refund calculation. **Build the child-of-booking structure before any monitoring logic**, so that it is structurally impossible for a fare watch to be created as a sibling PNR.

### Phase 8, client portal

Not designed. De-prioritised by the client. Do not design around it. Management reporting in section 7 still applies and is not part of this phase.

---

## 16. WHAT IS NOT IN THIS INVENTORY, AND WHY

Absence is a design decision, and an agent fills an absence with a default.

- **No dashboard and no home screen.** The product opens on `/requests/needs-action-today`. The work list is the home screen.
- **No notification centre and no toast queue.** There are no toasts in this product at all, for anything (D6). Everything that needs attention is a row in a queue with a live count on a tab, or a page message band that persists until the condition clears.
- **No search results page.** The crown search field is a record lookup. It jumps to the record, or it drops an S4 panel of matches. **The behaviour when a search returns many results across objects is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** So are the panel's width, its grouping-by-object rule, its row anatomy and its no-match state. `02-COMPONENT-LIBRARY.md` 1.4 currently asserts a results page in its states table, which is the stronger claim and is not settled anywhere. See 0.8.
- **No settings screen for the individual user.** No dark mode, no density toggle, no theme, no saved layout.
- **No mobile layout.** D11 settles this: **desktop only, no mobile build in scope**, minimum viewport 1300px, and below that the page scrolls horizontally. This is no longer an open question. Do not add responsive behaviour and do not add a hamburger, because nothing lives on the left edge of this product at any time.
- **No print view screen, because print is a stylesheet.** `03-WINDOW-TYPES.md` section 10 owns the print specification and is authoritative for it (D16). The earlier draft of this file said no print stylesheet was specified, which is a defect against D16. In summary: the crown, the queue band, the page header buttons, pagination and the View controls are removed, a print header replaces the crown carrying the agency name, the screen title, the active view and the timestamp, the box loses its border and prints as plain ruled rows, group headers repeat on page break, and band fills print. Any screen can be printed and put in a folder, which is a requirement and not a nicety.
- **No permission-denied screen.** There is no such state (D6). Both roles do everything operational.
- **No client-facing screens at all.** The proposal document previewed at GL-04 is the only thing a client ever sees, and its design is not governed by 01.
- **No sixth surface.** Not a side panel, not a slide-over, not a drawer, not an inline row expansion, not an accordion row, not a wizard with a progress stepper, not a floating action button, not a command palette, not a popover card on hover, not a tooltip carrying information the user needs to act on. Each of those has an answer in the five, and `03-WINDOW-TYPES.md` section 2 lists the answers.

---

## 17. OPEN ITEMS, COLLECTED

Every unsettled value in this file, in one list, so that a build agent can raise them in one pass rather than discovering them one at a time. Each is stated at its point of use above in the exact words **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

| # | Open item | Where |
|---|---|---|
| 1 | The item count string format in the section header strip, including whether an empty grid prints one | 0.5 |
| 2 | Whether pagination renders below an empty state | 0.5 |
| 3 | The `Waiting on` column's value vocabulary on the reference grid | RQ-01 |
| 4 | Column widths for every grid other than the Requests reference grid | RQ-01, and every list screen |
| 5 | The canonical pricing group list | RQ-02, CL-02, CL-12, Admin |
| 6 | The View picker panel width, where `02-COMPONENT-LIBRARY.md` says 320px and `03-WINDOW-TYPES.md` says unspecified | RQ-02, 0.8 |
| 7 | Whether the Request Details tab carries `CLIENT`, `INTAKE`, or both, and the final section order | RQ-03 |
| 8 | The fare freshness window in hours, and the placement of the verified-at stamp in the row | RQ-05, RQ-14, RQ-22 |
| 9 | The masked form of secret-storage fields and the appearance of the reveal control | RQ-07, TV-03, GL-03 |
| 10 | The two-column split ratio and the horizontal gap between two bordered sections on an S5 | RQ-11 |
| 11 | The disabled appearance of any control, including a gate's primary button | RQ-22, and every disabled control |
| 12 | Checklist row height when a computed answer wraps to a second line | RQ-22 |
| 13 | The four literal type-to-confirm strings | 13.1, TK-09, TK-11, CL-13, Admin |
| 14 | Whether cancelling a booking is covered by D3's `Cancel a request`, or confirms not at all | BK-14 |
| 15 | The duplicate-detection confidence format, word or number, and its vocabulary | CL-10 |
| 16 | The support case severity vocabulary | BK-19 |
| 17 | Whether a graphical seat map exists, and its interaction model given no drag and drop | BK-12 |
| 18 | Whether RP-09 Deadline Risk may print the supplier's stated time as a report column | RP-09 |
| 19 | Whether any chart exists anywhere in Reports, and its design if so | Section 7 |
| 20 | How the nineteen documented Admin areas map into D10's eight sections, and where the eight unmapped ones live | 11.2 |
| 21 | What `Escalation Ladders` contains, given it had no counterpart among the nineteen | 11.2 |
| 22 | Column widths for the effective-dated value table beyond D10's 80px status column | 11.3, CL-12 |
| 23 | The help topic list, its content owners, and search inside help | GL-01 |
| 24 | How many sessions first-run guidance persists for | GL-01 |
| 25 | The deep-link target for a single rule inside Admin `Deadline Rules` | GL-02 |
| 26 | The client-facing proposal document's visual design, which 01 does not govern | GL-04 |
| 27 | The crown search panel: width, grouping by object, row anatomy, no-match state, and whether a results page exists | Section 16 |
| 28 | How the role field in Admin `Users & Roles` presents to a booking agent, given no denied state exists | AG-02, 11.1 |
| 29 | Which instant triggers the overdue state, the supplier's stated time or our derived action-by time | 0.7, and every deadline cell |
| 30 | Whether an S2 `medium` may open over an S2 `large` | 0.2 |
| 31 | The initials square's dimension and fill | 0.1, Agent cell |
| 32 | The assembled string grammar and placement for partial completion | 0.7, RQ-03, BK-04, BK-13 |

Values this file **derived** rather than invented, marked at their point of use and repeated here so that they can be checked rather than trusted:

| Value | Derived from |
|---|---|
| S2 `medium` body height of 528px | D1's 620px height less D2's 40px title bar and 52px footer |
| The metadata block in GL-03 is a bordered body section, not a separate strip | D2, which permits only bordered sections with `--c-band-header` strips inside a window body |
| S5 sections use the S2 body's section construction | `03-WINDOW-TYPES.md` 7, which states the same 2px bordered sections, 16px gaps and 32px header strips |
| The S3 footer at 52px with a 1px `--c-border-item` top rule | D1's "same construction as S2" plus D2's footer specification |
| Every list screen other than RQ-01 inherits RQ-01's box anatomy | 01 section 3 and `02-COMPONENT-LIBRARY.md` 2.2, which give the box one content order |

Nothing else in this document is a guess. Where a value is absent from `assets/tokens.css`, `01-CONSULATE-DESIGN-SYSTEM.md` and `00-DECISIONS.md`, it is in the table above, and the correct response is to raise it rather than to fill it.
