# CONSULATE — The Design System

**Product:** YB Travel operations platform
**Status:** Chosen by the client on 3 August 2026 from six competing concepts. Locked.
**Audience:** Anyone designing or building any screen of this product, human or AI.

---

## 1. What this design is, in one paragraph

CONSULATE is enterprise software that a 55-year-old office manager already knows how to drive. A green company band across the top carries the brand and the object tabs. Underneath it, a row of work queues with live counts. Underneath that, the page header. Then one white box on a grey-green field, holding the data. Double-click a row and the file opens in a window on top of the list, which stays exactly where it was.

Its ancestors are Microsoft Dynamics CRM, Salesforce Classic, Oracle and SAP web clients, and the travel back-office systems agents already use, where staff say "pull the file" and mean it literally. It is deliberately not modern. It is not a consumer app, it does not float, it does not animate, and it has no rounded corners anywhere.

---

## 2. The five rules that define it

If you remember nothing else, remember these. Every one of them is load-bearing, and breaking any one makes the product look like a different product.

**One. Zero corner radius, everywhere, forever.** The box, the record window, buttons, inputs, selects, checkboxes, the search field, the Go button, the crest tile, agent initials, dropdown menus, dialogs. There are no circles and no pills anywhere in this product. Initials sit in squares. If you find yourself typing `border-radius`, you have made a mistake.

**Two. Two border weights, and the difference between them is the grammar.** A 2px `--c-border-container` line means *this is a container, something is enclosed*. A 1px `--c-border-item` line means *these are items in a list*. That is the whole vocabulary. Do not add a third weight.

**Three. A heading is a filled band, never bold text floating in whitespace.** Section headers get `--c-band-header`. Column headers, group headers and pagination get `--c-band-service`. If you are tempted to write a heading as bold text with margin above it, fill a band instead.

**Four. Shadow belongs to exactly two surfaces, the record window and the confirm dialog.** Nothing else is elevated. Dropdown menus sit on a solid white fill with a 1px border and are simply on top. There is no elevation system. See `00-DECISIONS.md` D1 for the full surface list.

**Five. Urgency is a sentence, not a colour block.** Nothing gets pinned, duplicated, lifted out of sort order, flashed, filled, or ticked down. The row does not move and does not change shape. It changes what it *says*, in bigger, redder, plainer words. See section 7.

---

## 3. The silhouette

Everything is horizontal and it is all in the top 186px. There is **no left rail, no icon strip, no drawer, no hamburger, no command palette, no floating action button**, and nothing whatsoever on the left edge of the screen at any time.

