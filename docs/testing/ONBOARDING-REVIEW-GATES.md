# Onboarding review validation

Both entry into `review_complete` and entry into the configured completion stage
(normally `fully_onboarded`) validate the current client/traveller checklist.
This is enforced by the API, not just by the dropdown.

- At least one traveller must be linked.
- Configured required fields must be present.
- Fields requiring review must have a review matching their current value.
- Newly linked travellers are checked as well.
- A client profile edit submitted with a stage change is checked using the new
  values. A rejection rolls back the profile edit and writes no transition.
- Errors name the missing/unreviewed details; the edit form also shows blockers
  for the selected stage. Ordinary early-stage saves and backward-move rules
  remain unchanged.

This change does not make passports mandatory and does not move existing clients
backward automatically. Passport fields block the gate if an administrator
configures them as active required information. A client already at Review
complete is checked again when advancing to Fully onboarded.

## Manual test

Use a test client, not a real customer record:

1. Add a traveller with a missing DOB or an unreviewed legal name/DOB.
2. Progress to Information received, then try Review complete.
3. Expect an explanation of the missing/unreviewed fields; stage stays unchanged.
4. Supply the information and confirm the required reviews; retry successfully.
5. Change a reviewed DOB or link another unreviewed traveller.
6. Try Fully onboarded; expect rejection until those details are reviewed.

Automated regression: `npm run test:onboarding --workspace apps/api`.
The test uses temporary records and configuration in a rolled-back transaction,
including mandatory-passport coverage without changing the user's actual rules.
