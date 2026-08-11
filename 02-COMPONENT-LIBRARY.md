# 02-COMPONENT-LIBRARY.md

The complete catalogue of reusable components in CONSULATE, the YB Travel operations platform.

Read `assets/tokens.css`, then `01-CONSULATE-DESIGN-SYSTEM.md`, then `00-DECISIONS.md`, before this file. Those three are the source of truth. This document does not restate them. It turns them into buildable parts.

---

## 0. How to read this document

### 0.1 Rules that govern every component below

1. Every value here comes from `assets/tokens.css`, `01-CONSULATE-DESIGN-SYSTEM.md` or `00-DECISIONS.md`. Nothing is invented.
2. Where none of those three settles a value, this document prints **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not fill it with a framework default, a browser default, or a value copied from another component. There is no gap register in this document any more. `00-DECISIONS.md` closed the numbered gaps that used to live here, and a stale gap list that stops a developer on an answered question is itself a defect.
3. Where a value is not stated for a component but follows unavoidably from a stated rule, this document marks it **DERIVED** and names the rule it came from. A derived value is safe to build. An unspecified one is not.
4. Colours are referenced by token name only. Raw hex appears in exactly one place, the token block quoted from `assets/tokens.css` in 0.2. The single exception is the backdrop value, which `00-DECISIONS.md` D2 states as a literal and for which no token exists yet, and which is quoted as such in 2.5.
5. Radius is zero on every component in this file. There is no exception and no component below takes a radius parameter.
6. `--shadow-window` appears on two surfaces and no others: the record window (S2) and the confirm (S3), which `00-DECISIONS.md` D1 defines as the same construction as S2. Nothing else in the product is elevated. Dropdown panels sit on a solid fill with a 1px border and are simply on top.
7. When this file and a file below it in the authority order disagree, this file is not automatically right. The order is `assets/tokens.css`, then `01-CONSULATE-DESIGN-SYSTEM.md`, then `00-DECISIONS.md`, then this file alongside `03-WINDOW-TYPES.md` and `04-SCREEN-INVENTORY.md`.

### 0.2 Tokens, quoted from `assets/tokens.css`

```css
/* Brand */
--c-crown:            #0E4634;
--c-crown-border:     #0A3628;
--c-crown-hover:      #14604A;
--c-crown-rule:       #2E6552;  /* INSIDE THE CROWN ONLY */
--c-crown-ink:        #A8C4B8;
--c-gold:             #B07D1A;
--c-link:             #14604A;  /* links ALWAYS underlined, always, not on hover */

/* Surfaces */
--c-canvas:           #E4E7E2;
--c-surface:          #FFFFFF;
--c-band-header:      #DCE2D8;
--c-band-service:     #F1F3EF;

/* Borders */
--c-border-container: #BFC4BC;  /* 2px, "something is enclosed" */
--c-border-item:      #DDE1DB;  /* 1px, "items in a list" */
--c-border-field:     #EDEFEB;  /* rule under each form field row */
--c-border-control:   #A8AEA6;  /* inputs, selects, secondary buttons */

/* Ink */
--c-ink:              #1C1F1B;
--c-ink-2:            #5C6159;
--c-ink-3:            #8B9089;
--c-ink-invert:       #FFFFFF;
--c-ink-on-band:      #23392F;  /* section header strip label ONLY */

/* Focus */
--focus-ring:         2px solid #0E4634;
--focus-offset:       1px;

/* Meaning */
--c-urgent:           #A32116;
--c-overdue:          #7A1710;
--c-good:             #1E7A3C;  /* TEXT ONLY, never a fill */

/* Physics */
--radius:             0;
--shadow-window:      0 6px 24px rgba(0,0,0,0.35);
```

The section header strip ink is **`--c-ink-on-band`**. There is no token named `--c-ink-heading-on-band`; `00-DECISIONS.md` D17 lists that name as a thing every file must stop saying. If you find it in any document or any component, it is a defect.

### 0.3 Base rules every component inherits

```css
:root {
  font-family: var(--font);   /* Tahoma, Verdana, Geneva, sans-serif */
}

*, *::before, *::after {
  border-radius: var(--radius);   /* 0. everywhere. forever. */
  box-sizing: border-box;         /* no exception, including the record window, see 2.5 */
}

a {
  color: var(--c-link);
  text-decoration: underline;     /* always, not on hover */
}

:focus-visible {
  outline: var(--focus-ring);     /* 2px solid --c-crown, 00-DECISIONS.md D4 */
  outline-offset: var(--focus-offset);
}
```

Font weights available: 400, 600, 700. Nothing else. No second family. No monospace anywhere.

**Focus, settled.** `00-DECISIONS.md` D4 puts `--focus-ring` at `--focus-offset` on **every** interactive element in the product: buttons, inputs, selects, checkboxes, radios, links, tabs, rows, menu items, the window close button. Never a glow, never a colour change, never a radius. It reads as a square ring just outside the element's own square edge. This is a single global rule, which is why it is declared once here and not repeated as a state row in every table below. Where a state table below says "Focus", it means this treatment and nothing else. `:focus-visible` is the selector because `07-BUILD-STANDARDS.md` requires every path to be completable by keyboard alone.

**Tabular figures, settled.** `00-DECISIONS.md` D7 replaces the earlier "exactly two places" rule. `font-variant-numeric: tabular-nums` applies to **any right-aligned numeric column and any currency value**: fares, fees, totals, balances, and pagination counts. Left-aligned text, dates, times and deadline sentences stay proportional. There is still no monospace font anywhere in the product.

### 0.4 The type scale, for reference in every component

| Size | Weight | Tracking | Case | Used by |
|---|---|---|---|---|
| 22px | 700 | none | sentence | H1 only |
| 15px | 700 | 1.2px | uppercase | wordmark |
| 15px | 700 | 0.3px | uppercase | window title bar |
| 15px | 700 | none | sentence | urgent deadline and overdue deadline, grid text only |
| 14px | 700 | none | sentence | active object tab |
| 14px | 600 | none | sentence | inactive object tab, primary button |
| 14px | 400 | none | sentence | body, data cells, secondary button |
| 13px | 600 | none | sentence | queue tab, window tab, user label |
| 13px | 400 | none | sentence | desk label, count line, secondary text, controls, form labels, help text, validation message |
| 12px | 700 | 0.7px | uppercase | section header strip |
| 12px | 700 | 0.6px | uppercase | group header |
| 12px | 700 | none | **sentence** | column header. No uppercase, no tracking. |
| 12px | 400 | none | sentence | crown utility links, inline view links |
| 11px | 700 | 0.7px | uppercase | eyebrow, View picker group captions |
| 11px | 700 | **none** | uppercase | the `OVERDUE` stage word, `Required` marker, `Current` / `Scheduled` markers |

The `OVERDUE` word carries **no tracking**. `00-DECISIONS.md` D9 states it as 11px/700 uppercase `--c-overdue`, no tracking. Do not borrow the eyebrow's 0.7px for it.

The largest text on a data screen is the H1 at 22px. The only grid text above 14px is a deadline in its urgent or overdue state, at 15px.

### 0.5 Fixed heights, the full list

| Element | Height | Source |
|---|---|---|
| Crown row 1 | 44px | `tokens.css` |
| Crown row 2 | 40px | `tokens.css` |
| Queue tab band | 38px, when present | `tokens.css`, D11 |
| Page header | 64px | `tokens.css` |
| Section header strip | 32px | `tokens.css` |
| Control strip | 44px | `tokens.css` |
| Column header row | 30px | `tokens.css` |
| Group header | 26px | `tokens.css` |
| Data row | 44px | `tokens.css` |
| Button | 34px | `tokens.css` |
| Input | 30px | `tokens.css` |
| Pagination | 38px | `tokens.css` |
| Window title bar | 40px | `tokens.css`, D2 |
| Window tab strip | 34px, `large` only | `tokens.css`, D2 |
| Window footer | 52px | D2 |
| Form field row | 34px, auto for a textarea | D5 |
| Page-level message band | 38px | D6 |
| Empty state region | 160px | D6 |

Spacing runs on a 4px grid. Page gutter is 20px always (`--gutter`). Box inset is 14px (`--pad-box`). Window body inset is 20px (`--pad-window`).

---

## 1. SHELL

The shell is the crown, the queue tab band and the page header. It is horizontal, it is always present, and nothing in it is on the left edge except content that starts at x=20. There is no left rail, no icon strip, no drawer, no hamburger, no command palette and no floating action button anywhere in this product.

**Build the shell as a flex column, never as absolute offsets.** `00-DECISIONS.md` D11: the crown is 84px and the page header is 64px, but the queue tab band is 38px **only when present**. Reports, Admin and workspace pages (S5) have no queue band, and everything below simply moves up 38px. Any component that hard-codes y=122 or y=186 is a defect.

**Minimum viewport is 1300px** (160 + 1120 + 20, D11). Below that the page scrolls horizontally. Desktop only. No mobile build is in scope. Earlier drafts said 1180px, which is arithmetically impossible with a 1120px window at x=160.

### 1.1 The crown, container

**What it is.** The green bar occupying y 0 to 84. Two rows: identity and utilities on top, object tabs below. It has a 2px `--c-crown-border` bottom rule.

**When to use.** Once per page, always, on every screen including the screen behind the record window, and including workspace pages.

**When not to.** Never inside the record window. Never duplicated. It never scrolls away and it never collapses.

**Geometry.** Total 84px. Row 1 is 44px, row 2 is 40px, 44 + 40 = 84. The 2px bottom rule is drawn as an overlay across the last 2px of row 2 rather than adding height, so the block stays exactly 84px and the queue band starts at y=84. **DERIVED** from `01-CONSULATE-DESIGN-SYSTEM.md` section 3, which fixes the crown total at 84px while `assets/tokens.css` fixes the two rows at 44px and 40px. There is no third value available, so the rule has to overlay rather than add.

The active object tab is drawn 42px tall, 40px of row plus 2px, so it crosses that rule and merges into the white band below. **DERIVED** from `01-CONSULATE-DESIGN-SYSTEM.md`, which describes the active tab as "running 2px past the crown border" while the row itself is 40px. The tab is therefore 42px total and must overflow its 40px row rather than grow it. See 1.7 for the positioning that makes that render. This is the signature form: **a green crown with one square white notch cut out of its bottom edge.**

**States.** The crown container itself has none.

```html
<header class="c-crown">
  <div class="c-crown__row1"> ... 1.2 to 1.6 ... </div>
  <nav class="c-crown__row2"> ... 1.7 and 1.8 ... </nav>
  <div class="c-crown__rule" aria-hidden="true"></div>
</header>
```

```css
.c-crown {
  position: relative;
  height: 84px;
  background: var(--c-crown);
}
.c-crown__row1 { height: 44px; display: flex; align-items: center; }
.c-crown__row2 {
  position: relative;          /* positioning context for the More panel, 1.8 */
  height: 40px;
  display: flex; align-items: stretch;
  overflow: visible;           /* the active tab hangs 2px below this row, 1.7 */
}
.c-crown__rule {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 2px; background: var(--c-crown-border);
  pointer-events: none;
  z-index: 1;                 /* the active tab sits above this, see 1.7 */
}
```

Internal horizontal gaps between crest, wordmark, rule and desk label in row 1 are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. What is specified: the crest starts at x=20, the gap between the search field and the Go button is zero, and all spacing runs on the 4px grid.

### 1.2 Crest tile

**What it is.** A 26x26 gold square at x=20 in crown row 1. It is the only mark in the crown.

**When not to use.** It is not a logo slot, not a link on its own, and it never appears at any other size or anywhere else in the product.

**Geometry.** 26x26, `--c-gold` fill, 0 radius. It is a square, not a rounded tile and not a circle.

The artwork inside the tile is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. It is a flat white shape on `--c-gold`, with no radius and no photograph, but the shape itself has not been drawn. Commission it before the shell is built, because it appears on every screen.

```css
.c-crest {
  width: 26px; height: 26px;
  margin-left: 20px;
  background: var(--c-gold);
  flex: 0 0 auto;
}
```

### 1.3 Wordmark, crown rule, desk label

**What it is.** "YB TRAVEL" followed by a hairline vertical rule and the current desk, "Brooklyn Desk".

**When to use.** Once, in crown row 1, immediately after the crest. The desk label states which desk the session is on. It is a label, not a control. If the desk becomes switchable that is a new component, not a change to this one.

```html
<span class="c-wordmark">YB Travel</span>
<span class="c-crown-rule" aria-hidden="true"></span>
<span class="c-desk">Brooklyn Desk</span>
```

