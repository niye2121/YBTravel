# Deliverables — 105 items across Phases 1–8

Extracted from `source-deliverables.xlsx`. Phase 0 from the blueprint has **no rows in the workbook** and is tracked in `05-open-decisions.md`.

| Phase | Name | Items | Recommended priority |
|---|---|---|---|
| Phase 1 | Client Intake and Daily Work Management | 21 | Must Have |
| Phase 2 | Flight Research, Quotes, Payment, and Booking | 20 | Must Have |
| Phase 3 | Sabre Connection and Ticketing | 11 | High |
| Phase 4 | Active Trip Support | 9 | High |
| Phase 5 | Changes, Cancellations, Exchanges, and Refunds | 11 | High |
| Phase 6 | Finance, Hotels, and Supporting Services | 11 | Medium |
| Phase 7 | Fare Optimization and Assisted Recommendations | 9 | Medium |
| Phase 8 | Client Self-Service and Management Visibility | 13 | Future |


## Phase 1 — Client Intake and Daily Work Management

*Dependency: Foundation for every later phase.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P1-01 | Continue receiving client requests through WhatsApp without changing the client’s current experience. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-02 | Find an existing client or create a new client record. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-03 | Choose the applicable booking-fee group (standard, Belev Echad, or Scheiman) and see the correct fee for each passenger. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-04 | Add the client’s family members, dependants, and other travellers once and reuse their information for future trips. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-05 | Move each new client through clear onboarding stages: new inquiry, welcome sent, waiting for information, information received, review complete, and fully onboarded. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-06 | See the client’s current onboarding stage, the missing steps, and the next required action. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-07 | Prevent onboarding from being marked complete until the required client and traveller information has been reviewed. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-08 | See which required details are missing, such as legal names, dates of birth, airports, dates, cabin class, flexibility, or special requests. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-09 | Use approved, copy-ready WhatsApp messages for onboarding, missing-information questions, booking-fee explanations, and follow-ups. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-10 | Set a preferred representative and a secondary representative for each client. If neither is available, route the request to another available team member. | Must Have | Supervisor / Manager |
| P1-11 | Store important notes, documents, and communication history with the correct client and request. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-12 | Receive reminders for unanswered inquiries, missing information, and the next required action. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-13 | Create an Offshore Intake Employee role that can create and update clients and travellers, complete onboarding, enter WhatsApp requests, prepare copy-ready replies, and assign requests, without ticketing authority. | Must Have | Offshore Intake Employee; Travel Agent |
| P1-14 | Create a Travel Agent role that can manage assigned requests, research and prepare options, create reservation holds, communicate with clients, and prepare bookings for ticketing. | Must Have | Travel Agent |
| P1-15 | Create a Supervisor / Manager role that can monitor workloads, reassign requests, approve exceptions and markups, review reports, and approve permitted sensitive actions. | Must Have | Supervisor / Manager |
| P1-16 | Create a Ticketing Agent role that can verify passenger, booking, and payment details and perform authorized ticket issuance, reissue, void, exchange, or refund actions. | Must Have | Ticketing Agent |
| P1-17 | Create a Finance User role that can manage invoices, payments, credits, refunds, and reconciliation without changing ticket operations unless separately authorized. | Must Have | Finance User |
| P1-18 | Create a System Administrator role that can create users, assign roles and permissions, manage settings and integrations, and review access history without automatically receiving finance or ticketing authority. | Must Have | System Administrator |
| P1-19 | Allow each staff member to see and perform only the actions permitted by their assigned role or roles. | Must Have | System Administrator |
| P1-20 | Allow one employee to hold more than one role when required, while assigning high-risk permissions explicitly. | Must Have | System Administrator |
| P1-21 | See all open client requests and their current status in one place. | Must Have | Offshore Intake Employee; Travel Agent |

## Phase 2 — Flight Research, Quotes, Payment, and Booking

