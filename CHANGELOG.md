# Change log

Every implemented change gets an entry here — what changed, and why. Newest first. See `CLAUDE.md` → "Change log" for the convention.

---

## 2026-08-31 — Production deployment and legacy relationship migration

**What changed:** deployed the complete Phase 1 workflow and security revision to the YB Travel production preview stack. Added protected production CORS, AI-secret encryption, and backup-encryption settings, then rebuilt and replaced the API and web containers while preserving PostgreSQL data and WhatsApp authentication state.

**Migration compatibility:** normalized the original prototype traveller relationship label `kid` to the controlled `child` value before enforcing the relationship constraint. This preserves the existing traveller link and keeps repeated schema application idempotent.

**Safety and verification:** created a PostgreSQL custom-format backup before deployment. The final API health check reports a connected database, the web returns HTTP 200, production CORS accepts the deployed web origin, security headers are present, all three containers are running, and the new AI-provider and security schema objects were created successfully.

## 2026-08-31 — Remove Amharic from the US desk

**What changed:** removed Amharic from traveller language preferences and removed both Amharic starter WhatsApp templates. The idempotent migration deletes existing Amharic message templates, and template validation prevents the unsupported language from being added again. English, Hebrew, and Yiddish remain available.

## 2026-08-31 — Security, messaging reliability, and recovery hardening

**Authentication and transport:** added persistent email-plus-IP login throttling with timed lockouts, immediate invalidation of deactivated employees' sessions, restricted CORS, complete API security headers, stronger production secret validation, and grace-key JWT rotation.

**Messaging and sensitive data:** provider message IDs now provide database-enforced inbound deduplication. Outbound messages record every attempt, provider result, failure, retry timing, and ambiguous-delivery state; confirmed failures have an audited manual retry path, while unknown deliveries are protected from unsafe resend. Traveller list responses redact passport details, every detail access is recorded without copying the sensitive values, and administrators can inspect access history.

**Secrets and recovery:** encrypted AI credentials support re-encryption under a new primary key. Added authenticated rotation, encrypted PostgreSQL backup, verification, guarded restore commands, matching PostgreSQL Docker-tool support, and a production operations runbook covering rotation, retention, incident handling, and monthly restore drills.

**Verification:** the idempotent migration applied successfully; API/web/shared typechecks and builds pass; the database-backed security regression suite verifies throttling, deactivation, duplicate prevention, failure tracking, passport redaction/access history, headers, and encrypted-file integrity. An encrypted database backup verified with 275 restore entries and restored successfully into a temporary database containing 30 public tables; the temporary database and test backup were then removed. A live `/health` response confirmed the active API security headers.

## 2026-08-31 — Configurable assignment and fallback routing

**What changed:** added a complete assignment-routing policy with preferred representative, secondary representative, client-continuity, eligible-team, and supervisor-escalation levels. Administrators can choose recommend-only or automatic assignment, lowest-workload or round-robin team selection, eligible and escalation roles, and Normal/High/Urgent fallback timers.

**Staff controls:** the new Assignment & Fallback settings page manages each employee's active state, availability, normal and high-priority capacity, timezone, working hours, working days, and request-type qualifications. Client-specific preferred and secondary representatives continue to be configured on the client profile.

**Request behavior and audit:** request ownership now has a separate assignment state so assigning a request does not incorrectly change its operational workflow stage. Request details show the current system recommendation, routing level, explanation, next fallback time, and assignment history. Confirmed assignments, reassignments, automatic assignments, overrides, and escalations record the actor, selected staff member, explanation, and recommendation snapshot.

**Verification:** the idempotent schema migration applied successfully; API and web typechecks and production builds pass; the rollback-only PostgreSQL test verified recommendation evaluation, assignment state, unchanged workflow state, and audit history. Chrome verification confirmed the complete settings page and an explainable supervisor escalation on R-10504 when no eligible employee was within configured working hours. No live assignment or settings were changed during verification.

## 2026-08-31 — Notify staff when a request is assigned

**What changed:** every successful request assignment or reassignment now creates a private in-app notification for the newly responsible employee in the same database transaction. The notification identifies the request, client, trip summary, assigning employee, and exact request record. Assigning a request to the same current owner remains a no-op and does not create duplicate alerts.

**Staff experience:** every application header now includes a notification bell with an unread count and a latest-50 notification menu that refreshes automatically. Selecting an assignment notification marks it read and opens the exact request. Staff may also mark all notifications read; read actions are audited and one employee cannot view or modify another employee's notifications.

**Scope:** this is the primary in-app assignment notification only. Timed reminders, acknowledgement deadlines, supervisor escalation, email, and staff WhatsApp delivery remain separate later work.

