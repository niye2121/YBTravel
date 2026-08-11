# 05-CLAUDE-DESIGN-BRIEF.md

## Instructions for Claude Design. Read this whole file before you draw anything.

---

## 0. How to use this file

This file is **self-contained on purpose**. It is pasted into a fresh session by a developer who has no other files, no repository access and no context. Everything you need to design a correct CONSULATE screen is written out below: the complete token table, the type scale, the fixed heights, the five surfaces, the confirmation policy, the focus treatment, the form primitives, the deadline grammar, the booking stages, and the list of things this product deliberately does not have.

Three consequences follow.

**One. Do not ask for the other files.** If this file does not contain a value, the value is not settled, and the correct output is the exact string `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`, not a guess. A guessed value that ships is more expensive than a question.

That string is the **single canonical unspecified flag for the whole package**, and it is the only one. Do not shorten it, do not reword it, and do not substitute a variant of your own. It names `00-DECISIONS.md` because that file's **D18 open items register** is where every unspecified value in this package is tracked and eventually answered. You are not being asked to read that file. You are being asked to write the flag so the developer knows exactly where the answer will come from. Where the thing you are flagging already carries a D18 item number, cite it after the string, for example `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the icon tile glyph set (D18 item 17)`.

**Two. Where this file names another file, it is naming the owner of a list, not asking you to read it.** There are exactly two of these, and both are lists of proper nouns that change as the product grows, which is why they are not frozen here:

- The **queue tab names per object** live in `04-SCREEN-INVENTORY.md`. Never invent one. The developer who gives you a brief must paste the queue tab list into the prompt. Seven per object is the hard cap.
- The **per-screen empty state copy** lives in `04-SCREEN-INVENTORY.md` for the same reason.

Everything else you need is here.

**Three. This file restates the locked design language faithfully and adds nothing to it.** The authority order in the package is `assets/tokens.css`, then `01-CONSULATE-DESIGN-SYSTEM.md`, then `00-DECISIONS.md` which resolves everything `01` left open, then the component, window and screen files, then this one. Every value below has been reconciled against that order. If you are ever given a document that disagrees with this one, the higher file wins and the disagreement is a defect worth naming out loud.

---

## 1. What you are designing

You are designing new screens for **CONSULATE**, the internal operations platform for **YB Travel**, a single travel agency of roughly 5 to 30 staff. US and Israel travel, heavy on EL AL, with community pricing groups that carry their own per-passenger booking fees. This is not a product to sell. There are no marketing pages, no onboarding funnels, no pricing tiers, no dark mode.

> The canonical list of pricing group names is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (D18 item 30). The package variously names Belev Echad, Scheiman, Community All and Standard, and nobody can currently tell whether `Standard` and `Community All` are one group or two. Use placeholder names in any drawing and flag them.

The users are booking agents, supervising agents, and offshore intake staff who transcribe WhatsApp messages into records all day. They range widely in age and confidence. The oldest of them has driven Microsoft Dynamics CRM for fifteen years and expects this to behave the same way.

The organising object is the **travel request**. Deadlines and action items hang off requests and bookings.

### The design language is already chosen and locked

CONSULATE was chosen by the client on 3 August 2026 from six competing concepts. It is locked. It is enterprise software a 55-year-old office manager already knows how to drive. Its ancestors are Microsoft Dynamics CRM, Salesforce Classic, the Oracle and SAP web clients, and travel back-office systems where staff say "pull the file" and mean it literally.

It is **deliberately not modern**. It does not float. It does not animate. It has no rounded corners anywhere.

**Your job is to produce new screens inside this language.** Your job is not to:

- propose an alternative visual direction
- modernise, refresh, soften or "elevate" anything
- suggest a component library, a theme or a redesign
- add motion, depth, colour or personality
- reduce the visual density of borders and bands because it looks heavy
- improve the palette, the type scale, the row height or the border grammar
- offer a "modern variant" alongside the requested design, even as an option

Every one of those has already been considered and rejected, in writing, by the people who own the product. The heaviness is the point. The product has to be readable across a desk and printable into a paper folder. A screen that looks contemporary and a screen that looks like CONSULATE are not two acceptable answers, they are one right answer and one rejected concept.

If you believe something in the brief you are given is wrong, use the conflict protocol in section 17. Say so, name the rule, propose the CONSULATE-native way to get the same outcome. Do not silently fix it, and do not silently comply.

---

## 2. The five defining rules

These five rules generate almost every other decision. Memorise them.

**RULE 1. Zero corner radius, everywhere, forever.** The box, windows, confirms, panels, buttons, inputs, selects, checkboxes, radios, the search field, the Go button, the crest tile, agent initials, the close button, pagination page boxes. `--radius` is `0` and there is no exception anywhere in the product. There are no circles and no pills. Initials sit in squares. If you find yourself typing `border-radius`, you have made a mistake.

**RULE 2. Two border weights, and the difference between them is the grammar.**
- `2px --c-border-container` means "this is a container, something is enclosed".
- `1px --c-border-item` means "these are items in a list".
- There is no third structural weight. `--c-border-control` (1px) is for form controls, and `--c-border-field` (1px) is the rule between form field rows. Neither is a third structural weight, they are control trim.

**RULE 3. A heading is a FILLED BAND, never bold text floating in whitespace.**
- Section header strips: `--c-band-header`.
- Column headers, group headers, pagination, row hover: `--c-band-service`.
- If you have written a heading with no fill behind it on a data screen, you have broken the product.

**RULE 4. Shadow belongs to exactly two surfaces, S2 the window and S3 the confirm.** The token is `--shadow-window` (`0 6px 24px rgba(0,0,0,0.35)`). Nothing else is elevated, ever. S1 the box has no shadow. S4 the panel has **no shadow**, it sits on a solid white fill with a 1px border and is simply on top. S5 the workspace has no shadow. There is no elevation system and no hover shadow. Any sentence calling any single surface "the only shadowed thing on screen" is wrong and is a known defect phrase in this package.

**RULE 5. Urgency is a SENTENCE, not a colour block.** Nothing is pinned, duplicated, lifted out of sort order, flashed, filled or ticked down. The urgent row does not move and does not change shape. It changes **what it says**, in bigger, redder, plainer words. Full rules in section 9.

---

## 3. The complete token table

This is the whole of `assets/tokens.css`, copied verbatim, comments and all, with nothing abridged and nothing reworded. There is nothing else. If this block and `assets/tokens.css` ever differ by so much as a comment, the token file wins and this block is a defect to report. Use the **variable name**, never a raw hex. The hex values exist here so you can render correctly, and they are quoted as definitions only. Do not paste a hex into any spec, style or annotation you produce.

```css
/* ============================================================================
   CONSULATE — design tokens for the YB Travel operations platform
   ----------------------------------------------------------------------------
   This file is the SINGLE SOURCE OF TRUTH for colour, type, spacing and shape.

   RULES FOR ANY AGENT OR DEVELOPER TOUCHING THIS CODEBASE:
   1. Never write a raw hex value in a component. Use a token.
   2. Never add a token without adding it here first.
   3. Never introduce a border-radius. There is no radius scale, on purpose.
   4. Never introduce a shadow except --shadow-window, which belongs to
      exactly two surfaces: S2 the window and S3 the confirm. Nothing else.
   5. If a value you need does not exist here, the design has not been made yet.
      Stop and ask, do not invent one.
   ============================================================================ */

:root {

  /* ---------- BRAND ------------------------------------------------------ */
  --c-crown:            #0E4634;  /* the green band, primary buttons, icon tiles */
  --c-crown-border:     #0A3628;  /* 2px rule under the crown, record window border */
  --c-crown-hover:      #14604A;  /* object tab hover fill */
  --c-crown-rule:       #2E6552;  /* hairline rules INSIDE the crown only */
  --c-crown-ink:        #A8C4B8;  /* secondary text on the crown */
  --c-gold:             #B07D1A;  /* crest tile, Go button, active queue tab underline */
  --c-link:             #14604A;  /* in-page hyperlinks (ALWAYS underlined) */

  /* ---------- SURFACES --------------------------------------------------- */
  --c-canvas:           #E4E7E2;  /* the grey-green page field behind the box */
  --c-surface:          #FFFFFF;  /* the box, the record window, inputs */
  --c-band-header:      #DCE2D8;  /* section header strips. A heading is a FILLED BAND. */
  --c-band-service:    #F1F3EF;  /* column headers, group headers, pagination, row hover */

  /* ---------- BORDERS ----------------------------------------------------
     Two weights, and the difference between them is the entire grammar:
       2px --c-border-container  = "this is a container, something is enclosed"
       1px --c-border-item       = "these are items in a list"
     Do not invent a third weight.                                            */
  --c-border-container: #BFC4BC;
  --c-border-item:      #DDE1DB;
  --c-border-field:     #EDEFEB;  /* rule under each form field row */
  --c-border-control:   #A8AEA6;  /* inputs, selects, secondary buttons */

  /* ---------- INK -------------------------------------------------------- */
  --c-ink:              #1C1F1B;  /* primary text */
  --c-ink-2:            #5C6159;  /* secondary text, labels, inactive tabs */
  --c-ink-3:            #8B9089;  /* tertiary: eyebrows, placeholders, counts */
  --c-ink-invert:       #FFFFFF;
  --c-ink-on-band:      #23392F;  /* section header strip label ONLY */

  /* ---------- FOCUS -------------------------------------------------------
     One focus treatment for every interactive element in the product.
     A 2px outline offset 1px, so it reads as a square ring outside the
     element's own square border. Never a glow, never a colour change,
     never a radius.                                                          */
  --focus-ring:         2px solid #0E4634;
  --focus-offset:       1px;

  /* ---------- STATUS -----------------------------------------------------
     Urgency in CONSULATE is a SENTENCE, not a colour block. These colours
     apply to TEXT ONLY. Never a fill, never a row background, never a chip.  */
  --c-urgent:           #A32116;  /* deadline inside 4 hours */
  --c-overdue:          #7A1710;  /* deadline passed */
  --c-good:             #1E7A3C;  /* paid, ticketed, connected. Text only. */

  /* ---------- SHAPE ------------------------------------------------------ */
  --radius:             0;        /* every element, no exceptions, forever */
  --shadow-window:      0 6px 24px rgba(0,0,0,0.35); /* S2 window + S3 confirm ONLY */

  /* ---------- TYPE -------------------------------------------------------
     One family. No second family. No monospace anywhere in the product.
     Chosen because it is wide, has a large x-height, is present on every
     Windows machine in the office, and is the most legible thing available
     to a 55-year-old at 14px.                                                */
  --font: Tahoma, Verdana, Geneva, sans-serif;

  --t-wordmark:         15px;  /* 700, uppercase, 1.2px tracking */
  --t-h1:               22px;  /* 700, page header */
  --t-window-title:     15px;  /* 700, record window title bar */
  --t-tab-object:       14px;  /* 600 inactive / 700 active */
  --t-body:             14px;  /* 400, row primary text, button labels */
  --t-tab-queue:        13px;  /* 600 */
  --t-control:          13px;  /* 400 labels, 600 select values */
  --t-secondary:        13px;  /* 400, row secondary text, count lines */
  --t-header:           12px;  /* 700 uppercase 0.7px, section header strips */
  --t-column:           12px;  /* 700 sentence case, column headers */
  --t-eyebrow:          11px;  /* 700 uppercase 0.7px */

  /* ---------- SPACING ----------------------------------------------------
     4px grid. Page gutter is 20px and never changes.                        */
  --gutter:             20px;
  --pad-box:            14px;  /* inset inside the box */
  --pad-window:         20px;  /* inset inside the record window body */

  /* ---------- FIXED HEIGHTS ----------------------------------------------
     These are structural. Changing one changes the silhouette of the product. */
  --h-crown-row1:       44px;
  --h-crown-row2:       40px;  /* object tabs. Crown total = 84px */
  --h-queue-band:       38px;
  --h-page-header:      64px;
  --h-section-strip:    32px;
  --h-control-strip:    44px;
  --h-column-header:    30px;
  --h-group-header:     26px;
  --h-row:              44px;  /* data row. Wide and readable, on purpose. */
  --h-button:           34px;
  --h-input:            30px;
  --h-pagination:       38px;
  --h-window-title:     40px;
  --h-window-tabs:      34px;
}

/* Numerals: tabular figures on any RIGHT-ALIGNED NUMERIC OR CURRENCY column
   (fares, fees, totals, balances, pagination counts). See 00-DECISIONS.md D7.
   Left-aligned text, dates, times and deadline sentences stay proportional.
   There is still no monospace font anywhere in this product. */
.num, .fare, .fee, .total, .balance, .pagination-count {
  font-variant-numeric: tabular-nums;
}
```

