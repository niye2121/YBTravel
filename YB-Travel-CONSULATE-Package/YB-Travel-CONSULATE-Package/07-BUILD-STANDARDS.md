# 07-BUILD-STANDARDS.md

Technical standards for the YB Travel CONSULATE build. Written for the human developer who owns the codebase, not for the AI assistant writing most of the lines.

**Read in this order before you read this file:** `assets/tokens.css`, then `01-CONSULATE-DESIGN-SYSTEM.md`, then `00-DECISIONS.md`. Every visual value in this document comes from those three. Nothing here invents one.

**Authority.** `00-DECISIONS.md` is the arbiter. Where this document and `00-DECISIONS.md` disagree, `00-DECISIONS.md` is right and this document is a defect. Report it, do not follow it. This revision has been reconciled against the arbiter and every open question it closed is marked below with the deciding item number.

**Canonical file names.** The package is exactly these eight files, and cross-references use these names and no others: `00-DECISIONS.md`, `01-CONSULATE-DESIGN-SYSTEM.md`, `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md`, `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md`, `07-BUILD-STANDARDS.md`. A reference to `02-COMPONENTS.md`, `03-SURFACES.md` or any similar variant is a defect, per D15.

---

## 1. The stack

| Layer | Choice | Reason |
|---|---|---|
| UI | React + TypeScript | Team-standard, and by far the largest training corpus for an AI-assisted build. TypeScript is not optional: the domain is money, deadlines and passport data. |
| Styling | Tailwind, themed from the token file | Utility classes map directly onto a locked token set. No cascade to reason about across forty screens. See "Tailwind and the token file" below. |
| Components | **shadcn/ui, initialised on Radix primitives** | Permitted and recommended, per D14. Explicitly Radix, not the newer Base UI default. Radix has years more training data behind it, and this codebase is written largely by an AI assistant. Choose the option the assistant will get right unprompted. |
| Forms | React Hook Form + Zod | Long intake forms with per-field "not provided yet" states, per D5. |
| Grids | TanStack Table v8, behind a project wrapper | v9 is in beta and renames the core hook. Do not adopt it. |
| Dates | Luxon, behind a thin wrapper | IANA zones and arbitrary business calendars. Luxon types never leave the wrapper. |
| Proposal PDF | Server-side headless Chromium via Gotenberg | One HTML and CSS template drives both the on-screen preview and the PDF. |

### shadcn/ui is permitted. This is settled.

**shadcn/ui is the sanctioned component base for this product**, per D14. State it plainly because an earlier draft of another package file listed shadcn alongside Material UI and Ant Design as a banned import. That contradiction is resolved: shadcn is in, the others are out, and the reason is not taste, it is ownership of the source.

shadcn is not a dependency in the sense the ban was written about. Its components are **copied into this repository as source you own**. There is no package to upgrade behind your back, no opaque bundle shipping a border radius you cannot reach, no vendor stylesheet fighting the token file. Once a shadcn component is in `src/components/`, it is your file, it is under review like every other file, and the restyle in section 2 is permanent rather than a per-render override.

**Forbidden as dependencies, no exceptions:** Material UI, Ant Design, Chakra, Bootstrap, PrimeReact, or any library whose components arrive as opaque imports. The test is exactly that: does the component arrive as source in this repository, or does it arrive as an import from `node_modules` that renders markup you cannot open and edit. The first is permitted. The second is not, whatever it is called.

Radix primitives arrive as imports, and that is fine and intended. Radix ships behaviour, not appearance: focus management, roving tabindex, type-ahead, escape handling, portalling. It has no opinion about radius, shadow or colour, so there is nothing to fight. shadcn's job here is to hand you correctly wired Radix markup that you then restyle to CONSULATE.

**Do not initialise shadcn on the Base UI default.** Choose Radix at `init` time, deliberately, and record the choice in the repository README. The assistant writing most of this codebase has seen far more Radix than Base UI, and on a forty-screen build the difference between "the assistant gets the primitive right unprompted" and "the assistant improvises" is the difference between review catching styling and review catching behaviour.

### shadcn Field family

Use `FieldSet`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError` as the standard primitive set for every form in the product. They are the right shape for what this product actually needs: long, grouped, heavily-labelled intake forms with per-field explanatory text and per-field error text. Do not hand-roll label, description and error markup screen by screen. One `FieldGroup` restyle at install time buys the whole product consistent form layout.

Field styling maps onto the design system as follows, with every value coming from D5 and `assets/tokens.css`:

- A form section inside the record window is a bordered section, 2px `--c-border-container`, with a `--c-band-header` header strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`, per D2.
- The form field row is 34px tall, or auto for a textarea.
- The **rule between field rows** is 1px `--c-border-field`. That is what `--c-border-field` is for, and it is the only thing it is for. It is a horizontal separator, not a control edge.
- The **border on an interactive control** (input, select, secondary button, the search field) is 1px `--c-border-control`. This agrees with `02-COMPONENT-LIBRARY.md`. An earlier draft read as though inputs were drawn in `--c-border-field`, which is nearly white and would leave a control with no visible edge. Inputs are `--c-border-control`.
- Label column 180px, 13px/400 `--c-ink-2`, right-aligned, 12px gutter. Value column fills the remainder.
- Inputs are 30px tall, 0 radius. Buttons 34px.
- Required is the word `Required` at 11px/700 uppercase `--c-ink-3` after the label. **No asterisk.**
- `FieldDescription` is 13px/400 `--c-ink-3` under the control.
- `FieldError` is 13px/400 `--c-urgent` on its own line under the field, plus a 1px `--c-urgent` border on the control. In words, in the same face. No icon, no fill, no shake.
- Checkbox 14×14, 1px `--c-border-control`, `--c-crown` fill with a white check when on. Radio 14×14 **square** with a 6×6 `--c-crown` centre square when on. There are no circles in this product.

