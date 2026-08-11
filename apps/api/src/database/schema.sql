-- WhatsApp inbox — see docs/05-open-decisions.md #9 for the risk-acceptance
-- decision this depends on. No ORM yet (Drizzle vs Prisma is still open),
-- so this is applied directly via `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'qr_pending' CHECK (status IN ('qr_pending', 'connected', 'disconnected')),
  phone_number TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  whatsapp_jid TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  sender_jid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON messages (conversation_id, created_at);

-- Staff accounts — P1-13..P1-20 in docs/03-deliverables.md. roles is an
-- array, not a single value, because P1-20 explicitly allows one person to
-- hold more than one role. Valid role strings are enforced at the app
-- boundary (packages/shared's staffRoleSchema), not with a DB CHECK, since
-- checking every array element in SQL is more trouble than it's worth here.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  roles TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
