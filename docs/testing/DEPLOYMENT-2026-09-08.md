# Phase 1 deployment — 8 September 2026

Application commit: `d104a60` on `codex/booking-intelligence`, pushed to the origin repository.

Deployed the committed source to the existing shared preview server at `2.24.28.178`, directory `/srv/yb-travel`. Rebuilt and recreated only the YB Travel API and web services with `--no-deps`. Server environment files, PostgreSQL container/data and WhatsApp session volume were retained. Local screenshots, credentials and test data were not uploaded.

## Recovery points

- Verified PostgreSQL archive: `/srv/yb-travel/backups/pre-deploy-phase1-20260908.dump` (restricted permissions).
- Previous source archive: `/srv/yb-travel/backups/pre-deploy-phase1-20260908-source.tgz` (restricted permissions).
- Previous images: `yb-travel-api:pre-phase1-20260908` and `yb-travel-web:pre-phase1-20260908`.

## Verification

- All workspace type checks and builds passed.
- Design consistency, booking context, attachment actions and onboarding completeness regression checks passed locally.
- Server images built successfully; schema migration reported success.
- API health: `status: ok`, `db: connected`.
- Web HTTP 200; unauthenticated proxied audit endpoint HTTP 401.
- Existing PostgreSQL container remained healthy and was not recreated.
- Other projects were not modified. Two unrelated Odoo containers showed repeated restarts both before and after deployment; this pre-existing condition was reported.

## Follow-up

- Build dependency audit reported 21 findings: 4 low, 11 moderate and 6 high. No dependency upgrades were attempted as part of this rollout.
- This remains the existing HTTP preview endpoint, not an HTTPS production deployment.
- Rotate the server password supplied in chat.
- Staff should review the deployed workflows; smoke checks do not certify every business scenario.
