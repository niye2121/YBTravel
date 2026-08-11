# CLAUDE-SPECIFIC.md — YB Travel operations platform

> **Where this file goes.** Rename this file to **`CLAUDE-SPECIFIC.md`** and place it in the repository root. Do **not** name it `CLAUDE.md`.
>
> This project follows a house convention: every repository carries a general `CLAUDE.md` covering rules that apply across all projects, and that file points at a per-project `CLAUDE-SPECIFIC.md`. The general `CLAUDE.md` is supplied separately by Joe. This document is the project half of that pair. Naming it `CLAUDE.md` would overwrite the general file and destroy rules that apply to every other project.
>
> If the general `CLAUDE.md` and this file ever disagree on something specific to YB Travel, **this file wins**, because it is the more specific of the two.

**This file is read automatically at the start of every session. It is binding.**

Everything below is a constraint on what you are allowed to write, not advice about what is nice to write. Where a rule says "do not", read it as "code that does this will be rejected". Where a rule says "stop and ask", read it as "produce no code for that surface until a human answers".

---

## 1. WHAT THIS PROJECT IS

YB Travel is an internal operations platform for one travel agency of roughly 5 to 30 staff, handling US and Israel travel with heavy EL AL volume and community pricing groups that carry their own per-passenger booking fees. The organising object is the TRAVEL REQUEST and its lifecycle, and action items, deadlines, quotes, bookings and tickets all hang off requests. It replaces Yaalago, integrates with WhatsApp, Sabre and QuickBooks Online, and it will never be sold to anyone else, so there is no generic case to design for.

The design language is called CONSULATE. It was chosen by the client on 3 August 2026 from six competing concepts and it is LOCKED. It is enterprise software that a 55-year-old office manager already knows how to drive, descended from Microsoft Dynamics CRM, Salesforce Classic and the travel back-office systems agents already use. It is deliberately not modern. It does not float, it does not animate, and it has no rounded corners anywhere.

The stack is React and TypeScript, Tailwind themed from the token file, shadcn/ui on Radix primitives as the component base, React Hook Form with Zod, TanStack Table v8 behind a project wrapper, and Luxon behind a project wrapper. `07-BUILD-STANDARDS.md` owns the stack and this file must never contradict it.

### AUTHORITY ORDER

When two sources disagree, the higher one wins. Never resolve a conflict by choosing what looks better, what is more common, or what you saw last.

| Rank | Source | What it is authoritative for |
|------|--------|------------------------------|
| 1 | `assets/tokens.css` (in the repository, `src/styles/tokens.css`) | Every colour, type size, spacing, radius, shadow and fixed height. The literal truth. |
| 2 | `01-CONSULATE-DESIGN-SYSTEM.md` | The locked design language: silhouette, the five defining rules, prohibitions, how urgency works. |
| 3 | `00-DECISIONS.md` | The arbiter. Resolves everything 01 left open. If anything below contradicts it, that thing is a defect. |
| 4 | `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md` | Component anatomy, surface behaviour and print, and the screen inventory. |
| 5 | `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md` (this file), `07-BUILD-STANDARDS.md` | The design-pass brief, this rulebook, and the technical build standards. |
| 6 | `assets/consulate-reference.html` | How the main work screen actually renders. Lowest authority. If it contradicts 01, 01 wins and the HTML is a bug to report. |

**Canonical file names.** The package is exactly these eight files and cross-references use these names and no others, per D15:

`00-DECISIONS.md` · `01-CONSULATE-DESIGN-SYSTEM.md` · `02-COMPONENT-LIBRARY.md` · `03-WINDOW-TYPES.md` · `04-SCREEN-INVENTORY.md` · `05-CLAUDE-DESIGN-BRIEF.md` · `06-CLAUDE-SPECIFIC.md` · `07-BUILD-STANDARDS.md`

A reference to `02-COMPONENTS.md`, `03-SURFACES.md`, `04-SCREENS.md` or any similar variant is a defect. If you read one in any document, report it rather than following it, because the file it names does not exist and you will not be able to complete the pre-flight in section 3.

Nothing outside that table is authoritative. Not your training data. Not a screenshot. Not a similar product. Not a framework default. Not a component library's opinion. Not what the user said in passing three messages ago about a different screen.

---

## 2. THE HARD RULES

These are constraints, not preferences. Each one carries its reason so you can recognise when you are near it.

1. **Zero corner radius, everywhere, forever.** No `border-radius` value other than `var(--radius)`, which is `0`. No circles, no pills, no capsules, no rounded avatars, no rounded chips. Initials sit in squares. Reason: sharp corners are the loudest single signal that this is a records system and not a consumer app, and one rounded element makes the whole screen read as a different product.

2. **Exactly two border weights, and the difference between them is the grammar.** `2px var(--c-border-container)` means "this is a container, something is enclosed". `1px var(--c-border-item)` means "these are items in a list". There is no third weight. `--c-border-field` is the rule between form field rows and `--c-border-control` is the edge of an interactive control, and neither is a substitute for the other or a licence to invent a weight. Reason: the user learns the enclosure structure from weight alone, and a 3px or 0.5px border destroys the only structural signal on the screen.

3. **A heading is a FILLED BAND, never bold text floating in whitespace.** Section header strips use `--c-band-header`. Column headers, group headers, pagination and row hover use `--c-band-service`. Reason: bands are how a scanned or printed page keeps its structure, and bold text in whitespace disappears at arm's length across a desk.

4. **There is exactly ONE shadow in the entire product,** `--shadow-window`, on the record window and on the confirm, which is the same construction. Dropdowns, menus, popovers, tooltips and selects sit on solid `--c-surface` with a `1px var(--c-border-control)` border and are simply on top. Reason: elevation is a claim about importance, and only one thing in this product is elevated.

5. **Urgency is a SENTENCE, not a colour block.** Nothing is pinned, duplicated, lifted out of sort order, flashed, filled, tinted or ticked down. The row does not move and does not change shape. It changes what it SAYS. Reason: staff learn to ignore colour. They cannot ignore a clause that reads "3 hours left".

6. **Nothing on the left edge, ever.** No left sidebar, no icon rail, no drawer, no hamburger, no collapsed nav, no floating action button. All navigation is horizontal in the top 186px, which is the 84px crown plus the 38px queue band plus the 64px page header. Reason: the silhouette IS the product identity, and a left rail turns it into every other SaaS app.

7. **Navigation is three levels and no more.** L1 object tabs in the crown, L2 queue tabs in the white band, L3 the View dropdown in the box's control strip. Window tabs exist ONLY inside the record window and are tabs on a dialog, not places in the app. Reason: a fourth level means staff get lost and start using search as navigation.

8. **All queues are visible at rest with live counts, always.** Never hide a queue behind a control, an overflow menu or a "more" affordance. Maximum seven queue tabs per object, per D12, so they never overflow, never scroll and never collapse. An object needing more piles has too many piles, and the surplus moves into the View dropdown, which is what it is for. A count of zero prints as NOTHING AT ALL, not "0", not "(0)". Reason: the queue band is the shift's workload at a glance, and a hidden queue is an unworked queue.

9. **The whole product is ONE white rectangle on a grey-green field.** One box per screen, not three. Never place content directly on `--c-canvas`. The exception is the S5 workspace, which has no box at all, and the full-page rendering of a record, where bordered sections sit directly on the canvas per 04. Reason: cards fragment the page and reintroduce elevation.