**The "not provided yet" control is part of the Field contract, not a per-screen decision.** Every field a client is expected to supply carries a checkbox in its value column labelled exactly `Client has not provided this yet`. Ticking it clears and disables the field, records the state, and satisfies the form. Missing-information reports read that recorded value and never count blanks, per D5. Build it once into the project field component so no screen can ship a field without it.

### Standing rules on Zod and React Hook Form

These are not preferences. They are workarounds for documented friction, and an AI assistant will violate all of them unless the rule is written down and enforced in review.

**No `.transform()` in a form schema.** Zod 4 and the React Hook Form resolver disagree about transformed output types, and the failure is a type-level mess that gets "fixed" by casting, which is how a string reaches the domain layer wearing a parsed type. Keep two schemas:

```ts
// form schema: shaped like what a human types. Strings.
// Lives next to the component.
const requestFormSchema = z.object({
  departureDate: z.string(),          // "2026-08-14", as typed
  ticketingLimitLocal: z.string(),    // "15:20", as quoted by the supplier
  ticketingLimitZone: z.string(),     // "Asia/Jerusalem"
  passportNumber: z.string(),         // may be the not-provided sentinel
});

// domain schema: shaped like the system's truth. Parsed values.
// Lives in the domain module.
const travelRequestSchema = z.object({
  departureDate: PlainDate,
  supplierTicketingLimit: Instant,    // UTC instant + IANA zone
  passportNumber: ProvidedOrNotProvided,
});
```

Transform at the submit boundary, in one named function per form, never inline. That boundary function is also where **provenance gets attached**: who entered it, when, and from what source (agent typed, Sabre pull, WhatsApp transcription). Provenance is a product rule, and giving it exactly one place to be attached is how it stops being forgotten on the nineteenth form.

**All `useFieldArray` and all `watch` usage goes behind a project-owned hook.** React Hook Form v8 renames the field-array key and removes the callback form of `watch`. If forty screens call these APIs directly, the upgrade is forty edits under time pressure. If they call `useProjectFieldArray` and `useWatchedValue`, the upgrade is two edits in one folder.

```
src/lib/forms/useProjectFieldArray.ts   // wraps useFieldArray, owns the key name
src/lib/forms/useWatchedValue.ts        // subscription form only, never the callback form
```

Direct imports of `useFieldArray` or `watch` outside `src/lib/forms/` are a review rejection.

### TanStack Table wrapper

Every grid in the product renders through one project component, not through TanStack directly. The wrapper lives in `src/lib/table/`, per D15, and it is never called directly from a screen.

```
src/lib/table/DataGrid.tsx      // the only file that imports @tanstack/react-table
src/lib/table/types.ts          // project column definition type
```

The wrapper owns the CONSULATE grid contract so no screen can drift from it: 30px column header row in `--c-band-service`, 12px/700 sentence case `--c-ink-2`, no uppercase, no tracking; 26px group headers in `--c-band-service`, 12px/700 uppercase 0.6px; 44px data rows with a 1px `--c-border-item` rule under each; `--c-band-service` on hover; no zebra striping; no vertical column rules; numbered pagination at 38px with a 2px `--c-border-container` top border. Column headers are neither sortable nor resizable: sorting is the Sort select in the control strip, per D17.

**Tabular figures, per D7.** The wrapper applies `font-variant-numeric: tabular-nums` to **any right-aligned numeric column and any currency value**, which in practice means fares, fees, totals, balances and pagination counts. An earlier draft said "exactly two places", which was too tight and produced ragged money columns; D17 lists that phrasing among the things every file must stop saying. Left-aligned text, dates, times and deadline sentences stay proportional. There is still no monospace font anywhere in the product. The helper selectors at the foot of `assets/tokens.css` currently name `.fare` and `.pagination-count`; extend that selector list as new right-aligned numeric columns appear, rather than reintroducing the two-place rule.

The reference grid is the Requests queue list, and its column widths and alignments are fixed in D13. Build it exactly. The Deadline column is **340px** because the longest urgent sentence, `Ticketing limit — today 3:20 PM, 3 hours left` at 15px/700, must fit on one line inside a 44px row; the sentence is the design, so do not shrink it to fit another column in and never let the deadline wrap.

Because every grid is behind the wrapper, the eventual v9 hook rename is one file.

### Luxon wrapper

Luxon is an implementation detail. `DateTime` must never appear in a component prop, a React state type, an API payload type, or a Zod schema.

```
src/lib/datetime/index.ts       // the only file that imports luxon
```

