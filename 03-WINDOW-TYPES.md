# 03-WINDOW-TYPES.md

## Every surface in CONSULATE

This file defines every window, dialog, panel and menu that exists in the product, plus the feedback states they carry and the print specification.

**The surface taxonomy in this file is not this file's own.** It is the one settled in `00-DECISIONS.md` D1: **five surfaces, S1 to S5, and no more, ever.** An earlier draft of this file claimed seven surface types and invented a read-only viewer, a help window, a settings surface and an explainer panel as separate things. All of those are S2 at a size. That collapse is the largest correction in this revision and it removes most of the contradictions that were audited against this file.

### Authority

1. `assets/tokens.css`, every colour, size and spacing value
2. `01-CONSULATE-DESIGN-SYSTEM.md`, the locked design language
3. `00-DECISIONS.md`, the arbiter, which resolves everything 01 left open
4. **this file**, alongside `02-COMPONENT-LIBRARY.md` and `04-SCREEN-INVENTORY.md`

Base geometry, colour tokens, type scale and fixed heights are defined in `assets/tokens.css` and `01-CONSULATE-DESIGN-SYSTEM.md`. This file does not restate them. It adds only what is new: which surface, when, and what is inside it.

**One thing this file owns outright.** `00-DECISIONS.md` D16 designates `03-WINDOW-TYPES.md` as the authoritative owner of the **print specification**. Section 10 below is that specification. Any file saying print is unspecified is a defect against D16. Report it, do not follow it.

### Two rules from the design system that govern everything below

- **Zero corner radius, everywhere, forever.** `--radius` is `0`. This applies to windows, confirms, panels, menus, message bands, initials squares and buttons without exception.
- **Urgency is a sentence, not a colour block.** No surface below turns a fill red, green or amber. `--c-urgent` and `--c-overdue` are ink on words.

### A sentence this file used to contain and no longer does

`00-DECISIONS.md` D17 lists phrases every file must stop using. The one that belonged to this file was **"the only shadowed thing on screen"**. It is gone. Shadow is settled in section 1.4 below: `--shadow-window` belongs to **S2 and S3**, and to nothing else.

---

## 1. THE FIVE SURFACES

### 1.1 The list, settled by `00-DECISIONS.md` D1

| # | Surface | What it is | Sits on |
|---|---|---|---|
| **S1** | **The box** | One white rectangle, 2px `--c-border-container`, on the `--c-canvas` field. Holds all list and detail content. | The page |
| **S2** | **The window** | A modal rectangle over a dimmed page. 2px `--c-crown` border, a 40px `--c-crown` title bar, `--shadow-window`. | Over S1 |
| **S3** | **The confirm** | A small modal for a yes/no decision only. Same construction as S2, but no tab strip and no scrolling body. | Over S1 or S2 |
| **S4** | **The panel** | A dropdown menu. White, 1px `--c-border-control`, **no shadow**, no radius. | Over anything |
| **S5** | **The workspace** | A full page with no box, for tasks that need the whole viewport: WhatsApp intake, the proposal builder, exchange and refund flows. Crown and page header remain. | The page |

**There is no read-only viewer surface, no help window surface, no settings surface and no toast.** Those are all S2 at a different size with different content.

### 1.2 The three sizes of S2, and no others

| Size | Dimensions | Position | Used for |
|---|---|---|---|
| `large` | 1120 × 760 | x=160, y=70 | Record windows |
| `medium` | 820 × 620 | centred, y=90 | Document preview, message viewer, audit entry, help, the deadline explainer |
| `small` | 520 × auto, max 420 tall | centred, y=200 | S3 confirms only |

### 1.3 Stacking

**Only one modal exists at a time.** An S3 confirm may open over an S2 window. Nothing else stacks. If a flow appears to need three layers, it is a workspace (S5), not a stack.

This is the resolution of the old rule that said the read-only viewer "may open on top of a record window". A document preview is now an S2 `medium`, and S2 does not stack on S2. To check a passport while filling in a traveller, open the document from the Documents tab; the record window is behind it in the same rectangle it always occupies and returns untouched, still dirty if it was dirty, when the preview closes.

> **Open item.** Whether an S2 `medium` preview may sit over an S2 `large` record window, given that D1 permits only S3 over S2, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** The safe build until then is: the preview replaces the record window's body content in place, or the record window closes first under the unsaved-changes rule in 4.7.

### 1.4 Shadow

`--shadow-window` (`0 6px 24px rgba(0,0,0,0.35)`) is defined once in `assets/tokens.css`. Its **value** comes from there. Its **scope of use** is settled by `00-DECISIONS.md` D1 and D17:

| Surface | Shadow |
|---|---|
| S1 the box | none |
| S2 the window | `--shadow-window` |
| S3 the confirm | `--shadow-window` |
| S4 the panel | **none.** A panel is not elevated, it is on top. Depth is a 1px `--c-border-control` border against a solid `--c-surface` fill. |
| S5 the workspace | none |

There is no elevation system, no second shadow, and no hover shadow anywhere.

### 1.5 Backdrop

S2 and S3 both dim the page with `rgba(28,31,27,0.42)`, **no blur**. The list stays legible around the edges, which is why this product needs no record pager, no next and previous arrows and no breadcrumb inside a window.

S4 has no backdrop. S5 has no backdrop, because it is a page.

### 1.6 Focus

`00-DECISIONS.md` D4 applies to every interactive element on every surface below without exception: `--focus-ring` (2px solid `--c-crown`) at `--focus-offset` (1px). Buttons, inputs, selects, checkboxes, radios, links, tabs, rows, menu items, and the window close button. Never a glow, never a colour change, never a radius.

### 1.7 Viewport

Minimum viewport is **1300px** (160 + 1120 + a 20px gutter), per `00-DECISIONS.md` D11. Below that the page scrolls horizontally. Desktop only. Any file saying 1180px is a defect.

Chrome is built as a flex column, never as absolute y offsets. The crown is 84px, the page header is 64px, and the 38px band is present or absent depending on the screen (D11).

---

## 2. THE DECISION TABLE

Read top to bottom and stop at the first row that matches. There is exactly one right answer.

| What the user is doing | Surface | Why not the others |
|---|---|---|
| Reading a list, a queue, a report, or any tabular content | **S1**, the box | Content never sits directly on the canvas. |
| Opening a record to read or edit it: request, client, traveller, booking, ticket, quote | **S2 `large`**, the record window | The list must survive. A full page destroys it. |
| Creating a new record of any type | **S2 `large`**, opened empty, title bar reads `NEW REQUEST` | Same window, same tabs, same footer. There is no separate "create" surface. |
| Looking at something without editing it: document preview, sent message, historical version, audit or change-history entry, proposal preview | **S2 `medium`** | It is not a different surface. It is the window at a smaller size with a read-only footer, see 4.9. |
| Reading help, or first-run guidance content | **S2 `medium`**, reached from the crown `Help` utility link | There is no icon rail to hang a help button on. |
| Asking "why does this record have this deadline" | **S2 `medium`**, the deadline explainer, see 4.11 | The arithmetic is content, not a form. No Save. |
| Confirming one of the actions named in `00-DECISIONS.md` D3 | **S3**, the confirm | Never a toast with Undo. Financial records are append-only, so there is nothing to undo. |
| Any action not named in D3 | **Nothing. Just do it.** | Unnecessary confirmations train the reflex that defeats the necessary ones. |
| Choosing among a fixed, known set of destinations, views or actions | **S4**, a panel: the `More` menu, the View picker, the row context menu, a button dropdown | Panels never carry more than a list of choices. If it needs a form, it is S2 or S3. |
| A task that needs the whole viewport: WhatsApp intake, the proposal builder, an exchange, a refund | **S5**, the workspace | It has no box, because the content is not a list of records. |
| Changing something that affects everyone: users, fees, templates, deadline rules, Sabre PCCs, QuickBooks mapping | **S1 in the Admin area**, section 8 | Admin is not a surface. It is the ordinary box under a section band, per D10. |
| Telling the user what happened, or that something is wrong, empty, loading or missing | **The feedback states**, section 9 | Never a floating toast that auto-dismisses while carrying information the user needs. |
| Putting a screen in a folder | **The print stylesheet**, section 10 | Not a separate "print view" screen. The same DOM, re-styled. |

### Surfaces that do NOT exist, and must not be added

| Not allowed | Use instead |
|---|---|
| A sixth surface of any kind | One of the five |
| A separate read-only viewer surface | S2 `medium` with a `[Close]` footer |
| A separate help window surface | S2 `medium` |
| A separate settings surface | S1, the box, under the Admin section band (D10) |
| A separate explainer panel surface | S2 `medium` |
| Toast, snackbar, or anything that auto-dismisses | The page message band, 9.1 |
| Side panel, slide-over, drawer | S2 |
| Inline row expansion, accordion row | S2 |
| A second S2 stacked on an S2 | Close the first. Only S3 may sit on S2. |
| A new browser tab for a record | S2. `Open in full page` exists and renders the record as S5 in the same tab, see 4.8. |
| Wizard with a multi-step progress stepper | S2 tabs, or a section inside the window |
| Floating action button | Page header buttons |
| Command palette | Object tabs and the View picker |
| A user menu on the crown | Nothing. `M. Roth` is a label, `Sign Out` is already a utility link (D17). |
| A sortable or resizable column header | The Sort select in the control strip (D17) |
| Tooltip carrying information the user needs to act on | Put the words in the row or in the field help text |
| Popover card on hover | Nothing. Open the record. |
| A permission-denied state | Nothing. There isn't one (D6). See 9.6. |