## 2026-08-31 — Clarify and streamline WhatsApp group creation

**What changed:** the Managed Groups form now automatically selects a client's newest saved request and generates an editable group name. When a client has no saved request, the inline request form opens automatically, preselects the first active request type, and clearly labels its action **Save request & continue**. Saving the request immediately connects it to the group and fills the suggested name without waiting for the options list to refresh.

**Guidance and validation:** the footer now shows a four-part completion checklist for client, request, participants with valid WhatsApp numbers, and group name. It identifies the exact next action instead of leaving Generate Name and Create WhatsApp Group disabled with a generic error. Changing clients clears prior participant selections to prevent accidental carryover.

**Why:** the previous form displayed the saved-request selector and new-request editor at the same time without explaining which one had to be completed, so operators could not tell why group creation remained unavailable.

**Verification:** web typecheck and the Node 24 production build pass, and `git diff --check` is clean. Chrome verification confirmed that Nigist automatically selects R-10504 and generates `Nigist · R-10504`; selecting a client without requests opens the new-request form with the first active type selected. Supplying a selected participant and a valid test-format number enabled the final action and showed the Ready state. The form was then cancelled, and no request or WhatsApp group was created.

## 2026-08-31 — Review and send proposed client replies from requests

**What changed:** real request details now show the saved AI intake proposed reply in a large editable field, together with the linked client WhatsApp number and an explicit **Send to client** action. Requests without a linked Inbox conversation show a clear unavailable state.

**Human approval and audit:** nothing sends automatically. An authorized employee must review or edit the text and deliberately click Send to client. The server validates the staff role, message text, and request-to-conversation relationship before sending, appends the outbound message to the Inbox conversation, and records the actor, request, conversation, provider message ID, and character count in the audit history without duplicating the message body.

**Verification:** API and web typechecks and production builds pass, and `git diff --check` passes. Chrome verification confirmed that R-10504 loads its correct saved proposed reply, linked WhatsApp number, and enabled send action. No live client message was sent during verification.

## 2026-08-31 — Assign real requests to staff

**What changed:** added request ownership fields for the assigned staff member, assignment time, and assigning staff member. Real request profiles now include an Assigned Staff section where System Administrators and Offshore Intake Employees can assign or reassign an eligible Travel Agent or Offshore Intake Employee. An unassigned request can be claimed by a Travel Agent through the same role-aware endpoint.

**Workflow and queues:** assigning a New request moves it to the configurable Assigned status. The Requests screen now shows live **Assigned to Me** and **Unassigned** sections with dynamic counts, and the Agent column displays the current owner. Assignment changes refresh both the detail and queue immediately.

**Permissions and audit:** authorization is re-read from the current database user. Travel Agents may only claim an unassigned request for themselves; administrators and offshore intake staff may assign or reassign. Each real change runs inside a locked database transaction and writes a `travel_request.assigned` or `travel_request.reassigned` audit event with full before/after state. Demonstration requests remain read-only.

**Verification:** the migration applies idempotently, API and web typechecks pass, and both production builds pass. A rollback-only PostgreSQL integration test verified owner persistence, the New → Assigned transition, audit before/after data, and complete restoration of R-10504's original unassigned state. Chrome verification confirmed eligible staff choices, a disabled-until-selected Assign Request action, and live Assigned to Me/Unassigned queue counts. No staff member was selected on the user's behalf.

## 2026-08-31 — Open demonstration request details

**What changed:** request numbers and complete rows in the demonstration workflow views now open read-only detail pages. The detail clearly identifies the record as DEMO and displays its client, trip, stage, assigned agent, waiting-on party, next action, fare, and deadline. Real request rows continue opening their database-backed profiles.

**Why:** demonstration request numbers were underlined and rows appeared interactive, but clicking them only selected a row because no detail route had been connected.

**Verification:** web typecheck and production build pass. Live Chrome verification opened R-10482 at `/requests/R-10482` and confirmed its DEMO label, Kaplan client, JFK–TLV itinerary, workflow, agent, fare, and deadline details.

## 2026-08-31 — Add an All Requests section

**What changed:** added **All Requests** as the first and default Requests section. It displays every real database-backed request in one place and shows a live count in both the section tab and page heading. Selecting the section clears any previous search so the complete list is immediately visible; entering a search from any workflow section still searches real requests globally.

**Why:** staff needed a reliable destination for browsing all operational requests instead of depending on the older demonstration views or knowing a request number in advance.

**Verification:** web typecheck and production build pass. Live Chrome verification confirmed All Requests is the default section, displays both R-10504 and R-10503 with exact links, and clears an existing request search when selected.

## 2026-08-31 — Include live requests in the Requests queue

