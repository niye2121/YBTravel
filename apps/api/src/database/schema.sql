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
  provider_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'received'
    CHECK (delivery_status IN ('pending', 'sending', 'sent', 'received', 'failed', 'delivery_unknown')),
  delivery_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (delivery_attempt_count >= 0),
  last_delivery_error TEXT,
  next_retry_at TIMESTAMPTZ,
  provider_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'received';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS last_delivery_error TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_sent_at TIMESTAMPTZ;

UPDATE messages
SET delivery_status = CASE WHEN direction = 'inbound' THEN 'received' ELSE 'sent' END
WHERE delivery_status IS NULL
   OR delivery_status NOT IN ('pending', 'sending', 'sent', 'received', 'failed', 'delivery_unknown');

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_delivery_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_delivery_status_check
  CHECK (delivery_status IN ('pending', 'sending', 'sent', 'received', 'failed', 'delivery_unknown'));

CREATE UNIQUE INDEX IF NOT EXISTS messages_provider_id_uq
  ON messages (direction, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'delivery_unknown')),
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE (message_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS message_delivery_attempts_message_idx
  ON message_delivery_attempts (message_id, attempt_number DESC);

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

-- Persistent login throttling survives API restarts and works across replicas.
-- Only keyed hashes are stored; raw submitted emails and IP addresses are not.
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key_hash TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_login_attempts_cleanup_idx
  ON auth_login_attempts (last_attempt_at);

-- Passport and future document reads are recorded separately from mutation
-- audit history so administrators can answer who accessed sensitive data.
CREATE TABLE IF NOT EXISTS sensitive_access_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'download')),
  fields_accessed TEXT[] NOT NULL DEFAULT '{}',
  purpose TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sensitive_access_events_resource_idx
  ON sensitive_access_events (resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sensitive_access_events_actor_idx
  ON sensitive_access_events (actor_user_id, created_at DESC);

-- Private in-app alerts for staff. Assignment notifications are inserted in
-- the same transaction as the request assignment so ownership and the alert
-- cannot get out of sync. Email and WhatsApp delivery remain future channels.
CREATE TABLE IF NOT EXISTS staff_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('request_assigned')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('travel_request')),
  entity_id TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_notifications_user_created_idx
  ON staff_notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS staff_notifications_user_unread_idx
  ON staff_notifications (user_id, created_at DESC, id DESC)
  WHERE read_at IS NULL;

-- Administrator-controlled sample data. Demo rows stay in PostgreSQL so
-- the catalogue can be switched back on without reseeding, but operational
-- endpoints hide them whenever this flag is disabled.
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  demo_data_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (id, demo_data_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Administrator-managed AI connection. The credential is encrypted by the
-- API before it reaches PostgreSQL and is never returned to the browser.
-- A production deployment should source AI_SECRETS_ENCRYPTION_KEY from the
-- approved managed secret service rather than a checked-in environment file.
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider = 'openai'),
  api_key_ciphertext TEXT NOT NULL,
  api_key_encryption_key_id TEXT NOT NULL DEFAULT 'primary',
  api_key_last_four CHAR(4) NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-5.6-luna'
    CHECK (model IN ('gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol')),
  reasoning_effort TEXT NOT NULL DEFAULT 'low'
    CHECK (reasoning_effort IN ('none', 'low', 'medium')),
  max_output_tokens INTEGER NOT NULL DEFAULT 800
    CHECK (max_output_tokens BETWEEN 100 AND 4000),
  enabled BOOLEAN NOT NULL DEFAULT true,
  human_review_required BOOLEAN NOT NULL DEFAULT true
    CHECK (human_review_required = true),
  redact_sensitive_data BOOLEAN NOT NULL DEFAULT true
    CHECK (redact_sensitive_data = true),
  connection_status TEXT NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'not_tested', 'failed')),
  last_tested_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_provider_settings
  ADD COLUMN IF NOT EXISTS api_key_encryption_key_id TEXT NOT NULL DEFAULT 'primary';