---

## 3. S1, THE BOX

Stated here only for completeness of the five, because everything else in this file sits over it or replaces it. Its full anatomy belongs to `02-COMPONENT-LIBRARY.md`.

One white rectangle, `--c-surface`, 2px `--c-border-container`, on the `--c-canvas` field. Contents run top to bottom: section header strip (32px, `--c-band-header`), control strip (44px, carrying the View select and the Sort select), column header row (30px, `--c-band-service`), group headers and data rows interleaved (26px and 44px), pagination (38px). No zebra striping, no vertical column rules, no elevation.

The reference grid is the Requests queue list and its column widths are fixed by `00-DECISIONS.md` D13. The Fare column is 100px, right-aligned and tabular. The Deadline column is 340px and is wide because the sentence is the design.

Never put content directly on the canvas. The only screens without a box are S5 workspaces.

---

## 4. S2, THE WINDOW

The main event. Every record in the product opens here, and so does everything the user only reads.

### 4.1 When to use

- Double-click on a data row.
- Single click on the underlined Request # link, or Client #, Ticket #, PNR link.
- Any `New ...` primary button in the page header.
- Any `View`, `Preview` or `Why this date` link on a row, which opens the `medium` size.

### 4.2 When NOT to use

- Never for a confirmation. That is S3.
- Never opened on top of another S2. If a window is open and the user activates a link to a different record, the current window closes first, subject to the unsaved-changes rule in 4.7.
- Never for a task that needs the whole viewport. That is S5.
- Never draggable, resizable, minimisable or stackable. See 4.12.

### 4.3 Geometry, `large`

```
Backdrop      rgba(28,31,27,0.42), NO blur
Window        1120 x 760, at x=160, y=70
Radius        0
Border        2px --c-crown
Shadow        --shadow-window   (S2 and S3 only, D1/D17)

  40px  TITLE BAR        --c-crown
  34px  WINDOW TAB STRIP --c-band-header, 1px bottom --c-border-container
 634px  BODY             --c-surface, --pad-window inset, THE ONLY SCROLLING REGION
  52px  FOOTER           --c-surface, 1px top --c-border-item
```

The footer height is **52px, settled by `00-DECISIONS.md` D2**. It is no longer an open question, and the four bands sum exactly: 40 + 34 + 52 = 126, leaving 634 for the body.

Note that D2 also settles the footer's top rule at **1px `--c-border-item`**, not 2px. A footer separates items in a stack, it does not enclose a container.

```
+--------------------------------------------------------------------------+ 2px --c-crown
| REQUEST R-10482 — KAPLAN, 5 PASSENGERS      Open in full page      [ X ] | 40  --c-crown
+--------------------------------------------------------------------------+
| Details | Itinerary | Fares & Quotes | Payments (2) | Documents (5) | ... | 34  --c-band-header
+--------------------------------------------------------------------------+
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | SECTION NAME                                                       |  | 32 --c-band-header
|  +--------------------------------------------------------------------+  |    ink --c-ink-on-band
|  |  label            value            label            value          |  |
|  +--------------------------------------------------------------------+  | 2px --c-border-container
|                        (16px gap)                                        | 634
|  +--------------------------------------------------------------------+  |
|  | NEXT SECTION                                                       |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
+--------------------------------------------------------------------------+ 1px --c-border-item
|                                        [ Save ]  [ Save & Close ]        | 52
+--------------------------------------------------------------------------+
```

### 4.4 Body sections

Per `00-DECISIONS.md` D2: the body is the only scrolling region, inset `--pad-window` (20px). Content is a stack of bordered sections, 2px `--c-border-container`, 16px vertical gaps, each opening with a `--c-band-header` header strip 32px tall.

**The header strip label is 12px/700 uppercase, 0.7px tracking, in `--c-ink-on-band`.** That token exists in `assets/tokens.css` and is described there as the section header strip label ink. An earlier draft of this file specified `--c-crown-border` here, which is a different colour and would have shipped the wrong ink on the most-repeated band in the product. Any file naming `--c-ink-heading-on-band` is naming a token that does not exist, which D17 lists as a defect.

Section content width at `large` is 1080px, that is 1120 less the 2px borders and the 20px insets. **DERIVED** from D2's 20px body inset and the D1 window width.

### 4.5 Title bar

- Height 40px, fill `--c-crown`.
- Left, 16px inset: the record title, 15px/700, `--c-ink-invert`, 0.3px tracking. Format for a request: `OBJECT ID — FAMILY NAME, PASSENGER COUNT`. For other objects the same shape: type, identifier, then the human handle.
- Right: an underlined 12px `--c-crown-ink` link `Open in full page`, **on the `large` size only**, then a 26×26 square `✕` button, hover fill `--c-crown-border`.
- The bar is not draggable. No drag handle, no resize grip, no minimise, no maximise, no stacking.

### 4.6 Window tabs

Only the `large` size has a tab strip. `medium` and `small` have none (D2).

Strip is 34px, `--c-band-header`, 1px bottom `--c-border-container`. Tabs 13px/600, 18px horizontal padding. Active tab: `--c-surface` fill, `--c-crown` ink at 700, 1px left and right borders `--c-border-container` overlapping the strip's bottom border. Labels carry a plain count in parentheses when they hold records, and **a count of zero prints as nothing at all**, matching the queue tab rule in `01-CONSULATE-DESIGN-SYSTEM.md`.

**The cap is EIGHT tabs**, settled by `00-DECISIONS.md` D2. Six is not the cap. Tabs never scroll and never overflow, because eight of them fit. Requests have six. Clients have seven. **Both are legal.** Any statement that a seventh tab is forbidden is a defect, and this file previously carried that defect.

Window tabs exist only inside S2 `large`. They are tabs on a dialog, not places in the app, and they never appear anywhere else. They do not appear on S5, including when the same record is rendered as S5 by `Open in full page`.

#### The Request record's six tabs

`Details` · `Itinerary` · `Fares & Quotes` · `Payments` · `Documents` · `History`

Per-object tab sets and their per-screen section lists are owned by `04-SCREEN-INVENTORY.md`. The anatomy below describes what these sections are and how they behave, not which screen carries which.

> **Open item.** `04-SCREEN-INVENTORY.md` gives the Request Details tab a `CLIENT` section that is not named below, and this file names an `INTAKE` section that is not in that inventory. Which list is canonical is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Do not silently drop either section; the household model hangs off the client link.

#### Details, the default tab, always

Sections top to bottom:

1. `REQUEST`. Request number, client account link, requesting traveller, date opened, owning agent, pricing group, and booking stage as a plain word in `--c-ink`. **No colour on stage.** There are **seven** stages, per `00-DECISIONS.md` D9: `Accepted` · `Payment pending` · `Paid` · `Ready to issue` · `Sent to ticketing` · `Ticket issued` · `Confirmation sent`. Any file saying eight stages is a defect (D17). The client onboarding machine is a **separate** lifecycle belonging to the client record, with six states, and one screen never shows two steppers.
2. `BLOCKED`. Appears only when the blocked flag is set. Shows the mandatory reason and the follow-up date. Blocked is a flag, never a stage, so it never appears in the stage field.
3. `TRAVELLERS`. One 44px row per traveller: legal passport name, DOB, passenger type, passport status. Partial completion prints as words, `Passports on file 3/5`.
4. `DEADLINES`. One row per obligation. See 4.6.1 immediately below, because the two-deadline rule changed.
5. `TRIP SUMMARY`. Origin, destination, dates, cabin, carrier preference.
6. `INTAKE`. Every intake field with its explicit `Client has not provided this yet` state visible as a value, not as a blank, per `00-DECISIONS.md` D5. No field on this tab is mandatory to save. Missing-information reports read that value and never count blanks. This is the mechanism that stops offshore staff typing a fake passport number under time pressure, and D5 says it is not optional.

##### 4.6.1 The DEADLINES section and the two-deadline split

Settled by `00-DECISIONS.md` D8.

