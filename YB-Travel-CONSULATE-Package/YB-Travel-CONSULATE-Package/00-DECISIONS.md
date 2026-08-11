# 00-DECISIONS.md — The Arbiter

**Read this before any other file except `01-CONSULATE-DESIGN-SYSTEM.md`.**

This file exists because six specification documents were drafted in parallel and each one closed the same open questions differently. An audit found 129 contradictions. This file resolves every one of them, once.

## Authority order

When two files disagree, the higher one wins:

1. `assets/tokens.css` — every colour, size and spacing value
2. `01-CONSULATE-DESIGN-SYSTEM.md` — the locked design language
3. **this file** — resolutions of everything 01 left open
4. `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md`
5. `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md`, `07-BUILD-STANDARDS.md`
6. `assets/consulate-reference.html`

If a file below this one contradicts this one, **this one is right and that file is a defect.** Report it, do not follow it.

---

## D1. There are exactly five surfaces. No more, ever.

Earlier drafts variously claimed seven, nine and "the only thing permitted on top of a record window". Here is the settled list.

| # | Surface | What it is | Sits on |
|---|---|---|---|
| **S1** | **The box** | One white rectangle, 2px `--c-border-container`, on the `--c-canvas` field. Holds all list and detail content. | The page |
| **S2** | **The window** | A modal rectangle over a dimmed page. 2px `--c-crown`-coloured border, a 40px `--c-crown` title bar, `--shadow-window`. | Over S1 |
| **S3** | **The confirm** | A small modal for a yes/no decision only. Same construction as S2 but no tab strip and no scrolling body. | Over S1 or S2 |
| **S4** | **The panel** | A dropdown menu. White, 1px `--c-border-control`, **no shadow**, no radius. | Over anything |
| **S5** | **The workspace** | A full page with no box, for tasks that need the whole viewport: WhatsApp intake, the proposal builder, exchange and refund flows. Crown and page header remain. | The page |

**There is no read-only viewer surface, no help window surface, no settings surface and no toast.** Those are all S2 at a different size with different content. This collapse is the single most important resolution in this document, because it removes the entire class of "which window type is this" contradictions.

**S2 has three sizes and no others:**

| Size | Dimensions | Position | Used for |
|---|---|---|---|
| `large` | 1120 × 760 | x=160, y=70 | Record windows |
| `medium` | 820 × 620 | centred, y=90 | Document preview, message viewer, audit entry, help, the deadline explainer |
| `small` | 520 × auto (max 420 tall) | centred, y=200 | S3 confirms only |

**Stacking, settled.** Two things may open over an S2 `large`, and nothing else:

1. An **S3 confirm**.
2. An **S2 `medium` in read-only mode**, meaning a document preview, a message viewer, an audit entry, the help window or the deadline explainer. It carries no Save, so it cannot create a save-order problem. This is the Documents tab and History tab interaction on every record in the product, so it has to be legal.

An S2 `medium` that can save may **not** open over an S2 `large`. Nothing ever stacks three deep. If a flow appears to need three layers, it is a workspace (S5), not a stack.

---

## D2. The window (S2), settled

- Title bar 40px, `--c-crown` fill, title 15px/700 `--c-ink-invert`, 0.3px tracking, 16px inset. Right: an underlined 12px `--c-crown-ink` link `Open in full page` (large size only), then a 26×26 square `✕`, hover fill `--c-crown-border`.
- **Not draggable, not resizable, not minimisable, does not stack.** It appears in the same rectangle every time.
- Backdrop `rgba(28,31,27,0.42)`, **no blur**. The list stays legible around the edges, which is why this product needs no record pager.
- Tab strip 34px, `--c-band-header`, only on `large`. `medium` and `small` have no tab strip.
- **The 1120 × 760 figure is the OUTER footprint, including the 2px border.** The derived interior numbers, which several documents got wrong by 4px, are settled here and every file must match: body height at `large` is **630px** (760, minus 4px of top and bottom border, minus the 40px title bar, minus the 34px tab strip, minus the 52px footer). Body height at `medium` is **524px** (620, minus 4px border, minus 40px title bar, minus 52px footer). Section content width at `large` is **1076px** (1120, minus 4px border, minus 40px of body inset). Do not recompute these; use them.
- Body is the only scrolling region. 20px inset. Bordered sections 2px `--c-border-container`, 16px vertical gaps, each with a `--c-band-header` header strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`.
- **Footer 52px**, 1px `--c-border-item` top rule, `--c-surface` fill, 20px inset, buttons right-aligned in the order **`[Save]` secondary, then `[Save & Close]` primary**, 10px gap. Read-only `medium` windows have a footer with a single `[Close]` secondary button.
- Unsaved changes: closing with a dirty form raises an S3 confirm reading `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary.
- `Open in full page` routes to the same content rendered as S5, for printing and for two-monitor work. **The window tab strip does not appear on S5.** Sections stack down the page instead.

