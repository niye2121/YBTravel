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
  display_name TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing deployments created conversations before friendly WhatsApp
-- names were stored. Keep startup migrations idempotent while adding the
-- column to those databases too.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS display_name TEXT;

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

-- Client accounts — P1-02/03/05/10 in docs/03-deliverables.md. "name" is
-- deliberately generic (not "family name") since many YB Travel clients are
-- businesses, not individuals. Reps reference real staff accounts so client
-- creation picks from the actual user list rather than a free-text name.
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  preferred_rep_id INTEGER REFERENCES users(id),
  secondary_rep_id INTEGER REFERENCES users(id),
  fee_group TEXT NOT NULL DEFAULT 'standard'
    CHECK (fee_group IN ('standard', 'belev_echad', 'scheiman')),
  stage TEXT NOT NULL DEFAULT 'new_inquiry'
    CHECK (stage IN ('new_inquiry', 'welcome_sent', 'waiting_for_info',
                      'information_received', 'review_complete', 'fully_onboarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A traveller is a person, not something one client owns — P1-04. This is
-- what makes the many-to-many link below possible: a traveller exists
-- independently and can be linked to more than one client's account.
CREATE TABLE IF NOT EXISTS travellers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE,
  passport_status TEXT NOT NULL DEFAULT 'missing'
    CHECK (passport_status IN ('on_file', 'missing', 'expiring_soon')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The many-to-many link a traveller can be linked to more than one client's
-- account (e.g. flying under a parent's account and their own). relationship
-- is free text, not an enum — "employee" for a business client and "spouse"
-- for a personal one don't fit one vocabulary.
CREATE TABLE IF NOT EXISTS traveller_accounts (
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  traveller_id INTEGER NOT NULL REFERENCES travellers(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, traveller_id)
);