Per D15, the folder is `src/lib/datetime/` and **Luxon types never leave it**. It exports project types (`Instant`, `PlainDate`, `ZonedDeadline`) and project functions. Components receive strings that are already formatted, or already-computed structured results. The arithmetic itself is server-side, in `src/server/`, for the reasons in section 5.

### Tailwind and the token file

The Tailwind theme is generated from the tokens and adds nothing. `assets/tokens.css` from this package ships into the repository as `src/styles/tokens.css` and remains the single source of truth, per D15. The Tailwind config extends the theme by referencing those custom properties by name, so a utility class can only ever resolve to a token value.

Three rules make this hold:

1. **No utility may introduce a value that is not in the token file.** No arbitrary-value brackets carrying a hex, a radius, a shadow or a pixel size that the tokens do not define. If a value you need does not exist in the token file, the design has not been made yet. Stop and ask, per the header of `assets/tokens.css`.
2. **The radius, shadow, font-family and colour scales are replaced, not extended.** Tailwind's defaults are deleted so that `rounded-md`, `shadow-sm` and the stock greys do not resolve to anything. A class that should not exist should fail loudly rather than render a rounded corner.
3. **Plain CSS using `var(--token)` is legal.** `02-COMPONENT-LIBRARY.md` authors components as hand-written classes reading custom properties directly, and `06-CLAUDE-SPECIFIC.md` shows its right and wrong examples the same way. Those two forms are the same values through two syntaxes, because both read the same custom properties. Do not rewrite the component library into utilities as a task in itself, and do not treat a `var(--token)` declaration as a violation.

Write the Tailwind config in the same commit that installs Tailwind, before any screen work. A config written after twenty screens is a migration.

### Proposal rendering

Server-side headless Chromium via Gotenberg. **One** HTML and CSS template renders both the on-screen preview the agent approves and the PDF the client receives. Full specification in section 3.

This is not a convenience. In an approval workflow, the thing the agent looked at and the thing that left the building have to be the same thing, or the approval means nothing. Two templates drift, and the first time anyone notices is a dispute over a price the client says they never saw. One template, one renderer, no exceptions.

### Folder structure

Exactly this, per D15. Do not invent a different one, and do not relocate a wrapper folder because a file grew.

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

`components/surfaces/` holds exactly the five surfaces of D1 and no others: the box, the window, the confirm, the panel, the workspace. There is no read-only viewer surface, no help window surface, no settings surface and no toast. A new file in that folder is a design change, not a build decision.

**No date arithmetic in the browser.** Anything under `src/server/` owns it. This is the code an AI assistant writes confidently and wrongly, so it is server-side, wrapped, and tested first.

---

## 2. Heavy customisation warning

**shadcn/ui ships rounded, shadowed, modern components. CONSULATE is none of those things.**

shadcn defaults are the exact aesthetic `01-CONSULATE-DESIGN-SYSTEM.md` was written to reject. Every generated component arrives with a border radius, a soft shadow, a ring-offset focus halo, a muted grey palette, and a geometric sans font stack. If you install components and start building screens, you will have forty screens carrying defaults that contradict the design system, and the fix becomes a rewrite instead of a config change.

**Restyle to the token set at install time, before screen work begins. Before forty screens exist.** Then leave the generated internals alone. The structure, the Radix wiring, the prop shapes and the accessibility behaviour should stay close to stock so that future upgrades stay tractable. Change appearance. Do not refactor structure.

This is the price of the D14 decision and it is worth paying, but it is only cheap if it is paid on day one. Restyling one `Button` before any screen imports it is an afternoon. Restyling it after forty screens have layered per-screen overrides on top of it is a rewrite with regressions.

### The specific defaults that must be overridden

| shadcn default | CONSULATE requirement |
|---|---|
| `--radius` (rounded corners on every component) | `--radius: 0`. Zero corner radius, everywhere, forever. No circles, no pills. Initials sit in squares. Delete Tailwind's radius scale so `rounded-*` resolves to nothing. |
| Box shadows on cards, popovers, dropdowns, dialogs, sheets | Exactly ONE shadow in the whole product: `--shadow-window` on the record window (S2), and on the S3 confirm which is the same construction. Every other component's shadow is removed. The dropdown panel (S4) sits on solid `--c-surface` with a 1px `--c-border-control` border, **no shadow**, and is simply on top, per D1. |
| Focus ring: `ring` + `ring-offset` halo, rounded, soft | Replace with the settled treatment: `--focus-ring` (2px solid `--c-crown`) at `--focus-offset` (1px), per D4. Square, not a glow, not a colour change, not a radius. See section 4. |
| Muted palette (`--muted`, `--muted-foreground`, `--accent`, `--secondary`) | Map onto the real tokens: service bands to `--c-band-service`, section headers to `--c-band-header`, secondary ink to `--c-ink-2`, tertiary ink to `--c-ink-3`, containers to `--c-border-container`, list items to `--c-border-item`, control edges to `--c-border-control`. Do not leave a single shadcn grey in the build. |
| Default font stack (geometric or system sans) | `Tahoma, Verdana, Geneva, sans-serif`, from `--font`. Weights 400, 600 and 700 only. No second family. No monospace anywhere, including in code-like values such as record numbers and PNRs. |
| `Avatar` shipping as a circle | Square. Initials only. No photographs. |
| `Badge` / `Chip` components | **Not used. No exceptions.** This product has no chips, pills, badges or tags at all. Where the append-only financial rule says a voided record is "badged as void", that means the literal word `VOID` rendered as text in the status position, not a component. Delete `badge.tsx` at install time so nothing can import it. This is settled, not open: the void marker is the plain word `VOID` in **`--c-ink-2`**, never a coloured fill, never a chip, never a strikethrough and never a grey-out, per `04-SCREEN-INVENTORY.md` and `05-CLAUDE-DESIGN-BRIEF.md` section 9.4. Being a plain word, it takes the type of the position it occupies, exactly like any other value in that cell or field, so it needs no size of its own and it cannot reintroduce a badge. |
| Animation and transition utilities on dialogs, dropdowns, accordions | Removed. No animation beyond an instant state change. No fade, no slide, no scale-in on a modal. |
| Toast / Sonner | **Not installed.** There is no toast surface in this product, per D1. Errors and status messages render as the page-level message band directly under the page header: 38px, `--c-band-service` fill, 2px `--c-urgent` left border, 13px/400 `--c-ink`, per D6. Delete the component rather than configuring it, because a configured toast is one import away from being used. |
| `Dialog` shipping as draggable, resizable or stacked variants | The window (S2) appears in the same rectangle every time, at the three sizes in D1 and no others. Not draggable, not resizable, not minimisable, does not stack. Only an S3 confirm may open over an S2 window. Nothing else stacks. |
| Destructive button as a filled red button | A secondary button with `--c-urgent` label text and a 1px `--c-urgent` border, per D3. **There is no filled red button anywhere in this product.** |