**There are no other colours.** If a design needs a colour that is not in this list, the answer is that the design is wrong, not that the palette is short. Write `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`.

Three token rules that are not obvious from the names:

- **`--c-crown-rule` is used only inside the crown.** It is the hairline between the wordmark and the desk name, and the `|` separators between the utility links. It appears nowhere else in the product, which is why the separator colour between the control strip's `Edit` and `Create New View` links is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.
- **`--c-ink-on-band` exists and is the section header strip label ink.** Do not quote its hex as a literal, do not call it "the deep green with no token", and do not write `--c-ink-heading-on-band`, which is not a token.
- **`--c-good` is for terminal and connection states only**, as ink on a word. Paid, Ticketed, Current, connected. It never means "success" on a button and it is never a fill.

---

## 4. Type

### Family

```
Tahoma, Verdana, Geneva, sans-serif
```

Chosen because it is wide, has a large x-height, is present on every Windows machine in the office, and is the most legible thing available to a 55-year-old at 14px.

Weights **400 / 600 / 700 only**. No second family. **No monospace anywhere in the product.** Deadlines, dates and durations are set as words, in the same face as everything else. There is no ticker font, no letterspaced numeric readout, no mono digit.

### The complete type scale, with size, weight, tracking and case

| Size | Weight | Tracking | Case | Used by |
|---|---|---|---|---|
| 22px | 700 | none | sentence | H1, page header only |
| 15px | 700 | 1.2px | uppercase | wordmark, "YB TRAVEL" |
| 15px | 700 | 0.3px | uppercase | window title bar, S2 and S3 |
| 15px | 700 | none | sentence | urgent and overdue deadline, grid text only |
| 14px | 700 | none | sentence | active object tab |
| 14px | 600 | none | sentence | inactive object tab, primary button label |
| 14px | 400 | none | sentence | body, data cells, secondary button label |
| 13px | 600 | none | sentence | queue tab, window tab, user label, select value |
| 13px | 400 | none | sentence | desk label, count line, secondary row text, control labels, form labels, help text, validation message |
| 12px | 700 | 0.7px | uppercase | section header strip |
| 12px | 700 | 0.6px | uppercase | group header |
| 12px | 700 | none | **sentence** | column header. No uppercase, no tracking. |
| 12px | 400 | none | sentence | crown utility links, inline view links, both underlined |
| 11px | 700 | 0.7px | uppercase | eyebrow, panel group captions |
| 11px | 700 | **none** | uppercase | the `OVERDUE` stage word, the `Required` marker, the `Current` and `Scheduled` markers |

Two traps in that table. The **column header is the one 12px/700 element that is not uppercase and carries no tracking**, and getting it wrong is the most common typographic error in this system. The **`OVERDUE` word carries no tracking**, so do not borrow the eyebrow's 0.7px for it.

**The largest text on a data screen is the H1 at 22px, and the only text in a grid larger than 14px is a deadline in its urgent or overdue state, at 15px.** That size jump is meaningful. Do not spend it on anything else.

Hyperlinks inside the page are **always underlined**, in `--c-link`. Not on hover. Always. This is an accessibility decision and a period decision at the same time. Menu rows inside a panel are not hyperlinks and are not underlined.

### Numerals

`font-variant-numeric: tabular-nums` applies to **any right-aligned numeric column and any currency value**. In practice that means fares, fees, totals, balances, commissions and pagination counts, and it means every money column in every table including the effective-dated fee table.

**Left-aligned text, dates, times and deadline sentences stay proportional.** A verified-at stamp is proportional. A deadline sentence is proportional. There is still no monospace font anywhere in the product, and no ticket number, PNR locator or passport number is ever set in a mono face or given tabular figures because it sits in a left-aligned column.

Any statement that tabular figures apply "in exactly two places" is a known defect phrase. It was too tight and it produced ragged money columns.

---

## 5. Fixed heights and spacing

### Fixed heights, in pixels, non-negotiable

| Region | Height |
|---|---|
| Crown row 1 | 44 |
| Crown row 2, object tabs | 40 |
| Crown total | 84 |
| Queue tab band, **when present** | 38 |
| Page header | 64 |
| Section header strip | 32 |
| Control strip | 44 |
| Column header row | 30 |
| Group header | 26 |
| **Data row** | **44** |
| Button | 34 |
| Input, select, type-to-confirm field | 30 |
| Pagination | 38 |
| Window title bar, S2 and S3 | 40 |
| Window tab strip, S2 `large` only | 34 |
| Window footer, S2 and S3 | 52 |
| Window body, S2 `large` | **630**, derived: 760 less 4 of border less 40 less 34 less 52 |
| Window body, S2 `medium` | **524**, derived: 620 less 4 of border less 40 less 52 |
| Textarea minimum | 68 |
| Form field row | 34, or auto for a textarea |
| Empty state block | 160 |
| Page message band | 38 minimum, auto beyond that |

### Spacing

- 4px grid throughout.
- Page gutter **20px always**, and it never changes.
- Box inset 14px.
- Window body inset 20px.
- Canvas vertical padding 16px.
- Bordered sections inside a window body or on a workspace: 16px vertical gaps.
- Button gap 10px, button horizontal padding 16px.
- Object tab horizontal padding 22px. Queue tab and window tab horizontal padding 18px. Panel row horizontal padding 18px.

### Viewport

**Minimum viewport is 1300px**, which is 160 plus the 1120px window plus a 20px gutter. Below that the page scrolls horizontally. Desktop only. No mobile build is in scope. Any statement of 1180px is a defect, because it is arithmetically impossible with a 1120px window at x=160.

### Never build the chrome from absolute offsets

The crown is 84px, the page header is 64px, and the queue tab band is 38px **when present**. **Reports and every S5 workspace have no band at all**, and everything below them simply moves up 38px. **Admin is different: it carries no band of queues, but it does carry the same 38px band component as its section navigation**, per D10 and D11, so Admin's chrome height is unchanged and its page header sits at the same offset as Requests. **Build the chrome as a flex column, never as a stack of fixed y coordinates.** A screen that hard-codes y=122 or y=186 is a defect. When the band is present the chrome ends at 186px, and when it is absent it ends at 148px.

---

## 6. The five surfaces. There are exactly five, no more, ever

Earlier drafts of this package variously claimed seven and nine surfaces. This is the settled list, and it is the enum you must use in every spec block.

| # | Surface | What it is | Sits on | Shadow |
|---|---|---|---|---|
| **S1** | **The box** | One white rectangle, `--c-surface`, 2px `--c-border-container`, on the `--c-canvas` field. Holds all list and detail content. | The page | none |
| **S2** | **The window** | A modal rectangle over a dimmed page. 2px `--c-crown` border, a 40px `--c-crown` title bar, a 52px footer. | Over S1, and a read-only `medium` may sit over a `large` | `--shadow-window` |
| **S3** | **The confirm** | A small modal for a yes/no decision only. Same construction as S2, with no tab strip and no scrolling body. | Over S1, S2 or S5 | `--shadow-window` |
| **S4** | **The panel** | A dropdown menu. `--c-surface`, 1px `--c-border-control`, **no shadow**, no radius. | Over anything | none |
| **S5** | **The workspace** | A full page with no box, for tasks that need the whole viewport: WhatsApp intake, the proposal builder, exchange flows, refund flows, and any record opened by `Open in full page`. Crown and page header remain, queue band does not. | The page | none |

**There is no read-only viewer surface, no help window surface, no settings surface and no toast.** Those are all **S2 `medium`** with different content. That collapse removes an entire class of "which window type is this" mistakes, and it is the single most important thing to get right about surfaces.

### S2 has three sizes and no others

| Size | Dimensions | Position | Used for |
|---|---|---|---|
| `large` | **1120 x 760** | **x=160, y=70** | Record windows, create windows, any window with one editable field |
| `medium` | **820 x 620** | **horizontally centred, y=90** | Document preview, sent message, historical version, audit or change-history entry, proposal preview, help, first-run content, the deadline explainer |
| `small` | **520 wide, height auto, maximum 420 tall** | **horizontally centred, y=200** | S3 confirms only |

1120 x 760 is the **outer** footprint including the 2px border. Everything in this product is `box-sizing: border-box` and there is no content-box exception. The interior numbers that follow from that are settled in D2 and are not to be recomputed: body height at `large` is **630px**, body height at `medium` is **524px**, and section content width at `large` is **1076px**. Any figure of 634, 528 or 1080 is a defect, because it forgot the 2px border on each edge.

### Stacking

**Stacking is settled in D1, and exactly two things may open over an S2 `large`.**

1. An **S3 confirm**. It may also open over an S1 page or over an S5 workspace.
2. An **S2 `medium` in read-only mode**, meaning a document preview, a message viewer, an audit or change-history entry, the help window or the deadline explainer. A read-only `medium` carries no Save, only a single `[Close]` button, so it cannot create a save-order problem. This is the Documents tab and History tab interaction on every record in the product, so it has to be legal and you must draw it as legal.

**An S2 `medium` that can save may NOT open over an S2 `large`.** If a window is open and the user activates a link to a different editable record, the current window closes first.

**Nothing ever stacks three deep.** If a flow appears to need three layers, it is an S5 workspace, not a stack.

### Surfaces that do not exist and must not be added

| Not allowed | Use instead |
|---|---|
| A sixth surface of any kind | One of the five |
| A separate read-only viewer | S2 `medium` with a single `[Close]` footer button |
| A separate help window | S2 `medium` |
| A separate settings surface | S1, the box, under the Admin section band |
| A separate explainer panel | S2 `medium` |
| Toast, snackbar, anything that auto-dismisses | The page message band, section 13 |
| Side panel, slide-over, drawer | S2 |
| Inline row expansion, accordion row | S2 |
| A second **saving** S2 stacked on an S2 | Close the first. Over an S2 `large`, only an S3 confirm and a read-only S2 `medium` may sit, per D1. |
| A new browser tab for a record | S2, or S5 via `Open in full page` in the same tab |
| A wizard with a multi-step progress stepper | S2 tabs, or a section inside the window |
| Floating action button | Page header buttons |
| Command palette | Object tabs and the View picker |
| A user menu on the crown | Nothing. `M. Roth` is a label, `Sign Out` is already a utility link. |
| A sortable or resizable column header | The Sort select in the control strip |
| A tooltip carrying information the user needs to act on | Put the words in the row or in the field help text |
| A popover card on hover | Nothing. Open the record. |
| A permission-denied state | Nothing. There is not one. |

### The window, in the detail you need to draw it

