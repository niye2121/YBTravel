# Final audit — YB Travel / CONSULATE developer handoff package

**Audited:** `assets/tokens.css`, `assets/consulate-reference.html`, `00-DECISIONS.md`, `01-CONSULATE-DESIGN-SYSTEM.md`, `02-COMPONENT-LIBRARY.md`, `03-WINDOW-TYPES.md`, `04-SCREEN-INVENTORY.md`, `05-CLAUDE-DESIGN-BRIEF.md`, `06-CLAUDE.md`, `07-BUILD-STANDARDS.md`. Read in full, cross-checked by grep.

---

## VERDICT

**NOT READY** — seven blocking problems survived the correction pass, including a contradiction inside `00-DECISIONS.md` itself (D10 vs D11 on the Admin band), a shadow rule where the two highest-authority files say the opposite of the six below them, three window-geometry numbers that differ between `02` and `03`/`04`/`05`, and a reference HTML file that was never corrected and that `06-CLAUDE.md` orders every coding agent to read.

The good news is that the 129 contradictions were overwhelmingly fixed. What survives is a short, specific, fixable list — mostly a day's work — not a structural failure.

---

## Surviving problems

### Blocking

| # | File(s) | Problem | Fix |
|---|---|---|---|
| B1 | `00-DECISIONS.md` D10 vs D11, propagated into `02` §1.9/§8.4, `03` §6.3 vs §8.1, `04` §0.7 vs §11, `05` §5 vs §7, `06` rules 22 vs §10.10 | **The arbiter contradicts itself on the Admin chrome.** D10: "Admin is reached from `More ▾`… Its screens **reuse the queue tab band** as their section navigation, with the same 38px geometry". D11: "Reports, Admin and S5 workspaces have no queue band, and **everything below simply moves up 38px**." Both cannot hold: if Admin carries a 38px band, nothing moves up. `03` §8.1 and `04` §11 both write a paragraph proposing the reconciliation ("Admin carries no band **of queues**… it carries the same 38px band **component**") and both explicitly say "**If it is the wrong reading, this paragraph is the defect. Raise it against `00-DECISIONS.md`.**" It was never raised. Meanwhile `04` §0.7, `05` §5 and `06` rule 22 still repeat D11 verbatim, so three files tell the builder Admin's page header sits at y=84 and three tell him it sits at y=122. | Amend D11 in `00-DECISIONS.md` to read "Reports and S5 workspaces have no 38px band. Admin carries no band *of queues* but does carry the 38px band component as section navigation, so its chrome height is unchanged." Then delete the "Reports, Admin and S5" phrasing from `04` §0.7, `05` §5 and `06` rule 22. |
| B2 | `assets/tokens.css` L66 + header rule 4; `01` §2 rule Four and §8 — against `00` D17 and all six other files | **Shadow scope is inverted across the authority order.** `tokens.css`: `--shadow-window: 0 6px 24px rgba(0,0,0,0.35); /* the record window ONLY */` and rule 4, "Never introduce a shadow except `--shadow-window`, **which is used once**." `01` §2: "**Exactly one shadow exists in the entire product, on the record window.** Nothing else is elevated." `01` §8: "No shadows except the record window." Against that, `00` D17 bans the phrase "the only shadowed thing on screen" *"applied to anything other than S2 and S3"*, and `02` §0.6, `03` §1.4, `05` rule 4, `06` rule 4 and `07` §2/§8 all give the S3 confirm the shadow. tokens.css is authority rank 1 and `01` is rank 2, and the package's own rule is that lower files are defects — so a developer obeying the authority order builds the confirm **flat**, contradicting six documents. | Decide once. If the confirm keeps the shadow (the clear intent), change `tokens.css` to `/* S2 the window and S3 the confirm only */`, drop "which is used once", and rewrite `01` §2 rule Four and §8 to "Shadow belongs to exactly two surfaces, the record window and the confirm." |
| B3 | `02` §2.5, §2.7, §5.1 vs `03` §4.3, §4.4, §4.9, §11; `04` §12, §17; `05` §5, §6, §18.2 | **The record window's derived geometry differs by 4px in three places, and the two answers are in different files.** `02` §2.5: "760 total, **minus 4px of top and bottom border**, minus 40px title bar, minus 34px tab strip, minus the 52px footer… leaves **630px**"; medium body "**524px**"; section content width "**1076px**". `03` §4.3: "the four bands sum exactly: 40 + 34 + 52 = 126, leaving **634** for the body"; §4.9 "Body height is **528px**"; §4.4 "Section content width at `large` is **1080px**, that is 1120 less the 2px borders and the 20px insets" — which is arithmetically 1076, so 1080 is wrong on its own stated derivation. `05` §5 repeats 634/528 and §6 repeats 1080; `04` §12 repeats 528. `02` is right (both files agree the 1120×760 is the **outer** footprint including the 2px border, derived from D11's 160+1120+20). The number that matters most is 1080, because `05` §18.2 hands it straight to a Claude Design session as a prompt constant. | Fix `03` §4.3/§4.4/§4.9/§11, `04` §12/§17 and `05` §5/§6/§18.2 to 630 / 524 / 1076, and state the 4px border subtraction inline so it does not drift again. |
| B4 | Every file except `00` and `01` | **Roughly 160 open items point at a register that does not exist.** The canonical string is "**NOT YET SPECIFIED — see `00-DECISIONS.md`, raise before building**" and it appears 50× in `02`, 27× in `03`, 44× in `04`, 33× in `05`, 7× in `06`, 2× in `07`. `00-DECISIONS.md` contains the string **zero** times and has no open-items section at all. A third-party developer told to "see 00-DECISIONS.md" opens it and finds nothing about scrollbars, disabled states, currency format, panel widths or the four type-to-confirm words. | Add a section `D18. Open items` to `00-DECISIONS.md` holding the consolidated list (the "Known open items" section below is the merged set), and give each an ID so the inline flags can say "see D18.7". |
| B5 | `00` D1; `03` §1.3; `04` §0.2 and ~15 screen entries | **An S2 `medium` opening from inside an S2 `large` is forbidden by D1, flagged unspecified by `03`, and then specified anyway on fifteen screens.** D1: "An S3 confirm may open over an S2 window. **Nothing else stacks.**" `03` §1.3 carries it as an open item and gives a safe build ("the preview replaces the record window's body content in place, or the record window closes first"). But `04` then writes it as settled behaviour with no qualification on RQ-04 ("carrying a `Preview` button that opens GL-04… as an S2 `medium`"), RQ-07 ("an underlined `View` link opening GL-03 as an S2 `medium`"), RQ-08, CL-06, CL-07, CL-08, TV-03, TV-08, BK-05, BK-08, TK-07 and more — every Documents tab and every History tab in the product. This is the single most common interaction in the record window and it has two incompatible answers. | Settle it in `00-DECISIONS.md` D1 (recommended: an S2 `medium` read-only viewer *may* sit over an S2 `large`, since it carries no Save and cannot create a save-order problem), then remove the open item from `03` §1.3 and `04` §0.2. |
| B6 | `assets/consulate-reference.html` (unmodified, mtime predates all eight documents) | **The only executable artifact in the package contradicts the spec in about ten ways, and `06` §3 step 5 orders every coding agent to read it.** (a) Stage values in the data are `Proposal sent`, `Waiting for info`, `Quoted`, `Ticketed`, `New inquiry` — **none of the seven stages of D9**, and two of them are client-onboarding words in a booking Stage cell, which D9 forbids. (b) Deadline data carries `TTL 2h 51m` and `Issue 9h 40m` — the exact fifth-label abbreviations D8/D17 name as defects. (c) Active queue tab rule is `border-bottom-color:#0E4634` (crown green); every document specifies a 3px `--c-gold` rule. (d) Column header and group header both carry `border-bottom:1px solid #DDE1DB`; `05` §19.14 says "The column header band and the group header band have no bottom rule… Adding a rule is inventing a value." (e) Control-strip selects are 26px, not the 30px `--h-input`. (f) Pagination reads `Showing 1–10 of 48`, the exact grammar `05` §7 bans. (g) Page-header count line reads `48 open · 9 due today`, not `{n} {noun}{, m within four hours}`. (h) Section strip prints `48 items` although `04` §0.5 withdrew all item-count strings as unspecified. (i) The row data model carries thirteen raw hex colours (`bc:"#0891B2"`, `agc:"#4038B8"`, `bead:"sq"`…) for stage beads and agent colours — stage colour-coding, the single most-banned thing in the package. (j) The queue tab names do not match `04` §1's Requests list. `01` §10 says "Where this document and that file disagree, this document wins and **the file should be corrected**." It was not. | Either correct the file against `04` RQ-01 and D13/D9/D8, or delete it and delete the references in `01` §10, `06` §1 rank 6 and `06` §3 step 5. Do not ship it as-is. |
| B7 | `04` §11.2; `03` §8.2 | **Settings is materially incomplete: eight of the nineteen documented Admin areas have no home, and one of D10's eight sections has no content.** `04` §11.2 lists as **Unmapped** — Onboarding Checklists, Destination Entry Rules, Document Types, Decline Reasons, Stages and Flags, WhatsApp Channel, Saved Views, Intake Fields (plus Integration Status at "Low" confidence). `04` states the consequence itself: "every one of them is load bearing: onboarding checklists drive CL-05, destination entry rules drive TV-04, decline reasons drive RQ-20 and RP-02, intake fields drive D5 and RP-12." Separately, "**Escalation Ladders, which D10 names as a section, had no counterpart at all in the nineteen, so that content has never been specified.**" The client asked for settings windows; a third of the settings surface is unbuildable. | Amend D10 to place the eight unmapped areas inside the eight sections (they fit: checklists and intake fields under `Categories & Fees` or a renamed section, destination entry rules under `Deadline Rules` or `Document Types`→`Categories`, decline reasons under `Message Templates`/`Categories`, WhatsApp channel and integration status under `Audit & Security`, saved views under `Users & Roles`), and write the `Escalation Ladders` content. |

