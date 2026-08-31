# YB Travel security operations

## Login protection and account deactivation

- Five failed attempts for the same normalized email and source IP within 15 minutes lock that key for 15 minutes by default.
- The counters are stored as keyed hashes in PostgreSQL, so API restarts and multiple API instances do not reset protection.
- Deactivating an employee immediately blocks new logins and invalidates existing JWTs on their next authenticated request. Reassignment of owned work should be completed before deactivation.
- Administrators cannot deactivate their own account through the employee editor.

## Secret rotation

Never place production secret values in tickets, chat, source control, or deployment logs.

### JWT signing secret

1. Generate a new high-entropy value of at least 32 characters.
2. Set it as `JWT_SECRET` and place the old value in `JWT_SECRET_PREVIOUS`.
3. Restart all API instances together. New tokens use the new key; existing tokens remain valid during the grace period.
4. After the seven-day maximum token lifetime, remove the old value and restart again.
5. For emergency compromise, omit the grace key so all existing sessions are invalidated immediately.

### AI credential encryption key

1. Generate a new key with `openssl rand -base64 32`.
2. Set the new value as `AI_SECRETS_ENCRYPTION_KEY` and place the old value in `AI_SECRETS_ENCRYPTION_KEY_PREVIOUS`.
3. Restart the API and call `POST /ai-provider-settings/rotate-secret` as a System Administrator.
4. Confirm the audited rotation event and a successful provider connection test.
5. Remove `AI_SECRETS_ENCRYPTION_KEY_PREVIOUS` and restart.

### Database and WhatsApp secrets

- Rotate the PostgreSQL password in the managed database first, update the deployment secret, restart the API, and verify `/health` plus authenticated reads.
- Re-pair WhatsApp only when credentials are revoked or compromised. Preserve the invalid session backup for incident investigation, store it with restricted permissions, and destroy it under the retention policy.

## Message reliability

- Every inbound provider message ID is unique in the database. Provider replay is acknowledged but does not create another message or AI intake.
- Outbound messages are recorded before sending. Each attempt records start, success/failure, provider message ID, error, and completion time.
- Known failures retry up to three times with short backoff. Ambiguous network failures are marked `delivery_unknown` and are not automatically retried because the provider may already have delivered them.
- Administrators can inspect `GET /messaging/delivery-failures`. A human must reconcile `delivery_unknown` with WhatsApp before sending again.

## Sensitive traveller data

- Traveller lists return passport status only; passport number, issuing country, and expiry are disclosed only through the authenticated detail endpoint.
- Every passport-detail view and creation is recorded in `sensitive_access_events` with actor, timestamp, fields, purpose, a keyed IP hash, and a bounded user-agent value. Secret values are never copied into the audit row.
- System Administrators can review `GET /travellers/:id/sensitive-access-history`.

## Encrypted backups

Generate separate 32-byte `BACKUP_ENCRYPTION_KEY` material and store it in the managed secret service. Losing this key makes backups unrecoverable.

The installed `pg_dump`/`pg_restore` major version must match the database server. For this repository's Docker Compose environment, set `POSTGRES_TOOL_DOCKER_SERVICE=postgres` so the scripts use the PostgreSQL 17 tools inside the database container. In other environments, install matching tools or set `PG_DUMP_BIN` and `PG_RESTORE_BIN` to their approved absolute paths.

```bash
npm run db:backup --workspace apps/api -- --output /secure/yb-travel-backups
npm run db:verify-backup --workspace apps/api -- --input /secure/yb-travel-backups/<file>.dump.enc
```

Restore only into a confirmed target database:

```bash
npm run db:restore --workspace apps/api -- --input /secure/yb-travel-backups/<file>.dump.enc --confirm-restore
npm run db:migrate --workspace apps/api
npm run test:security --workspace apps/api
```

Operational policy:

- Daily encrypted backup, 35 daily restore points, plus 12 monthly restore points.
- Copy backups to a separate account/region with immutable retention.
- Verify every backup cryptographically and run a full isolated restore test at least monthly.
- Record backup time, file checksum, verification result, restore-test result, operator, and deletion date.
- Alert if the daily backup or verification is missing, empty, or older than 26 hours.

## Incident checklist

1. Deactivate affected accounts and rotate exposed secrets.
2. Preserve authentication, sensitive-access, message-delivery, and audit records.
3. Reconcile all `delivery_unknown` messages before retrying.
4. Restore only after verifying the encrypted backup and target database.
5. Run migrations, security regression tests, health checks, and a focused business workflow test before reopening access.