**Record window tab counts.** Six is not a cap. The cap is **eight**, tabs never scroll and never overflow. Requests have six, Clients have seven. Both are legal.

---

## D3. Confirmations, settled and exhaustive

Unnecessary confirmations train the reflex that defeats the necessary ones. So:

**Type-to-confirm** (the user types a specific word into a 30px input before the destructive button enables) applies to exactly **four** actions and no others:

1. Void a ticket
2. Issue a refund
3. Delete a client record that has bookings
4. Change a user's role

**Plain S3 confirm** (no typing) applies to:

- Release a hold
- Discard unsaved changes
- Cancel a request
- Delete a draft proposal
- Remove a traveller from a booking

**No confirmation at all** for everything else, including every save, every navigation, every filter change, and marking work complete.

The destructive button is a **secondary button with `--c-urgent` label text and a 1px `--c-urgent` border**. There is no filled red button anywhere in this product.

---

## D4. Focus, settled

`--focus-ring` (2px solid `--c-crown`) at `--focus-offset` (1px), on **every** interactive element: buttons, inputs, selects, checkboxes, radios, links, tabs, rows, menu items, the window close button. Never a glow, never a colour change, never a radius. This was the highest-priority open gap; it is now closed.

---

## D5. Form primitives, settled

| Thing | Value |
|---|---|
| Form field row height | 34px, or auto for a textarea |
| Rule between field rows | 1px `--c-border-field` |
| Label column | 180px, 13px/400 `--c-ink-2`, right-aligned, 12px gutter |
| Value column | fills remaining width |
| Required marker | the word `Required` at 11px/700 uppercase `--c-ink-3` after the label. **No asterisk.** |
| Validation error | 13px/400 `--c-urgent`, on its own line under the field, plus a 1px `--c-urgent` border on the control |
| Checkbox | 14×14, 1px `--c-border-control`, `--c-crown` fill with a white check when on |
| Radio | 14×14 **square** with a 6×6 `--c-crown` centre square when on. There are no circles in this product. |
| Textarea | same border as an input, min height 68px, resizable vertically only |
| Help text | 13px/400 `--c-ink-3` under the control |

**The "not provided yet" control.** Every field that a client is expected to supply carries a checkbox in its value column labelled `Client has not provided this yet`. Ticking it clears and disables the field, records the state, and satisfies the form. **Missing-information reports read this value; they never count blanks.** This is the mechanism that stops offshore staff typing a fake passport number under time pressure. It is not optional.

---

## D6. Empty, loading, error, denied

| State | Treatment |
|---|---|
| Empty | Inside the box, below the column headers. 160px tall, centred vertically, left-aligned at `--pad-box`. Line 1: 14px/400 `--c-ink`, states what is empty. Line 2: 13px/400 `--c-ink-2`, states the way out. No illustration, no icon, no button. |
| Loading | Up to 10 rows of 44px `--c-band-service` fill in place of data rows. No spinner, no skeleton shimmer, no progress bar. Past 10 seconds, a page-level message band appears reading `Still loading. The connection to Sabre may be slow.` |
| Error | A page-level message band directly under the page header: 38px, `--c-band-service` fill, 2px `--c-urgent` left border, 13px/400 `--c-ink`. Never a toast. |
| Not found | The box renders with one line: `That record does not exist, or it was deleted.` plus an underlined link back to the queue. |