- **Title bar 40px**, `--c-crown` fill. Left, 16px inset: the title, 15px/700 `--c-ink-invert`, 0.3px tracking. Format for a request: `REQUEST R-10482 — KAPLAN, 5 PASSENGERS`, that is type, identifier, then the human handle. Right: an underlined 12px `--c-crown-ink` link `Open in full page` on the `large` size only, then a 26x26 square `✕` button with a `--c-crown-border` hover fill.
- **Not draggable, not resizable, not minimisable.** Two record windows never coexist, and the window never stacks on another window of its own kind. It appears in the same rectangle every time, so the `✕` is at the same pixel on every record for every user forever. What may open over it is fixed by D1 and is exactly two things: an S3 confirm, and a read-only S2 `medium`.
- **Backdrop `rgba(28,31,27,0.42)`, no blur.** The list stays legible around the edges, which is why this product needs no record pager, no next and previous arrows and no breadcrumb inside a window.
- **Tab strip 34px**, `--c-band-header`, 1px bottom `--c-border-container`, **on `large` only**. Tabs 13px/600, 18px horizontal padding. Active tab: `--c-surface` fill, `--c-crown` ink at 700, 1px left and right `--c-border-container` borders overlapping the strip's bottom border. Labels carry a plain count in parentheses when they hold records, and **a count of zero prints as nothing at all**. **The cap is eight tabs**, they never scroll and never overflow. Requests have six, Clients have seven, both are legal.
- **Body** is the only scrolling region, 20px inset. Content is a stack of bordered sections, 2px `--c-border-container`, 16px vertical gaps, each opening with a 32px `--c-band-header` strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`. Section content width at `large` is **1076px**, derived from 1120 less the 4px of left and right border and the 40px of body inset, per D2. Body height at `large` is **630px** and at `medium` is **524px**. Use these figures, do not recompute them.
- **Footer 52px**, `--c-surface`, **1px top `--c-border-item`** because a footer separates items in a stack rather than enclosing a container, 20px inset, buttons right-aligned with a 10px gap in the order **`[Save]` secondary, then `[Save & Close]` primary**. This is inherited from Dynamics. Do not replace it with autosave. A read-only `medium` window has a footer with a single `[Close]` secondary button and **no Save, ever**.
- **Unsaved changes.** Closing a dirty window by `✕`, by backdrop click or by `Esc` raises an S3 confirm reading `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary. Two buttons, never three. Switching between window tabs never discards anything, because all tabs are one form and one save. Backdrop click on a clean window closes it.
- **`Open in full page`** routes to the same content rendered as S5, for printing and for two-monitor work. The tab strip does not appear on S5, the sections stack down the page in tab order, and it replaces the current page rather than opening a browser tab.

### The confirm, in the detail you need to draw it

520 wide, height driven by the body text to a maximum of 420, horizontally centred at y=200, radius 0, 2px `--c-crown` border, `--shadow-window`, the same `rgba(28,31,27,0.42)` backdrop with no blur, no tab strip, and a body that does not scroll. Title bar 40px `--c-crown`, 15px/700 `--c-ink-invert`, same 26x26 square `✕`. Footer 52px with a 1px top `--c-border-item`, 20px inset, 10px button gap.

The title names the **action and the object**, `VOID TICKET 114-2938471023`, never the word "Confirm" alone. The body states the consequence as a sentence, not a question, at 20px inset in 14px/400 `--c-ink`. Under it sits a **facts block** of label and value pairs so the user re-reads what they are about to act on, labels 13px/400 `--c-ink-2` and values 14px/400 `--c-ink`. That does more work than any amount of red. No warning icon, no coloured band, no red panel.

### The panel, in the detail you need to draw it

`--c-surface` fill, 1px `--c-border-control`, **no shadow**, no radius, no icons, no keyboard shortcut hints, no submenus ever. Rows 30px, 13px/400 `--c-ink`, 18px horizontal padding, hover fill `--c-band-service`, group captions 11px/700 uppercase 0.7px `--c-ink-3`, right-aligned counts where they exist and those counts are tabular. Opens on click only, never on hover, because a menu that opens on hover opens by accident. Closes on item chosen, outside click, `Esc`, or scroll of the underlying region, and focus always returns to the trigger. A panel that would need to scroll is the wrong surface.

> **Panel widths are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** That covers the `More` panel, the row context menu, the button dropdown and the View picker panel. The View picker's **trigger** is settled at 260x30 in the control strip. The panel's width is not settled: one file says 320px and another lists it as open, so treat it as unspecified and flag it.

### The workspace, in the detail you need to draw it

The crown remains, 84px, with the correct object tab active. The page header remains, 64px. **There is no queue tab band and no box.** Content sits in bordered sections directly on the canvas field, 2px `--c-border-container`, 16px vertical gaps, each with a 32px `--c-band-header` strip labelled 12px/700 uppercase 0.7px `--c-ink-on-band`, which is the same section construction as an S2 body. No backdrop, no shadow, no modal behaviour. It is a page and browser Back works. Page gutter is 20px.

---

## 7. The chrome you must draw on every screen

Everything is horizontal and lives in the top 186px, or the top 148px on a screen with no queue band. There is **no left rail, no icon strip, no drawer, no hamburger, no command palette, no floating action button, and nothing on the left edge of the screen at any time.**

```
+==========================================================================+
| CROWN ROW 1, 44px, fill --c-crown                                        |
|  [26x26 gold tile @x20] YB TRAVEL | Brooklyn Desk        [search][Go]    |
|                                    Setup | Help | Sign Out    M. Roth    |
+--------------------------------------------------------------------------+
| CROWN ROW 2, 40px, object tabs from x20                                  |
|  Requests | Clients |[ TRAVELLERS ]| Bookings | Tickets | Reports   More |
+==========================================================================+  <- 2px --c-crown-border
| QUEUE TAB BAND, 38px WHEN PRESENT, white, 1px bottom --c-border-container|
|  <the queue tabs for this object, from 04-SCREEN-INVENTORY.md, max 7>    |
+--------------------------------------------------------------------------+
| PAGE HEADER, 64px, white, 1px bottom --c-border-container                |
|  [32x32 tile]  REQUESTS                          [Secondary] [Primary]  |
|                Needs Action Today  14 requests, 3 within four hours     |
+--------------------------------------------------------------------------+
| CANVAS --c-canvas, 16px vertical padding, 20px gutters                   |
|   +==================================================================+   |
|   |  THE BOX. White, 2px --c-border-container, radius 0, NO shadow.  |   |
|   +==================================================================+   |
+--------------------------------------------------------------------------+
```

**The signature form is a green crown with one square white notch cut out of its bottom edge.** That notch is the active object tab. It is how you recognise this product from across the room. Never round it, never inset it, never give it a gap. If your render does not show that notch, the screen is wrong.

**The second signature is that the whole product is one white rectangle on a grey-green field.** The canvas colour exists for one reason, to make the box read as a physical sheet with four visible edges. Never put content directly on the canvas. The only screens without a box are S5 workspaces.

### Crown, 84px, `--c-crown`, 2px bottom border `--c-crown-border`

Row 1, 44px: a 26x26 `--c-gold` crest tile at x=20. `YB TRAVEL` 15px/700 uppercase 1.2px tracking `--c-ink-invert`. A 1px vertical rule in `--c-crown-rule`. `Brooklyn Desk` 13px/400 `--c-crown-ink`.

Right side: a **300x30** white search field with a 1px `--c-border-control`, welded to a **56x30** `--c-gold` `[Go]` button with **zero gap and no border between them**, so the pair reads as one 356x30 object. That welded pair is unique to the crown and is not a pattern to reuse elsewhere. Then underlined white 12px/400 links `Setup | Help | Sign Out` with the pipe separators in `--c-crown-rule`. Then `M. Roth` 13px/600, which is a **label**, not an avatar, not a circle, not a photograph and not a dropdown trigger. There is no caret next to it and there is no user menu.

Row 2, 40px: object tabs from x=20, 22px horizontal padding, 14px.
- Inactive: `--c-crown-ink` label at 600, transparent fill.
- Hover: `--c-crown-hover` fill, white label.
- **Active: a solid white block, 40px tall, radius 0 on all four corners, label `--c-crown` at 14px/700, running 2px past the crown border so it merges into the white band below.**

Object tabs are: Requests, Clients, Travellers, Bookings, Tickets, Reports, then **More** right-aligned, holding Suppliers, Commissions, Agents, Admin in an S4 panel.

### Queue tab band, 38px when present, white, 1px bottom `--c-border-container`

All queues visible at rest, always, with live counts, never hidden behind a control. There is no overflow menu on this band and there never will be. 18px horizontal padding, 13px/600, no icons.
- Inactive: label `--c-ink-2`, count `--c-ink-3`.
- Active: label `--c-ink` at 700, plus a **3px `--c-gold` rule flush along the tab's bottom edge**.
- A count prints `--c-urgent` at 700 when that queue holds anything due inside four hours.
- **A count of zero prints as nothing at all.** Not "0". Nothing. "Ready to Issue" with no parentheses means empty.
- **Seven queue tabs per object maximum**, so they never overflow, never scroll and never collapse. An object needing more than seven piles has too many piles, and the surplus moves into the View dropdown, which is exactly what it is for.
- **Never invent a queue tab name.** They are owned by `04-SCREEN-INVENTORY.md` and the developer must give them to you in the brief. If a brief does not name them, write `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building` and draw placeholders labelled as placeholders.
- **Reports and every S5 workspace have no band**, and everything below them moves up 38px. **Admin is different.** Admin carries no band of queues, but it does carry the same 38px band **component** as its section navigation, per D10 and D11, so Admin's chrome height is unchanged and its page header sits at the same offset as Requests. That band is not a new surface and it is specifically not a left sidebar. Do not write that Admin has no band.

### Page header, 64px, white, 1px bottom `--c-border-container`

Left: a 32x32 square icon tile in `--c-crown` with a white glyph, at x=20. At x=64, two lines:

1. The **eyebrow**, 11px/700 uppercase 0.7px `--c-ink-3`, naming the object.
2. The **H1** at 22px/700 `--c-ink`, naming the active queue or screen, **and the count line baseline-aligned to its right**, 13px/400 `--c-ink-2`, with an 8px gap. The count line is on the same baseline as the H1. **It is not a third stacked line.** Three stacked lines do not fit comfortably in a fixed 64px header and are not what the design system specifies.

**The count line grammar is `{n} {noun}{, m within four hours}`.** For example `14 requests, 3 within four hours`, or `212 tickets`. The clause appears only when the screen holds something inside four hours. Do not write `Showing 1-14 of 61`, which is a different grammar that this product does not use. The same construction uppercased at 12px/700 with 0.6px tracking is the group header.

Right: buttons 34px tall, radius 0, 16px horizontal padding, 10px gaps.
- Primary: `--c-crown` fill, `--c-ink-invert`, 14px/600.
- Secondary: `--c-surface` fill, 1px `--c-border-control`, `--c-ink`, 14px/400.

> The **glyph set for the icon tile is NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (D18 item 17). One flat white shape per object tab plus Reports and Admin, on `--c-crown`, no radius. The tile is mandatory on every screen. Note that the "no icons in navigation" rule applies to navigation, and this tile is a page identifier that is explicitly specified as carrying a glyph.

### The box

**One box, not three.** `--c-surface`, 2px `--c-border-container`, radius 0, no shadow. Top to bottom it contains:

1. **Section header strip**, 32px, `--c-band-header`, label 12px/700 uppercase 0.7px in `--c-ink-on-band`. Item count right-aligned. When a view is chosen the strip appends the view name: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`.
2. **Control strip**, 44px, `--c-surface`. Left: a `View:` label 13px/400 `--c-ink-2`, a 260x30 select with a 1px `--c-border-control`, then underlined 12px/400 `--c-link` links `Edit` and `Create New View` separated by a pipe whose colour is unspecified. Right: the Sort select and the Show select, both 30px tall. **Sorting lives here, never on a column header.**
3. **Column header row**, 30px, `--c-band-service`, labels 12px/700 **sentence case, no uppercase, no tracking**, `--c-ink-2`. Not interactive: no hover, no focus, no sort arrow, no resize handle, no drag to reorder, no select-all control. **No bottom rule is specified on this band. Do not draw one.**
4. **Group headers**, 26px, `--c-band-service`, 12px/700 uppercase 0.6px `--c-ink-2`. Default grouping is by day. The label prints `--c-urgent` and gains a clause when the group holds anything inside four hours. **The fill never changes.** No bottom rule is specified. Do not draw one.
5. **Data rows**, 44px, a 1px `--c-border-item` rule under each, hover fill `--c-band-service`. No zebra striping and no vertical column rules, both considered and removed on purpose. Do not reintroduce either as a readability aid.
6. **Pagination**, 38px, 2px top border `--c-border-container`, `--c-band-service` fill. Numbered pages as radius-0 bordered boxes. Active page is `--c-crown` fill, `--c-ink-invert`, 700. Counts use tabular figures. **The page-box border colour, the page-box dimensions, the hover state, the disabled state and the item count string format are all NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** There is no infinite scroll and no "load more".

**Column widths are settled for one grid only**, the Requests queue list, which is the reference implementation: Request # 88px left underlined link, Client 150px left 600 weight, Trip 190px left, Stage 130px left, Waiting on fills, Fare 100px right tabular, Deadline **340px** right, Agent 74px right. The Deadline column is 340px because the longest urgent sentence, `Ticketing limit — today 3:20 PM, 3 hours left` at 15px/700, must fit on ONE line inside a 44px row, per D13. The sentence is the design, so do not shrink this column to fit another column in and never let the deadline wrap. **Column widths for any other grid are NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

---

## 8. Navigation, three levels and no more

- **L1, object tabs** in the crown. *What kind of thing am I looking at.*
- **L2, queue tabs** in the white band. *Which pile.* All visible at rest, live counts, seven per object maximum, names owned by `04-SCREEN-INVENTORY.md`.
- **L3, the View select** in the box's control strip. *Filtered how.* Choosing a view does not change the queue tab you are on, it narrows it, and the section header strip appends the view name.

There is no fourth level. Screens that are not object tabs, meaning servicing, supervisor review and finance, are queues or views under an existing object tab. If a screen needs more navigation than L1, L2 and L3 provide, the screen has too much in it.

**Window tabs exist only inside S2 `large`.** They are tabs on a dialog, not places in the app, and they never appear anywhere else, including on an S5 rendering of the same record.

URLs are real and browser Back works, but nobody navigates by URL. Every screen is at most two clicks from any other screen. The URL grammar, which you need for the `route` key of a spec block:

```
/{object}                                  redirect to that object's default queue
/{object}/{queue}                          list screen                            S1
/{object}/{queue}?view=&page=&sort=        list narrowed by an L3 saved view      S1
/{object}/{queue}/{id}/{tab}               record window over that live list      S2 large
/{object}/{id}/{tab}/full                  the same record as a full page         S5
/{object}/new                              create a record of that object         S2 large
/{object}/{action}                         an object-level action with no id      S2 large or S5
/{object}/{id}/{action}                    a record-level action                  S2 large or S5
/{object}/{id}/{action}/{step}             a multi-segment record action          S2 large or S5
```

The queue segment stays in the record window URL on purpose, because the list behind the window is real and must render. **An S3 confirm has no URL** and is never deep-linkable, because a confirmation without the context that produced it is a trap. **An S4 panel has no URL either.**

---

## 9. Urgency, deadlines, stages and status

This is the part most likely to be redesigned by someone who does not understand it, so here it is completely.

### 9.1 Five places, and none of them move the row

A ticketing time limit three hours away is expressed in five places.

**1. The deadline cell.**
- Calm: `Ticketing limit — today 3:20 PM`, 14px/400 `--c-ink`.
- Inside four hours: 15px/700 `--c-urgent`, and it **gains a clause**: `Ticketing limit — today 3:20 PM, 3 hours left`.
- Overdue: `Ticketing limit — expired 11:40 AM, 24 minutes ago`, **15px/700** `--c-overdue`. The overdue state is the same size as urgent, not larger.

**2. The Stage cell on an overdue row** replaces the stage word with `OVERDUE` at 11px/700 uppercase `--c-overdue`, no tracking.

**3. The row stays a row.** No fill, no tint, no left bar, no icon, no glyph column, no bold on the family name, no extra height. A screenshot of nine urgent rows and nine calm rows is a page of even 44px lines with nine red clauses down the right-hand side, which is exactly how a person scans a column of text.

**4. The group header speaks.** `DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS`, label printed in `--c-urgent`, band fill unchanged at `--c-band-service`.

**5. The queue tab count goes red.** Nothing else in the chrome changes.

Because the default sort is deadline ascending and the default grouping is by day, urgent rows are already at the top. They never need to be lifted there.

### 9.2 The four deadline labels and their grammar

There are exactly **four** deadline types and they are **never abbreviated**:

`Ticketing limit` · `Hold expires` · `Follow up` · `Check-in opens`

There is no fifth type. `Airline limit`, `Issue by`, `TTL`, `TL`, `Tkt limit`, `Exp`, `F/U` and `CKIN` are all defects. Spell all four in full, every time, in every density, in every column width.

**Only `Ticketing limit` and `Hold expires` ever go red.** `Follow up` and `Check-in opens` stay in ordinary ink at all times, because they are not money.

**Grammar.** Round down to whole units and pluralise: `3 hours left`, `1 hour left`, `48 minutes left`. Under one hour, use minutes. Under one minute, `less than a minute left`. Overdue reads `expired 11:40 AM, 24 minutes ago`, and past 24 hours `expired yesterday 11:40 AM`, then `expired 28 July`. The form for a deadline more than a week out, beyond a weekday name, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

**The two-deadline rule.** Every obligation carries two instants: the supplier's stated number, stored exactly as given and immutable, and our own derived action-by time. **The grid cell shows our derived action-by time as the sentence. The supplier's stated number never appears in a grid cell.** It appears in the record window's Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer. Sort and count on ours.

Which instant triggers the overdue state, the supplier's or ours, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (D18 item 31). The two answers differ by hours on every held PNR.

**Architecture that shapes what a cell can say.** Deadlines are anchored to an event, never typed, so never render one as an editable date field. Every deadline is a UTC instant plus the IANA zone it was quoted in, and countdowns compute against the deadline's own zone. The Israeli business calendar, Sunday to Thursday weeks, Friday half days, Shabbat and moving holidays, is a correctness dependency on every internal deadline. All date arithmetic is server-side and none of it happens in the browser. **PARTIAL is a first-class outcome**: three of five passports in, four of five seats confirmed, shown as `3/5` in ordinary ink, with the countdown driven from the earliest unsatisfied person, named.

Every deadline row carries an underlined `Why this date` link that opens the deadline explainer as an S2 `medium`, showing the arithmetic written out with named terms, sentences and a table. Not a formula, not a diagram, not a timeline graphic.

### 9.3 The seven booking stages

`Accepted` · `Payment pending` · `Paid` · `Ready to issue` · `Sent to ticketing` · `Ticket issued` · `Confirmation sent`

**Seven, not eight.** Any statement of eight stages is a defect. Stage is a plain word in a column in ordinary `--c-ink`. **Zero colours.** Not a dot, not a tint, not a coloured left edge, not a coloured word, not a badge. This is the single most common thing a designer will try to improve. Do not.

`OVERDUE` replaces the stage word when the row is overdue, at 11px/700 uppercase `--c-overdue`, no tracking.

**`Blocked` is a flag with a mandatory reason and a follow-up date, never a stage**, so it never appears in a Stage cell. The client onboarding machine is a **separate** lifecycle belonging to the client record, with six states, and **one screen never shows two steppers**.

### 9.4 Ticket status is its own vocabulary and is not the stage list

`issued` · `exchanged` · `refunded` · `voided` · `partially flown`

Five values, belonging to the ticket record, printed as a word in ordinary ink with no colour fill and no badge. **It never renders in a Stage cell and it is never described as a booking stage.**

Coupon status is a **third** vocabulary again, `open` · `flown` · `exchanged` · `refunded` · `void`, belonging to the coupon row. Do not merge any two of the three.

**Voided records stay visible and searchable.** Financial records are append-only, so a void or a correction cannot exist without naming the record it corrects. The void marker is the plain word `VOID` in `--c-ink-2`, never a coloured fill, never a chip, never a strikethrough, never a grey-out.

### 9.5 Two records that are never merged

The **communication log** and the **change history** are different records. `Price changed from 4,200 to 4,650` is not the same fact as `We told Ruth on the phone on 28 July and she approved it`. Never merge the two into one timeline component. Documents **version** rather than overwrite, so a renewed passport is a new row with a new number, and the superseded version stays listed and stays openable because the old book may still carry a valid visa and the old number may be printed on an issued ticket.

---

## 10. Confirmations. The policy is exhaustive

**Unnecessary confirmations train the reflex that defeats the necessary ones.** The two lists below are complete. Anything not on them gets no confirmation at all.

### Type-to-confirm. Exactly these four, and no others

The user types a specific word into a 30px input with a 1px `--c-border-control` before the destructive button enables.

| # | Action |
|---|---|
| 1 | Void a ticket |
| 2 | Issue a refund |
| 3 | Delete a client record that has bookings |
| 4 | Change a user's role |

Each of these dialogs prints the facts block: which ticket, which passenger, which amount, which user, which role. Item 4 is also the **only** supervisor-only action in the product.

> The exact literal string the user must type for each of the four is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Do not assume `VOID`, `REFUND` or `DELETE`.

### Plain S3 confirm, no typing. Exactly these five

- Release a hold
- Discard unsaved changes
- Cancel a request
- Delete a draft proposal
- Remove a traveller from a booking

### No confirmation at all. Just do it

Everything else, explicitly including every save, every navigation, every filter change, every view and sort change, marking work complete, setting or clearing the blocked flag, adding a note or a communication log entry, uploading or superseding a document, creating any record, editing any field before save, reassigning a follow-up date, changing the owning agent, sending a message or an invoice, recording a payment, saving a fee version whether forward-dated or backdated, replacing a Sabre credential, issuing tickets, cancelling a confirmed PNR, and every Admin save except changing a user's role.

If someone proposes a confirmation for an action not on the first two lists, the answer is no. An `I understand this cannot be undone` checkbox in place of a confirm does not exist in this product.

### The destructive button

**The destructive button is a SECONDARY button with a `--c-urgent` label and a 1px `--c-urgent` border.** 34px tall, radius 0, 16px horizontal padding, `--c-surface` fill.

**There is no filled red button anywhere in this product.** Danger is expressed in the sentence and in the facts block, not in a fill.

Its label is the verb and the object, `Void ticket`, `Discard`, never `OK` and never `Yes`. The other button is the ordinary secondary style and its label names the safe outcome, `Keep ticket`, `Keep editing`. The safe button sits left, the destructive button sits right, 10px gap, both right-aligned in the 52px footer.

### Keyboard behaviour in a confirm

`Esc` and backdrop click both equal the non-destructive button. `Enter` activates the destructive button **only when there is no type-to-confirm field**. Where a type-to-confirm field exists, the destructive button stays disabled until the typed string matches exactly and case-sensitively, and `Enter` inside the field does not submit. Focus lands on the non-destructive button for plain confirms, and on the type-to-confirm input for type-to-confirm dialogs.

> The **disabled appearance of any control**, including the destructive button before the string matches, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not invent a grey.

---

## 11. Focus. One treatment, everywhere

`--focus-ring` (2px solid `--c-crown`) at `--focus-offset` (1px), on **every** interactive element in the product without exception: buttons, inputs, selects, checkboxes, radios, links, object tabs, queue tabs, window tabs, data rows, panel menu items, pagination pages, and the window close button.

It reads as a square ring just outside the element's own square edge. **Never a glow, never a colour change, never a radius, never a shadow.** It is a single global rule, so you do not need to restate it per component, but you do need to draw it wherever you show a focused element.

---

## 12. Form primitives

| Thing | Value |
|---|---|
| Form field row height | 34px, or auto for a textarea |
| Rule between field rows | 1px `--c-border-field` |
| Label column | 180px, 13px/400 `--c-ink-2`, right-aligned, 12px gutter |
| Value column | fills the remaining width |
| Input and select | 30px tall, 1px `--c-border-control`, 0 radius, `--c-surface` fill, 13px control text |
| Required marker | the word `Required` at 11px/700 uppercase `--c-ink-3` after the label. **No asterisk.** |
| Validation error | 13px/400 `--c-urgent` on its own line under the control, plus a 1px `--c-urgent` border on the control. The field fill does not change, it stays `--c-surface`. No icon. |
| Checkbox | **14x14**, 1px `--c-border-control`, `--c-crown` fill with a white check when on |
| Radio | **14x14 square** with a 6x6 `--c-crown` centre square when on. There are no circles in this product. |
| Textarea | same border as an input, minimum height 68px, resizable vertically only |
| Help text | 13px/400 `--c-ink-3` under the control |
| Button | 34px tall, 16px horizontal padding, 10px gaps, 0 radius |

Errors appear on blur and on save, never on every keystroke. The message names the fix, not the failure: `Enter a date on or after the departure date`, not `Invalid date`. On save with errors, the page message band prints the count of fields needing attention and the form scrolls to the first error field and focuses it.

### The "Client has not provided this yet" checkbox, and why it exists

**Every field that a client is expected to supply carries a checkbox in its value column labelled `Client has not provided this yet`.** Ticking it clears and disables the field, records the state, and satisfies the form.

**Missing-information reports read this value. They never count blanks.**

This is the mechanism that stops offshore staff typing a fake passport number under time pressure, which is a real failure this agency has lived through. A blank field is ambiguous: it might mean nobody asked, it might mean the client refused, it might mean the agent got distracted. An explicit recorded "not provided yet" is unambiguous and it is reportable. **It is not optional and it is not a nicety.**

Two consequences for your designs. **There are no mandatory fields on intake forms**, because mandatory fields cause fabricated data, so inline errors on intake are only ever for malformed values and never for absent ones. And **the not-provided state must be drawn as a real displayed value**, not as an empty cell, wherever intake data is shown, in the record window, in the grid and in a report.

---

## 13. Feedback states

There are no toasts, no snackbars, and nothing that auto-dismisses while carrying information the user needs. These are states of S1 and S2, not surfaces of their own.

| State | Treatment |
|---|---|
| **Page message band** | The product's single mechanism for "here is what happened". Directly under the page header, full page width inside the gutters. 38px minimum, auto beyond that. Fill `--c-band-service`, always, it never turns red, green or amber. 2px `--c-urgent` left border for the error case. 14px horizontal and 10px vertical padding, 13px/400 `--c-ink`, radius 0, no icon. Kinds are distinguished by the words and the ink: success and information in `--c-ink`, problem and blocking failure in `--c-urgent` at 700. Success bands persist until the next navigation or an explicit underlined `Dismiss` link. Problem bands persist until the condition clears. Inside an S2 the same band renders at the top of the body. **`--c-overdue` is never used on a message band**, because it means a passed deadline and nothing else. |
| **Empty** | Inside the box, below the column header row, replacing the data rows. The box, its border, its section header strip, its control strip and its column headers all stay. **160px tall**, centred vertically, left-aligned at the 14px box inset. Line 1: 14px/400 `--c-ink`, states what is empty. Line 2: 13px/400 `--c-ink-2`, states the way out, usually as an underlined `--c-link`. **No illustration, no icon, no emoji, no button, no centred hero, no large friendly type.** Always state what does exist elsewhere and how to get there, and distinguish empty-because-filtered from empty-because-nothing-exists. The per-screen copy is owned by `04-SCREEN-INVENTORY.md`, so use a placeholder and say so. |
| **Loading** | The box renders immediately with its border, section strip, control strip and column headers. Only the data rows are pending, drawn as **up to 10 rows of 44px `--c-band-service` fill** with the 1px `--c-border-item` rule under each. **No spinner, no skeleton shimmer, no progress bar, anywhere in the product.** The layout does not move when data arrives, and the item count prints nothing until the count is known. Past 10 seconds a page message band appears reading, verbatim, `Still loading. The connection to Sabre may be slow.` |
| **Error** | The page message band above. **Never a toast.** |
| **Not found** | The box renders with one line, `That record does not exist, or it was deleted.`, plus an underlined link back to the queue. The crown, the band and the page header stay intact. No 404 illustration, no "go home" button. The crown is the way home. |
| **Permission denied** | **There is no permission-denied state.** The product has two roles, Booking agent and Supervising agent, and both can do everything operational. Supervisor review is after the fact, not a gate. Any design that hides a queue, hides a row, disables a button by role or prints a denial band is a defect. The single exception is changing a user's role, which is supervisor-only, and how that one control presents to a booking agent is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. |

> The **left border treatment for success and information bands** and the **maximum number of stacked bands before they collapse** are both **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. So is **whether pagination renders under an empty state**.

---

## 14. What this product does not have

Absence is a design decision here, and agents fill absences with defaults. Do not.

- No left sidebar
- No icons in navigation
- No icon rail, no drawer, no hamburger
- No rounded corners
- No shadows except `--shadow-window` on S2 and S3
- No gradients
- No chips, pills, badges or tags
- No coloured status fills
- No circular avatars and no photographs. Initials in squares only.
- No zebra striping
- No vertical column rules
- No command palette
- No keyboard-first navigation model
- No dark mode
- No density toggle and no compact mode
- No drag and drop
- No kanban board
- No animation beyond an instant state change
- No auto-dismissing toasts carrying information the user needs
- No infinite scroll and no "load more". Numbered explicit pagination.
- No monospace
- No emoji
- No sortable or resizable column headers
- No user menu on the crown
- No floating action button
- No record pager, no next and previous arrows inside a window
- No tooltip carrying information the user needs to act on
- No popover card on hover
- No permission-denied state
- No progress stepper wizard
- No second SAVING modal stacked on a modal (an S3 confirm and a
  read-only S2 `medium` over an S2 `large` are legal, per D1)
- No spinner, no skeleton shimmer, no progress bar
- No "export to PDF" button in v1. Print to PDF via the browser is the answer.

And the big one:

**NO COLOUR-CODING OF BOOKING STAGE.** Stage is a word in a column in ordinary ink. **Seven stages, zero colours.** This is the single most common thing a designer tries to improve. Do not.

If a brief asks for one of these, the brief is wrong or it is for a different product. Raise it with the conflict protocol in section 17. Do not silently add it.

### Density, the honest trade

44px rows and 14px type give roughly 14 rows on a 900px viewport. That is low compared to the alternatives that were rejected, and it was chosen deliberately: staff range widely in age and technical confidence, the screen has to be readable across a desk, and any screen can be printed and put in a folder.

**Do not fix this by shrinking rows.** If a user needs more rows, the answer is a better filter or a saved view, not smaller type.

---

## 15. THE NEW SCREEN CHECKLIST

Run this list **before you return any design**. Answer every item explicitly in your response, as a numbered list, with a one-line answer each. `Not applicable` is a legal answer where an item genuinely does not apply, but silence is not. **A design returned without this checklist is incomplete and the developer will reject it.**

1. Does **every** colour value come from the token table in section 3, referenced by variable name? Any raw hex in your output that is not a quote of a token definition is a failure.
2. Is **every** corner radius zero? Including buttons, inputs, selects, checkboxes, radios, tiles, initials, dialogs, panels, pagination boxes and the `✕` button.
3. Is every surface you drew one of exactly **S1 box, S2 window, S3 confirm, S4 panel, S5 workspace**? Name each one you used. Any other surface is a failure.
4. If you drew an S2, is it exactly `large` 1120x760 at x=160 y=70, `medium` 820x620 centred at y=90, or `small` 520 wide centred at y=200? Name the size.
5. Is shadow either **none**, or `--shadow-window` on an S2 or an S3 and on nothing else? S1, S4 and S5 carry no shadow.
6. Is **every** heading a filled band, `--c-band-header` or `--c-band-service`, with no bold text floating in whitespace?
7. Are the two structural border weights doing their work, 2px `--c-border-container` for containers and 1px `--c-border-item` for list items, with no third structural weight invented?
8. Is urgency expressed as a **sentence** that changes what the row says, with no fill, tint, bar, icon, glyph column, pinning or reordering?
9. Does **any** hyperlink lack a permanent underline? Links are underlined at rest, not on hover. Panel menu rows are not links and are not underlined.
10. Is the data row height **exactly 44px**, with no compact variant?
11. Does the **crown notch still read**? The active object tab must be a solid white block running 2px past the crown's bottom border.
12. Is there anything at all on the **left edge** of the screen? There must not be.
13. Are all fixed heights taken verbatim from section 5? List the ones your screen uses and their values.
14. Is the chrome built as a flex column rather than absolute y offsets, and did you correctly include or omit the 38px queue band for this screen class?
15. Is the whole list content inside **one** white box, with nothing sitting directly on `--c-canvas`, unless this is an S5 workspace, which has no box by definition?
16. Are the **queue tab names taken from the brief**, not invented, at most **seven**, all visible at rest with live counts?
17. Does a count of zero print as **nothing at all**, in the queue band and in window tab labels?
18. Is the page header's **count line baseline-aligned to the right of the H1**, not stacked as a third line, and does it use the grammar `{n} {noun}{, m within four hours}`?
19. Is booking stage rendered as a **plain word in ordinary ink**, with no colour, fill, dot or badge, and are there **seven** stages, not eight?
20. If a ticket appears, is its status one of `issued`, `exchanged`, `refunded`, `voided`, `partially flown`, and is it kept out of any Stage cell?
21. Are all four deadline types spelled in full, `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`, with no abbreviation anywhere?
22. Do only `Ticketing limit` and `Hold expires` ever use `--c-urgent` or `--c-overdue`?
23. Does the grid cell show **our derived action-by time only**, with the supplier's stated number kept out of the grid?
24. Is `tabular-nums` applied to **every right-aligned numeric or currency column** and to nothing left-aligned, and is there **no monospace font** anywhere?
25. Is the largest text on the screen the 22px H1, and is the only grid text above 14px a deadline at 15px?
26. Are all weights 400, 600 or 700, in Tahoma, Verdana, Geneva, sans-serif, with no second family?
27. Is `--c-good` used as text only, never as a fill? Is `--c-crown-rule` used only inside the crown? Is the section strip label `--c-ink-on-band`?
28. Are all buttons 34px, inputs and selects 30px, checkboxes and radios 14x14 squares, with 16px horizontal button padding and 10px gaps?
29. Does every interactive element you drew in a focused state use `--focus-ring` at `--focus-offset`, with no glow and no colour change?
30. If this screen carries intake data, is the `Client has not provided this yet` checkbox present on every field a client supplies, and is that state drawn as a displayed value rather than a blank?
31. If you drew a confirmation, is the action on one of the two lists in section 10? Is the destructive button a **secondary button with a `--c-urgent` label and a 1px `--c-urgent` border**, with no filled red button anywhere?
32. If this is an S2, is the body the **only** scrolling region, is the title bar non-draggable, is there exactly one modal on screen, and is the footer `[Save]` secondary then `[Save & Close]` primary, or a single `[Close]` on a read-only `medium`?
33. Does the screen avoid every item on the "does not have" list in section 14? Name any you were tempted by and what you did instead.
34. Have you emitted the **spec block** required by section 16, complete, with every key present?
35. Have you flagged every value you could not source as **`NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`** rather than inventing it?

---

## 16. THE SPEC BLOCK CONTRACT

**This is the most important output you produce.** The visual is for the developer. The spec block is for the coding agent. Every time you design a new screen, tab, dialog, panel or component, you must **also** emit a machine-readable spec block in the exact format below. The developer appends it to the design system so the coding agent stays bound to it. A drawing without a spec block is a picture. A drawing with one is a specification.

### Format

A fenced code block with the language tag `consulate-spec`. YAML syntax. **Keys in the order given. Do not add keys. Do not omit keys**, and where a key does not apply write `not applicable`, and where a value is unknown write `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`.

```
name:            Human name of the screen or component.
kind:            screen | record-window-tab | confirm | panel | workspace |
                 component | empty-state