10. **There are exactly FIVE surfaces, per D1, and no more, ever.** S1 the box, S2 the window, S3 the confirm, S4 the dropdown panel, S5 the workspace. There is no read-only viewer surface, no help window surface, no settings surface and no toast. Those are all S2 at a different size with different content. A new file in `src/components/surfaces/` is a design change, not a build decision. Reason: every "which window type is this" argument in the package was collapsed by this resolution and reopening it reopens all of them.

11. **NO COLOUR-CODING OF BOOKING STAGE.** Stage is a word in a column in ordinary `--c-ink`. **Seven stages, zero colours**, per D9. Reason: this is the single most common thing a designer or a model will try to improve. Do not. It is the first thing that will be rejected in review.

12. **Links are ALWAYS underlined,** at rest, not on hover, in `--c-link`. Reason: 55-year-old office manager, printed pages, arm's length, and the underline is the only link affordance that survives a monochrome printout.

13. **`--c-good` is TEXT ONLY, and only for terminal states and connection state.** Paid, Ticketed, connected. It never means "success" on a button and it is never a fill. Reason: a green fill is a status chip, and there are no chips.

14. **`--c-crown-rule` is used INSIDE THE CROWN ONLY.** It is the hairline between the wordmark and the desk name and the `|` separators between the utility links. Reason: it is a crown-internal divider, not a general border, and it appears nowhere else in the product.

15. **Type is `Tahoma, Verdana, Geneva, sans-serif`, from `--font`. Weights 400, 600 and 700 only.** No second family. NO MONOSPACE ANYWHERE, including on code-like values such as PNR locators, ticket numbers and confirmation codes. `font-variant-numeric: tabular-nums` applies to **any right-aligned numeric column and any currency value**, per D7, which in practice means fares, fees, totals, balances and pagination counts. Left-aligned text, dates, times and deadline sentences stay proportional. Reason: monospace says "developer tool", and this is an office tool.

16. **Deadlines are WORDS in the same face.** No ticker font, no letterspaced numeric readout, no countdown widget, no progress ring, no clock icon. Reason: see rule 5.

17. **The record window does not move, resize or minimise, and two record windows never coexist.** The title bar is NOT draggable. It appears in the same rectangle every time, at the three sizes of D1 and no others. **Stacking is settled in D1: exactly two things may open over an S2 `large`, an S3 confirm and an S2 `medium` in READ-ONLY mode**, meaning a document preview, a message viewer, an audit entry, the help window or the deadline explainer, which carry no Save and so cannot create a save-order problem. That is the Documents tab and History tab interaction on every record in the product, so it is legal. **An S2 `medium` that can save may not open over an S2 `large`, and nothing ever stacks three deep.** If a flow appears to need three layers it is an S5 workspace, not a stack. The list behind it is never destroyed. Reason: the visible list around the edges is why this concept needs no record pager. Destroy the list and the whole navigation model collapses.

18. **The record window body is the ONLY scrolling region inside the window.** Reason: nested scroll areas lose people.

19. **The backdrop is `rgba(28,31,27,0.42)` with NO blur,** per D2. Reason: the list, queue tabs and crown must stay legible around the edges, which is what makes the pager unnecessary.

20. **Row height is 44px and body type is 14px, giving about 14 rows on a 900px viewport. This is deliberate.** Do NOT fix density by shrinking rows, reducing type, virtualising the list or adding a density toggle. If a user needs more rows, the answer is a better filter or a saved view. Reason: staff range widely in age and confidence, the screen must be readable across a desk, and any screen can be printed and put in a folder.

21. **Minimum viewport is 1300px, per D11, and the product is desktop only.** The arithmetic is `160 + 1120 + 20`: the large record window is 1120px wide with its left edge at x=160, and a 20px gutter keeps it off the viewport edge. Below 1300px the page scrolls horizontally. Do not add responsive breakpoints to make the grid fit a narrower screen. Any file saying 1180px is a defect, per D17. Reason: 1180px clips the window and puts the ✕ button and the `Open in full page` link off-screen.

22. **Build the chrome as a flex column, never as absolute y-offsets,** per D11. The crown is 84px, the page header is 64px, and the queue tab band is 38px **when present**. **Reports and S5 workspaces have no band**, and everything below them simply moves up 38px. **Admin is different: it carries no band of queues, but it does carry the same 38px band component as its section navigation**, per D10, so Admin's chrome height is unchanged and its page header sits at the same offset as Requests. Reason: a component that positions itself from a hard-coded y-coordinate breaks on every screen without a band, and a component that assumes Admin is one of those screens breaks Admin.

23. **There is no permission-denied state,** per D6. Two roles, booking agent and supervising agent, and both can do everything operational. Supervisor review is after the fact, not a gate. The only exception is changing a user's role. Reason: safety in this product comes from workflow gates, not from permissions, and any spec describing a blocked action for a booking agent is a defect.

24. **There is no filled red button anywhere in this product,** per D3. A destructive button is a secondary button with `--c-urgent` label text and a 1px `--c-urgent` border. Reason: red is a sentence here, not a fill, and a filled red button reintroduces exactly the colour-block grammar rule 5 removes.

25. **Confirmations are exhaustive and closed,** per D3. Type-to-confirm applies to exactly four actions: void a ticket, issue a refund, delete a client record that has bookings, change a user's role. A plain S3 confirm applies to exactly five: release a hold, discard unsaved changes, cancel a request, delete a draft proposal, remove a traveller from a booking. Everything else, including every save, every navigation, every filter change and marking work complete, gets no confirmation at all. Reason: unnecessary confirmations train the reflex that defeats the necessary ones.

### THE FULL "DOES NOT HAVE" LIST

Absence here is a design decision, taken deliberately, and an agent fills absences with defaults. Do not fill these with a framework default, a library component, or a habit.

```
No left sidebar.                    No icons in navigation.
No rounded corners.                 No shadows except the record window
No gradients.                         (and the confirm, same construction).
No chips, pills, badges or tags.    No coloured status fills.
No circular avatars and no          No zebra striping.
  photographs (initials in          No vertical column rules.
  squares only).                    No command palette.
No keyboard-first navigation model. No dark mode.
No density toggle.                  No drag and drop.
No kanban board.                    No animation beyond an instant
No auto-dismissing toasts carrying    state change.
  information the user needs.       No infinite scroll (numbered
No monospace.                         explicit pagination).
No emoji.                           No colour-coding of booking stage.
```

Zebra striping and vertical column rules were considered and removed on purpose. At 44px rows with 14px type the eye does not need them, and both add visual noise that competes with the urgency sentence. Do not reintroduce them as an accessibility improvement, a readability improvement, or a "just for wide tables" exception.

Also delete on sight, wherever they appear: sortable or resizable column headers, a fifth deadline label, a user menu on the crown (`M. Roth` is a label and `Sign Out` is already a utility link), a permission-denied state for a booking agent, and a record pager on the window.

### IF A TASK SEEMS TO REQUIRE BREAKING ONE OF THESE

**STOP and ask. Do not proceed.**

Do not implement a temporary version. Do not implement it behind a feature flag. Do not implement it and add a TODO. Do not implement it in a branch "to show what it would look like".