```css
.c-wordmark {
  font-size: 15px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.2px;
  color: var(--c-ink-invert);
}
.c-crown-rule {           /* --c-crown-rule is legal INSIDE THE CROWN ONLY */
  width: 1px; align-self: stretch;
  background: var(--c-crown-rule);
}
.c-desk {
  font-size: 13px; font-weight: 400;
  color: var(--c-crown-ink);
}
```

The vertical hairline's height inside the 44px row is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. `align-self: stretch` above is a placeholder, not a decision.

### 1.4 Crown search field with welded Go button

**What it is.** A 300x30 white search field with a 56x30 gold Go button fused to its right edge. Zero gap. They read as one object.

**When to use.** Once, in crown row 1, right side. This is global search across records.

**When not to.** Do not reuse this welded pair anywhere else. In-box filtering happens through the View picker (4.9). A plain search input inside a form uses the text input (4.5).

**Geometry.** Field 300x30, `--c-surface` fill, 1px `--c-border-control`. Button 56x30, `--c-gold` fill. The two are adjacent with no gap and no gap-filling border between them. Total width 356px, height 30px.

**States.**

| State | Treatment |
|---|---|
| Default | As above. |
| Hover, field | No change. |
| Focus, field | `--focus-ring` at `--focus-offset`, per D4 and 0.3. Never the browser default ring. |
| Hover, Go | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** |
| Focus, Go | `--focus-ring` at `--focus-offset`. |
| Disabled | Does not occur. Search is always available. |
| Loading | Results are a page result, not an inline state. |
| Error | Handled on the results screen, not in the field. |

```html
<form class="c-crown-search" role="search">
  <input class="c-crown-search__field" type="search" aria-label="Search">
  <button class="c-crown-search__go" type="submit">Go</button>
</form>
```

```css
.c-crown-search { display: flex; }
.c-crown-search__field {
  width: 300px; height: 30px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  font-family: inherit; font-size: 13px; color: var(--c-ink);
}
.c-crown-search__go {
  width: 56px; height: 30px;
  margin: 0;                     /* welded. zero gap. */
  background: var(--c-gold);
  border: 0;
  font-family: inherit; font-weight: 600;
  /* label colour and size: NOT YET SPECIFIED, raise before building */
}
```

### 1.5 Utility links

**What it is.** Setup, Help, Sign Out, underlined, separated by a literal pipe character.

**Geometry.** 12px, `--c-ink-invert`, underlined at rest. Separator character `|` in `--c-crown-rule`, which is legal here because it is inside the crown.

**States.** Underline is permanent, so hover has no underline to add. Hover treatment is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not animate. Focus is `--focus-ring` at `--focus-offset`, per D4.

```html
<nav class="c-utility">
  <a href="/setup">Setup</a><span class="c-utility__sep">|</span>
  <a href="/help">Help</a><span class="c-utility__sep">|</span>
  <a href="/sign-out">Sign Out</a>
</nav>
```

```css
.c-utility a {
  font-size: 12px; font-weight: 400;
  color: var(--c-ink-invert);
  text-decoration: underline;
}
.c-utility__sep { color: var(--c-crown-rule); }
```

### 1.6 User label

**What it is.** The signed-in agent's name, "M. Roth", 13px/600, at the far right of crown row 1.

**It is a label.** Not an avatar, not a circle, not a photograph, and **not a dropdown trigger**. `00-DECISIONS.md` D17 lists "a user menu on the crown" among the things every file must stop saying: `M. Roth` is a label, and `Sign Out` is already a utility link in 1.5. There is no user menu, no account panel and no profile popover in this product. Do not build one, and do not give this element a hover, a caret, an `aria-haspopup` or a click handler.

Ink colour is not stated. **DERIVED:** `--c-ink-invert`, because 13px/600 primary text on `--c-crown` has exactly one legible ink in the palette and `--c-crown-ink` is defined in `assets/tokens.css` as secondary text on the crown, which this is not.

```css
.c-user { font-size: 13px; font-weight: 600; color: var(--c-ink-invert); }
```

### 1.7 Object tabs, L1 navigation

**What it is.** The row of "what kind of thing" tabs in crown row 2: Requests, Clients, Travellers, Bookings, Tickets, Reports, then More right-aligned.

**When to use.** Exactly once. This is navigation level 1 of three. Levels 2 and 3 are the queue tab band (1.9) and the View picker (4.9). There is no level 4.

**When not to.** No icons. No counts. No badges. Counts live on queue tabs, not here.

**Geometry.** Row starts at x=20. Each tab has 22px horizontal padding, label 14px/600. Inactive tabs are transparent on the crown.

**The active tab is 42px tall.** It is a solid `--c-surface` block, 0 radius on all four corners, and it overlaps the crown's 2px bottom rule so the notch and the white band below read as one surface. **DERIVED** from `01-CONSULATE-DESIGN-SYSTEM.md`, which describes the active tab as 40px "running 2px past the crown border". 40 + 2 = 42, and the 2px is an overhang, not extra row height.

**How to make a 42px child render out of a 40px row.** The row is `display: flex; align-items: stretch` at a fixed 40px, so a 42px child would otherwise either be clipped or grow the row to 42px, making the crown 86px and pushing the queue band off y=84. The active tab therefore takes `position: relative`, an explicit `height: 42px`, `align-self: flex-start`, `margin-bottom: -2px` and `z-index: 2`, and the row takes `overflow: visible` (see 1.1). The row stays 40px, the crown stays 84px, and the tab hangs 2px into the white band.

**States.**

| State | Fill | Label |
|---|---|---|
| Default (inactive) | transparent | `--c-crown-ink` 14px/600 |
| Hover | `--c-crown-hover` | `--c-ink-invert` 14px/600 |
| Active | `--c-surface`, 42px tall, crosses the crown rule | `--c-crown` 14px/700 |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled | Does not occur. An object the user cannot reach is not rendered. |

```html
<a class="c-otab" href="/requests" aria-current="page">Requests</a>
<a class="c-otab" href="/clients">Clients</a>
```

```css
.c-otab {
  display: flex; align-items: center;
  padding: 0 22px;
  font-size: 14px; font-weight: 600;
  color: var(--c-crown-ink);
  background: transparent;
  text-decoration: none;              /* tabs are not links-as-text */
}
.c-otab:first-child { margin-left: 20px; }
.c-otab:hover { background: var(--c-crown-hover); color: var(--c-ink-invert); }
.c-otab[aria-current="page"] {
  position: relative; z-index: 2;     /* above .c-crown__rule */
  align-self: flex-start;             /* do not stretch to the row */
  height: 42px;                       /* 40px row + 2px past the crown border */
  margin-bottom: -2px;                /* the overhang. the row stays 40px. */
  background: var(--c-surface);
  color: var(--c-crown);
  font-weight: 700;
}
```

### 1.8 The More overflow

**What it is.** A right-aligned object tab labelled More holding Suppliers, Commissions, Agents, Admin.

**When to use.** Only for those four objects. Do not move a primary object into More to shorten the row, and do not promote one out of More without changing the navigation spec. Admin is reached from here (`00-DECISIONS.md` D10).

**Geometry of the trigger.** Identical to an object tab (1.7), right-aligned in the row.

**Geometry of the panel.** This is surface S4 in `00-DECISIONS.md` D1: white `--c-surface`, 1px `--c-border-control`, **no shadow**, no radius, simply on top. Item rows 30px, **DERIVED** from the View picker (4.9), which is the same surface. Item label size is **DERIVED** as 13px control text from the same source. Item rows are plain `--c-ink`, **not underlined**, because they are menu rows and not in-page hyperlinks; the always-underlined rule in `01-CONSULATE-DESIGN-SYSTEM.md` applies to `--c-link` hyperlinks in page content.

**Position.** The panel opens against the crown's bottom border, top y=84, right-aligned to the row. `03-WINDOW-TYPES.md` specifies the same position. Because `.c-crown` is the positioned ancestor, the offset is measured from the top of the crown, not from the top of row 2.

Panel width is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

```css
.c-more-panel {
  position: absolute; right: 0; top: 84px;   /* against the crown's bottom border */
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  box-shadow: none;                   /* S2 and S3 carry the shadow. not this. */
  z-index: 3;
}
.c-more-panel a {
  display: flex; align-items: center;
  height: 30px; padding: 0 18px;
  font-size: 13px; color: var(--c-ink);
  text-decoration: none;              /* menu rows are not hyperlinks */
}
.c-more-panel a:hover { background: var(--c-band-service); }
```

### 1.9 Queue tab band, L2 navigation

**What it is.** The white 38px strip directly under the crown holding every queue with its live count.

**When to use.** On every list screen. All queues are visible at rest, always, with live counts. Never hide a queue behind a control, a "more queues" menu, or a filter.

**When not to.** Never inside the record window. Never for filtering, filtering is the View picker. It is **absent** on Reports, on Admin list screens that are not section-navigated, and on workspace pages (S5); everything below moves up 38px (D11).

**Cap.** Seven queue tabs maximum per object (`00-DECISIONS.md` D12), so they never overflow, never scroll and never collapse. An object needing more than seven piles has too many piles. Move the surplus into the View dropdown, which is what it is for.

**Geometry.** 38px, `--c-surface`, 1px bottom `--c-border-container`. Tabs have 18px padding, label 13px/600, no icons ever. Active tab carries a 3px `--c-gold` rule flush along its bottom edge.

**Count rules, all three matter.**

1. Inactive: label `--c-ink-2`, count `--c-ink-3`.
2. A count prints `--c-urgent` at 700 when that queue holds anything due inside 4 hours. Nothing else in the chrome changes.
3. **A count of zero prints as nothing at all.** Not "0", not "(0)", not a dash. The tab label stands alone.

| State | Label | Count |
|---|---|---|
| Default | `--c-ink-2` 13px/600 | `--c-ink-3` |
| Hover | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** | unchanged |
| Active | `--c-ink` 700, plus 3px `--c-gold` bottom rule | unchanged unless urgent |
| Urgent (any state) | unchanged | `--c-urgent` 700 |
| Zero | unchanged | not rendered |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Empty band | Cannot occur. Every object defines at least one queue. |

```html
<nav class="c-queues">
  <a class="c-queue is-active" href="?q=needs-action">
    Needs Action Today <span class="c-queue__n is-urgent">12</span>
  </a>
  <a class="c-queue" href="?q=awaiting-client">
    Awaiting Client <span class="c-queue__n">7</span>
  </a>
  <a class="c-queue" href="?q=declined">Declined</a><!-- count 0, prints nothing -->
</nav>
```

```css
.c-queues {
  display: flex; height: 38px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border-container);
}
.c-queue {
  position: relative;
  display: flex; align-items: center;
  padding: 0 18px;
  font-size: 13px; font-weight: 600;
  color: var(--c-ink-2);
  text-decoration: none;
}
.c-queue__n { margin-left: 4px; color: var(--c-ink-3); font-weight: 600; }
.c-queue__n.is-urgent { color: var(--c-urgent); font-weight: 700; }
.c-queue.is-active { color: var(--c-ink); font-weight: 700; }
.c-queue.is-active::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0;
  height: 3px; background: var(--c-gold);
}
```

### 1.10 Page header

**What it is.** The 64px white band under the queue band, or directly under the crown where there is no queue band. Icon tile, eyebrow, H1, count line on the left. Action buttons on the right.

**When to use.** Once per screen, including on workspace pages (S5).

**When not to.** Not inside the record window, the window has a title bar instead. Do not put filters, tabs or search here.

**Geometry.**
- 64px, `--c-surface`, 1px bottom `--c-border-container`.
- 32x32 square icon tile, `--c-crown` fill, white glyph, at x=20.
- At x=64: eyebrow 11px/700 uppercase 0.7px `--c-ink-3`, then H1 22px/700 `--c-ink`, then the count line 13px/400 `--c-ink-2` baseline-aligned with the H1.
- Right: buttons 34px tall, 16px horizontal padding, 10px gaps.

The glyph set for the icon tile is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. One flat white shape per object tab plus Reports and Admin, on `--c-crown`, no radius. The tile is mandatory on every screen, so this blocks every screen in `04-SCREEN-INVENTORY.md` until it is drawn. Note that the "no icons in navigation" rule applies to navigation. This tile is a page identifier and is explicitly specified as carrying a glyph.