**What changed:** connected the Requests screen to the real travel-requests API while retaining the existing demonstration queue for reference. Database-backed requests now appear in a clearly labelled Live Requests group, participate in the same request-number/client/summary/status/type/deadline search, and link to their exact request profiles.

**Why:** AI-created requests such as R-10504 existed and opened from the Inbox, but the Requests screen searched only static demonstration rows, incorrectly reporting that the request could not be found.

**Verification:** web typecheck and production build pass. Live Chrome verification searched for `10504`, returned exactly R-10504 in the Live Requests group, and confirmed that its link targets `/requests/5`.

## 2026-08-31 — Show all requests from an Inbox conversation

**What changed:** added a persistent **Requests in this conversation** section to the AI Draft Intake panel. It lists every approved request created from the selected WhatsApp thread with its exact request number, summary, request type, urgency, and creation date; each item opens the matching request profile.

**Workflow behavior:** prior requests remain visible while a newer message is pending review, rejected, or fails analysis. The list is read-only navigation and does not create, update, approve, or send anything.

**Verification:** API and web typechecks pass, the web production build passes, and live Chrome verification shows R-10504 and R-10503 together with their correct `/requests/5` and `/requests/4` links.

## 2026-08-31 — Larger Suggested Reply editor

**What changed:** expanded the AI Draft Intake Suggested Reply field to seven visible lines with improved spacing and vertical resizing, matching the enlarged Missing Information editor.

**Verification:** web typecheck and production build pass. The current draft was approved before the final browser refresh, so the live Inbox correctly showed its created-request state rather than an editable pending draft.

## 2026-08-31 — Larger Missing Information editor

**What changed:** expanded the AI Draft Intake Missing Information field from two lines to seven visible lines, increased its internal spacing and line height, and made it vertically resizable so staff can comfortably review and edit every missing item.

**Verification:** web typecheck and production build pass, and the expanded editor was verified against the current pending AI draft in Chrome.

## 2026-08-31 — Search the Requests queue

**What changed:** added a dedicated search control to the Requests toolbar. It filters the visible queue immediately across request number, client, trip, stage, waiting-on details, fare, deadline, and assigned-agent initials, with a one-click Clear action and matching item count.

**Verification:** web typecheck and production build pass, and the Requests search and clear states were verified in Chrome.

## 2026-08-31 — Wider AI Draft Intake panel

**What changed:** widened the Inbox AI Draft Intake and context sidebar from 300–340px to 390–430px so request summaries, extracted details, review controls, and client context are easier to read while the conversation remains flexible.

**Verification:** web typecheck and production build pass, and the updated three-column Inbox layout was visually checked in Chrome.

## 2026-08-31 — Open AI-created requests from the Inbox

**What changed:** the request number shown after approving an AI Draft Intake now links to the exact persisted travel request instead of the generic Requests queue. Added an authenticated request-detail endpoint and a dedicated request profile showing the request number, client, summary, request type, status, urgency, response/service deadlines, and creation time.

**Verification:** API and web typechecks pass, the production web build includes the new request-detail route, and live Chrome verification opened R-10503 directly from its Inbox confirmation link at `/requests/4` with the correct client and AI-reviewed trip summary.

## 2026-08-31 — AI-assisted WhatsApp Draft Intake

**What changed:** eligible incoming WhatsApp travel messages now run through the configured OpenAI adapter and produce a structured **Draft Intake** beside the Inbox conversation. The draft includes request type, urgency, summary, passenger count, route, travel-date text, missing information, a confidence score, and a suggested reply. Existing conversations also provide an explicit **Analyze latest message** action for review and controlled retries.

**Human approval boundary:** AI output is stored separately from operational travel requests with Pending, Rejected, Approved, and Failed states. Staff may edit or reject the proposal, copy its suggested reply into the unsent composer, or create the official request only after review. The create action requires a linked client and is protected against duplicate requests; no AI-generated message is sent automatically.

**Privacy, history, and verification:** obvious payment-card, security-code, and passport-number patterns are redacted before provider transmission. Provider token/cost usage flows through the existing privacy-safe usage ledger, while draft edits, rejection, approval, and official request creation are audited. The migration applied successfully; API and web typechecks pass, the API production build passes, and the web production build passes under the project-required Node 20.19+ runtime.

## 2026-08-31 — Prevent duplicate clients and preserve WhatsApp linkage

**What changed:** client creation and editing now reject a phone number already assigned to another live client. The check normalizes punctuation and country-code formatting and uses a transaction-scoped database lock, so rapid or concurrent submissions cannot create the same phone twice. The New Client form now displays the WhatsApp/phone field for Household, Company, and Individual clients, and the Clients toolbar includes a dedicated search across names, phone numbers, types, representatives, fee groups, and onboarding stages.