Say which numbered rule the task collides with, quote the rule, describe the smallest change to the task that would avoid the collision, and ask. Then wait. Waiting is cheap. A merged violation is expensive, because it becomes the precedent the next agent copies, and by the time anyone notices there are forty screens carrying it.

---

## 3. BEFORE YOU WRITE ANY UI CODE

This pre-flight is mandatory. Run it every session, not once per project. You do not have reliable memory of it between sessions and you must not work from a remembered version of any of these files.

1. **Read `assets/tokens.css` in full.** Every colour, size, spacing value and fixed height is there. Do not work from a remembered token list, and do not assume a token exists because its name sounds plausible.
2. **Find the component in `02-COMPONENT-LIBRARY.md`.** If the thing you are about to build has an entry, build that entry exactly, including its geometry, its type sizes and its stated states. Do not improve it. Do not add a prop it does not have.
3. **Find the surface in `03-WINDOW-TYPES.md`.** Every piece of UI belongs to one of the five surfaces of D1. Its behaviour, its scroll region, its footer and its print treatment come from the surface, not from you.
4. **Find the screen in `04-SCREEN-INVENTORY.md`.** If the screen you have been asked to build is not in `04-SCREEN-INVENTORY.md`, **IT DOES NOT EXIST YET.** Do not design it. Go to section 8 of this file and follow that procedure exactly.
5. **Check `assets/consulate-reference.html`** for how the nearest existing thing actually renders, remembering it is the lowest authority in the table and that where it disagrees with 01 it is the file that is wrong.

If any of steps 1 to 4 cannot be completed, stop and say which one failed and why. "I could not find the Payments tab body in `04-SCREEN-INVENTORY.md`" is a correct and useful response and it is the response the client is paying for. Inventing the Payments tab body is not.

---

## 4. TOKEN DISCIPLINE

**Never write a raw hex value in a component, a page, a stylesheet, a Tailwind arbitrary value or an inline style.** Reference the token name.

**Never write a raw pixel value for anything that has a token or a fixed height in the design system.** The fixed heights are structural. Changing one changes the silhouette of the product, and they are not yours to adjust.

**Never invent a token.** If you genuinely need a value that does not exist, do not add it to a component, do not approximate with the nearest existing token, and do not derive it. Add it to `tokens.css` FIRST, in the same commit, with a one-line comment saying what it is for, and flag it in your response so a human sees it. If you are not confident it should exist, write the exact string from section 8 and stop.

| Wrong | Right |
|-------|-------|
| `background: #0E4634;` | `background: var(--c-crown);` |
| `color: #14604A;` | `color: var(--c-link);` |
| `border: 2px solid #BFC4BC;` | `border: 2px solid var(--c-border-container);` |
| `border: 1px solid #ddd;` | `border: 1px solid var(--c-border-item);` |
| `border: 1px solid var(--c-border-field);` on an input | `border: 1px solid var(--c-border-control);` |
| `border-radius: 2px;` | `border-radius: var(--radius);` |
| `border-radius: 4px` "for the button only" | `border-radius: var(--radius);` |
| `rounded-md` from Tailwind's default scale | delete the scale so the class resolves to nothing |
| `box-shadow: 0 1px 3px rgba(0,0,0,0.1);` on a dropdown | no shadow, `1px solid var(--c-border-control)` |
| `box-shadow: 0 6px 24px rgba(0,0,0,0.35);` | `box-shadow: var(--shadow-window);` |
| `box-shadow: 0 0 0 3px …` as a focus ring | `outline: var(--focus-ring); outline-offset: var(--focus-offset);` |
| `height: 42px;` on a data row | `height: var(--h-row);` which is 44px and fixed by the system |
| `color: rgba(28,31,27,0.6);` | `color: var(--c-ink-2);` |
| `background: #A32116;` on an urgent row | no fill at all; the deadline cell text becomes `var(--c-urgent)` |
| `color: var(--c-ink-heading-on-band);` | `color: var(--c-ink-on-band);` which is the real token and already exists |
| `font-family: 'Segoe UI', sans-serif;` | `font-family: var(--font);` |
| `font-family: monospace;` on a PNR | the same face as everything else |
| `font-weight: 500;` | `400`, `600` or `700` only |
| `font-size: 12.5px` | a size from the type scale in `tokens.css` |
| a new `--c-warning` invented in a component | add it to `tokens.css` first, or stop and ask |

**Do not derive a shade.** No `lighten()`, no `darken()`, no `color-mix()`, no opacity applied to a token, no Tailwind opacity modifier on a token colour. A derived shade is an invented token wearing a disguise, and it will not match the next place someone derives it.

**On raw colour literals.** `tokens.css` is the only file in the repository allowed to contain a colour literal. The package currently states exactly one colour outside it: the window backdrop `rgba(28,31,27,0.42)`, quoted from D2, which has no token. A token name for the backdrop is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not invent one, do not spread the literal to a second place, and do not treat it as permission for other literals. Get the token named and added to `tokens.css`, then use it.

**On the `--c-ink-on-band` token specifically.** The token is `--c-ink-on-band` and it already exists in `tokens.css` at `#23392F`. There is no `--c-ink-heading-on-band` and there never was. D17 names that string among the things every file must stop saying. Do not add it, do not alias it, and if you read it in any document, report that document as a defect.

---

## 5. FILE AND FOLDER STRUCTURE

This tree is D15 and it is what `07-BUILD-STANDARDS.md` builds to. Do not invent a different one, and do not relocate a wrapper folder because a file grew.

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

The eight package documents live at the repository root alongside this file. This file is `06-CLAUDE-SPECIFIC.md` renamed to `CLAUDE-SPECIFIC.md`, and the two are the same document.

**Rules about where things live.**

- `src/styles/tokens.css` is the only file in the repository allowed to contain a colour literal. Enforce it with a lint rule and treat a violation as a build failure, not a warning.
- `src/components/surfaces/` holds exactly the five surfaces of D1 and no others. A sixth file there is a design change and needs a decision, not a commit.
- `src/lib/table/DataGrid.tsx` is the only file that imports `@tanstack/react-table`. No screen calls TanStack directly.
- `src/lib/datetime/index.ts` is the only file that imports Luxon, and Luxon types never leave that folder. `DateTime` must never appear in a component prop, a React state type, an API payload type or a Zod schema.
- `src/lib/forms/` owns the wrappers for `useFieldArray` and `watch`. A direct import of either outside that folder is a review rejection, per `07-BUILD-STANDARDS.md` section 8.
- `src/lib/datetime/` formats and carries values. It does not decide them. **All date arithmetic lives under `src/server/`.**

**What must NEVER appear in a component file.** A component file contains layout and presentation only. It must never contain:

- a colour literal of any kind
- **any date arithmetic at all**: no adding or subtracting hours, days or business days, no comparison of one instant to another to decide a state, no timezone conversion, no `new Date()` used for anything other than rendering a string the server already composed, no `Date.now()`, no duration formatting, no "is this within four hours" check
- a holiday check or a weekend check
- a business rule of any kind
- a hardcoded queue name, stage name, deadline type, pricing group or client name
- an `if (client === 'BelevEchad')` special case
- an API URL
- a copy string that encodes a policy rather than a label

A component never decides whether something is overdue. It receives `isOverdue` and the composed sentence, and it prints them. If you find yourself importing a date library into a component, you have already made the mistake this rule exists to prevent, and it is the mistake this codebase is most likely to ship because it is the code an AI assistant writes confidently and wrongly.