### Important

| # | File(s) | Problem | Fix |
|---|---|---|---|
| I1 | `06` §8 step 4 and step 5 | **Two dead section references and a wrong key list.** `06` twice cites "`05-CLAUDE-DESIGN-BRIEF.md` **section 9**" as the owner of the spec-block shape. `05` section 9 is "Urgency, deadlines, stages and status"; the spec block contract is **section 16**. Worse, `06` then enumerates the keys — "`name`, `kind`, `route`, `surface`, `shadow`, `radius`, `chrome`, `regions`…, `tokens`, `type`, `states`, `data`, `interactions`, `must_never`…, and `unspecified`" — and **omits `size`**, which `05` §16 requires ("`size`: large \| medium \| small, for S2 and S3 only"), while insisting "with the keys in the order given, **none added and none omitted**." A coding agent following `06` rejects a correct spec block, or accepts one with no size. | Change both references to section 16 and insert `size` after `surface`. |
| I2 | `06` §8 vs `05` §16 | **Three different mandatory "unspecified" strings.** `06` §8: write the exact string "`NOT YET SPECIFIED — see 00-DECISIONS.md, raise before building`", and inside a spec block use "that file's own form, `NOT YET SPECIFIED — ask before building: <what>`". `05` §16 and §20 actually require "`NOT YET SPECIFIED — raise with the design owner before building: <what>`", used 33 times. So `06` misquotes `05`, and a design-pass output using `05`'s string fails `06` §9's Definition of Done check ("Anything unspecified is flagged with the exact string from section 8"). | Pick one string. Recommend the `00-DECISIONS.md` form everywhere once B4 gives it somewhere to point, and fix `06`'s quotation of `05`. |
| I3 | `05` §3 vs `assets/tokens.css` | **`05` claims a verbatim copy of the token file and silently edits it — on the one contested value.** `05` §3: "This is the whole of `assets/tokens.css`, **copied**." A diff shows one substantive change: `tokens.css` says `--shadow-window: … /* the record window ONLY */`, `05` says `/* S2 and S3 only */`. That is `05` (rank 5) overwriting rank 1 to win argument B2, in a file explicitly designed to be pasted into a session with no other file present. | Restore the comment verbatim once B2 is decided, or drop the word "copied". |
| I4 | `06` §7.14 and `07` §2 vs `03` §4.6, `04` TK-02 / §9, `05` §9.4 | **The `VOID` word: settled in four files, declared unspecified in the two the coding agent reads.** `04` TK-02: "with the word `VOID` printed… **as a plain word in `--c-ink-2`**"; `05` §9.4 and §19.4 agree; `03` §4.6 Payments agrees. `06` §7.14 and `07` §2: "The exact ink token and size for the `VOID` word are **stated differently across the package files and are NOT YET SPECIFIED**." They are not stated differently; they are stated identically in four places. | Delete the open item from `06` §7.14 and `07` §2 and state `--c-ink-2`, 14px/400. |
| I5 | `02` §4.9 + `06` §6 ViewDropdown vs `03` §6.4 + `05` §6 | **The View picker panel width has two answers at the same tier.** `02` §4.9: "Surface S4: **320px wide**"; `06` states 320px as an *invariant*. `03` §6.4: "Width **NOT YET SPECIFIED**", covering all four panels; `05` §6: "one file says 320px and another lists it as open, so **treat it as unspecified and flag it**." `04` §0.8 and §17 item 6 flag the disagreement and build 320px anyway. | Settle all four panel widths in `00-DECISIONS.md` (320px for the View picker is fine) and delete the open item from `03` and `05`. |
| I6 | `04` §0.8 rows 1–3 | **The "defects found in other files" table reports three defects that no longer exist.** It says `01` §5 reads "Eight stages, zero colours" — `01` §5 now reads "**Seven** booking stages, zero colours". It says `01` §6 reads tabular-nums "is applied in exactly two places" — `01` §6 now carries the full D7 wording. It says the `tokens.css` closing comment reads "tabular ONLY in the Fare column and pagination counts" with a `.fare, .pagination-count` selector list — `tokens.css` now carries the D7 wording and the selector list `.num, .fare, .fee, .total, .balance, .pagination-count`. A developer will open `01` and `tokens.css` looking for defects that are not there and will lose confidence in the whole table. | Delete rows 1–3 of `04` §0.8. |
| I7 | `07` §1, "Tabular figures, per D7" | Same stale claim: "The helper selectors at the foot of `assets/tokens.css` **currently name `.fare` and `.pagination-count`**; extend that selector list". They currently name `.num, .fare, .fee, .total, .balance, .pagination-count`. | Delete or update the sentence. |
| I8 | `03` §4.6, §4.10, §4.11 | **Three stale gap claims against `04`.** §4.6: "this file names an `INTAKE` section that is **not in that inventory**" — `04` RQ-03 item 7 **is** `INTAKE`; only the `CLIENT` half of that open item is real. §4.10: "Help also has **no screen ID or build phase** in `04`" — `04` GL-01, Phase 1. §4.11: "The deadline explainer has **no screen ID or build phase** in `04`" — `04` GL-02, Phase 2; "The `Why this date` link is also **absent from that file's Deadlines descriptions**" — it is present at RQ-01, RQ-03, BK-02, BK-05 and GL-02. Only two sub-claims survive: the Deadline Rules deep-link target, and the missing `Why this date` link in `02` §3.5. | Rewrite the three open items down to what is actually still open. |
| I9 | `02` §2.3 | Same class: "`04-SCREEN-INVENTORY.md` states the strip prints `0 items` on an empty grid." `04` §0.5 explicitly withdrew it: "An earlier draft of this file invented `0 items`… **Both are withdrawn.**" | Update the sentence. |
| I10 | `02` §4.10 | **Dead folder reference contradicting D15.** "No date arithmetic in the browser. **`server/datetime/`** and `server/calendar/` own it (D15)." D15's tree has `lib/datetime/` (the Luxon wrapper) and `server/deadlines/`; there is no `server/datetime/`. | Change to `server/deadlines/` and `server/calendar/`. |
| I11 | `04` BK-14 vs `03` §5.4 and `05` §10 | **Cancelling a booking: settled in two files, open in a third.** `03` §5.4: "Cancelling a confirmed PNR… are **not** on D3's list… The other three get **no confirmation at all**." `05` §10 lists "cancelling a confirmed PNR" in the no-confirmation list as settled. `04` BK-14: "Whether cancelling a **booking** is covered by D3's plain-confirm entry `Cancel a request`… is **NOT YET SPECIFIED**… The two readings differ by a dialog on the most consequential reversible action in the product." `03` and `04` are peers, so there is no tiebreak. | Add the booking case to D3 explicitly, either way. |
| I12 | `01` §3, `02` §1.5, `03` §6.7, `05` §7 vs `04` | **The crown carries a `Setup` link on every screen and no `Setup` screen exists.** `02` §1.5 markup: `<a href="/setup">Setup</a>`. `04` has no `/setup` route, no screen ID, and does not list it in §16 "What is not in this inventory, and why" — while §16 does say "No settings screen for the individual user." Under `06` §3 step 4, "If the screen… is not in `04-SCREEN-INVENTORY.md`, **IT DOES NOT EXIST YET**", so the shell cannot ship. | Either give `Setup` a screen entry in `04` (or map it to `/admin/users`), or remove it from the crown in `01` §3, `02` §1.5, `03` §6.7 and `05` §7. |
| I13 | whole package | **No authentication screens anywhere.** `Sign Out` is a crown link, "last sign-in" and "Sign-in history" and "session policy" appear in Admin `Audit & Security`, but there is no sign-in screen, no session-expired state and no sign-out destination in `04`, and `04` §16 does not list them as deliberate absences. | Add them to `04` (or to §16 with a reason, if SSO makes them out of scope). |
| I14 | `03` §6.8 open item; `02` | **Menus are specified in behaviour but not buildable.** `03` §6.8: "Of the six forms above, only the `More` panel and the View picker have component entries in `02-COMPONENT-LIBRARY.md`. **The row context menu and the button dropdown have no anatomy and no states table there.**" On top of that all four panel widths are open (I5), the caret glyph is open, the select indicator glyph is open (`02` §4.6), the panel row cap is open, and the date-picker overlay is `02` §4.10 "NOT YET SPECIFIED" in its entirety. The client asked for "every type of menu"; the behaviour is complete, the geometry is not. | Add `02` entries for the row context menu and the button dropdown; settle widths, caret and indicator glyph together. |
| I15 | `06` §8 step 5 vs `01` header | **`06` tells agents to write into the locked design system.** "When the spec block comes back, **PASTE IT INTO THE DESIGN SYSTEM FIRST**… It goes into `01-CONSULATE-DESIGN-SYSTEM.md`". `01` is titled "Status: … **Locked**" and sits at authority rank 2, above the arbiter — so every new screen's spec block would silently outrank `00-DECISIONS.md`. | Send new spec blocks to `04-SCREEN-INVENTORY.md` (which `06` already does in the same sentence) or to a new appendix file at tier 4, not into `01`. |
| I16 | `05` §7 vs `02` §1.7 | Active object tab height: `05` says "a solid white block, **40px tall**… running 2px past the crown border" — internally impossible; `02` §1.7 derives "**The active tab is 42px tall**… 40 + 2 = 42, and the 2px is an overhang". `01` §3 is the ambiguous source. | State 42px with a −2px bottom margin in `01` and `05`. |

