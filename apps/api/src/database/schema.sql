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

-- Shared audit foundation for meaningful mutations. Domain modules write
-- actor, action, and before/after JSON here in the same transaction as the
-- mutation so a successful change cannot exist without its history.
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON audit_events (entity_type, entity_id, created_at DESC);

-- Configurable booking-fee groups. Money stays NUMERIC and is returned by
-- pg as a string so authoritative fee amounts never pass through binary
-- floating point. Passenger-category toggles apply only to per-passenger
-- rules; a per-booking rule charges the amount once for the request.
CREATE TABLE IF NOT EXISTS booking_fee_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  calculation_basis TEXT NOT NULL
    CHECK (calculation_basis IN ('per_passenger', 'per_booking')),
  charge_adults BOOLEAN NOT NULL DEFAULT true,
  charge_children BOOLEAN NOT NULL DEFAULT true,
  charge_infants BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_fee_groups_lower_name_uq
  ON booking_fee_groups (lower(name));

-- Editable Phase 1 onboarding workflow. Codes are stable identifiers used by
-- client records; administrators edit labels, order, completion gates, and
-- optional milestone-task defaults without changing application code.
CREATE TABLE IF NOT EXISTS onboarding_stages (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  completion_stage BOOLEAN NOT NULL DEFAULT false,
  blocks_completion_until_reviewed BOOLEAN NOT NULL DEFAULT false,
  generates_task BOOLEAN NOT NULL DEFAULT false,
  responsible_role TEXT,
  task_priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (task_priority IN ('low', 'normal', 'high', 'urgent')),
  expected_duration_minutes INTEGER CHECK (expected_duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_stages_one_completion_uq
  ON onboarding_stages (completion_stage) WHERE completion_stage = true;

INSERT INTO onboarding_stages
  (code, name, description, position, completion_stage, blocks_completion_until_reviewed)
VALUES
  ('new_inquiry', 'New inquiry', 'A new client inquiry has been received.', 10, false, false),
  ('welcome_sent', 'Welcome sent', 'The approved welcome message has been sent.', 20, false, false),
  ('waiting_for_info', 'Waiting for information', 'Required client or traveller information is still missing.', 30, false, false),
  ('information_received', 'Information received', 'The requested information has been received and is ready for review.', 40, false, false),
  ('review_complete', 'Review complete', 'Required information has been reviewed by staff.', 50, false, false),
  ('fully_onboarded', 'Fully onboarded', 'The client passed all required review gates.', 60, true, true)
ON CONFLICT (code) DO NOTHING;

-- Required and optional data rules drive missing-information lists and the
-- completion gate. Only the four explicitly approved fields start required;
-- the other Phase 1 request details are visible but optional until approved.
CREATE TABLE IF NOT EXISTS required_information_fields (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'traveller', 'request')),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL CHECK (position >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, field_key)
);

INSERT INTO required_information_fields
  (entity_type, field_key, label, required, requires_review, position)
VALUES
  ('traveller', 'legal_names', 'Legal names', true, true, 10),
  ('traveller', 'date_of_birth', 'Date of birth', true, true, 20),
  ('request', 'airports', 'Airports', true, true, 30),
  ('request', 'travel_dates', 'Travel dates', true, true, 40),
  ('request', 'cabin_class', 'Cabin class', false, false, 50),
  ('request', 'flexibility', 'Date or airport flexibility', false, false, 60),
  ('request', 'special_requests', 'Special requests', false, false, 70)
ON CONFLICT (entity_type, field_key) DO NOTHING;

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

-- Existing deployments used the legacy fee_group enum-like text column.
-- Keep it temporarily for backwards compatibility, while all new client
-- assignments use the configurable record relationship below.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS booking_fee_group_id INTEGER REFERENCES booking_fee_groups(id);

-- The initial prototype constrained stage codes to six hardcoded values.
-- The stage catalogue now owns that vocabulary, so remove the old check and
-- allow administrators to add future stages without another migration.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_stage_check;

-- A minimal real request record for integration links. The operational
-- Requests queue is still being migrated from its prototype, but external
-- records must reference an actual request rather than a frontend-only row.
CREATE SEQUENCE IF NOT EXISTS travel_request_number_seq START WITH 10500;

CREATE TABLE IF NOT EXISTS travel_requests (
  id SERIAL PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE
    DEFAULT ('R-' || lpad(nextval('travel_request_number_seq')::text, 5, '0')),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  trip_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new_inquiry',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- WhatsApp groups created from the platform. One request may have at most
-- one managed group, and the reserved name is unique case-insensitively.
-- A row is reserved before the provider call so simultaneous clicks cannot
-- create two external groups for the same request.
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  travel_request_id INTEGER NOT NULL UNIQUE REFERENCES travel_requests(id),
  conversation_id INTEGER UNIQUE REFERENCES conversations(id),
  whatsapp_group_jid TEXT UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'active', 'failed')),
  failure_reason TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_groups_lower_name_uq
  ON whatsapp_groups (lower(name));

CREATE TABLE IF NOT EXISTS whatsapp_group_participants (
  id SERIAL PRIMARY KEY,
  whatsapp_group_id INTEGER NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('traveller', 'staff')),
  traveller_id INTEGER REFERENCES travellers(id),
  user_id INTEGER REFERENCES users(id),
  display_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_group_id, phone_number),
  CHECK (
    (participant_type = 'traveller' AND traveller_id IS NOT NULL AND user_id IS NULL)
    OR
    (participant_type = 'staff' AND user_id IS NOT NULL AND traveller_id IS NULL)
  )
);
