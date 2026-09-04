# YB Travel — Technology Stack Recommendation (v3)

**Prepared for:** YB Travel platform build
**Date:** 7 August 2026
**Version:** 3 — approved for use
**Status:** Approved. Two items remain open by design: ORM selection (decided during technical prototype) and AI provider selection (decided after testing). Auth0 is recommended pending YB Travel's formal approval.

**Change log from v2:** frontend routing added as a core layer; real-time communication added; the append-only financial rule narrowed to posted and finalised records; passport document access controls strengthened beyond presigned URLs; Auth0 commercial wording made feature-dependent rather than user-count-dependent; Baileys risk restated in policy-neutral terms; the AI data boundary clarified to reflect that inbound messages may themselves contain sensitive data; unsourced market statistics removed.

---

## 1. Final recommended stack

| Area | Recommendation | Status |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Approved |
| Frontend routing | TanStack Router (preferred) or React Router | Approved |
| Styling and components | Tailwind CSS + Radix primitives + selected shadcn/ui, locally owned | Approved |
| Forms | React Hook Form + Zod, schemas shared with backend | Approved |
| Data grids | TanStack Table + TanStack Virtual | Approved |
| Server state | TanStack Query | Approved |
| Real-time updates | NestJS WebSocket gateway using Socket.IO | Approved |
| Backend | NestJS + TypeScript | Approved |
| Architecture | Modular monolith | Approved |
| API | REST + OpenAPI, generated typed client | Approved |
| Database | Managed PostgreSQL 17 or 18 | Approved |
| ORM | Drizzle or Prisma | **Open — decided during prototype** |
| Authentication | Auth0 | **Recommended, pending client approval** |
| Authorization | Application policy service; CASL optional | Approved |
| Background jobs | Redis + BullMQ | Approved |
| Long-running workflows | Reassess Temporal only if warranted | Deferred |
| File storage | Private S3-compatible storage, backend-authorised access | Approved |
| Messaging | Provider-neutral adapter; Baileys isolated in its own connector | Approved |
| GDS | Dedicated Sabre adapter | Approved |
| AI | Provider-neutral intake adapter | **Open — provider selected after testing** |
| Secrets | Managed secret service | Approved |
| Monitoring | Sentry + OpenTelemetry | Approved |
| Testing | Vitest + Playwright | Approved |
| Deployment | Containers across development, staging, production | Approved |

PostgreSQL 16 remains supported until November 2028, so it is not wrong — but a system starting in 2026 should begin on 17 or 18 at the latest supported minor version.

The governing architectural decision is a **modular monolith with every external system behind an adapter interface**. Sabre access, the QuickBooks product, settlement arrangements and the Yaalago replacement scope are all still unresolved. The architecture must let the platform foundation proceed while those answers are pending.

---

## 2. Positioning against comparable systems

Your documents describe a combined **front-office, mid-office and back-office** agency platform.

Front office (agent desktop, shopping, booking) is normally Sabre Red 360, Amadeus Selling Platform Connect or Travelport Smartpoint. Mid office (workflow, quality control, queues) includes Tramada, MIDOCO and PASS Travel Agent Desktop. Back office (accounting, settlement, reconciliation) includes TRAMS Back Office and ClientBase from Tres Technologies, TravCom, Dolphin Dynamics and MIDOCO. TravelOperations extends Microsoft Dynamics 365 Business Central with travel-specific modules.

Two conclusions follow, neither dependent on market statistics.

**Settlement reconciliation is treated as core functionality by established back-office products.** It appears nowhere in YB Travel's 105 workbook items. See section 9.

**The specific requirements that justify building rather than buying** are the EL AL lower-fare waitlist workflow, the Belev Echad and Scheiman fee groups, and the WhatsApp-led intake model. These are not served by off-the-shelf products. Building front, mid and back office on one shared data model — rather than as separate products joined by file transfer — is the structural advantage.

---

## 3. Data layer

### PostgreSQL 17/18, managed

The ticket lifecycle — original ticket to exchange to replacement to refund to credit memo to residual value to EMD — is a graph of relationships that must never break. Foreign keys, check constraints and real transactions are the foundation.