Also delete on sight, wherever an assistant adds them: gradients, coloured status fills, zebra striping, vertical column rules, dark-mode variants, density toggles, drag-and-drop, kanban layouts, emoji, command palettes, infinite scroll, sortable or resizable column headers.

**Colour-coding of booking stage is banned.** Stage is a word in a column in ordinary ink. **Seven stages, zero colours**, per D9: `Accepted`, `Payment pending`, `Paid`, `Ready to issue`, `Sent to ticketing`, `Ticket issued`, `Confirmation sent`. Any file or component saying eight stages is a defect, per D17. `OVERDUE` replaces the stage word at 11px/700 uppercase `--c-overdue`, no tracking. Stage colour-coding is the single most common thing that gets "improved" into a codebase like this one. Reject it in review every time.

Every colour in application code references a token name from the token file. A raw hex value in a component file is a review rejection. The only place hex values appear is the token definition file itself.

---

## 3. The proposal document

The proposal is the one artifact that leaves the building and reaches a client. Design it accordingly.

### One template, shared between preview and PDF

Server-side headless Chromium via Gotenberg renders **one** HTML and CSS template. That single template produces both the on-screen preview the agent approves and the PDF the client receives.

Matching the preview and the artifact is a **safety property of an approval workflow**, not a nicety. The agent's approval is a statement about a specific document. If the preview is rendered by the application's own React components and the PDF is rendered by a separate print template, the two will drift, and the drift will be discovered in a dispute about a price a client says they never saw. One template, one renderer, no exceptions. If the preview and the PDF can disagree, the approval step is theatre.

### Mobile-first, not A4-first

The proposal reaches the client over WhatsApp and is read on a phone, usually within minutes, usually one-handed, often by someone older than the agent who sent it. Design the template for a narrow screen first and let it reflow up to a printed page, not the reverse. An A4 layout shrunk to phone width is unreadable, and unreadable means the client rings the office and asks the agent to read the fare out loud, which is the workflow this product exists to remove.

This is the one place in the product where a mobile-first layout is correct. The application itself is desktop only, per section 7. The proposal is an artifact, not an app screen, and the distinction is what keeps both rules coherent.

### Two artifacts per generation, always

1. **The PDF**, via Gotenberg.
2. **Page one rendered as an image.**

The image exists for a mechanical reason. In a WhatsApp thread an image renders inline and is read without any action. A document renders as a file card that requires a tap, and a meaningful share of clients never tap it. Send the image so the price and the itinerary are seen, and attach the PDF for the full detail and for the client's records.

Page one must therefore be self-sufficient: passengers, route, dates, total price, what is and is not included, and the expiry. It is not a cover page. If page one needs page two to make sense, the template is wrong.

### Provenance is stamped on the artifact

The proposal carries its own provenance, visibly, on the document. Not in a database row. On the artifact the client is holding.

- **Generated at**, with date, time, and the zone it is stated in.
- **Expiry**, when this quote stops being valid.
- **Fare last checked**, the verified-at stamp, because a quoted fare ages.
- **Version number.**

A quoted fare ages. A proposal without a "fare last checked" stamp is a claim with no shelf life, and every argument about it is unwinnable. All four stamps are produced by the server-side time module of section 5, in the zone they are stated in, never in the browser's zone.

### Store the bytes, not only the inputs

Persist the generated PDF bytes and the generated image bytes. Do not store only the inputs and plan to regenerate.

Regeneration will not reproduce what the client received. Booking fees are effective-dated and will change, per D10. Fares change. Templates change. The only defensible answer to "this is not what you sent me" is the exact file that was sent, retrievable and unmodified. This is the same principle as the communication log being a different record from the change history: what we told the client, as we told it, is its own fact.