-- Local ledger for every provider request initiated by YB Travel. Prompts,
-- client messages, and generated text are deliberately not stored here; the
-- ledger contains operational metadata and the token usage returned by the
-- provider. estimated_cost_usd is a NUMERIC snapshot calculated using the
-- price schedule recorded on the row, while OpenAI billing stays authoritative.
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider = 'openai'),
  operation TEXT NOT NULL CHECK (operation IN ('connection_test', 'generation')),
  purpose TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  provider_response_id TEXT,
  initiated_by INTEGER REFERENCES users(id),
  related_entity_type TEXT,
  related_entity_id TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  cached_input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (cached_input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  input_price_per_million_usd NUMERIC(12, 6) NOT NULL,
  cached_input_price_per_million_usd NUMERIC(12, 6) NOT NULL,
  output_price_per_million_usd NUMERIC(12, 6) NOT NULL,
  estimated_cost_usd NUMERIC(18, 9) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  duration_ms INTEGER CHECK (duration_ms >= 0),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_created_at_idx
  ON ai_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_initiated_by_idx
  ON ai_usage_events (initiated_by, created_at DESC);

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

-- Administrator-managed, copy-ready WhatsApp messages. Templates are kept
-- separate from generated AI drafts so approved wording remains deterministic
-- and reusable. Codes are stable integration identifiers; purpose and language
-- stay editable business metadata. Starter rows are visible in production but
-- clearly marked for review before live use.
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS message_templates_lower_code_uq
  ON message_templates (lower(code));

CREATE INDEX IF NOT EXISTS message_templates_active_language_idx
  ON message_templates (active, language_code, purpose);

INSERT INTO message_templates
  (code, name, purpose, language_code, language_name, message_body, active, is_starter)
VALUES
  ('welcome_en', 'Welcome', 'Welcome', 'en', 'English',
   'Hello {{client_name}}, thank you for contacting YB Travel. We received your request and a member of our team will review it and get back to you shortly.', true, true),
  ('missing_information_en', 'Missing information', 'Missing information', 'en', 'English',
   'Hello {{client_name}}, to continue with request {{request_number}}, please send the following information: {{missing_items}}. For your security, please do not send full payment-card details in WhatsApp.', true, true),
  ('booking_fee_en', 'Booking-fee explanation', 'Booking fee', 'en', 'English',
   'Before we proceed, please note that the service fee for this request is {{fee_amount}} {{currency}}. A team member will confirm what the fee covers before any payment is requested.', true, true),
  ('follow_up_en', 'Follow-up', 'Follow-up', 'en', 'English',
   'Hello {{client_name}}, we are following up about request {{request_number}}. Please let us know if you would like us to continue, change the travel details, or close the request.', true, true),
  ('options_ready_en', 'Travel options ready', 'Travel options', 'en', 'English',
   'Hello {{client_name}}, we have prepared travel options for request {{request_number}}. Please review them and tell us which option you prefer. Fares and availability may change until ticketing is completed.', true, true),
  ('ticket_issued_en', 'Ticket issued', 'Ticketing confirmation', 'en', 'English',
   'Your ticket for request {{request_number}} has been issued. Please review the passenger names, dates, route, and baggage information, and contact us immediately if anything appears incorrect.', true, true),
  ('welcome_he', 'Welcome', 'Welcome', 'he', 'Hebrew',
   'שלום {{client_name}}, תודה שפנית ל-YB Travel. קיבלנו את הבקשה שלך ואחד מחברי הצוות שלנו יבדוק אותה ויחזור אליך בהקדם.', true, true),
  ('missing_information_he', 'Missing information', 'Missing information', 'he', 'Hebrew',
   'שלום {{client_name}}, כדי להמשיך בטיפול בבקשה {{request_number}}, נא לשלוח את הפרטים הבאים: {{missing_items}}. למען ביטחונך, אין לשלוח פרטי כרטיס אשראי מלאים ב-WhatsApp.', true, true)
ON CONFLICT (code) DO NOTHING;

-- The US desk supports English, Hebrew, and Yiddish. Remove obsolete
-- Amharic templates from existing installations as well as fresh seeds.
DELETE FROM message_templates
WHERE lower(language_code) = 'am' OR lower(language_name) = 'amharic';

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

-- Approved request vocabulary is business configuration, not application
-- code. Stable codes are integration identifiers; administrators may edit
-- the labels, descriptions, order, and active state without a deployment.
CREATE TABLE IF NOT EXISTS request_types (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS request_types_lower_name_uq
  ON request_types (lower(name));

INSERT INTO request_types (code, name, description, position)
VALUES
  ('new_flight_booking', 'New flight booking', 'A request to research and book a new flight itinerary.', 10),
  ('change_existing_booking', 'Change existing booking', 'A request to change an existing reservation or ticket.', 20),
  ('cancellation_refund_inquiry', 'Cancellation or refund inquiry', 'A question or request concerning cancellation or refund.', 30),
  ('general_travel_inquiry', 'General travel inquiry', 'A travel-related question that is not yet a booking request.', 40),
  ('other', 'Other', 'A request that does not fit another active request type.', 50)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS request_statuses (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS request_statuses_lower_name_uq
  ON request_statuses (lower(name));

INSERT INTO request_statuses (code, name, description, position)
VALUES
  ('new', 'New', 'The request has been received and has not yet been reviewed.', 10),
  ('waiting_for_information', 'Waiting for information', 'Required information is still needed from the client.', 20),
  ('ready_for_assignment', 'Ready for assignment', 'The request contains enough information to assign.', 30),
  ('assigned', 'Assigned', 'A staff member is responsible for the request.', 40),
  ('researching', 'Researching', 'Staff are researching travel options.', 50),
  ('options_sent', 'Options sent', 'Travel options have been sent to the client.', 60),
  ('waiting_for_client_decision', 'Waiting for client decision', 'The client is reviewing the proposed options.', 70),
  ('booking_preparation', 'Booking preparation', 'The selected option is being prepared for booking.', 80),
  ('on_hold', 'On hold', 'Work is intentionally paused while retaining the request.', 90),
  ('completed', 'Completed', 'The operational work for the request is complete.', 100),
  ('cancelled', 'Cancelled', 'The request was cancelled without completion.', 110)
ON CONFLICT (code) DO NOTHING;

-- Urgency levels own their response and service targets. Deadline minutes
-- are nullable until the business approves the actual targets; requests
-- snapshot calculated due timestamps so later configuration changes do not
-- rewrite historical reporting.
CREATE TABLE IF NOT EXISTS urgency_levels (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  response_deadline_minutes INTEGER CHECK (response_deadline_minutes > 0),
  service_deadline_minutes INTEGER CHECK (service_deadline_minutes > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS urgency_levels_lower_name_uq
  ON urgency_levels (lower(name));

INSERT INTO urgency_levels
  (code, name, description, position, response_deadline_minutes, service_deadline_minutes)
VALUES
  ('normal', 'Normal', 'Standard-priority request.', 10, NULL, NULL),
  ('high', 'High', 'Time-sensitive request requiring faster attention.', 20, NULL, NULL),
  ('urgent', 'Urgent', 'Immediate attention required.', 30, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- Client accounts — P1-02/03/05/10 in docs/03-deliverables.md. "name" is
-- deliberately generic (not "family name") since many YB Travel clients are
-- businesses, not individuals. Reps reference real staff accounts so client
-- creation picks from the actual user list rather than a free-text name.
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'household'
    CHECK (client_type IN ('household', 'company', 'individual')),
  phone_number TEXT,
  preferred_rep_id INTEGER REFERENCES users(id),
  secondary_rep_id INTEGER REFERENCES users(id),
  fee_group TEXT NOT NULL DEFAULT 'standard'
    CHECK (fee_group IN ('standard', 'belev_echad', 'scheiman')),
  stage TEXT NOT NULL DEFAULT 'new_inquiry'
    CHECK (stage IN ('new_inquiry', 'welcome_sent', 'waiting_for_info',
                      'information_received', 'review_complete', 'fully_onboarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  demo_key TEXT UNIQUE
);

-- Existing deployments used the legacy fee_group enum-like text column.
-- Keep it temporarily for backwards compatibility, while all new client
-- assignments use the configurable record relationship below.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS booking_fee_group_id INTEGER REFERENCES booking_fee_groups(id);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'household';

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS demo_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS clients_demo_key_uq ON clients (demo_key);

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('household', 'company', 'individual'));

-- The initial prototype constrained stage codes to six hardcoded values.
-- The stage catalogue now owns that vocabulary, so remove the old check and
-- allow administrators to add future stages without another migration.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_stage_check;

-- Direct WhatsApp conversations belong to one client after intake links or
-- creates the profile. Add the relationship only after clients exists because
-- conversations is created earlier in this idempotent schema file.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS conversations_client_id_idx ON conversations (client_id);

-- Recover previously-created direct clients where the Inbox flow had copied
-- the phone number but had no explicit conversation relationship. If legacy
-- duplicates exist, link the conversation to the earliest real client and
-- leave cleanup to an audited application operation.
UPDATE conversations conv
SET client_id = (
  SELECT c.id
  FROM clients c
  WHERE NOT c.is_demo
    AND c.phone_number IS NOT NULL
    AND regexp_replace(c.phone_number, '[^0-9]', '', 'g') =
        regexp_replace(conv.phone_number, '[^0-9]', '', 'g')
  ORDER BY c.created_at, c.id
  LIMIT 1
)
WHERE conv.client_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM clients c
    WHERE NOT c.is_demo
      AND c.phone_number IS NOT NULL
      AND regexp_replace(c.phone_number, '[^0-9]', '', 'g') =
          regexp_replace(conv.phone_number, '[^0-9]', '', 'g')
  );

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

-- Link legacy request rows to the configurable catalogues. The old status
-- text remains temporarily for backwards compatibility with the prototype.
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS request_type_id INTEGER REFERENCES request_types(id);
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS request_status_id INTEGER REFERENCES request_statuses(id);
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS urgency_level_id INTEGER REFERENCES urgency_levels(id);
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS urgency_assigned_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS service_due_at TIMESTAMPTZ;
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ;
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER REFERENCES users(id);
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'unassigned';

UPDATE travel_requests
SET assignment_status = CASE WHEN assigned_user_id IS NULL THEN 'unassigned' ELSE 'assigned' END
WHERE assignment_status IS DISTINCT FROM CASE WHEN assigned_user_id IS NULL THEN 'unassigned' ELSE 'assigned' END;

ALTER TABLE travel_requests DROP CONSTRAINT IF EXISTS travel_requests_assignment_status_check;
ALTER TABLE travel_requests
  ADD CONSTRAINT travel_requests_assignment_status_check
  CHECK (assignment_status IN ('unassigned', 'recommended', 'assigned', 'reassignment_needed', 'escalated'));

CREATE INDEX IF NOT EXISTS travel_requests_assigned_user_id_idx
  ON travel_requests (assigned_user_id, created_at DESC);

-- Assignment routing stays separate from request workflow. Business users can
-- change timing and fallback behavior without changing application code.
CREATE TABLE IF NOT EXISTS assignment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  assignment_mode TEXT NOT NULL DEFAULT 'recommend_only'
    CHECK (assignment_mode IN ('recommend_only', 'automatic')),
  team_strategy TEXT NOT NULL DEFAULT 'lowest_workload'
    CHECK (team_strategy IN ('lowest_workload', 'round_robin')),
  eligible_roles TEXT[] NOT NULL DEFAULT ARRAY['travel_agent', 'offshore_intake_employee']::text[],
  escalation_roles TEXT[] NOT NULL DEFAULT ARRAY['system_administrator']::text[],
  continuity_enabled BOOLEAN NOT NULL DEFAULT true,
  working_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO assignment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS assignment_urgency_policies (
  urgency_level_id INTEGER PRIMARY KEY REFERENCES urgency_levels(id) ON DELETE CASCADE,
  preferred_wait_minutes INTEGER NOT NULL CHECK (preferred_wait_minutes >= 0),
  secondary_wait_minutes INTEGER NOT NULL CHECK (secondary_wait_minutes >= 0),
  escalation_wait_minutes INTEGER NOT NULL CHECK (escalation_wait_minutes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO assignment_urgency_policies
  (urgency_level_id, preferred_wait_minutes, secondary_wait_minutes, escalation_wait_minutes)
SELECT id,
       CASE code WHEN 'urgent' THEN 2 WHEN 'high' THEN 5 ELSE 15 END,
       CASE code WHEN 'urgent' THEN 3 WHEN 'high' THEN 5 ELSE 15 END,
       CASE code WHEN 'urgent' THEN 5 WHEN 'high' THEN 10 ELSE 30 END
FROM urgency_levels
ON CONFLICT (urgency_level_id) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_uq
  ON users (phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS staff_routing_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'unavailable', 'absent')),
  capacity_limit INTEGER NOT NULL DEFAULT 10 CHECK (capacity_limit > 0),
  high_priority_capacity_limit INTEGER NOT NULL DEFAULT 12 CHECK (high_priority_capacity_limit > 0),
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  workdays INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::integer[],
  workday_start TIME NOT NULL DEFAULT '08:00',
  workday_end TIME NOT NULL DEFAULT '18:00',
  eligible_request_type_ids INTEGER[] NOT NULL DEFAULT '{}'::integer[],
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO staff_routing_profiles (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS request_assignment_events (
  id BIGSERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('assigned', 'reassigned', 'automatic_assigned', 'override', 'escalated')),
  routing_level TEXT NOT NULL
    CHECK (routing_level IN ('preferred', 'secondary', 'continuity', 'team', 'escalation', 'manual')),
  staff_user_id INTEGER REFERENCES users(id),
  actor_user_id INTEGER REFERENCES users(id),
  explanation TEXT NOT NULL,
  recommendation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_assignment_events_request_idx
  ON request_assignment_events (request_id, created_at DESC, id DESC);

UPDATE travel_requests
SET request_type_id = (SELECT id FROM request_types WHERE code = 'new_flight_booking')
WHERE request_type_id IS NULL;
UPDATE travel_requests
SET request_status_id = (SELECT id FROM request_statuses WHERE code = 'new')
WHERE request_status_id IS NULL;
UPDATE travel_requests
SET urgency_level_id = (SELECT id FROM urgency_levels WHERE code = 'normal')
WHERE urgency_level_id IS NULL;

UPDATE travel_requests r
SET response_due_at = r.created_at + make_interval(mins => u.response_deadline_minutes)
FROM urgency_levels u
WHERE r.urgency_level_id = u.id
  AND r.response_due_at IS NULL
  AND u.response_deadline_minutes IS NOT NULL;
UPDATE travel_requests r
SET service_due_at = r.created_at + make_interval(mins => u.service_deadline_minutes)
FROM urgency_levels u
WHERE r.urgency_level_id = u.id
  AND r.service_due_at IS NULL
  AND u.service_deadline_minutes IS NOT NULL;

ALTER TABLE travel_requests ALTER COLUMN request_type_id SET NOT NULL;
ALTER TABLE travel_requests ALTER COLUMN request_status_id SET NOT NULL;
ALTER TABLE travel_requests ALTER COLUMN urgency_level_id SET NOT NULL;

-- AI creates an editable intake proposal, never an operational request.
-- A staff member must review and approve this record before a travel request
-- is created. The source-message uniqueness prevents duplicate AI runs.
CREATE TABLE IF NOT EXISTS ai_draft_intakes (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  source_message_id INTEGER NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rejected', 'approved', 'failed')),
  request_type_id INTEGER REFERENCES request_types(id),
  urgency_level_id INTEGER REFERENCES urgency_levels(id),
  summary TEXT NOT NULL DEFAULT '',
  passenger_count INTEGER CHECK (passenger_count BETWEEN 1 AND 100),
  origin TEXT,
  destination TEXT,
  departure_date_text TEXT,
  return_date_text TEXT,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(missing_information) = 'array'),
  suggested_reply TEXT,
  confidence SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  provider_response_id TEXT,
  analysis_error TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  travel_request_id INTEGER UNIQUE REFERENCES travel_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_draft_intakes_conversation_idx
  ON ai_draft_intakes (conversation_id, created_at DESC);

ALTER TABLE travel_requests
  ADD COLUMN IF NOT EXISTS source_draft_intake_id INTEGER UNIQUE
    REFERENCES ai_draft_intakes(id);

-- A traveller is a person, not something one client owns — P1-04. This is
-- what makes the many-to-many link below possible: a traveller exists
-- independently and can be linked to more than one client's account.
CREATE TABLE IF NOT EXISTS travellers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE,
  title TEXT,
  gender TEXT,
  nationality TEXT,
  passport_status TEXT NOT NULL DEFAULT 'missing'
    CHECK (passport_status IN ('on_file', 'missing', 'expiring_soon')),
  passport_number TEXT,
  passport_issuing_country TEXT,
  passport_expires_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  demo_key TEXT UNIQUE
);

ALTER TABLE travellers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS passport_issuing_country TEXT;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS passport_expires_on DATE;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE travellers ADD COLUMN IF NOT EXISTS demo_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS travellers_demo_key_uq ON travellers (demo_key);

-- The many-to-many link lets a traveller belong to more than one client
-- account. Phase 1 uses a controlled professional relationship vocabulary;
-- it can be promoted to a configurable Setup catalogue later if operations
-- discover additional recurring relationship types.
CREATE TABLE IF NOT EXISTS traveller_accounts (
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  traveller_id INTEGER NOT NULL REFERENCES travellers(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, traveller_id)
);

ALTER TABLE traveller_accounts
  DROP CONSTRAINT IF EXISTS traveller_accounts_relationship_check;
ALTER TABLE traveller_accounts
  ADD CONSTRAINT traveller_accounts_relationship_check CHECK (
    relationship IS NULL OR relationship IN (
      'self', 'spouse_partner', 'child', 'parent_guardian', 'sibling',
      'other_relative', 'employee', 'employer', 'colleague', 'friend',
      'guest', 'group_member', 'other'
    )
  );

-- A deliberately varied, read-only training catalogue. Reserved 555-01xx
-- phone numbers prevent the sample contacts from being mistaken for real
-- WhatsApp destinations. Stable demo keys make the migration idempotent.
INSERT INTO clients
  (demo_key, name, client_type, phone_number, fee_group, booking_fee_group_id, stage, is_demo, created_at)
SELECT seed.demo_key, seed.name, seed.client_type, seed.phone_number, seed.fee_group,
       (SELECT id FROM booking_fee_groups WHERE code = seed.fee_group LIMIT 1),
       seed.stage, true, seed.created_at
FROM (VALUES
  ('demo-household-rosenberg', 'Rosenberg Household', 'household', '+12125550101', 'standard', 'fully_onboarded', '2026-01-14'::timestamptz),
  ('demo-household-cohen', 'Cohen Family', 'household', '+12125550102', 'belev_echad', 'waiting_for_info', '2026-02-03'::timestamptz),
  ('demo-household-levy', 'Levy Household', 'household', '+12125550103', 'standard', 'information_received', '2026-03-18'::timestamptz),
  ('demo-household-adler', 'Adler Family', 'household', '+12125550104', 'scheiman', 'new_inquiry', '2026-04-09'::timestamptz),
  ('demo-company-horizon', 'Horizon Consulting LLC', 'company', '+12125550111', 'scheiman', 'fully_onboarded', '2026-01-22'::timestamptz),
  ('demo-company-northstar', 'Northstar Textiles', 'company', '+12125550112', 'standard', 'welcome_sent', '2026-02-19'::timestamptz),
  ('demo-company-cedar', 'Cedar & Stone Realty', 'company', '+12125550113', 'belev_echad', 'review_complete', '2026-03-27'::timestamptz),
  ('demo-company-bluebird', 'Bluebird Learning Center', 'company', '+12125550114', 'standard', 'waiting_for_info', '2026-05-05'::timestamptz),
  ('demo-individual-stern', 'Maya Stern', 'individual', '+12125550121', 'standard', 'fully_onboarded', '2026-02-11'::timestamptz),
  ('demo-individual-weiss', 'Daniel Weiss', 'individual', '+12125550122', 'belev_echad', 'new_inquiry', '2026-03-02'::timestamptz),
  ('demo-individual-friedman', 'Leah Friedman', 'individual', '+12125550123', 'standard', 'information_received', '2026-04-16'::timestamptz),
  ('demo-individual-kaplan', 'Aaron Kaplan', 'individual', '+12125550124', 'scheiman', 'review_complete', '2026-05-28'::timestamptz)
) AS seed(demo_key, name, client_type, phone_number, fee_group, stage, created_at)
ON CONFLICT (demo_key) DO NOTHING;

INSERT INTO travellers
  (demo_key, name, dob, title, gender, nationality, passport_status,
   passport_number, passport_issuing_country, passport_expires_on, is_demo, created_at)
SELECT seed.demo_key, seed.name, seed.dob, seed.title, seed.gender, seed.nationality,
       seed.passport_status, seed.passport_number, seed.passport_issuing_country,
       seed.passport_expires_on, true, seed.created_at
FROM (VALUES
  ('demo-traveller-rachel-rosenberg', 'Rachel Rosenberg', '1984-06-12'::date, 'mrs', 'female', 'United States', 'on_file', 'DEMO-RR-001', 'United States', '2031-06-11'::date, '2026-01-14'::timestamptz),
  ('demo-traveller-david-rosenberg', 'David Rosenberg', '1982-11-04'::date, 'mr', 'male', 'United States', 'on_file', 'DEMO-DR-002', 'United States', '2029-11-03'::date, '2026-01-14'::timestamptz),
  ('demo-traveller-ella-rosenberg', 'Ella Rosenberg', '2013-03-21'::date, 'miss', 'female', 'United States', 'expiring_soon', 'DEMO-ER-003', 'United States', '2027-01-15'::date, '2026-01-14'::timestamptz),
  ('demo-traveller-noah-rosenberg', 'Noah Rosenberg', '2017-08-09'::date, 'master', 'male', 'United States', 'missing', NULL, NULL, NULL, '2026-01-14'::timestamptz),
  ('demo-traveller-sarah-cohen', 'Sarah Cohen', '1978-09-18'::date, 'mrs', 'female', 'Canada', 'on_file', 'DEMO-SC-004', 'Canada', '2030-04-20'::date, '2026-02-03'::timestamptz),
  ('demo-traveller-avi-cohen', 'Avi Cohen', '1976-02-27'::date, 'mr', 'male', 'Israel', 'on_file', 'DEMO-AC-005', 'Israel', '2028-09-14'::date, '2026-02-03'::timestamptz),
  ('demo-traveller-ben-cohen', 'Ben Cohen', '2008-12-02'::date, 'master', 'male', 'Canada', 'missing', NULL, NULL, NULL, '2026-02-03'::timestamptz),
  ('demo-traveller-miriam-levy', 'Miriam Levy', '1990-01-30'::date, 'ms', 'female', 'United States', 'on_file', 'DEMO-ML-006', 'United States', '2032-01-29'::date, '2026-03-18'::timestamptz),
  ('demo-traveller-jonah-levy', 'Jonah Levy', '1988-07-15'::date, 'mr', 'male', 'United States', 'expiring_soon', 'DEMO-JL-007', 'United States', '2027-02-03'::date, '2026-03-18'::timestamptz),
  ('demo-traveller-lila-levy', 'Lila Levy', '2020-05-11'::date, 'miss', 'female', 'United States', 'missing', NULL, NULL, NULL, '2026-03-18'::timestamptz),
  ('demo-traveller-esther-adler', 'Esther Adler', '1965-10-24'::date, 'mrs', 'female', 'United Kingdom', 'on_file', 'DEMO-EA-008', 'United Kingdom', '2029-08-17'::date, '2026-04-09'::timestamptz),
  ('demo-traveller-sam-adler', 'Sam Adler', '1962-04-06'::date, 'mr', 'male', 'United States', 'missing', NULL, NULL, NULL, '2026-04-09'::timestamptz),
  ('demo-traveller-nina-patel', 'Nina Patel', '1989-05-19'::date, 'ms', 'female', 'United States', 'on_file', 'DEMO-NP-009', 'United States', '2033-05-18'::date, '2026-01-22'::timestamptz),
  ('demo-traveller-marcus-green', 'Marcus Green', '1981-08-03'::date, 'mr', 'male', 'United States', 'expiring_soon', 'DEMO-MG-010', 'United States', '2027-03-01'::date, '2026-01-22'::timestamptz),
  ('demo-traveller-olivia-chen', 'Olivia Chen', '1993-12-14'::date, 'ms', 'female', 'Singapore', 'on_file', 'DEMO-OC-011', 'Singapore', '2030-12-13'::date, '2026-02-19'::timestamptz),
  ('demo-traveller-james-brooks', 'James Brooks', '1979-03-08'::date, 'mr', 'male', 'United Kingdom', 'missing', NULL, NULL, NULL, '2026-02-19'::timestamptz),
  ('demo-traveller-sofia-martinez', 'Sofia Martinez', '1986-06-25'::date, 'mrs', 'female', 'Spain', 'on_file', 'DEMO-SM-012', 'Spain', '2031-07-08'::date, '2026-03-27'::timestamptz),
  ('demo-traveller-ethan-price', 'Ethan Price', '1991-09-10'::date, 'mr', 'male', 'United States', 'on_file', 'DEMO-EP-013', 'United States', '2032-09-09'::date, '2026-03-27'::timestamptz),
  ('demo-traveller-hannah-kim', 'Hannah Kim', '1995-02-17'::date, 'ms', 'female', 'South Korea', 'missing', NULL, NULL, NULL, '2026-05-05'::timestamptz),
  ('demo-traveller-maya-stern', 'Maya Stern', '1992-04-08'::date, 'ms', 'female', 'United States', 'on_file', 'DEMO-MS-014', 'United States', '2034-04-07'::date, '2026-02-11'::timestamptz),
  ('demo-traveller-daniel-weiss', 'Daniel Weiss', '1987-01-13'::date, 'mr', 'male', 'Germany', 'expiring_soon', 'DEMO-DW-015', 'Germany', '2027-02-20'::date, '2026-03-02'::timestamptz),
  ('demo-traveller-leah-friedman', 'Leah Friedman', '1974-11-29'::date, 'dr', 'female', 'United States', 'on_file', 'DEMO-LF-016', 'United States', '2030-11-28'::date, '2026-04-16'::timestamptz),
  ('demo-traveller-aaron-kaplan', 'Aaron Kaplan', '1998-07-07'::date, 'mr', 'male', 'Israel', 'missing', NULL, NULL, NULL, '2026-05-28'::timestamptz),
  ('demo-traveller-ruth-kaplan', 'Ruth Kaplan', '2000-09-22'::date, 'ms', 'female', 'United States', 'on_file', 'DEMO-RK-017', 'United States', '2033-09-21'::date, '2026-05-28'::timestamptz)
) AS seed(demo_key, name, dob, title, gender, nationality, passport_status,
          passport_number, passport_issuing_country, passport_expires_on, created_at)
ON CONFLICT (demo_key) DO NOTHING;

INSERT INTO traveller_accounts (client_id, traveller_id, relationship)
SELECT c.id, t.id, seed.relationship
FROM (VALUES
  ('demo-household-rosenberg', 'demo-traveller-rachel-rosenberg', 'self'),
  ('demo-household-rosenberg', 'demo-traveller-david-rosenberg', 'spouse_partner'),
  ('demo-household-rosenberg', 'demo-traveller-ella-rosenberg', 'child'),
  ('demo-household-rosenberg', 'demo-traveller-noah-rosenberg', 'child'),
  ('demo-household-cohen', 'demo-traveller-sarah-cohen', 'self'),
  ('demo-household-cohen', 'demo-traveller-avi-cohen', 'spouse_partner'),
  ('demo-household-cohen', 'demo-traveller-ben-cohen', 'child'),
  ('demo-household-levy', 'demo-traveller-miriam-levy', 'self'),
  ('demo-household-levy', 'demo-traveller-jonah-levy', 'spouse_partner'),
  ('demo-household-levy', 'demo-traveller-lila-levy', 'child'),
  ('demo-household-adler', 'demo-traveller-esther-adler', 'self'),
  ('demo-household-adler', 'demo-traveller-sam-adler', 'spouse_partner'),
  ('demo-company-horizon', 'demo-traveller-nina-patel', 'employee'),
  ('demo-company-horizon', 'demo-traveller-marcus-green', 'employee'),
  ('demo-company-northstar', 'demo-traveller-olivia-chen', 'employee'),
  ('demo-company-northstar', 'demo-traveller-james-brooks', 'guest'),
  ('demo-company-cedar', 'demo-traveller-sofia-martinez', 'employer'),
  ('demo-company-cedar', 'demo-traveller-ethan-price', 'colleague'),
  ('demo-company-bluebird', 'demo-traveller-hannah-kim', 'group_member'),
  ('demo-individual-stern', 'demo-traveller-maya-stern', 'self'),
  ('demo-individual-weiss', 'demo-traveller-daniel-weiss', 'self'),
  ('demo-individual-friedman', 'demo-traveller-leah-friedman', 'self'),
  ('demo-individual-kaplan', 'demo-traveller-aaron-kaplan', 'self'),
  ('demo-individual-kaplan', 'demo-traveller-ruth-kaplan', 'friend')
) AS seed(client_key, traveller_key, relationship)
JOIN clients c ON c.demo_key = seed.client_key
JOIN travellers t ON t.demo_key = seed.traveller_key
ON CONFLICT (client_id, traveller_id) DO NOTHING;

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