```
┌──────────────────────────────────────────────────────────────┐
│ CROWN, 84px, #0E4634                                         │
│   row 1 (44px): crest · YB TRAVEL · desk name    search [Go] │
│                          Setup | Help | Sign Out · M. Roth   │
│   row 2 (40px): Requests ┃Clients┃Travellers┃Bookings┃…      │  ← active tab is a
├──────────────────────────────────────────────────────────────┤     white notch cut
│ QUEUE TAB BAND, 38px, white                                  │     out of the green
│   Needs Action Today (48) · Needs Intake (12) · …            │
├──────────────────────────────────────────────────────────────┤
│ PAGE HEADER, 64px, white                                     │
│   ▣  REQUESTS                    [+ New Request] [Assign…]   │
│      Needs Action Today  48 open · 9 due today  [Print][Export]│
├──────────────────────────────────────────────────────────────┤
│ CANVAS #E4E7E2, 16px padding                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ SECTION HEADER STRIP, 32px, #DCE2D8                    │  │
│  │ CONTROL STRIP, 44px — View: [dropdown] Edit | Create…  │  │
│  │ COLUMN HEADERS, 30px, #F1F3EF                          │  │
│  │ GROUP HEADER — DUE TODAY, 9 REQUESTS, 3 WITHIN 4 HOURS │  │
│  │ ROW 44px ······························                │  │
│  │ ROW 44px ······························                │  │
│  │ PAGINATION, 38px, 2px top border                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**The signature form:** a green crown with one square white notch cut out of its bottom edge. That notch is the active object tab. It is how you recognise this product from across the room. Never round it, never inset it, never give it a gap.

**The second signature:** the whole product is *one white rectangle on a grey-green field*, and everything lives inside that rectangle. The canvas colour exists for one reason, to make the box read as a physical sheet with four visible edges. Never put content directly on the canvas.

---

## 4. Navigation, three levels and no more

**Level 1, object tabs**, in the crown. *What kind of thing am I looking at.*
Requests · Clients · Travellers · Bookings · Tickets · Reports, then `More ▾` right-aligned holding Suppliers, Commissions, Agents, Admin.

**Level 2, queue tabs**, the white band. *Which pile.*
All queues are visible at rest, always, with live counts. There is no state in which a queue is hidden behind a control. A count prints in `--c-urgent` when that queue holds anything due inside 4 hours. **A count of zero prints as nothing at all** — "Ready to Issue" with no parentheses means empty.

**Level 3, the View dropdown**, inside the box's control strip. *Filtered how.*
Queue tabs answer "which pile", the View dropdown answers "filtered how". Choosing a view does not change the queue tab you are on, it narrows it, and the section header strip appends the view name: `REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD`.

**Window tabs** exist only inside the record window. They are tabs on a dialog, not places in the app. They never appear anywhere else.

URLs are real and browser back works, but nobody navigates by URL. Every screen is at most two clicks from any other screen.

---

## 5. Colour, and where it is forbidden

Read `assets/tokens.css`. Every value lives there and nowhere else.

The rules that are not obvious from the token names:

- **`--c-crown-rule` (#2E6552) is only ever used inside the crown.** It is the hairline between the wordmark and the desk name, and the `|` separators between the utility links. It appears nowhere else in the product.
- **Status colours are text only.** Never a fill, never a row background, never a chip or a badge. There are no chips or badges in this product at all.
- **`--c-good` is for terminal states and connection state only.** Paid, Ticketed, connected. It never means "success" on a button.
- **There is no colour-coding of booking stage.** Stage is a word in a column, in ordinary ink. Seven booking stages, zero colours. This is deliberate and it is the single most common thing a designer will try to "improve". Do not.
- **No zebra striping and no vertical column rules.** Both were considered and removed. At 44px rows with 14px type the eye does not need them, and both add visual noise that competes with the urgency sentence.

---

## 6. Type

One family: `Tahoma, Verdana, Geneva, sans-serif`. Weights 400, 600, 700 only. **No second family. No monospace anywhere in the product.**

Deadlines, dates and durations are set as *words*, in the same face as everything else. There is no ticker font, no letterspaced numeric readout, no mono digit. `font-variant-numeric: tabular-nums` is applied to any right-aligned numeric or currency column, meaning fares, fees, totals, balances and pagination counts. See `00-DECISIONS.md` D7. Left-aligned text, dates, times and deadline sentences stay proportional.

Sizes are in `tokens.css`. The one rule worth stating here: **the largest text on a data screen is the H1 at 22px, and the only text in the grid larger than 14px is an urgent deadline at 15px.** That size jump is meaningful. Do not spend it on anything else.

Hyperlinks inside the page are **always underlined**, in `--c-link`. Not on hover. Always. This is an accessibility decision and a period decision at the same time.

---

## 7. How urgency works, in full

This is the part most likely to be redesigned by someone who does not understand it, so here it is completely.

A ticketing time limit three hours away is expressed in **five places, and none of them move the row.**

**7.1 The deadline cell.** Normally: `Ticketing limit — today 3:20 PM`, 14px/400 `--c-ink`. Inside 4 hours it becomes 15px/700 `--c-urgent` and gains a clause: `Ticketing limit — today 3:20 PM, 3 hours left`. Overdue reads `Ticketing limit — expired 11:40 AM, 24 minutes ago` in `--c-overdue`/700, and that row's Stage cell replaces the stage word with `OVERDUE` in 11px/700 uppercase.

**7.2 The deadline type is always spelled out in full and never abbreviated.** The four types are `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`. Only the first two ever go red. Follow up and Check-in stay in ordinary ink at all times, because they are not money.

**7.3 The row stays a row.** No fill, no tint, no left bar, no icon, no glyph column, no bold on the family name, no extra height. A screenshot of nine urgent rows and nine calm rows is a page of even 44px lines with nine red clauses down the right-hand side, which is exactly how a person scans a column of text.

**7.4 The group header speaks.** `DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS`, with the label printed in `--c-urgent`. The band fill stays `--c-band-service`.

**7.5 The queue tab count goes red.** And nothing else in the chrome changes.

Because the default sort is deadline ascending and the default grouping is by day, urgent rows are already at the top. They never need to be lifted there.

---

## 8. What this product does not have

An explicit list, because absence is a design decision and agents fill absences with defaults.

No left sidebar. No icons in navigation. No rounded corners. No shadows except the record window and the confirm dialog. No gradients. No chips, pills, badges or tags. No coloured status fills. No avatars as circles (initials in squares only, and no photographs). No zebra striping. No vertical column rules. No command palette. No keyboard-first navigation model. No dark mode. No density toggle. No drag and drop. No kanban board. No animation beyond an instant state change. No toasts that auto-dismiss carrying information the user needs. No infinite scroll (pagination is numbered and explicit). No monospace. No emoji.

If a brief asks for one of these, the brief is wrong or it is for a different product. Raise it, do not silently add it.

---

## 9. Density and the honest trade

44px rows and 14px type mean roughly 14 rows on a 900px viewport. That is low compared to the alternatives that were rejected, and it was chosen deliberately: this agency's staff range widely in age and technical confidence, the screen has to be readable across a desk, and any screen can be printed and put in a folder.

Do not "fix" this by shrinking rows. If a user needs more rows, the answer is a better filter or a saved view, not smaller type.

---

## 10. Reference implementation

`assets/consulate-reference.html` is a working, inspectable build of the main work screen in this language. Open it in a browser and read the CSS. Where this document and that file disagree, **this document wins** and the file should be corrected.

`assets/tokens.css` is the source of truth for every value.