`JSONB` retains raw Sabre and QuickBooks payloads alongside normalised columns; range types and exclusion constraints support effective-dated configuration; partial and covering indexes serve the saved-view counts on the Requests screen.

Use Amazon RDS, Neon or Supabase. Point-in-time recovery is a requirement, not an option.

**Row-level security is deferred.** It provides genuine defence in depth but complicates connection pooling, background workers, administrator access, reporting, migrations and integration service accounts. For the internal first release, enforce authorization in NestJS with carefully designed repository queries. Evaluate RLS when the client portal arrives and clients must be isolated from one another at the database layer.

### ORM — decided during the prototype

Drizzle and Prisma are both defensible. Financial safety comes from PostgreSQL constraints, transactions, idempotency, ledger rules, tests, approval workflows and audit logging — not from the ORM choice.

Use Drizzle if the team is comfortable writing and reviewing SQL; Prisma if schema readability and developer productivity matter more. Allow carefully reviewed raw SQL for reconciliation and reporting. Write two or three of the hardest queries in both before deciding — the ageing reconciliation report and the grouped deadline view are good tests.

### Money representation

Use PostgreSQL `NUMERIC`/`DECIMAL` for calculated financial values, with an explicit currency code on every amount, defined decimal precision, a documented rounding rule, and rounded customer-facing totals. Integer minor units remain acceptable for simple customer-facing amounts but are too rigid as a universal rule — commission percentages, currency conversion, taxes, prorated refunds and settlement calculations need precision beyond a currency's customer-facing exponent.

**The absolute rule: never perform authoritative financial calculations in binary floating point.** This needs enforcing at the JavaScript boundary. `NUMERIC` is exact in Postgres, but both Drizzle and Prisma can be configured to return values as JavaScript `number`, silently reintroducing float error. Configure the driver to return strings or a decimal type, use a decimal library for arithmetic, and add a test that fails if a monetary field is typed as `number`.

### Financial record mutability

Posted ledger entries, completed payments, issued-ticket financial records and finalised adjustments are **append-only**. Corrections are recorded through reversal and replacement entries, never by editing the original.

Draft records may be edited until formally posted or finalised. Draft invoices, working quotes and unposted adjustments are ordinary mutable records; the append-only constraint applies from the moment of posting or finalisation, and the transition itself is an audited event.

### Flight time representation

UTC alone is insufficient; local time plus timezone alone is also incomplete. Store all of:

- Scheduled local date and time
- Departure or arrival airport
- IANA timezone
- Calculated UTC instant
- Timezone offset used in that calculation
- Original value received from Sabre
- Updated value after any schedule change

```text
Scheduled local: 2026-11-01 01:30
Airport:         JFK
Timezone:        America/New_York
Offset used:     -04:00
Calculated UTC:  2026-11-01T05:30:00Z
Source:          Sabre
```

This preserves exactly what the airline displayed while supporting accurate reminders, comparisons and chronological processing. Storing the offset separately from the timezone matters at DST transitions, where a local time can be ambiguous — the example sits inside the US autumn transition, which is why it is the example.

The Phase 4 escalation ladder at 24, 12, 6 and 1 hours before departure depends entirely on this.

### Audit

An audit log on every meaningful mutation, capturing actor, timestamp, action, before state and after state. Implemented once as a shared mechanism rather than per module.

---

## 4. Backend

### NestJS + TypeScript

One language across the stack means a smaller team covers both sides and domain types are shared rather than duplicated. Modules map cleanly onto the phases; dependency injection is what makes adapter swapping a one-line change; guards and interceptors give a consistent place to enforce authorization and write audit entries.

If the team is strongest in Python, **Django** remains credible — its admin, permissions framework and migrations suit the admin-heavy, effective-dated-configuration side of this system well. A familiar stack beats a theoretically superior one.

### Modular monolith

One deployable application with enforced internal module boundaries. Microservices would introduce distributed transactions into a domain where correctness across client, booking, ticket and invoice is the entire point.

### Background work

**Redis + BullMQ** handles ticketing deadline reminders, hold expiry warnings, follow-up nudges, the Phase 4 escalation ladder, retries and schedule-change cancellation at expected volume. Workflow state lives in Postgres; jobs carry cancellation keys.