### Cosmetic

| # | File(s) | Problem | Fix |
|---|---|---|---|
| C1 | `01` §3 | The silhouette diagram's queue tabs (`Needs Action Today · Needs Intake · …`) do not match `04` §1's Requests queues (`My Requests, Needs Action Today, New Inquiries, In Research, Quoted, On Hold, All Requests`). It is a schematic, but `01` outranks `04`. | Label the diagram "illustrative" or use `04`'s names. |
| C2 | `assets/screenshots/01-work-screen.png` | Referenced by no document in the package. | Reference it from `01` §10 or delete it. |
| C3 | `06` §6 RecordWindow | `props: size: "large" \| "medium"` while the prose says "three sizes and no others, per D1". `small` lives on the separate `Confirm` component, which is correct, but the sentence reads as a contradiction. | Reword to "two sizes on this component; `small` is the `Confirm` component." |
| C4 | `01` §3 | "Everything is horizontal and it is all in the top 186px" — 148px where there is no queue band, per D11. `05` §7 states both; `01` states only 186. | Add "or 148px where the band is absent". |

---

## Values cited in NEITHER `tokens.css` NOR `01` NOR `00-DECISIONS.md`

Audit question 3. Every value below is used as a build constant but is sourced only from tier‑4/5 documents, which `tokens.css` rule 5 ("If a value you need does not exist here, the design has not been made yet. Stop and ask, do not invent one"), `06` §4 ("Never write a raw pixel value for anything that has a token") and `05` §19.11 ("If it is not in this file, it does not exist") all forbid. None are *contradictory* except where noted; they simply have no home in the three source-of-truth files.

