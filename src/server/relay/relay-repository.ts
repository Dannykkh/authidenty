import { timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";

export type RelayRisk = "low" | "medium" | "high";
export type RelayPurpose =
  | "login"
  | "payment_approval"
  | "account_change"
  | "destructive_action"
  | "data_access"
  | "other";
export type RelayFactor = "sms_otp" | "passkey";

export type RelayProfileRecord = {
  userId: string;
  relayHandle: string;
  subjectId: string;
};

export type RelayRequestRecord = {
  id: string;
  userId: string;
  relyingService: string;
  summary: string;
  purpose: RelayPurpose;
  declaredRisk: RelayRisk;
  modelRisk: RelayRisk;
  finalRisk: RelayRisk;
  factor: RelayFactor;
  status: "challenge_sent" | "verified" | "expired" | "failed";
  createdAt: number;
  expiresAt: number;
  verifiedAt: number | null;
};

export type VerificationReceiptRecord = {
  id: string;
  requestId: string;
  subjectId: string;
  purpose: RelayPurpose;
  risk: RelayRisk;
  factor: RelayFactor;
  createdAt: number;
  expiresAt: number;
};

type RelayProfileRow = {
  user_id: string;
  relay_handle: string;
  subject_id: string;
};

type RelayRequestRow = {
  id: string;
  user_id: string;
  relying_service: string;
  summary: string;
  purpose: RelayPurpose;
  declared_risk: RelayRisk;
  model_risk: RelayRisk;
  final_risk: RelayRisk;
  factor: RelayFactor;
  status: RelayRequestRecord["status"];
  created_at: number;
  expires_at: number;
  verified_at: number | null;
};

type ChallengeRow = RelayRequestRow & {
  code_digest: Buffer;
  attempt_count: number;
  max_attempts: number;
  challenge_expires_at: number;
  consumed_at: number | null;
  subject_id: string | null;
  profile_status: "active" | "disabled" | null;
};

type ReceiptRow = {
  id: string;
  request_id: string;
  subject_id: string;
  purpose: RelayPurpose;
  risk: RelayRisk;
  factor: RelayFactor;
  created_at: number;
  expires_at: number;
};

function mapRelayRequest(row: RelayRequestRow): RelayRequestRecord {
  return {
    id: row.id,
    userId: row.user_id,
    relyingService: row.relying_service,
    summary: row.summary,
    purpose: row.purpose,
    declaredRisk: row.declared_risk,
    modelRisk: row.model_risk,
    finalRisk: row.final_risk,
    factor: row.factor,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    verifiedAt: row.verified_at,
  };
}

function mapReceipt(row: ReceiptRow): VerificationReceiptRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    subjectId: row.subject_id,
    purpose: row.purpose,
    risk: row.risk,
    factor: row.factor,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function saveRelayProfile(
  database: Database.Database,
  profile: RelayProfileRecord,
) {
  database
    .prepare(
      `INSERT INTO relay_profiles (user_id, relay_handle, subject_id)
       VALUES (@userId, @relayHandle, @subjectId)
       ON CONFLICT (user_id) DO UPDATE SET
         relay_handle = excluded.relay_handle,
         subject_id = excluded.subject_id,
         status = 'active',
         updated_at = unixepoch()`,
    )
    .run(profile);
}

export function setRelayProfileStatus(
  database: Database.Database,
  userId: string,
  status: "active" | "disabled",
) {
  database
    .prepare(
      `UPDATE relay_profiles
       SET status = ?, updated_at = unixepoch()
       WHERE user_id = ?`,
    )
    .run(status, userId);
}

export function findActiveRelayProfileByHandle(
  database: Database.Database,
  relayHandle: string,
): RelayProfileRecord | null {
  const row = database
    .prepare(
      `SELECT user_id, relay_handle, subject_id
       FROM relay_profiles
       WHERE relay_handle = ? AND status = 'active'`,
    )
    .get(relayHandle) as RelayProfileRow | undefined;

  return row
    ? {
        userId: row.user_id,
        relayHandle: row.relay_handle,
        subjectId: row.subject_id,
      }
    : null;
}

type CreateRelayRequestInput = {
  request: Omit<RelayRequestRecord, "status" | "verifiedAt">;
  challenge: {
    codeDigest: Buffer;
    maxAttempts: number;
  };
  notification: {
    id: string;
    maskedDestination: string;
  };
};

export function createRelayRequest(
  database: Database.Database,
  input: CreateRelayRequestInput,
) {
  const create = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO relay_requests
          (id, user_id, relying_service, summary, purpose, declared_risk,
           model_risk, final_risk, factor, status, created_at, updated_at, expires_at)
         VALUES
          (@id, @userId, @relyingService, @summary, @purpose, @declaredRisk,
           @modelRisk, @finalRisk, @factor, 'challenge_sent', @createdAt,
           @createdAt, @expiresAt)`,
      )
      .run(input.request);
    database
      .prepare(
        `INSERT INTO relay_challenges
          (request_id, code_digest, max_attempts, created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.request.id,
        input.challenge.codeDigest,
        input.challenge.maxAttempts,
        input.request.createdAt,
        input.request.createdAt,
        input.request.expiresAt,
      );
    database
      .prepare(
        `INSERT INTO relay_notification_outbox
          (id, request_id, channel, masked_destination, status, created_at, updated_at)
         VALUES (?, ?, 'sms', ?, 'queued', ?, ?)`,
      )
      .run(
        input.notification.id,
        input.request.id,
        input.notification.maskedDestination,
        input.request.createdAt,
        input.request.createdAt,
      );
  });

  create.immediate();
}

