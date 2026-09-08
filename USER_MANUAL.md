# YB Travel User Manual

## Reminders and daily follow-up

Open **Reminders** from the main navigation or select **Open reminder queue** from the notification bell. The queue is generated automatically from request response deadlines, service deadlines, requests waiting for missing information, and open onboarding tasks.

- **Upcoming** reminders are more than 30 minutes from their deadline.
- **Due soon** reminders are within 30 minutes of the deadline.
- **Overdue** reminders have passed their deadline.
- **Escalated** reminders are four hours overdue.
- **Acknowledged** means a staff member accepted responsibility for the alert.
- **Resolved** means the underlying work was completed, such as sending the request's first reply or completing its source task.

Use **My reminders** for your assigned work. Employees with **Assign requests to staff** can switch to **Team reminders** and reassign an active reminder. Select a reminder row to open its request or client. Select **Acknowledge** when you have seen and accepted the follow-up; this action is audited.

The processor runs once per minute. Notification delivery is retry-safe: an interrupted attempt is recovered automatically, and the same reminder state cannot create duplicate bell notifications.

## Booking context in WhatsApp Inbox

The AI Draft Intake panel now decides whether a customer's latest information belongs to an open booking or appears to start a separate booking. In Phase 1, the booking choices correspond to the client's open travel requests. One choice can represent one passenger or a family or group with several tickets.

### How the system interprets a message

- It reads the latest customer message together with the recent conversation. This allows an answer such as `January is fine` to be understood from the employee's preceding question.
- It compares the answer with the client's open bookings using the trip summary, origin, destination, dates, and conversation context.
- It interprets a date without a year as the closest logical future date. In late 2026, `January` means `January 2027`.
- It never accepts a weak booking match silently. When confidence is insufficient, an employee must choose.

### Review an AI draft

1. Open **WhatsApp → Inbox**.
2. Select the customer conversation.
3. Open **AI Draft Intake** on the right.
4. Review **Which booking does this information relate to?**
5. Follow the applicable result:
   - For a confident match, confirm the suggested open booking and select **Apply to booking**.
   - When the system says the message looks like a new booking, confirm **Create a separate booking** and select **Create separate booking**.
   - When the system is unsure, select the correct open booking from the dropdown. If none applies, select **Create a separate booking**.
6. Review and edit the remaining extracted information before applying or creating it. The action saves those edits first.

If the latest message was attached to the wrong booking, select **Regenerate draft from latest message**. The system re-reads the latest customer message and keeps a follow-up answer on the most recently active open booking. Regeneration does not delete an accidentally created duplicate booking; that record must be handled separately by an authorized employee.

Applying information to an existing booking changes only the fields supplied by the reviewed draft. It does not erase other known booking details.

### Which bookings appear in the dropdown

- Only bookings belonging to the linked client appear.
- Completed and cancelled requests do not appear.
- Travel with a known return date closes after the return date.
- One-way travel closes after the departure date.
- A month-only date remains open through the last day of that month.
- Closed bookings remain in history but are not offered for new conversational information.

### Local acceptance test

Use test conversations and do not send test messages to a real client.

1. Start the local database, API, and web application. Sign in and confirm the OpenAI connection under **Setup → AI Provider**.
2. Link a test WhatsApp conversation to a test client.
3. Ensure the test client has an open London booking. From the Inbox, ask: `Which month works for the London booking?`
4. Reply from the test customer's WhatsApp account: `January is fine.`
5. Open AI Draft Intake. Confirm the London booking is suggested and the departure field includes the nearest future January year. In 2026, it should show `January 2027`.
6. Select **Apply to booking**. Open the linked request and confirm its existing origin and other known information remain present while the January information is added.
7. Give the same client two similar open bookings. Send a deliberately vague answer that could fit either one. Confirm the panel says it cannot identify one booking and requires a dropdown choice.
8. Send: `I also need a flight to Dubai in March.` Confirm the panel warns that this looks like a new booking and offers **Create a separate booking**.
9. Do not select the new-booking option yet. Confirm the create action remains unavailable. Then select it and confirm the action becomes available.
10. Use a test request with a completed or cancelled status, or a resolved travel end date in the past. Reopen the conversation and confirm that request no longer appears in the booking dropdown.
11. Confirm that no message, booking update, or new booking is created until an employee selects the final action.

## Supervisor and manager work

Supervisor review is always after the action. An agent is never stopped while waiting for a supervisor decision.

Open **More → Agents & Supervisor** to use the three supervisor queues:

- **Agent workload** shows each operational employee's open requests, due work, overdue work, escalations, capacity, and oldest untouched request. Select an employee to see their assigned requests and use the staff dropdown to reassign one.
- **Supervisor review** shows completed overrides, markup changes, waivers, and operational exceptions. Select **Review**, choose the outcome, enter a comment, and save. A completed review cannot be silently replaced.
- **Workload report** shows the live Phase 1 workload table and can be printed.

If an assignment differs from the system's recommendation, it enters the supervisor review queue automatically. Other completed exceptions can be recorded through the supervisor review service as the related Phase 2 workflows are introduced.

## Administrator audit history

