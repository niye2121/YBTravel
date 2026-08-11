# CLAUDE.md — YB Travel Platform

Context for Claude Code. Read this before doing anything; it carries decisions already made so they don't get re-litigated or accidentally reversed.

A gitignored `CLAUDE.local.md` may also exist alongside this file, holding personal instructions for whoever's working locally that aren't shared with the team. Check for it if present — it's never committed, so don't expect it to exist on a fresh clone.

## What this is

An internal travel operations platform for **YB Travel**, a Brooklyn-based agency. It owns the whole client lifecycle: WhatsApp inquiry → onboarding → traveller profiles → flight research → Sabre-verified quoting → reservation holds → payment → ticket issuance → active-trip servicing → exchanges and refunds → accounting reconciliation.

It is a combined front-office, mid-office and back-office system on one shared data model. It **replaces Yaalago**.

**Governing principle: the system prepares and recommends; a human with the right role approves anything high-risk.** Issuance, void, reissue, refund, segment cancellation, UATP consumption and destructive accounting entries all require authorised human approval. This is not negotiable and shapes the architecture.

## Status

Platform foundation scaffolded: npm-workspaces monorepo (`apps/web`, `apps/api`, `packages/shared`), Tailwind v4 theme tokens matching the design system, TanStack Router, the Home and Requests screens ported from the prototypes onto those tokens, and a NestJS module skeleton (`clients`, `requests`, `auth`) with a working Postgres-backed health check. See `README.md` for how to run it.