| Value | Where it is cited |
|---|---|
| **3px `--c-gold`** active queue-tab / Admin-section rule | `02` §1.9 + §1.11, `03` §8.2, `04` §11, `05` §7 and §18.3 (four files, consistent; but `assets/consulate-reference.html` renders it `#0E4634`) |
| **0.6px** tracking, group header | `02` §0.4 + §3.2, `05` §4 (tokens.css defines 0.7px for `--t-header` only) |
| **26 × 26** crest tile | `02` §1.2, `05` §7 (the 26×26 ✕ *is* in D2; the crest is not) |
| **32 × 32** page-header icon tile | `02` §1.10, `04` §11 diagram, `05` §7 |
| **300 × 30** search field, **56 × 30** Go button, **356** total | `02` §1.4, `05` §7 |
| **260 × 30** View select | `02` §2.4 + §4.9, `05` §7, `06` §6 ControlStrip |
| **320px** View picker panel | `02` §4.9, `06` §6 — and contradicted as unspecified by `03` §6.4 and `05` §6 |
| **22px** object-tab horizontal padding | `02` §1.7, `05` §5 |
| **18px** queue-tab, window-tab and panel-row horizontal padding | `02` §1.9/§2.6/§1.8, `03` §6.2/§6.5, `05` §5 |
| **16px** button horizontal padding, **10px** button gap | `02` §4.1, `05` §5, `06` §6 Button, `07` §1 |
| **30px** panel / menu / View-picker row height | `02` §1.8 (marked DERIVED), §4.6, §4.9, `03` §6.2/§6.4/§6.5/§6.6, `05` §6 |
| **8px** gap between H1 and count line | `02` §1.10, `05` §7 |
| **14px horizontal / 10px vertical** padding, page message band | `03` §9.1, `05` §13 |
| **640px** maximum measure, help body copy | `03` §4.10, `04` GL-01 |
| **42px** active object-tab height | `02` §1.7 (DERIVED) — and contradicted by `05` §7's "40px" |
| **12px/400** inline link style | `02` §0.4 + §4.11, `05` §4 (tokens.css defines 12px only at 700) |
| **8px** input padding, **6px 8px** textarea padding | `02` §4.5, §4.12 (both self-flagged "4px grid, not individually specified") |
| **1076 / 630 / 524** vs **1080 / 634 / 528** | see B3 — derived, and derived two different ways |
| `rgba(28,31,27,0.42)` backdrop | in D2 as a literal with **no token**; correctly flagged in `02` §2.5 and `06` §4 as needing one |
| Thirteen raw hex colours in the row data model (`#0891B2`, `#7C4DDB`, `#14866A`, `#C2841E`, `#C2447E`, `#3E63DD`, `#16A34A`, `#B0AAC4`, `#4038B8`, `#0D7A70`, `#97620B`, `#6E33D6`, `#4B5565`) | `assets/consulate-reference.html` only — see B6 |