*Dependency: Requires the client, traveller, ownership, and permission foundation from Phase 1.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P2-01 | Create a travel request for one or more saved travellers. | Must Have | Travel Agent |
| P2-02 | Record the departure airport, destination, travel dates, cabin class, date flexibility, airline preferences, and special requests. | Must Have | Travel Agent |
| P2-03 | Use the WhatsApp-to-Chat assistant after the core Phase 1 workflow is stable. | High | Travel Agent |
| P2-04 | Paste a client’s WhatsApp message into the assistant. | Must Have | Travel Agent |
| P2-05 | Ask the assistant to create a draft client, traveller, and travel request from the message. | Must Have | Travel Agent |
| P2-06 | Review and correct the draft before saving it. | Must Have | Travel Agent |
| P2-07 | Review Google Flights manually during initial market research; live availability will be retrieved through Sabre after the Phase 3 connection is available. | Must Have | Travel Agent |
| P2-08 | Record and clearly identify the price that was verified in Sabre before it is quoted to the client. | Must Have | Travel Agent |
| P2-09 | Apply the correct Israel and EL AL rules when the trip includes travel to or from Israel. | Must Have | Travel Agent |
| P2-10 | Create a reservation hold when available and record its ticketing deadline. | Must Have | Travel Agent; Ticketing Agent |
| P2-11 | Receive reminders before a held reservation expires. | Must Have | Travel Agent |
| P2-12 | Prepare a clear flight proposal with itinerary, total price, booking fee, restrictions, and expiration time. | Must Have | Travel Agent |
| P2-13 | Create the client-ready proposal directly in the new system and record when it was sent. | Must Have | Travel Agent |
| P2-14 | Record whether the client accepted, declined, asked for changes, or did not respond. | Must Have | Travel Agent |
| P2-15 | Receive a follow-up reminder when a held booking has not received a response. | Must Have | Travel Agent |
| P2-16 | Mark the booking as ready for invoicing after the client decides to proceed. | Must Have | Travel Agent; Finance User |
| P2-17 | Record payment confirmation and the payment reference number. | Must Have | Travel Agent; Finance User |
| P2-18 | Prevent a booking from being sent for ticket issuance unless payment, approved payment authorization, or an approved credit arrangement is confirmed. | Must Have | Travel Agent; Finance User |
| P2-19 | Track the booking through clear stages: accepted, payment pending, paid, ready to issue, sent to ticketing, ticket issued, and confirmation sent. | Must Have | Travel Agent; Finance User |
| P2-20 | Send a copy-ready ticket confirmation through WhatsApp after issuance is complete. | Must Have | Travel Agent |

## Phase 3 — Sabre Connection and Ticketing

*Dependency: Requires a stable Phase 2 booking workflow plus approved Sabre API products, credentials, permissions, and test access.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P3-01 | Search live flight availability from the new system through approved Sabre connections. | High | Travel Agent; System Administrator |
| P3-02 | Retrieve comparable flight options with one action instead of repeating the same search manually. | High | Travel Agent; Ticketing Agent |
| P3-03 | Compare options from the relevant Sabre accounts or PCCs when more than one account may be suitable. | High | Travel Agent; Ticketing Agent |
| P3-04 | See the client price, fare conditions, available commission, and important restrictions before choosing an option. | High | Travel Agent; Ticketing Agent |
| P3-05 | Create a new PNR or retrieve an existing PNR from the system. | High | Travel Agent; Ticketing Agent |
| P3-06 | See reservation holds, ticketing deadlines, passenger details, and flight segments in one place. | High | Ticketing Agent; Supervisor / Manager |
| P3-07 | Prepare a booking for ticket issuance using a guided checklist. | Must Have | Ticketing Agent; Supervisor / Manager |
| P3-08 | Check whether separate domestic and international tickets may require conjunctive-ticket review and documentation. | High | Ticketing Agent; Supervisor / Manager |
| P3-09 | Allow only authorized staff to approve and perform ticket issuance, voids, or other sensitive ticket actions. | Must Have | Ticketing Agent; Supervisor / Manager |
| P3-10 | Store ticket numbers, issue details, traveller relationships, and ticket history automatically with the booking. | High | Ticketing Agent; Supervisor / Manager |
| P3-11 | See failed Sabre actions or queue items that require staff attention. | High | Travel Agent; System Administrator |

