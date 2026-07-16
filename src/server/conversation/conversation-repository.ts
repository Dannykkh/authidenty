import { timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";
import type { StyleVector } from "./style-vector";

export type ConversationProfileRecord = {
  userId: string;
  displayName: string;
  vector: StyleVector;
};

type ConversationProfileRow = {
  user_id: string;
  display_name: string;
  style_vector: string;
};

type ConversationChallengeRow = {
  id: string;
  user_id: string;
  display_name: string;
  masked_destination: string;
  code_digest: Buffer;
  status: "challenge_sent" | "verified" | "expired" | "failed";
  attempt_count: number;
  max_attempts: number;
  expires_at: number;
  verified_at: number | null;
};

export function saveConversationProfile(
  database: Database.Database,
  input: {
    userId: string;
    vector: StyleVector;
  },
) {
  database
    .prepare(
      `INSERT INTO conversation_profiles
        (user_id, profile_version, style_vector, sample_count)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         profile_version = excluded.profile_version,
         style_vector = excluded.style_vector,
         sample_count = excluded.sample_count,
         status = 'active',
         updated_at = unixepoch()`,
    )
    .run(
      input.userId,
      input.vector.version,
      JSON.stringify(input.vector),
      input.vector.sampleCount,
    );
}

export function listActiveConversationProfiles(
  database: Database.Database,
): ConversationProfileRecord[] {
  const rows = database
    .prepare(
      `SELECT p.user_id, u.display_name, p.style_vector
       FROM conversation_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'active'
       ORDER BY p.created_at, p.user_id`,
    )
    .all() as ConversationProfileRow[];

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    vector: JSON.parse(row.style_vector) as StyleVector,
  }));
}

export function createConversationChallenge(
  database: Database.Database,
  input: {
    id: string;
    userId: string;
    deterministicScore: number;
    modelScore: number;
    finalScore: number;
    modelSource: "gpt-5.6" | "conservative_fallback";
    explanation: string;
    codeDigest: Buffer;
    maskedDestination: string;
    now: number;
    expiresAt: number;
  },
) {
  database
    .prepare(
      `INSERT INTO conversation_challenges
        (id, user_id, deterministic_score, model_score, final_score,
         model_source, explanation, code_digest, masked_destination,
         status, created_at, updated_at, expires_at)
       VALUES
        (@id, @userId, @deterministicScore, @modelScore, @finalScore,
         @modelSource, @explanation, @codeDigest, @maskedDestination,
         'challenge_sent', @now, @now, @expiresAt)`,
    )
    .run(input);
}

export type VerifyConversationChallengeResult =
  | {
      status: "verified";
      displayName: string;
      destination: string;
      verifiedAt: number;
    }
  | { status: "invalid" | "locked" | "expired" | "consumed" | "not_found" };

export function verifyConversationChallenge(
  database: Database.Database,
  input: {
    challengeId: string;
    candidateDigest: Buffer;
    now: number;
  },
): VerifyConversationChallengeResult {
  const verify = database.transaction((): VerifyConversationChallengeResult => {
    const row = database
      .prepare(
        `SELECT c.id, c.user_id, u.display_name, c.masked_destination,
                c.code_digest, c.status, c.attempt_count, c.max_attempts,
                c.expires_at, c.verified_at
         FROM conversation_challenges c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
      )
      .get(input.challengeId) as ConversationChallengeRow | undefined;

    if (!row) {
      return { status: "not_found" };
    }
    if (row.status === "verified" || row.verified_at !== null) {
      return { status: "consumed" };
    }
    if (row.status === "failed" || row.attempt_count >= row.max_attempts) {
      return { status: "locked" };
    }
    if (row.status === "expired" || row.expires_at <= input.now) {
      database
        .prepare(
          `UPDATE conversation_challenges
           SET status = 'expired', updated_at = ?
           WHERE id = ?`,
        )
        .run(input.now, input.challengeId);
      return { status: "expired" };
    }

    const matches =
      input.candidateDigest.length === row.code_digest.length &&
      timingSafeEqual(input.candidateDigest, row.code_digest);

    if (!matches) {
      const nextAttempt = row.attempt_count + 1;
      const locked = nextAttempt >= row.max_attempts;
      database
        .prepare(
          `UPDATE conversation_challenges
           SET attempt_count = ?, status = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          nextAttempt,
          locked ? "failed" : "challenge_sent",
          input.now,
          input.challengeId,
        );
      return { status: locked ? "locked" : "invalid" };
    }

    database
      .prepare(
        `UPDATE conversation_challenges
         SET status = 'verified', verified_at = ?, updated_at = ?
         WHERE id = ? AND status = 'challenge_sent'`,
      )
      .run(input.now, input.now, input.challengeId);

    return {
      status: "verified",
      displayName: row.display_name,
      destination: row.masked_destination,
      verifiedAt: input.now,
    };
  });

  return verify.immediate();
}
