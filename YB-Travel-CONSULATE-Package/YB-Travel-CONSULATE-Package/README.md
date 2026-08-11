# YB Travel — CONSULATE Design Package

Everything needed to design and build the YB Travel operations platform, for a developer joining with no prior context.

The design language is called **CONSULATE**. It was chosen by the client on 3 August 2026 from six competing concepts and it is **locked**. Nothing in this package is a suggestion.

---

## Start here, in this order

**1. Open `assets/consulate-reference.html` in a browser.** Two minutes. That is the product. It is the Requests queue list, built to spec, and you can read its CSS.

**2. Read `01-CONSULATE-DESIGN-SYSTEM.md`.** Fifteen minutes. It is short on purpose and it contains the five rules that make CONSULATE itself.

**3. Read `00-DECISIONS.md`.** It settles everything 01 left open, and section D18 is the register of what is still genuinely undecided. If you build only one habit from this package, make it this: when you hit an open item, stop and ask, do not invent.

Then use the rest as reference rather than reading it end to end.

---

## What each file is for

| File | Who reads it | What it does |
|---|---|---|
| `README.md` | You, now | This |
| `00-DECISIONS.md` | Everyone | The arbiter. Settles every question 01 left open, plus the D18 open items register. **When two files disagree, this one wins.** |
| `01-CONSULATE-DESIGN-SYSTEM.md` | Everyone | The locked design language. The five rules, the silhouette, how urgency works, and what the product deliberately does not have |
| `02-COMPONENT-LIBRARY.md` | Developers | Every component, every state, with reference markup |
| `03-WINDOW-TYPES.md` | Designers and developers | The five surfaces. Pop-ups, record windows, detail and instructional windows, settings, every kind of menu, plus print |
| `04-SCREEN-INVENTORY.md` | Everyone | The full application. Every screen, its URL, its components, its surface, its phase, plus the end-to-end flow and the build order |
| `05-CLAUDE-DESIGN-BRIEF.md` | **Paste into Claude Design** | Self-contained instructions for designing new screens in CONSULATE. Needs no other file |
| `06-CLAUDE-SPECIFIC.md` | **Rename to `CLAUDE-SPECIFIC.md`, put in the repo root** | The rulebook the coding agent reads on every session. Not `CLAUDE.md`, see below |
| `07-BUILD-STANDARDS.md` | The developer | Stack, folder structure, testing, the proposal PDF, accessibility |
| `assets/tokens.css` | The codebase | Every colour, size and spacing value. The single source of truth |
| `assets/consulate-reference.html` | Everyone | The executable form of the spec |

---

## The two files that do the real work

**`05-CLAUDE-DESIGN-BRIEF.md` goes to Claude Design.** Paste the whole file into a fresh session, then ask for the screen you need. It is deliberately self-contained, so it works with nothing else attached.

It carries one thing worth knowing about: a **spec block contract**. Every screen Claude Design produces comes with a machine-readable block describing what it built. Paste that block back into the design system. That is how the design and the code stay tied together as the product grows, instead of drifting apart over six months.

**`06-CLAUDE-SPECIFIC.md` becomes `CLAUDE-SPECIFIC.md` in the repository root. Not `CLAUDE.md`.**

Joe's projects all follow the same convention: a general `CLAUDE.md` carrying rules that apply across every project, which points at a per-project `CLAUDE-SPECIFIC.md`. Joe supplies the general `CLAUDE.md` separately. This file is the project half of that pair, and naming it `CLAUDE.md` would overwrite the general one and wipe out rules that apply to all his other work.

Claude Code reads both on every session, which binds the coding agent to the same rules the designer is working under. Where the two disagree on something specific to YB Travel, the specific file wins.

---

## The authority order

When two files disagree, the higher one wins. This matters, because the package is large and drift is the enemy.

1. `assets/tokens.css`
2. `01-CONSULATE-DESIGN-SYSTEM.md`
3. `00-DECISIONS.md`
4. `02`, `03`, `04`
5. `05`, `06`, `07`
6. `assets/consulate-reference.html`

Anything lower that contradicts something higher is a defect. Report it, do not follow it.

---

## Five things that will save you a week

**Zero border-radius. Everywhere. Forever.** No circles, no pills. Initials sit in squares. If you type `border-radius`, you have made a mistake.

**Never write a raw hex value.** Use a token. If the value you need is not in `tokens.css`, the design has not been made yet, so stop and ask.

**Urgency is a sentence, not a colour block.** The row never moves, never gets a coloured fill, never gets a left bar. It changes what it says. This is the rule most likely to get "improved" by someone who has not read 01 section 7.

**Booking stage carries no colour.** Seven stages, ordinary ink, no chips or badges. This is the single most common thing a designer will try to fix. Do not let them.

**`shadcn/ui` ships rounded, shadowed and modern.** CONSULATE is none of those things. Restyle it to the tokens on day one, before forty screens exist, not after.

---

## How this package was built, and how much to trust it

Six specification documents were drafted, then audited by two independent reviewers who found 129 contradictions, mostly because parallel authors closed the same open questions differently. `00-DECISIONS.md` was written to settle them, every document was corrected against it, and a third auditor read the whole corrected set and found seven remaining blocking problems, all of which were fixed. The reference HTML was rebuilt from scratch because the original contradicted the spec in about ten ways.

So: the values are cross-checked and the documents agree with each other. What is **not** settled is listed honestly in `00-DECISIONS.md` D18, fifty-five items, none of them defects and all of them decisions the client still owes you.

The three worth resolving before you start, because they block the most work: **D18 item 17**, the page-header icon glyph set, which appears on every screen. **D18 item 30**, the canonical pricing group list, which blocks four screens and all of Admin. **D18 item 31**, which instant triggers overdue, the supplier's stated time or our derived action-by time, because the two differ by hours on every held booking and it changes the meaning of the most important counter in the product.

---

*Prepared 9 August 2026 for YB Travel.*
