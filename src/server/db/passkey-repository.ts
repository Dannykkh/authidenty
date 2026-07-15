import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "@simplewebauthn/server";
import type Database from "better-sqlite3";

export type CeremonyType = "registration" | "authentication";

export type UserRecord = {
  id: string;
  username: string;
  displayName: string;
  webauthnUserId: string;
};

export type ChallengeRecord = {
  sessionId: string;
  ceremonyType: CeremonyType;
  userId: string;
  challenge: string;
  expiresAt: number;
};

export type CredentialRecord = {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[];
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  webauthn_user_id: string;
};

type ChallengeRow = {
  session_id: string;
  ceremony_type: CeremonyType;
  user_id: string;
  challenge: string;
  expires_at: number;
};

type CredentialRow = {
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: number;
  device_type: CredentialDeviceType;
  backed_up: 0 | 1;
  transports: string;
};

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    webauthnUserId: row.webauthn_user_id,
  };
}

function mapChallenge(row: ChallengeRow): ChallengeRecord {
  return {
    sessionId: row.session_id,
    ceremonyType: row.ceremony_type,
    userId: row.user_id,
    challenge: row.challenge,
    expiresAt: row.expires_at,
  };
}

function mapCredential(row: CredentialRow): CredentialRecord {
  return {
    id: row.id,
    userId: row.user_id,
    publicKey: new Uint8Array(row.public_key),
    counter: row.counter,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: JSON.parse(row.transports) as AuthenticatorTransportFuture[],
  };
}

export function createUser(
  database: Database.Database,
  user: UserRecord,
): UserRecord {
  const normalizedUser = {
    ...user,
    username: user.username.trim().toLowerCase(),
    displayName: user.displayName.trim(),
  };

  database
    .prepare(
      `INSERT INTO users (id, username, display_name, webauthn_user_id)
       VALUES (@id, @username, @displayName, @webauthnUserId)`,
    )
    .run(normalizedUser);

  return normalizedUser;
}

export function findUserByUsername(
  database: Database.Database,
  username: string,
): UserRecord | null {
  const row = database
    .prepare(
      `SELECT id, username, display_name, webauthn_user_id
       FROM users
       WHERE username = ?`,
    )
    .get(username.trim().toLowerCase()) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function findUserById(
  database: Database.Database,
  userId: string,
): UserRecord | null {
  const row = database
    .prepare(
      `SELECT id, username, display_name, webauthn_user_id
       FROM users
       WHERE id = ?`,
    )
    .get(userId) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function storeChallenge(
  database: Database.Database,
  challenge: ChallengeRecord,
) {
  database
    .prepare(
      `INSERT INTO webauthn_challenges
        (session_id, ceremony_type, user_id, challenge, expires_at)
       VALUES (@sessionId, @ceremonyType, @userId, @challenge, @expiresAt)
       ON CONFLICT (session_id, ceremony_type) DO UPDATE SET
         user_id = excluded.user_id,
         challenge = excluded.challenge,
         created_at = unixepoch(),
         expires_at = excluded.expires_at`,
    )
    .run(challenge);
}

export function consumeChallenge(
  database: Database.Database,
  sessionId: string,
  ceremonyType: CeremonyType,
  now: number,
): ChallengeRecord | null {
  const consume = database.transaction(() => {
    const row = database
      .prepare(
        `SELECT session_id, ceremony_type, user_id, challenge, expires_at
         FROM webauthn_challenges
         WHERE session_id = ? AND ceremony_type = ?`,
      )
      .get(sessionId, ceremonyType) as ChallengeRow | undefined;

    if (!row) {
      return null;
    }

    database
      .prepare(
        `DELETE FROM webauthn_challenges
         WHERE session_id = ? AND ceremony_type = ?`,
      )
      .run(sessionId, ceremonyType);

    return row.expires_at > now ? mapChallenge(row) : null;
  });

  return consume.immediate();
}

export function saveCredential(
  database: Database.Database,
  credential: CredentialRecord,
) {
  database
    .prepare(
      `INSERT INTO passkey_credentials
        (id, user_id, public_key, counter, device_type, backed_up, transports)
       VALUES (@id, @userId, @publicKey, @counter, @deviceType, @backedUp, @transports)`,
    )
    .run({
      ...credential,
      publicKey: Buffer.from(credential.publicKey),
      backedUp: credential.backedUp ? 1 : 0,
      transports: JSON.stringify(credential.transports),
    });
}

export function listCredentialsByUserId(
  database: Database.Database,
  userId: string,
): CredentialRecord[] {
  const rows = database
    .prepare(
      `SELECT id, user_id, public_key, counter, device_type, backed_up, transports
       FROM passkey_credentials
       WHERE user_id = ?
       ORDER BY created_at, id`,
    )
    .all(userId) as CredentialRow[];

  return rows.map(mapCredential);
}