- There are exactly **four** deadline types and they are **never abbreviated**: `Ticketing limit` · `Hold expires` · `Follow up` · `Check-in opens`. There is no fifth type. Any document naming `Airline limit`, `Issue by`, `TTL` or similar is a defect (D17).
- `Follow up` and `Check-in opens` never go red at any time, because they are not money.
- **The grid cell shows our derived action-by time as the sentence.** The supplier's stated number does **not** appear in the grid cell. It appears here, in this section, as a separate labelled field reading `Stated by supplier`, and in the deadline explainer.
- Sizes: calm 14px/400 `--c-ink`. Inside four hours 15px/700 `--c-urgent`. Overdue **15px/700** `--c-overdue`, the same size as urgent, not larger.
- Grammar: round down to whole units and pluralise. `3 hours left`, `1 hour left`, `48 minutes left`. Under one hour use minutes. Under one minute, `less than a minute left`. Overdue reads `expired 11:40 AM, 24 minutes ago`, and past 24 hours `expired yesterday 11:40 AM`, then `expired 28 July`.
- Each row carries an underlined `Why this date` link opening the deadline explainer, 4.11.

> **Open item.** Which instant triggers the overdue state, the supplier's stated time or our derived action-by time, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D8 settles the strings and the sizes but not the trigger, and the two answers differ by hours on every held PNR. All the arithmetic itself lives server-side under `server/deadlines/` per D15, never in the browser.

#### Itinerary

The proposal and itinerary builder that replaces Yaalago. Sections: `SEGMENTS` (one row per flight segment: carrier, flight number, RBD, times with the IANA zone the time is quoted in), `SEATING`, `MEALS AND SSRs`, `PROPOSAL` (the client-facing itinerary document being assembled, with a `Preview` button opening S2 `medium`).

The full proposal builder, as distinct from this tab's summary of it, is an **S5 workspace** per D1.

#### Fares & Quotes

Sections: `QUOTES` (one row per quote, with the verified-at stamp and the fare), `PRICING GROUP AND BOOKING FEE` (the effective-dated per-passenger fee that applied when this request was created, plus an underlined `See fee history` link), `MARKUP REVIEW`, `DECLINED OFFERS`.

An aged quote states its age in words in the row rather than changing colour.

**Numerals.** Per `00-DECISIONS.md` D7, `font-variant-numeric: tabular-nums` applies to **any right-aligned numeric column and any currency value**, which in practice means fares, fees, totals, balances and pagination counts. So the Fare column here is tabular, and so is the fee. The earlier "exactly two places" rule was too tight and produced ragged money columns; D17 lists it as a phrase to stop using. **Left-aligned text, dates, times and deadline sentences stay proportional**, which means the verified-at stamp is proportional, not tabular. There is still no monospace font anywhere in the product.

#### Payments

Sections: `INVOICE REFERENCE` (QuickBooks Online invoice number and link), `PAYMENTS RECEIVED`, `ADJUSTMENTS` (append-only; voided records stay visible and are marked void with a plain word in `--c-ink-2`, never a coloured fill, never a pill, because there are no chips or badges in this product), `REFUNDS`. Currency columns are right-aligned and tabular per D7.

#### Documents

One section, `DOCUMENTS`, listing document versions. Documents version rather than overwrite, so a renewed passport is a new row, not an edit. Each row: document type, number, issued, expires, version, uploaded by, uploaded at, and an underlined `View` link opening S2 `medium`. Superseded versions stay listed and stay openable, because the old passport book may still carry a valid visa and the old number may be printed on an issued ticket.

Passport validity is never rendered as a red date. It is rendered as the sentence produced by the rule engine, for example `Valid for this trip. Thailand requires six months beyond entry, expires 14 months after entry date.`

#### History

Two sections, never merged, because they are two different records:

1. `COMMUNICATION LOG`. What was said to whom, when, on which channel: WhatsApp, phone, email. `We told Ruth on the phone on 28 July and she approved it.` Each entry opens in S2 `medium`.
2. `CHANGE HISTORY`. Field-level audit. `Price changed from 4,200 to 4,650`, with owner and timestamp. Each entry opens in S2 `medium`.

### 4.7 Footer, saving, and unsaved changes

Footer is 52px, `--c-surface`, 1px top `--c-border-item`, 20px inset, buttons right-aligned with a 10px gap. Button geometry is the standard button: `--h-button` (34px) tall, 0 radius, 16px horizontal padding.

**Button order is settled by `00-DECISIONS.md` D2: `[Save]` secondary first, then `[Save & Close]` primary.**

- `Save`. Secondary style. Writes, stays open, prints a success message band (9.1).
- `Save & Close`. Primary style, `--c-crown` fill, `--c-ink-invert`, 14px/600. Writes and closes.

This is inherited from Dynamics. Do not replace it with autosave.

**Unsaved changes.** Attempting to close a dirty window by `✕`, by backdrop click, or by `Esc` raises an S3 confirm. Its copy and its buttons are settled by D2 and D3:

```
Body:    Discard your changes to this request?
Buttons: [ Discard ] destructive   [ Keep editing ] secondary
```

`Discard` is the destructive button, which per D3 is a **secondary button with `--c-urgent` label text and a 1px `--c-urgent` border**. It is not a filled red button, because there is no filled red button anywhere in this product.

Two buttons, not three. The earlier three-button version of this dialog (`Save & Close`, `Discard Changes`, `Cancel`) had two affirmative actions and no defined primary, which no surface in this product permits.

Switching between window tabs never discards anything. All tabs belong to one form and one save.

Backdrop click on a **clean** window closes it. `Esc` behaves identically to `✕`.

### 4.8 Open in full page

`Open in full page` routes to the same content rendered as **S5**, per D2. It is the escape hatch for printing a record, for reading a long history, and for two-monitor work.

- The window tab strip does **not** appear on S5. Sections stack down the page instead, in tab order.
- It replaces the current page. It does not open a new browser tab.
- Returning is by browser Back, which restores the list with the window closed.

### 4.9 S2 `medium`, the read-only size

820 × 620, horizontally centred, y=90. **Same construction as any S2**: 2px `--c-crown` border, 40px `--c-crown` title bar with `--c-ink-invert` title, `--shadow-window`, the same backdrop, the same 26×26 `✕`.

An earlier draft gave this size a 2px `--c-border-container` border and a `--c-band-header` title bar, and called that difference "the tell" that nothing is editable. **That is deleted.** D1 collapses the read-only viewer into S2, and S2 has one construction. The read-only signal is the footer, which carries a single `[Close]` secondary button and no Save, per D2.

**Used for:** document preview (passport scan, PDF itinerary, invoice), a sent message, a historical document version, a single audit or change-history entry, a communication log entry, a proposal preview, help, and the deadline explainer.

**Not used for:** anything the user can change. If there is one editable field, it is `large`.

```
+----------------------------------------------------------+ 2px --c-crown
| PASSPORT — KAPLAN / SARAH MRS — VERSION 2          [ X ] | 40 --c-crown, 15px/700
+----------------------------------------------------------+    --c-ink-invert
|  +----------------------------------------------------+  |
|  | DOCUMENT                                           |  | 32 --c-band-header
|  +----------------------------------------------------+  |    ink --c-ink-on-band
|  | Issued 14 Mar 2024        Expires 13 Mar 2034      |  |
|  | Uploaded by M. Roth, 2 Aug 2026 9:41 AM            |  |
|  +----------------------------------------------------+  | 2px --c-border-container
|                                                          |
|                   [ document render ]                    | body, the only
|                                                          | scrolling region
+----------------------------------------------------------+ 1px --c-border-item
|  Download   Print         Version 2 of 3      [ Close ]  | 52
+----------------------------------------------------------+
```

- The who-and-when metadata is the **first bordered section of the body**, not a separate 32px strip. **DERIVED** from D2, which states that the body of an S2 is a stack of bordered sections each with a `--c-band-header` header strip. There is no third band type inside a window.
- Body height is 528px, that is 620 less the 40px title bar and the 52px footer. **DERIVED** from D1 and D2.
- Body scrolls. For versioned documents, `Version 2 of 3` sits in the footer with underlined `Previous` and `Next` links stepping through versions in place.
- **No Save, ever.** A read-only window with a Save button is a bug report.
- `Esc`, backdrop click and `✕` all close.

### 4.10 Help and first-run guidance, as S2 `medium`

Instructional surfaces stay. They are not a separate surface type; they are S2 `medium` with instructional content.

**Help.** There is no icon rail and no question-mark button floating anywhere. Help is reached only from the crown utility link `Help`, which is present on every screen at the same pixel. Help content is written in the same sections-in-boxes structure as a record body, so it looks like the product rather than like a documentation site.

```
+------------------------------------------------------------------+ 2px --c-crown
| HELP — HOW A TICKETING LIMIT IS CALCULATED                [ X ]  | 40 --c-crown
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | HOW A TICKETING LIMIT IS CALCULATED                        |  | 32 --c-band-header
|  +------------------------------------------------------------+  |
|  | body copy, 14px/400 --c-ink, max 640px measure             |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+ 1px --c-border-item
|                                                     [ Close ]    | 52
+------------------------------------------------------------------+
```

Note what is **not** here: a topic tab strip. `medium` has no tab strip (D2), and window tabs exist only inside `large`. Topic navigation inside help is therefore a list of sections in the body, one topic per window, with the topic named in the title bar.

> **Open items for help.** The help topic list and its content owners are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, as is **search inside help**. Help also has no screen ID or build phase in `04-SCREEN-INVENTORY.md`; that is a gap in that file, raise it there.

