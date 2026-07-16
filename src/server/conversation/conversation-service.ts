import { createHash, createHmac } from "node:crypto";
import type Database from "better-sqlite3";
import { z } from "zod";
import { createUser } from "../db/passkey-repository";
import {
  findEncryptedPhoneByUserId,
  saveEncryptedPhone,
} from "../relay/identity-vault-repository";
import type {
  EncryptedPhoneDestination,
} from "../relay/identity-vault";
import { maskPhoneDestination } from "../relay/identity-vault";
import {
  createConversationChallenge,
  listActiveConversationProfiles,
  saveConversationProfile,
  verifyConversationChallenge,
} from "./conversation-repository";
import {
  compareStyleVectors,
  extractStyleVector,
  type StyleVector,
} from "./style-vector";

const answersSchema = z
  .array(z.string().trim().min(10).max(500))
  .min(3)
  .max(6);

const enrollmentSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  answers: answersSchema,
});

const matchSchema = z.object({
  answers: answersSchema,
});

const confirmationSchema = z.object({
  challengeId: z.string().trim().min(24).max(128),
  code: z.string().regex(/^\d{6}$/),
});

type ConversationVault = {
  encryptPhone(userId: string, phone: string): EncryptedPhoneDestination;
  decryptPhone(
    userId: string,
    encrypted: EncryptedPhoneDestination,
  ): string;
};

export type ConversationPatternAnalyzer = {
  analyze(input: {
    enrolledVector: StyleVector;
    candidateVector: StyleVector;
    safetyIdentifier: string;
  }): Promise<{
    score: number;
    explanation: string;
  }>;
};

export type ConversationNotificationAdapter = {
  send(input: {
    challengeId: string;
    destination: string;
    code: string;
    displayName: string;
  }): Promise<{
    status: "delivered";
    previewCode?: string;
  }>;
};

type EnrollmentDependencies = {
  vault: ConversationVault;
  generateId: (
    prefix: "user" | "webauthn" | "challenge",
  ) => string;
};

type MatchDependencies = EnrollmentDependencies & {
  analyzer: ConversationPatternAnalyzer;
  notificationAdapter: ConversationNotificationAdapter;
  challengeSecret: Buffer;
  generateCode: () => string;
  now: () => number;
};

type ConfirmationDependencies = {
  challengeSecret: Buffer;
  now: () => number;
};

export class ConversationEnrollmentError extends Error {
  constructor() {
    super("The conversational profile could not be enrolled.");
    this.name = "ConversationEnrollmentError";
  }
}

export class ConversationVerificationError extends Error {
  constructor() {
    super("The device verification could not be completed.");
    this.name = "ConversationVerificationError";
  }
}

function validateChallengeSecret(secret: Buffer) {
  if (secret.length < 32) {
    throw new Error("Conversation challenge secrets must contain 32 bytes.");
  }
}

function challengeDigest(secret: Buffer, challengeId: string, code: string) {
  return createHmac("sha256", secret)
    .update(`authidenty:conversation-challenge:${challengeId}:${code}`)
    .digest();
}

function safetyIdentifier(userId: string) {
  return createHash("sha256")
    .update(`authidenty:conversation-safety:${userId}`)
    .digest("hex");
}

function webauthnUserId(seed: string) {
  return createHash("sha256")
    .update(`authidenty:conversation-webauthn:${seed}`)
    .digest("base64url");
}

function roundScore(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function enrollConversationProfile(
  database: Database.Database,
  input: unknown,
  dependencies: EnrollmentDependencies,
) {
  const parsed = enrollmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ConversationEnrollmentError();
  }

  let vector: StyleVector;

  try {
    vector = extractStyleVector(parsed.data.answers);
  } catch {
    throw new ConversationEnrollmentError();
  }

  const userId = dependencies.generateId("user");
  const passkeyUserId = webauthnUserId(
    dependencies.generateId("webauthn"),
  );
  const encryptedPhone = dependencies.vault.encryptPhone(
    userId,
    parsed.data.phone,
  );

  const enroll = database.transaction(() => {
    createUser(database, {
      id: userId,
      username: `${userId}@conversation.invalid`,
      displayName: parsed.data.displayName,
      webauthnUserId: passkeyUserId,
    });
    saveEncryptedPhone(database, userId, encryptedPhone);
    saveConversationProfile(database, { userId, vector });
  });

  enroll.immediate();

  return {
    profileId: userId,
    status: "enrolled" as const,
    displayName: parsed.data.displayName,
    destination: maskPhoneDestination(parsed.data.phone),
    sampleCount: vector.sampleCount,
  };
}

