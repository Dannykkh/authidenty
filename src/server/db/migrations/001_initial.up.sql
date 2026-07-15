PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (length(username) BETWEEN 3 AND 254),
  display_name TEXT NOT NULL
    CHECK (length(display_name) BETWEEN 1 AND 80),
  webauthn_user_id TEXT NOT NULL UNIQUE
    CHECK (length(webauthn_user_id) BETWEEN 32 AND 128),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE passkey_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key BLOB NOT NULL CHECK (length(public_key) > 0),
  counter INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),
  device_type TEXT NOT NULL
    CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up INTEGER NOT NULL DEFAULT 0
    CHECK (backed_up IN (0, 1)),
  transports TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(transports) AND json_type(transports) = 'array'),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_passkey_credentials_user_id
  ON passkey_credentials(user_id);

CREATE TABLE webauthn_challenges (
  session_id TEXT NOT NULL,
  ceremony_type TEXT NOT NULL
    CHECK (ceremony_type IN ('registration', 'authentication')),
  user_id TEXT NOT NULL,
  challenge TEXT NOT NULL UNIQUE
    CHECK (length(challenge) BETWEEN 32 AND 512),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, ceremony_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_webauthn_challenges_user_id
  ON webauthn_challenges(user_id);

CREATE INDEX idx_webauthn_challenges_expires_at
  ON webauthn_challenges(expires_at);

COMMIT;