**Context help.** Where a screen has a help topic, the page header's secondary button row may carry a `Help` button that opens the relevant help window. It is a button in the header, never a floating icon.

**First-run guidance** is a **page message band** (9.1), not an overlay, not a coach mark, not a spotlight tour, not a tooltip sequence. It appears at the top of the page on a user's first sessions and carries one sentence plus an underlined link into help. It has an explicit `Dismiss` link and never auto-dismisses. No modal welcome dialog, no product tour.

> **Open item.** The number of sessions first-run guidance persists for is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

### 4.11 The deadline explainer, as S2 `medium`

The single most important instructional surface, and it is listed by name in D1 as a `medium` use. Opened by the underlined `Why this date` link on any deadline row: in the record window Deadlines section, in the list grid deadline cell, and in Admin when previewing a deadline rule.

It must show the arithmetic **written out with named terms**. Not a formula, not a diagram, not a timeline graphic. Sentences and a table.

```
+--------------------------------------------------------------------+ 2px --c-crown
| WHY THIS DEADLINE — R-10482, TICKETING LIMIT                [ X ]  | 40 --c-crown
+--------------------------------------------------------------------+
|  +--------------------------------------------------------------+  |
|  | STATED BY SUPPLIER                                           |  | 32 --c-band-header
|  +--------------------------------------------------------------+  |
|  | EL AL stated the ticketing limit as                          |  |
|  | 10 Aug 2026, 6:00 PM Asia/Jerusalem.                         |  |
|  | Stored exactly as given. This value never changes.           |  |
|  | It is not shown in the grid cell, only here.                 |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | OUR ACTION-BY TIME                                           |  |
|  +--------------------------------------------------------------+  |
|  | Stated by supplier       10 Aug 2026, 6:00 PM Asia/Jerusalem |  |
|  | minus client payment time      24 hours   (rule: standard)   |  |
|  | minus issuance time             2 hours   (rule: EL AL)      |  |
|  | = raw action-by time      9 Aug 2026, 4:00 PM Asia/Jerusalem |  |
|  | pulled into office hours   9 Aug 2026, 4:00 PM               |  |
|  |   9 August 2026 is a Sunday, a working day.                  |  |
|  |   No change needed.                                          |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | ANCHOR                                                       |  |
|  +--------------------------------------------------------------+  |
|  | This deadline is anchored to the hold on PNR ABCDEF.         |  |
|  | If the hold moves, this deadline recomputes. It was not      |  |
|  | typed in by hand.                                            |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | PARTIAL COMPLETION                                           |  |
|  +--------------------------------------------------------------+  |
|  | Passports on file 3 of 5. The countdown runs from the        |  |
|  | earliest unsatisfied passenger, GOLDMAN / DAVID MR.          |  |
|  +--------------------------------------------------------------+  |
+--------------------------------------------------------------------+ 1px --c-border-item
|                                                     [ Close ]      | 52
+--------------------------------------------------------------------+
```

Rules for this content:

- The first section is titled with D8's exact field name, `Stated by supplier`, because it is the same value the Deadlines section shows and it must be recognisable as the same thing.
- Every subtraction is a labelled line naming the rule that supplied the number, with an underlined link to that rule in Admin, Deadline Rules.
- The office-hours pull always prints a sentence naming the calendar decision, including Friday half days, Shabbat and moving holidays. If a deadline was pulled from a Friday afternoon back to Thursday, the sentence says so in words.
- The IANA zone name is printed on every instant, always the zone the deadline was quoted in.
- `PARTIAL COMPLETION` appears only when the obligation is partial, and it names the specific person driving the countdown.
- Right-aligned durations and amounts are tabular per D7. The date and time sentences are proportional.
- No Save. No editing. `Close` only.
- The arithmetic itself is computed under `server/deadlines/` per D15. The explainer renders what the server returns; it never recomputes anything in the browser.

> **Open items.** The deadline explainer has no screen ID or build phase in `04-SCREEN-INVENTORY.md`, and the deep-link target for a Deadline Rules row is not defined there. Both are gaps in that file. The `Why this date` link is also absent from that file's Deadlines descriptions and from the grid deadline cell description in `02-COMPONENT-LIBRARY.md`. Raise all three.

### 4.12 Why S2 does not drag, resize, minimise or stack

Stated once so nobody reopens it.

- **One window at a time, always in the same rectangle**, means muscle memory. The `✕` is at the same pixel on every record for every user forever.
- **The list is never destroyed and stays legible around the edges.** That visible list is why this concept needs no record pager, no next and previous arrows and no breadcrumb.
- Dragging implies more than one window matters at once. It does not. Two open records means two half-finished edits and a save-order problem.
- Resizing means the body length varies, which means section layout varies, which means the developer writes responsive rules for a 1120px fixed surface for no benefit.
- Minimising creates a hidden state with unsaved data in it.

---

## 5. S3, THE CONFIRM

### 5.1 Geometry

Settled by `00-DECISIONS.md` D1 and D2. This is no longer a proposal and no longer an open gap.

```
Backdrop      rgba(28,31,27,0.42), NO blur
Width         520px
Height        auto, driven by body text, maximum 420px
Position      horizontally centred, y=200
Radius        0
Border        2px --c-crown
Shadow        --shadow-window
Tab strip     none
Body          does not scroll
```

**The confirm carries the shadow.** D1 gives S3 the same construction as S2, and D17 confirms that S2 and S3 are the two shadowed surfaces. An earlier draft of this file said the confirm has no shadow, and another file in the package said the confirm is "the only shadowed thing on screen". Both are wrong for the same reason: shadow belongs to S2 **and** S3, and to nothing else.

Title bar 40px `--c-crown`, 15px/700 `--c-ink-invert`, with the same 26×26 square `✕`. It names the **action and the object**, never the word "Confirm" alone.

Footer height is 52px with a 1px top `--c-border-item`, 20px inset, 10px button gap. **DERIVED** from D1 ("same construction as S2") plus D2's footer specification.

### 5.2 Anatomy

```
+------------------------------------------------------+ 2px --c-crown
| VOID TICKET 114-2938471023                      [ X ]| 40  --c-crown, 15px/700
+------------------------------------------------------+     --c-ink-invert
|                                                      |
|  Voiding this ticket cannot be reversed. The void    |  20px inset
|  is reported to EL AL and the commission is          |  14px/400 --c-ink
|  recalled. The ticket stays visible and searchable,  |
|  marked void.                                        |
|                                                      |
|  Ticket        114-2938471023                        |  label 13px/400 --c-ink-2
|  Passenger     KAPLAN / SARAH MRS                    |  value 14px/400 --c-ink
|  Issued        8 Aug 2026, 11:04 AM                  |
|                                                      |
|  Type [WORD] to confirm                              |  13px/600 --c-ink
|  +--------------------------------+                  |  --h-input (30px),
|  |                                |                  |  1px --c-border-control
|  +--------------------------------+                  |
|                                                      |
+------------------------------------------------------+ 1px --c-border-item
|                    [ Keep ticket ]  [ Void ticket ]  | 52
+------------------------------------------------------+
                       secondary        destructive:
                                        secondary button,
                                        --c-urgent label,
                                        1px --c-urgent border
```

- **Body**, 20px inset, 14px/400 `--c-ink`. It states the consequence in a sentence, not a question. `This cannot be reversed` is a fact, not a warning colour. No warning icon, no coloured band, no red panel.
- **Facts block**, label and value pairs so the user re-reads what they are about to act on. This does more work than any amount of red.
- **The destructive button.** Per `00-DECISIONS.md` D3, it is a **secondary button with `--c-urgent` label text and a 1px `--c-urgent` border**. There is no filled red button anywhere in this product. Its label is the verb and the object, `Void ticket`, never `OK`, never `Yes`.
- **The other button** is the ordinary secondary style, and its label names the safe outcome, `Keep ticket`, `Keep editing`.
- The type-to-confirm input is `--h-input` (30px), 1px `--c-border-control`, per D3 and D5.

### 5.3 Keyboard and dismissal

- `Esc` and backdrop click both equal the non-destructive button.
- `Enter` activates the destructive button **only when there is no type-to-confirm field**. Where a type-to-confirm field exists, the destructive button stays disabled until the typed string matches exactly, case-sensitive, and `Enter` inside the field does not submit.
- Focus lands on the non-destructive button on open for plain confirms, and on the type-to-confirm input for type-to-confirm dialogs.
- Focus treatment is `--focus-ring` at `--focus-offset` per D4, including on the disabled destructive button once it enables.

### 5.4 Which actions confirm. Exhaustive, from `00-DECISIONS.md` D3

**Unnecessary confirmations train the reflex that defeats the necessary ones.** The two lists below are complete. Anything not on them gets no confirmation at all, and this list is the arbiter's, not this file's.

#### Type-to-confirm. Exactly these four, and no others.

The user types a specific word into a 30px input before the destructive button enables.

