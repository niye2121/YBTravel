# YB Travel — Design System

## Current baseline — 8 September 2026

The user selected the Inbox design as the system-wide baseline. This section
supersedes the historical Requests Queue specification below.

- Instrument Sans everywhere, including settings, forms and profiles. IBM Plex
  Mono is reserved for identifiers and small technical labels.
- Page titles: 24px, weight 600, line-height 1.3, letter-spacing -0.02em.
- Shared `AppHeader` on every application route. Clicking the right-side avatar
  or name opens `ProfileMenu`, which contains the single Sign Out action.
- Secondary navigation: 44px, 13.5px text, green active underline. Inbox and
  Managed Groups must use the same `WhatsAppSubnav`, not duplicate markup.
- Canvas #f6f5f1, brand #0d2f24, text #1b1e1c, white panels, warm borders
  #e6e3da, row separators #eeece5. Preserve semantic warning/error colors.
- Controls: 9px radius; shared action buttons 36px tall, 13px text. Panels:
  14px radius. Dense data tables may retain their compact row height.
- Respect browser zoom uniformly. Do not add page-specific zoom compensation,
  Lato or Helvetica overrides, or a second header implementation.
- Keep each workflow's layout and permissions intact; consistent design does
  not mean changing tables into chat layouts or changing operational behavior.

Implementation source: `apps/web/src/styles/tokens.css` and shared AppShell
components. The earlier specification is retained below for historical context.

## Historical reference — August 2026 (superseded)

**Source:** `Requests Queue (standalone).html` — the design approved by YB Travel
**Extracted:** 7 August 2026
**Status:** Historical; superseded by the Inbox baseline above.

This supersedes the earlier Tailwind approximation. The approved design uses precise values that do not map onto Tailwind's default palette, so screens are built with these tokens explicitly rather than with utility classes. When the real codebase is set up, these become Tailwind theme tokens in `tailwind.config`.

---

## 1. Typography

**Typeface: Lato.** Not a serif. Headings are Lato at weight 900, not a serif face — this was the main error in the earlier approximation.

```
font-family: 'Lato', -apple-system, BlinkMacSystemFont, sans-serif;
```

| Use | Size | Weight | Letter-spacing |
|---|---|---|---|
| Wordmark "YB TRAVEL" | 19px | 900 | 0.4px |
| Logo tile "YB" | 12px | 900 | 0.5px |
| Page title (h1) | 26px | 900 | −0.2px |
| Section eyebrow ("REQUESTS") | 10.5px | 700 | 1.4px |
| Panel header | 11.5px | 700 | 1.1px |
| Group row label | 12px | 700 | 0.9px |
| Primary nav tab | 15px | 700 | — |
| Filter chip | 14px | 400 / 700 active | — |
| Table body | 14px | 400 (client 700) | — |
| Table header | 14px | 700 | — |
| Buttons | 14px | 700 primary / 400 secondary | — |
| Inputs, selects | 13.5px | 400 / 700 in selects | — |
| Meta and helper text | 13px | 400 | — |
| Item count, panel meta | 11.5px | 400 | — |

Numeric columns use `font-variant-numeric: tabular-nums` so figures align.

---

## 2. Palette

### Brand and chrome

| Token | Hex | Use |
|---|---|---|
| `green` | `#0f4430` | Primary brand green, buttons, active tab text |
| `greenLight` | `#12503a` | Top of header gradient |
| `greenDark` | `#0d3f2c` | Bottom of header gradient, nav strip |
| `greenDarker` | `#0a3324` | Borders on dark chrome |
| `greenHover` | `#15583d` | Primary button hover |
| `gold` | `#d9a326` | Logo tile, Go button |
| `goldBorder` | `#b8871a` | Gold button border |
| `goldHover` | `#e5b13a` | Gold button hover |
| `goldText` | `#3b2a05` | Text on gold |
| `goldCount` | `#a8761b` | Active filter count |

Header uses a gradient rather than a flat fill:

```css
background-image: linear-gradient(180deg, #12503a 0%, #0d3f2c 100%);
```

### Text

| Token | Hex | Use |
|---|---|---|
| `ink` | `#22221f` | Primary text |
| `ink2` | `#33332e` | Table cell text, secondary buttons |
| `muted` | `#4b4b44` | Table headers, labels, non-urgent deadlines |
| `muted2` | `#5c5c54` | Waiting-on text |
| `muted3` | `#6f6f66` | Meta text, agent column |
| `muted4` | `#7d7d74` | Eyebrow label |
| `muted5` | `#8a8a80` | Waiting-on party prefix, inactive counts |
| `navText` | `#e4ece8` | Header links |
| `deskText` | `#b9cec3` | "Brooklyn Desk" |
| `navMore` | `#dfeae4` | "More ▾" |

### Surfaces and lines