route:           URL path from the grammar in section 8, or "none" for an S3
                 confirm and an S4 panel, which have no URL.
surface:         Exactly one of: S1 box | S2 window | S3 confirm | S4 panel |
                 S5 workspace.  Any other value is illegal.
size:            large | medium | small, for S2 and S3 only. Otherwise
                 "not applicable".
shadow:          none | shadow-window.  shadow-window is legal only when
                 surface is S2 or S3.
radius:          0                     (always, no exceptions)
chrome:
  object_tab:    Which L1 tab is active.
  queue_tabs:    "The <object> queue tabs from 04-SCREEN-INVENTORY.md, in that
                 file's order, seven maximum", or "not applicable" where the
                 screen class carries no band. Never an invented list.
  page_header:   icon tile, eyebrow, h1, count line, buttons, exactly as they read.
regions:         Ordered top to bottom. Each entry:
  - id:          Short slug.
    height:      Pixels from the fixed-height table, or "content" for a
                 scrolling body, or "auto" where the design system says auto.
    fill:        Token name.
    border:      Weight, token, edge. Or none. Do not invent a rule that the
                 design system does not specify.
    content:     What is in it, with type sizes, weights, tracking and case.
tokens:          Flat list of every token this design uses. No hex.
type:            Every distinct type treatment used, as
                 "size/weight tracking case token-name usage".