| # | Action |
|---|---|
| 1 | Void a ticket |
| 2 | Issue a refund |
| 3 | Delete a client record that has bookings |
| 4 | Change a user's role |

Each of these dialogs prints the facts block: which ticket, which passenger, which amount, which user, which role.

Item 4 is also the **only** supervisor-only action in the product, per D6.

> **Open item.** The exact literal string the user must type for each of the four is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D3 settles that there is a word and that there are four actions. It does not name the words. Do not assume `VOID`, `REFUND`, `DELETE` or similar; get them recorded.

**What is no longer type-to-confirm.** An earlier draft of this file listed seven type-to-confirm actions. Cancelling a confirmed PNR, issuing tickets, overwriting a Sabre credential, and backdating a booking fee are **not** on D3's list and therefore do not confirm by typing. Cancelling a request appears on the plain list below. The other three get no confirmation at all.

> **Open item.** The send-to-issue checklist used to live inside the ticket-issue confirm dialog. Since issuing tickets no longer raises a dialog, where that checklist now lives is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** It is a real gate and it must not be lost in the move.

#### Plain S3 confirm. No typing.

Exactly these five, from D3:

- Release a hold
- Discard unsaved changes
- Cancel a request
- Delete a draft proposal
- Remove a traveller from a booking

#### No confirmation at all. Just do it.

Everything else, explicitly including:

- Every save, including `Save` and `Save & Close`.
- Every navigation: object tabs, queue tabs, window tabs, views, sort, page.
- Every filter change.
- Marking work complete.
- Setting or clearing the blocked flag. It has a mandatory reason field, which is the gate.
- Adding a note, a research note or a communication log entry.
- Uploading a document, and superseding a document version.
- Creating any record.
- Editing any field before save.
- Reassigning a follow-up date, or changing the owning agent.
- Sending a message or an invoice, and recording a payment.
- Every Admin save except changing a user's role.
- Anything reversible by simply doing the opposite.

If someone proposes a confirmation for an action not on the first two lists, the answer is no, and the reference is `00-DECISIONS.md` D3, not this file.

Any file specifying an `I understand this cannot be undone` checkbox in place of a confirm is a defect. That pattern does not exist here.

---

## 6. S4, THE PANEL, AND EVERY MENU

A panel is white `--c-surface`, 1px `--c-border-control`, **no shadow**, no radius, per D1. Depth is the border against a solid fill. Nothing behind a panel shows through, so nothing needs to float.

All panels: 0 radius, no animation beyond an instant state change, no icons, no keyboard shortcut hints, `--focus-ring` on every item per D4.

**There are six menu forms.** There used to be seven. The user menu is deleted, see 6.7.

> **Open item, applying to this whole section.** Panel widths are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** That covers the `More` panel, the row context menu, the button dropdown and the View picker. The widths drawn in the diagrams below are illustrative only and are not settled anywhere in `assets/tokens.css`, `01-CONSULATE-DESIGN-SYSTEM.md` or `00-DECISIONS.md`. Do not treat them as spec.

### 6.1 Object tab row, in the crown

Not a menu that opens. It is always visible, occupying crown row 2 at `--h-crown-row2` (40px). Geometry in `01-CONSULATE-DESIGN-SYSTEM.md`. Tabs: Requests, Clients, Travellers, Bookings, Tickets, Reports, then `More` right-aligned. The active tab is a white notch cut out of the green, which is the product's signature form. Never round it, never inset it, never give it a gap.

### 6.2 The `More` overflow panel

Opens on click of the `More` object tab. Holds Suppliers, Commissions, Agents, Admin.

```
Trigger    "More" tab, right-aligned in the crown tab row
Anchor     right edge of the panel flush with the right edge of the "More" tab
Top        y=84, directly against the crown's bottom border
Width      NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
Fill       --c-surface
Border     1px --c-border-control
Shadow     NONE
Rows       30px, 13px/400 --c-ink, 18px horizontal padding
Hover      --c-band-service fill
```

```
        ... | Reports |   More  |
                     +-----------------+
                     | Suppliers       | 30
                     | Commissions     | 30
                     | Agents          | 30
                     | Admin           | 30
                     +-----------------+  1px --c-border-control
```

Open on click. Close by choosing a row, clicking outside, `Esc`, or moving to a different object tab. Keyboard: `Down` and `Up` move, `Enter` activates, `Esc` closes and returns focus to the `More` tab. No hover-to-open, because a menu that opens on hover opens by accident.

While the panel is open, the `More` tab renders in the crown hover state, `--c-crown-hover` fill with a white label.

### 6.3 Queue tab band

Not a menu. **All queues are visible at rest, always, with live counts, never hidden behind a control.** There is no overflow menu on this band.

Per `00-DECISIONS.md` D12 the cap is **seven queue tabs per object**, so they never overflow, never scroll and never collapse. An object needing more than seven piles has too many piles; move the surplus into the View dropdown, which is what it is for.

The band is 38px (`--h-queue-band`) **when present**. Reports, Admin and S5 workspaces do not carry a queue band and everything below simply moves up 38px, per D11. A count of zero prints as nothing at all, and a count prints in `--c-urgent` when that queue holds anything due inside four hours.

### 6.4 The View picker

Trigger is the select in the box's control strip, labelled `View:`.

```
Fill       --c-surface
Border     1px --c-border-control
Shadow     NONE
Radius     0
Anchor     left edge flush with the select's left edge,
           top flush with the select's bottom edge
Width      NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
Group cap  11px/700 uppercase 0.7px --c-ink-3
Item rows  30px, right-aligned counts, tabular per D7
```

```
+--------------------------------------------------+
| MY VIEWS                                         |  group caption
| Needs action today                          12   |  30
| My open requests                            34   |
| PRICING GROUPS                                   |
| Belev Echad                                  8   |
| Scheiman                                     5   |
| Community All                               21   |
| BY AGENT                                         |
| M. Roth                                     19   |
| S. Katz                                     14   |
| ALL                                              |
| All requests                               210   |
+--------------------------------------------------+
```

