# Change log

Every implemented change gets an entry here — what changed, and why. Newest first. See `CLAUDE.md` → "Change log" for the convention.

---

## 2026-08-30 — Deployed WhatsApp conversation names to 2.24.28.178

**What changed:** synced the display-name build to `/srv/yb-travel`, rebuilt only API and web, and recreated those two containers with `--no-deps`. Startup added the nullable `display_name` column to the existing database and refreshed names through the already-linked WhatsApp session.

**Verified:** all 13 existing group conversations received their WhatsApp group subjects, and one of the two direct `@lid` conversations received its contact name, for 14 readable names out of 15 conversations. The remaining direct chat did not expose a contact/profile name and correctly retains the numeric fallback; a future contact event or incoming message will update it automatically. A refreshed browser inspection confirmed the friendly primary labels and secondary numeric identifiers render in the live inbox. Web and authenticated conversation APIs return `200`, anonymous conversation access remains `401`, and the API logs no display-name persistence errors. The same `yb-travel_yb_travel_baileys_auth` volume remains mounted with all 109 session files; WhatsApp is connected, the linked phone is retained, and no QR scan is requested.

---

## 2026-08-30 — Show WhatsApp contact and group names in the inbox

**What changed:** conversations now store an optional `display_name`. The Baileys adapter collects saved-contact names, WhatsApp profile names, and group subjects; it also refreshes all existing participating groups whenever the linked session connects. Incoming messages update the name when better information becomes available. The inbox shows the friendly name as the primary label and retains the WhatsApp number/group ID beneath it for identification, falling back to the number when WhatsApp supplies no name.

**Why:** the inbox previously stored and displayed only stripped WhatsApp JIDs, so every group appeared as an unreadable numeric identifier even though WhatsApp knew its subject.

**Session safety:** this does not change or clear Baileys credentials. Deployment retains the existing `yb_travel_baileys_auth` volume and linked phone session.

**Verified locally:** API, web, and shared-package typechecks pass and both production builds succeed. The schema migration was applied twice to the existing development database to confirm the new column is idempotent. Live name refresh and preserved-session checks are verified during deployment below.

---

## 2026-08-30 — Deployed authenticated WhatsApp access to 2.24.28.178

**What changed:** synced the authenticated messaging build to `/srv/yb-travel`, rebuilt only the API and web images, and recreated only those two containers with `--no-deps`. The Postgres container, `.env.deploy`, and the WhatsApp credential volume were not replaced or modified by the deployment.

**Verified:** the web app and API health endpoint return `200`. All messaging reads and the send endpoint return `401` without a token. Authenticated status and conversation reads return `200`; anonymous Socket.IO connections are rejected and authenticated connections succeed. The `yb-travel_yb_travel_baileys_auth` volume remained mounted with the same 109 files before and after deployment. WhatsApp reports `connected`, retains the linked phone, and does not request a QR scan.

---

## 2026-08-30 — Require authentication for WhatsApp REST and WebSocket access

**What changed:** every `/messaging/*` REST endpoint now uses the existing `AuthGuard`, including status, conversation history, message history, and sending. The Socket.IO gateway now rejects the handshake unless it receives a valid application JWT and confirms the user still exists in the database. The web client supplies its JWT in Socket.IO's authentication payload and actively disconnects its socket on sign-out, account changes, or an expired REST session.

**Why:** WhatsApp conversations can contain personal, passport, and payment information. Previously, anonymous callers could read messaging data, send messages, connect to the gateway, and receive broadcasts.

**Session safety:** this is an access-control change only. It does not change Baileys authentication storage or delete `.baileys-auth`; deployment retains the existing `yb_travel_baileys_auth` Docker volume so the linked WhatsApp account can reconnect without another QR scan.

**Verified locally:** API, web, and shared-package typechecks pass and both production builds succeed. Integration checks against the running API confirmed all four messaging operations return `401` anonymously (status, conversations, message history, and sending), while authenticated status and conversation reads return `200`. An anonymous Socket.IO handshake is rejected with `Unauthorized`; the same client connects successfully with a valid JWT. Server rollout will be verified separately.

---

## 2026-08-12 — Auto-recover the WhatsApp connection after a real logout