## Phase 4 — Active Trip Support

*Dependency: Requires reliable booking, segment, and ticket information; automation improves after the Phase 3 Sabre connection.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P4-01 | See all clients who are travelling soon and the actions required for each trip. | High | Travel Agent; Supervisor / Manager |
| P4-02 | Receive alerts for schedule changes, cancellations, ticketing issues, and other urgent events. | High | Travel Agent; Supervisor / Manager |
| P4-03 | Prepare copy-ready WhatsApp messages for check-in, schedule changes, and travel reminders. | High | Travel Agent; Supervisor / Manager |
| P4-04 | Track whether the client has confirmed check-in instead of assuming it is complete. | High | Travel Agent; Supervisor / Manager |
| P4-05 | Receive follow-up and escalation reminders when check-in has not been confirmed. | High | Travel Agent; Supervisor / Manager |
| P4-06 | Record boarding-pass status, seat status, baggage questions, and special-service requests. | High | Travel Agent; Supervisor / Manager |
| P4-07 | Open and assign a support case when a client needs help before or during travel. | High | Travel Agent; Supervisor / Manager |
| P4-08 | Record airline contacts, actions taken, and the final result of each support case. | High | Travel Agent; Supervisor / Manager |
| P4-09 | Receive a reminder to contact the client after arrival and record any delay, baggage, or service issue. | High | Travel Agent; Supervisor / Manager |

## Phase 5 — Changes, Cancellations, Exchanges, and Refunds

*Dependency: Requires booking and ticket history, authorization controls, payment confirmation, and ticketing capabilities from earlier phases.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P5-01 | Create a change, cancellation, exchange, or refund request from the original booking. | High | Ticketing Agent; Finance User; Supervisor / Manager |
| P5-02 | Select the affected travellers, tickets, and flight segments. | High | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P5-03 | Review whether a ticket is unused, partially used, refundable, or restricted. | High | Ticketing Agent; Finance User; Supervisor / Manager |
| P5-04 | Compare replacement flight options and calculate fare differences, taxes, penalties, and other amounts due. | High | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P5-05 | Prepare a clear client explanation showing the available options and costs. | High | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P5-06 | Record the client’s approval before a sensitive action is performed. | High | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P5-07 | Collect and confirm any additional payment before reissuing a ticket. | High | Ticketing Agent; Finance User; Supervisor / Manager |
| P5-08 | Allow only authorized staff to reissue, void, cancel, or refund a ticket. | High | Ticketing Agent; Finance User; Supervisor / Manager |
| P5-09 | Keep the original and replacement tickets connected so the complete history is easy to follow. | High | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P5-10 | Track client refunds, airline refunds, credit memos, residual value, vouchers, EMDs, waivers, and related accounting references. | High | Ticketing Agent; Finance User; Supervisor / Manager |
| P5-11 | Prevent duplicate refunds and show cases that still need reconciliation. | High | Ticketing Agent; Finance User; Supervisor / Manager |

## Phase 6 — Finance, Hotels, and Supporting Services