export async function startConversationMatch(
  database: Database.Database,
  input: unknown,
  dependencies: MatchDependencies,
) {
  const parsed = matchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "no_match" as const,
      explanation:
        "The response pattern was not consistent enough to select an enrolled profile.",
    };
  }

  validateChallengeSecret(dependencies.challengeSecret);
  const candidateVector = extractStyleVector(parsed.data.answers);
  const profiles = listActiveConversationProfiles(database);
  const ranked = profiles
    .map((profile) => ({
      ...profile,
      deterministicScore: compareStyleVectors(
        profile.vector,
        candidateVector,
      ),
    }))
    .sort((left, right) => right.deterministicScore - left.deterministicScore);
  const candidate = ranked[0];

  if (!candidate) {
    return {
      status: "no_match" as const,
      explanation:
        "The response pattern was not consistent enough to select an enrolled profile.",
    };
  }

  let modelScore = candidate.deterministicScore;
  let explanation =
    "The derived writing features are consistent with the enrolled profile.";
  let analysisSource: "gpt-5.6" | "conservative_fallback" = "gpt-5.6";

  try {
    const analysis = await dependencies.analyzer.analyze({
      enrolledVector: candidate.vector,
      candidateVector,
      safetyIdentifier: safetyIdentifier(candidate.userId),
    });
    modelScore = Math.max(0, Math.min(1, analysis.score));
    explanation = analysis.explanation.trim().slice(0, 280);
    if (!explanation) {
      throw new Error("The model explanation was empty.");
    }
  } catch {
    analysisSource = "conservative_fallback";
  }

  const finalScore = roundScore(
    candidate.deterministicScore * 0.7 + modelScore * 0.3,
  );

  if (finalScore < 0.72) {
    return {
      status: "no_match" as const,
      explanation:
        "The response pattern was not consistent enough to select an enrolled profile.",
    };
  }

  const encryptedPhone = findEncryptedPhoneByUserId(
    database,
    candidate.userId,
  );
  if (!encryptedPhone) {
    throw new ConversationVerificationError();
  }

  let phone: string;

  try {
    phone = dependencies.vault.decryptPhone(
      candidate.userId,
      encryptedPhone,
    );
  } catch {
    throw new ConversationVerificationError();
  }

  const challengeId = dependencies.generateId("challenge");
  const code = dependencies.generateCode();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Conversation challenge codes must contain six digits.");
  }

  const now = dependencies.now();
  const destination = maskPhoneDestination(phone);
  const delivery = await dependencies.notificationAdapter.send({
    challengeId,
    destination: phone,
    code,
    displayName: candidate.displayName,
  });

  createConversationChallenge(database, {
    id: challengeId,
    userId: candidate.userId,
    deterministicScore: roundScore(candidate.deterministicScore),
    modelScore: roundScore(modelScore),
    finalScore,
    modelSource: analysisSource,
    explanation,
    codeDigest: challengeDigest(
      dependencies.challengeSecret,
      challengeId,
      code,
    ),
    maskedDestination: destination,
    now,
    expiresAt: now + 300,
  });

  return {
    status: "challenge_sent" as const,
    challengeId,
    candidate: {
      displayName: candidate.displayName,
      destination,
    },
    score: finalScore,
    analysisSource,
    explanation,
    factor: "sms_otp" as const,
    ...(process.env.NODE_ENV !== "production" && delivery.previewCode
      ? { demoCode: delivery.previewCode }
      : {}),
  };
}

export function confirmConversationChallenge(
  database: Database.Database,
  input: unknown,
  dependencies: ConfirmationDependencies,
) {
  const parsed = confirmationSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConversationVerificationError();
  }

  validateChallengeSecret(dependencies.challengeSecret);
  const result = verifyConversationChallenge(database, {
    challengeId: parsed.data.challengeId,
    candidateDigest: challengeDigest(
      dependencies.challengeSecret,
      parsed.data.challengeId,
      parsed.data.code,
    ),
    now: dependencies.now(),
  });

  if (result.status !== "verified") {
    throw new ConversationVerificationError();
  }

  return {
    status: "verified" as const,
    displayName: result.displayName,
    destination: result.destination,
    factor: "sms_otp" as const,
    verifiedAt: new Date(result.verifiedAt * 1000).toISOString(),
  };
}