states:          Named states with their exact visual delta. Include hover,
                 focus, active, disabled, empty, loading, error, urgent,
                 overdue and partial wherever they apply.
data:            The fields this screen reads and writes. Include the deadline
                 pair (supplier stated and immutable, ours derived) wherever a
                 deadline appears, and the "client has not provided this yet"
                 value wherever intake data appears.
interactions:    Click targets and what each one opens. Name the surface by its
                 S-code every time.
must_never:      Screen-specific prohibitions. At least five. Written as
                 imperatives.
unspecified:     Every value you could not source. Each written as
                 "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before
                 building: <what>", citing the D18 item number where one exists.
```

### Worked example A, a list screen

The brief given to you was: *"Design the Tickets list screen. One ticket record per passenger. Staff need to see ticket status and spot voided tickets."*

Your visual would be the standard list screen from section 7. This is the spec block that must accompany it. Every value in it is sourced from the token table, the fixed heights, the surface list or the arbiter, and everything that is not sourced is in `unspecified` rather than in the body.

```consulate-spec
name: Tickets Queue List
kind: screen
route: /tickets/{queue}, default /tickets/all
surface: S1 box
size: not applicable
shadow: none
radius: 0

chrome:
  object_tab: Tickets
  queue_tabs: >
    The Tickets queue tabs from 04-SCREEN-INVENTORY.md, in that file's order,
    seven maximum. All visible at rest with live counts, 13px/600, 18px padding,
    active label --c-ink 700 with a 3px --c-gold rule flush along the tab's
    bottom edge, inactive label --c-ink-2 with an --c-ink-3 count. A count of
    zero prints nothing at all. A count prints --c-urgent 700 when that queue
    holds anything due inside four hours. Not restated here, because inventing
    a queue name is a defect.
  page_header:
    height: 64
    icon_tile: 32x32 --c-crown fill, white glyph, at x=20
    eyebrow: '"TICKETS" 11px/700 uppercase 0.7px --c-ink-3'
    h1: 'the active queue name, 22px/700 --c-ink, at x=64'
    count_line: >
      "{n} tickets{, m within four hours}" 13px/400 --c-ink-2, baseline-aligned
      to the right of the H1 with an 8px gap. Not a third stacked line.
    buttons:
      - label: "Export"
        type: secondary
        spec: 34px tall, --c-surface fill, 1px --c-border-control, --c-ink 14px/400, 16px h-padding, radius 0
      - label: "Issue Tickets"
        type: primary
        spec: 34px tall, --c-crown fill, --c-ink-invert 14px/600, 16px h-padding, radius 0
    button_gap: 10px

regions:
  - id: box
    height: content
    fill: --c-surface
    border: 2px --c-border-container all edges
    content: >
      The one box, radius 0, no shadow, on the --c-canvas field with a 20px
      gutter and 16px canvas vertical padding. Contains the six regions below
      in this order. Nothing sits directly on the canvas.

  - id: section-strip
    height: 32
    fill: --c-band-header
    border: none
    content: >
      Left "TICKETS — ALL TICKETS" 12px/700 uppercase 0.7px --c-ink-on-band,
      appending the active view name as a third segment when a view is chosen.
      Right the item count, 12px/700, --c-ink-on-band.

  - id: control-strip
    height: 44
    fill: --c-surface
    border: none
    content: >
      Left "View:" 13px/400 --c-ink-2, then a 260x30 select, 1px
      --c-border-control, radius 0, value 13px/600. Then underlined 12px/400
      --c-link links "Edit" and "Create New View" separated by a pipe.
      Right the Sort select and the Show select, both 30px tall. Sorting lives
      here and never on a column header.

  - id: column-header
    height: 30
    fill: --c-band-service
    border: none
    content: >
      Labels 12px/700 sentence case, no uppercase, no tracking, --c-ink-2.
      Columns in order: Ticket number | Passenger | PNR | Carrier | Route |
      Issued | Status | Fare | Commission | Agent.
      Fare and Commission are right-aligned and tabular. No vertical column
      rules. Not interactive: no hover, no sort arrow, no resize handle.

  - id: group-header
    height: 26
    fill: --c-band-service
    border: none
    content: >
      12px/700 uppercase 0.6px --c-ink-2, reading "ISSUED TODAY — 6 TICKETS".
      Label prints --c-urgent and gains a clause only when the group holds an
      obligation inside four hours. The fill never changes.

  - id: data-row
    height: 44
    fill: --c-surface
    border: 1px --c-border-item bottom
    content: >
      14px/400 --c-ink. Ticket number is an underlined --c-link. Status is a
      plain word in --c-ink from the five-value ticket vocabulary, with no
      colour, no fill and no badge. Fare and Commission are right-aligned and
      tabular. No zebra striping, no vertical rules, no extra height.

  - id: pagination
    height: 38
    fill: --c-band-service
    border: 2px --c-border-container top
    content: >
      Numbered pages as radius-0 bordered boxes. Active page --c-crown fill,
      --c-ink-invert, 700. Counts use tabular figures. No infinite scroll and
      no "load more".

tokens:
  - --c-crown
  - --c-crown-border
  - --c-crown-hover
  - --c-crown-rule
  - --c-crown-ink
  - --c-gold
  - --c-link
  - --c-canvas
  - --c-surface
  - --c-band-header
  - --c-band-service
  - --c-border-container
  - --c-border-item
  - --c-border-control
  - --c-ink
  - --c-ink-2
  - --c-ink-3
  - --c-ink-invert
  - --c-ink-on-band
  - --c-urgent
  - --focus-ring
  - --focus-offset
  - --radius
  - --gutter
  - --pad-box

type:
  - 22/700 none sentence --c-ink, h1
  - 15/700 1.2px uppercase --c-ink-invert, wordmark
  - 14/700 none sentence --c-crown, active object tab
  - 14/600 none sentence --c-crown-ink, inactive object tab
  - 14/600 none sentence --c-ink-invert, primary button
  - 14/400 none sentence --c-ink, secondary button and grid body
  - 13/600 none sentence --c-ink, active queue tab and select value
  - 13/400 none sentence --c-ink-2, count line and control labels
  - 12/700 0.7px uppercase --c-ink-on-band, section header strip
  - 12/700 0.6px uppercase --c-ink-2, group header
  - 12/700 none sentence --c-ink-2, column header
  - 12/400 none sentence underlined --c-link, inline view links
  - 11/700 0.7px uppercase --c-ink-3, eyebrow

states:
  row_hover:
    delta: Fill becomes --c-band-service. Nothing else changes. No lift, no border change, no shadow.
  row_focus:
    delta: --focus-ring at --focus-offset. No colour change, no glow, no radius.
  status_voided:
    delta: >
      Status cell reads the word "VOID" in --c-ink-2, 14px/400. The row stays
      44px, stays in sort order, stays searchable and keeps ordinary ink
      everywhere else. No strikethrough, no grey-out, no fill, no badge.
  queue_count_zero:
    delta: The queue tab count prints nothing at all. Not "0". Nothing.
  queue_count_urgent:
    delta: The queue tab count prints --c-urgent at 700 when that queue holds anything due inside four hours.
  empty:
    delta: >
      160px block inside the box below the column header row, replacing the
      data rows. Line 1 14px/400 --c-ink, line 2 13px/400 --c-ink-2 with an
      underlined --c-link way out. Box, border, section strip, control strip
      and column headers all stay. No illustration, no icon, no button.
      Copy is owned by 04-SCREEN-INVENTORY.md.
  loading:
    delta: >
      Up to 10 rows of 44px --c-band-service fill in place of data rows, each
      with its 1px --c-border-item rule. No spinner, no shimmer, no progress
      bar. Item count prints nothing until known. Past 10 seconds a page
      message band reads "Still loading. The connection to Sabre may be slow."
  error:
    delta: >
      Page message band directly under the page header, 38px minimum,
      --c-band-service fill, 2px --c-urgent left border, 13px/400 --c-ink,
      problem text --c-urgent at 700. Never a toast.
  not_found:
    delta: 'Box renders one line, "That record does not exist, or it was deleted.", plus an underlined link back to the queue.'
  partial:
    delta: 'Renders as "3/5" in ordinary --c-ink. Countdown drives off the earliest unsatisfied passenger, named.'

data:
  - ticket_number, left-aligned, underlined --c-link, Tahoma, never monospace, never tabular
  - passenger_id, legal passport name as printed on the document
  - pnr_locator, left-aligned, proportional
  - carrier
  - route
  - request_id, displayed as an underlined link
  - issued_at, a UTC instant plus the IANA zone it was quoted in, rendered proportional
  - ticket_status, one of: issued, exchanged, refunded, voided, partially flown.
    Five values. This is NOT the booking stage list and never renders in a Stage cell.
  - fare_amount, currency, right-aligned, tabular
  - commission_amount, currency, right-aligned, tabular
  - void_reference, the record this correction names, required on any void,
    because financial records are append-only
  - not_provided_flag, the explicit "Client has not provided this yet" value,
    read by missing-information reports, never inferred from a blank