**Inbox linkage:** direct WhatsApp conversations now store an explicit client relationship. Creating a client from **Link to client** passes the conversation identity and creates both records' relationship in the same audited transaction. Once linked, Inbox removes the “isn't linked” warning and displays the client name with a direct profile link. Existing phone-matched conversations are backfilled to the earliest live client.

**Duplicate cleanup and verification:** removed empty duplicate client `#44`, retained original client `#43`, linked conversation `#4` to it, and preserved the removed row in the audit history. Chrome verification confirmed one Nigist result, phone search reducing the list to that one client, visible phone input for new clients, linked Inbox context, and a rejected duplicate create with no new row. Shared/API/web typechecks pass, production builds pass, and WhatsApp reconnected on the project-required modern Node runtime.

## 2026-08-31 — Open existing travellers in form view

**What changed:** every traveller row and traveller-name link now opens a dedicated read-only profile form. The form separates Identity, Documents, Client Accounts, and Preferences into clear tabs, shows profile completeness and record metadata, and provides direct navigation back to the Travellers list. Traveller names shown inside a client profile now open the same detail view.

**Data and behavior:** added an authenticated single-traveller API endpoint and exposed the stored passport number and issuing country alongside the existing identity, passport status/expiry, and linked-client data. Missing or hidden records display a clear not-found state. This change does not introduce editing or alter traveller records.

**Verification:** shared, API, and web TypeScript checks pass, as does the production web build and `git diff --check`. Live Chrome verification covered whole-row navigation, identity and passport fields, linked client accounts and relationships, back navigation, and the not-found state. No application-origin console errors were present; observed warnings came from installed Chrome extensions.

## 2026-08-31 — Edit clients from their profile

**What changed:** added an **Edit Client** action to live client profiles. It opens a prefilled form for the client name, type, WhatsApp number, onboarding stage, preferred and secondary representatives, and booking fee group, with Save Changes and Cancel controls. Successful saves refresh the profile and Clients list immediately.

**Safety and history:** the authenticated API validates active stages and fee groups, normalizes WhatsApp numbers, rejects edits to demo clients, and records the full before/after client state in the audit log within the same database transaction as the update. Demo profiles remain visibly read-only.

**Verification:** shared, API, and web TypeScript checks pass. The edit form was opened and cancelled against an existing client during browser verification so no live client data was changed.

## 2026-08-31 — AI usage and estimated-cost history

**What changed:** expanded **Setup → AI Provider** with an administrator-only usage dashboard covering the latest 100 provider requests over selectable 7-day, 30-day, 90-day, or all-time periods. Summary cards show provider-request count, input and cached-input tokens, output tokens, total tokens, failed calls, and estimated USD spend. Each history row records purpose, model, status/error, token counts, estimated cost, staff member, duration, provider response identifier, and optional related business-record identifiers.

**Cost and privacy boundaries:** every YB Travel OpenAI generation now enters through one backend client that records the usage object returned by the Responses API. The ledger stores no prompts, client messages, or generated reply text. Costs use a versioned price snapshot for GPT-5.6 Luna, Terra, or Sol, account for cached input and the documented long-context multiplier, and remain estimates; the page links to OpenAI Billing because the actual remaining credit balance, taxes, and account-level adjustments are authoritative there. Money is persisted as PostgreSQL `NUMERIC`, not a JavaScript floating-point authority.

**Operational visibility:** connection tests are also recorded as zero-token provider requests, including failures, so administrators can distinguish access checks from paid generations. The SQL migration applied successfully, API/web/shared typechecks pass, production builds pass, and live Chrome verification confirmed the usage totals, period controls, billing link, history headings, privacy explanation, and empty state. A local encryption key is now configured so the OpenAI key can be saved securely; the administrator must enter the project API key once on the page because it was not present in the database during verification.

## 2026-08-31 — Keep client names on one line

**What changed:** widened the Clients table’s Client column from 150px to 250px and grouped each client name with its optional DEMO badge in a non-wrapping row. Phone numbers remain on their own line underneath.

**Why:** longer names such as Bluebird Learning Center and Horizon Consulting LLC were wrapping at the operator’s 75% browser zoom, making the list taller and harder to scan.

## 2026-08-31 — Administrator-controlled demo clients and travellers

**What changed:** added an audited **Show sample clients and travellers** checkbox to the System Administrator Setup overview. The current local system is enabled and now displays 12 read-only demo clients—four Households, four Companies, and four Individuals—with 24 linked travellers covering family, employee, employer, colleague, guest, group-member, and friend relationships. Demo rows use reserved 555-01xx phone numbers and carry visible **DEMO** labels.