Recommendation: promote the recurring geometry (3px gold, 0.6px tracking, 26/32/56/300/260 sizes, 18/22/16/10/8 spacing, 30px panel row) into `tokens.css` as named tokens. They are used on every screen and they are exactly what an AI assistant will re-derive differently on screen forty-one.

---

## Is `05-CLAUDE-DESIGN-BRIEF.md` genuinely self-contained?

**Close, but no.** Pasted alone into a fresh Claude Design session it would produce a screen that is right in language and wrong in three specific numbers, and it cannot produce a complete deliverable at all for one required output.

It **does** carry, in full: the whole token table, the type scale with tracking and case, every fixed height, the five surfaces and three sizes, the chrome, the box content order, the D13 column widths, the confirm policy, the destructive button, the focus treatment, the form primitives including "Client has not provided this yet", the deadline grammar and four labels, the seven stages, the ticket and coupon vocabularies, the "does not have" list, the conflict protocol, the spec-block contract with two worked examples, and five copy-and-fill prompts. That is genuinely impressive and it is the strongest file in the package.

What it still depends on:

1. **`04-SCREEN-INVENTORY.md` for queue tab names** — acknowledged in §0 and handled (the developer pastes them).
2. **`04-SCREEN-INVENTORY.md` for per-screen empty-state copy** — acknowledged in §0 and handled.
3. **`04-SCREEN-INVENTORY.md` for the per-object window tab sets** — *not* acknowledged in §0, which says "There are exactly **two** of these". §18.2 quietly asks the developer to paste "the tabs for this object", so it is a third dependency and the count in §0 is wrong.
4. **`03-WINDOW-TYPES.md` for the entire print specification.** `05` says the product "has to be readable across a desk and **printable into a paper folder**" (§1) and repeats it in §14, but contains no print section, no print header, no print footer, and no checklist item for print. A designer using only `05` cannot design the printed form of the screen they just drew, and the checklist in §15 will not catch the omission.
5. **The three wrong derived numbers (B3).** §5 gives a 634px large body and a 528px medium body, §6 and §18.2 give 1080px sections. A design produced from `05` alone hands a coding agent numbers the component library disagrees with.
6. **`00-DECISIONS.md` for the surviving open items it decides on its own.** §10's "cancelling a confirmed PNR" is asserted as settled where `04` says it is open (I11); §6's shadow comment edits `tokens.css` (I3).