export function findRelayRequestById(
  database: Database.Database,
  requestId: string,
): RelayRequestRecord | null {
  const row = database
    .prepare(
      `SELECT id, user_id, relying_service, summary, purpose, declared_risk,
              model_risk, final_risk, factor, status, created_at, expires_at,
              verified_at
       FROM relay_requests
       WHERE id = ?`,
    )
    .get(requestId) as RelayRequestRow | undefined;

  return row ? mapRelayRequest(row) : null;
}

type VerifyRelayChallengeInput = {
  requestId: string;
  candidateDigest: Buffer;
  now: number;
  receipt: {
    id: string;
    expiresAt: number;
  };
};

export type VerifyRelayChallengeResult =
  | { status: "verified"; receiptId: string }
  | { status: "invalid"; attemptsRemaining: number }
  | { status: "locked"; attemptsRemaining: 0 }
  | { status: "expired" }
  | { status: "consumed" }
  | { status: "not_found" };

export function verifyRelayChallenge(
  database: Database.Database,
  input: VerifyRelayChallengeInput,
): VerifyRelayChallengeResult {
  const verify = database.transaction((): VerifyRelayChallengeResult => {
    const row = database
      .prepare(
        `SELECT r.id, r.user_id, r.relying_service, r.summary, r.purpose,
                r.declared_risk, r.model_risk, r.final_risk, r.factor, r.status,
                r.created_at, r.expires_at, r.verified_at,
                c.code_digest, c.attempt_count, c.max_attempts,
                c.expires_at AS challenge_expires_at, c.consumed_at,
                p.subject_id, p.status AS profile_status
         FROM relay_requests r
         JOIN relay_challenges c ON c.request_id = r.id
         LEFT JOIN relay_profiles p ON p.user_id = r.user_id
         WHERE r.id = ?`,
      )
      .get(input.requestId) as ChallengeRow | undefined;

    if (!row) {
      return { status: "not_found" };
    }

    if (row.consumed_at !== null || row.status === "verified") {
      return { status: "consumed" };
    }

    if (row.status === "failed" || row.attempt_count >= row.max_attempts) {
      return { status: "locked", attemptsRemaining: 0 };
    }

    if (row.status === "expired" || row.challenge_expires_at <= input.now) {
      database
        .prepare(
          `UPDATE relay_requests
           SET status = 'expired', updated_at = ?
           WHERE id = ?`,
        )
        .run(input.now, input.requestId);
      return { status: "expired" };
    }

    const candidateMatches =
      input.candidateDigest.length === row.code_digest.length &&
      timingSafeEqual(input.candidateDigest, row.code_digest);

    if (!candidateMatches) {
      const attemptCount = row.attempt_count + 1;
      const attemptsRemaining = row.max_attempts - attemptCount;
      database
        .prepare(
          `UPDATE relay_challenges
           SET attempt_count = ?, updated_at = ?
           WHERE request_id = ?`,
        )
        .run(attemptCount, input.now, input.requestId);

      if (attemptsRemaining === 0) {
        database
          .prepare(
            `UPDATE relay_requests
             SET status = 'failed', updated_at = ?
             WHERE id = ?`,
          )
          .run(input.now, input.requestId);
        return { status: "locked", attemptsRemaining: 0 };
      }

      return { status: "invalid", attemptsRemaining };
    }

    if (!row.subject_id || row.profile_status !== "active") {
      return { status: "locked", attemptsRemaining: 0 };
    }

    database
      .prepare(
        `UPDATE relay_challenges
         SET consumed_at = ?, updated_at = ?
         WHERE request_id = ? AND consumed_at IS NULL`,
      )
      .run(input.now, input.now, input.requestId);
    database
      .prepare(
        `UPDATE relay_requests
         SET status = 'verified', verified_at = ?, updated_at = ?
         WHERE id = ? AND status = 'challenge_sent'`,
      )
      .run(input.now, input.now, input.requestId);
    database
      .prepare(
        `INSERT INTO verification_receipts
          (id, request_id, subject_id, purpose, risk, factor,
           created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.receipt.id,
        input.requestId,
        row.subject_id,
        row.purpose,
        row.final_risk,
        row.factor,
        input.now,
        input.now,
        input.receipt.expiresAt,
      );

    return { status: "verified", receiptId: input.receipt.id };
  });

  return verify.immediate();
}

export function findVerificationReceiptById(
  database: Database.Database,
  receiptId: string,
): VerificationReceiptRecord | null {
  const row = database
    .prepare(
      `SELECT id, request_id, subject_id, purpose, risk, factor, created_at, expires_at
       FROM verification_receipts
       WHERE id = ?`,
    )
    .get(receiptId) as ReceiptRow | undefined;

  return row ? mapReceipt(row) : null;
}