**Production safety:** demo records are stored separately with stable demo identifiers and `is_demo` flags. Disabling the checkbox immediately removes them from the Clients and Travellers APIs without deleting or changing live records; enabling it restores the same catalogue without reseeding. Fresh deployments default to demo data disabled. Demo profiles cannot accept new travellers, demo travellers cannot be linked to live records, and demo records are excluded from WhatsApp group workflows.

**Client model and verification:** client type is now persisted for newly created clients and displayed in the client list and profile. Date-only traveller fields are serialized explicitly as `YYYY-MM-DD` so dates do not shift across time zones. The migration applies idempotently; two runs retained exactly 12 demo clients, 24 demo travellers, and 24 links. A rolled-back disabled-state database check returned only the three existing live clients and three live travellers. API and web typechecks/builds pass, and Chrome verification covered the administrator toggle in both directions, client/traveller counts, type and demo labels, linked travellers, read-only controls, and a clean application console.

## 2026-08-31 — Secure OpenAI provider setup

**What changed:** added an administrator-only **Setup → AI Provider** page for connecting YB Travel to an OpenAI project key, selecting GPT-5.6 Luna/Terra/Sol, choosing bounded reasoning and output limits, testing model access, and enabling or disabling AI-assisted intake. GPT-5.6 Luna is the recommended default; the page makes current reference token prices visible while keeping OpenAI billing authoritative.

**Credential safety:** API keys are sent only to the authenticated backend, tested against OpenAI's model endpoint without generating billable response tokens, encrypted with AES-256-GCM before PostgreSQL storage, and represented in API/UI responses only by the last four characters. Saving requires a separately managed `AI_SECRETS_ENCRYPTION_KEY`; every settings update records a sanitized audit event that never includes the secret. Human review and sensitive-data redaction remain mandatory and cannot be disabled from the page.

**Scope boundary:** this connects and configures the provider but does not yet run AI over live WhatsApp messages. The separate intake-adapter, redaction, structured extraction schema, evaluation set, and employee review workflow still need implementation before production client data is processed.

**Verified locally:** API, web, and shared TypeScript checks pass; both production builds succeed with the project-required modern Node runtime; the SQL migration applies cleanly twice; and direct navigation without an authenticated administrator is redirected to sign-in. A live-key test was deliberately not performed because no OpenAI credential was supplied in this task.

## 2026-08-31 — Open client profiles and add linked travellers

**What changed:** client names in the Clients table now open a dedicated client profile instead of acting as inactive links. The profile shows the client's onboarding stage, WhatsApp number, preferred and secondary representatives, fee group, creation date, and every traveller already linked to that client.

**Traveller workflow:** each client profile now includes **+ Add Traveller**. Staff can either create a new traveller and link them to the open client in one step, or select an existing unlinked traveller and add the relationship to the client. Existing links are excluded from the selector to prevent duplicate choices, and no passport details are required during this quick-add flow.

**Verified locally:** the web TypeScript check and production build pass. Chrome verification confirmed that all three existing client names navigate to real profile URLs, the selected client's details and linked-traveller table load, and both new-traveller and existing-traveller forms render correctly. No test traveller was saved during verification.

## 2026-08-31 — Match the approved Add New Client interface

**What changed:** rebuilt the New Client panel to match the supplied interface: compact page chrome at the operator's saved 75% browser zoom, a name-first Client details section, interactive Household/Company/Individual type selector, aligned Assignment & Fees fields, explanatory help text, the “What happens next” sidebar, keyboard guidance, and Cancel / Create & New / Create Client actions. The surrounding Clients header and filter strip now use the same compact proportions as the reference.

**Functional scope preserved:** clients opened from a WhatsApp conversation still carry the prefilled WhatsApp number into the create request even though the reference design does not display that field. Active fee groups and real representatives continue to come from the existing APIs; Create & New now saves and keeps the panel open for another entry, while Escape, Cancel, and close return to the normal Clients URL.

**Why:** the earlier grouped form deliberately omitted the client-type selector, guidance panel, inline help, and Create & New workflow, so it remained visibly and behaviorally different from the approved design.

## 2026-08-30 — Recover WhatsApp locally and harden reconnect/QR states

**What changed:** restored the existing local WhatsApp connection without clearing credentials or requiring another scan. The Inbox now distinguishes an unavailable YB Travel API from a genuine WhatsApp disconnection, offers an API retry when the service cannot be reached, and gives System Administrators a protected **Try connection again** action when WhatsApp itself is disconnected.

**Authentication-state correction:** an expired or origin-specific application token now redirects immediately to the login page with the current route preserved. It is no longer mislabeled as a WhatsApp/API outage while a stale “System Administrator” header remains visible.