**There is no permission-denied state.** The product has two roles and both can do everything operational. Supervisor review is after the fact, not a gate. Any spec describing a blocked action for a booking agent is a defect. The only exception is D3 item 4, changing a user's role, which is supervisor-only.

---

## D7. Numbers and tabular figures

`font-variant-numeric: tabular-nums` applies to **any right-aligned numeric column and any currency value**, which in practice means fares, fees, totals, balances, and pagination counts. Earlier drafts said "exactly two places". That was too tight and produced ragged money columns. **Left-aligned text, dates, times and deadline sentences remain proportional.** There is still no monospace font anywhere in the product.

---

## D8. Deadlines, the exact strings

There are exactly **four** deadline types and they are never abbreviated:

`Ticketing limit` · `Hold expires` · `Follow up` · `Check-in opens`

There is no fifth type. Any document naming `Airline limit`, `Issue by`, `TTL` or similar is a defect.

**The two-deadline display.** The cell shows **our derived action-by time** as the sentence. The supplier's stated number appears in the record window's Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer. **It does not appear in the grid cell.**

**Grammar.** Round down to whole units and pluralise: `3 hours left`, `1 hour left`, `48 minutes left`. Under one hour, use minutes. Under one minute, `less than a minute left`. Overdue: `expired 11:40 AM, 24 minutes ago`, and past 24 hours, `expired yesterday 11:40 AM` then `expired 28 July`.

**Sizes.** Calm 14px/400 `--c-ink`. Inside four hours 15px/700 `--c-urgent`. Overdue **15px/700** `--c-overdue`. The overdue state is the same size as urgent, not larger.

`Follow up` and `Check-in opens` never go red at any time, because they are not money.

---

## D9. Booking stages: seven, not eight

`Accepted` · `Payment pending` · `Paid` · `Ready to issue` · `Sent to ticketing` · `Ticket issued` · `Confirmation sent`

Any file saying "eight stages" is a defect. The client onboarding machine is a **separate** lifecycle belonging to the client record, with six states, and **one screen never shows two steppers**.

Stage carries no colour. `OVERDUE` replaces the stage word at 11px/700 uppercase `--c-overdue`, no tracking.

---

## D10. Settings and Admin

Admin is reached from `More ▾` in the crown. Its screens **reuse the queue tab band** as their section navigation, with the same 38px geometry and the same active treatment. This is not a new surface, and it is specifically not a left sidebar.

Admin has **eight sections and no more**. Every administrable thing in the product lives inside one of them. This mapping is exhaustive; nothing is left unhomed.

| Section | Contains |
|---|---|
| `Users & Roles` | User accounts, the two roles, preferred and secondary representative defaults, shared saved views |
| `Categories & Fees` | Client categories (standard, Belev Echad, Scheiman), effective-dated per-passenger booking fees, markup rules |
| `Message Templates` | Approved WhatsApp and email templates, decline reasons, onboarding checklist definitions |
| `Deadline Rules` | Anchor definitions, offsets, the response-time table per obligation type, the Israeli business calendar |
| `Escalation Ladders` | Named ladders, their rungs, and who each rung notifies. See below. |
| `Document Types` | Passport and visa document types, destination entry rules, required-document sets per destination |
| `Integrations` | Sabre accounts and PCCs, QuickBooks mapping, the WhatsApp channel, live integration status |
| `Audit & Security` | Audit log search, secret storage status, retention rules, access history |

**Escalation Ladders, specified.** A ladder is a named, ordered list of rungs attached to an obligation type. Each rung carries: an offset from the deadline (for example minus 24 hours), a condition that must still be true for it to fire (for example "the client has not confirmed"), the template it uses, and **who it notifies**. Escalation changes **who gets told, never how loud**. The default check-in ladder has four rungs at minus 24 hours to the owner, minus 12 hours to the owner, minus 6 hours to the secondary representative, and minus 1 hour to the supervisor. A rung fires only if its condition is still true at the moment it comes due, never as an unconditional timed send, which is what makes a ladder self-correct when a client confirms through a route the system did not observe. Editing a ladder is effective-dated exactly like a fee.