**Temporal is not committed.** Reassess only if specific pressures appear: workflows running for weeks or months, large numbers of cancellable and restartable timers, complex compensation after partial Sabre operations, operational difficulty reconstructing workflow state, or a firm requirement for workflow replay. Until then it adds a server platform, deployment model, monitoring surface and learning curve without proportionate benefit.

### Real-time communication

A **NestJS WebSocket gateway using Socket.IO**. Socket.IO rather than raw WebSockets initially because reconnection, room membership, acknowledgements and connection recovery are all directly useful here and would otherwise be rebuilt by hand.

Events the agent desktop must receive without a refresh:

- Incoming WhatsApp messages and message delivery status
- New assignments and reassignments
- Urgent reminders and deadline escalations
- Sabre search completion
- Schedule-change notifications
- Background-job failures requiring attention

Rooms map naturally onto the domain: per-user for assignments, per-request for conversation activity, and a shared supervisor room for critical queues and escalations. Authorise socket connections through the same policy service as HTTP requests — a socket must never become a way to observe records the user could not fetch. Event payloads should carry identifiers rather than full records, with the client refetching through TanStack Query, so authorisation is applied consistently on every read.

### API

REST with OpenAPI generated from NestJS decorators and a typed client generated for the frontend. GraphQL is unnecessary with one consumer and would complicate field-level authorization for passport and payment data.

---

## 5. Frontend

### React 19 + TypeScript on Vite

React 19 has been stable since December 2024 and is the correct starting point for a new 2026 project.

This is an internal tool behind a login — no SEO, no public pages, no server rendering requirement. A single-page app against a separate API keeps a clean boundary for when the Phase 8 client portal arrives. If that portal needs public pages, server rendering or SEO, build it separately with Next.js against the same API.

### Routing

Vite provides no routing, and routing is a core requirement here rather than an afterthought: every filtered request view must be URL-addressable so agents can share a link to exactly what they are looking at, and so browser history behaves correctly.

**TanStack Router** is preferred for strongly typed routes and typed search parameters — the saved view, sort column, sort direction and page size all live in the query string, and having those type-checked prevents a whole class of bug. **React Router** is perfectly acceptable if the team prefers familiarity.

### Design system

Avoid visually restrictive component frameworks such as MUI or Ant Design, which would fight the agreed interface. Use accessible headless primitives and locally owned components:

- **Tailwind CSS** with the YB green, gold and type scale as theme tokens
- **Radix UI** primitives for menus, dialogs, popovers, focus management and keyboard behaviour
- **Selected shadcn/ui components**, copied into the repository as editable source and restyled to YB tokens on adoption
- A **YB Travel design system** owned in the codebase

### The Requests grid

**TanStack Table**, headless — row grouping under urgency headers, multi-column sort, saved views with live counts, per-cell conditional formatting where an overdue deadline turns bold red. **TanStack Virtual** once any view exceeds a few hundred rows. **TanStack Query** for caching, background refetch and optimistic updates, with saved-view counts refreshed both on interval and on relevant socket events.

### Agent desktop details

Agents live in this screen all day. Build keyboard navigation from the start. Preserve scroll and filter state on back-navigation. These decide whether staff adopt the system or work around it.

---

## 6. Identity and authorization

### Auth0 — recommended, pending approval

A recommendation arising from technical review, not a confirmed client decision. Present to YB Travel for approval before contracting.

The strongest argument is that you never store password hashes, which removes a category of breach and narrows audit scope. MFA, breached-password detection and brute-force protection on day one are worth the cost for a system touching passport data.

### Auth0 RBAC will not carry your authorization model

Auth0 roles are coarse claims in a token. "May this Ticketing Agent void this particular ticket" depends on ticket value, issuing PCC, whether fare rules require supervisor sign-off, and whether payment is confirmed. Section 9 of your blueprint asks which Sabre operations must always require supervisor approval — every one is a resource-level, data-dependent decision.

**Auth0 answers** who this person is and what role they hold. **Your application answers** whether they may do this specific thing to this specific record right now.

### The authorization service owns the policy

The source of truth is your own roles, permissions, approval rules, assignment relationships, resource state and policy configuration, held in the application and its database. CASL is optional machinery for evaluating those rules. The architecture reads *application authorization service, optionally implemented using CASL*, so the design never becomes dependent on one library.