A live WhatsApp inbox now exists (`apps/api/src/modules/messaging/`, `apps/web/src/routes/inbox.tsx`) — the first real domain tables (`whatsapp_connections`, `conversations`, `messages`, still raw SQL, no ORM), the first live external integration (Baileys, on a separate/test number per the resolved decision in `docs/05-open-decisions.md` #9), and the first use of the WebSocket gateway and TanStack Query. **These new endpoints have no auth** — Auth0 isn't wired anywhere in the app yet, so this matches the existing pattern, but messages can carry passport/payment data, and this must close before anything near production.

No other domain logic, ORM, real Auth0 wiring, or background jobs yet — those are still next, and several are blocked on the open decisions below. Requires Node 20.19+ (TanStack Router and Tailwind's engine both need it); confirm the dev machine's default Node before assuming `npm install` will succeed.

## Stack — approved, do not change without discussion

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | TanStack Router (preferred) or React Router — **open** |
| Styling | Tailwind + Radix primitives + selected shadcn/ui, locally owned |
| Forms | React Hook Form + Zod, schemas shared with backend |
| Tables | TanStack Table + TanStack Virtual |
| Server state | TanStack Query |
| Real-time | NestJS WebSocket gateway using Socket.IO |
| Backend | NestJS + TypeScript |
| Architecture | **Modular monolith** — not microservices |
| API | REST + OpenAPI, generated typed client |
| Database | Managed PostgreSQL 17/18 |
| ORM | Drizzle or Prisma — **open, decide during prototype** |
| Auth | Auth0 — recommended, pending client approval |
| Authorization | Application policy service; CASL optional as implementation |
| Jobs | Redis + BullMQ. **Temporal deliberately deferred** |
| Storage | Private S3-compatible, backend-authorised access only |
| Secrets | Managed secret service (Infisical or AWS Secrets Manager) |
| Monitoring | Sentry + OpenTelemetry |
| Testing | Vitest + Playwright |

Full reasoning: `docs/01-technology-stack.md`.

## Non-negotiable conventions

**Money.** PostgreSQL `NUMERIC`/`DECIMAL` with explicit currency code, defined precision, documented rounding. Never binary floating point for authoritative calculations. Enforce at the JS boundary — both Drizzle and Prisma can be configured to return `NUMERIC` as a JavaScript `number`, which silently reintroduces float error. Configure for strings or a decimal type, and keep a test that fails if a monetary field is typed as `number`.

**Flight times.** Store *all* of: scheduled local date/time, airport, IANA timezone, calculated UTC instant, the offset used in that calculation, the original value from Sabre, and the updated value after a schedule change. UTC alone is wrong; local + timezone alone is incomplete. The Phase 4 escalation ladder (24h/12h/6h/1h) depends on this.

**Financial mutability.** Posted ledger entries, completed payments, issued-ticket financial records and finalised adjustments are append-only — corrections happen through reversal and replacement. Draft records stay editable until posted; the draft→posted transition is itself an audited event.

**Audit.** Every meaningful mutation logs actor, timestamp, action, before state, after state. One shared mechanism, not per-module.

**Authorization.** Auth0 answers *who is this and what role*. The application answers *may they do this to this record right now*. Re-check high-risk permissions at execution time against the database — never trust a token claim minted minutes earlier. The same policy service authorises HTTP requests, WebSocket subscriptions and presigned-URL issuance.

**Sensitive documents.** A presigned URL is a bearer token, not authorization. Backend authorises first, very short expiry, opaque object keys with no identifying filenames, every access logged, public bucket access blocked. Proxy the most sensitive downloads through the backend.

**AI boundary.** The intake service receives only the minimum needed for extraction and has no write path to bookings or tickets — it returns a draft for human review. Note that an inbound WhatsApp message may itself contain passport or payment details, so redaction runs on inbound content, not just surrounding context.

**Integrations.** Every external system behind an adapter interface defined by our domain, not the vendor's SDK. Sabre, QuickBooks, messaging and AI are all provider-neutral. This is what lets Phases 1–2 ship while access is unconfirmed.

## Design system — follow exactly

`docs/02-design-system.md` has the full spec, extracted from the client-approved `design/requests-queue.approved.html`.

Critical points that are easy to get wrong:

- Typeface is **Lato**, headings at **weight 900**. Not a serif.
- Palette is **warm grey**. **Never use Tailwind's default `gray-*` scale** — those greys are cool-toned and read as blue against these surfaces.
- Header is a gradient, `#12503a` → `#0d3f2c`, not flat.
- Border radius is 2px. No shadows anywhere.
- Row hover is `#f6f8f3`, a faintly green grey.
- Two distinct reds: `#b3261e` for row deadlines, `#9c2b1c` for group labels.

Working prototypes in `design/prototypes/` — `RequestsQueue.jsx` and `Home.jsx`. These use inline tokens because the palette doesn't map onto Tailwind defaults; convert to `tailwind.config` theme tokens when scaffolding the real app.

## Deliverables

105 items across Phases 1–8, in `docs/03-deliverables.md`.

- **Phase 1** — CRM, client intake, traveller management (21 items, all Must Have)
- **Phase 2** — Flight request, research, quotation, booking (20 items, all Must Have)
- **Phase 3** — Sabre integration and ticketing (11, High) — gated on commercial confirmation
- **Phase 4** — Active trip servicing (9, High)
- **Phase 5** — Exchanges, voids, refunds, EMDs, waivers (11, High)
- **Phase 6** — Finance, hotels, supporting integrations (11, Medium)
- **Phase 7** — EL AL optimisation and AI-assisted decisions (9, Medium)
- **Phase 8** — Client portal and reporting (13, Future)

First release is Phases 1 + 2 = 41 deliverables, plus Phase 0 items and the Yaalago replacement deliverables, **neither of which currently exists in the workbook**.

## Sequencing

Phase 0 discovery runs *alongside* the platform foundation, not before all code. Unresolved external questions block their own integration phase, nothing more.

Safe to build now: repo and environments, design system, routing, authentication, roles and permissions, client and traveller models, intake stages, the Requests dashboard, audit infrastructure, the real-time gateway, and integration interfaces with mock implementations.

Phase 3 starts only once Sabre access is commercially confirmed.

## Open questions

`docs/05-open-decisions.md`. The ones most likely to cause rework if guessed: QuickBooks Online vs Desktop, ARC accreditation status, and which Yaalago capabilities must be reproduced.

## Change log

Every implemented change gets an entry in `CHANGELOG.md` — what changed, and why. Plan first (as always), then implement, then log the entry from that plan's reasoning rather than reconstructing it afterward. This is a standing instruction, not a one-off.

## Working notes for Claude Code

- Don't scaffold with a component library that carries visual opinions (MUI, Ant). shadcn/ui is fine because components are copied in as editable source and restyled to YB tokens.
- Don't introduce Temporal. BullMQ was chosen deliberately; revisit only against the criteria in the stack doc.
- Don't enable PostgreSQL row-level security yet — deferred until the Phase 8 client portal, because it complicates pooling, workers, reporting and migrations.
- Don't treat Auth0 RBAC as the authorization model. It's coarse role claims only.
- When a decision in `05-open-decisions.md` is answered, update that file in the same commit as the code that depends on it.
- After implementing any change, append an entry to `CHANGELOG.md` (what changed, why) in the same commit. See "Change log" above.