*Dependency: Requires confirmation of QuickBooks Online versus Desktop, supported integration options, hotel processes, and financial approval rules.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P6-01 | Keep booking, invoice, payment, ticket, refund, and credit information connected. | Medium | Finance User; Supervisor / Manager |
| P6-02 | See unpaid amounts, missing payment references, and operational records that do not match the accounting records. | Medium | Finance User; Supervisor / Manager |
| P6-03 | Confirm whether YB Travel uses QuickBooks Online or QuickBooks Desktop and validate the available integration method. | Medium | Finance User; Supervisor / Manager |
| P6-04 | Create or update approved QuickBooks transactions through a controlled review process after the integration method is confirmed. | Medium | Finance User; Supervisor / Manager |
| P6-05 | Track UATP value, usage, and remaining balances when it applies to a booking. | Medium | Finance User; Supervisor / Manager |
| P6-06 | Create a hotel request with destination, dates, guests, room needs, budget, and preferences. | Medium | Travel Agent; Finance User |
| P6-07 | Record hotel options, cancellation rules, supplier details, confirmation numbers, payment status, and commission. | Medium | Travel Agent; Finance User |
| P6-08 | Connect flights and hotels to the same client trip. | Medium | Travel Agent; Finance User |
| P6-09 | Keep hotel, insurance, and financial details together with the client’s trip. | Medium | Travel Agent; Finance User |
| P6-10 | Record whether travel-insurance information was presented, selected, declined, or left pending. | Medium | Travel Agent; Finance User |
| P6-11 | See the operational and financial status of a trip without searching through several separate systems. | Medium | Finance User; Supervisor / Manager |

## Phase 7 — Fare Optimization and Assisted Recommendations

*Dependency: Requires Sabre and ticket data, account rules, fare rules, and approval controls established in earlier phases.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P7-01 | Identify eligible EL AL premium or business bookings that may benefit from lower-fare monitoring. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-02 | Keep the client’s original confirmed booking protected while a separate lower-fare waitlist is monitored. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-03 | Create and link a separate waitlist PNR without confusing it with the confirmed booking. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-04 | Receive an alert when a lower booking class clears or another savings opportunity appears. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-05 | Compare the potential savings, fare rules, refund impact, and operational risk before making a change. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-06 | Receive a recommendation showing which Sabre account, fare, or itinerary may provide the best balance of client price and agency value. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-07 | See a simple explanation of why the system recommends an option. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-08 | Approve, reject, or override a recommendation before any ticket or booking is changed. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |
| P7-09 | Keep a record of the final decision and the reason for any override. | Medium | Travel Agent; Ticketing Agent; Supervisor / Manager |

## Phase 8 — Client Self-Service and Management Visibility

*Dependency: Requires stable internal workflows, security, permissions, and reliable data from the earlier phases.*

| ID | Deliverable | Priority | Primary role(s) |
|---|---|---|---|
| P8-01 | Allow clients to submit a travel request through a secure online form or portal. | Future | Client; Travel Agent |
| P8-02 | Allow clients to maintain their traveller and family information for future trips. | Future | Client; Travel Agent |
| P8-03 | Allow clients to upload required documents securely. | Future | Client; Travel Agent |
| P8-04 | Allow clients to review proposed itineraries and accept, decline, or request changes. | Future | Client; Travel Agent |
| P8-05 | Allow clients to pay approved invoices or balances online. | Future | Client; Travel Agent |
| P8-06 | Allow clients to view current itineraries, tickets, trip documents, and important updates. | Future | Client; Travel Agent |
| P8-07 | Allow clients to confirm check-in or request help from their assigned agent. | Future | Client; Travel Agent |
| P8-08 | Allow managers to see inquiry-to-booking conversion and the main reasons clients decline. | Future | Supervisor / Manager |
| P8-09 | Allow managers to see booking-fee revenue, sales, commissions, markups, and estimated profitability. | Future | Supervisor / Manager |
| P8-10 | Allow managers to see ticketing deadlines, active-trip risks, unresolved refunds, and queue exceptions. | Future | Supervisor / Manager |
| P8-11 | Allow managers to review agent workload, open requests, follow-up performance, and urgent client cases. | Future | Supervisor / Manager |
| P8-12 | Allow managers to review how often system recommendations were accepted or overridden. | Future | Supervisor / Manager |
| P8-13 | Allow managers to use reports to decide which services, client groups, airlines, and processes need attention. | Future | Supervisor / Manager |
