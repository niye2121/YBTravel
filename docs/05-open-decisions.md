# Open decisions

Nothing here blocks starting the platform foundation. Each item blocks the integration or workflow it names.

## Needed from YB Travel

| # | Question | Blocks |
|---|---|---|
| 1 | Is Auth0 formally approved, and which plan covers the required MFA, environments, log retention and machine-to-machine tokens? | Contracting; auth implementation can proceed on the assumption |
| 2 | QuickBooks **Online or Desktop**? Determines the entire integration method — Online has a REST API, Desktop needs the Web Connector or a bridge. | Phase 6 scoping |
| 3 | Which Sabre API products are in the agreement? Are calls charged per transaction? How many PCCs? Does one integration reach all accounts? What does the test environment provide? | Phase 3 planning |
| 4 | Is YB Travel **ARC accredited directly**? If not, through which host agency, consolidator or issuing arrangement are US tickets reported and settled? | Finance deliverables; settlement reconciliation is absent from all 105 items |
| 5 | Which **Yaalago capabilities must be reproduced** before YB Travel can stop using it? The platform replaces Yaalago; this is not an integration question. | Phase 2 completion |
| 6 | When is the per-passenger booking fee collected — before research, after quote acceptance, or before issuance — and is it refundable if the client declines? | Phase 2 build |
| 7 | Who may approve an exception to the payment-before-issuance rule, and which clients have approved credit arrangements? | Phase 2 approval logic |
| 8 | Which Sabre operations must **always** require supervisor approval? | Authorization policy |
| 9 | ~~Is Baileys accepted as a time-boxed risk, on which number, with what migration path?~~ **Resolved 2026-08-10 — see "Resolved decisions" below.** | Messaging work |
| 10 | Which flight-data source for schedule changes, terminal, baggage and actual times — or start with Sabre queues? Commercial quotations required. | Phase 4 automation |
| 11 | Access to the SOPs for declined offers, hotel booking, and temporary return-segment procedures, which were unavailable during the blueprint review. | Phases 5–6 |
| 15 | WhatsApp group policy: which roles may create groups, the approved naming template, default staff participants, required greeting, and when a group should be closed or archived. The current safe launch default permits Travel Agents and System Administrators only. | Configurable WhatsApp Setup |

## Needed from engineering

| # | Decision | When |
|---|---|---|
| 12 | ORM: Drizzle or Prisma — write the ageing reconciliation report and the grouped deadline view in both first | End of technical prototype |
| 13 | ~~AI provider, behind the provider-neutral intake adapter~~ **Pilot resolved 2026-08-31 — OpenAI with GPT-5.6 Luna as the initial model; production acceptance still requires anonymized accuracy and privacy evaluation.** | Intake-adapter pilot may proceed |
| 14 | Routing: TanStack Router or React Router | Start of frontend work |

## Gaps in the source documents

**Phase 0 has no rows in the workbook.** The blueprint defines it as business validation, security and architecture — including moving credentials out of shared documents. Prerequisite work, currently untracked as deliverables.

**Settlement reconciliation appears nowhere** in the 105 items, though established back-office products treat it as core.

**Yaalago, Matmid and Kleer appear zero times** across the 105 items, despite Yaalago being the system to be replaced and Matmid and Kleer/RB being central to the Phase 7 EL AL workflow.

**Virtual card payments** for hotel and supplier settlement are not covered — relevant to Phase 6.

**No environment or release strategy is described.**

## Resolved decisions

**#13 — AI provider pilot (2026-08-31).** OpenAI was selected for the initial integration, with GPT-5.6 Luna as the cost-efficient default and a stronger model reserved as a possible fallback. The selection authorizes the secure provider configuration and anonymized evaluation work; it does not authorize sending unredacted production client data or bypassing human review. Production acceptance remains contingent on testing representative YB Travel messages for classification, extraction, multilingual quality, privacy, latency, and staff correction rate.

**#9 — Baileys risk acceptance (2026-08-10).** Accepted, with the safeguards in the risk note below applied: a **separate/test number** is paired, not the live business number, and incoming messages surface on a **dedicated Inbox screen** (`apps/web/src/routes/inbox.tsx`) rather than the manual-paste flow. Migration path to the official Cloud API remains the plan once the business number is ready to move — no date set. See `CHANGELOG.md` (2026-08-10) for what was built.

## Baileys risk note

Baileys is an unofficial WhatsApp Web library and is not an approved or supported WhatsApp Business Platform integration. Its use introduces account-continuity and policy-enforcement risk, including possible restrictions or number suspension.

The exposure is proportionate to the business dependency: YB Travel's client relationships run through its WhatsApp number, so a suspension interrupts contact with every client rather than degrading a feature.

If adopted, the safeguards are: a separate or replaceable number, no bulk or marketing automation, the provider-neutral `MessagingChannel` interface so substitution stays cheap, documented business acceptance by whoever owns the risk commercially, and a defined migration path to the official Cloud API.