```
x=20        x=64
┌──────┐    REQUESTS                                    ┌──────────┐ ┌──────────┐
│ 32x32│    Needs Action Today   14 requests, 3 within  │ New Req. │ │ Export   │
└──────┘                          four hours            └──────────┘ └──────────┘
```

```html
<div class="c-pagehead">
  <div class="c-pagehead__tile" aria-hidden="true"><!-- glyph, not yet specified --></div>
  <div class="c-pagehead__text">
    <div class="c-eyebrow">Requests</div>
    <div class="c-pagehead__line">
      <h1 class="c-h1">Needs Action Today</h1>
      <span class="c-countline">14 requests, 3 within four hours</span>
    </div>
  </div>
  <div class="c-pagehead__actions">
    <button class="c-btn c-btn--primary">New Request</button>
    <button class="c-btn c-btn--secondary">Export</button>
  </div>
</div>
```

```css
.c-pagehead {
  display: flex; align-items: center;
  height: 64px; padding: 0 20px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border-container);
}
.c-pagehead__tile {
  width: 32px; height: 32px;
  background: var(--c-crown); color: var(--c-ink-invert);
  flex: 0 0 auto;
}
.c-pagehead__text { margin-left: 12px; }   /* x=64 from x=20 + 32 + 12 */
.c-eyebrow {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.7px;
  color: var(--c-ink-3);
}
.c-pagehead__line { display: flex; align-items: baseline; gap: 8px; }
.c-h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--c-ink); }
.c-countline { font-size: 13px; font-weight: 400; color: var(--c-ink-2); }
.c-pagehead__actions { margin-left: auto; display: flex; gap: 10px; }
```

### 1.11 Admin section navigation

**What it is.** Not a new component. `00-DECISIONS.md` D10 settles it: Admin screens **reuse the queue tab band** (1.9) as their section navigation, with the same 38px geometry, the same 13px/600 labels and the same active treatment, the 3px `--c-gold` bottom rule.

**Sections, in this order.** `Users & Roles` · `Categories & Fees` · `Message Templates` · `Deadline Rules` · `Escalation Ladders` · `Sabre Accounts` · `QuickBooks Mapping` · `Audit & Security`.

**It is specifically not a left sidebar.** There is nothing on the left edge of this product at any time. Admin sections do not carry counts, because they are not queues.

**Effective-dated tables** (booking fees especially) are ordinary data rows (3.3) with the columns `Effective from`, `Effective to`, `Value`, `Set by`, `Recorded on`, preceded by an 80px leading column carrying the word `Current` at 11px/700 uppercase `--c-good` on the row that currently applies, `Scheduled` on future rows, and nothing on past rows. `--c-good` is text only here, as everywhere. Editing never overwrites a row. It closes the current row and opens a new one, which is why `Recorded on` is a real column and not decoration.

---

## 2. CONTAINERS

`00-DECISIONS.md` D1 settles the surface list. There are exactly five surfaces and no others: **S1** the box, **S2** the window, **S3** the confirm, **S4** the panel, **S5** the workspace. There is no read-only viewer surface, no help window surface, no settings surface and no toast. Those are all S2 at a different size with different content. Only one modal exists at a time; an S3 confirm may open over an S2 window, and nothing else stacks. If a flow appears to need three layers, it is a workspace (S5), not a stack.

### 2.1 The canvas

**What it is.** The grey-green field the box sits on.

**Rule.** Never put content directly on the canvas. The canvas holds one box. Not three boxes, not cards, not tiles, not a dashboard grid. If a screen needs two logical groupings, they are two section header strips inside one box.

```css
.c-canvas {
  background: var(--c-canvas);
  padding: 16px var(--gutter);      /* 16px vertical, 20px gutters */
}
```

### 2.2 The box, surface S1

**What it is.** The single white rectangle that holds everything on a data screen. The whole product is one white rectangle on a grey-green field.

**Contents, top to bottom, in this order and no other:** section header strip, control strip, column header row, group headers and data rows interleaved, pagination.

**Geometry.** `--c-surface` fill, 2px `--c-border-container`, 0 radius, **no shadow**. Width fills the canvas between the 20px gutters. Box inset for content that is not a full-width strip is 14px (`--pad-box`).

**States.** The box has no hover, no focus and no selected state. It is furniture.

```html
<section class="c-box">
  <div class="c-sechead"> ... 2.3 ... </div>
  <div class="c-ctrlstrip"> ... 2.4 ... </div>
  <div class="c-colhead"> ... 3.1 ... </div>
  <div class="c-grouphead"> ... 3.2 ... </div>
  <div class="c-row"> ... 3.3 ... </div>
  <div class="c-pager"> ... 3.10 ... </div>
</section>
```

```css
.c-box {
  background: var(--c-surface);
  border: 2px solid var(--c-border-container);
  box-shadow: none;
}
```

### 2.3 Section header strip

**What it is.** A filled band naming what is enclosed. A heading in this product is a filled band, never bold text floating in whitespace.

**When to use.** At the top of the box, and at the top of every bordered section inside the record window (2.7).

**When not to.** Never as a free-floating title. Never with an icon. Never with a button inside it, actions belong in the page header or the control strip.

**Geometry.** 32px, `--c-band-header` fill. Label left at the 14px box inset, 12px/700 uppercase, 0.7px tracking, **`--c-ink-on-band`**. Item count right, same treatment.

The token is `--c-ink-on-band` and it exists in `assets/tokens.css`. Earlier drafts named it `--c-ink-heading-on-band`, or wrote its hex literal straight into the component. Both are defects (`00-DECISIONS.md` D17). The token is scoped to this label and to the same strip reused inside the window; do not use it as a general dark ink.

The item count string format is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. `04-SCREEN-INVENTORY.md` states the strip prints `0 items` on an empty grid; that is a peer-tier claim, not a settled one, and the general format for a non-zero count is not written anywhere. Decide both at once.

```html
<div class="c-sechead">
  <span class="c-sechead__label">Requests — Needs Action Today — Belev Echad</span>
  <span class="c-sechead__count">52</span>
</div>
```

```css
.c-sechead {
  display: flex; align-items: center; justify-content: space-between;
  height: 32px; padding: 0 14px;
  background: var(--c-band-header);
}
.c-sechead__label,
.c-sechead__count {
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.7px;
  color: var(--c-ink-on-band);
}
```

See 7.3 for how the label string is assembled.

### 2.4 Control strip

**What it is.** The 44px white strip under the section header holding the view controls.

**When to use.** Once per box, immediately under the section header strip, on any screen with a list.

**When not to.** Do not put record actions here. Do not put a search box here. Do not put a density toggle here, there is no density toggle in this product.

**Geometry.** 44px, `--c-surface`. Left: the label "View:", a 260x30 select, then underlined 12px `--c-link` links "Edit" and "Create New View" separated by a pipe. Right: Sort and Show selects.

**Sorting lives here and only here.** `00-DECISIONS.md` D17: a sortable or resizable column header is a defect. **Column headers are not clickable, carry no sort arrow and have no resize handle** (see 3.1). Sorting is the Sort select in this strip.

**Every select in this strip is a custom listbox, never a native `<select>`.** A native select's popup is drawn by the operating system: it arrives rounded, shadowed, and at OS row heights, which breaks three separate rules in this product on macOS and Windows both. Build all three from the same control (4.6), on the shadcn base that `00-DECISIONS.md` D14 permits, restyled to the tokens at install time.

```html
<div class="c-ctrlstrip">
  <span class="c-ctrlstrip__label" id="view-lbl">View:</span>
  <button class="c-select c-select--view" aria-labelledby="view-lbl" aria-haspopup="listbox">
    Needs Action Today — Belev Echad
  </button>
  <a href="#">Edit</a><span class="c-ctrlstrip__sep">|</span><a href="#">Create New View</a>

  <div class="c-ctrlstrip__right">
    <span class="c-ctrlstrip__label" id="sort-lbl">Sort:</span>
    <button class="c-select" aria-labelledby="sort-lbl" aria-haspopup="listbox">
      Deadline, soonest first
    </button>
    <span class="c-ctrlstrip__label" id="show-lbl">Show:</span>
    <button class="c-select" aria-labelledby="show-lbl" aria-haspopup="listbox">
      50 per page
    </button>
  </div>
</div>
```

```css
.c-ctrlstrip {
  display: flex; align-items: center; gap: 8px;
  height: 44px; padding: 0 14px;
  background: var(--c-surface);
}
.c-ctrlstrip__label { font-size: 13px; font-weight: 400; color: var(--c-ink-2); }
.c-ctrlstrip a { font-size: 12px; color: var(--c-link); text-decoration: underline; }
.c-ctrlstrip__sep { font-size: 12px; /* colour: NOT YET SPECIFIED */ }
.c-ctrlstrip__right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.c-select--view { width: 260px; }
```

The colour of the `|` separator between "Edit" and "Create New View" is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. `--c-crown-rule` is not available: it is scoped to the crown. The 8px gaps above sit on the 4px grid but are not individually specified either; the two settled numbers in this strip are the 260x30 select and the 44px height.

### 2.5 The record window, surface S2

**What it is.** A modal rectangle over a dimmed page. It is the only way a record opens.

**It is not** a page, not a side panel, not an inline expansion, not a new browser tab and not a stack. **One window at a time, always in the same rectangle, and the list underneath is never destroyed.**

**Opened by** double-clicking a data row, or single-clicking the underlined record-ID link (3.4).

**When not to.** Do not open a second window from inside a window. Do not build a record pager, previous or next arrows on the window. The list stays legible around the edges of the backdrop and that visible list is the pager.

**Three sizes and no others** (`00-DECISIONS.md` D1):

| Size | Dimensions | Position | Used for |
|---|---|---|---|
| `large` | 1120 × 760 | x=160, y=70 | Record windows |
| `medium` | 820 × 620 | centred, y=90 | Document preview, message viewer, audit entry, help, the deadline explainer |
| `small` | 520 × auto, max 420 tall | centred, y=200 | S3 confirms only, see 6.3 |

**Box sizing.** 1120 × 760 is the **outer** footprint including the 2px border. **DERIVED** from `00-DECISIONS.md` D11, which computes the 1300px minimum viewport as 160 + 1120 + 20; a 1124px outer width would not fit that arithmetic. So the window uses the same `box-sizing: border-box` as everything else and there is no content-box exception anywhere in this product.

**Band heights, `large`.**

| Band | Height | Fill |
|---|---|---|
| Title bar | 40px | `--c-crown` |
| Window tab strip | 34px | `--c-band-header`, 1px bottom `--c-border-container` |
| Body | 630px **DERIVED** | `--c-surface`, 20px inset, **the only scrolling region in the window** |
| Footer | 52px | `--c-surface`, 1px top `--c-border-item` |

Body height is **DERIVED** by subtraction from D1 and D2: 760 total, minus 4px of top and bottom border, minus 40px title bar, minus 34px tab strip, minus the 52px footer that D2 settles, leaves 630px. Content width inside the body is **DERIVED** the same way: 1120, minus 4px of border, minus the 20px inset on each side, leaves 1076px nominal. Build the sections at `width: auto` rather than a hard 1076px so the number stays correct when the body's scrollbar takes width.

**Band heights, `medium`.** No tab strip (D2). Title bar 40px, footer 52px carrying a single `[Close]` secondary button for read-only content, body 524px **DERIVED** by the same subtraction from 620.

**Backdrop.** `rgba(28,31,27,0.42)`, **no blur** (D2). There is no token for this value in `assets/tokens.css`; it is quoted from `00-DECISIONS.md` D2 as a literal, and a token should be added to `assets/tokens.css` before it is written into a component, per that file's own rule 2. The list, queue tabs and green crown stay legible around the edges. Do not darken it, do not blur it, do not fade it in.

**Title bar.** Left at 16px inset: the title, 15px/700 `--c-ink-invert`, 0.3px tracking, rendered **uppercase**. `03-WINDOW-TYPES.md` gives the format `OBJECT ID — FAMILY NAME, PASSENGER COUNT` and `04-SCREEN-INVENTORY.md` RQ-03 shows it as `REQUEST R-10482 — KAPLAN, 5 PASSENGERS`. As with every other uppercase element in this file, the string is authored in sentence case and transformed in CSS. Right: an underlined 12px `--c-crown-ink` link `Open in full page` (`large` only), then a 26x26 square `✕` whose hover fill is `--c-crown-border`.

**The window is not draggable, not resizable, not minimisable, and does not stack** (D2). It appears in the same rectangle every time.

