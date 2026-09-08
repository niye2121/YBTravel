# Attachment preview and confirmed deletion

Client and request Notes, Documents & History share these actions:

- Click the filename or Review for an authenticated image/PDF preview.
- Download remains available separately and within the preview.
- Delete is visible with `records.write`. It opens a named confirmation;
  Cancel is initially focused. No delete request is sent until confirmation.
- Request document operations enforce assignment or assignment-manager access.
- Preview logs a sensitive-access `view`; downloads log `download`.
- Removal is soft deletion: list, preview and download exclude deleted files.
  Original bytes remain in the database for audit/recovery, with no restore UI.
  The confirmation discloses this. Deletion metadata is recorded transactionally
  in audit history and displayed in the record's unified history.
- Preview does not mark required onboarding information reviewed.

Validation: full workspace typecheck/build; `npm run test:attachments --workspace
apps/api` (temporary records, all rolled back). Covers preview access logging,
ownership and write permissions, audit rollback, repeated deletion, preserved
bytes, blocked access after deletion, independent scopes and deletion history.
Chrome check: existing JPEG loads; Delete opens confirmation; Cancel leaves it
unchanged. No user attachment was deleted during verification. PDF rendering
depends on browser support, with Download provided as a fallback.
