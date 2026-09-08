# Development Log

## 2026-09-08 — Phase 1 permission-aware interface completion (local only)

- Completed P1-19 across primary navigation, the custom Inbox navigation, Setup links, notifications, and all live Phase 1 direct routes.
- Added permission guards to Inbox, Reminders, Clients, Travellers, Requests, Reports, WhatsApp Groups, Setup, and their applicable detail pages.
- Hid create, edit, review, send, assignment, linking, fee, and integration controls when the signed-in employee lacks the corresponding permission.
- Stopped unauthorized page queries for fees, onboarding, travellers, templates, notifications, assignment recommendations, and configuration data.
- Added a neutral permission-aware home for employees without request-read permission so request workload and travel-watch data are not exposed.
- Made Client and Request details degrade cleanly to read-only views, including plain labels in place of unauthorized links or disabled edit controls.
- Closed a backend composition gap: `travellers.create` can create an unlinked traveller, but linking during creation now also requires `travellers.link`.
- Extended `test:permissions` to prove that create and link permissions remain independent.

Verification completed locally:

- API, web, and shared TypeScript checks passed.
- API and web production builds passed.
- Permission API integration checks passed, including the traveller-link boundary.
- Browser acceptance with a disposable employee holding only `clients.read` confirmed that only Clients appears as a live operational destination, client creation/edit/onboarding/traveller controls are absent, and direct Requests, Travellers, and Inbox URLs redirect safely.
- The disposable browser-test employee was signed out and removed after verification.

Production status: not deployed. The implementation is running locally for acceptance testing.

## 2026-09-08 — Phase 1 administrator audit history (local only)

- Added an administrator-only **Setup → Audit History** screen protected by the existing `audit.read` permission.
- Unified mutation audit events and protected-information access events into one newest-first history.
- Added search plus user, exact-action, Brooklyn-date-range, and important-activity filters with server-side pagination.
- Added field-level before/after comparisons for created and updated records.
- Added server-side redaction for passwords, provider/authentication keys, tokens, passport numbers, and similar secret-bearing fields so stored secrets never reach the browser.
- Classified protected access, user/security changes, destructive changes, configuration changes, and operational overrides as important without labelling the employee's behavior suspicious.
- Added audit indexes for newest-first, actor, and action filtering.
- Added `test:audit-history` coverage for authorization, filtering, unified sensitive-access results, invalid date ranges, and redaction.

Production status: not deployed. The implementation is running locally for acceptance testing.

## 2026-09-08 — Phase 1 Supervisor / Manager (local only)

- Added Supervisor / Manager as the fourth assignable Phase 1 role.
- Gave the role the full operational Phase 1 permission set plus cross-team workload, request reassignment, retrospective exception review, and workload-report authority.
- Kept locked Rule 23 unchanged: supervisor review happens after the action and never gates or blocks an agent.
- Added durable, append-only supervisor review items and review-decision history for pricing overrides, markup changes, waivers, assignment overrides, and operational exceptions.
- Added configurable markup-review amount and percentage thresholds. These route attention only and never pause operational work.
- Automatically records a review item when staff override an assignment recommendation.
- Added live workload and reporting queries using current request and reminder records.
- Added **More → Agents & Supervisor**, the Agent Workload queue, the Supervisor Review queue, and the live Agent Workload report.
- Replaced the demonstration Reports dashboard with a professional report index that clearly separates the live Phase 1 report from later-phase reports.
- Added `test:supervisor` coverage for role defaults, endpoint authorization, non-blocking exception recording, immutable review completion, and review history.

Verification completed locally:

- Database migration applied successfully.
- Supervisor integration test passed.
- API, web, and shared TypeScript checks passed.
- API and web production builds passed.
- Signed-in browser acceptance covered More navigation, workload views, a completed markup review, review history, and the live workload report.

Production status: not deployed. The implementation is running locally for acceptance testing.

## 2026-09-08 — Phase 1 durable reminders (local only)

- Added durable reminder records for unanswered inquiries, missing information, request next actions, and onboarding milestone tasks.
- Added a minute-based processor that synchronizes source records idempotently and calculates upcoming, due-soon, overdue, escalated, acknowledged, and resolved states.
- Added separately persisted delivery attempts with database `SKIP LOCKED` claiming, stale-lock recovery, exponential retry, and one-notification-per-reminder-state guarantees.
- Added personal and team reminder queues, acknowledgement, permission-controlled reassignment, state filters, automatic refresh, and navigation to the related request or client.
- Connected due, overdue, and escalated reminders to the existing notification bell and added Reminders to primary navigation.
- Successful request-linked WhatsApp replies now record the first response so unanswered reminders resolve automatically.
- Extended controlled test-data cleanup to reminder records and added `test:reminders` regression coverage.

Verification completed locally:

- Database migration applied twice successfully.
- Durable reminder synchronization, state calculation, acknowledgement, notification idempotency, stale-lock retry, and source resolution integration tests passed.
- API, web, and shared TypeScript checks passed.
- Reminder queue rendered in the signed-in browser with no console errors.

Production status: not deployed. The implementation is running locally for acceptance testing.

## 2026-09-07 — Conversational booking intelligence (local feature branch)