**Session and QR safety:** normal restarts always attempt the saved WhatsApp credentials first. If WhatsApp explicitly reports that the linked-device session has been logged out and cannot be resumed, the connector now moves the invalid credential directory into a timestamped backup instead of deleting it, starts a clean pairing session, and publishes the resulting QR code to the authenticated Inbox automatically.

**Why:** a stopped API previously looked exactly like a disconnected WhatsApp account and left the page waiting for a QR that no running connector could generate. The corrected states preserve recoverable sessions, explain infrastructure outages accurately, and still provide a visible recovery path for a genuinely invalid session.

## 2026-08-30 — WhatsApp Inbox and Managed Groups redesign

**What changed:** rebuilt the WhatsApp Inbox around the approved three-column visual direction: a searchable conversation rail, a focused message workspace, and a contextual details panel. The connected-state header, compact WhatsApp sub-navigation, real conversation metadata, selected-thread actions, message bubbles, and composer now use the same warm-grey, green, gold, 2px-radius, no-shadow system as the supplied reference. The Managed Groups screen now uses the matching stepped form, participant panels, live group preview, action footer, and managed-groups table.

**Functional scope preserved:** conversation search and start-by-number, conversation selection, message history, sending, socket updates, connection/QR states, real client/request selection, real participant validation, generated group naming, managed-group creation, role restrictions, and the existing required travel-request relationship are unchanged. Reference-only Email and Assigned-to-me tabs, fabricated unread counts, canned replies, quick actions, client-link claims, passport status, optional unlinked groups, and sample records were deliberately not added because the current product and backend do not support them.

**Verified locally:** the web TypeScript check passes, the production frontend build succeeds with the project-required modern Node runtime, and `git diff --check` passes. Fresh Chrome verification covered connected Inbox and Managed Groups states, conversation filtering, start-field focus, draft-enabled Send, client/request selection, real-request expansion, incomplete-form prevention, and browser console review. No WhatsApp message or group was created during testing. Visual QA against both supplied references is recorded in `design-qa.md` with `final result: passed`.

## 2026-08-30 — Explain role capabilities while creating users

**What changed:** the administrator's **Setup → Users → New User** form now explains each selected Phase 1 role directly beneath the role checkboxes. Offshore Intake Employee, Travel Agent, and System Administrator each show a short purpose plus separate **Can** and **Cannot** lists. Selecting multiple roles displays the corresponding cards together and explains that permitted capabilities combine without removing restrictions or granting ticketing or finance authority.

**Role boundary clarified:** Offshore Intake prepares clients, travellers, onboarding information, replies, and request routing; Travel Agents own assigned travel work, research options, communicate with clients, create holds, and prepare bookings; System Administrators manage technical access and configuration. The display explicitly states that System Administrator is not automatically an operational supervisor and that Travel Agent does not receive operational-escalation authority unless separately designated later.

**Why:** administrators need to understand the operational difference between role checkboxes before creating an account. The descriptions document the approved three-role Phase 1 model and do not expand backend authorization. Web typecheck and the production frontend build pass.

## 2026-08-30 — Grouped client creation form redesign

**What changed:** redesigned the existing New Client form as a bordered, sectioned panel with a green top rule, a compact header, two balanced two-column groups, and a dedicated right-aligned action footer. The layout now separates Client details from Assignment so agents no longer have to scan all four controls across one long row. The reference-only “What happens next” sidebar is not included.

**Functional scope preserved:** the form still contains only Name, required Fee group, Preferred rep, and Secondary rep. The existing configured-fee API, required/optional rules, creation mutation, validation, disabled state, and successful-create reset are unchanged. Reference-only Client type and Create & New behavior were deliberately not added.

**Verified locally:** the web TypeScript check passes, the production web build succeeds with the project-required modern Node runtime, and browser verification confirms the close/cancel/reopen behavior, field requirements, disabled no-fee-group state, absence of the explanatory sidebar, and a clean browser console. The normalized visual comparison is recorded in `design-qa.md` with `final result: passed`.

## 2026-08-30 — Configurable urgency response and service deadlines

**What changed:** expanded **Setup → Request Workflow** with administrator-managed urgency levels. Normal, High, and Urgent are seeded as the approved starting vocabulary. Each level has an immutable stable code plus editable name, description, order, active state, response deadline, and service deadline. Deadlines are stored as positive elapsed minutes, and validation prevents a service target from being earlier than its response target.

**Reporting foundation:** real travel requests now reference an urgency-level record and snapshot `response_due_at` and `service_due_at` when created. First-response and service-completion timestamps are also reserved on the request record. This preserves the original target for historical on-time/late reporting even if an administrator later changes the configuration. Existing requests are backfilled to Normal urgency without inventing a deadline where none has been approved.