**Footer, settled** (D2). 52px, `--c-surface` fill, 1px `--c-border-item` top rule, 20px inset, buttons right-aligned in the order **`[Save]` secondary, then `[Save & Close]` primary**, left to right, 10px gap. There is no 2px footer border; the footer separates two parts of one enclosed thing, so it takes the 1px item rule.

**Unsaved changes** (D2). Closing with a dirty form raises an S3 confirm (6.3) reading `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary.

**`Open in full page`** routes to the same content rendered as a workspace (S5), for printing and for two-monitor work. **The window tab strip does not appear on S5.** Sections stack down the page instead.

**Tab count.** Six is not a cap. The cap is **eight** (D2). Requests have six tabs, Clients have seven, and both are legal. Tabs never scroll and never overflow, which is the whole reason for the cap.

**States.**

| State | Treatment |
|---|---|
| Open | As specified. No entry animation. |
| Close ✕ hover | Button fill `--c-crown-border` |
| Focus, ✕ | `--focus-ring` at `--focus-offset`, per D4 |
| Loading record | Per D6: rows of `--c-band-service` fill where content would be, no spinner, no shimmer. See 6.5. |
| Error loading | The page-level message band (6.2), inside the body, above the first section. |
| Unsaved changes on close | The confirm (6.3). |
| Save | No confirmation. D3: no confirmation at all for any save. |

```html
<div class="c-backdrop"></div>
<div class="c-window" role="dialog" aria-modal="true" aria-labelledby="wtitle">
  <div class="c-window__title">
    <span id="wtitle">Request R-10482 — Kaplan, 5 passengers</span>
    <div class="c-window__titleright">
      <a href="/requests/R-10482/full">Open in full page</a>
      <button class="c-window__close" aria-label="Close">✕</button>
    </div>
  </div>
  <nav class="c-wtabs"> ... 2.6 ... </nav>
  <div class="c-window__body"> ... 2.7 ... </div>
  <div class="c-window__footer">
    <button class="c-btn c-btn--secondary">Save</button>
    <button class="c-btn c-btn--primary">Save &amp; Close</button>
  </div>
</div>
```

```css
.c-backdrop {
  position: fixed; inset: 0;
  background: rgba(28,31,27,0.42);   /* 00-DECISIONS.md D2. No token exists yet. */
  backdrop-filter: none;             /* explicitly no blur */
}
.c-window {
  position: fixed; left: 160px; top: 70px;
  width: 1120px; height: 760px;      /* outer footprint, border included */
  background: var(--c-surface);
  border: 2px solid var(--c-crown);
  box-shadow: var(--shadow-window);
  display: flex; flex-direction: column;
}
.c-window__title {
  display: flex; align-items: center; justify-content: space-between;
  height: 40px; padding-left: 16px; flex: 0 0 auto;
  background: var(--c-crown);
  font-size: 15px; font-weight: 700; letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--c-ink-invert);
  cursor: default;                   /* not draggable */
}
.c-window__titleright { display: flex; align-items: center; gap: 8px; }
.c-window__titleright a {
  font-size: 12px; color: var(--c-crown-ink); text-decoration: underline;
}
.c-window__close {
  width: 26px; height: 26px;
  background: transparent; border: 0;
  color: var(--c-ink-invert);
}
.c-window__close:hover { background: var(--c-crown-border); }
.c-window__body {
  flex: 1 1 auto;                    /* 630px at the large size, DERIVED */
  padding: var(--pad-window);
  background: var(--c-surface);
  overflow-y: auto;                  /* the only scrolling region in the window */
}
.c-window__footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  height: 52px; flex: 0 0 auto;
  padding: 0 var(--pad-window);
  background: var(--c-surface);
  border-top: 1px solid var(--c-border-item);
}
```

Scrollbar treatment in the body is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

### 2.6 Window tab strip

**What it is.** Tabs on a dialog. **They are tabs on a dialog, not places in the app.** They do not appear outside the window and they are not a fourth navigation level.

**Where it appears.** On `large` windows only. `medium` and `small` have no tab strip (D2), and neither does the S5 full-page rendering of the same record.

**Tabs.** Requests: Details, Itinerary, Fares & Quotes, Payments, Documents, History. Clients have seven. The cap is eight (D2), and because of the cap the strip never scrolls and never overflows. If a record proposes a ninth tab, that is a content problem, not a layout problem.

**Geometry.** 34px, `--c-band-header`, 1px bottom `--c-border-container`. Labels 13px/600, 18px padding. Active tab: `--c-surface` fill, `--c-crown` 700, with 1px left and right borders `--c-border-container` that overlap the strip's bottom border so the tab and the body read as one surface.

**Counts.** A label carries a plain count in parentheses when it holds records: "Payments (2)", "Documents (5)". Plain parentheses, ordinary ink, no badge, no pill, no colour. A tab with no records carries no parenthetical.

**Focus.** `--focus-ring` at `--focus-offset`, per D4.

```css
.c-wtabs {
  display: flex; height: 34px; flex: 0 0 auto;
  background: var(--c-band-header);
  border-bottom: 1px solid var(--c-border-container);
}
.c-wtab {
  display: flex; align-items: center;
  padding: 0 18px;
  font-size: 13px; font-weight: 600;
  color: var(--c-ink-2);
  text-decoration: none;
}
.c-wtab.is-active {
  position: relative; bottom: -1px;   /* overlaps the strip's bottom border */
  background: var(--c-surface);
  color: var(--c-crown); font-weight: 700;
  border-left: 1px solid var(--c-border-container);
  border-right: 1px solid var(--c-border-container);
}
```

### 2.7 Bordered section inside the window

**What it is.** The stacked content blocks in the window body. Each is a container, so it takes the 2px border.

**Geometry.** Full body width, 1076px nominal at the `large` size (**DERIVED**, see 2.5), 2px `--c-border-container`, 16px vertical gaps between sections, each with a `--c-band-header` header strip whose label is 12px/700 uppercase 0.7px `--c-ink-on-band`. The header strip is the same component as 2.3, at the same fixed 32px.

**When not to.** Do not nest a bordered section inside a bordered section. Two border weights are the whole grammar: 2px means enclosed, 1px means list item. A third level of nesting has no border weight available to express it.

```html
<section class="c-wsection">
  <div class="c-sechead"><span class="c-sechead__label">Passengers</span>
                         <span class="c-sechead__count">5</span></div>
  <div class="c-wsection__body"> ... form field rows, 5.1 ... </div>
</section>
```

```css
.c-wsection {
  width: auto;                        /* 1076px nominal in a large window */
  border: 2px solid var(--c-border-container);
  background: var(--c-surface);
}
.c-wsection + .c-wsection { margin-top: 16px; }
```

---

## 3. DATA

### 3.1 Column header row

**What it is.** The 30px band naming the columns.

**Geometry.** 30px, `--c-band-service` fill, labels 12px/700 **sentence case, no uppercase, no tracking**. This is the one 12px/700 element that is not uppercase. Getting this wrong is the most common typographic error in this system.

**States. None. The column header is not interactive.** No hover, no focus, no click, **no sort arrow, no sortable behaviour**, no resize handle, no drag to reorder, no select-all control. `00-DECISIONS.md` D17 names a sortable or resizable column header as a defect. Sorting is the Sort select in the control strip (2.4).

**Rules.** No vertical column rules. Ever. They were considered and removed on purpose.

**Column widths, settled** (`00-DECISIONS.md` D13). The Requests queue list is the reference implementation. Build it exactly:

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

The Deadline column is wide because the sentence is the design. Do not shrink it to fit another column in.

At the 1300px minimum viewport (D11) the fixed columns total 1022px and the box's usable inner width is 1228px (1300, minus 40px of gutters, minus 4px of box border, minus 28px of box inset), so `Waiting on` fills 206px. **DERIVED** arithmetic, stated so the reference screen can be checked rather than eyeballed. Every other list in the product is this grid with different columns.

Where `04-SCREEN-INVENTORY.md` lists different columns for the same screen, D13 wins and that list is a defect to report.

```css
.c-colhead {
  display: flex; align-items: center;
  height: 30px; padding: 0 14px;
  background: var(--c-band-service);
  font-size: 12px; font-weight: 700;
  text-transform: none; letter-spacing: normal;
  color: var(--c-ink-2);
  cursor: default;              /* not interactive */
}
```

### 3.2 Group header

**What it is.** The 26px band that opens each group. Default grouping is by day.

**Geometry.** 26px, `--c-band-service` fill, 12px/700 uppercase 0.6px tracking, `--c-ink-2`.

**The urgency rule.** The group header **speaks**. When the group holds anything inside 4 hours the label prints `--c-urgent` and gains a clause:

```
DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS
```

**The band fill stays `--c-band-service`.** It does not turn red, pink, amber or anything else. Urgency is a sentence, not a colour block.

Group headers repeat on page break when the screen is printed (`00-DECISIONS.md` D16; `03-WINDOW-TYPES.md` owns the print spec).

| State | Fill | Label |
|---|---|---|
| Default | `--c-band-service` | `--c-ink-2`, "DUE TOMORROW — 6 REQUESTS" |
| Holds anything inside 4h | `--c-band-service`, unchanged | `--c-urgent`, clause appended |
| Hover | None. Group headers are not interactive. |
| Collapsed | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Collapsing groups is not part of the design language and should not be added without a decision. |

```html
<div class="c-grouphead is-urgent">Due today — 9 requests, 3 within four hours</div>
```

```css
.c-grouphead {
  display: flex; align-items: center;
  height: 26px; padding: 0 14px;
  background: var(--c-band-service);
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.6px;
  color: var(--c-ink-2);
}
.c-grouphead.is-urgent { color: var(--c-urgent); }
```

### 3.3 Data row

**What it is.** One record, one 44px row.

**Geometry.** 44px tall, 1px `--c-border-item` rule under each row, 14px/400 `--c-ink` cell text, hover fill `--c-band-service`. Cells follow the widths in 3.1.

**The rule that governs everything about this component: THE ROW STAYS A ROW.**

No fill. No tint. No left bar. No icon. No glyph column. No bold on the family name. No extra height. No zebra striping. No vertical rules. Nothing is pinned, duplicated, lifted out of sort order, flashed, filled or ticked down. **The row does not move and does not change shape. It changes what it SAYS.**

Default sort is deadline ascending and default grouping is by day, so urgent rows are already at the top and never need lifting.

**There is no selection checkbox.** See 3.9.

| State | Treatment |
|---|---|
| Default | `--c-surface`, 1px `--c-border-item` bottom rule |
| Hover | Fill `--c-band-service`. Nothing else changes. |
| Focus | `--focus-ring` at `--focus-offset`, per D4. D4 names rows explicitly, so a row is a focusable element. |
| Urgent | **The row is unchanged.** Only the deadline cell (3.5) changes, and the stage cell if overdue. |
| Loading | Rows do not load individually. The grid loads. See 6.5. |
| Empty grid | See the empty state, 6.4. |

**Interaction.** Double-click opens the record window. Single click on the record-ID link (3.4) opens the record window. Single click elsewhere on the row does not open anything. No drag and drop. No context menu action that depends on a selected state, because there is no selected state.

**Semantics and keyboard.** `07-BUILD-STANDARDS.md` mandates TanStack Table behind the wrapper in `lib/table/` (`00-DECISIONS.md` D15) and requires every path to be completable by keyboard alone, with focus returning to the originating row after the record window closes. Because D4 puts the focus ring on rows, **rows are focusable**, and the table wrapper owns their tab index. The accessible structure, a real `<table>` versus `role="grid"`, and the key that activates a focused row are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not settle it inside a screen; settle it once in the wrapper.

```html
<div class="c-row" tabindex="-1">
  <div class="c-cell c-cell--recid"><a class="c-recid" href="/requests/R-10482">R-10482</a></div>
  <div class="c-cell c-cell--client">Kaplan</div>
  <div class="c-cell c-cell--trip">Tel Aviv, 12 Aug, 5 pax</div>
  <div class="c-cell c-cell--stage"> ... 3.6 ... </div>
  <div class="c-cell c-cell--waiting">Client payment</div>
  <div class="c-cell c-cell--fare"> ... 3.7 ... </div>
  <div class="c-cell c-cell--deadline"> ... 3.5 ... </div>
  <div class="c-cell c-cell--agent"> ... 3.8 ... </div>
