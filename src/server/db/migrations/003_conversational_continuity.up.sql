PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE conversation_profiles (
  user_id TEXT PRIMARY KEY,
  profile_version TEXT NOT NULL
    CHECK (profile_version = 'style-v1'),
  style_vector TEXT NOT NULL
    CHECK (json_valid(style_vector) AND json_type(style_vector) = 'object'),
  sample_count INTEGER NOT NULL
    CHECK (sample_count BETWEEN 3 AND 6),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_profiles_status
  ON conversation_profiles(status, created_at);

CREATE TABLE conversation_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deterministic_score REAL NOT NULL
    CHECK (deterministic_score BETWEEN 0 AND 1),
  model_score REAL NOT NULL
    CHECK (model_score BETWEEN 0 AND 1),
  final_score REAL NOT NULL
    CHECK (final_score BETWEEN 0 AND 1),
  model_source TEXT NOT NULL
    CHECK (model_source IN ('gpt-5.6', 'conservative_fallback')),
  explanation TEXT NOT NULL
    CHECK (length(explanation) BETWEEN 1 AND 280),
  code_digest BLOB NOT NULL
    CHECK (length(code_digest) = 32),
  masked_destination TEXT NOT NULL
    CHECK (
      length(masked_destination) = 12
      AND masked_destination GLOB '[*][*][*]-[*][*][*]-[0-9][0-9][0-9][0-9]'
    ),
  status TEXT NOT NULL DEFAULT 'challenge_sent'
    CHECK (status IN ('challenge_sent', 'verified', 'expired', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5
    CHECK (max_attempts BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (attempt_count <= max_attempts),
  CHECK (expires_at > created_at),
  CHECK (verified_at IS NULL OR verified_at >= created_at)
);

CREATE INDEX idx_conversation_challenges_status_expires
  ON conversation_challenges(status, expires_at);

CREATE INDEX idx_conversation_challenges_user_created
  ON conversation_challenges(user_id, created_at DESC);

COMMIT;
