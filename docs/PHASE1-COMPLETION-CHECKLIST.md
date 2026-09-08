# Phase 1 Completion Checklist

Status date: 2026-09-08

Source of truth: `docs/03-deliverables.md`, Phase 1 (P1-01 through P1-21).

Status meanings:

- **Complete** — the core user flow is persisted, authorized, visible, and suitable for regression testing.
- **Partial** — some UI, data model, or service work exists, but the full deliverable or its enforcement is not complete.
- **Missing** — the required operational behavior is not implemented yet; vocabulary or preview UI alone does not count.

## Current completion matrix

| ID | Requirement | Current status | Evidence and remaining work |
|---|---|---:|---|
| P1-01 | Receive client requests through WhatsApp without changing the client's experience | **Complete** | Live Baileys inbox receives direct, group, text, and voice-note messages and persists conversations/media. Staff recordings and supported uploads are normalized to WhatsApp-compatible Ogg/Opus before push-to-talk delivery. Keep covered by connection, reconnect, inbound-message, real media-conversion, and phone-delivery acceptance tests. |
| P1-02 | Find an existing client or create a new client | **Complete** | Live client search/create/edit exists, phone uniqueness is enforced, and Inbox conversations can be linked idempotently. |
| P1-03 | Choose a booking-fee group and see the correct fee for each passenger | **Complete** | Request profiles select saved client travellers, classify each as adult/child/infant, apply the client’s configured per-passenger or per-booking rule, show a line breakdown and total, and append an immutable fee snapshot so later configuration changes do not rewrite prior calculations. |
| P1-04 | Save family members, dependants, and other travellers for reuse | **Complete** | Travellers are persisted independently and linked many-to-many with client-specific relationships. |
| P1-05 | Move clients through the six onboarding stages | **Complete** | The API permits one forward milestone at a time, requires a reason for backward moves, records stage history, and creates work from stages configured to generate tasks. Client profiles expose the permitted transition choices, history, and task completion controls. |
| P1-06 | Show current stage, missing steps, and next required action | **Complete** | Client profiles show the current stage, calculated action count, exact next action, field-level blockers, and open milestone tasks from live configuration and records. |
| P1-07 | Block onboarding completion until required information is reviewed | **Complete** | The completion stage is protected transactionally by the API. Every required field must be present and, where configured, confirmed by staff. Review evidence fingerprints the current value so later edits automatically reopen the review gate. |
| P1-08 | Show required details that are missing | **Complete** | One completeness service evaluates configured client, linked-traveller, and request fields. Client and request profiles distinguish missing, present-but-needing-review, reviewed, and optional-not-provided information and provide explicit review actions. |
| P1-09 | Use approved, copy-ready WhatsApp templates | **Complete** | The Inbox lists active approved templates by purpose/language, renders supported variables from the linked client/request/fee/completeness context, warns about unresolved values, and copies the result into the editable composer without sending automatically. Administrator edits reject unsupported variables. |
| P1-10 | Preferred rep, secondary rep, and available-team fallback | **Complete** | Clients store both representatives; assignment routing supports availability, capacity, continuity, fallback, escalation, and staff confirmation/automatic modes. |
| P1-11 | Store notes, documents, and communication history with the correct client/request | **Complete** | Client and request profiles store scoped internal notes and PDF/JPEG/PNG documents, validate size/signature, require operational roles, audit metadata without file contents, log authenticated downloads as sensitive access, and show a unified history with linked WhatsApp text/voice-note activity. |
| P1-12 | Reminders for unanswered inquiries, missing information, and next actions | **Complete locally** | Durable reminders are synchronized from request response/service deadlines, waiting-for-information work, and onboarding tasks. The retry-safe processor calculates upcoming, due, overdue, and escalated states; delivers idempotent in-app alerts; recovers stale processing locks with backoff; resolves completed sources; and supports acknowledgement, reassignment, team/personal views, and a dedicated queue. Covered by `test:reminders`. |
| P1-13 | Offshore Intake Employee role and permissions | **Complete locally** | The approved role supplies explicit intake defaults, every matching Phase 1 endpoint is database-permission guarded, and administrators can grant or revoke each implemented permission per employee. |
| P1-14 | Travel Agent role and permissions | **Complete locally** | The approved role now includes the Phase 1 client, traveller, onboarding, WhatsApp, request, fee, template, and record permissions. Travel Agents can see the open queue and claim unassigned work, but backend ownership checks restrict request edits, information review, fee calculation, and request-specific notes/documents/history to their assigned requests. Assign-any staff retain cross-queue authority; later-phase ticketing authority is not inherited. |
| P1-15 | Supervisor / Manager role, workload management, retrospective review, and reporting | **Complete locally** | Supervisor / Manager is the fourth assignable Phase 1 role. It inherits operational work, adds cross-team workload and reassignment authority, receives an append-only after-the-fact review queue for assignment, pricing, markup, waiver, and operational exceptions, and can open the live Agent Workload report. Reviews never block an agent action, preserving Rule 23. Covered by `test:supervisor`. |
| P1-16 | Ticketing authority folded into approved roles | **Complete for Phase 1 boundary** | Ticketing is not a separate assignable role. Issue/reissue/void/exchange permissions are catalogued and backend-recognized as unavailable, so they cannot be granted before the later ticketing workflows exist. |
| P1-17 | Finance authority folded into approved roles | **Complete for Phase 1 boundary** | Finance is not a separate assignable role. Invoice/payment/credit/refund/reconciliation permissions are catalogued and backend-recognized as unavailable until the later finance workflows exist. |
| P1-18 | System Administrator role for users, settings, integrations, and access history | **Complete locally** | Administrators have a permission-protected, system-wide history combining mutations and sensitive access. It supports search, user/action/Brooklyn-date filters, important-activity review, pagination, redacted before/after field changes, and direct Setup navigation. Covered by `test:audit-history`. |
| P1-19 | Show and allow only actions permitted by assigned role(s) | **Complete locally** | Primary and Inbox navigation, Setup links, notifications, live Phase 1 route entry, page queries, and create/edit/review/send/assignment controls now follow the employee's effective permissions. Client-, traveller-, request-, reminder-, report-, and WhatsApp-route guards block direct URL access. A restricted-user browser test confirms read-only Clients access hides creation and granular profile controls while unrelated routes redirect safely. `test:permissions` also proves traveller creation cannot bypass the separate link permission. |
| P1-20 | Allow multiple roles while assigning high-risk permissions explicitly | **Complete locally** | Multiple approved roles combine their defaults; normalized per-user grants/revocations persist in PostgreSQL, sensitive capabilities are labeled, changes are audited, and existing sessions take changes on their next request. |
| P1-21 | Show all open client requests and current status in one place | **Complete** | The Requests queue includes persisted requests, status, assignment, search, and detail navigation. Demo rows must stay visibly separated and removable for final acceptance. |