`src/app/` files compose components and fetch data. They contain no styling beyond layout composition and no domain logic.

---

## 6. COMPONENT CONTRACTS

Props listed are the contract. **Adding a prop that lets a caller break an invariant is itself a violation**, for example a `variant="rounded"`, a `color` override, a `dense` prop, an `elevated` prop, a `sortable` prop or an `imageUrl` prop. If a screen seems to need one, the screen is wrong or the design does not exist yet.

### Button
```
props: label, onClick, kind: "primary" | "secondary" | "destructive", disabled
```
Invariants: height 34px, 16px horizontal padding, `var(--radius)`, 10px gap between adjacent buttons supplied by the container rather than a margin on the button. Primary is `--c-crown` fill with an `--c-ink-invert` label at 14px/600. Secondary is `--c-surface` fill, `1px var(--c-border-control)`, `--c-ink` label at 14px/400. Destructive is a secondary button with an `--c-urgent` label and a `1px var(--c-urgent)` border, per D3. **There is no filled red button.** There is no fourth kind, no icon slot, and no loading spinner, because there is no animation.

### Link
```
props: label, href | onClick
```
Invariants: `--c-link`, underlined at rest and always. No hover-only underline. No icon. No external-link glyph. Focus is `--focus-ring` at `--focus-offset` like everything else.

### Box
```
props: sectionTitle, viewName?, itemCount, children
```
Invariants: `--c-surface` fill, `2px var(--c-border-container)`, `var(--radius)`, NO shadow. There is one Box per screen, not three, and never content directly on `--c-canvas`. The section header strip is `--h-section-strip` (32px), `--c-band-header`, label 12px/700 uppercase 0.7px tracking in **`--c-ink-on-band`**. When `viewName` is set, the strip APPENDS it: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`. Item count prints right.

### ControlStrip
```
props: viewValue, onViewChange, sortValue, onSortChange, actions
```
Invariants: `--h-control-strip` (44px). Holds the View select at 260x30 and the **Sort select**. Sorting lives here and nowhere else. The `|` separator colour between "Edit" and "Create New View" is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and `--c-crown-rule` is not available for it because that token is scoped to the crown.

### ColumnHeaderRow
```
props: columns: { key, label, align? }[]
```
Invariants: `--h-column-header` (30px), `--c-band-service` fill, labels 12px/700 **sentence case, no uppercase, no letterspacing**, `--c-ink-2`. This is the one 12px/700 element that is not uppercase, and getting it wrong is the most common typographic error in this system.

**The column header is NOT interactive.** No hover, no focus, no click, no sort arrow, no sort indicator of any kind, no sortable behaviour, no resize handle, no drag to reorder, no select-all control. `cursor: default`. **Sorting is the Sort select in the control strip**, per D17 and `02-COMPONENT-LIBRARY.md` section 3.1. A sortable or resizable column header is named as a defect by the arbiter. No vertical rules between columns, ever.

Column widths for the reference grid are fixed by D13 and are not yours to adjust: Request # 88px left underlined link, Client 150px left 600 weight, Trip 190px left, Stage 130px left, Waiting on fills, Fare 100px right tabular, **Deadline 340px** right, Agent 74px right. The Deadline column is 340px because the longest urgent sentence, `Ticketing limit — today 3:20 PM, 3 hours left` at 15px/700, must fit on ONE line inside a 44px row. The sentence is the design. Never let the deadline wrap.

### GroupHeader
```
props: label, summarySentence, containsUrgent: boolean
```
Invariants: `--h-group-header` (26px), fill stays `--c-band-service` in **all** states. 12px/700 uppercase 0.6px, `--c-ink-2` normally. When `containsUrgent` is true the LABEL colour becomes `--c-urgent` and the sentence reads in full, for example `DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS`. The fill never changes. There is no count badge, because there are no badges.

### DataRow
```
props: cells, onDoubleClick, isUrgent (display only), isOverdue (display only)
```
Invariants: height `--h-row` (44px) in every state, including urgent and overdue. `1px var(--c-border-item)` rule under each row. Hover fill `--c-band-service`. `isUrgent` and `isOverdue` change ONLY what the DeadlineCell and StageCell print. They must not change row height, background, border, the font weight of any other cell, or sort position. No left accent bar. No icon column. No glyph. No striping. The row opens on double-click, and the underlined Request # link is the keyboard path into the record, so it is not optional decoration.

### DeadlineCell
```
props: kind: "Ticketing limit" | "Hold expires" | "Follow up" | "Check-in opens",
       state: "normal" | "within4h" | "overdue",
       sentence   // fully composed server-side
```
Invariants: the four kinds are ALWAYS spelled out in full and never abbreviated. There is no fifth kind, and any document naming `Airline limit`, `Issue by` or `TTL` is a defect, per D8. Only `Ticketing limit` and `Hold expires` ever go red. `Follow up` and `Check-in opens` stay in `--c-ink` at all times, because they are not money. Normal is 14px/400 `--c-ink`. Within four hours is 15px/700 `--c-urgent` and the sentence GAINS A CLAUSE: `Ticketing limit — today 3:20 PM, 3 hours left`. Overdue is **15px/700** `--c-overdue`, the same size as urgent and not larger: `Ticketing limit — expired 11:40 AM, 24 minutes ago`.

**The cell shows our derived action-by time.** The supplier's stated number does NOT appear in the grid cell. It appears in the record window's Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer, per D8.

**The component computes nothing.** It renders `sentence`. The grammar, the pluralisation, the rounding and the zone are all server-side.

### StageCell
```
props: stageWord, isOverdue
```
Invariants: a word in ordinary `--c-ink`. **Seven stages, zero colours**, per D9: `Accepted`, `Payment pending`, `Paid`, `Ready to issue`, `Sent to ticketing`, `Ticket issued`, `Confirmation sent`. Any file or component saying eight stages is a defect, per D17. No fill, no dot, no icon, no border. When `isOverdue` is true the stage word is REPLACED by `OVERDUE` at 11px/700 uppercase `--c-overdue`, no tracking. That is the only variation this cell has.

### RecordWindow
```
props: size: "large" | "medium", titleText, tabs: { label, count? }[], activeTab,
       onClose, children, footer
```
Invariants: three sizes and no others, per D1. `large` is 1120x760 at x=160, y=70 and is the record window. `medium` is 820x620 centred at y=90 and is the document preview, message viewer, audit entry, help and the deadline explainer. `var(--radius)`. `2px solid var(--c-crown)`. `var(--shadow-window)`, the only shadow in the product. Backdrop `rgba(28,31,27,0.42)`, no blur.

Title bar `--h-window-title` (40px), `--c-crown` fill, title 15px/700 `--c-ink-invert` at 0.3px tracking, 16px inset. Right side carries an underlined 12px `--c-crown-ink` `Open in full page` link on `large` only, then a 26x26 SQUARE `✕` with hover fill `--c-crown-border`.

Tab strip `--h-window-tabs` (34px), `--c-band-header`, **on `large` only**. `medium` has no tab strip. The cap is eight tabs, they never scroll and never overflow, and six is not a cap: Requests have six and Clients have seven and both are legal.

Footer 52px, `1px var(--c-border-item)` top rule, `--c-surface` fill, 20px inset, buttons right-aligned in the order `[Save]` secondary then `[Save & Close]` primary, 10px gap. A read-only `medium` window gets a single `[Close]` secondary button.

NOT draggable, not resizable, not minimisable. Exactly one editable instance may be mounted. Over an S2 `large`, exactly two things may open, per D1: an S3 confirm, and a read-only S2 `medium` with a single `[Close]` button. A `medium` that can save may not, and nothing stacks three deep. Tab labels carry a plain count in parentheses when they hold records, `Payments (2)`, never a badge. The body is the only scrolling region, at 20px inset, with bordered sections in `2px var(--c-border-container)` at 16px vertical gaps, each with a `--c-band-header` strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`.