Choosing a view **does not change the queue tab**. It narrows it, and the section header strip appends the view name: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`.

Open by clicking the select. Close by choosing an item, clicking outside, or `Esc`. Keyboard: `Down` and `Up` skip group captions, `Enter` selects, `Esc` closes and reverts to the previously selected view. Type-ahead matches item labels.

**Sorting is not here.** Sorting is the Sort select in the control strip. Column headers are never sortable and never resizable (D17).

> **Open item.** The canonical pricing group list is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** The package variously names three groups (Belev Echad, Scheiman, Community All), three with `Standard` substituted for `Community All`, and four including both. A build agent cannot tell whether `Standard` and `Community All` are the same thing, two things, or a view label against a business object. The names above are illustrative until that is settled.

### 6.5 Row context menu

Right-click on any data row in the box. Opens at the pointer.

```
Fill       --c-surface
Border     1px --c-border-control
Shadow     NONE
Rows       30px, 13px/400 --c-ink, 18px padding
Separator  1px --c-border-item full-width rule between groups
Width      NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
```

```
+----------------------------+
| Open                       |
| Open in full page          |
+----------------------------+  1px --c-border-item
| Assign to me               |
| Change owner...            |
| Set follow-up date...      |
| Mark blocked...            |
+----------------------------+
| Copy request number        |
| Print this record          |
+----------------------------+
```

Rules:

- Right-clicking a row **selects it first**, so the menu always acts on what is under the pointer, and the row shows the `--c-band-service` hover fill for as long as the menu is open.
- A trailing `...` means the item opens a window. No trailing `...` means it acts immediately.
- **There is no permission-based disabling in this menu.** Both roles can do everything operational (D6). Items unavailable because of the record's own state, for example `Mark blocked` on an already-blocked row, are shown rather than hidden, so the menu's shape is stable.
- Destructive actions do not appear here. Void, refund and cancel are reached inside the record window where the facts are on screen.
- Close by choosing an item, clicking anywhere, `Esc`, scrolling the list, or right-clicking a different row.
- Keyboard: `Down`, `Up`, `Enter`, `Esc`. The menu is also reachable by the platform context-menu key on the focused row.

> **Open items.** The **disabled appearance of any control**, including a disabled menu item, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** An earlier draft of this file answered it in passing as `--c-ink-3` text; that closes the question for ink only and says nothing about fill or border, so it is withdrawn. The **selected-row treatment** is also unspecified, and this menu depends on it.

### 6.6 Button dropdown

A page header or footer button with a second action set. The button performs its default action; a caret segment attached to it opens the panel. They are never the same click target. Keyboard: `Down` on the focused button opens the panel.

```
[ New Request        |v]
+---------------------------------+
| New request from existing client|  30
| New request, new client         |  30
+---------------------------------+
Anchor     left edges flush, top flush with the button's bottom edge
Fill       --c-surface, 1px --c-border-control, NO shadow
Width      NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
```

> **Open items.** Two things about this control are unspecified and must not be guessed. The **caret glyph** is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and it should be settled together with the select indicator glyph, which is open in `02-COMPONENT-LIBRARY.md`. The **construction of the caret segment** is also **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**: an earlier draft of this file welded it to the button with zero gap by analogy to the crown's search field and its gold `Go` button, but `02-COMPONENT-LIBRARY.md` forbids reusing that welded pair anywhere else.

WhatsApp intake is an **S5 workspace** (D1, and section 7 below). Its entry point is a page header button and is owned by `04-SCREEN-INVENTORY.md`. It is not a menu item on this dropdown.

### 6.7 There is no user menu

Deleted. `00-DECISIONS.md` D17 lists "a user menu on the crown" among the things every file must stop saying.

- `M. Roth` in the crown utility row is a **label**. It is not an avatar, not a circle, not a photograph, and not a dropdown trigger. There is no caret next to it.
- `Sign Out` is already a utility link in the crown and needs no menu to reach it.
- `Setup | Help | Sign Out` are plain underlined links, separated by `--c-crown-rule` bars. They act on click.
- There is no avatar in the crown. Where initials are shown anywhere in the product they sit in a **square**, never a circle, and there are no photographs.

### 6.8 Panel behaviour, common to all of them

| Behaviour | Rule |
|---|---|
| Open | Click only. Never hover. |
| Close | Item chosen, outside click, `Esc`, or scroll of the underlying region. |
| Focus return | Always to the trigger. |
| Focus ring | `--focus-ring` at `--focus-offset` on every item (D4). |
| Keyboard | `Down` and `Up` move, `Home` and `End` jump, `Enter` activates, `Esc` closes, type-ahead matches labels. |
| Nesting | **No submenus, ever.** A panel is one flat list with optional group separators. |
| Overflow | A panel that would need to scroll is the wrong surface. Use a view, a queue or an Admin section. The exact row cap is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** |
| Shadow | None. See the opening of section 6. |
| Animation | None. The panel is there or it is not. |

> **Open item.** Of the six forms above, only the `More` panel and the View picker have component entries in `02-COMPONENT-LIBRARY.md`. The row context menu and the button dropdown have no anatomy and no states table there. Raise it against that file.

---

## 7. S5, THE WORKSPACE

A full page with no box, for tasks that need the whole viewport. Settled by `00-DECISIONS.md` D1. It did not exist in the earlier draft of this file, which is why roughly a dozen screens in `04-SCREEN-INVENTORY.md` had no anatomy to build against.

**Used for**, per D1:

- WhatsApp intake
- The proposal builder
- Exchange flows
- Refund flows
- Any record rendered by `Open in full page`

**Construction:**

- The crown remains, unchanged, 84px, with the correct object tab active.
- The page header remains, 64px, carrying the title, the context line and its buttons.
- **There is no queue tab band** (D11). Everything below the crown moves up 38px. Build the chrome as a flex column, never as absolute offsets.
- **There is no box.** Content sits in bordered sections directly on the canvas field, 2px `--c-border-container`, 16px vertical gaps, each with a 32px `--c-band-header` strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`. This is the same section construction as an S2 body.
- No backdrop, no shadow, no modal behaviour. It is a page. Browser Back works.
- **No window tab strip**, including on a record opened by `Open in full page`. The tabs become stacked sections in tab order (D2).
- Page gutter is `--gutter` (20px) and never changes.

An S3 confirm may open over an S5, exactly as it may over an S1 or an S2.

> **Open item.** The per-screen anatomy of each workspace, the WhatsApp intake layout in particular, is owned by `04-SCREEN-INVENTORY.md`. Where that file gives a workspace screen no anatomy, it is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

---

## 8. ADMIN AND SETTINGS

### 8.1 It is not a surface

There is no settings surface (D1). Admin is reached from `More ▾` in the crown, and its screens are **the ordinary box, S1**, under a section band.

Per `00-DECISIONS.md` D10, Admin screens **reuse the queue tab band** as their section navigation, with the same 38px geometry and the same active treatment. This is not a new surface, and it is specifically not a left sidebar. The product forbids a left sidebar, and Admin does not get an exemption.

> **A tension worth naming.** D10 says Admin reuses the queue tab band. D11 says Admin has no queue band. Read together: Admin carries no band **of queues**, and it carries the same 38px band **component** as section navigation. That is the reading this file builds on, and it is the reading the parent decision (D10) requires. If it is the wrong reading, this paragraph is the defect. Raise it against `00-DECISIONS.md`.

### 8.2 The eight sections

Exactly these eight, named exactly as `00-DECISIONS.md` D10 names them:

`Users & Roles` · `Categories & Fees` · `Message Templates` · `Deadline Rules` · `Escalation Ladders` · `Sabre Accounts` · `QuickBooks Mapping` · `Audit & Security`

Note two renames against the earlier draft of this file: `Reminders & Escalation` is now `Escalation Ladders`, and `QuickBooks` is now `QuickBooks Mapping`.

```
[ crown, 84px, unchanged, "More" tab active ]
+------------------------------------------------------------------+
| Users & Roles | Categories & Fees | Message Templates | ...       | 38 section band
+------------------------------------------------------------------+
| [tile] ADMIN                                     [ New User ]     | 64 page header
|        Users & Roles                                              |
|        14 users, 3 supervising agents                             |
+------------------------------------------------------------------+
|  canvas --c-canvas, --gutter 20px                                 |
|  +--------------------------------------------------------------+ | 2px --c-border-container
|  | USERS                                          14 users      | | 32 section strip,
|  +--------------------------------------------------------------+ |    --c-ink-on-band
|  | Name          Email           Role          Status           | | 30 column header
|  +--------------------------------------------------------------+ |
|  | M. Roth       ...             Supervising    Active          | | 44 data row
|  +--------------------------------------------------------------+ |
|  | pagination                                                   | | 38
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

The band is the same component: 38px, white, 1px bottom `--c-border-container`, 13px/600, active label `--c-ink` at 700 with a 3px `--c-gold` rule flush along the tab's bottom edge. Counts print where meaningful, and a zero prints as nothing.

Everything inside Admin is **the same box**: section header strip, control strip, column header row, 44px data rows, pagination. Editing an Admin record opens **S2 `large`**, unchanged. A user record, a fee version, a template, a deadline rule are all records. There is no bespoke settings form surface.

> **Open item.** `04-SCREEN-INVENTORY.md` enumerates nineteen Admin areas reached from an index screen. D10 settles Admin at eight sections in a band, and the arbiter outranks that file, so the nineteen areas must map into these eight. **The mapping is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Do not build an index screen and do not build a ninth tab.

### 8.3 What each section contains

| Section | Contains | Notes |
|---|---|---|
| Users & Roles | User list, email, role, status, last sign-in. | Exactly **two roles**: Booking agent and Supervising agent. The role field is a two-option select. It is not a permission matrix. **Changing a role is the one supervisor-only action in the product** and it is type-to-confirm (D3 item 4, D6). Safety comes from workflow gates, not from roles. |
| Categories & Fees | Client categories and their **effective-dated per-passenger booking fees**. | See 8.4. |
| Message Templates | Approved client message templates by channel (WhatsApp, email) and by purpose (welcome, information request, quote, decline, payment reminder, check-in ladder). Templates version. | Editing a template creates a new version. Sent messages always record which version was used. |
| Deadline Rules | Named rules that supply the terms in the deadline explainer: client payment time, issuance time, per-carrier overrides, office-hours definition, the Israeli business calendar (Sunday to Thursday, Friday half day, Shabbat, moving holidays). | Every rule row carries a `Preview` link opening the deadline explainer (4.11) against a sample deadline, so the person editing sees the arithmetic they are about to change. The calendar itself lives under `server/calendar/` per D15. |
| Escalation Ladders | The check-in ladder (24h reminder, 12h follow-up, 6h urgent, 1h critical) and other reminder ladders. | A recurring rule and a single occurrence are different records. This section edits **rules only**. Occurrences live on the request. Editing a rule never rewrites past occurrences. |
| Sabre Accounts | Multiple PCCs, each with its commission rules, tour codes and ticket designators. | Credentials are **never displayed**. The field shows `Stored in secret storage` and a `Replace` button. Note that replacing a credential is **not** on either D3 list, so it raises no confirmation. If it should, that is an amendment to D3, not a local exception here. |
| QuickBooks Mapping | Account mappings, invoice defaults, refund expense accounts, credit memo mapping, UATP bill mapping. | |
| Audit & Security | Sign-in history, audit log export, session policy, secret-storage status. | Read-only lists whose rows open S2 `medium`, never editable rows. |

### 8.4 Effective-dated values

This is the part that is expensive to retrofit. Booking fees, and any other effective-dated value, are edited and displayed exactly as `00-DECISIONS.md` D10 specifies.

**A fee is never a single number. It is a list of dated rows, and the list is the record.**

D10 fixes the columns: a leading 80px status column, then `Effective from`, `Effective to`, `Value`, `Set by`, `Recorded on`.

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

- The **status column is 80px** and leads the row. The currently applying row is marked by the word `Current` in 11px/700 uppercase `--c-good`. Future rows show `Scheduled`. **Past rows show nothing at all.** They do not read `Superseded`; D10 settles this and the earlier draft of this file was wrong.
- `--c-good` is used here exactly as `01-CONSULATE-DESIGN-SYSTEM.md` permits: as ink on a word, for a terminal or current state. Never a fill, never a chip.
- `Effective to` is **derived**, never typed. It is the day before the next row's `Effective from`. The newest row reads `open`.
- **`Recorded on` is a real column, not decoration.** D10 is explicit about why: "We were told on 30 July that the fee changed effective 1 June" is a normal week here, and it decides whether you chase the client or absorb the difference.
- The `Value` column is right-aligned currency, so it is **tabular** per D7, along with every other money column in the product. That instinct was right in the earlier draft; the rule it cited was not. The rule is D7, which extends tabular figures to any right-aligned numeric column and any currency value, and which D17 confirms replaces the old "exactly two places" statement.
- **Editing never overwrites a row.** It closes the current row and opens a new one (D10). Adding a row is `New Fee Version` in the page header, opening S2 `large` with `Effective from` and `Value`. Correcting a mistake means adding a new row, because a correction cannot exist without naming what it corrects.
- Saving a fee version, forward-dated or backdated, raises **no confirmation**, because neither appears on either D3 list. The `Recorded on` column, not a dialog, is what makes a backdated change legible after the fact.

> **Open item.** Column widths for this table beyond D10's 80px status column are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D13 fixes widths for the Requests reference grid only.

**Showing what a rule WAS when a historical record was created.** Every record that consumed an effective-dated value stores the **version identifier** of the row it used, not just the resulting number. On the record window Fares & Quotes tab the fee line reads:

```
Booking fee     40.00 per passenger
                Belev Echad, fee version effective 1 Mar 2026, recorded 30 Jul 2026.
                See fee history