The same service authorises HTTP requests, WebSocket subscriptions and presigned-URL issuance. One policy, three entry points.

### Tenant strategy

Auth0's own guidance is that tenant count grows quickly and a single production tenant suits most organization use cases, while separate tenants are strongly recommended for environment separation.

```text
Development Auth0 tenant
Staging Auth0 tenant
Production Auth0 tenant
```

Within production: one staff application, one future client-portal application, separate database connections or identity rules where appropriate, and backend-enforced separation between staff and client users.

**The invariant to enforce in code:** no client account may ever receive an internal employee record or permission. Separate production tenants remain an option if compliance, branding, contracts or stronger identity isolation later require it, but should not be locked in before Phase 8.

### Other rules

**Re-check high-risk permissions at execution time.** For issuance, void, refund, exchange and UATP consumption, query the permissions store at the moment of action rather than trusting a claim minted minutes earlier.

**Keep a local users table.** Auth0 user ID as external key; staff records are yours — P1-10's preferred and secondary representative, audit attribution, and Phase 8 workload reporting all need local rows.

**Keep passport and payment data out of Auth0 metadata entirely.**

### Commercial evaluation

The expected internal employee volume should fit within Auth0's lower-volume plans, but cost depends on features rather than user count alone. Check the required MFA, number of environments, log retention period, machine-to-machine tokens and anticipated client-portal volume against the active pricing plan before approval.

---

## 7. Security and sensitive data

**Managed secret service** — Infisical or AWS Secrets Manager. Sabre credentials per PCC, QuickBooks OAuth tokens, Auth0 client secrets and API keys, with rotation and access logging. Never in committed environment files.

**Field-level encryption for passport data**, using envelope encryption with a KMS-managed key. Log decryption events separately from the general audit log so "who viewed this passport number and when" is answerable as its own question.

**Never store raw card data.** Tokenise via the payment processor; bringing PCI DSS scope into the application is an expensive mistake.

**Data retention.** Passport data carries a retention obligation. Decide the policy now and build deletion into the schema — retrofitting deletion across an append-only audit log is genuinely difficult.

### Passport and sensitive document access

A presigned URL is a bearer token. Anyone holding it can use it until it expires, so it must never be treated as authorization in itself. Required controls:

- Generate the URL only after the backend has authorised the specific user for the specific document
- Very short expiration, measured in tens of seconds rather than minutes
- Log every access request with requesting user, document, timestamp and outcome
- No sensitive filenames or identifying information in the URL or object key — use opaque keys
- Public bucket access blocked at the bucket policy level, verified by automated check
- Server-side encryption with managed keys
- For the most sensitive documents, proxy the download through the backend so no URL is ever issued and every byte served is attributable

### AI data boundary

The intake service receives only the minimum information required for extraction. Credentials, card information, passport numbers and unrelated historical data must be removed where possible.

This matters more than it first appears: a client's WhatsApp message may itself contain legal names, dates of birth, passport details or payment information, so the message text cannot be assumed safe simply because it came from the client. Redaction runs on inbound content, not only on the surrounding context.

Where sensitive traveller data is genuinely required for a specific operation, transmission must follow the approved AI provider's privacy, retention and contractual controls, and that decision should be recorded rather than made implicitly in code.

Structurally, the intake service has no write path to bookings or tickets. It returns a draft for human review.

---

## 8. Integrations

Every external system sits behind an adapter interface defined by your domain, not by the vendor's SDK.

### Sabre

Sabre offers REST/JSON APIs alongside legacy SOAP, covering shopping, fare pricing, booking management, ticketing, queues and reporting, with Offer and Order APIs that normalise NDC and traditional content.

The commercial questions in your Section 9 remain the blocker: which API products are in your agreement, whether calls are charged per transaction, how many PCCs are covered, whether one integration reaches all accounts, and what the test environment provides. **Resolve before Phase 3 planning.** Build the adapter in Phase 2 with a manual implementation so the workflow is proven before the integration lands.