Fix items 3–5 and `05` is genuinely standalone. It is worth doing: `05` is the file most likely to be used in isolation.

---

## Is `06-CLAUDE.md` genuinely binding?

**Mostly yes.** It is unusually well-constructed for this purpose: numbered hard rules each carrying its reason, a mandatory per-session pre-flight, an explicit "STOP and ask, do not proceed" clause that closes the usual escape hatches ("Do not implement a temporary version. Do not implement it behind a feature flag. Do not implement it and add a TODO. Do not implement it in a branch 'to show what it would look like'"), a wrong/right token table, prop-level component contracts with the key line "**Adding a prop that lets a caller break an invariant is itself a violation**", 22 domain rules, a 60-item self-verify checklist, and 38 named common mistakes. An agent reading only this file would produce conformant CONSULATE code in almost every respect.

The weakest instructions, in order:

1. **§8 steps 4–5, the design-pass handoff.** This is the one procedure in the file that an agent must execute against another document, and it is wrong in three ways at once (I1, I2, I15): wrong section number twice, a key list missing `size`, and an instruction to write into the locked `01`. It is also the only place the file's own discipline breaks — everything else in `06` is checkable, this is not.
2. **§3 step 5, "Check `assets/consulate-reference.html`".** It is an instruction to read a file that contradicts the spec in ten ways (B6). It is hedged ("remembering it is the lowest authority… where it disagrees with 01 it is the file that is wrong") but hedging does not survive contact with an agent looking for a rendering precedent — the whole point of consulting it is to copy it.
3. **§7.14's "NOT YET SPECIFIED" on the `VOID` ink** (I4). It tells the agent to stop and ask about a value four other files settle. `02` §8.3 names this exact failure mode: "**Building from a stale specification…** If you are reading a document that tells you to stop and ask about any of those, that document is out of date." `06` is now that document.
4. **§6 ViewDropdown's "320px wide"** stated as an invariant while `05`, a same-tier file, says treat it as unspecified (I5). An agent reading both cannot obey both.
5. **Rule 22 vs §10.10 on Admin** (B1). Rule 22: "Reports, Admin and S5 workspaces have no queue band and everything below simply moves up 38px." §10.10: "do build its section navigation by reusing the queue tab band at the same 38px geometry, per D10." Same file, two answers, 500 lines apart. This is the only place `06` contradicts itself.
6. **§4's backdrop carve-out.** "The package currently states exactly one colour outside it: the window backdrop `rgba(28,31,27,0.42)`… A token name for the backdrop is NOT YET SPECIFIED." A lint rule that fails the build on colour literals (§5, "Enforce it with a lint rule and treat a violation as a build failure") cannot coexist with a permanent sanctioned literal. Name the token.