interactions:
  - target: ticket number link, single click
    opens: S2 window, size large, at /tickets/{queue}/{id}/ticket, over the live list
  - target: data row, double click
    opens: S2 window, size large, same route
  - target: request link in a row
    opens: S2 window, size large, for that request, over the live list
  - target: View select in the control strip
    opens: S4 panel, --c-surface, 1px --c-border-control, no shadow, no radius,
      30px rows, 11px/700 uppercase 0.7px --c-ink-3 group captions,
      right-aligned tabular counts
  - target: data row, right click
    opens: S4 panel, the row context menu, at the pointer. Right-clicking selects
      the row first. Destructive actions do not appear here.
  - target: Void ticket, inside the S2 record window only
    opens: S3 confirm, size small, type-to-confirm, destructive button is a
      secondary button with a --c-urgent label and a 1px --c-urgent border

must_never:
  - Never colour-code ticket status. It is a word in ordinary ink, and it is not a booking stage.
  - Never strike through, grey out, badge or hide a voided ticket. It stays visible and searchable, marked with the word VOID in --c-ink-2.
  - Never abbreviate a deadline type anywhere on this screen. All four are spelled in full.
  - Never set a ticket number, PNR or passport number in monospace, and never give a left-aligned column tabular figures.
  - Never sort a voided or urgent ticket out of its natural deadline-ascending position.
  - Never render more rows by shrinking the row. 44px is fixed and there is no compact mode.
  - Never place a filter, an action, an icon or anything else on the left edge of the viewport.
  - Never draw a rule under the column header band or the group header band. The design system specifies neither.

unspecified:
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: column widths for the Tickets grid. D13 fixes widths for the Requests reference grid only."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the pagination page-box border colour, page-box dimensions, hover state, disabled state and item count string format."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the icon tile glyph set for the page header."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the colour of the pipe separator between Edit and Create New View."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the S4 View picker panel width."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the selected-row treatment that the row context menu depends on."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the empty state copy for each Tickets queue, owned by 04-SCREEN-INVENTORY.md."
```

### Worked example B, a confirm dialog

The brief given to you was: *"Design the confirmation for voiding a ticket."* Voiding a ticket is item 1 on the type-to-confirm list, so it confirms, and it confirms by typing.

```consulate-spec
name: Void Ticket Confirm
kind: confirm
route: none. An S3 confirm has no URL and is never deep-linkable.
surface: S3 confirm
size: small
shadow: shadow-window
radius: 0

chrome:
  object_tab: unchanged behind the backdrop, whichever screen raised the confirm
  queue_tabs: unchanged behind the backdrop
  page_header: unchanged behind the backdrop

regions:
  - id: backdrop
    height: viewport
    fill: rgba(28,31,27,0.42)
    border: none
    content: No blur. The screen behind stays legible around the edges.

  - id: title-bar
    height: 40
    fill: --c-crown
    border: none
    content: >
      "VOID TICKET 114-2938471023" 15px/700 uppercase 0.3px --c-ink-invert,
      16px inset. Names the action and the object, never the word "Confirm"
      alone. Right, a 26x26 square close button with a --c-crown-border hover
      fill. No "Open in full page" link, which is large only.

  - id: body
    height: auto, to a maximum of 420 total dialog height
    fill: --c-surface
    border: none
    content: >
      20px inset, does not scroll. Consequence sentence 14px/400 --c-ink:
      "Voiding this ticket cannot be reversed. The void is reported to the
      carrier and the commission is recalled. The ticket stays visible and
      searchable, marked void." Then a facts block, labels 13px/400 --c-ink-2
      and values 14px/400 --c-ink: Ticket, Passenger, Issued, Fare. Then
      "Type [WORD] to confirm" 13px/600 --c-ink above a 30px input with a
      1px --c-border-control. No warning icon, no coloured band, no red panel.

  - id: footer
    height: 52
    fill: --c-surface
    border: 1px --c-border-item top
    content: >
      20px inset, buttons right-aligned with a 10px gap.
      "[Keep ticket]" secondary, then "[Void ticket]" destructive.
      The destructive button is a secondary button with a --c-urgent label and
      a 1px --c-urgent border, 34px tall, 16px h-padding, radius 0.
      There is no filled red button in this product.

tokens:
  - --c-crown
  - --c-crown-border
  - --c-surface
  - --c-border-item
  - --c-border-control
  - --c-ink
  - --c-ink-2
  - --c-ink-invert
  - --c-urgent
  - --shadow-window
  - --focus-ring
  - --focus-offset
  - --radius

type:
  - 15/700 0.3px uppercase --c-ink-invert, title bar
  - 14/400 none sentence --c-ink, consequence sentence and fact values
  - 14/400 none sentence --c-urgent, destructive button label
  - 13/600 none sentence --c-ink, the type-to-confirm instruction
  - 13/400 none sentence --c-ink-2, fact labels

states:
  destructive_disabled:
    delta: "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the disabled appearance of any control. The button stays disabled until the typed string matches exactly and case-sensitively."
  destructive_enabled:
    delta: Secondary button, --c-urgent label, 1px --c-urgent border, --c-surface fill. No fill change on enable.
  focus:
    delta: --focus-ring at --focus-offset. On open, focus lands on the type-to-confirm input.
  dismissal:
    delta: Esc and backdrop click both equal "Keep ticket". Enter inside the type-to-confirm field does not submit.

data:
  - ticket_number
  - passenger_id, legal passport name
  - issued_at, UTC instant plus IANA zone
  - fare_amount, currency, right-aligned, tabular
  - void_reference, the record this void names. Financial records are append-only.
  - typed_confirmation_string, compared case-sensitively and exactly

interactions:
  - target: "Keep ticket" secondary button
    opens: nothing. Closes the S3 and returns focus to the trigger.
  - target: "Void ticket" destructive button
    opens: nothing. Performs the void and returns to the S2 or S1 beneath.
  - target: close button, Esc, backdrop click
    opens: nothing. All three equal "Keep ticket".

must_never:
  - Never use a filled red button. The destructive button is secondary with a --c-urgent label and a 1px --c-urgent border.
  - Never title this dialog "Confirm" or "Are you sure". Name the action and the object.
  - Never add a warning icon, a red band or a coloured panel. The sentence carries the danger.
  - Never stack a second modal over this one. Nothing at all sits on an S3, and over an S2 `large` only an S3 confirm and a read-only S2 `medium` may sit, per D1.
  - Never offer an "I understand this cannot be undone" checkbox. That pattern does not exist here.
  - Never let Enter submit while a type-to-confirm field is present.
  - Never scroll this body. If the content does not fit in 420px, the content is wrong.

unspecified:
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the literal string the user must type to void a ticket. Do not assume VOID."
  - "NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building: the disabled appearance of the destructive button, fill, border and ink."
```

That is the standard. **Every screen you return gets one of these. No exceptions, including for a single component, a panel or a dialog.**

---

## 17. What to do when a request conflicts with the design system

You will be asked for things this system forbids. Someone will ask for a status colour, a sidebar filter panel, a card grid, a toast, a compact table, a red delete button. **Do not silently comply, and do not silently refuse.**

Respond in exactly this shape, **before you draw anything**:

```
CONFLICT
Requested: <the thing that was asked for, in one line>
Conflicts with: <the exact rule, quoted from this brief, with its section number>
Why the rule exists: <one line>
CONSULATE-native alternative: <a concrete, buildable design that achieves the
same user goal inside the rules>
```

Then design the alternative and emit its spec block. If the requester overrides you afterwards, they own it, but they must say so explicitly and in writing. An override is never implied by silence and never inferred from a follow-up prompt that simply repeats the request.

Worked examples of the translation you are expected to make:

| Requested | Conflicts with | CONSULATE-native answer |
|---|---|---|
| Colour-code booking stage | Section 14, "no colour-coding of booking stage. Seven stages, zero colours." | Group the list by stage. The group header band says which stage and how many. Stage stays a plain word in the column. |
| Pin urgent requests to the top | Rule 5, "nothing is pinned, duplicated or lifted out of sort order" | The default sort is already deadline ascending. Make the group header speak: `DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS` with the label in `--c-urgent`. |
| A left filter sidebar | Section 7, "nothing on the left edge of the screen at any time" | Add it as a saved view in the L3 View select, and let the section header strip append the view name. If it deserves permanence, it is a queue tab, up to the cap of seven. |
| A status badge or chip | Section 14, "no chips, pills, badges or tags" | A word in a column in ordinary ink. If it needs emphasis, it becomes a sentence in the deadline cell. |
| A toast confirming a save | Section 13, "no auto-dismissing toasts carrying information the user needs" | The page message band directly under the page header, `--c-band-service` fill, 13px/400 `--c-ink`, persisting until the next navigation or an explicit underlined `Dismiss`. Inside a window it renders at the top of the body. |
| A red Delete button | Section 10, "there is no filled red button anywhere in this product" | A secondary button with a `--c-urgent` label and a 1px `--c-urgent` border, in an S3 confirm whose body states the consequence and prints the facts. |
| A confirmation on "mark complete" | Section 10, "unnecessary confirmations train the reflex that defeats the necessary ones" | No dialog. Marking work complete is on the no-confirmation list. If the action needs a gate, the gate is a mandatory reason field, as it is for the blocked flag. |
| Compact row density toggle | Section 14, "no density toggle. 44px rows are fixed." | A better filter, or a saved view that returns fewer rows. |
| Open a second record window | Section 6, "only one modal exists at a time" | Close the current window and open the new one, subject to the unsaved-changes confirm. The list behind is never destroyed, so the user keeps their place. |
| Monospace for ticket numbers | Section 4, "no monospace anywhere in the product" | Tahoma 14px/400, left-aligned and proportional. Tabular figures belong to right-aligned numeric and currency columns only. |
| A tooltip explaining the deadline | Section 6, "no tooltip carrying information the user needs to act on" | The underlined `Why this date` link opening the deadline explainer as an S2 `medium`, with the arithmetic written out in sentences and a table. |
| A progress stepper for the client and the booking on one screen | Section 9.3, "one lifecycle per record. One screen never shows two steppers." | Client onboarding lives on the client record with its six states. Booking stages live on the request with its seven. Cross-reference by link, never by a second stepper. |
| An eighth queue tab | Section 7, "seven queue tabs per object maximum" | Move the least-worked pile into the View select, where it keeps its live count and its name in the section header strip. |

---

## 18. Worked prompts. Copy one and fill in the angle brackets

Each of these produces a design that passes the checklist in section 15. The developer must paste the queue tab names in, because this brief does not carry them.

### 18.1 Design a new list screen

```
Design the <OBJECT> list screen for CONSULATE, following 05-CLAUDE-DESIGN-BRIEF.md exactly.

Route: /<object>/<queue>
Object tab active: <Requests | Clients | Travellers | Bookings | Tickets | Reports>
Queue tabs (L2): <paste the queue tabs for this object from 04-SCREEN-INVENTORY.md,
  in that file's order, with the counts they show at rest. Seven maximum.
  Do not invent or reorder them.>
Columns: <list them, in order, with alignment>
Default sort: deadline ascending. Default grouping: by day.
Primary button: <label>. Secondary button: <label>.

Draw the full chrome as a flex column: crown rows 1 and 2 with the white notch on
the active object tab, the 38px queue tab band, the 64px page header with the
eyebrow above and the H1 and count line on one baseline, the canvas, and one box
containing section strip, control strip, column header row, group header, at least
10 data rows and pagination.