**Effective-dated values** (booking fees especially) render as a table with columns `Effective from`, `Effective to`, `Value`, `Set by`, `Recorded on`. The currently applying row is marked by the word `Current` in 11px/700 uppercase `--c-good` in a leading 80px column. Future rows show `Scheduled`. Past rows show nothing. Editing never overwrites a row; it closes the current row and opens a new one.

`Recorded on` is a real column, not decoration. "We were told on 30 July that the fee changed effective 1 June" is a normal week here, and it decides whether you chase the client or absorb the difference.

---

## D11. Chrome offsets are not fixed y-coordinates

The crown is 84px and the page header is 64px. The queue tab band is 38px **when present**. Reports, Admin and S5 workspaces have no queue band, and everything below simply moves up 38px. Build the chrome as a flex column, never as absolute offsets.

**The 38px band, precisely.** Reports and S5 workspaces have no band at all, and everything below them moves up 38px. **Admin is different: it carries no band of queues, but it does carry the same 38px band component as its section navigation** (see D10), so Admin's chrome height is unchanged and its page header sits at the same offset as Requests. Any file saying "Reports, Admin and S5 workspaces have no queue band" is a defect, and the phrase must be corrected to "Reports and S5 workspaces".

**Minimum viewport is 1300px** (160 + 1120 + 20 gutter). Below that the page scrolls horizontally. Earlier drafts said 1180px, which is arithmetically impossible with a 1120px window at x=160. Desktop only, no mobile build in scope.

---

## D12. Queue tabs cap at seven

Seven queue tabs maximum per object, so they never overflow, never scroll and never collapse. An object needing more than seven piles has too many piles; move the surplus into the View dropdown, which is what it is for.

---

## D13. Column widths for the reference grid

`04` designates the Requests queue list as the reference implementation. Build it exactly:

| Column | Width | Alignment |
|---|---|---|
| Request # | 88px | left, underlined link |
| Client | 150px | left, 600 weight |
| Trip | 190px | left |
| Stage | 130px | left |
| Waiting on | fills | left |
| Fare | 100px | right, tabular |
| Deadline | 340px | right |
| Agent | 74px | right |

The Deadline column is 340px because the longest urgent sentence, `Ticketing limit — today 3:20 PM, 3 hours left` at 15px/700, must fit on ONE line inside a 44px row. The sentence is the design. Do not shrink this column to fit another column in, and never let the deadline wrap.

---

## D14. Component library and dependencies

`shadcn/ui` **is permitted** and is the recommended base, because its components are copied into the repository as source you own rather than imported from a package. It must be restyled to the tokens at install time, before forty screens exist.

**Forbidden as dependencies:** Material UI, Ant Design, Chakra, Bootstrap, PrimeReact, or any library whose components arrive as opaque imports. Earlier drafts contradicted each other on this; this is the resolution.

---

## D15. Canonical file names and folder structure

The package files are named exactly: `00-DECISIONS.md`, `01-CONSULATE-DESIGN-SYSTEM.md`, `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md`, `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md`, `07-BUILD-STANDARDS.md`. Any cross-reference to `02-COMPONENTS.md`, `03-SURFACES.md` or similar is a defect.

**Where `06` goes in the repository.** Rename it to **`CLAUDE-SPECIFIC.md`** and place it in the repository root. Do **not** name it `CLAUDE.md`. This project follows a house convention: every repository carries a general `CLAUDE.md` that applies across all projects and points at a per-project `CLAUDE-SPECIFIC.md`. The general `CLAUDE.md` is supplied separately by Joe. `06` is the project half of that pair, and overwriting the general file would destroy rules that apply to every other project.