- Created `codex/booking-intelligence` from the latest integrated Phase 1 main line. Production was not changed.
- Expanded AI draft intake so it sends the recent conversation, including the employee's preceding questions, together with the linked client's open bookings for contextual analysis.
- Added deterministic server-side year inference for yearless month and day expressions. The nearest logical future occurrence is used. For example, in late 2026, `January` becomes `January 2027`.
- Added separate extraction confidence and booking-match confidence. A match must clear a deterministic confidence threshold and reference a real open booking. Otherwise, the draft requires an employee choice.
- Added the three booking outcomes: confidently matched existing booking, likely separate booking, and ambiguous booking.
- Added an open-booking dropdown to AI Draft Intake. Employees can accept the suggested booking, select another open booking, or explicitly select `Create a separate booking`.
- Added an `Apply to booking` action that updates only information supplied by the new message. Existing non-empty booking details are preserved.
- Added durable active-booking continuity: after a separate booking is created, answers to the employee's next question—including short `yes` or `no` replies—are forced onto that active booking unless the customer explicitly starts another trip.
- Added `Regenerate draft from latest message` so an employee can correct an AI draft that was attached to the wrong booking.
- Deduplicated the Inbox's booking history so multiple approved messages applied to one booking produce one booking card rather than repeated cards.
- Kept Phase 1 storage aligned with the authoritative model: the Inbox calls these choices bookings, but they currently point to open `travel_requests`. The later Sabre booking/PNR record can attach to the request without rewriting conversation history.
- Added resolved travel-date fields and date precision. Month-only information remains month precision rather than pretending the customer selected the first day.
- Added automatic booking-context closure. Completed or cancelled requests are excluded. A request with a resolved past return date, or a past departure date when no return exists, is also closed and removed from future choices. Month-only dates remain open through the end of that month.
- Removed the obsolete one-draft-per-request uniqueness restriction so multiple customer answers can attach to the same booking history.
- Added ownership enforcement before conversational information can modify an existing booking.
- Added `test:booking-context` coverage for January year inference, contextual question-and-answer input, match thresholds, new/ambiguous outcomes, lifecycle closure, field preservation, applying information to an existing booking, active-booking continuity despite an incorrect AI classification, and bare yes/no follow-ups.

Verification completed locally:

- Database migration applied successfully.
- Booking-context integration test passed.
- Phase 1 fees/templates/records regression test passed.
- Request assignment regression test passed.
- Permission API integration test passed.
- Security regression test passed with a temporary test-only encryption key.
- API and web TypeScript checks passed.
- API production build passed.
- Web production build passed with the project's bundled Node runtime. The system Node 18 runtime remains below the project's Node 20.19+ requirement.
- The local application reached its sign-in screen. Signed-in manual acceptance remains for the user because no login credential was used during this session.

Production status: not deployed and not merged. The feature remains on `codex/booking-intelligence` for user acceptance testing.

## 2026-09-05 — Three-role permission matrix (local only)

- Kept the approved assignable roles: Offshore Intake Employee, Travel Agent, and System Administrator.
- Added a stable permission catalogue covering every implemented Phase 1 access boundary plus visible, disabled later-phase ticketing and finance permissions.
- Added `user_permission_overrides`, which stores explicit grants and revocations without duplicating role defaults.
- Added a one-time compatibility migration that grants existing System Administrators all currently implemented permissions so migration cannot lock out the current account.
- Authentication now reads permission overrides from PostgreSQL on every request. JWTs still contain only the user ID.
- Added `AllowedPermissions` and `PermissionGuard`, and applied them to users, WhatsApp, clients, travellers, onboarding, requests, assignment, fees, templates, notes/documents/history, notifications, settings, integrations, audit access, and test-data deletion endpoints.
- Changed request assignment ownership checks to `requests.assign_self` and `requests.assign_any` instead of role-name checks.
- Added grouped permission checkboxes to both employee creation and employee editing. Changing roles resets the checkboxes to the combined role defaults; the administrator can then customize the employee.
- Future supervisor, ticketing, and finance abilities are visible but disabled until their business workflows exist.
- Updated setup, WhatsApp, group creation, and request-assignment UI visibility to mirror relevant permissions.
- Added `test:permissions`, which proves a database revocation returns HTTP 403, a grant takes effect for the same JWT, and future permission codes cannot become effective.

Verification completed locally:

- Database migration applied successfully three times, proving it is idempotent.
- Permission API integration test passed.
- Request assignment regression test passed.
- Security regression test passed after repairing its older multi-account test fixture.
- API, web, and shared TypeScript checks passed.
- API and web production builds passed.
- Local API is running on port 3001 and local web is running on port 5173.

Production status: not deployed. This change intentionally remains local for user acceptance testing.

## 2026-09-05 — Travel Agent Phase 1 ownership enforcement (local only)

- Expanded the Travel Agent role defaults to include Phase 1 client creation, traveller creation/linking, and onboarding read/manage permissions required by P1-02 and P1-04 through P1-08.
- Added backend ownership enforcement so Travel Agents without assign-any authority may update details, review missing information, and calculate fees only for requests assigned to them.
- Protected request-specific notes, documents, unified history, and document downloads with the same assignment ownership rule.
- Kept the full open Requests queue visible for P1-21 and kept self-claim available for unassigned requests.
- Added a read-only notice and removed/disabled request editing, fee, reply, and record controls when the open request belongs to another employee.
- Extended the permission integration test to prove own-request access succeeds while another employee's request edits, records, and fee calculation return HTTP 403.

Verification completed locally:

- Permission API and ownership integration test passed.
- Request assignment regression test passed.
- Phase 1 fees/templates/records regression test passed.

Production status: not deployed. This change intentionally remains local for user acceptance testing.