</div>
```

```css
.c-row {
  display: flex; align-items: center;
  height: 44px; padding: 0 14px;
  border-bottom: 1px solid var(--c-border-item);
  font-size: 14px; font-weight: 400; color: var(--c-ink);
}
.c-row:hover { background: var(--c-band-service); }
.c-cell--recid   { width: 88px; }
.c-cell--client  { width: 150px; font-weight: 600; }
.c-cell--trip    { width: 190px; }
.c-cell--stage   { width: 130px; }
.c-cell--waiting { flex: 1 1 auto; }
.c-cell--fare    { width: 100px; text-align: right; font-variant-numeric: tabular-nums; }
.c-cell--deadline{ width: 340px; text-align: right; }
.c-cell--agent   { width: 74px;  text-align: right; }
```

### 3.4 Record-ID link

**What it is.** The underlined identifier that opens the record window on a single click. "R-10482".

**Geometry.** `--c-link`, underlined always, not on hover. Size **DERIVED** as 14px body, weight **DERIVED** as 400, from the data row text spec in 3.3. Column width 88px (D13).

**When not to.** The client name is not a link. The record-ID is the one link in the row. Do not add a second one and do not add an "Open" action column.

```css
.c-recid { color: var(--c-link); text-decoration: underline; }
```

### 3.5 The deadline cell, all three states

**What it is.** The most important cell in the product. It carries all of the urgency, and it carries it as a sentence. 340px, right-aligned (D13), and it must never wrap.

**The four deadline types are always spelled out in full and never abbreviated:** `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`. There is no fifth type. Any document naming `Airline limit`, `Issue by`, `TTL` or similar is a defect (`00-DECISIONS.md` D8).

**Only the first two ever go red.** `Follow up` and `Check-in opens` stay in ordinary ink at all times because they are not money.

**State 1, calm.**

```
Ticketing limit — today 3:20 PM
```
14px/400 `--c-ink`.

**State 2, inside four hours.** The text grows to 15px/700 in `--c-urgent` and **gains a clause**:

```
Ticketing limit — today 3:20 PM, 3 hours left
```

**State 3, overdue.** The sentence changes tense and names the miss, at **15px/700 `--c-overdue`**. D8 settles the size: overdue is the **same size as urgent, not larger**.

```
Ticketing limit — expired 11:40 AM, 24 minutes ago
```

That row's Stage cell replaces the stage word with `OVERDUE` at 11px/700 uppercase `--c-overdue`, no tracking (D9, and see 3.6).

15px is the only grid text above 14px in the entire product. The row height does not change in any state. The row does not move.

**Two deadlines, one sentence, settled.** Every obligation stores two times: the supplier's stated number, immutable and exactly as given with the IANA zone it was quoted in, and our own derived action-by time (supplier time, minus client payment time, minus issuance time, pulled into office hours through the Israeli business calendar). `00-DECISIONS.md` D8 settles what the grid shows:

- The grid cell shows **our derived action-by time** as the sentence.
- The supplier's stated number appears in the record window's Deadlines section as a separate labelled field reading `Stated by supplier`, and in the deadline explainer. **It does not appear in the grid cell.** Any spec printing a second line such as `Airline limit 3:20 PM` under the grid sentence is a defect.
- Sorting and counting run on ours. Overdue is computed against the **supplier's** number, never against our internal buffer, or the counter never reaches zero and staff learn to ignore it.

All of this arithmetic is server-side, in `server/deadlines/` (D15). None of it happens in the browser.

**Zone display in the grid cell** is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Countdowns compute against the deadline's own IANA zone, and the deadline explainer prints that zone, but the grid sentence carries no zone label, so a Brooklyn Desk agent reading a limit quoted in Asia/Jerusalem cannot tell whose 3:20 PM it is. Decide one rule for the whole grid: either always render in the deadline's own zone with the zone named, or always render in the desk's zone.

```html
<span class="c-deadline">Ticketing limit — today 3:20 PM</span>
<span class="c-deadline is-urgent">Ticketing limit — today 3:20 PM, 3 hours left</span>
<span class="c-deadline is-overdue">Ticketing limit — expired 11:40 AM, 24 minutes ago</span>
```

```css
.c-deadline { font-size: 14px; font-weight: 400; color: var(--c-ink); }
.c-deadline.is-urgent  { font-size: 15px; font-weight: 700; color: var(--c-urgent); }
.c-deadline.is-overdue { font-size: 15px; font-weight: 700; color: var(--c-overdue); }
```

Deadlines are **words**, in the same face as everything else, and stay proportional under D7 because they are not a right-aligned numeric column in the tabular sense; they are a sentence. No ticker font. No letterspaced numeric readout. No countdown that visibly ticks down, there is no animation in this product. No progress bar. No clock glyph.

See 7.1 for the full sentence grammar, including rounding and plural forms.

### 3.6 Stage cell

**What it is.** The booking stage as a word in a column, in ordinary ink. 130px, left-aligned (D13).

**Seven stages, zero colours** (`00-DECISIONS.md` D9):

`Accepted` · `Payment pending` · `Paid` · `Ready to issue` · `Sent to ticketing` · `Ticket issued` · `Confirmation sent`

Any file saying "eight stages" is a defect, including any earlier version of this one. There is no unnamed eighth stage to wait for.

**The client onboarding machine is a separate lifecycle.** It belongs to the client record, it has six states, and it is not a booking stage. **One screen never shows two steppers.** The onboarding state may appear on a request as a read-only reference to the client record, never as a second progression.

**This is the single most common thing a designer will try to improve. Do not.** No colour coding of booking stage. No chips, no pills, no badges, no tags, no dots, no coloured fills. Stage is a word in a column in ordinary ink.

**Blocked is a flag, not a stage.** It carries a mandatory reason and a follow-up date. Its presentation is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**, and it must not be solved with a colour, a fill or a glyph.

**One override only.** When the row is overdue (3.5), this cell prints `OVERDUE` in place of the stage word: 11px/700 uppercase `--c-overdue`, **no tracking** (D9).

```css
.c-stage { font-size: 14px; font-weight: 400; color: var(--c-ink); }
.c-stage.is-overdue {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: normal;
  color: var(--c-overdue);
}
```

### 3.7 Fare cell

**What it is.** A money column. 100px, **right-aligned**, `tabular-nums` (D13).

Under `00-DECISIONS.md` D7, tabular figures are no longer restricted to this cell and pagination. They apply to any right-aligned numeric column and any currency value: fares, fees, totals, balances. Apply the class wherever that is true, and nowhere else.

```css
.c-cell--fare,
.c-num { text-align: right; font-variant-numeric: tabular-nums; }
```

Currency format is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**: whether amounts display in the transacted currency or a base currency, whether a symbol or a code is shown and on which side, decimal places, thousands separator, and how a mixed-currency total is rendered in a report. The product handles US and Israel travel, one screen records an explicit currency field, and several reports total money across records, so this blocks more than one screen.

**Related product rule this cell must eventually express:** a quoted fare ages and needs a "verified at" stamp. Where that stamp appears, in this cell, in an adjacent column, or only in the record window, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not solve it with a colour, a warning icon or an amber fill.

### 3.8 Agent cell

**What it is.** Who owns the record. 74px, right-aligned (D13).

**Rules.** Initials in **squares**. No circular avatars. No photographs, ever. 0 radius like everything else, and `00-DECISIONS.md` D17 lists "circular anything" among the things every file must stop saying.

The initials square's dimension and fill are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not reuse the 26x26 crest tile size, that is the crest.

```html
<span class="c-agent"><span class="c-agent__initials">MR</span> M. Roth</span>
```

### 3.9 Row selection, deleted

**There is no row selection in this product and there are no bulk actions.**

`00-DECISIONS.md` D13 gives the reference grid's columns exhaustively and there is no selection column among them. No screen in `04-SCREEN-INVENTORY.md` lists a selection column or defines a bulk action, and `01-CONSULATE-DESIGN-SYSTEM.md` never mentions either. Earlier drafts of this file shipped a leading checkbox cell in the data row markup and then declared its width, its selected-row treatment, its select-all control and its bulk actions all unspecified. That component is removed.

This section number is kept so that references to it land somewhere honest rather than on a different component. If a real need for a multi-record action appears, it is a new decision for `00-DECISIONS.md`, not a component to reinstate quietly. The select-all control that would have lived in the column header is also gone, which is consistent with the column header being non-interactive (3.1).

### 3.10 Pagination

**What it is.** Explicit numbered pages at the bottom of the box. There is no infinite scroll in this product and no "load more" button.

**Geometry.** 38px tall, 2px top border `--c-border-container`, `--c-band-service` fill. Page numbers are 0-radius bordered boxes. The active page is `--c-crown` fill, `--c-ink-invert`, 700. Counts use `tabular-nums` (D7).

Individual page-box dimensions, their border colour, and the item count string format are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

| State | Treatment |
|---|---|
| Default page box | Bordered box, 0 radius |
| Hover | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |
| Active | `--c-crown` fill, `--c-ink-invert`, 700 |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled (previous on page 1) | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |
| Single page of results | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Hiding the bar entirely is not stated anywhere. |

Pagination is removed when a screen is printed (D16).

```css
.c-pager {
  display: flex; align-items: center;
  height: 38px; padding: 0 14px;
  background: var(--c-band-service);
  border-top: 2px solid var(--c-border-container);
  font-variant-numeric: tabular-nums;
}
.c-pager__page.is-active {
  background: var(--c-crown);
  color: var(--c-ink-invert);
  font-weight: 700;
}
```

### 3.11 Timeline row

**What it is.** One time-anchored event in a chronological list: a communication logged, a field changed, a service obligation on a trip. Used by the request and client History tabs, the client Communications tab, the messaging screens, and the Service Timeline.

**It is a data row (3.3) with a fixed column set, not a new surface and not a vertical connector line.** There is no dot, no rail, no spine, no alternating left and right layout, no icon per event type. Those are all elevation and decoration this product does not have. A timeline here is a list of rows under a column header row, in a bordered section.

**Geometry.** 44px, 1px `--c-border-item` bottom rule, 14px/400 `--c-ink`, hover `--c-band-service`, exactly as 3.3. **DERIVED** from the data row: `00-DECISIONS.md` D15 places it under `components/data/`, and `assets/tokens.css` defines one data row height for the product.

**Columns.** The set varies by screen and is given per screen in `04-SCREEN-INVENTORY.md`. Two shapes recur:

- **Communication log:** when, channel, direction, who, summary, linked request.
- **Change history:** when, who, field, before, after. `Price changed from 4,200 to 4,650` lives here and only here.
- **Service timeline:** event, the event's own local time and zone, our derived action-by time, owner, outcome.

**Rules.**

1. Communications and change history are two different records and are shown as two sections, never merged into one stream.
2. Money and any other right-aligned numeric value in these rows takes `tabular-nums` (D7).
3. A deadline inside a timeline row is the deadline cell (3.5) with all of its states, not a plain date.
4. Recurring rules and single occurrences are separate records, and each occurrence carries its own outcome.
5. Rows are read-only. A timeline row does not open a record window unless the screen says it does.

Column widths for each timeline shape are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. D13 settles the reference grid only.

### 3.12 Checklist row

**What it is.** One item in a gate: the send-to-issue checklist, the client onboarding checklist. Each item shows a **live computed answer**, not only a tick box.

**It is a data row (3.3) carrying a checkbox (4.7) and a sentence.** 44px, 1px `--c-border-item` rule, 14px/400 `--c-ink`. **DERIVED** from the data row, same reasoning as 3.11.

**Anatomy, left to right.** The checkbox (14x14, D5), the item text, and the computed answer. An item that cannot be satisfied prints the reason as a sentence in the same row rather than a colour or a glyph. Partial outcomes print as fractions in ordinary ink, `3/5`, and the countdown for a partial item runs from the **earliest unsatisfied person** (see 5.6).

**Rules.**

1. The checkbox is the checkbox control (4.7). No custom tick, no ring, no animation.
2. A satisfied item may print its confirming sentence in `--c-good`, which is text only and never a fill. An unsatisfied one prints in ordinary ink, not in red, because a checklist item that is not done yet is not urgent by itself.
3. The gate's primary button stays disabled until every item passes, and the disabled button's context prints the sentence naming what is outstanding, for example `Cannot send, 1 of 5 passports still missing`. The disabled button appearance itself is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** (see 4.2).
4. Each item carries an owner and a completed-at stamp, and may carry the explicit `Client has not provided this yet` state (5.4).
5. Checklist templates are admin-managed. The row renders whatever the template defines; it never hard-codes the item list.

Row height when the computed answer wraps to a second line is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not silently shrink the type to fit.

### 3.13 Attachment row

**What it is.** One document **version** in a documents list: passports, visas, signed authorisations, correspondence.

**It is a data row (3.3) with document columns.** 44px, 1px `--c-border-item` rule, 14px/400 `--c-ink`, hover `--c-band-service`. **DERIVED** from the data row, same reasoning as 3.11. No thumbnail, no file-type icon, no card, no tile, no drag-and-drop upload target.

**Columns.** Document type, holder, number, issued, expires, version, uploaded by, uploaded at.

**Rules.**

1. **Documents version, they never overwrite.** A renewed passport is a new document with a new number, and the superseded book stays listed, because it may still carry a valid visa and its number may be printed on an issued ticket.
2. Passport and payment data live in controlled secret storage. Fields render **masked**, with an explicit reveal action that writes to the audit log. The masked form and the reveal control's appearance are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Never render this data into documents, spreadsheets, prompts or user-visible configuration.
3. Expiry is a fact in a column, not an alarm. Passport validity is a rule about destination and trip dates, and it is expressed as a sentence in help text (5.5) or on the checklist (3.12), never as a red row.
4. Opening a document uses a `medium` window (D1), which is an S2 at a different size, not a new surface and not a browser tab.
5. Upload is a page-header or section action, not a drop zone. There is no drag and drop in this product.

Column widths are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

---

## 4. CONTROLS

`00-DECISIONS.md` D14 permits `shadcn/ui` as the base for these controls, because its components are copied into the repository as source you own rather than imported as an opaque package. Restyle them to the tokens at install time, before forty screens exist. Material UI, Ant Design, Chakra, Bootstrap and PrimeReact are forbidden as dependencies.

### 4.1 Button geometry, shared by all buttons

All buttons: **34px tall, 0 radius, 16px horizontal padding, 10px gaps between adjacent buttons.** Label 14px. No icons in buttons. No loading spinner, there is no animation.

```css
.c-btn {
  display: inline-flex; align-items: center;
  height: 34px; padding: 0 16px;
  font-family: inherit; font-size: 14px;
  border: 0; background: none; cursor: pointer;
}
```

Adjacent buttons are spaced by the container's `gap: 10px` (see the window footer in 2.5 and the page header in 1.10) rather than by a margin on the button itself, so the same button works in either position.

### 4.2 Primary button

**When to use.** The single most likely action on the screen or in the window. One per page header. In the window footer, `Save & Close`, rightmost (D2).

**Geometry.** `--c-crown` fill, `--c-ink-invert` label, 14px/600.

| State | Treatment |
|---|---|
| Default | `--c-crown` fill, white 14px/600 |
| Hover | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `--c-crown-hover` is the derivable candidate, it is the object tab hover fill and is not scoped to the crown the way `--c-crown-rule` is, but it has not been confirmed for buttons. |
| Pressed | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** This blocks the send-to-issue gate (3.12), which depends on a disabled primary. |
| Loading | Does not exist. No spinner is permissible, there is no animation in this product. |

```css
.c-btn--primary { background: var(--c-crown); color: var(--c-ink-invert); font-weight: 600; }
```

### 4.3 Secondary button

**When to use.** Every action that is not the primary one. `Save`, to the left of `Save & Close`. `Close` in a read-only `medium` window. `Export`. `Keep editing` in a confirm.

**Geometry.** `--c-surface` fill, 1px `--c-border-control`, `--c-ink` label, 14px/400. Note the weight difference from primary: 400, not 600.

| State | Treatment |
|---|---|
| Default | As above |
| Hover | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** `--c-band-service` is the derivable candidate. |
| Pressed | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |

```css
.c-btn--secondary {
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  color: var(--c-ink); font-weight: 400;
}
```

### 4.4 Destructive button, settled

**Settled by `00-DECISIONS.md` D3.** A destructive button is a **secondary button with `--c-urgent` label text and a 1px `--c-urgent` border**. Nothing else changes: 34px, 0 radius, 16px padding, `--c-surface` fill, 14px/400.

**There is no filled red button anywhere in this product.** Urgency is a sentence, and red is ink, not a fill. If you are looking at a solid red button, it is a defect.

**When to use.** Void a ticket, issue a refund, delete a client record with bookings, change a user's role, release a hold, discard unsaved changes, cancel a request, delete a draft proposal, remove a traveller from a booking. That list is exhaustive, and every one of those actions also raises a confirm (6.3).

**When not to.** Anything not on that list. `00-DECISIONS.md` D3 is explicit that unnecessary confirmations train the reflex that defeats the necessary ones, and the same is true of destructive styling. A `Cancel` button that closes a dialog is a secondary button, not a destructive one.

| State | Treatment |
|---|---|
| Default | `--c-surface` fill, 1px `--c-urgent` border, `--c-urgent` label 14px/400 |
| Hover | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled | Occurs on the four type-to-confirm actions, which keep this button disabled until the confirming word is typed. Appearance is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building** |

```css
.c-btn--destructive {
  background: var(--c-surface);
  border: 1px solid var(--c-urgent);
  color: var(--c-urgent); font-weight: 400;
}
```

### 4.5 Text input

**Geometry.** 30px tall, `--c-surface` fill, 1px `--c-border-control`, 0 radius. The border token is stated in `assets/tokens.css` as the edge for inputs, selects and secondary buttons. Width is set by the context.

Input font size is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Control text is 13px in the type scale and body is 14px, and form fields inside the record window plausibly want 14px. Decide once for the whole product, not per screen.

| State | Treatment |
|---|---|
| Default | 30px, `--c-surface`, 1px `--c-border-control` |
| Hover | No change. |
| Focus | `--focus-ring` at `--focus-offset`, per D4 |
| Disabled | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** This is reachable through 5.4, which disables a field when the client has not provided the value. |
| Error | 1px `--c-urgent` border, plus the message under the field. Settled by D5, see 5.3. |
| Read-only | **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.** Read-only field rows appear in the record window, so this blocks real screens. |

```css
.c-input {
  height: 30px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  font-family: inherit; color: var(--c-ink);
  padding: 0 8px;    /* 4px grid, not individually specified */
}
.c-input.is-error { border-color: var(--c-urgent); }
```

### 4.6 Select

**Geometry.** 30px tall, 1px `--c-border-control`, 0 radius, 13px control text. 260px wide in the control strip.

**It is never a native `<select>`.** Build one custom listbox and use it everywhere: the View picker trigger, Sort, Show, and every select inside a form. A native select's popup is drawn by the operating system and cannot be styled, so it arrives rounded, shadowed and at OS row heights, which breaks the radius rule, the one-shadow rule and the 30px row in a single control. Use the Radix-based select that `07-BUILD-STANDARDS.md` names, restyled to the tokens (D14).

**Panel.** Any open select panel is surface S4 (D1): solid `--c-surface`, 1px `--c-border-control`, **no shadow**, no radius, simply on top. Item rows 30px, **DERIVED** from the View picker (4.9), which is the same surface. Item rows are plain `--c-ink`, not underlined.

**Focus.** `--focus-ring` at `--focus-offset` on the trigger and on the focused item row, per D4.

The dropdown indicator glyph is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. The "no icons" rule is a navigation rule, and a select indicator is not navigation, so it is not forbidden. It is simply undrawn.

### 4.7 Checkbox, settled

**Settled by `00-DECISIONS.md` D5.** 14x14, 1px `--c-border-control`, `--c-crown` fill with a white check when on. 0 radius, it is a square. No animation on check. No colour beyond that.

**Focus.** `--focus-ring` at `--focus-offset`, per D4.

The indeterminate mark is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. It is only reachable if a parent-child checkbox pattern is introduced, which no screen currently defines.

```css
.c-check {
  width: 14px; height: 14px;
  appearance: none;
  border: 1px solid var(--c-border-control);
  background: var(--c-surface);
}
.c-check:checked {
  background: var(--c-crown);
  /* white check mark, drawn as a mask or an inline SVG. No animation. */
}
```

### 4.8 Radio, settled

**When to use.** Two to four mutually exclusive options that must all stay visible. More than four, use a select.

**Settled by `00-DECISIONS.md` D5.** 14x14 **square**, with a 6x6 `--c-crown` centre square when on. **There are no circles in this product**, so a radio is a square with a smaller square inside it. Border 1px `--c-border-control`, matching the checkbox.

The old tension between "no circles" and "a radio is a circle" is closed. Do not ship a circle, and do not substitute a checkbox, which means something different.

**Focus.** `--focus-ring` at `--focus-offset`, per D4.

```css
.c-radio {
  width: 14px; height: 14px;
  appearance: none;
  border: 1px solid var(--c-border-control);
  background: var(--c-surface);
  display: inline-grid; place-content: center;
}
.c-radio:checked::before {
  content: "";
  width: 6px; height: 6px;
  background: var(--c-crown);
}
```

### 4.9 The View picker, L3 navigation

**What it is.** The dropdown in the control strip that narrows the current queue. Navigation level 3 of three, and the place surplus piles go when an object would otherwise exceed seven queue tabs (D12).

**Critical behaviour.** Choosing a view **does not change the queue tab.** It narrows it. And the section header strip **appends the view name**:

```
REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD
```

**Geometry of the trigger.** 260x30 select in the control strip (2.4), built as the custom listbox in 4.6.

**Geometry of the panel.** Surface S4: 320px wide, `--c-surface`, 1px `--c-border-control`, **no shadow, no radius**. Group captions 11px/700 uppercase 0.7px `--c-ink-3`. Item rows 30px with right-aligned counts. Item label size is **DERIVED** as 13px control text. Item rows are plain `--c-ink` and **not underlined**: they are menu rows, not in-page hyperlinks.

**Groups, in this order.**

| Group | Contents |
|---|---|
| MY VIEWS | The agent's saved views |
| PRICING GROUPS | Belev Echad, Scheiman, Community All |
| BY AGENT | One row per agent |
| ALL | The unfiltered view |

The pricing groups are real business objects. Each carries its own per-passenger booking fee, effective-dated and resolved in `server/fees/` (D15). They are not tags and they are not colours.

```html
<div class="c-viewpicker">
  <div class="c-viewpicker__cap">My views</div>
  <a class="c-viewpicker__item" href="#"><span>Needs action today</span><span>12</span></a>
  <div class="c-viewpicker__cap">Pricing groups</div>
  <a class="c-viewpicker__item" href="#"><span>Belev Echad</span><span>34</span></a>
  <a class="c-viewpicker__item" href="#"><span>Scheiman</span><span>9</span></a>
  <a class="c-viewpicker__item" href="#"><span>Community All</span><span>61</span></a>
  <div class="c-viewpicker__cap">By agent</div>
  ...
  <div class="c-viewpicker__cap">All</div>
  <a class="c-viewpicker__item" href="#"><span>All requests</span><span>412</span></a>