**Deliberate policy boundary:** initial response and service targets remain blank so this implementation does not silently establish YB Travel policy. Deadlines currently use elapsed clock time from request receipt. Business-hours calendars, on-hold clock pausing, urgency-detection rules, automated escalation, and the reporting screen remain separate decisions/implementation steps.

**Verified locally:** API and web typechecks and production builds pass; the SQL migration applies cleanly twice; anonymous configuration access returns `401`; administrator access returns Normal, High, and Urgent; and an invalid service-before-response configuration returns `400` without changing the saved record.

---

## 2026-08-30 — Configurable request types and request statuses

**What changed:** added administrator-managed **Setup → Request Workflow** catalogues for the five approved request types and eleven approved request statuses. The defaults include New flight booking, Change existing booking, Cancellation or refund inquiry, General travel inquiry, Other, and the full operational status path from New through Completed/Cancelled, including the explicitly approved **On hold** status. Administrators can change display names, descriptions, order, and active state or add future records without a deployment; stable codes become read-only after creation because request records and integrations use them as identifiers.

**Request integration:** real `travel_requests` now reference request-type and request-status records instead of relying only on a free-text status. Existing request rows are idempotently backfilled to New flight booking / New. The request creation API accepts an active type and always starts at the configured New status; the WhatsApp managed-group workflow now requires staff to choose a request type when creating its linked request record.

**Permissions, audit, and verification:** all authenticated staff can read active values for operational forms, while only System Administrators can see inactive records or create/change configuration. Every catalogue mutation writes transactional before/after audit history. API and web typechecks pass, both production builds succeed with the required modern Node runtime, the SQL migration applies cleanly twice, anonymous configuration access returns `401`, administrator access returns exactly 5 types and 11 statuses, **On hold** is present, and the existing request endpoint remains healthy. Urgency levels and service deadlines remain deliberately unimplemented until their separate business decisions are approved.

---

## 2026-08-30 — Start WhatsApp conversations by phone number

**What changed:** the connected Inbox now has one field for searching existing conversations by contact name or phone number and for starting a new direct WhatsApp conversation. A complete international number enables **Start**; successful lookup creates or reuses the local conversation and opens its thread so the agent can type the first message. No message is sent until the agent explicitly presses **Send**.

**Provider validation:** the provider-neutral `MessagingChannel` interface can now resolve a direct recipient. The Baileys adapter checks the normalized number with WhatsApp before a conversation is stored, retains any known contact display name, rejects unregistered numbers with a readable error, and refuses the workflow while WhatsApp is disconnected. Numbers must include a country code and are normalized to 8–15 digits before provider lookup.

**Security and verification:** the new `POST /messaging/conversations` endpoint remains behind the existing messaging authentication guard. Focused service checks cover normalization, conversation reuse inputs, disconnected-provider handling, and unregistered-number handling. API, web, and shared typechecks pass; API and web production builds succeed with the project-required modern Node runtime; an unauthenticated HTTP request returns `401`; and the connected-state Inbox layout was visually verified in the live local frontend. No real WhatsApp message was sent during testing.

---

## 2026-08-30 — Create and link WhatsApp groups from YB Travel

**What changed:** added a **WhatsApp Inbox → Manage WhatsApp Groups** workflow. Authorized staff can select a real client and travel request, select only travellers linked to that client, select staff participants, enter each participant's WhatsApp number, and either enter or generate the group name. The generated default combines the client name and unique request number. A minimal real `travel_requests` record and audited request-creation endpoint were added because the existing Requests queue is still frontend mock data and could not provide a valid database relationship.

**Provider integration and session safety:** extended the provider-neutral `MessagingChannel` adapter with group creation and implemented it through Baileys `groupCreate`. Participant numbers are normalized, checked for WhatsApp registration when the provider returns registration results, and the already-connected YB number is rejected from the participant list because WhatsApp includes it automatically. This change does not clear, replace, or rewrite `.baileys-auth`; deployment can retain the existing credential volume exactly as before.

**Data integrity and duplicate protection:** every managed group stores its WhatsApp group JID, final name, client, request, conversation, creator, status, and traveller/staff participants. A request can have only one managed group, group names are unique case-insensitively, and a database reservation is committed before the external provider call so simultaneous clicks cannot create two groups. A failed attempt can be retried only with its reserved name. Before retrying, the adapter checks participating WhatsApp groups for that exact app-reserved name and reuses it if an earlier provider response was lost.

**Authorization and audit:** introduced a reusable database-backed role guard. Everyone authenticated may review managed groups, but group creation currently allows only Travel Agents and System Administrators; Offshore Intake Employees receive `403`. This is a conservative launch default pending approval of the configurable WhatsApp group policy. Request creation remains available to all three approved Phase 1 roles. Request creation, group creation start, successful/reconciled creation, and provider failure are transactionally audited with actor and before/after state.