```
src/
  app/            routes and pages, one folder per screen in 04
  components/
    shell/        crown, queue band, page header
    surfaces/     box, window, confirm, panel, workspace
    data/         column header, group header, row, cells, pagination
    controls/     button, input, select, checkbox, radio, textarea, view picker
    form/         field row, label, validation, "not provided yet"
    feedback/     empty, loading, message band
  lib/
    forms/        React Hook Form + Zod helpers, project-owned wrappers
    table/        the TanStack Table wrapper, never called directly from a screen
    datetime/     the Luxon wrapper. Luxon types never leave this folder.
  server/
    deadlines/    anchor resolution, the two-deadline split, all date arithmetic
    calendar/     the Israeli business calendar
    documents/    passport versioning and validity evaluation
    fees/         category and effective-date resolution
  styles/
    tokens.css    the single source of truth
```

**No date arithmetic in the browser.** Anything under `server/` owns it. This is the code an AI assistant writes confidently and wrongly, so it is server-side, wrapped, and tested first.

---

## D16. Print

`03-WINDOW-TYPES.md` owns the print specification and is authoritative for it. In summary: the crown, queue band, page header buttons, pagination and the View controls are removed. A print header replaces the crown carrying the agency name, the screen title, the active view and the timestamp. The box loses its border and prints as plain ruled rows. Group headers repeat on page break. Any screen can be printed and put in a folder, which is a requirement, not a nicety.

---

## D17. Things every file must stop saying

These appeared across the drafts and are all wrong:

- "the only shadowed thing on screen" applied to anything other than S2 and S3
- `--c-ink-heading-on-band` (the token is `--c-ink-on-band`)
- "eight stages"
- "exactly two places" for tabular figures
- "minimum viewport 1180px"
- a fifth deadline label
- a permission-denied state for booking agents
- a user menu on the crown (`M. Roth` is a label; `Sign Out` is already a utility link)
- a sortable or resizable column header (sorting is the Sort select in the control strip)
- circular anything

---

## D18. Open items register

These are **not defects**. They are decisions the client still owes the developer, and every `NOT YET SPECIFIED` flag in the package points here.

**How to use this register.** If you are building something and hit one of these, do not invent an answer. Raise it with Joe, get a decision, write the decision into this file with its D18 number, and then build. When a design pass is needed, use `05-CLAUDE-DESIGN-BRIEF.md` and paste the returned spec block into the design system.

**The three that block the most work,** if you only get time to resolve a few: item 17 (the page-header icon glyph set, which appears on every screen), item 30 (the canonical pricing group list, which blocks four screens and all of Admin), and item 31 (which instant triggers overdue, which changes the meaning of the most important counter in the product).

**Control states and appearance**
1. Disabled appearance of **any** control — fill, border and ink. Blocks the send-to-issue gate's primary button, the type-to-confirm destructive button, disabled menu items and disabled fields. *(`02` §4.2/§4.3/§4.4/§4.5, `03` §6.5, `04` §11, `05` §10)*
2. Hover and pressed states for the primary, secondary and destructive buttons; hover for the Go button, the utility links, the queue tabs and the pagination page boxes.
3. Read-only text-input treatment (appears in every record window).
4. Selected-row treatment — the row context menu depends on it.
5. Scrollbar treatment inside the record window body.
6. Checkbox indeterminate mark (only reachable if a parent/child pattern appears).
7. Input font size: 13px control text or 14px body. Decide once for the product.

**Geometry not yet drawn**
8. Panel widths: `More`, row context menu, button dropdown, View picker (see I5).
9. Panel row cap before a panel becomes the wrong surface.
10. Initials-square dimension and fill (must not reuse the 26×26 crest).
11. Column widths for every grid other than the Requests reference grid, including the effective-dated fee table beyond D10's 80px status column, the three timeline shapes, the attachment row and every report.
12. Checklist row height when a computed answer wraps to a second line.
13. Crown row 1 internal gaps, and the vertical hairline's height inside the 44px row.
14. The two-column split ratio and horizontal gap between two bordered sections on an S5 (RQ-11 WhatsApp intake).
15. Print margins for US Letter and A4.