</div>
```

```css
.c-viewpicker {
  width: 320px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  box-shadow: none;
}
.c-viewpicker__cap {
  display: flex; align-items: center;
  height: 30px; padding: 0 14px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.7px;
  color: var(--c-ink-3);
}
.c-viewpicker__item {
  display: flex; align-items: center; justify-content: space-between;
  height: 30px; padding: 0 14px;
  font-size: 13px; color: var(--c-ink); text-decoration: none;
}
.c-viewpicker__item:hover { background: var(--c-band-service); }
```

Whether a count of zero prints here is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. The zero-prints-as-nothing rule is stated for queue tabs only, and a saved view with no records is a different situation from an empty pile.

### 4.10 Date field

**NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building.**

What is known and constrains any answer:

- Input height is 30px, 0 radius, 1px `--c-border-control`.
- **Deadlines are never a typed field.** They are anchored to an event, "24 hours before this flight", and they recompute when the flight moves. A date field must never be offered for a deadline. It is only ever for a genuine calendar fact such as a date of birth or a passport expiry.
- Every stored instant is UTC plus the IANA zone it was quoted in. Never a naive local timestamp.
- **No date arithmetic in the browser.** `server/datetime/` and `server/calendar/` own it (D15), and Luxon types never leave the wrapper folder.
- The Israeli business calendar (Sunday to Thursday weeks, Friday half days, Shabbat, moving holidays) is a correctness dependency for every internal derived time.
- Any date picker overlay is surface S4: solid `--c-surface`, 1px border, no shadow, no radius.

### 4.11 Inline links

**Rule.** In-page hyperlinks are always underlined, always `--c-link`. Always, not on hover. Menu rows inside a panel are not hyperlinks and are not underlined (1.8, 4.6, 4.9).

| Context | Size | Colour |
|---|---|---|
| Crown utility links | 12px | `--c-ink-invert` |
| Window title bar, "Open in full page" | 12px | `--c-crown-ink` |
| Control strip, "Edit / Create New View" | 12px | `--c-link` |
| Record-ID in a data row | 14px DERIVED | `--c-link` |
| Empty state and not-found links | 13px, 14px per D6 context | `--c-link` |

**Focus.** `--focus-ring` at `--focus-offset`, per D4.

### 4.12 Textarea, settled

**Settled by `00-DECISIONS.md` D5.** Same border as an input, 1px `--c-border-control`, `--c-surface` fill, 0 radius. **Minimum height 68px. Resizable vertically only.**

A textarea is the one control that makes its form field row `auto` height instead of 34px (D5, and see 5.1). Width fills the value column.

**Focus.** `--focus-ring` at `--focus-offset`, per D4.

```css
.c-textarea {
  min-height: 68px;
  resize: vertical;
  background: var(--c-surface);
  border: 1px solid var(--c-border-control);
  font-family: inherit; color: var(--c-ink);
  padding: 6px 8px;    /* 4px grid, not individually specified */
}
```

---

## 5. FORM

Forms live inside the record window and inside workspace pages (S5). Every primitive below is settled by `00-DECISIONS.md` D5.

### 5.1 Form field row, settled

**What it is.** One label and one value, side by side, inside a bordered window section (2.7).

**Geometry** (D5):

| Thing | Value |
|---|---|
| Row height | **34px**, or auto for a textarea |
| Rule between rows | 1px `--c-border-field` |
| Label column | **180px**, 13px/400 `--c-ink-2`, **right-aligned**, 12px gutter |
| Value column | Fills the remaining width |

**Structure.** Label column left, value column right. **The label is not above the input.** This is Dynamics inheritance and it is deliberate. The label is 400 weight, not 600; a form label in this product is secondary text, and the value is the thing being read.

The value column width follows from the section: 1076px nominal section width at the `large` size, minus 4px of section border, minus the 180px label column, minus the 12px gutter, leaves 880px. **DERIVED** by subtraction from D5 and the window arithmetic in 2.5. Build it as `flex: 1 1 auto` rather than a hard number.

```html
<div class="c-field">
  <div class="c-field__label">
    <label for="pp">Passport number</label>
    <span class="c-req">Required</span>
  </div>
  <div class="c-field__value">
    <input class="c-input" id="pp" aria-describedby="pp-help">
    <div class="c-notprovided">
      <label><input type="checkbox" class="c-check"> Client has not provided this yet</label>
    </div>
    <div class="c-help" id="pp-help">As printed on the machine-readable line.</div>
  </div>
