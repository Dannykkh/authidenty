PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE identity_vault_entries (
  user_id TEXT PRIMARY KEY,
  phone_ciphertext BLOB NOT NULL CHECK (length(phone_ciphertext) > 0),
  phone_iv BLOB NOT NULL CHECK (length(phone_iv) = 12),
  phone_auth_tag BLOB NOT NULL CHECK (length(phone_auth_tag) = 16),
  key_version TEXT NOT NULL CHECK (length(key_version) BETWEEN 1 AND 64),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE relay_profiles (
  user_id TEXT PRIMARY KEY,
  relay_handle TEXT NOT NULL UNIQUE
    CHECK (length(relay_handle) BETWEEN 24 AND 128),
  subject_id TEXT NOT NULL UNIQUE
    CHECK (length(subject_id) BETWEEN 24 AND 128),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE relay_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  relying_service TEXT NOT NULL
    CHECK (length(relying_service) BETWEEN 1 AND 80),
  summary TEXT NOT NULL
    CHECK (length(summary) BETWEEN 1 AND 280),
  purpose TEXT NOT NULL
    CHECK (purpose IN (
      'login',
      'payment_approval',
      'account_change',
      'destructive_action',
      'data_access',
      'other'
    )),
  declared_risk TEXT NOT NULL
    CHECK (declared_risk IN ('low', 'medium', 'high')),
  model_risk TEXT NOT NULL
    CHECK (model_risk IN ('low', 'medium', 'high')),
  final_risk TEXT NOT NULL
    CHECK (final_risk IN ('low', 'medium', 'high')),
  factor TEXT NOT NULL
    CHECK (factor IN ('sms_otp', 'passkey')),
  status TEXT NOT NULL DEFAULT 'challenge_sent'
    CHECK (status IN ('challenge_sent', 'verified', 'expired', 'failed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (expires_at > created_at),
  CHECK (verified_at IS NULL OR verified_at >= created_at)
);

CREATE INDEX idx_relay_requests_user_created
  ON relay_requests(user_id, created_at DESC);

CREATE INDEX idx_relay_requests_status_expires
  ON relay_requests(status, expires_at);

CREATE TABLE relay_challenges (
  request_id TEXT PRIMARY KEY,
  code_digest BLOB NOT NULL CHECK (length(code_digest) = 32),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  FOREIGN KEY (request_id) REFERENCES relay_requests(id) ON DELETE CASCADE,
  CHECK (expires_at > created_at),
  CHECK (attempt_count <= max_attempts),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX idx_relay_challenges_expires
  ON relay_challenges(expires_at);

CREATE TABLE relay_notification_outbox (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel = 'sms'),
  masked_destination TEXT NOT NULL
    CHECK (
      length(masked_destination) = 12
      AND masked_destination GLOB '[*][*][*]-[*][*][*]-[0-9][0-9][0-9][0-9]'
    ),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'delivered', 'failed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  delivered_at INTEGER,
  FOREIGN KEY (request_id) REFERENCES relay_requests(id) ON DELETE CASCADE,
  CHECK (delivered_at IS NULL OR delivered_at >= created_at)
);

CREATE INDEX idx_relay_notification_outbox_status
  ON relay_notification_outbox(status, created_at);

CREATE TABLE verification_receipts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  subject_id TEXT NOT NULL
    CHECK (length(subject_id) BETWEEN 24 AND 128),
  purpose TEXT NOT NULL
    CHECK (purpose IN (
      'login',
      'payment_approval',
      'account_change',
      'destructive_action',
      'data_access',
      'other'
    )),
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  factor TEXT NOT NULL CHECK (factor IN ('sms_otp', 'passkey')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (request_id) REFERENCES relay_requests(id) ON DELETE CASCADE,
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_verification_receipts_subject_created
  ON verification_receipts(subject_id, created_at DESC);

COMMIT;
