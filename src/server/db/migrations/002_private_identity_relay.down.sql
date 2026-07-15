PRAGMA foreign_keys = ON;

BEGIN;

DROP TABLE IF EXISTS verification_receipts;
DROP TABLE IF EXISTS relay_notification_outbox;
DROP TABLE IF EXISTS relay_challenges;
DROP TABLE IF EXISTS relay_requests;
DROP TABLE IF EXISTS relay_profiles;
DROP TABLE IF EXISTS identity_vault_entries;

COMMIT;