## Completion order

Work is completed in this order because later items depend on the earlier domain rules.

1. **Protect the current baseline**
   - Add an executable Phase 1 acceptance suite for the five complete items.
   - Ensure future work cannot silently break WhatsApp, clients, travellers, routing, or the live Requests queue.

2. **Completed locally: client onboarding and completeness — P1-05, P1-06, P1-07, P1-08**
   - Field-value review evidence, completeness evaluation, transition history, milestone tasks, and transactional completion enforcement are implemented.
   - Local acceptance testing is documented in `docs/testing/PHASE1-ONBOARDING-USER-TESTS.md`; production deployment is intentionally pending user approval.

3. **Completed locally: booking-fee use in intake — P1-03**
   - Request passenger selection, category-aware fee calculation, per-passenger display, totals, and immutable calculation snapshots are implemented.

4. **Completed locally: copy-ready WhatsApp templates — P1-09**
   - Contextual selection, allow-listed substitution, unresolved-variable warnings, and explicit draft-only copy-to-composer behavior are implemented.

5. **Completed locally: notes, documents, and history — P1-11**
   - Scoped notes, authenticated document storage/download, integrity metadata, sensitive-access logging, and unified WhatsApp/record history are implemented. Replacement/deletion is intentionally not offered in Phase 1, avoiding accidental loss of client records.

6. **Completed locally: durable reminders — P1-12**
   - Reminder records, source synchronization, deadline states, acknowledgement, assignment, notification delivery, stale-lock recovery, exponential retry, and the staff queue are implemented.
   - Successful request-linked WhatsApp replies resolve unanswered-inquiry sources automatically.

7. **Completed locally: roles and permissions — P1-13 through P1-20**
   - Completed locally: three approved role templates, individual database grants/revocations, central API enforcement, sensitive permission labeling, and permission-aware setup/WhatsApp/assignment controls.
   - Completed locally: Supervisor / Manager is assignable with live workload management, retrospective exception review, and the Agent Workload report.
   - Completed locally: administrators can search and inspect system-wide mutation and protected-access history with redacted before/after details.
   - Completed locally: permission-aware navigation, direct routes, data queries, and page actions now mirror the API permission boundaries; restricted-user browser acceptance and API integration coverage passed.

8. **Final Phase 1 release gate**
   - Run migrations twice to prove idempotency.
   - Run API, web, shared typechecks and production builds.
   - Run authorization tests for every role and multi-role combination.
   - Run local browser acceptance for all 21 items, followed by a clean production deployment and smoke test.

## Definition of done

Phase 1 is complete only when every row above is **Complete** and has repeatable acceptance coverage. A page, button, database table, configuration screen, tooltip, or seeded demo record by itself does not satisfy a deliverable. The required workflow must persist real data, enforce its rule in the API, respect assigned permissions, produce an audit trail for sensitive changes, and be verified in the running application.
