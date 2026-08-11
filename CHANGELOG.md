# Change log

Every implemented change gets an entry here — what changed, and why. Newest first. See `CLAUDE.md` → "Change log" for the convention.

---

## 2026-08-11 — Hide Home from nav, keep the code; keep the live WhatsApp Inbox

**What changed:** `apps/web/src/lib/navTabs.ts` — removed `{ label: "Home", to: "/" }` from `NAV_TABS`. `routes/index.tsx` and `data/homeData.ts` are untouched, so the page still exists, it's just unlinked from the nav.

**Why:** decisions made 2026-08-11 while comparing this branch against Joe's CONSULATE spec (see `docs/CONSULATE-AUDIT.md` on `main`). CONSULATE has no Home tab — Requests' default queue (`Needs Action Today`) already does that job, so the user agreed to drop it from the nav, but wanted the code kept rather than deleted in case it's wanted later. Separately, the user decided to **keep the live Baileys WhatsApp Inbox** rather than rebuild it as CONSULATE's RQ-11 paste-only intake — reasoning that RQ-11's paste-based design is the fallback for a business with no live WhatsApp integration, not a rejection of having one. No code change was needed for that second decision (already built this way); it's recorded here and in the audit doc as a deliberate, explicit override of a design language the client called "locked."

**Verified:** `npm run typecheck --workspace apps/web` clean. Visual verification in the browser wasn't possible this session — the preview tool starts the dev server with the system Node (18.17.1), and Vite/TanStack Router need 20.19+; this is a known environment limitation from earlier in the project, not something introduced by this change. The edit itself is a single array-entry removal with no logic change, so typecheck + a manual read of the diff stood in for a live check.

---

## 2026-08-10 — Requests page was missing Home from its own nav

**What changed:** `apps/web/src/routes/requests.tsx` — removed `NAV_TABS.filter((t) => t.label !== "Home")`, now passes `NAV_TABS` straight through like every other page.

**Why:** leftover from the original standalone `RequestsQueue.jsx` prototype, which was built before Home existed as a separate route and never had "Home" in its own tab list to begin with. Every other page (Home, Inbox, Clients, Travellers, Bookings, Tickets, Reports) already shows all 8 tabs — Requests was the one inconsistent screen. User caught it by noticing Home wasn't there.

---

## 2026-08-10 — Designed the remaining nav pages: Clients, Travellers, Bookings, Tickets, Reports

**What changed:** all five previously-inert nav tabs are now real routes — `apps/web/src/routes/{clients,travellers,bookings,tickets,reports}.tsx`, each with a matching `data/*.ts` mock file. Extracted `apps/web/src/components/AppShell/FilterStrip.tsx` out of the saved-view strip that was inlined in `requests.tsx` (now the third+ page using it — Requests, Clients, Bookings all share one implementation). `lib/navTabs.ts` updated with all five routes and the extended `NavTab.to` union type.

Per-page design, grounded in `docs/03-deliverables.md`: **Clients** (P1-02..11) gets saved views by onboarding stage; **Travellers** (P1-04/08) is a flat list with a "Missing Passport Info" toggle instead of saved views, since it's a reference list, not a workflow queue; **Bookings** (P2-16..20) has saved views mapped directly to the booking-stage list; **Tickets** (P3, gated on Sabre access) is read-only with no Void/Reissue/Refund action buttons, since none of the authorization or Sabre plumbing those actions require actually exists yet, plus an explicit on-page note that it's a preview; **Reports** (P8, "Future"/lowest priority) is deliberately the lightest — a small grid of summary panels, not a table, matching its actual priority rather than over-building speculative analytics.