The stored artifact is immutable. A corrected proposal is a new version that names what it supersedes, consistent with the rule that a correction cannot exist without naming what it corrects.

---

## 4. Accessibility

Staff range widely in age and confidence, and the screen is read across a desk. Accessibility here is an operational requirement, not a compliance checkbox.

### Focus is settled. Implement it, do not re-open it.

**`--focus-ring` (2px solid `--c-crown`) at `--focus-offset` (1px), on every interactive element**, per D4. Buttons, inputs, selects, checkboxes, radios, links, tabs, rows, menu items, and the window close button. Never a glow, never a colour change, never a radius.

This was the highest-priority open gap in the package and it is now closed. Any earlier draft describing the focus indicator as unspecified is out of date. Build to D4 and do not ship shadcn's default ring as a placeholder, because a placeholder here survives to production.

Implementation notes that follow from the tokens rather than adding to them:

- Use `outline` with `outline-offset`, not `box-shadow`. A `box-shadow` ring is a shadow, and there is exactly one shadow in this product.
- Delete shadcn's `ring` and `ring-offset` utilities from the theme so no component can fall back to them. A ring-offset halo on a zero-radius component reads as a rounded glow around a square, which is wrong twice over.
- The ring must be visible on `--c-surface`, on the filled bands `--c-band-header` and `--c-band-service`, and on `--c-crown`. On the crown, a `--c-crown` ring on a `--c-crown` fill is invisible, and the crown's interactive elements are the object tabs, the utility links, the search field and the Go button. Verify each of those against their actual backgrounds during the restyle, and if a crown element genuinely cannot show the settled ring, that is a design question for `00-DECISIONS.md`, not a licence to invent a second focus treatment.

### Contrast obligations given this palette

The palette is mostly high-contrast dark ink on white or near-white bands, which is safe. Three areas need deliberate verification during the restyle:

- **`--c-ink-3` on `--c-surface` and on `--c-band-service`.** This is the lightest ink in the system. The design system and the component library specify it at 11px/700 and 12px/700 for eyebrows and captions, **and also at 13px** for inactive queue tab counts, View picker item counts, and the read-mode "client has not provided this yet" sentence. Those 13px uses are specified and are not to be "fixed" in code. Verify them against both backgrounds and raise a contrast problem as a decision for `00-DECISIONS.md` if one appears. Do not unilaterally darken the token, and do not treat a specified use as a violation. What is fair to reject in review is a **new** use of `--c-ink-3` for running body text that no file specifies.
- **`--c-crown-ink` on `--c-crown`.** Inactive object tabs and the desk label. Do not extend this pairing to anything a user must read to complete a task. Anything actionable in the crown is white or an active white tab.
- **`--c-urgent` and `--c-overdue` on `--c-surface` and on `--c-band-service`.** Urgent deadline text at 15px/700 and group-header labels sit on both. Both must be verified against both backgrounds, not just white, because group headers are `--c-band-service`.

Colour is never the sole carrier of meaning anywhere in this product, and that is already guaranteed by the design: urgency is a sentence, not a colour block. An urgent deadline gains a clause, "3 hours left". An overdue row prints `OVERDUE` as a word in its Stage cell. A user who sees no colour at all still gets the full message. Preserve this property. Do not let anyone add a colour-only signal.

### Keyboard operability

There is no keyboard-first navigation model and no command palette. That is a deliberate absence. It does not mean the keyboard does not work. Every path through the product must be completable with a keyboard alone.

**The record window (S2)** is a modal dialog and must behave like one:

- Focus moves into the window on open.
- Focus is trapped inside the window while it is open. The list behind it is visible by design, at `rgba(28,31,27,0.42)` with no blur, but it is not reachable by Tab.
- Escape closes the window. Escape is equivalent to the square white ✕ button in the title bar, and it must respect the same unsaved-changes handling the ✕ does: a dirty form raises the S3 confirm reading `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary, per D2.
- Focus returns to the row that opened the window on close. The list is never destroyed, so the row is still there, and the user must land back on it.
- The window is not draggable, resizable, minimisable or stackable, so there is no keyboard equivalent to provide for any of those.
- The window tab strip is a tab list: arrow keys move between tabs, Tab moves into the panel. The tab strip appears on the `large` size only; `medium` and `small` have none, per D2. Tab membership per record type is owned by `03-WINDOW-TYPES.md`, capped at eight, and the strip never scrolls or overflows.
- The body is the only scrolling region in the window, and it must be keyboard-scrollable when focus is inside it.
- The footer buttons are reachable in their specified order, `[Save]` secondary then `[Save & Close]` primary, per D2.

**Type-to-confirm actions** are keyboard-operable end to end: the 30px input, the enabling of the destructive button, and the cancel path. They apply to exactly four actions, per D3: void a ticket, issue a refund, delete a client record that has bookings, change a user's role. Do not add a fifth, and do not add plain confirms beyond the five in D3. Unnecessary confirmations train the reflex that defeats the necessary ones.

Rows open on double-click or on single-click of the underlined Request # link. The link is a real link and is keyboard-reachable. A double-click-only affordance is not accessible, so the link is not optional decoration, it is the keyboard path into the record.

**Menus and dropdowns** (the View dropdown, the crown's `More ▾` tab, select controls) come from Radix and are keyboard-correct out of the box: arrow keys, Home and End, type-ahead, Escape to close, focus return to the trigger. This is a reason the Radix choice matters beyond training data. Restyle them. Do not reimplement them.

### Underlined links are an accessibility decision

Links are always underlined, in `--c-link`. Not on hover. Always.

This is not a period-styling flourish inherited from Dynamics. Underlining is what makes a link identifiable without relying on colour, which matters for the substantial share of users who do not reliably distinguish `--c-link` from `--c-ink`, and for anyone reading the screen from a distance or from a printout. Every screen can be printed and put in a folder, and on a monochrome printout the underline is the only thing left.

Anyone proposing underline-on-hover is proposing removing a colour-independent affordance. Reject it.

---

## 5. Testing

Not everything needs a test. These do, and the reason is the same in every case: they are correctness-critical, they are invisible when wrong, and they are exactly the kind of code an AI assistant produces confidently and incorrectly.

**Say it plainly: date arithmetic is the code an AI assistant writes confidently and wrongly.** It will produce something that looks right, passes a casual read, and is off by an hour twice a year, or wrong every Friday afternoon, or wrong for the one client quoted in a different zone. It will reach for the browser's local time. It will treat a naive timestamp as if it carried a zone. Tests are the only control that catches this before an agent misses a ticketing limit.

### Test-first, server-side only: the time and business-calendar module

Written before the code that uses it. Runs on the server, in `src/server/deadlines/` and `src/server/calendar/`. Never in the browser.

All date arithmetic is server-side, per D15. The browser's zone is never an input to a business decision. `src/lib/datetime/` formats and carries values; it does not decide them. Required coverage:

- Every deadline stored as a UTC instant plus the IANA zone it was quoted in. A naive local timestamp must be **unrepresentable in the type system**, not merely discouraged.
- Countdowns computed against the deadline's own zone, not the viewer's.
- The Israeli business calendar: Sunday to Thursday working weeks, Friday half days, Shabbat, moving holidays. This is a correctness dependency, not a formatting detail. Every internal deadline runs through it.
- DST transitions in both the US and Israel zones, which do not fall on the same dates.
- The boundary cases the urgency rules depend on: exactly 4 hours out, one second inside 4 hours, one second past the deadline.
- The deadline sentence grammar of D8, which is arithmetic dressed as prose: round down to whole units and pluralise (`3 hours left`, `1 hour left`, `48 minutes left`), minutes under one hour, `less than a minute left` under one minute, `expired 11:40 AM, 24 minutes ago`, then `expired yesterday 11:40 AM` past 24 hours, then `expired 28 July`.
- The four deadline types, never abbreviated: `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`. A test asserts there is no fifth type and that `Follow up` and `Check-in opens` never enter the urgent or overdue presentation, because they are not money.

### Deadline derivation

Two deadlines per obligation, always, and the tests must enforce the distinction:

- The supplier's stated number, stored exactly as given, **immutable**. A test asserts it cannot be mutated.
- Our derived action-by time: supplier time minus client payment time minus issuance time, pulled into office hours through the business calendar.

Sorting and counting run on ours. The grid cell shows ours as the sentence; the supplier's stated number appears in the record window's Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer, and **not in the grid cell**, per D8. Test that split, because a well-meaning change that surfaces the supplier number in the cell breaks the whole urgency reading.

**OVERDUE means past the supplier's number, not past our internal buffer.** Test this explicitly, in both directions. If overdue fires on the internal buffer, the counter never reaches zero, staff learn the red text lies, and the entire urgency system in `01-CONSULATE-DESIGN-SYSTEM.md` becomes noise.

Also under test: deadlines are anchored to an event, never typed. When a flight moves, the derived date recomputes. Test that a schedule change moves the deadline and that obsolete reminders are suppressed.

### Passport validity evaluation

Lives in `src/server/documents/`. Not a date alarm. A rule evaluation of expiry against destination rule against which trip date applies. One test per rule, minimum:

| Destination | Rule |
|---|---|
| Thailand, UAE | Six months beyond entry |
| India | Six months at time of **visa application** |
| Schengen | Three months beyond departure **and** issued within the previous ten years |
| Canada, Australia | Validity at entry only |

Plus: under-16s get five-year passports against ten for adults, which interacts with the Schengen ten-year issuance rule. Plus document versioning: a renewed passport is a new document with a new number, and the old book may still carry a valid visa while the old number may be printed on an already-issued ticket. Test that a renewal does not invalidate lookups against the old number.

### Fee resolution by category and effective date

Lives in `src/server/fees/`. Pricing groups (standard, Belev Echad, Scheiman) carry their own per-passenger booking fees, and those fees are effective-dated, with the table shape and the `Current` / `Scheduled` marking set in D10. Test:

- The correct fee for a given category on a given date.
- That a fee change does not retroactively alter an already-issued quote or invoice.
- Boundary dates: the day a rate takes effect, and the day before.
- That editing never overwrites a row: it closes the current row and opens a new one, and `Recorded on` is preserved as a distinct fact from `Effective from`. "We were told on 30 July that the fee changed effective 1 June" is a normal week here, and the two dates decide whether you chase the client or absorb the difference.

This is directly connected to section 3. If fee resolution were purely deterministic from inputs, storing proposal bytes would be unnecessary. It is not, so it is.

### The send-to-issue gate

Permissions do not provide safety here, because both roles can do everything operational and there is no permission-denied state, per D6. Safety comes from workflow gates, so the gates are the safety-critical code.

Test that issuance is impossible unless every gate condition holds: send-to-issue checklist complete, payment confirmed before issuance, explicit confirmation on destructive actions. Test the negative path for each condition individually. Test that partial states block correctly, since **partial is a first-class outcome**: three of five passports in, four of five seats confirmed, and the countdown driven from the earliest unsatisfied person.

Test that a field satisfied by `Client has not provided this yet` counts as unsatisfied for the gate while counting as complete for the form, because that difference is the entire point of the control.

### Not required

UI snapshot tests of grid chrome, hover states and band fills. The design system is the specification, review is the enforcement, and snapshots of a deliberately static UI generate churn without catching anything.

---

## 6. Performance and scale

Realistic scale: one agency, roughly 5 to 30 staff. A screen shows **dozens to hundreds of rows. Not tens of thousands.** The design system itself sets the expectation: 44px rows and 14px type give roughly 14 rows on a 900px viewport, deliberately.

**Raw grid performance is a red herring here.** Do not virtualise. Do not add windowing. Do not benchmark render time on synthetic hundred-thousand-row datasets. Numbered explicit pagination is already in the design, there is no infinite scroll, and TanStack Table v8 handles this volume without help. An assistant that reaches for virtualisation on this product has solved a problem it invented.

What actually matters is that a user reaches the right dozen rows without scrolling:

- **Saved views.** The level 3 View dropdown is the real performance feature. MY VIEWS, PRICING GROUPS, BY AGENT, ALL, each with a right-aligned count. Choosing a view does not change the queue tab you are on, it narrows it, and the section header strip appends the view name.
- **Grouping and default sort.** Default sort is deadline ascending, default grouping is by day. Urgent rows are already at the top and never need lifting. That is a performance property as much as a design one: the row the user needs is on screen already.
- **Queue tab counts.** All queues visible at rest, always, with live counts, capped at seven tabs per object, per D12. Those counts must be computed server-side and be cheap, because they load on every screen. A count of zero prints as nothing at all, and a count prints in `--c-urgent` when that queue holds anything due inside 4 hours.

The performance work that is real: server-side query and aggregation for counts and views, and not shipping the whole dataset to the browser to filter it there.

**If a user needs more rows on screen, the answer is a better filter or a saved view. It is never shrinking the row.** 44px rows are not a bug to optimise away.

---

## 7. Browser and environment support

- **Desktop only.** No mobile build is in scope, per D11. The proposal document is the only mobile-targeted surface in the product, and it is an artifact, not an app screen.
- **Minimum viewport width 1300px**, per D11. The arithmetic is `160 + 1120 + 20`: the record window is 1120px wide with its left edge at x=160, and a 20px gutter is needed on the right so the window does not sit flush against the viewport edge. Below 1300px the page scrolls horizontally. An earlier draft of this document said 1180px and attributed it to `01-CONSULATE-DESIGN-SYSTEM.md`. Both halves of that were wrong: 01 states no minimum, and 1180px is arithmetically impossible with a 1120px window at x=160, since it clips the window and puts the ✕ button and the `Open in full page` link off-screen. D17 lists "minimum viewport 1180px" among the things every file must stop saying. Do not add responsive breakpoints to make the grid fit narrower screens. There is no density toggle and no compact mode.
- **Build the chrome as a flex column, never as absolute offsets**, per D11. The crown is 84px and the page header is 64px, and the queue tab band is 38px **when present**. **Reports and S5 workspaces have no band**, and everything below them simply moves up 38px. **Admin is different: it carries no band of queues, but it does carry the same 38px band component as its section navigation**, per D10, so Admin's chrome height is unchanged and its page header sits at the same offset as Requests. Any component that positions itself from a hard-coded y-coordinate breaks on the screens without a band, and any component that assumes Admin is one of them breaks Admin.
- No dark mode. Do not generate dark variants, and remove them from any shadcn component that ships with them.
- Modern evergreen Chromium and Firefox on desktop. The **specific minimum browser versions, and whether Safari on macOS is in scope, are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (D18 item 54).
- Gotenberg runs server-side. The proposal template is rendered by headless Chromium there, so its CSS support is Chromium's, independent of what staff browse with.
- Every screen must print. Any screen can be printed and put in a folder, so a print stylesheet is part of the screen, not an extra. `03-WINDOW-TYPES.md` owns the print specification and is authoritative for it, per D16.

---

## 8. Definition of done

A feature is done when all of the following are true. Not most.

**Design conformance**

- Every colour references a token name. No raw hex anywhere outside the token file.
- Zero border radius. Two border weights only: 2px `--c-border-container` for containers, 1px `--c-border-item` for list items. No third weight. `--c-border-field` is the rule between form field rows and `--c-border-control` is the control edge, and neither is a substitute for the other.
- Every heading is a filled band, not bold text in whitespace.
- No shadow except `--shadow-window` on the record window and the confirm. The dropdown panel has a border and no shadow.
- Focus is `--focus-ring` at `--focus-offset` on every interactive element, per D4. No ring-offset halo, no glow, no colour-change-only focus.
- Fixed heights match the token file exactly. Rows 44px. Buttons 34px. Inputs 30px. Column headers 30px. Group headers 26px. Section strips 32px. Pagination 38px.
- Nothing on the left edge. No sidebar, no icon strip, no drawer, no hamburger, no FAB.
- No booking-stage colour coding. No chips, pills, badges or tags. No zebra striping. No vertical column rules. No animation. No toast component in the dependency tree.
- Only the five surfaces of D1 exist. No new surface has been introduced under another name.

**Correctness**

- All date arithmetic is server-side and goes through the time module. No Luxon import outside `src/lib/datetime/`, and no date arithmetic there either.
- Deadlines are anchored to events, stored as UTC instant plus IANA zone, and recompute when the anchor moves.
- Both deadlines are present: immutable supplier number, and derived action-by time. Overdue fires on the supplier number, never on the internal buffer.
- Every intake field has an explicit `Client has not provided this yet` value, recorded rather than blank. **No new mandatory field ships without a written justification in the PR**, because mandatory fields cause fabricated data. Offshore staff under volume pressure will type a placeholder passport number rather than fail to save.
- Every price, deadline, approval, override, message and ticket action has an owner, timestamp, status and history.
- Financial records are append-only. A correction names what it corrects. Voided records stay visible and searchable, marked with the word `VOID` as text.
- Communication log entries are not written to the change history, and change history entries are not written to the communication log. They are different records.
- Passport data, payment data and Sabre credentials are in controlled secret storage. Never in documents, spreadsheets, AI prompts or user-visible configuration.
- One lifecycle per record. No screen shows two steppers. The booking lifecycle has seven stages and the client onboarding lifecycle is separate, per D9. "Blocked" is a flag with a mandatory reason and follow-up date, never a stage.
- Proposal generation produced both artifacts, stamped provenance on the document, and stored the bytes.

**Quality**

- Tests exist for anything in section 5 that this feature touches.
- No direct `useFieldArray`, `watch`, `@tanstack/react-table` or `luxon` imports outside their wrapper folders (`src/lib/forms/`, `src/lib/table/`, `src/lib/datetime/`).
- No `.transform()` in a form schema. Transform happens at the submit boundary, and provenance is attached there.
- Keyboard path verified end to end. For anything touching the record window: focus trap, Escape, focus return to the originating row.
- Screen prints legibly.
- TypeScript strict, no new `any`, no new casts to silence the resolver.

**Pull request contents**

1. What changed and why, in plain language. One paragraph.
2. Screenshots of every new or changed screen state, **at 1300px minimum width**, which is the minimum viewport and the width at which the record window is fully visible. Include the empty state, the loaded state, and the urgent state where urgency applies.
3. A design-system conformance line naming any place the implementation departs from `01-CONSULATE-DESIGN-SYSTEM.md` or `00-DECISIONS.md`, with the reason. Expected content: "none".
4. Test list: what was tested and what deliberately was not.
5. Any new mandatory field, named, with its justification.
6. Any new value that was not in the token file, flagged explicitly with the canonical unspecified string below rather than quietly chosen.
7. Any wrapper boundary crossed (a new direct import of Luxon, TanStack, React Hook Form internals), named and justified, or the PR does not merge.
8. Migration and rollback note where the change touches financial records, deadlines or stored artifacts.

**Review rejections, no discussion needed:** a raw hex, a border radius, a second shadow, a coloured stage, a rounded avatar, a badge or chip component, a toast, a naive local timestamp, a new mandatory field without justification, a direct Luxon import in a component, a component library that arrives as an opaque import, shadcn's default focus ring, a screenshot below 1300px, emoji.

### Open items, and the one string that flags them

Anything this document leaves open is an **open item, not a defect and not a gap for you to close**. Every open item in the package is tracked in `00-DECISIONS.md` **D18, the open items register**, which numbers 55 of them. The two that this document still carries are the minimum browser versions and Safari scope (D18 item 54). The `VOID` word is no longer among them: it is settled as a plain word in `--c-ink-2`.

When you must reference something unspecified, in this file, in a code comment, in a commit message, in a pull request or in a reply to a human, write the exact string:

```
NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
```

That is the **single canonical unspecified string for the whole package**, and there is no second one. Append a colon and the thing that is missing where that helps, and cite the D18 item number in parentheses where one exists, for example `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the disabled appearance of any control (D18 item 1)`. A variant such as "ask before building", "raise with the design owner before building", "TBD" or "TODO" is a defect, because these flags are searched for as a literal string and a variant does not turn up in the search.

**Hitting one means stop and ask, not invent.** Do not pick a plausible value, do not ship a placeholder you intend to replace, and do not bury the uncertainty in a code comment. Build the part that does not depend on the open item, name the item and its D18 number in your response and in the pull request, get the decision recorded in `00-DECISIONS.md` against that number, and then build the rest. The three open items blocking the most work are **D18 item 17**, the page-header icon tile glyph set, **D18 item 30**, the canonical pricing group list, and **D18 item 31**, which instant triggers overdue.