**What changed:** `apps/api/src/modules/messaging/baileys.connector.ts` — on a genuine logout (WhatsApp's `DisconnectReason.loggedOut`), the connector now clears the stale `.baileys-auth` session files and immediately reconnects, which makes Baileys generate a fresh QR code. Previously it just logged a warning and stopped — the Inbox screen would sit on "disconnected" with no way to recover short of someone SSHing into the server, deleting files by hand, and restarting the container.

**Why:** investigated a report that the WhatsApp test number kept disconnecting. Server logs showed a single, real event — WhatsApp sent a `device_removed` conflict about 43 seconds after connecting — not a bug in our code, but WhatsApp's own multi-device system reporting the linked session was removed (most likely someone unlinked it from the phone's Linked Devices screen, or WhatsApp's own automation detection ended it — a known, already-documented risk of using Baileys, see `docs/05-open-decisions.md` #9). While diagnosing that, found the connector had no self-recovery path for this case at all, which is the part actually worth fixing in code.

**Verified:** typecheck clean. Deployed to the server; manually cleared the already-dead session there too (the code fix only changes behavior for *future* disconnects, not the one that already happened before this deploy) and confirmed a fresh QR was generated in the logs.

---

## 2026-08-12 — Redeployed Clients/Travellers + Setup menu to 2.24.28.178

**What changed:** synced the current code to `/srv/yb-travel` on the server, rebuilt both Docker images, restarted the stack. No new secrets needed this time — `.env.deploy` already had everything from the Users deploy.

**Verified:** `/health` returns ok, `/clients` correctly returns 401 without a token (auth guard active), web root returns 200. Confirmed `clients`, `travellers`, and `traveller_accounts` all exist in the server's Postgres via `\dt`. Reconfirmed via `docker ps`/`pm2 list` that the other projects on that shared server are untouched.

---

## 2026-08-12 — Moved Users under a Setup dropdown

**What changed:** "Users" no longer sits as its own top-level nav tab next to Reports. It now lives inside a new "Setup" dropdown in the top utility bar (`apps/web/src/components/AppShell/SetupMenu.tsx`), positioned before Help and Sign Out. "Setup" only appears at all for `system_administrator` users — for everyone else it's not there, since there's nothing behind it for them yet. Removed the now-unused `adminOnly` field from `NavTab` and the filtering logic in `PrimaryNav.tsx`, since Users was the only thing using it.

**Why:** Joe reviewed the build and didn't like Users sitting next to the day-to-day nav tabs — matches the same feedback already in `docs/03-deliverables.md` P1-18 (admin/settings functions, not a main-screen tab). User confirmed Setup should be admin-only, and that this dropdown is meant to hold more than just Users going forward (e.g. booking fee groups, later) — `SETUP_ITEMS` in `SetupMenu.tsx` is a plain array specifically so adding the next item is one line, not a rebuild.

**Verified:** typecheck clean. In the browser: logged in as a non-admin (Miriam Roth) — confirmed "Setup" doesn't appear at all. Logged in as the seeded admin — confirmed "Setup" appears, opens a dropdown containing "Users," and clicking it navigates to the same `/users` page as before (unchanged — the admin-only route guard there was already in place).

---

## 2026-08-12 — Real Clients + Travellers backend, many-to-many

**What changed:** `clients`, `travellers`, and `traveller_accounts` are now real Postgres tables (`apps/api/src/database/schema.sql`), replacing the mock arrays that used to live in `apps/web/src/data/clientsData.ts`/`travellersData.ts` (both deleted — dead once the pages read from the API). A traveller is now its own entity, linkable to more than one client's account via `traveller_accounts`, each link carrying its own free-text `relationship` label (e.g. "self", "employee", "guest") instead of the old one-to-many string match. New `ClientsService`/`ClientsController` (replacing the ping-only stub) and a new `TravellersModule` from scratch — both behind `AuthGuard` only, not `AdminGuard`, since P1-13/14 give client/traveller creation to Offshore Intake Employees and Travel Agents, not just admins. Added `GET /clients/reps`, a plain name-only list separate from the admin-gated `GET /users`, so any logged-in staff member can populate the rep-picker without needing admin rights. The Clients and Travellers pages now fetch live data and have real "+ New Client"/"+ New Traveller" forms — the traveller form can link to more than one client at once, each with its own relationship field.

**Why:** yesterday's meeting between the user and their boss agreed the client-traveler relationship needed to be many-to-many, not one-to-many, and that "family members" was the wrong vocabulary — many YB Travel clients are businesses, and a real person can travel under more than one account (e.g. flying under a parent's account and their own). `traveller_accounts` was the user's choice of table name for this. Scoped narrowly to this data-model change per the user's explicit answer when this was planned — the other threads from the same meeting (agent workflow restructuring, multi-user time tracking, a Settings nav area) were deliberately set aside for a separate conversation, not built here.