**Contingency.** Duffel provides a modern REST API aggregating GDS and direct NDC content, priced per booking. It is not a Sabre replacement for an accredited agency performing exchanges and refunds, but it is worth evaluating as a second content path if Sabre access proves slow, expensive or restricted. Verify current coverage and pricing directly with the vendor.

### Messaging — WhatsApp

Architecture: a `MessagingChannel` interface, conversations stored in the YB Travel database, each provider isolated in its own connector, and the ability to substitute providers without touching the workflow.

**Pricing and policy, per Meta's own documentation.** There is no subscription fee for the WhatsApp Business Platform; since 1 July 2025 Meta charges per delivered message, with rates varying by template category and recipient country. Meta's developer documentation confirms pricing updates for Meta Business Agent, service and utility messages launching on 1 August 2026 and 1 October 2026, with October rates published by 1 June 2026. Recheck immediately before production.

**Baileys.** Baileys is an unofficial WhatsApp Web library and is not an approved or supported WhatsApp Business Platform integration. Its use introduces account-continuity and policy-enforcement risk, including the possibility of restrictions or number suspension.

The exposure is proportionate to the business dependency: YB Travel's client relationships run through its WhatsApp number, so a suspension would interrupt contact with clients rather than merely degrading a feature. Safeguards:

- A separate test or replaceable number, not one the business cannot afford to lose
- No bulk or marketing automation
- Provider-neutral messaging interface, so substitution is cheap
- Documented business acceptance of the risk by whoever owns it commercially
- A defined migration path to the official Cloud API

### QuickBooks

Blocked on your own open question — Online versus Desktop determines the integration method entirely. Online has a modern REST API; Desktop requires the Web Connector or a third-party bridge. **Resolve before Phase 6 scoping.** Either way, create transactions in a review state rather than posting directly.

### Flight data

Your Section 9 asks which source should provide schedule changes, terminal, baggage and actual departure and arrival data. Credible options: **Cirium** for enterprise operational visibility with flight status, alerts, stream delivery and historical data; **OAG** as the schedule-data specialist with a flight status alerts stream; **FlightAware AeroAPI** as a capable mid-tier option.

**Commercial quotations are required.** Enterprise aviation-data pricing depends on data products, volume, regions, historical access, update frequency, redistribution rights and contract terms, and cannot be estimated usefully in advance.

Sabre surfaces schedule changes for your own PNRs via queues, which may suffice for Phase 4. A dedicated feed becomes worthwhile when proactive alerts ahead of the airline's own notification are wanted. Start with Sabre queues.

### Yaalago — replacement, not integration

The new platform is intended to replace Yaalago. Long-term Yaalago integration is therefore not a required architectural component.

1. Research which Yaalago functions YB Travel currently uses.
2. Reproduce the necessary itinerary and proposal capabilities in the platform.
3. Support temporary migration or reference data only where genuinely needed.
4. Retire Yaalago once the replacement functions are validated in production.

The open question is: **which Yaalago capabilities must be reproduced before YB Travel can stop using it?** That answer defines a set of Phase 2 deliverables that do not currently exist in the workbook.

### Object storage

Private S3-compatible storage. Access always mediated by backend authorization as described in section 7. Virus scanning on upload. Never serve files directly from the application server.

---

## 9. Gaps in the source documents

**Settlement reporting — a discovery question.** A US agency may be fully ARC accredited, may be an ARC Verified Travel Consultant without ticketing authority, may issue through a host agency or a consolidator, may use a separate accredited office, or may report through BSP in another market. ARC confirms that fully accredited agents can issue tickets while Verified Travel Consultants do not have ticketing authority.

The question for YB Travel: **is YB Travel ARC accredited directly, and if not, through which host, consolidator or issuing arrangement are US tickets reported and settled?**

If directly accredited, Interactive Agent Reporting becomes an important requirement — IAR is ARC's electronic sales reporting system, available to accredited agencies through My ARC, capturing transaction data, handling refunds and producing sales reports on a weekly settlement cycle. Either way, settlement reconciliation appears nowhere in the 105 workbook items.

**Phase 0 has no rows in the workbook.** The blueprint defines it as business validation, security and architecture, including moving credentials out of shared documents. Prerequisite work, currently untracked.