**Setup decision still required:** the Setup overview now identifies the WhatsApp controls that should become configurable after approval: authorized group-creator roles, the group-name template, default staff participants, and provider/manual-fallback policy. The open decision is recorded in `docs/05-open-decisions.md`; no unapproved Setup values were invented.

**Verified locally:** API, web, and shared typechecks pass; both production builds succeed; the SQL migration applies cleanly twice. A fake-provider integration test confirmed real client/request links, traveller-client validation, participant persistence, WhatsApp group ID/conversation storage, duplicate prevention, failed-attempt persistence, same-name retry, changed-name retry rejection, and audit events, then removed every test record. HTTP tests confirmed anonymous reads return `401`, Offshore Intake can review groups but receives `403` when creating one, and Travel Agents/System Administrators pass the role gate. No real WhatsApp group was created during automated testing.

---

## 2026-08-30 — Phase 1 Setup overview, editable onboarding, and required information

**What changed:** expanded the administrator-only Setup area into a Phase 1 configuration overview. It now shows eight business-controlled areas: Users & Roles, Booking Fees, Onboarding Workflow, Required Information, Message Templates, Request Workflow, Assignment & Reminders, and WhatsApp Integration. The first four link to working configuration screens. New user assignments now offer only the three approved launch roles: Offshore Intake Employee, Travel Agent, and System Administrator; historical role values remain readable rather than being destructively removed. The last four areas are deliberately marked **Needs decisions** so the product structure is visible without hardcoding unapproved templates, deadlines, capacity rules, escalation timing, or WhatsApp policy.

**Onboarding configuration:** added editable onboarding-stage records with stable codes, display names, descriptions, order, active status, a single completion-stage designation, and a reviewed-information completion gate. Each stage can also define a future milestone task's responsible Phase 1 role, priority, and expected duration. The six approved defaults are New inquiry, Welcome sent, Waiting for information, Information received, Review complete, and Fully onboarded. Client lists now resolve stage display names from this configuration instead of a hardcoded label map.

**Required-information configuration:** added editable client, traveller, and request field rules with required, staff-review, order, and active controls. The four approved fields—legal names, date of birth, airports, and travel dates—start required and review-gated. Cabin class, flexibility, and special requests are present but optional until their business requirement is approved.

**Permissions and audit:** all authenticated staff can read active workflow rules for operational screens, while only System Administrators can see inactive records or create/change configuration. Every stage and information-rule mutation records the actor and before/after state transactionally in `audit_events`. The database allows configurable future stage codes, rejects a second completion stage, and applies the new schema and defaults idempotently.

**Verified locally:** API, web, and shared-package typechecks pass; both production builds succeed; the SQL migration applies cleanly twice. API integration checks confirmed anonymous access is `401`, staff can read active rules but receive `403` from administration and mutation endpoints, administrators can create/update both setting types, a second completion stage returns `409`, and four transactional audit events contain the expected before/after history. Temporary test records were removed afterward.

---

## 2026-08-30 — Configurable booking fees and passenger calculation rules

**What changed:** added an administrator-only **Setup → Booking Fees** area backed by real `booking_fee_groups` records. Administrators can create and edit a group name, stable code, decimal amount, ISO currency, calculation basis (per passenger or once per booking), adult/child/infant inclusion rules, and active status. The form includes a live passenger-count calculator so a rule can be checked before saving. Inactive records stay available to administrators for review or reactivation rather than being destructively deleted.

**Client integration:** the New Client form no longer uses the three hardcoded Standard/Belev Echad/Scheiman labels. It loads active configured fee groups from the API and stores the selected record ID. Existing clients retain a readable fallback from the legacy `fee_group` field while deployments migrate safely; new assignments use `booking_fee_group_id`.

**Permissions, audit, and data safety:** authenticated staff may list active groups for client assignment, but only System Administrators can list inactive records, create groups, or change them. Every create/update writes the actor, action, timestamp, and before/after JSON to the shared `audit_events` table in the same database transaction. Fee amounts use PostgreSQL `NUMERIC(12,2)` and cross the API as decimal strings, not authoritative JavaScript floating-point numbers. The API validates currency, stable codes, two-decimal precision, and requires at least one passenger category for per-passenger rules.

**Verified locally:** API, web, and shared-package typechecks pass; both production builds succeed. The SQL migration applies cleanly twice. API integration checks confirmed anonymous access is `401`, ordinary staff can read active groups but receive `403` from administration and mutation endpoints, administrators can create/update groups, invalid three-decimal money is rejected with `400`, and client creation resolves the configured group name. Exact temporary test records were removed afterward.

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