| Token | Hex | Use |
|---|---|---|
| `panelHead` | `#e9eae1` | Panel header bar |
| `panelHeadText` | `#3f4a42` | Panel header text |
| `toolbar` | `#fbfbf7` | Toolbar row under panel header |
| `tableHead` | `#f4f4ed` | Table header row and group rows |
| `rowHover` | `#f6f8f3` | Row hover — a green-tinted grey, not neutral |
| `hoverBtn` | `#f2f2ec` | Secondary button hover |
| `line` | `#cfcfc4` | Panel border, header rules |
| `lineBtn` | `#b6b6ac` | Button and select borders |
| `lineRow` | `#e6e6dc` | Row separators |
| `lineSoft` | `#ddddd3` | Toolbar bottom border |
| `lineSoft2` | `#dcdcd2` | Group row bottom border |
| `lineHead` | `#d6d6cd` | Filter strip bottom border |

### Status

| Token | Hex | Use |
|---|---|---|
| `red` | `#b3261e` | Urgent deadline text, bold |
| `redGroup` | `#9c2b1c` | Urgent group row label |

Note the two reds differ. The group header red is slightly deeper than the row-level red.

---

## 3. Geometry

**Border radius is 2px** on inputs, buttons and panels — 3px on the logo tile, and `3px 3px 0 0` on the active nav tab. Nothing else is rounded. No shadows anywhere.

| Element | Height |
|---|---|
| Top utility bar | 60px |
| Primary nav strip | 44px |
| Filter strip | 40px |
| Search input | 28px |
| Go button | 30px |
| Page action buttons | 34px |
| Toolbar selects | 28px |
| Logo tile | 26 × 26px |
| Page header icon | 30 × 30px |

**Horizontal padding is 22px** on all full-width chrome. Panels sit at `margin: 0 22px 26px`.

Minimum page width is 1280px. This is a desktop tool and does not attempt to be responsive.

---

## 4. Layout components

### Top utility bar

Logo tile, wordmark, desk name, flexible spacer, 360px search input, Go button, then Setup / Help / Sign Out links and the user name at 20px gaps.

### Primary nav

Tabs at 2px gaps, bottom-aligned. Active tab is a white block with `border-radius: 3px 3px 0 0`, green text, 9px/22px padding. Inactive tabs are transparent with `#e4ece8` text and 9px/20px/12px padding, so the active tab appears to sit forward. "More ▾" is right-aligned.

### Filter strip

Saved views on white with a 26px gap. Active view carries a **3px bottom border in brand green** with `margin-bottom: -1px` so it meets the strip's own border. Counts sit alongside labels — gold when the view is active, `#8a8a80` when not.

### Page header

30 × 30px green tile containing a 13px gold-outlined square. Eyebrow above, 26px/900 title with meta text baseline-aligned beside it. Actions right-aligned: one filled green primary, then outlined secondaries.

### Panel

1px `#cfcfc4` border, 2px radius. Header bar in `#e9eae1` with uppercase title left and count right. Toolbar row beneath in `#fbfbf7`.

### Table

`table-layout: fixed` with explicit widths:

| Column | Width |
|---|---|
| Request # | 104px |
| Client | 130px |
| Trip | 250px |
| Stage | 150px |
| Waiting On | fills remaining |
| Fare | 110px |
| Deadline | 290px |
| Agent | 64px |

Cell padding is `11px 8px`, with 14px on the outermost edges. Header cells use `7px 8px`. Group rows span all eight columns with `6px 14px` padding.

The Deadline column is deliberately wide — 290px — because urgent values carry both an absolute time and a countdown.

---

## 5. Behavioural rules

**Waiting On** always splits responsibility: the party (`Us` or `Client`) in `#8a8a80`, a middot, then the detail. An agent scans this column to separate what is on them from what is blocked.

**Deadline** escalates typographically rather than with badges or icons. Urgent is `#b3261e` bold; everything else is `#4b4b44` regular. No colour fills, no pills.

**Group rows** carry counts in the label itself — "DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS" — rather than in a separate element.

**Row hover** is `#f6f8f3`, a faintly green grey. Using neutral grey here reads as wrong against the warm surface palette.

---

## 6. Implementation notes

The approved file uses inline styles throughout. In the real codebase these become Tailwind theme tokens:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      yb: {
        green: '#0f4430', greenLight: '#12503a', greenDark: '#0d3f2c',
        greenDarker: '#0a3324', greenHover: '#15583d',
        gold: '#d9a326', goldBorder: '#b8871a', goldHover: '#e5b13a',
        ink: '#22221f', muted: '#4b4b44', line: '#cfcfc4',
        panelHead: '#e9eae1', tableHead: '#f4f4ed', rowHover: '#f6f8f3',
        danger: '#b3261e',
      },
    },
    fontFamily: { sans: ['Lato', 'system-ui', 'sans-serif'] },
    borderRadius: { DEFAULT: '2px' },
  },
}
```

Because the palette is warm-grey rather than neutral, **do not fall back to Tailwind's default `gray-*` scale anywhere.** Mixing the two is visible immediately — Tailwind greys are cool and will read as blue against these surfaces.

Radix primitives and shadcn/ui components are restyled to these tokens on adoption, as agreed in the stack document.