```

The version sentence is 13px/400 `--c-ink-2` under the value. `See fee history` is an underlined `--c-link` link opening S2 `medium` on that fee's version list, with the row that was used marked `Used by this request`. The same pattern applies to deadline rules, message templates and escalation ladders: the record stores the version, the record displays the version in words, and the link goes to a read-only version list.

---

## 9. FEEDBACK STATES

No toasts. No snackbars. No auto-dismissing anything that carries information the user needs. These are states of S1 and S2, not surfaces of their own.

### 9.1 Page message band

The product's single mechanism for "here is what happened".

Per `00-DECISIONS.md` D6, an error band is **page-level and sits directly under the page header**:

```
Placement  Directly under the page header, full page width inside the gutters
Height     38px minimum, auto beyond that
Fill       --c-band-service
Border     2px --c-urgent left border
Padding    14px horizontal, 10px vertical
Type       13px/400 --c-ink
Radius     0
Icon       none
```

```
+------------------------------------------------------------------+
| [tile] REQUESTS                        [+ New Request] [Assign…] |  64 page header
|        Needs Action Today   48 open, 9 due today                 |
+------------------------------------------------------------------+
| | Ticket could not be issued. Sabre returned: NO PNR MATCH.      |  38 --c-band-service
+------------------------------------------------------------------+     2px --c-urgent
|  the box                                                         |     left border
```

Kinds, distinguished by the **words and the ink**, never by the fill:

| Kind | Ink | Example |
|---|---|---|
| Success | `--c-ink` | `Request R-10482 saved.` |
| Information | `--c-ink` | `This view is filtered to Belev Echad. 198 requests are hidden.` |
| Problem | `--c-urgent` at 700 | `Ticket could not be issued. Sabre returned: NO PNR MATCH.` |
| Blocking failure | `--c-urgent` at 700, distinguished by the words | `QuickBooks is not connected. Invoices cannot be sent.` |

Rules:

- Band fill is always `--c-band-service`. It does not turn red, green or amber. **Urgency is a sentence, not a colour block.**
- **`--c-overdue` is never used on a message band.** It means one thing in this product, a deadline past its time (D8), and spending it on an integration outage devalues the one signal the deadline model depends on. The earlier draft of this file did exactly that.
- Success bands persist until the next navigation or an explicit `Dismiss` link, underlined, `--c-link`, right-aligned. Problem and blocking bands persist until the condition clears and have no `Dismiss`.
- When several conditions are live at once, the collapsed band names the **actual count**, `4 problems. See details`, with an underlined link. Never a hard-coded number in the copy.
- Inside an S2 window, the same band renders at the top of the body, full width of the section column.

> **Open items.** Three things here are unsettled. The **left border treatment for success and information bands** is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**; D6 specifies the 2px `--c-urgent` left border for the error case only. The **maximum number of stacked bands before collapse** is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** And whether the box's permitted content order in `02-COMPONENT-LIBRARY.md` needs a band slot at all, now that D6 places the band above the box rather than inside it, should be reconciled against that file.

### 9.2 Inline field errors

Settled by `00-DECISIONS.md` D5. This is no longer an open gap and the three conflicting positions across the package are resolved by D5, which outranks all of them.

```
Placement  On its own line, directly under the control
Type       13px/400 --c-urgent
Field      1px --c-urgent border on the control
Fill       Field fill does NOT change. It stays --c-surface.
Icon       none
```

```
Passport number
+--------------------------------+
|                                |   1px --c-urgent
+--------------------------------+
Enter a passport number, or tick "Client has not provided this yet".
```

Rules:

- Errors appear on blur and on save, never on every keystroke.
- The message names the fix, not the failure. `Enter a date on or after the departure date`, not `Invalid date`.
- **There are no mandatory fields on intake forms.** Mandatory fields cause fabricated data. Every field a client is expected to supply carries the `Client has not provided this yet` checkbox from D5, ticking it clears and disables the field, records the state, and satisfies the form. Inline errors on intake are therefore only for **malformed** values, never for **absent** ones.
- Required, where a field genuinely is, is marked by the word `Required` at 11px/700 uppercase `--c-ink-3` after the label. **No asterisk** (D5).
- On save with errors, the page message band prints the count of fields needing attention and the window scrolls to the first error field and focuses it.

### 9.3 Empty state

Settled by `00-DECISIONS.md` D6. Lives **inside the box**, below the column header row, replacing the data rows. The box, its border, its section header, its control strip and its column headers all stay.

```
Height     160px
Alignment  centred vertically, left-aligned at --pad-box
Line 1     14px/400 --c-ink, states what is empty
Line 2     13px/400 --c-ink-2, states the way out
Extras     no illustration, no icon, no emoji, no button
```

```
+--------------------------------------------------------------+
| REQUESTS — NEEDS ACTION TODAY                                | 32
+--------------------------------------------------------------+
| View: [ Needs action today  v ]   Sort: [ Deadline  v ]      | 44
+--------------------------------------------------------------+
| Request #  Client  Trip  Stage  Waiting on  Fare  Deadline   | 30
+--------------------------------------------------------------+
|                                                              |
|   <line 1, what is empty>                                    | 14px/400 --c-ink
|   <line 2, the way out>                                      | 13px/400 --c-ink-2
|                                                              | 160px block
+--------------------------------------------------------------+
```

- The empty state always states what **does** exist elsewhere and how to get there. An empty state that only says "No records found" is incomplete.
- Distinguish empty-because-filtered from empty-because-nothing-exists. They get different sentences.
- **The per-screen copy is owned by `04-SCREEN-INVENTORY.md`**, and this file deliberately shows placeholders rather than a competing verbatim string. The earlier draft of this file specified copy for the Requests list that differed from the copy that file calls verbatim, which is how one screen ended up with two official sentences.

> **Open item.** Whether the pagination band renders below an empty state or is hidden is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** The box's stated content order ends with pagination, and hiding it is not stated anywhere.

### 9.4 Loading state

Settled by `00-DECISIONS.md` D6.

- The box renders immediately with its border, section header strip, control strip and column header row. Only the data rows are pending.
- Pending rows render as **up to 10 rows of 44px `--c-band-service` fill** in place of data rows, with the 1px `--c-border-item` rule under each. **No spinner, no skeleton shimmer, no progress bar, anywhere in the product.** The layout does not move when data arrives.
- Pending rows are not interactive and therefore never hover, so the fill cannot be confused with the row hover state, which uses the same token. **DERIVED** from D6 plus the row hover rule in `01-CONSULATE-DESIGN-SYSTEM.md`. If a pending row is ever made clickable, this collision becomes real and must be raised.
- The item count in the section header strip prints nothing until the count is known.
- Past 10 seconds, a page-level message band appears reading, verbatim from D6: `Still loading. The connection to Sabre may be slow.`
- An S2 opened before its data arrives shows its title bar with the identifier, its tab strip, and pending sections rendered as empty bordered sections with their header strips. The window never appears blank.

The earlier draft of this file permitted a determinate progress bar for document upload. D6 says no progress bar. It is removed. If upload genuinely needs one, that is an amendment to D6 and to the no-animation rule in `01-CONSULATE-DESIGN-SYSTEM.md`, raised in the open, not buried in a loading section.

### 9.5 Not-found state

Settled by `00-DECISIONS.md` D6.

- **The box renders with one line**: `That record does not exist, or it was deleted.` plus an underlined link back to the queue.
- The crown, the band where present, and the page header stay intact. **The chrome is never removed.** A user who lands on a bad URL must still be able to navigate.
- No 404 illustration. No "go home" button. The crown is the way home.

The earlier draft of this file opened an S2 with the title `RECORD NOT FOUND` and an empty tab strip. D6 gives one treatment, in the box, and that is the one to build.

### 9.6 There is no permission-denied state

Deleted, per `00-DECISIONS.md` D6 and D17.

**The product has two roles and both can do everything operational.** Booking agent and Supervising agent both book, cancel, void, refund, issue and edit. Supervisor review is after the fact, not a gate. Safety comes from workflow gates, from the `Client has not provided this yet` mechanism, and from append-only financial records. It does not come from permissions, and it never did.

**Any spec describing a blocked action for a booking agent is a defect.** That includes hiding queues, hiding rows, disabling buttons by role, and denial message bands. The earlier draft of this file carried a whole denial state with a worked example, and it is gone.

**The single exception**, named in D6, is D3 item 4: **changing a user's role is supervisor-only.**

> **Open item.** How the role field in Admin, Users & Roles presents to a booking agent is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** D6 removes the denied state and D3 makes the action supervisor-only, so the two meet at exactly one control and nothing settles what that control looks like. Do not invent a disabled treatment, and do not hide the field.

---

## 10. PRINT

**`00-DECISIONS.md` D16 designates this file as the authoritative owner of the print specification.** What follows is that specification. Any file saying "no print stylesheet is specified" is a defect against D16; point it here.

Any screen can be printed and put in a folder. This is a stated reason the product uses 44px rows and 14px type, so print is a first-class output and a requirement, not a nicety.

### 10.1 What is removed

| Element | Printed |
|---|---|
| Crown, 84px | **Removed entirely.** Replaced by the print header, 10.2. |
| Queue tab band, and the Admin section band | **Removed.** The active queue or section name moves into the print header. |
| Page header buttons | **Removed.** Buttons do not print. |
| Control strip: View, Sort, Show | **Removed.** The active view name moves into the print header context line. |
| Pagination band | **Removed.** Replaced by the print footer, 10.2. |
| Row hover, panels, dropdowns | Not applicable. |
| Backdrop | **Removed.** |
| Shadows | **Removed.** `--shadow-window` does not print. Nothing has a shadow on paper. |
| **The box's own border** | **Removed.** Per D16 the box loses its border and prints as plain ruled rows. The 1px `--c-border-item` rules between rows stay, and they are what carries the structure on paper. |
| Link underlines | **Kept.** Links are always underlined, including on paper, because the underline is the product's grammar for a reference. URLs are not appended after links. |

### 10.2 What is kept and what is added

- **The rules and the bands stay.** The section header strip, the column header row, the group headers, the 44px data rows and the 1px `--c-border-item` rules all print. The printed page must be recognisably the same object as the screen, minus its outer frame.
- **Band fills print.** `--c-band-header` and `--c-band-service` are light enough to print cleanly and dark enough to read as bands. **Do not strip fills to save toner.** A heading is a filled band, on screen and on paper.
- **Urgency prints exactly as it renders**: the deadline sentence, the extra clause, `--c-urgent` and `--c-overdue` ink, 15px/700. On a monochrome printer these render as dark grey against black body text and remain distinguishable by the 700 weight, the size and the extra clause. **The sentence carries the meaning, which is precisely why this survives black and white printing.** A colour-coded row would not.
- **Print header replaces the crown**, carrying the agency name, the screen title, the active view and the timestamp, per D16:

```
+--------------------------------------------------------------+
| YB TRAVEL                              Printed 9 Aug 2026     |
| Brooklyn Desk                          10:42 AM by M. Roth    |
| REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD                   |
+--------------------------------------------------------------+ 2px --c-border-container
```

  Wordmark 15px/700 uppercase 1.2px tracking, desk name 13px/400, context line 12px/700 uppercase 0.7px. All ink `--c-ink`, since `--c-crown` on white paper as a large flat fill wastes toner and the crown's job was navigation, which paper does not have. The 2px `--c-border-container` rule under the print header is the one place a container border survives, because it separates the header from the rows.

- **Print footer replaces pagination:**

```
+--------------------------------------------------------------+ 2px --c-border-container
| 12 requests, 3 within four hours          Page 1 of 2        |
+--------------------------------------------------------------+
```

  Page numbers and counts use `tabular-nums`, consistent with D7.

### 10.3 Page mechanics

```
Page size    US Letter portrait default, A4 supported
Margins      NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building
Orientation  Lists print landscape when the grid exceeds portrait width.
             The switch is automatic and is not a user choice.
