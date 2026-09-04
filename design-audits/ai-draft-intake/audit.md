# AI Draft Intake readability audit

## Scope

Current pending-review state in the WhatsApp Inbox at the operator's 75% browser zoom. The user goal is to understand what AI extracted, identify uncertainty, correct it, and safely create a request.

## Step 1 — Review the AI draft

Health: Needs improvement.

### Strengths

- The review boundary is explicit: the draft is pending and nothing is sent automatically.
- Request type, urgency, route, dates, passengers, missing information, and reply are all present.
- The destructive and primary actions are visually distinct.

### UX risks

- Every value is presented as an editable control, so important facts and uncertain values have the same visual weight.
- Long dates, missing-information items, and the suggested reply are clipped inside short controls, forcing the employee to read by clicking and scrolling.
- The most important problem—ambiguous travel dates—is buried among ordinary fields instead of being highlighted as a confirmation task.
- The panel is a long, dense form with no meaningful sections, making it difficult to scan from “what the client wants” to “what I must confirm.”
- Four footer actions compete equally. “Save edits” and “Create request” are not clearly staged as review first, approval second.
- Client context begins immediately below the action area and adds another information hierarchy to the already dense review form.

### Accessibility risks visible from the screenshot

- Several labels and helper lines are very small at 75% zoom.
- Truncated values reduce readability for low-vision users and make keyboard review slower.
- Confidence is conveyed as small text, while uncertainty in dates has no equally visible status treatment.
- Screenshot evidence cannot confirm keyboard order, focus visibility, screen-reader labels, error announcements, or contrast ratios.

## Recommended direction — Scan first, edit second

1. Show a read-only “AI understood” overview first: request type, route, passengers, and concise trip summary.
2. Add a prominent “Needs confirmation” card for ambiguous dates and other missing essentials, with each issue as a readable checklist item.
3. Group details into three cards: Trip, Missing information, and Suggested reply.
4. Keep content wrapped and fully visible; avoid short textareas as display containers.
5. Use an Edit details action to reveal inputs only when an employee needs to correct a field.
6. Use a sticky action footer with Reject, Save changes, and Create request; disable Create request while required confirmation items remain unresolved.
7. Collapse client context into a small linked-client card below the review content or a separate Context tab.

## Suggested panel structure

- Pending review + confidence
- AI understood
  - New flight booking · Normal
  - JFK → Tel Aviv · 2 passengers
  - Summary
- Needs confirmation
  - Travel year
  - Exact/flexible departure date
  - Return date after Sukkot
- Trip details
- Suggested reply (fully readable)
- Sticky actions

This keeps the existing YB Travel visual language while replacing the flat form with a clear review sequence.