**Also added, not originally planned:** `preferred_rep_id`/`secondary_rep_id` on `clients` reference the real `users` table (P1-10) — a natural follow-on from the Users feature shipped earlier, so client creation picks a rep from the actual staff list instead of a free-text name.

**Deliberately out of scope, flagged not skipped:** full onboarding-stage workflow logic (WhatsApp templates, missing-info reminders, stage-transition rules — P1-05..P1-12) — the meeting notes said detailed planning of this was deferred due to time, so this pass only formalizes the `stage` value set, not the workflow around it. Fine-grained per-role permission enforcement (P1-19) beyond "must be logged in" — same scope boundary as the Users feature. `requestsData.ts` and the Requests page — still mock, untouched.

**Verified:** both apps typecheck clean. Migrated locally and confirmed all three tables via `psql`. Proved the many-to-many end to end, twice — once via `curl` (created a traveller linked to one client, then linked the same traveller to a second client via `POST /clients/:id/travellers`, confirmed `GET /travellers` showed both), and again through the actual browser forms (created a client and a traveller linked to two client accounts at once via the real "+ New Traveller" form, confirmed both relationships render correctly in the Travellers table). Confirmed the Requests page is unaffected.

---

## 2026-08-11 — Deployed user management to 2.24.28.178

**What changed:** added a fresh `JWT_SECRET` to the server's `.env.deploy` (appended without ever displaying the file's existing contents, since it also holds the Postgres password — read that one line's presence with `grep -c`, not `cat`), synced the new code (`rsync`, excluding `.env.deploy` so the server's real secrets file was never overwritten by a local placeholder), rebuilt both images, and restarted the stack.

**Why:** follow-up to the same-day user-management change above — no point building real login if the deployed instance can't use it.

**Verified:** `/health` and web root both respond, logged in against the live server with the newly-seeded admin account (its console-printed password captured from the container logs the same way — `docker compose logs api`, not by reading any file), and reconfirmed via `docker ps`/`pm2 list` that the other projects on that server are still untouched.

---

## 2026-08-11 — Real user management, admin-gated

**What changed:** actual login (`packages/shared/src/user.ts`, `apps/api/src/modules/auth/*`) — password + JWT, not a mock. A `users` table (`apps/api/src/database/schema.sql`) with `roles TEXT[]` (P1-20: one person can hold more than one of the six roles in `packages/shared/src/roles.ts`). `POST /users` and `GET /users` (`apps/api/src/modules/users/*`) require both `AuthGuard` and `AdminGuard` — only `system_administrator` can create or list users, per P1-18. `apps/web/src/routes/login.tsx` and `routes/users.tsx` (list + "+ New User" form, all six roles as checkboxes). `PrimaryNav` now hides the new "Users" tab unless the logged-in user is an admin, and `/users` itself redirects non-admins away even on a direct URL visit — the nav hiding is convenience, not the actual gate. Every existing page now requires login — `routes/__root.tsx` redirects to `/login` if there's no session. `TopUtilityBar` shows the real logged-in name and Sign Out actually clears the session.

**Why:** user asked for user management with an admin-only menu. Real auth0 wiring is still pending client approval (unchanged from the original decision), so this is a self-contained email/password system as the bridge until then — same reasoning already used for keeping the Baileys WhatsApp integration over CONSULATE's paste-only model: build the real thing now rather than a mock that would need throwing away later.

**The chicken-and-egg problem:** creating a user requires being logged in as an admin, but the users table starts empty. Fixed in `apps/api/scripts/migrate.js` — on a fresh (empty) users table, it seeds one `system_administrator` account with a random password, printed once to the console. Safe to run on every deploy since it only fires when the table is empty.