</div>
```

```css
.c-field {
  display: flex; align-items: center;
  min-height: 34px;
  border-bottom: 1px solid var(--c-border-field);
}
.c-field--textarea { align-items: flex-start; height: auto; }
.c-field__label {
  width: 180px; margin-right: 12px;
  text-align: right;
  font-size: 13px; font-weight: 400; color: var(--c-ink-2);
}
.c-field__value { flex: 1 1 auto; }
```

### 5.2 Required marker, settled

**Settled by D5.** The marker is the **word `Required`**, at 11px/700 uppercase `--c-ink-3`, printed after the label. **No asterisk.** No red. No glyph.

Before adding one, read the product rule: **mandatory fields cause fabricated data.** Offshore intake staff under volume pressure will type a placeholder passport number rather than fail to save. Required markers should be rare and reserved for fields where a wrong value is worse than a missing one. In most cases the correct component is 5.4, not 5.2.

```css
.c-req {
  margin-left: 6px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: normal;
  color: var(--c-ink-3);
}
```

### 5.3 Validation error, settled

**Settled by D5.** 13px/400 `--c-urgent`, **on its own line under the field**, plus a **1px `--c-urgent` border on the control** (see 4.5). No icon, no fill, no tooltip.

**Copy rule.** The message names the field and what to do. Match the deadline sentence discipline in 7.1. Never "Invalid input".

```css
.c-fielderror {
  font-size: 13px; font-weight: 400; color: var(--c-urgent);
}
```

### 5.4 The "client has not provided this yet" control, settled

**This is the most product-critical component in this document. Build it before you build required markers.**

**What it is.** An explicit, storable value meaning "this field is knowingly empty". It is not a blank. It is not a null. **Missing-information reports read this value; they never count blanks** (D5). That is what makes the reporting trustworthy, and it is the mechanism that stops offshore staff typing a fake passport number under time pressure. **It is not optional.**

**When to use.** On **every field a client is expected to supply**: passport number, passport expiry, date of birth, nationality, loyalty and Matmid number, meal preference, seating preference, SSRs.

**When not to.** On fields the agency itself owns, such as the assigned agent or the pricing group.

**Behaviour** (D5).

1. A checkbox (4.7) sits in the field's **value column**, labelled with the literal sentence `Client has not provided this yet`.
2. Ticking it **clears and disables** the field, records the state, and **satisfies the form**.
3. The record then reads as knowingly-empty, not as blank, everywhere downstream.
4. In read mode, the value column prints the sentence rather than an empty space, so nobody reads a gap as an oversight.
5. It participates in the partial-completion counts, see 5.6. Three of five passports in reads `3/5`.

**Geometry.** Checkbox 14x14 per 4.7. Label 13px/400 `--c-ink-2`, **DERIVED** from D5's control-text scale for form labels. The disabled input treatment is still open, see 4.5. The read-mode sentence prints in `--c-ink-3`, **DERIVED**, because it is tertiary information standing in a value slot.

**States.**

| State | Input | Sentence |
|---|---|---|
| Unticked, empty | Enabled, empty | Not shown |
| Unticked, filled | Enabled, value | Not shown |
| Ticked | Cleared and disabled | `Client has not provided this yet` in `--c-ink-3` |
| Read mode, ticked | Not rendered | Same sentence |

```css
.c-notprovided { font-size: 13px; font-weight: 400; color: var(--c-ink-2); }
.c-notprovided.is-set { color: var(--c-ink-3); }
```

### 5.5 Help text, settled

**Settled by D5.** 13px/400 `--c-ink-3`, under the control. A sentence under the field, never a tooltip on an icon, because there are no icons.

Help text is where the passport rules belong. Passport validity is not a date alarm, it is expiry against destination rule against which trip date applies: six months beyond entry for Thailand and the UAE, six months at time of visa application for India, three months beyond departure for Schengen plus issued within the previous ten years, validity at entry only for Canada and Australia. Under-16s get five-year passports against ten for adults. A field cannot express that. A sentence can.

```css
.c-help { font-size: 13px; font-weight: 400; color: var(--c-ink-3); }
```

### 5.6 Partial completion display

**Partial is a first-class outcome.** Three of five passports in. Four of five seats confirmed.

**Rule.** Show `4/5` as text, in ordinary ink, and drive the countdown from the **earliest unsatisfied person**. Not a progress bar. Not a ring. Not a segmented meter. Not a colour that shifts from red to green.

Placement and size are **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. The derivable form is plain 14px/400 body text in the value column, but where the fraction sits on a checklist row (3.12) versus in a field row versus in a grid cell has not been settled.

---

## 6. FEEDBACK

`00-DECISIONS.md` D6 settles this group. What was already fixed is what feedback may **not** do: no animation beyond an instant state change, no auto-dismissing message carrying information the user needs, no coloured status fills, no shadow except on S2 and S3, and **never a toast**.

### 6.1 Inline validation

See 5.3, which D5 settles: 13px/400 `--c-urgent` on its own line under the field, plus a 1px `--c-urgent` border on the control.

`--c-good` is text only and never a fill, so a green "valid" tick on a filled background is forbidden. There is no success state on a field; a field that is correct simply looks ordinary.

### 6.2 Page-level message band, settled

**What it is.** A full-width band carrying a message about the whole screen, not about one field.

**Geometry** (D6, the error case). Directly under the page header: **38px**, `--c-band-service` fill, **2px `--c-urgent` left border**, 13px/400 `--c-ink`. No shadow, no radius, no icon, no close button that discards information the user still needs. Inside a record window, the same band sits in the body above the first section.

**Never a toast.** D6 is explicit. There is no toast component in this product and no auto-dismiss.

Two uses are settled by D6 and use this band: the error message, and the slow-load message `Still loading. The connection to Sabre may be slow.` after ten seconds. Whether a non-error message keeps the 2px `--c-urgent` left border, or takes a different left border, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. Do not invent a second fill; the two band fills in this product are `--c-band-header` and `--c-band-service`.

```css
.c-msgband {
  display: flex; align-items: center;
  height: 38px; padding: 0 14px;
  background: var(--c-band-service);
  border-left: 2px solid var(--c-urgent);
  font-size: 13px; font-weight: 400; color: var(--c-ink);
}
```

### 6.3 The confirm, surface S3, settled

**What it is.** A small modal for a yes/no decision only (D1). Same construction as the record window: 2px `--c-crown` border, 40px `--c-crown` title bar, `--shadow-window`. **No tab strip and no scrolling body.**

**Geometry.** 520 wide, auto height to a maximum of 420, centred, y=200 (D1, the `small` size). It may open over the box (S1) or over a record window (S2), and it is the only thing that stacks. Nothing stacks on it.

**Where confirms apply, exhaustively** (D3). Unnecessary confirmations train the reflex that defeats the necessary ones, so this list is closed.

**Type-to-confirm**, where the user types a specific word into a 30px input before the destructive button enables, applies to exactly four actions:

1. Void a ticket
2. Issue a refund
3. Delete a client record that has bookings
4. Change a user's role

**Plain confirm**, no typing:

- Release a hold
- Discard unsaved changes
- Cancel a request
- Delete a draft proposal
- Remove a traveller from a booking

**No confirmation at all** for everything else, including every save, every navigation, every filter change, and marking work complete.

**Buttons.** A destructive button (4.4) and a secondary button (4.3), in the footer, right-aligned, 10px gap, **DERIVED** from the window footer in 2.5 because D1 defines this surface as the same construction. The discard case reads `Discard your changes to this request?` with `[Discard]` destructive and `[Keep editing]` secondary (D2).

**Copy.** A sentence naming exactly what will happen and what it affects. Never a bare "Are you sure?".

**Product rule the copy must honour.** A correction cannot exist without naming what it corrects. Financial records are append-only. Voided records stay visible and searchable, marked void, so the confirm sentence for a void names the record being voided, and the resulting state is a visible voided record, not a disappearance.

### 6.4 Empty state, settled

**Settled by D6.** Inside the box, below the column headers: **160px tall**, content centred vertically, left-aligned at `--pad-box`.

- **Line 1:** 14px/400 `--c-ink`, states what is empty.
- **Line 2:** 13px/400 `--c-ink-2`, states the way out.
- **No illustration, no icon, no button.**

The section header strip, control strip and column header row all remain, because the user needs the View picker to get out. A count of zero prints as nothing at all on the queue tab, so the user can reach an empty grid without warning, which is exactly why line 2 is mandatory.

Where a screen's way-out is a link rather than a sentence, it is an underlined `--c-link` link on line 2 (4.11). `04-SCREEN-INVENTORY.md` supplies the literal sentence for every screen; use those strings verbatim and fit them to this two-line shape. Any screen entry that assumes a one-line empty state at `--c-ink-2` is following a superseded pattern and should be reported.

Whether the section header strip prints `0 items` alongside this is the open count-string question in 2.3.

```css
.c-empty {
  display: flex; flex-direction: column; justify-content: center;
  height: 160px; padding: 0 var(--pad-box);
}
.c-empty__line1 { font-size: 14px; font-weight: 400; color: var(--c-ink); }
.c-empty__line2 { font-size: 13px; font-weight: 400; color: var(--c-ink-2); }
```

### 6.5 Loading state, settled

**Settled by D6.** Up to **10 rows of 44px `--c-band-service` fill** in place of the data rows. **No spinner, no skeleton shimmer, no progress bar**, which follows from there being no animation in this product.

Past **10 seconds**, a page-level message band (6.2) appears reading:

```
Still loading. The connection to Sabre may be slow.
```

Rows do not load individually. The grid loads. The record window body uses the same treatment where its content is a list, and the window itself does not animate in.

```css
.c-row--loading {
  height: 44px;
  background: var(--c-band-service);
  border-bottom: 1px solid var(--c-border-item);
}
```

### 6.6 Error and not-found, settled

**Error** (D6). A page-level message band (6.2) directly under the page header. 38px, `--c-band-service`, 2px `--c-urgent` left border, 13px/400 `--c-ink`. **Never a toast.**

**Not found** (D6). The box renders with one line:

```
That record does not exist, or it was deleted.
```

plus an underlined link back to the queue.

**Save failure rule.** A failed save must never silently discard typed data and must never auto-dismiss its message. The message stays until the user acts on it.

### 6.7 Saved indicator

The form of the saved indicator is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**. `03-WINDOW-TYPES.md` describes a treatment at the same tier as this file; confirm it against the arbiter before building rather than choosing between them silently.

**Constraints already settled.** No toast, ever (D6). No confirmation dialog on save (D3). No animation. `--c-good` is text only and never a fill, so a green success banner is forbidden and a green sentence is available.

**What must be true regardless of form.** Every price, deadline, approval, override, message and ticket action has an owner, a timestamp, a status and a history. So the durable saved indicator is a record of who saved what and when, and that belongs in the History window tab, not only in a transient message.

### 6.8 There is no permission-denied state

**Settled by D6.** The product has two roles and both can do everything operational. Supervisor review is after the fact, not a gate. **Any spec describing a blocked action for a booking agent is a defect.** Do not build a denied screen, a greyed-out action with a lock, or a "you do not have permission" message.

The one exception is changing a user's role, which is supervisor-only and also type-to-confirm (D3, item 4).

Safety in this product comes from workflow gates, not from permissions. That is what the send-to-issue checklist (3.12) and the confirm list in 6.3 are for.

---

## 7. TEXT

Three strings in this product are assembled rather than authored. Build them with these rules and they will always agree with each other.

### 7.1 The deadline sentence

**Grammar:** `{type} — {when}{, clause}`

**Rules.**

1. `{type}` is one of exactly four strings, always spelled out in full, never abbreviated: `Ticketing limit`, `Hold expires`, `Follow up`, `Check-in opens`. There is no fifth type (D8).
2. `{when}` is a natural phrase in the same face at the same size: `today 3:20 PM`, `tomorrow 9:00 AM`, `expired 11:40 AM`. Not a countdown readout, not a monospace timestamp, not an ISO string.
3. The clause appears only in the urgent and overdue states. Urgent appends the time remaining. Overdue appends the time elapsed and flips the verb to `expired`.
4. **Rounding and plurals** (D8). Round **down** to whole units and pluralise: `3 hours left`, `1 hour left`, `48 minutes left`. Under one hour, use minutes. Under one minute, `less than a minute left`.
5. **Overdue forms** (D8). `expired 11:40 AM, 24 minutes ago`. Past 24 hours, `expired yesterday 11:40 AM`. Beyond that, `expired 28 July`.
6. **Sizes** (D8). Calm 14px/400 `--c-ink`. Inside four hours 15px/700 `--c-urgent`. Overdue 15px/700 `--c-overdue`, the same size as urgent, not larger.
7. Only `Ticketing limit` and `Hold expires` ever take `--c-urgent` or `--c-overdue`. `Follow up` and `Check-in opens` stay in ordinary ink at all times, because they are not money.
8. The grid sentence names **our derived action-by time**. The supplier's stated number appears only in the record window's Deadlines section as `Stated by supplier`, and in the deadline explainer (D8).
9. Countdowns compute against the deadline's own IANA zone, **server-side**, never against the browser clock. The zone label in the grid cell is the open question in 3.5.

```
Calm     :  Ticketing limit — today 3:20 PM
Urgent   :  Ticketing limit — today 3:20 PM, 3 hours left
Urgent   :  Hold expires — today 5:00 PM, 48 minutes left
Urgent   :  Hold expires — today 5:00 PM, less than a minute left
Overdue  :  Ticketing limit — expired 11:40 AM, 24 minutes ago
Overdue  :  Ticketing limit — expired yesterday 11:40 AM
Overdue  :  Ticketing limit — expired 28 July
Never red:  Follow up — tomorrow 10:00 AM
Never red:  Check-in opens — Thursday 6:15 AM
```

The form for a deadline more than a week out, beyond a weekday name, is **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

### 7.2 The count line

**Grammar:** `{n} {noun}{, m within four hours}`

Prints at 13px/400 `--c-ink-2`, baseline-aligned with the H1 in the page header (1.10). The same construction, uppercased at 12px/700 with 0.6px tracking, is the group header (3.2).

```
Page header count line :  14 requests, 3 within four hours
Group header           :  DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS
```

The urgency clause is dropped entirely when the count is zero. It is never rendered as ", 0 within four hours".

### 7.3 The section header string

**Grammar:** `{OBJECT} — {QUEUE} — {VIEW}`

- `{OBJECT}` is the active L1 object tab. `REQUESTS`.
- `{QUEUE}` is the active L2 queue tab. `NEEDS ACTION TODAY`.
- `{VIEW}` is appended **only when a view narrower than ALL is chosen**. `BELEV ECHAD`.

Rendered at 12px/700 uppercase, 0.7px tracking, `--c-ink-on-band`. The separator is the same spaced em dash used in the deadline sentence.

```
No view chosen  :  REQUESTS — NEEDS ACTION TODAY
View chosen     :  REQUESTS — NEEDS ACTION TODAY — BELEV ECHAD
```

Choosing a view never changes `{QUEUE}`. It only appends `{VIEW}`. If your implementation swaps the queue segment when a view is chosen, it is wrong.

---

## 8. Composition rules

### 8.1 What contains what

```
canvas
└── box                          exactly one per data screen, surface S1
    ├── section header strip     always first
    ├── control strip            always second
    ├── column header row        always third
    ├── group header  ┐
    ├── data row      │ repeating
    ├── data row      │
    ├── group header  │
    ├── data row      ┘
    └── pagination                always last