Everything else in `06` holds. It would not drift on radius, shadow, focus, stages, deadlines, urgency, confirmations, folder boundaries, date arithmetic or the "not provided yet" control.

---

## What this package does well

Trust these; they are consistent everywhere and do not need re-checking.

- **The five surfaces and their three sizes.** S1–S5, `large` 1120×760 at x=160 y=70, `medium` 820×620 centred y=90, `small` 520×auto max 420 centred y=200 — identical in `00` D1, `02` §2.5, `03` §1.1–1.2, `04` §0.2 and `05` §6. The old seven/eight/nine-surface taxonomies are gone; `S6`, `S7` and `S8` appear nowhere except in historical notes.
- **The confirmation policy.** Four type-to-confirm actions and five plain confirms, listed in the same order with the same wording in `00` D3, `02` §6.3, `03` §5.4, `04` §13, `05` §10, `06` rule 25 and `07` §4. `04` §13 additionally maps every one to a screen ID. Only the booking-cancel edge (I11) is loose.
- **The four deadline labels, the two-deadline split and the deadline grammar.** `Ticketing limit` · `Hold expires` · `Follow up` · `Check-in opens`, never abbreviated, only the first two ever red, supplier number never in a grid cell, rounding down and pluralising. Identical in six files. `Airline limit`, `Issue by` and `TTL` survive only in the reference HTML (B6).
- **The seven booking stages**, zero colours, `OVERDUE` at 11px/700 uppercase with no tracking, one lifecycle per record, six-state client onboarding on the client record only, `Blocked` as a flag. No file says eight.
- **Focus.** `--focus-ring` at `--focus-offset` on every interactive element, no glow, no colour change, no radius, `:focus-visible`, `outline` not `box-shadow`. Stated identically in `tokens.css`, `00` D4, `02` §0.3, `03` §1.6, `05` §11, `06` rule and `07` §4.
- **Tabular figures.** D7's "any right-aligned numeric column and any currency value" is applied uniformly; "exactly two places" survives only as a named defect phrase.
- **Row height, minimum viewport, folder structure, shadcn.** 44px everywhere with no compact variant. 1300px everywhere with the 160+1120+20 arithmetic spelled out; 1180px survives only as a named defect. The D15 tree is byte-identical in `00`, `06` and `07`. shadcn permitted and recommended, on Radix not Base UI, with MUI/Ant/Chakra/Bootstrap/PrimeReact forbidden — no file dissents.
- **D13 column widths** reproduced exactly in `02` §3.1, `04` RQ-01, `05` §7 and `06` §6, with the 1022/1228/206px fill arithmetic shown in `02` so it can be checked.
- **The record window footer** (52px, 1px `--c-border-item` top rule, `[Save]` secondary then `[Save & Close]` primary, 10px gap) and the **eight-tab cap** with "Requests have six, Clients have seven, both are legal" — stated the same way in five files.
- **Screen coverage.** `04` enumerates roughly 130 screens with IDs, routes, surfaces, component lists, primary actions, verbatim two-line empty states and build phases, plus an end-to-end flow, a build order and a six-screen critical path. Detail windows, pop-up windows and instructional windows (GL-01 Help, GL-02 Deadline Explainer, first-run guidance as a message band) are all present and specified.
- **The domain rules.** Two deadlines with overdue firing on the supplier's number; anchored not typed; server-side arithmetic; the Israeli business calendar as a correctness dependency; one ticket per passenger; documents version rather than overwrite; passport validity as a rule evaluation with the India/Schengen/Thailand cases enumerated; append-only financials; communication log ≠ change history; effective-dated fees with `Recorded on`; fare watch as a child of the booking. These are the parts that cost money when wrong, and they are the most consistent material in the package.
- **`07`'s testing section** names the right things to test first and says why, and its "definition of done" and review-rejection lists are directly actionable.

---

## Known open items

The consolidated set, deduplicated across `02` (50 inline), `03` (22 tabled), `04` (32 tabled), `05` (33 inline), `06` (5) and `07` (2). None of these are defects; they are decisions the client still owes the developer. **They currently all point at `00-DECISIONS.md`, which has no register — see B4.**

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
32. Whether an S2 `medium` may open over an S2 `large` (see B5 — this one is blocking, not merely open).
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
55. How the nineteen documented Admin areas map into D10's eight sections, and what `Escalation Ladders` contains (see B7 — blocking).

---

## What to do before handing over

In order:

1. Fix **B1** (amend D11) and **B2** (amend `tokens.css` and `01`) — both are one-paragraph edits to the two highest-authority files.
2. Fix **B3** — a find-and-replace of six numbers across three files.
3. Add the **D18 open-items register** to `00-DECISIONS.md` from the list above (**B4**), and re-point the inline flags.
4. Decide **B5** in D1.
5. Correct or delete `assets/consulate-reference.html` (**B6**).
6. Map the eight orphaned Admin areas and write `Escalation Ladders` (**B7**).
7. Sweep the sixteen important items — most are single-sentence corrections of stale claims.

That is roughly a day. After it, this is a hand-over-ready package.