**A real bug caught during verification, not just typecheck:** `packages/shared` is consumed as raw TypeScript source with no build step — safe for `import type` (erased at compile time) but not for actual values. `auth.controller.ts` and `users.controller.ts` originally imported `loginSchema`/`createUserSchema` as real zod objects from shared, which crashed `nest start --watch` locally with `ERR_MODULE_NOT_FOUND` on shared's own extensionless internal imports — and would have crashed identically at runtime in the deployed Docker image (`node dist/main.js` can't execute raw `.ts`). Fixed by defining those two schemas locally in the API instead, with a comment explaining why, and keeping only type-only imports from `@yb-travel/shared` anywhere in `apps/api`.

**Verified, not just typechecked:** ran the full stack locally (Postgres via `docker compose up -d postgres`, API via `npm run dev --workspace apps/api`, web via the preview tool). Migrated and seeded the admin. Logged in via curl and confirmed a non-admin gets 403 from `/users`. Then in the actual browser: logged in as the seeded admin, saw the Users tab, created a user through the real form (not the API directly), saw it appear in the list. Signed out, logged in as that new non-admin user, confirmed the Users tab is gone from nav, and confirmed a direct `/users` URL visit bounces back to `/`.

**Still open:** no password reset flow, no self-service — an admin has to hand out the temporary password directly. `JWT_SECRET` still needs to be added to the server's `.env.deploy` before this reaches 2.24.28.178 (next step, not yet done as of this entry).

---

## 2026-08-11 — Wrote docs/DEPLOYMENT.md

**What changed:** added `docs/DEPLOYMENT.md`, a step-by-step runbook for deploying to a shared server — survey first, isolate (own directory/network/database/ports), write the Dockerfiles + compose file, ship secrets straight to the server (never through the repo), build, verify both that the app works *and* that nothing else on the server broke, then log it.

**Why:** user liked how the deploy to 2.24.28.178 was handled and asked for the steps written down to reuse next time, before he moves on to further tasks. Written as a general runbook (placeholders for server IP/ports) rather than a one-off record of that specific deploy, so it's reusable for a future redeploy here or a setup on a different server.

---

## 2026-08-11 — Deployed to the shared preview server (2.24.28.178)

**What changed:** added `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.deploy.yml`, `.dockerignore`. Built and started the stack on the server at `/srv/yb-travel`: Postgres, the NestJS API (port 4001), and the built web app served via `vite preview` (port 4173), all on a dedicated `yb_travel_net` Docker network.

**Why:** user gave SSH access to a server that already runs several other projects (two Odoo instances via Docker, two Node apps via PM2, nginx serving two other sites) and explicitly asked that nothing else on it be touched. Surveyed the server first (read-only — `docker ps`, `pm2 list`, `ss -tlnp`, `crontab -l`, etc.) before installing anything, to see what ports/services already existed. Chose full Docker isolation — own network, own Postgres container, own named volumes, fresh unused ports (4001, 4173) — specifically so this can be torn down with `docker compose down` in `/srv/yb-travel` without any risk to the other projects. Confirmed via `docker ps`/`pm2 list` after deploy that all pre-existing containers and PM2 processes were still running unaffected.

**Access:** chosen as direct IP:port (`http://2.24.28.178:4173`) rather than an nginx-proxied subdomain, since there's no domain pointed at this server yet — plain HTTP, not meant as a production URL, just a shared preview link. Postgres has no host port mapping (internal to the Docker network only, same convention already used by the other two Postgres containers on this box). Credentials generated fresh (`openssl rand -hex 20`) and stored only in `/srv/yb-travel/.env.deploy` on the server, which is not part of the git-tracked repo.

**Fixed along the way:** first build attempt failed — `apps/web/tsconfig.json` extends the root `tsconfig.base.json`, which the Dockerfiles weren't copying into the build stage (only `package.json`/`package-lock.json` were). Added it to both Dockerfiles' `COPY` list.

**Not done, worth flagging:** no auth on these endpoints (matches the rest of the app so far — Auth0 isn't wired up anywhere yet), no HTTPS/TLS, no reverse-proxy in front of it. Fine for an internal preview link; not something to leave exposed like this if this ever needs to be client-facing.

**Verified:** `curl http://2.24.28.178:4001/health` → `{"status":"ok","db":"connected"}`. `curl http://2.24.28.178:4173/` → HTTP 200 with `<title>YB Travel</title>`. `docker ps` and `pm2 list` on the server confirmed after deploy that all six pre-existing containers and both PM2 apps were still up, untouched.

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