**Why:** confirmed with the user first — these are design/UI screens over mock data, the same pattern as Home and Requests, not real backend-integrated CRUD (no Clients/Travellers/Bookings/Tickets database exists; standing one up is a separate, bigger decision nobody's made yet). Also confirmed building all five the same way rather than stubbing Tickets/Reports, since it's still just a mock either way.

**Grounding choice worth noting:** every new data file reuses the same client roster already established in `data/requestsData.ts` (Kaplan, Weiss, Katz, Gross, etc.) rather than inventing a disconnected cast per page — e.g. Ariel Weiss's missing passport and the Lieberman DOB gap in `travellersData.ts` are the exact same flags already referenced in Requests, and `bookingsData.ts` is literally the confirmed-stage subset of those same requests. The app reads as one dataset viewed from different screens, not six unrelated demos.

**Verified:** `npm run typecheck --workspace apps/web` clean; all five routes render live with correct nav highlighting and consistent `yb-*` token styling; Requests confirmed unaffected by the `FilterStrip` extraction; Tickets confirmed to have no action buttons; Reports confirmed to render as panels, not a table.

---

## 2026-08-10 — Home: Requires Your Attention Now was only showing 5 of 9

**What changed:** `apps/web/src/data/homeData.ts` — expanded `URGENT` from 5 rows to all 9, using the exact same 4 additional requests (Katz, Friedman, Lieberman, Shapiro) already defined in the Requests page's "DUE TODAY" group (`data/requestsData.ts`), trimmed to Home's shorter row format.

**Why:** the "NEEDS ACTION TODAY" tile has always said 9, but the panel beneath it only ever listed 5 — a mismatch inherited from the original prototype, not something introduced by the recent layout work. The user noticed the panel still felt sparse after the column-rebalancing pass and flagged it; checking the actual data confirmed it wasn't a density preference, it was the panel under-reporting its own tile's count. Reused the Requests page's data instead of inventing new rows so the two screens never show different totals for "today."

**Side effect, expected:** Requires Your Attention Now is taller now (9 rows vs. Alerts' 4), which reopens some of the column-height gap from the previous entry below — re-measured: 217px at the 1280px floor (mostly 2-line "Due" text wrapping at that width), only 23px at 1600px. Left as-is rather than re-tuning further, since the previous entry already established the floor-width case degrades to contained scrolling, not broken layout.

---

## 2026-08-10 — Home page: rebalanced the 2-column layout

**What changed:** `apps/web/src/routes/index.tsx` — regrouped panels by theme rather than by table-vs-list: left column is now "Requires Your Attention Now" + "Alerts" (urgent/act-now content), right column is "Travelling Soon" + "Your Queue" (ongoing-tracking content). Grid ratio eased from `2fr_1fr` to `3fr_2fr` so the narrower column has more room. Both tables (`Requires Your Attention Now`, `Travelling Soon`) now sit in an `overflow-x-auto` wrapper with an explicit `min-w-[...]` on the table itself, so at the tool's documented 1280px floor they scroll horizontally inside their own panel instead of squeezing column text into unreadable wrapped fragments.

**Why:** after the previous panel removal, the two columns ended at noticeably different heights (measured: 648px left vs 503px right at the time — a 144px gap) with a lot of empty space below the shorter one, which is what the user was pointing at. Measured real panel heights via the browser rather than guessing, and picked the regrouping that got closest to balanced (~50-65px gap depending on viewport) while keeping thematically related content together. The first attempt at this (shrinking Travelling Soon's columns to fit the old ratio) broke badly at 1280px — verified this by actually testing at the floor width, not just the wide one — hence the scroll-wrapper fix instead of fighting column widths down to unreadability.

---

## 2026-08-10 — Home page: removed WhatsApp Intake, System Status, Recent Activity

**What changed:** `apps/web/src/routes/index.tsx` — removed the "WhatsApp Intake — paste a client message" panel, the "System Status" bar, and the "Recent Activity" panel from Home. Removed the now-unused `draft`/`extracted`/`saved` state and the `ACTIVITY`/`STATUS`/`AIRPORTS`/`SAMPLE_MESSAGE`/`extractFromMessage` imports that only those panels used. Kept everything else and the existing 2-column layout as-is (tiles, Requires Your Attention Now, Travelling Soon on the left; Alerts, Your Queue on the right) — moved the bottom page padding from the removed System Status block onto the body grid so the page doesn't end abruptly.

**Why:** went through every box on Home with the user one by one. Agreed verdict: WhatsApp Intake is superseded now that the live Inbox exists — intake should start from a real conversation there, not a separate paste box (the extraction logic in `lib/whatsappExtract.ts` was deliberately left in place for that future move, not deleted). System Status doesn't map to anything in the 105 deliverables and is more of an admin/ops concern than a daily agent view. Recent Activity was the one panel with nothing actionable on it — pure feed, no decision required. The underlying audit-log requirement in `CLAUDE.md` is unaffected; this only removes the live feed from the daily dashboard, not the requirement to log mutations.

**Not done:** actually building the "create request from this message" action inside Inbox (mentioned as the natural next home for the intake capability) — flagged, not implemented, wasn't asked for yet.

---

## 2026-08-10 — Local session-hours log activated (SESSION-LOG.local.xlsx)

**What changed:** created `SESSION-LOG.local.xlsx` (gitignored, repo root) — Date / Start Time / End Time / Reason / Project columns, `Project` fixed to `YB Travel`. Un-paused the session-logging instruction in `CLAUDE.local.md` (was documented-but-paused since the earlier entry below) and updated it to Excel instead of the originally-sketched markdown file.

**Why:** the user tried connecting ClickUp mid-session to log hours there, but every ClickUp API call came back `403` (the connection itself isn't authorized against the right workspace yet, not a bad link). Rather than stay blocked, they asked for the local Excel fallback now — track hours invested, with a reason and the project — and it can point at ClickUp later once that connection is sorted.

**Known gap:** `.gitignore` reserved `SESSION-LOG.local.md` for this earlier; superseded by `SESSION-LOG.local.xlsx` since the format changed to Excel. Both entries are harmless to keep in `.gitignore` (an unused ignore pattern doesn't do anything), not cleaning it up to avoid churn over something inert.

---

## 2026-08-10 — Personal instructions file (CLAUDE.local.md)

**What changed:** added a gitignored `CLAUDE.local.md`, plus a one-line pointer to it in `CLAUDE.md` so future sessions know to check for it. `.gitignore` updated for `CLAUDE.local.md` and (reserved, not yet created) `SESSION-LOG.local.md`.

**Why:** the user wants some instructions to govern how I work with them personally without those instructions being shared with the team or pushed to the repo — `CLAUDE.md` is already tracked and committed, so it's the wrong place for anything they don't want pushed. The actual instructions live in the gitignored file, not here, by design.

---

## 2026-08-10 — Live WhatsApp inbox via Baileys

**What changed:**
- New `apps/api/src/modules/messaging/` — a domain-defined `MessagingChannel` interface, a `BaileysConnector` implementation, a `ConversationsService` for persistence, a Socket.IO `MessagingGateway`, and a REST `MessagingController` (`/messaging/status`, `/messaging/conversations`, `/messaging/conversations/:id/messages`).
- New tables via `apps/api/src/database/schema.sql` + `npm run db:migrate --workspace apps/api`: `whatsapp_connections`, `conversations`, `messages`. No ORM — raw `pg`, consistent with the still-open Drizzle-vs-Prisma decision.
- New `apps/web/src/routes/inbox.tsx` — QR-pairing screen when not connected, conversation list + thread + reply when connected. Added to `NAV_TABS` between Home and Requests.
- Added `@tanstack/react-query`, `socket.io-client`, `react-qr-code` on the frontend; `@whiskeysockets/baileys`, `pino`, `qrcode-terminal`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` on the backend.
- `docs/05-open-decisions.md` #9 marked resolved.

**Why:** the Home page's "paste a WhatsApp message" box was a deliberate stand-in for live intake — `docs/05-open-decisions.md` #9 gated a real connection on an explicit risk acceptance, because Baileys is an unofficial library and a ban on the wrong number would cut off every client at once. The user made that call directly: pair a separate/test number (not the live business number), and show messages on a dedicated Inbox screen rather than requiring manual copy-paste. This is also the first feature needing real persistence, a live external connection, and the WebSocket layer — all three were explicitly deferred in the foundation scaffold below, and are now built, scoped tightly to this feature.

**Known gaps, flagged not hidden:** no auth on the new endpoints (Auth0 isn't wired anywhere in the app yet, so this matches the existing pattern — but it's a real gap given messages can contain passport/payment data, and must close before production). Conversations aren't linked to client records yet (no client schema exists — Phase 1 domain model is still future work).

**A build issue worth recording:** `@whiskeysockets/baileys` ships as ESM-only (`"type": "module"`), but the API compiles to CommonJS. A plain `await import(...)` gets silently downleveled by `tsc` into `require()` under a CommonJS target, reproducing the same `ERR_REQUIRE_ESM` crash — the fix in `baileys.connector.ts` routes the dynamic import through a `Function` constructor so `tsc` can't rewrite it.

**Verified:** migration creates the three tables; `/messaging/status` returns a real QR string from Baileys; the Inbox screen renders a genuinely scannable QR code with no console errors; Home and Requests still work unaffected by the new `QueryClientProvider` wrapper. **Not verified in this session** — scanning requires a physical phone, which this environment doesn't have: the scan-to-connected transition, live inbound message delivery, sending a reply, and reconnect-without-rescan after a restart. Worth running through manually before relying on this.

---

## 2026-08-08 — Platform foundation scaffold

**What changed:**
- npm-workspaces monorepo: `apps/web` (React 19 + Vite + TanStack Router + Tailwind v4), `apps/api` (NestJS), `packages/shared` (Zod schemas/types).
- Tailwind v4 theme tokens (`apps/web/src/styles/tokens.css`) matching `docs/02-design-system.md` exactly — warm-grey palette, Lato 900 headings, 2px radii, the two distinct reds.
- `design/prototypes/Home.jsx` and `RequestsQueue.jsx` ported to real routed pages (`apps/web/src/routes/index.tsx`, `requests.tsx`) on those tokens, with a shared `AppShell` extracted out of the duplicated top-bar/nav markup.
- NestJS module skeleton (`clients`, `requests`, `auth` — ping stubs) plus a `DatabaseModule`/`HealthController` proving real Postgres connectivity, no ORM chosen.
- `docker-compose.yml` for local Postgres 17, mapped to host port **5433** (not 5432 — a native Postgres was already running on this dev machine on 5432; colliding with it silently connects to the wrong server instead of failing loudly).

**Why:** `docs/01-technology-stack.md` and `CLAUDE.md` both list the same "safe to build now" set — repo/environment setup, the design system as real tokens, routing, the NestJS module shape, integration interfaces with mocks — as the next step once the stack and design were approved. Everything else (ORM choice, real Auth0 wiring, Redis/BullMQ, the WebSocket gateway, actual domain schema) is a separately-gated decision per `docs/05-open-decisions.md` and was deliberately left out of this pass.