Surface is S1, the box. No shadow anywhere on this screen.

Show three deadline states in the grid: calm at 14px/400 --c-ink, inside four hours
at 15px/700 --c-urgent with the extra clause, and overdue at 15px/700 --c-overdue
with OVERDUE replacing the stage word. Show one hovered row and one focused row.

Then run the New Screen Checklist and emit the consulate-spec block.
```

### 18.2 Design a new record window tab

```
Design the "<TAB NAME>" tab of the CONSULATE record window, following
05-CLAUDE-DESIGN-BRIEF.md exactly.

Record: <Request R-10482 — KAPLAN, 5 PASSENGERS>
Window tab strip: <the tabs for this object, with "<TAB NAME>" active and
  parenthesised counts where records exist. Eight tabs maximum. A count of zero
  prints nothing.>
Body sections, top to bottom: <name each bordered section and what it contains>

Surface is S2, size large: 1120x760 at x=160, y=70. Backdrop rgba(28,31,27,0.42),
no blur, with the list and the crown legible around the edges. 2px --c-crown border,
--shadow-window. Title bar 40px, not draggable, with "Open in full page" and the
26x26 square close button. Tab strip 34px --c-band-header. Body 630px is the only
scrolling region, 20px inset, sections 1076px wide, 2px --c-border-container, 16px
gaps, each with a 32px --c-band-header strip labelled 12px/700 uppercase 0.7px
--c-ink-on-band. Footer 52px, 1px --c-border-item top rule, [Save] secondary then
[Save & Close] primary, 10px gap.

Every field a client supplies carries the "Client has not provided this yet"
checkbox in its value column. Draw at least one field in that ticked state.

Draw the list partially visible behind the backdrop.

Then run the New Screen Checklist and emit the consulate-spec block.
```

### 18.3 Design a settings page

```
Design the "<SETTING AREA>" administration page for CONSULATE, following
05-CLAUDE-DESIGN-BRIEF.md exactly.

Route: /admin/<slug>
Object tab active: More, with Admin chosen from its panel.

Surface is S1, the box, on the canvas, with the standard chrome above it. This is a
page, not a modal. There is no settings surface in this product.

Admin carries no band of queues. It reuses the same 38px band component as its
section navigation, with the same geometry and the same active treatment: 13px/600,
active label --c-ink at 700 with a 3px --c-gold rule flush along the bottom edge.
The eight Admin sections are: Users & Roles, Categories & Fees, Message Templates,
Deadline Rules, Escalation Ladders, Sabre Accounts, QuickBooks Mapping,
Audit & Security. Do not add a ninth and do not build an index screen.
Do not use a left settings nav. There is no exemption from the no-sidebar rule.

Structure the content as stacked bordered sections inside the one box, each with a
32px --c-band-header section header strip, exactly like a record window body but on
the page. Use 30px inputs and selects, 34px buttons, 14x14 square checkboxes and
radios, 1px --c-border-control on controls, 1px --c-border-field between field rows,
180px right-aligned label column at 13px/400 --c-ink-2.

Editing an Admin record opens S2 large, unchanged. There is no bespoke settings form.

If the area holds an effective-dated value such as a per-passenger booking fee,
render it as a table with a leading 80px status column, then Effective from,
Effective to, Value, Set by, Recorded on. The applying row is marked "Current" at
11px/700 uppercase --c-good, future rows "Scheduled", past rows nothing at all.
Effective to is derived, never typed. Value is right-aligned and tabular. Editing
never overwrites a row, it closes the current row and opens a new one.

Flag every geometry value you cannot source from the brief as
"NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building".

Then run the New Screen Checklist and emit the consulate-spec block.
```

### 18.4 Design a confirm dialog

```
Design the confirmation dialog for "<DESTRUCTIVE ACTION>" in CONSULATE, following
05-CLAUDE-DESIGN-BRIEF.md exactly.

First, check the action against the confirmation policy in section 10. If it is one
of the four type-to-confirm actions, include the 30px type-to-confirm input and
state that the literal string is NOT YET SPECIFIED. If it is one of the five plain
confirms, no typing. If it is on neither list, the correct answer is that this
action does not confirm at all, and you should say so with a CONFLICT block instead
of drawing a dialog.

Surface is S3, size small: 520 wide, height auto to a maximum of 420, horizontally
centred at y=200. Radius 0, 2px --c-crown border, --shadow-window, backdrop
rgba(28,31,27,0.42) with no blur. S2 and S3 are the two shadowed surfaces in this
product. No tab strip. The body does not scroll.

Title bar 40px --c-crown, 15px/700 uppercase 0.3px --c-ink-invert, naming the action
and the object, never the word "Confirm" alone. 26x26 square close button.

The body states the consequence in a full sentence at 14px/400 --c-ink, then a facts
block of label and value pairs, labels 13px/400 --c-ink-2 and values 14px/400
--c-ink. Financial records are append-only, so a void or a correction cannot exist
without naming the record it corrects. Show that reference in the facts block.

Footer 52px, 1px --c-border-item top rule, 20px inset, buttons right-aligned with a
10px gap: the safe button first as an ordinary secondary, then the destructive
button. The destructive button is a SECONDARY button with a --c-urgent label and a
1px --c-urgent border. There is no filled red button anywhere in this product.
Danger is expressed in the sentence and the facts, not in a fill. Label both buttons
with a verb and an object, never OK and never Yes.

Then run the New Screen Checklist and emit the consulate-spec block.
```

### 18.5 Design an empty state

```
Design the empty state for <SCREEN OR QUEUE> in CONSULATE, following
05-CLAUDE-DESIGN-BRIEF.md exactly.

Surface is S1, the box. The box, its 2px --c-border-container, its section header
strip, its control strip and its column header row all stay. Only the data rows are
absent. The box never collapses and never disappears.

The empty block is 160px tall, centred vertically, left-aligned at the 14px box
inset. Line 1 is 14px/400 --c-ink and states what is empty. Line 2 is 13px/400
--c-ink-2 and states the way out, as an underlined --c-link where one exists.

No illustration. No icon. No emoji. No button. No centred hero. No large friendly
type. Always say what does exist elsewhere and how to get there, and distinguish
empty-because-filtered from empty-because-nothing-exists, which get different
sentences.

A queue tab with zero records prints no count at all, not "0".

The verbatim copy for this screen is owned by 04-SCREEN-INVENTORY.md. If it was not
given to you in this prompt, use a clearly labelled placeholder and flag it as
"NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building".

Whether the pagination band renders under an empty state is unsettled. Flag it
rather than deciding it.

Then run the New Screen Checklist and emit the consulate-spec block.
```

---

## 19. Failure modes. The specific mistakes you are most likely to make

Read this list twice. Every item is something a competent designer does by reflex, and every one of them breaks CONSULATE.

**1. Adding a left sidebar because most apps have one.** There is no left rail, no icon strip, no drawer, no hamburger. Navigation is horizontal and lives in the top 186px, or 148px where there is no queue band. Nothing occupies the left edge at any time. If a screen needs more navigation than L1 tabs, L2 queue tabs and the L3 View select provide, the screen has too much in it. Admin does not get an exemption.

**2. Colour-coding booking stage.** The single most common thing a designer tries to improve. **Seven stages, zero colours.** Stage is a word in a column in ordinary ink. Not a dot, not a tint, not a coloured left edge, not a coloured word, not a badge, not an icon.

**3. Rounding corners.** Buttons, inputs, selects, tiles, initials, dialogs, panels, the `✕` button, the crest tile, the pagination boxes, the checkbox, the radio. All zero. Initials go in squares. The radio is a square with a square centre. There are no circles in this product.

**4. Adding chips, badges, pills or tags.** They do not exist. Counts go in parentheses after a label, or right-aligned in a band. Status goes in a column as a word. Void goes in the status column as the word `VOID` in `--c-ink-2`.

**5. Adding a shadow.** Shadow belongs to S2 and S3, and to nothing else. S4 panels get a 1px `--c-border-control` on a solid `--c-surface` fill and are simply on top. Cards do not exist, so card shadows cannot exist. There is no hover shadow. If you have drawn a shadow on a box, a panel or a workspace, delete it.

**6. Using a monospace font for numbers.** Ticket numbers, PNR locators, passport numbers, fares, deadlines. All Tahoma. Tabular figures belong to right-aligned numeric and currency columns, and to nothing left-aligned. A deadline is a sentence, not a countdown readout.

**7. Abbreviating deadline types.** `TL`, `Tkt limit`, `Exp`, `F/U`, `CKIN` are all wrong, and so is a fifth type such as `Airline limit` or `Issue by`. The four types are `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`, spelled in full, every time, in every density, in every column width. If the column is too narrow, the column is too narrow.

**8. Shrinking rows for density.** 44px is fixed. There is no compact mode and no density toggle. Fourteen rows on a 900px viewport is the accepted trade, made on purpose, for people who need to read the screen across a desk and print it into a folder. More rows come from a better filter or a saved view.

**9. Adding an icon rail, or icons in navigation generally.** Object tabs and queue tabs carry text only. The only icons in the product are the 26x26 gold crest tile in the crown and the 32x32 square icon tile in the page header, and the glyph set for the latter is not yet drawn.

**10. Making urgency visual instead of verbal.** No red row fills, no left accent bars, no warning triangles, no pulsing, no auto-sorting to the top, no duplicate "urgent" section, no icon column. The deadline cell gains a clause and turns `--c-urgent`, the stage cell prints `OVERDUE`, the group header says what it holds, the queue tab count turns red. That is the whole mechanism.

**11. Inventing a colour, a size or a spacing value.** If it is not in this file, it does not exist. Write `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`. Never guess. A guessed value that ships is more expensive than a question, because it ships forty times before anyone notices.

**12. Turning the modal window into a page, a side panel, an inline expansion or a stack.** One record window at a time, one place, 1120x760 at x=160 y=70, non-draggable, non-resizable, non-minimisable. The list stays visible behind it, which is why there is no record pager. Exactly two things may sit on top of it, per D1: an S3 confirm, and a read-only S2 `medium` such as a document preview or an audit entry. A `medium` that can save may not.

**13. Softening the borders because the screen looks busy.** The border grammar is how a user tells a container from a list. Two weights, both load-bearing. Removing one removes meaning.

**14. Drawing a rule the design system does not specify.** The column header band and the group header band have no bottom rule. The data row does. Adding a rule is inventing a value in the same way that adding a colour is.

**15. Adding a confirmation because the action feels risky.** The confirmation policy in section 10 is exhaustive, and it is exhaustive on purpose. Four type-to-confirm actions, five plain confirms, nothing else. Unnecessary confirmations train the reflex that defeats the necessary ones.

**16. Treating a blank field as "not provided".** It is not. The `Client has not provided this yet` checkbox is the recorded value, and reports read it. Draw the state, do not draw an empty cell.

**17. Stacking the count line under the H1.** It is baseline-aligned to the right of the H1 with an 8px gap, and its grammar is `{n} {noun}{, m within four hours}`. Three stacked lines do not fit in 64px and are not what the system specifies.

---

## 20. What to return, every time

1. **The visual design.**
2. **The New Screen Checklist from section 15**, answered item by item, as a numbered list.
3. **The `consulate-spec` block from section 16**, complete, with every key present and with `must_never` and `unspecified` populated.
4. **Any CONFLICT block from section 17**, placed before the design.

If any of the four is missing, the output is incomplete and the developer will reject it.

One last thing. This brief is a faithful restatement of a locked design language, and it adds nothing to it. Your value here is not taste. It is fidelity, completeness, and the discipline to write `NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building` instead of a plausible number.
