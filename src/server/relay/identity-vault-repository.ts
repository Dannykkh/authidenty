import type Database from "better-sqlite3";
import type { EncryptedPhoneDestination } from "./identity-vault";

type VaultRow = {
  phone_ciphertext: Buffer;
  phone_iv: Buffer;
  phone_auth_tag: Buffer;
  key_version: string;
};

export function saveEncryptedPhone(
  database: Database.Database,
  userId: string,
  encrypted: EncryptedPhoneDestination,
) {
  database
    .prepare(
      `INSERT INTO identity_vault_entries
        (user_id, phone_ciphertext, phone_iv, phone_auth_tag, key_version)
       VALUES (@userId, @ciphertext, @iv, @authTag, @keyVersion)
       ON CONFLICT (user_id) DO UPDATE SET
         phone_ciphertext = excluded.phone_ciphertext,
         phone_iv = excluded.phone_iv,
         phone_auth_tag = excluded.phone_auth_tag,
         key_version = excluded.key_version,
         updated_at = unixepoch()`,
    )
    .run({ userId, ...encrypted });
}

export function findEncryptedPhoneByUserId(
  database: Database.Database,
  userId: string,
): EncryptedPhoneDestination | null {
  const row = database
    .prepare(
      `SELECT phone_ciphertext, phone_iv, phone_auth_tag, key_version
       FROM identity_vault_entries
       WHERE user_id = ?`,
    )
    .get(userId) as VaultRow | undefined;

  if (!row) {
    return null;
  }

  return {
    ciphertext: row.phone_ciphertext,
    iv: row.phone_iv,
    authTag: row.phone_auth_tag,
    keyVersion: row.key_version,
  };
}