**Glyphs and artwork**
16. The crest tile artwork (26×26 white shape on `--c-gold`) — appears on every screen.
17. The page-header icon tile glyph set, one per object tab plus Reports and Admin — mandatory on every screen, so it blocks all of `04`.
18. The select indicator glyph and the button-dropdown caret glyph, to be settled together, plus whether the caret segment is welded to its button.
19. The colour of the `|` separator between `Edit` and `Create New View` (`--c-crown-rule` is scoped to the crown).
20. A token name for the backdrop literal `rgba(28,31,27,0.42)`.

**Copy, strings and formats**
21. The four literal type-to-confirm strings. Do not assume `VOID`, `REFUND`, `DELETE`.
22. The item-count string format in the section header strip, including whether an empty grid prints one at all. Both `0 items` and `12 items` were withdrawn.
23. Currency format: transacted vs base currency, symbol vs code and on which side, decimal places, thousands separator, mixed-currency totals in reports.
24. Zone display in the grid deadline cell — the deadline's own zone named, or the desk's zone.
25. The deadline sentence form for a deadline more than a week out, beyond a weekday name.
26. Assembled string grammar and placement for partial completion (`3/5`).
27. The `Waiting on` column's value vocabulary on the reference grid.
28. The duplicate-detection confidence format (word or number) and its vocabulary.
29. The support-case severity vocabulary.
30. The canonical pricing group list — `Belev Echad`, `Scheiman`, `Community All`, `Standard`; nobody can tell whether `Standard` and `Community All` are one group or two. Blocks RQ-02, CL-02, CL-12 and Admin.

**Behaviour still undecided**
31. Which instant triggers overdue — the supplier's stated time or our derived action-by time. The two differ by hours on every held PNR.
32. ~~Whether an S2 `medium` may open over an S2 `large`.~~ **CLOSED, see D1.** A read-only `medium` may; a `medium` that can save may not.
33. Whether the Request Details tab carries `CLIENT`, `INTAKE` or both, and the final section order.
34. Whether pagination renders under an empty state, and the single-page-of-results case.
35. Whether a count of zero prints in the View picker (the rule is stated for queue tabs only).
36. Group-header collapse behaviour (currently outside the design language).
37. Whether cancelling a booking confirms (see I11).
38. How the role field in Admin `Users & Roles` presents to a booking agent, given no permission-denied state exists.
39. The saved-indicator form after `Save` (no toast, no dialog, no animation; `--c-good` as text is available).
40. Left-border treatment for success and information message bands, and the maximum stacked bands before collapse.
41. The accessible grid structure — real `<table>` vs `role="grid"` — and the key that activates a focused row. Settle once in the table wrapper.

**Product scope still undecided**
42. The fare freshness window in hours, and where the verified-at stamp sits in the row. RQ-22 tests against it, so a guess becomes a false gate.
43. The masked form of secret-storage fields and the appearance of the reveal control.
44. Whether a graphical seat map exists at BK-12, and its interaction model given no drag and drop.
45. Whether RP-09 Deadline Risk may print the supplier's stated time as a report column.
46. Whether any chart exists anywhere in Reports, and its design if so.
47. The crown search panel: width, grouping by object, row anatomy, no-match state, and whether a results page exists at all. `02` §1.4 asserts a results page; `04` §16 says none exists.
48. The help topic list, its content owners, and search inside help.
49. How many sessions first-run guidance persists for.
50. The deep-link target for a single rule inside Admin `Deadline Rules`.
51. The client-facing proposal document's visual design (not governed by `01`).
52. PDF export beyond browser print-to-PDF.
53. Whether the destination rule model carries an issuing-country dimension — a dual-national household cannot be evaluated until it does.
54. Minimum browser versions, and whether Safari on macOS is in scope.
55. ~~How the Admin areas map into D10's eight sections, and what `Escalation Ladders` contains.~~ **CLOSED, see D10**, which now carries the exhaustive mapping table and the ladder specification.

---