Open **Setup → Audit History**. Only employees with **View sensitive access and audit history** can open this screen or call its API.

- Use **Search** to find an action, record identifier, employee name, or employee email.
- Filter by the employee who performed the activity, an exact action, or a Brooklyn desk date range.
- Select **Important and protected-access activity only** to focus on access to protected information, user/security changes, destructive activity, configuration changes, and operational overrides.
- Select **View changes** to compare the stored before and after values field by field. Created records show an empty before value; protected-access events show which fields were accessed and the recorded purpose.
- Use **Previous** and **Next** to move through older results. The newest events appear first.

Passwords, provider keys, tokens, passport numbers, and similar secret-bearing fields are replaced with **[REDACTED]** by the server. The browser never receives those stored values. An **Important** label identifies activity that deserves attention; it does not claim that an employee acted improperly.

## Roles and individual permissions

YB Travel uses four assignable Phase 1 roles:

- **Offshore Intake Employee** — client intake, onboarding, WhatsApp replies, and request preparation.
- **Travel Agent** — assigned requests, client communication, fee work, records, and WhatsApp group creation.
- **Supervisor / Manager** — operational work plus team workload, request reassignment, retrospective exception review, and Phase 1 management reporting.
- **System Administrator** — user access, configuration, integrations, audit access, and controlled test-data deletion.

Roles are templates, not permanent restrictions. An administrator can customize one employee without creating another role.

### Create an employee

1. Open **Setup → Users & Roles**.
2. Select **+ New User**.
3. Enter the employee identity, WhatsApp number, and temporary password.
4. Select one or more of the four roles. The permission checkboxes automatically load the combined defaults for those roles.
5. Review **Individual Permissions**. Check or uncheck any implemented permission required for this employee.
6. Review availability, capacity, working hours, and qualified request types.
7. Select **Create Employee**.

The API saves only differences from the selected role defaults, but the employee record always shows the complete effective permission list.

### Change an employee's access

1. Open **Setup → Users & Roles**.
2. Open the employee from the Employees table.
3. Select **Edit employee**.
4. Change roles if necessary. Changing a role resets the matrix to the combined defaults, so review all permissions again.
5. Check or uncheck individual permissions.
6. Select **Save employee**.

The change applies to the employee's next API action, including when they are already signed in. They do not need a new token because the server loads their current permissions from the database for every request.

### Permission behavior

- A checked implemented permission allows the matching action.
- An unchecked permission is rejected by the API even if someone manually calls the endpoint.
- The main navigation, Setup menu, notification bell, and page actions show only the live areas and controls the employee can use.
- Opening a protected Clients, Travellers, Requests, Reminders, Reports, Setup, Audit, or WhatsApp URL directly does not bypass the permission check; the employee is returned to their permission-aware home.
- Read access never implies edit access. For example, an employee with only **View clients** can open client profiles but does not see **New Client**, **Edit Client**, onboarding review actions, or traveller-linking controls.
- Employees without **View requests** receive a neutral home page instead of request workload, deadline, and travel-watch information.
- Creating an unlinked traveller requires **Create travellers**. Linking that traveller to a client—during creation or later—also requires **Link travellers to clients**.
- Sensitive permissions are labeled **Sensitive** and must be selected deliberately.
- Supervisor workload and retrospective-review permissions are available. Later-phase ticketing and finance permissions remain visible but disabled.
- An administrator cannot remove their own `Manage users and permissions` access or deactivate their own account. This prevents accidental lockout.
- Existing historical Finance User and Ticketing Agent records remain readable. New employees use the approved four-role Phase 1 model.

### Travel Agent request ownership

- A Travel Agent may view the live Requests queue and open an unassigned request.
- **Assign to me** claims an unassigned request. It cannot take a request already owned by another employee.
- After assignment, the Travel Agent may update travel information, review missing information, calculate fees, communicate with the client, and use that request's notes, documents, and history.
- Another employee's assigned request is read-only. The API rejects direct attempts to edit it or access its request-specific records.
- An employee with **Assign requests to staff** may work across the queue and reassign work. This is a sensitive individual permission, not a separate fourth role.
- The Travel Agent template also includes the Phase 1 capabilities for creating/updating clients, creating/linking travellers, and completing onboarding. An administrator can revoke any of these for an individual employee.

### Local acceptance test

1. Open [http://127.0.0.1:5173/users](http://127.0.0.1:5173/users) and sign in as a user with **Manage users and permissions**.
2. Create a test employee with the Travel Agent role.
3. Confirm the Travel Agent default permission checkboxes appear.
4. Uncheck **View clients**, save the employee, and sign in as that employee in a separate private browser window.
5. Confirm Clients is unavailable and a direct API request is rejected.
6. Re-enable **View clients** from the administrator account.
7. Refresh the employee window and confirm access now works.
8. Verify later-phase ticketing and finance checkboxes are visible but disabled.
9. Assign one request to the test Travel Agent and another request to somebody else.
10. Confirm the first request allows editing and record access, while the second is visibly read-only and rejects direct write/API attempts.

Do not repeat this test on production until the local permission matrix has been approved for deployment.
