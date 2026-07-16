PRAGMA foreign_keys = OFF;

BEGIN;

DROP INDEX IF EXISTS idx_conversation_challenges_user_created;
DROP INDEX IF EXISTS idx_conversation_challenges_status_expires;
DROP TABLE IF EXISTS conversation_challenges;
DROP INDEX IF EXISTS idx_conversation_profiles_status;
DROP TABLE IF EXISTS conversation_profiles;

COMMIT;

PRAGMA foreign_keys = ON;
