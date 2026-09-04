# Phase 1 onboarding and missing-information tests

Status: ready for local testing on 2026-09-03. These changes have not been deployed to production.

## Before testing

1. Run the API and web application locally.
2. Sign in as a System Administrator, Offshore Intake Employee, or Travel Agent.
3. Use a new test client and test traveller where possible so existing operational records are not changed.

## Test 1 — New client starts at the first milestone

1. Open **Clients** and choose **+ New Client**.
2. Create a client with a unique test phone number and an active fee group.
3. Open the new client profile.

Expected:

- The stage is **New inquiry**.
- **Onboarding Progress** is visible.
- It says to add at least one traveller.
- Stage history contains an initial **Started at New inquiry** entry.

## Test 2 — Required traveller information and staff review

1. From the test client, choose **+ Add Traveller**.
2. Create a traveller with legal name and date of birth.
3. Return to **Onboarding Progress**.

Expected:

- Legal name and date of birth are present but show **review required**.
- The client is not ready to complete.

Then select **Confirm reviewed** for both fields.

Expected:

- Both items turn complete and show who reviewed them.
- The client shows **Ready to complete** if no other required client/traveller rules are active.

## Test 3 — Review becomes stale when a value changes

1. Open the linked traveller.
2. Change the date of birth or legal name and save.
3. Return to the client profile.

Expected:

- The changed field says **review required** again.
- The old review no longer satisfies onboarding.
- Confirming the field again restores its reviewed state.

## Test 4 — Controlled stage progression

1. On the test client, choose **Edit Client**.
2. Open the **Onboarding stage** list.

Expected:

- At **New inquiry**, only **New inquiry** and **Welcome sent** are available.
- A user cannot skip directly to a later stage.

Save **Welcome sent**, reopen Edit Client, and continue one stage at a time.

Expected:

- Each saved move appears in **Stage history** with the user and time.
- Earlier stages remain available for a backward move.
- Saving a backward move without a reason is rejected.
- Saving it with a reason succeeds and the reason appears in history.

## Test 5 — Completion is blocked until review is complete

1. Leave at least one required traveller item missing or awaiting review.
2. Move forward one milestone at a time until **Review complete**.
3. Try to move to **Fully onboarded**.

Expected:

- The API rejects completion and identifies the missing or unreviewed item.

Complete and review every required item, then try again.

Expected:

- The move to **Fully onboarded** succeeds.
- The final transition appears in history.

## Test 6 — Configured milestone task

1. As an administrator, open **Setup → Onboarding**.
2. Configure a non-current stage to generate a task, select its role/priority, and set an expected duration.
3. Move the test client into that stage from the immediately preceding stage.

Expected:

- An open task appears in **Milestone tasks** with the configured priority and due time.
- **Mark complete** changes it to completed and removes it from the open list.

## Test 7 — Request information checklist

1. Open a real database-backed request such as an `R-` request from **Requests**.
2. Choose **Edit information**.
3. Enter an origin, destination, and departure date/window. Optional fields may also be entered.
4. Save.

Expected:

- Saved values remain visible after refresh.
- **Airports** and **Travel dates** show **review required**.
- Empty optional fields say **Optional · not provided** and do not count as blockers.

Choose **Confirm reviewed** for Airports and Travel dates.

Expected:

- The checklist becomes **Complete**.
- Editing a reviewed airport or travel-date value makes that field require review again.

## Test 8 — Role access

Repeat a review and stage update while signed in as each Phase 1 operational role available locally.

Expected:

- System Administrator, Offshore Intake Employee, and Travel Agent can use these controls.
- An unauthenticated request is redirected to login or rejected with HTTP 401.

## Report a failure

Record the test number, client/request number, exact action, expected result, actual result, and a screenshot. Do not include passwords, WhatsApp QR codes, passport numbers, or payment information.

## Test 9 — Per-passenger booking fee

1. Create or open a non-demo client with an active booking-fee group and at least two linked travellers.
2. Open a database-backed request belonging to that client.
3. In **Booking fee by passenger**, select the travellers and choose Adult, Child, or Infant for each.
4. Select **Save fee calculation**.

Expected:

- The amount uses the fee group assigned to the client.
- Per-passenger rules charge only enabled passenger categories.
- Per-booking rules charge once, regardless of traveller count.
- The displayed total and charged-unit count are correct.
- Refreshing retains the selected passengers, categories, dated calculation, and total.
- Changing the fee-group configuration later does not rewrite the earlier saved snapshot; saving again creates a new current calculation.

## Test 10 — Approved WhatsApp template

1. Open a linked conversation in **Inbox**.
2. Select **Welcome (English)** from **Approved WhatsApp template** and choose **Use template**.

Expected:

- The client name is substituted from the linked record.
- The text appears in the reply box but is not sent automatically.
- You can edit it before sending.

Repeat with **Booking fee** or **Missing information**.

Expected:

- Existing request, fee, and missing-information values are substituted when available.
- Missing context produces a visible warning and leaves the unresolved placeholder in the draft.
- The Send button remains a separate explicit action.

## Test 11 — Client and request notes

1. Open a non-demo client and add an internal note under **Notes, Documents & History**.
2. Refresh the page.
3. Open a request, add a different request note, and refresh.

Expected:

- Each note remains attached to the correct record.
- The client-only note does not appear in the request’s note list.
- The request note appears in its unified history with author and time.

## Test 12 — Secure documents and unified history

1. Upload a small PDF, JPEG, or PNG to a test client or request with an optional description.
2. Refresh, then choose the stored filename to download it.

Expected:

- The file, description, size, uploader, and time remain visible.
- The downloaded file opens correctly.
- Unsupported files, false file extensions, empty files, and files above 10 MB are rejected.
- The unified history combines notes, documents, and linked WhatsApp messages/voice notes in newest-first order.
- The download is recorded in sensitive-access history; raw file contents do not appear in audit metadata.