Repeat       The print header repeats on every page.
             The column header row repeats on every page.
             Group headers repeat when a group spans a page break (D16).
Breaks       A 44px data row never splits across a page break.
             A bordered section from a window never splits if it fits on
             one page; if it does not, it breaks after a complete row and
             the section header strip repeats.
Colour       Print backgrounds ON. The stylesheet declares
             -webkit-print-color-adjust: exact and print-color-adjust: exact,
             because the band fills are structural, not decorative.
```

### 10.4 Printing a record

`Print this record` in the row context menu, and the `Print` link in an S2 `medium`, both produce a printed record built from the record window.

- **All of the record's window tabs print, in tab order**, each as a labelled block: `DETAILS`, `ITINERARY`, `FARES & QUOTES`, `PAYMENTS`, `DOCUMENTS`, `HISTORY` for a request, and the equivalent set for any other object. Since the tab cap is eight (D2), a record may print up to eight blocks. Printing only the visible tab produces a file that misleads the person reading it in the folder.
- The window's title bar becomes the first line of the print header, in `--c-ink`, never as a `--c-crown` fill.
- The window's tab strip is removed. Tab names become the block labels above. This is the same collapse that `Open in full page` performs when it renders the record as S5, and printing an S5 record produces the same output.
- `Save` and `Save & Close` do not print.
- The scrolling body is fully expanded. Nothing is clipped.

### 10.5 What print is not

- There is no separate "print view" screen and no print preview inside the product. The browser's own preview is the preview.
- There is no "export to PDF" button in v1. **PDF export is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Print to PDF via the browser is the current answer.
- Print never reflows the grid into a different column set. The columns on paper are the columns on screen, which is what makes the printed page checkable against the system.

---

## 11. OPEN ITEMS, COLLECTED

Every unsettled value in this file, in one list, so a build agent can raise them in one pass rather than discovering them one at a time. Each is stated at its point of use above with the exact string **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

| # | Open item | Where |
|---|---|---|
| 1 | Whether an S2 `medium` may open over an S2 `large` | 1.3 |
| 2 | Which instant triggers the overdue state, the supplier's stated time or our derived action-by time | 4.6.1 |
| 3 | Whether the Request Details tab carries a `CLIENT` section, an `INTAKE` section, or both | 4.6 |
| 4 | The help topic list, its content owners, and search inside help | 4.10 |
| 5 | How many sessions first-run guidance persists for | 4.10 |
| 6 | The four literal type-to-confirm strings | 5.4 |
| 7 | Where the send-to-issue checklist lives now that issuing raises no dialog | 5.4 |
| 8 | Panel widths: `More`, row context menu, button dropdown, View picker | 6 |
| 9 | The disabled appearance of any control, fill, border and ink | 6.5 |
| 10 | The selected-row treatment the context menu depends on | 6.5 |
| 11 | The caret glyph, and the select indicator glyph, together | 6.6 |
| 12 | Whether the caret segment is welded to its button | 6.6 |
| 13 | The panel row cap before a panel is the wrong surface | 6.8 |
| 14 | The canonical pricing group list | 6.4 |
| 15 | How nineteen documented Admin areas map into D10's eight sections | 8.2 |
| 16 | Column widths for the effective-dated value table beyond the 80px status column | 8.4 |
| 17 | The left border treatment for success and information message bands | 9.1 |
| 18 | The maximum number of stacked message bands before collapse | 9.1 |
| 19 | Whether pagination renders under an empty state | 9.3 |
| 20 | How the role field presents to a booking agent, given no denied state exists | 9.6 |
| 21 | Print margins for US Letter and A4 | 10.3 |
| 22 | PDF export | 10.5 |

Derived values, marked at their point of use and repeated here so they can be checked rather than trusted:

| Value | Derived from |
|---|---|
| 1080px section content width at S2 `large` | D2's 20px body inset and D1's 1120px window width |
| 528px body height at S2 `medium` | D1's 620px height less D2's 40px title bar and 52px footer |
| S3 footer at 52px with a 1px `--c-border-item` top rule | D1's "same construction as S2" plus D2's footer specification |
| The metadata block in an S2 `medium` is a bordered body section, not a separate strip | D2, which permits only bordered sections with `--c-band-header` strips in a window body |
| Pending rows cannot collide with the row hover fill | D6's pending-row fill plus the non-interactive nature of a pending row |