Closing with a dirty form raises the S3 confirm reading `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary. Escape is equivalent to the ✕ and must honour the same handling. Focus moves in on open, is trapped while open, and returns to the originating row on close, because the list is never destroyed and the row is still there.

### Confirm
```
props: message, confirmLabel, cancelLabel, typeToConfirmWord?
```
Invariants: S3, the `small` size, 520 wide and auto height capped at 420, centred at y=200. Same construction as the window, with **no tab strip and no scrolling body**. It may open over an S1 box, an S2 window or an S5 workspace, and **nothing ever opens over it**. `typeToConfirmWord` is legal on exactly the four D3 actions and on no others: void a ticket, issue a refund, delete a client record that has bookings, change a user's role. The destructive button is a secondary button with `--c-urgent` label text and a `1px var(--c-urgent)` border.

### ViewDropdown
```
props: groups: { caption, items: { label, count }[] }[], value, onChange
```
Invariants: S4. 320px wide, `--c-surface` fill, `1px var(--c-border-control)`, **NO shadow**, `var(--radius)`. Group captions 11px/700 uppercase 0.7px `--c-ink-3`. Item rows 30px with right-aligned counts, tabular per D7. Choosing a view does not change the queue tab you are on, it narrows it, and it appends the view name to the section header strip. Keyboard behaviour comes from Radix. Restyle it, do not reimplement it.

### FieldRow
```
props: label, required?, children, description?, error?, notProvided?, onNotProvidedChange?
```
Invariants, all from D5: row height 34px, or auto for a textarea. `1px var(--c-border-field)` rule between rows. Label column 180px, 13px/400 `--c-ink-2`, right-aligned, 12px gutter. Value column fills the remainder. Required is the word `Required` at 11px/700 uppercase `--c-ink-3` after the label, **no asterisk**. Description 13px/400 `--c-ink-3` under the control. Error 13px/400 `--c-urgent` on its own line under the field plus a `1px var(--c-urgent)` border on the control, in words, with no icon, no fill and no shake. Input height `--h-input` (30px), `1px var(--c-border-control)`.

**Every field a client is expected to supply carries the checkbox labelled exactly `Client has not provided this yet`** in its value column. Ticking it clears and disables the field, records the state, and satisfies the form. This is part of the field contract, not a per-screen decision, so that no screen can ship a field without it.

### Checkbox and Radio
```
props: checked, onChange, label
```
Invariants: 14x14, `1px var(--c-border-control)`. Checkbox fills `--c-crown` with a white check when on. Radio is a 14x14 **SQUARE** with a 6x6 `--c-crown` centre square when on. There are no circles in this product, and that includes radios.

### Pagination
```
props: page, pageCount, itemCount, onPageChange
```
Invariants: `--h-pagination` (38px), `2px var(--c-border-container)` top border, `--c-band-service` fill. Page numbers are zero-radius bordered boxes. Active page is `--c-crown` fill, `--c-ink-invert`, 700. Counts use tabular figures, per D7. Numbered and explicit, never infinite scroll, never a "load more" button. Removed when the screen is printed, per D16. Individual page-box dimensions, their border colour, the hover and disabled treatments, the single-page-of-results case and the item count string format are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

### InitialsSquare
```
props: initials
```
Invariants: a SQUARE. No border-radius. No photograph, ever, including a fallback image slot. If you are about to add an `imageUrl` prop, stop.

### MessageBand
```
props: text, kind: "error" | "info"
```
Invariants: page-level, directly under the page header. 38px, `--c-band-service` fill, `2px var(--c-urgent)` left border, 13px/400 `--c-ink`, per D6. **Never a toast.** There is no toast surface in this product and Sonner is not installed.

---

## 7. THE DOMAIN RULES THE UI MUST RESPECT

These are correctness requirements, not UX preferences. Getting one wrong produces a wrong number on a screen that staff act on with money.

1. **Deadlines are ANCHORED to an event, never typed.** The model is "24 hours before this flight", where the flight can move. Dates derive and recompute when the anchor moves, and obsolete reminders are suppressed. There is no date input for a deadline anywhere in this product. If a form you are building has a deadline date picker, it is wrong. Build an anchor selector plus an offset instead.

2. **TWO deadlines per obligation, always.** First, the supplier's stated number, stored exactly as given and **IMMUTABLE**. Second, our own derived action-by time, which is supplier time minus client payment time minus issuance time, pulled into office hours through the business calendar. **Sort and count on OURS. Display BOTH**, ours as the sentence in the grid cell and the supplier's as the labelled `Stated by supplier` field in the record window's Deadlines section and in the deadline explainer, per D8. A well-meaning change that surfaces the supplier number in the grid cell breaks the whole urgency reading.

3. **OVERDUE MEANS PAST THE SUPPLIER'S NUMBER, never past our internal buffer.** This is the highest-consequence line in this file. If overdue is computed against the internal buffer, the counter can never reach zero, staff learn that the red text lies, and the entire urgency model in section 2 rule 5 becomes noise. Test it explicitly, in both directions.

4. **Store every deadline as a UTC instant plus the IANA zone it was quoted in.** Never a naive local timestamp, and a naive local timestamp should be unrepresentable in the type system rather than merely discouraged. Compute countdowns against the deadline's own zone, never the viewer's. **ALL date arithmetic is server-side**, in `src/server/`. The browser's zone is never an input to a business decision. The client receives an already-composed sentence and renders it.

5. **The Israeli business calendar is a CORRECTNESS dependency, not a formatting detail.** Sunday to Thursday working weeks, Friday half days, Shabbat, moving holidays. Every internal derived deadline runs through it, in `src/server/calendar/`. Do not use a generic "business days" helper. Do not hardcode Saturday and Sunday as the weekend. DST transitions in the US and Israel zones do not fall on the same dates, and both belong in the tests.

6. **ONE lifecycle per record, and one screen never shows two steppers.** Client onboarding stages belong to the CLIENT record and there are six of them: new inquiry, welcome sent, waiting for information, information received, review complete, fully onboarded. **Booking stages belong to the REQUEST and there are SEVEN**, per D9: `Accepted`, `Payment pending`, `Paid`, `Ready to issue`, `Sent to ticketing`, `Ticket issued`, `Confirmation sent`. There is no eighth booking stage. The earlier open question about the name of an eighth stage is closed, and D17 lists "eight stages" among the phrases every file must stop saying.

7. **"Blocked" is a FLAG with a mandatory reason and a mandatory follow-up date, never a stage.** Do not add it to either stage enum. Do not render it in the Stage column as if it were a stage. A blocked record still has its real stage, and both facts are true at once, which is exactly why one of them cannot be the other.

8. **PARTIAL is a first-class outcome.** Three of five passports in. Four of five seats confirmed. Render `4/5`. Drive the countdown from the **EARLIEST UNSATISFIED person**, not from an average, not from the group, and not from the last one to arrive. A partial state blocks a gate, and it must block it correctly.

9. **One TICKET record PER PASSENGER, never one per booking.** Any list, count, refund, void, exchange or reconciliation that assumes one ticket per booking is wrong and will be wrong in a way that surfaces during a refund, which is the worst possible moment.

10. **Documents VERSION rather than overwrite.** A renewed passport is a NEW document with a new number. The old book often still carries a valid visa, and the old number may already be printed on an issued ticket. There is no "replace file" action anywhere in this product. There is "add new version", and prior versions stay visible and remain findable by their old number.

11. **Passport validity is not a date alarm.** It is a rule evaluation of the passport's expiry against the destination's rule against which trip date applies. Six months beyond entry for Thailand and the UAE. Six months at the time of **visa application** for India. Three months beyond departure for Schengen **plus** issued within the previous ten years. Validity at entry only for Canada and Australia. Do not implement this as "expiry minus six months". The verdict is a sentence in ordinary ink and is never rendered as a red date: `Fails. Expires 4 February 2027, and Thailand requires validity to 18 February 2027.`

    The rule engine reads the **passport record's stored actual expiry and its stored issuing country**. Do not derive a validity period from the holder's age. The observation that under-16s often receive five-year books against ten for adults is a property of the issuing authority, it is not universally true, and it interacts with the Schengen ten-year issuance rule, so it must never be computed. Whether the destination rule model carries an issuing-country dimension at all is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and a dual-national household cannot be evaluated correctly until it is.

12. **Every intake field needs an explicit "client has not provided this yet" value.** Missing-information reporting reads that recorded value and never counts blanks. **Do NOT add required-field validation to intake forms.** MANDATORY FIELDS CAUSE FABRICATED DATA: offshore staff under volume pressure will type a placeholder passport number rather than fail to save, and a fabricated passport number is worse than a blank one in every single downstream system, because a blank is visible and a fake is not. A field satisfied by this control counts as complete for the form and as **unsatisfied for the send-to-issue gate**, and that difference is the entire point of the control. No new mandatory field ships without a written justification in the pull request.

13. **The communication log is a DIFFERENT record from the change history.** "Price changed from 4,200 to 4,650" is not the same fact as "we told Ruth on the phone on 28 July and she approved it". In a dispute only the second one helps. Never merge them into one timeline component. Never derive one from the other. Never write a communication log entry into the change history or the reverse.

14. **Financial records are APPEND-ONLY.** A correction cannot exist without naming what it corrects. Voided records stay visible and searchable, marked with the literal word `VOID` as text in the status position, which in this design system means text and not a coloured badge, because there are no badges. There is no delete action on a financial record, ever. The exact ink token and size for the `VOID` word are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. It is text either way, so the open question cannot reintroduce a badge.

15. **Every price, deadline, approval, override, message and ticket action has an OWNER, a TIMESTAMP, a STATUS and HISTORY.** If you are creating a table, a type or a form without those four, you are creating a future dispute that nobody will be able to settle. Provenance is attached at exactly one place, the submit boundary function, per `07-BUILD-STANDARDS.md`: who entered it, when, and from what source, whether an agent typed it, Sabre returned it, or a WhatsApp message was transcribed.

16. **A recurring rule and a single occurrence are two different records.** Each occurrence carries its own outcome. Editing the rule does not rewrite history.

17. **Effective-dated values never overwrite.** Booking fees especially. Editing closes the current row and opens a new one, and `Recorded on` is a real column and a distinct fact from `Effective from`, per D10. "We were told on 30 July that the fee changed effective 1 June" is a normal week here, and the two dates decide whether you chase the client or absorb the difference. A fee change never retroactively alters an already-issued quote or invoice.

18. **Safety comes from WORKFLOW GATES, not permissions.** There are exactly two roles, booking agent and supervising agent, and both can do almost everything. Therefore implement the send-to-issue checklist, payment confirmed before issuance, explicit confirmation on the D3 destructive actions, and after-the-fact supervisor review. Do not "solve" a safety concern by inventing a third role, and do not invent a permission-denied state, which D6 says does not exist.

19. **Fare watch is a CHILD of the confirmed booking, never a sibling.** A second PNR for the same passenger is treated by EL AL, United, Delta, American and Qatar as a DUPLICATE BOOKING subject to cancellation and ADM charges. The default assumption is that the waitlist lives inside the confirmed PNR. Any second locator is an OPTIONAL ATTRIBUTE on the fare watch, never a booking record. Never render a fare watch anywhere a booking is rendered.

20. **A quoted FARE ages.** Integrations are live, so treat data as live rather than hand-typed, but every fare carries a "verified at" stamp and the UI shows it. A proposal without a "fare last checked" stamp is a claim with no shelf life, and every argument about it is unwinnable.

21. **The proposal is one template, rendered once.** The on-screen preview the agent approves and the PDF the client receives come from the same server-rendered HTML and CSS. Two templates drift, and the drift is discovered in a dispute about a price the client says they never saw. Store the generated bytes, both the PDF and the page-one image, and never plan to regenerate, because fees are effective-dated and fares change.

22. **Passport data, payment data and Sabre credentials live in controlled secret storage.** Never in normal documents, spreadsheets, log lines, AI prompts, error messages or user-visible configuration. Do not log a request body that could contain them.

---

## 8. WHAT TO DO WHEN A DESIGN DOES NOT EXIST YET

You will hit screens, states and components that `04-SCREEN-INVENTORY.md` does not cover. This is expected. It is not a blocker to work around, it is a question to raise.

**Do NOT:**

- invent the layout because it is "obvious"
- copy the pattern from a similar product you have seen
- build a placeholder you intend to replace
- reach for a shadcn or Radix default appearance
- pick a plausible hex, size, weight or spacing value
- build it and note the uncertainty in a code comment, where nobody will read it

**DO, in this exact order:**

1. **Stop writing UI code for that surface.** Not for the whole task, for that surface.
2. **State exactly what is missing, in one line, naming the surface type it would sit on.** For example: "The Payments window tab body is not in `04-SCREEN-INVENTORY.md`. It would be stacked bordered sections inside the record window body, S2 large."
3. **Say what you CAN build without it, and build only that.** A screen with a missing tab is still a screen with five working tabs.
4. **Ask for a Claude Design pass on the missing piece, using `05-CLAUDE-DESIGN-BRIEF.md`.** That file is the brief the design pass runs against. Ask for the visual and, more importantly, for the **spec block**: a fenced `consulate-spec` block in the exact YAML shape of `05-CLAUDE-DESIGN-BRIEF.md` section 16, with the keys in the order given, none added and none omitted. It carries `name`, `kind`, `route`, `surface`, `size`, `shadow`, `radius`, `chrome`, `regions` with heights and fill tokens, `tokens`, `type`, `states`, `data`, `interactions`, `must_never` with at least five entries, and `unspecified`. `size` is `large`, `medium` or `small` for an S2 or an S3 and `not applicable` everywhere else, and a spec block that omits it is not in the contract shape and must be sent back.
5. **When the spec block comes back, PASTE IT INTO THE DESIGN SYSTEM FIRST and commit that.** It goes into `01-CONSULATE-DESIGN-SYSTEM.md`, which is what `05-CLAUDE-DESIGN-BRIEF.md` section 16 specifies, and the screen is added to `04-SCREEN-INVENTORY.md` so the section 3 pre-flight can find it next session. **Then** build against it. Building first and documenting after produces a codebase that is its own specification, which is the failure this whole package exists to prevent.
6. **If the spec introduces a value that is not in `tokens.css`, add the token to `tokens.css` in the same commit,** with a one-line comment, and flag it in your response so a human sees it.

For anything genuinely unspecified that you must reference in a document, a comment or a response, write the exact string:

```
NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
```

**That is the single canonical unspecified string for the whole package, and there is no second one.** It is the same string in this file, in `05-CLAUDE-DESIGN-BRIEF.md`, in `07-BUILD-STANDARDS.md`, in a code comment, in a commit message and in a reply to a human. Inside a `consulate-spec` block, the `unspecified` key uses the same string with a colon and the thing that is missing appended: `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: <what>`. A variant such as "ask before building", "raise with the design owner before building", "TBD" or "TODO" is a defect, because the flags are searched for as a literal string and a variant does not appear in the search.

**Cite the D18 item number where one exists.** `00-DECISIONS.md` D18 is the open items register and it numbers 55 of them, so most flags you write already have a home. Append the number in parentheses: `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the icon tile glyph set (D18 item 17)`. If the thing you are flagging is genuinely not in D18, write the flag without a number and say so in your response, because a new open item needs to be added to the register.

Either way: do not soften it, do not guess in parentheses next to it, and do not leave a "probably 12px" beside it. A blank that is flagged is a question. A blank that is filled with a guess is a defect that looks finished.

### D18 IS THE OPEN ITEMS REGISTER. STOP AND ASK, DO NOT INVENT

`00-DECISIONS.md` D18 lists 55 numbered items the client still owes the developer. **They are not defects and they are not yours to close.** Every `NOT YET SPECIFIED` flag in this package points at that register, so when you hit one there is a real place to look and a real person to ask.

The procedure is the one above and it does not have a shortcut. Stop writing UI code for that surface. Name the item and its D18 number. Build the part that does not depend on it. Raise it with Joe, get a decision, write the decision into `00-DECISIONS.md` against its D18 number, and then build. **Do not invent an answer, do not build a placeholder you intend to replace, and do not pick the value that a similar product uses.** An invented answer to a D18 item is worse than a blank, because it ships looking settled and nobody raises it again.

The three that block the most work, if only a few get resolved:

- **D18 item 17, the page-header icon tile glyph set.** One flat white shape per object tab plus Reports and Admin. The tile is mandatory on every screen, so this one blocks the whole of `04-SCREEN-INVENTORY.md`.
- **D18 item 30, the canonical pricing group list.** The package names `Belev Echad`, `Scheiman`, `Community All` and `Standard`, and nobody can tell whether `Standard` and `Community All` are one group or two. It blocks RQ-02, CL-02, CL-12 and all of Admin.
- **D18 item 31, which instant triggers overdue,** the supplier's stated time or our derived action-by time. The two differ by hours on every held PNR, and it changes the meaning of the most important counter in the product. Section 7 rule 3 of this file states the answer this codebase builds to, that overdue means past the supplier's number and never past our internal buffer. The register still carries the question as open, so build to rule 3 and say in your response that D18 item 31 needs closing to confirm it.

---

## 9. DEFINITION OF DONE

Self-verify every item before you say a UI change is finished, and report which ones you checked. If any one fails, it is not done.

**Tokens and values**
- [ ] No colour literal appears outside `src/styles/tokens.css`.
- [ ] The only literal in the codebase is the D2 window backdrop, in the backdrop element only, and its missing token has been raised rather than invented.
- [ ] No derived colour: no `lighten`, no `darken`, no `color-mix`, no opacity applied to a token.
- [ ] No new token was used without being added to `tokens.css` in the same change and flagged in the response.
- [ ] No `--c-ink-heading-on-band`. The token is `--c-ink-on-band` and it already exists.
- [ ] No Tailwind arbitrary value carrying a hex, a radius, a shadow or an off-scale pixel size.

**The defining rules**
- [ ] Every `border-radius` is `var(--radius)`. Grep for `radius` and `rounded` and confirm.
- [ ] Every border is `2px var(--c-border-container)` or `1px var(--c-border-item)`, except the specified `1px var(--c-border-control)` on controls and dropdown panels and `1px var(--c-border-field)` between form field rows. No third weight.
- [ ] Every heading is a filled band, not bold text in whitespace.
- [ ] There is exactly one `box-shadow` in the change, and only if the change is the record window or the confirm.
- [ ] Focus is `outline: var(--focus-ring)` at `var(--focus-offset)` on every interactive element. No ring-offset halo, no glow, no colour-change-only focus, no `box-shadow` ring.
- [ ] No urgency treatment moves, fills, tints, resizes, reorders or icon-marks a row.
- [ ] Only the five surfaces of D1 exist. No new surface was introduced under another name.

**Silhouette and structure**
- [ ] Nothing was added to the left edge.
- [ ] Navigation depth is still three levels, and window tabs did not escape the window.
- [ ] Content sits inside the Box, never directly on `--c-canvas`.
- [ ] Queue counts of zero print nothing at all, and there are no more than seven queue tabs.
- [ ] Chrome is a flex column, with no hard-coded y-offsets, and the screen is correct with and without the 38px queue band.

**Type**
- [ ] Font family is `var(--font)` everywhere. Weights are only 400, 600 and 700.
- [ ] No monospace, including on PNRs, ticket numbers, locators and record numbers.
- [ ] `tabular-nums` is applied to every right-aligned numeric or currency column, per D7, and to nothing left-aligned. No date, time or deadline sentence is tabular.
- [ ] Column headers are sentence case with no tracking. Section header strips are uppercase 0.7px. These are not the same and were not swapped.
- [ ] Nothing on a data screen is larger than the 22px H1, and the only grid text above 14px is an urgent or overdue deadline at 15px.

**Fixed heights unchanged**
- [ ] crown row 1 44, crown row 2 40, queue band 38, page header 64, section strip 32, control strip 44, column header 30, group header 26, data row 44, button 34, input 30, pagination 38, window title bar 40, window tabs 34, window footer 52.

**Prohibitions**
- [ ] Nothing from the "does not have" list was introduced, including by a library default.
- [ ] Booking stage is still an uncoloured word, and there are seven of them.
- [ ] The column header is still inert: no sort arrow, no click handler, no resize handle.
- [ ] Links are underlined at rest.
- [ ] No filled red button, no badge, no chip, no toast, no animation.

**Domain**
- [ ] No date arithmetic runs on the client, and no component imports Luxon.
- [ ] No `new Date()` or `Date.now()` is used to decide urgency, overdue state or any other business fact.
- [ ] Overdue is evaluated against the SUPPLIER deadline, not the internal buffer.
- [ ] Both deadlines exist where an obligation is shown, and only ours is in the grid cell.
- [ ] No deadline is a typed date field. Anchors and offsets only.
- [ ] No required-field validation was added to an intake form, and every client-supplied field carries `Client has not provided this yet`.
- [ ] Anything created has owner, timestamp, status and history.
- [ ] No screen shows two steppers.
- [ ] Financial records are append-only and voids remain visible as the word `VOID` in text.
- [ ] The communication log and the change history were not merged or derived from each other.

**Boundaries and quality**
- [ ] No direct import of `@tanstack/react-table`, `luxon`, `useFieldArray` or `watch` outside `src/lib/table/`, `src/lib/datetime/` and `src/lib/forms/`.
- [ ] No `.transform()` in a form schema. Transform happens at the submit boundary, where provenance is attached.
- [ ] TypeScript strict, no new `any`, no new cast added to silence a resolver.
- [ ] Keyboard path verified end to end: focus into the window, focus trapped, Escape closing with the dirty-form confirm, focus returned to the originating row.
- [ ] The screen prints legibly, per D16.
- [ ] Screenshots are at 1300px minimum width, per D11.

**Process**
- [ ] Every screen built appears in `04-SCREEN-INVENTORY.md`.
- [ ] Every component built appears in `02-COMPONENT-LIBRARY.md`.
- [ ] Nothing was invented. Anything unspecified is flagged with the exact string from section 8.

---

## 10. COMMON MISTAKES IN THIS CODEBASE

Written as corrections, because every one of these will be attempted and most of them have been attempted already.

1. **Do not colour-code booking stage.** Do render the stage word in `--c-ink`. This is the most frequent violation and the most certain rejection.

2. **Do not say there are eight booking stages.** Do use the seven of D9. The eighth-stage question is closed and there is no eighth stage to name.

3. **Do not put a coloured left border, a background tint, a dot or a warning icon on an urgent row.** Do change the DeadlineCell sentence and let it gain its clause.

4. **Do not pin, duplicate or re-sort urgent rows to the top.** Do rely on the default sort, deadline ascending, grouped by day, which already puts them at the top without moving anything.

5. **Do not make the column header sortable, clickable, hoverable or resizable.** Do leave it inert at `cursor: default` and put sorting in the Sort select in the control strip, which is what that control exists for.

6. **Do not add a shadow to a dropdown, select, popover or menu because it "looks flat".** Do use `--c-surface` with `1px var(--c-border-control)` and correct stacking order.

7. **Do not use `border-radius: 2px` "so it does not look harsh".** Do use `var(--radius)`, which is `0`, and delete Tailwind's radius scale so `rounded-*` cannot resolve to anything.

8. **Do not make the avatar circular.** Do use `InitialsSquare`, and do not add an image fallback prop.

9. **Do not render a PNR, ticket number, locator or record number in monospace.** Do use the same face as everything else.

10. **Do not build a left sidebar for "the new admin section".** Do reach Admin from `More ▾` in the crown, and do build its section navigation by reusing the queue tab band at the same 38px geometry, per D10.

11. **Do not convert the list to infinite scroll, a virtualised list or an auto-loading list.** Do use numbered explicit pagination as bordered zero-radius boxes with the active page as `--c-crown` fill, white, 700. Hundreds of rows is the real scale, not tens of thousands, and virtualisation here solves a problem you invented.

12. **Do not open a record in a new page, a side panel, an inline expansion, a browser tab or a stack of windows.** Do open the single record window at its fixed position over the intact list.

13. **Do not make the record window draggable or resizable because it feels natural.** Do leave it fixed at the D1 size for its kind.

14. **Do not shrink rows to fit more data.** Do build a better filter or a saved view.

15. **Do not add a density toggle, a compact mode, or a dark mode.** All three are on the "does not have" list, and dark variants must be removed from any shadcn component that ships with them.

16. **Do not render a queue count of `0`.** Do render nothing at all, with no parentheses.

17. **Do not abbreviate a deadline type to "TL" or "Tkt limit", and do not invent a fifth type.** Do spell out `Ticketing limit`, `Hold expires`, `Follow up` and `Check-in opens` in full, always.

18. **Do not turn `Follow up` or `Check-in opens` red when they get close.** Do leave them in `--c-ink` at all times. They are not money.

19. **Do not put the supplier's stated deadline in the grid cell.** Do put ours in the cell as the sentence, and the supplier's in the record window's Deadlines section as `Stated by supplier`.

20. **Do not compute "3 hours left" in the browser.** Do receive the composed sentence from the server, which knows the deadline's IANA zone, the rounding rule and the pluralisation.

21. **Do not use a generic business-day helper that treats Saturday and Sunday as the weekend.** Do call the Israeli business calendar in `src/server/calendar/`.

22. **Do not mark intake fields required to improve data quality.** Do provide the explicit `Client has not provided this yet` value and report on it. Mandatory fields cause fabricated data.

23. **Do not overwrite a document when a new passport arrives.** Do create a new version and keep the old one visible and findable by its old number.

24. **Do not derive passport validity from the holder's age.** Do read the stored expiry and the stored issuing country on the passport record.

25. **Do not merge the communication log and the change history into one activity feed.** Do keep two records and two components.

26. **Do not add a delete action to a financial record.** Do append a correction that names what it corrects, and keep the void visible as the word `VOID` in text.

27. **Do not model "Blocked" as a stage.** Do model it as a flag with a mandatory reason and a follow-up date.

28. **Do not create a second PNR for a fare watch.** Do create a child of the confirmed booking with the second locator as an optional attribute.

29. **Do not assume one ticket per booking.** Do create one ticket record per passenger.

30. **Do not add a third role to solve a safety problem.** Do add a workflow gate, and do not invent a permission-denied state.

31. **Do not add a toast that auto-dismisses while carrying information the user needs.** Do use the page-level message band under the page header. Sonner is not installed, and it should not be installed and then left unused, because a configured toast is one import away from being used.

32. **Do not animate the record window open, the dropdown open, or a row hover.** Do change state instantly, and delete the animation and transition utilities from dialogs, dropdowns and accordions at install time.

33. **Do not import a component library whose components arrive as opaque imports: Material UI, Ant Design, Chakra, Bootstrap or PrimeReact.** Every one of them ships radius, shadow, animation and pills that you cannot reach and edit. **shadcn/ui is different and it IS permitted: it is the sanctioned component base for this product, per D14**, because its components are copied into this repository as source you own, under review like every other file. Radix primitives arrive as imports and that is fine and intended, because Radix ships behaviour and has no opinion about radius, shadow or colour. The test is exactly this: does the component arrive as source in this repository, or as an import from `node_modules` rendering markup you cannot open and edit. The first is permitted. The second is not, whatever it is called.

34. **Do not build a shadcn screen on shadcn defaults.** Do restyle to the token set at install time, before forty screens exist, then leave the generated internals alone. Change appearance, do not refactor structure. Delete `badge.tsx` and the toast component at install so nothing can import them.

35. **Do not initialise shadcn on the Base UI default.** Do choose Radix deliberately at `init` time and record the choice in the README, per `07-BUILD-STANDARDS.md`.

36. **Do not add a responsive breakpoint to make the grid fit a narrower screen.** Do treat 1300px as the minimum viewport, per D11, and let the page scroll horizontally below it.

37. **Do not put date arithmetic in a component, a hook or a page.** Do put it in `src/server/`, and do have the component render a string that was composed there.

38. **Do not "modernise" anything.** The product is deliberately not modern. If a change makes it look more current, that is evidence the change is wrong.