backdrop
└── record window                surface S2, one at a time, same rectangle, never nested
    ├── title bar                40px
    ├── window tab strip         34px, large size only
    ├── body (the only scrolling region)
    │   ├── bordered section
    │   │   ├── section header strip
    │   │   └── form field rows
    │   └── bordered section
    └── footer                   52px, [Save] then [Save & Close]

confirm                          surface S3, over S1 or S2, and nothing over it
    ├── title bar                40px
    ├── sentence, and the type-to-confirm input on the four actions in D3
    └── footer                   [destructive] and [secondary]
```

### 8.2 What may never contain what

| Never | Because |
|---|---|
| A box inside a box | Two border weights are the whole grammar. There is no weight left for a third level. |
| A bordered section inside a bordered section | Same reason. |
| A shadow on anything except S2 and S3 | `00-DECISIONS.md` D1 and D17. Those two surfaces, nothing else. |
| A record window inside a record window | One modal at a time. Three layers means it is a workspace, not a stack. |
| Anything stacked on a confirm | D1. The confirm is the top of the stack. |
| Queue tabs inside the record window | Window tabs are tabs on a dialog, not places in the app. |
| Content directly on the canvas | The product is one white rectangle on a grey-green field. |
| A scrolling region inside the window body | The body is the only scrolling region in the window. |
| A fourth navigation level | Three levels: object tabs, queue tabs, View picker. No more. |
| A button inside a section header strip | Actions live in the page header or the control strip. |
| More than seven queue tabs on an object | D12. The surplus goes in the View dropdown. |
| More than eight tabs on a record window | D2. Tabs never scroll and never overflow. |
| A sortable or resizable column header | D17. Sorting is the Sort select in the control strip. |
| A user menu on the crown | D17. `M. Roth` is a label; `Sign Out` is already a utility link. |
| A selection column or a bulk action | 3.9. Neither exists in this product. |
| A permission-denied state for a booking agent | D6. Both roles can do everything operational. |
| A toast | D6. Never, for anything. |
| Anything on the left edge | No rail, no strip, no drawer, no hamburger, ever. |

### 8.3 The four mistakes an agent is most likely to make

**1. Colour-coding the stage cell.** This is named in the design system as the single most common thing a designer will try to improve. **Seven stages, zero colours.** Stage is a word in a column in ordinary ink. The urge to add a green "Ticket issued" chip and an amber "Payment pending" chip will feel like an obvious improvement. It is the specific improvement this product was designed to refuse. There are no chips, pills, badges or tags anywhere in CONSULATE. The client onboarding lifecycle is a separate machine on the client record, and one screen never shows two steppers.

**2. Making the urgent row look urgent.** Urgency is a sentence, not a colour block. When you meet an overdue request the reflex is a red left bar, a pink row fill, a warning glyph, pinning it to the top, or bumping the row height. Every one of those is forbidden. Urgency lives in exactly five places, and none of them move the row: the deadline cell text, the `OVERDUE` word in the stage cell, the group header label, the queue tab count, and nothing else. Default sort is deadline ascending, so the urgent row is already at the top. It never needs lifting.

**3. Reaching for a second shadow, a radius, a spinner or a native control.** `--shadow-window` belongs to the record window and the confirm, and to nothing else. Dropdowns, the View picker, the More menu, select panels and date overlays all sit on solid white with a 1px border and are simply on top. Nothing has a corner radius, including initials squares, the crest tile, checkboxes, radios and pagination boxes. Nothing animates, so a loading spinner is not an option and neither is a fading toast. A native `<select>` brings all four failures at once, from the operating system, which is why every select in this product is a custom listbox.

**4. Building from a stale specification.** The gap register that used to close this document is gone, because `00-DECISIONS.md` answered it. Focus, the confirm, the empty, loading and error states, the form field row, the label and value columns, the checkbox, the radio, the destructive button, the record window footer, the column widths and row selection are all settled. If you are reading a document that tells you to stop and ask about any of those, that document is out of date and the correct response is to report it, not to follow it. The failure mode now is not leaving a value blank; it is shipping Bootstrap's focus ring, Material's ripple, a browser-blue outline on a rounded rectangle, or a filled red destructive button in a product whose whole thesis is that red is a sentence and not a fill.

**One more, structural.** Do not solve density by shrinking rows. 44px rows and 14px type give roughly 14 rows on a 900px viewport and that is the deliberate trade. Staff range widely in age and confidence, the screen has to be readable across a desk, and any screen can be printed and put in a folder. If a user needs more rows the answer is a better filter or a saved view, never a smaller row and never a density toggle.

### 8.4 Assembling the chrome

- Build the shell as a **flex column**: crown, then the queue tab band **when present**, then the page header, then the canvas. Never absolute y-offsets (D11).
- Reports, Admin and workspace pages (S5) have no queue band, and everything below moves up 38px.
- Minimum viewport 1300px. Below that the page scrolls horizontally. Desktop only.
- Admin reuses the queue tab band as section navigation (1.11, D10). It is not a left sidebar.
- Print removes the crown, the queue band, the page header buttons, pagination and the View controls, and replaces the crown with a print header carrying the agency name, the screen title, the active view and the timestamp. The box loses its border and prints as plain ruled rows, and group headers repeat on page break. `03-WINDOW-TYPES.md` owns the print specification and is authoritative for it (D16).

---

## 9. Where a value comes from, and what to do when it is missing

There is no gap register in this document. `00-DECISIONS.md` closed the numbered gaps, and a stale list that stops a developer on an answered question is itself a defect. Items that are still genuinely open are flagged inline, at the component they block, in the exact words **NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building**.

**Authority order.** When two files disagree, the higher one wins.

1. `assets/tokens.css`, every colour, size and spacing value
2. `01-CONSULATE-DESIGN-SYSTEM.md`, the locked design language
3. `00-DECISIONS.md`, resolutions of everything 01 left open
4. `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md`
5. `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE-SPECIFIC.md`, `07-BUILD-STANDARDS.md`
6. `assets/consulate-reference.html`

If a file below `00-DECISIONS.md` contradicts it, that file is a defect. Report it, do not follow it.

**Where the code lives** (D15). Components in this document map to `components/shell/`, `components/surfaces/`, `components/data/`, `components/controls/`, `components/form/` and `components/feedback/`. The TanStack Table wrapper lives in `lib/table/` and is never called directly from a screen. The Luxon wrapper lives in `lib/datetime/` and its types never leave that folder. All date arithmetic, deadline resolution, the two-deadline split, the Israeli business calendar, passport validity and fee resolution are **server-side**, under `server/`. `styles/tokens.css` is the single source of truth for values.

**Dependencies** (D14). `shadcn/ui` is permitted and recommended, restyled to the tokens at install time. Material UI, Ant Design, Chakra, Bootstrap, PrimeReact and anything else that arrives as an opaque import are forbidden.

**Adding a value.** If a value you need does not exist in `assets/tokens.css`, the design has not been made yet. Add the token to that file first, or stop and ask. Never write a raw hex into a component, never add a border-radius, never add a third border weight, and never add a second shadow.