**Yaalago, Matmid and Kleer appear zero times across the 105 items**, despite Yaalago being the system to be replaced and Matmid and Kleer/RB being central to the Phase 7 EL AL workflow.

**Virtual card payments** for hotel and supplier settlement — relevant to Phase 6.

**No environment or release strategy is described** — development, staging with Sabre test credentials, and production, with feature flags so phases can ship dark.

---

## 10. Supporting choices

**Testing.** Vitest for unit and integration, Playwright for end to end. Prioritise where failure costs money: the send-to-issue gate that blocks issuance without confirmed payment, refund and exchange calculations, effective-dated fee resolution, and role permission boundaries. Contract tests against recorded Sabre fixtures so the adapter is validated without live calls.

**Observability.** Sentry for errors, OpenTelemetry for traces, structured JSON logs with correlation IDs. Trace every Sabre call end to end.

**CI/CD.** GitHub Actions, containers, migrations applied automatically with a tested rollback path. Never edit production data by hand.

**Email.** Postmark or Amazon SES for transactional mail.

**PDF generation.** React-PDF or Puppeteer for itineraries and invoices.

**Documentation.** An architecture decision record for each significant choice, including those deliberately deferred here, so the reasoning survives.

---

## 11. Sequencing

**Phase 0 discovery runs before and alongside the initial platform foundation.** Unresolved external-system questions must be completed before implementing or promising their respective integration phases, but they do not block all development.

Work that can begin immediately: repository and environment setup, the design system, routing, authentication, user roles, client and traveller models, intake stages, the Requests dashboard, audit infrastructure, the real-time gateway, and integration interfaces with mock implementations.

Discovery to run in parallel: QuickBooks Online versus Desktop; Sabre API products, PCC coverage and test environment; ARC accreditation and settlement arrangement; which Yaalago capabilities must be reproduced; booking-fee timing and refundability; and moving credentials into the secret service.

**First release — Phases 1 and 2, 41 deliverables, all Must Have** — plus the Phase 0 items and the Yaalago replacement deliverables, neither of which is currently in the workbook.

**Phase 3 begins only once Sabre access is commercially confirmed.**

The system should organise the business before it automates it.

---

## 12. Open items at approval

| Item | Owner | Needed by |
|---|---|---|
| Auth0 formal approval and plan selection against required features | YB Travel | Before contracting |
| ORM: Drizzle or Prisma | Engineering | End of technical prototype |
| AI provider selection | Engineering | After comparative testing |
| Routing: TanStack Router or React Router | Engineering | Start of frontend work |
| QuickBooks Online or Desktop | YB Travel | Before Phase 6 scoping |
| Sabre API products, PCCs, test environment | YB Travel | Before Phase 3 planning |
| ARC accreditation and settlement arrangement | YB Travel | Before finance deliverables are written |
| Yaalago capabilities to reproduce | YB Travel | Before Phase 2 completion |
| Booking-fee timing and refundability | YB Travel | Before Phase 2 build |
| Baileys risk acceptance and migration path | YB Travel | Before messaging work begins |

---

## Sources

- [React 19 — official announcement](https://react.dev/blog/2024/12/05/react-19)
- [PostgreSQL versioning and support policy](https://www.postgresql.org/support/versioning/)
- [Auth0 — Role-Based Access Control](https://auth0.com/docs/manage-users/access-control/rbac)
- [Auth0 — Create tenants](https://auth0.com/docs/get-started/auth0-overview/create-tenants)
- [Auth0 — Set up multiple environments](https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments)
- [Auth0 — Pricing](https://auth0.com/pricing)
- [Sabre APIs — Developer Experience](https://www.sabre.com/products/suites/developer-experience/sabre-apis/)
- [Sabre Booking Management API — Developer Hub](https://developer.sabre.com/rest-api/booking-management-api/v1/help-documentation/get-booking.html)
- [Meta — Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Meta — Upcoming pricing updates for service and utility messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)
- [Meta — WhatsApp Business Platform changelog](https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog)
- [ARC — Travel agency participation options](https://www2.arccorp.com/products-participation/travel-agencies/)
- [ARC — Interactive Agent Reporting (IAR)](https://www2.arccorp.com/products-participation/travel-agencies/agency-participation/participation-products/interactive-agent-reporting-iar)
