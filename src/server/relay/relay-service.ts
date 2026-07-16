import { createHash, createHmac } from "node:crypto";
import type Database from "better-sqlite3";
import { z } from "zod";
import type {
  RelayActionClassification,
  RelayActionClassifier,
} from "./openai-action-classifier";
import { findEncryptedPhoneByUserId } from "./identity-vault-repository";
import type { EncryptedPhoneDestination } from "./identity-vault";
import { maskPhoneDestination } from "./identity-vault";
import {
  createRelayRequest,
  findActiveRelayProfileByHandle,
  findVerificationReceiptById,
  recordRelayNotificationResult,
  verifyRelayChallenge,
  type RelayRisk,
} from "./relay-repository";

const likelyEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const likelyPhonePattern = /(?:^|\s)\+[1-9]\d{7,14}\b/;
const likelyBirthDatePattern =
  /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/;

function containsLikelyPersonalData(value: string) {
  return (
    likelyEmailPattern.test(value) ||
    likelyPhonePattern.test(value) ||
    likelyBirthDatePattern.test(value)
  );
}

export const relayApprovalRequestSchema = z
  .object({
    relayHandle: z
      .string()
      .trim()
      .min(24)
      .max(128)
      .regex(/^relay_[A-Za-z0-9_-]+$/),
    serviceName: z.string().trim().min(1).max(80),
    actionDescription: z.string().trim().min(1).max(500),
    declaredRisk: z.enum(["low", "medium", "high"]),
  })
  .superRefine((value, context) => {
    if (
      containsLikelyPersonalData(value.serviceName) ||
      containsLikelyPersonalData(value.actionDescription)
    ) {
      context.addIssue({
        code: "custom",
        message: "Approval request contains personal data or secrets.",
        path: ["actionDescription"],
      });
    }
  });

const relayVerificationRequestSchema = z.object({
  requestId: z.string().trim().min(24).max(128),
  code: z.string().regex(/^\d{6}$/),
});

type IdentityVaultReader = {
  decryptPhone(
    userId: string,
    encrypted: EncryptedPhoneDestination,
  ): string;
};

export type RelayNotificationAdapter = {
  send(input: {
    requestId: string;
    destination: string;
    code: string;
    summary: string;
  }): Promise<{
    status: "delivered";
    previewCode?: string;
  }>;
};

type CreateRelayDependencies = {
  classifier: RelayActionClassifier;
  vault: IdentityVaultReader;
  notificationAdapter: RelayNotificationAdapter;
  challengeSecret: Buffer;
  generateCode: () => string;
  generateId: (prefix: "request" | "notification") => string;
  now: () => number;
};

type VerifyRelayDependencies = {
  challengeSecret: Buffer;
  generateId: (prefix: "receipt") => string;
  now: () => number;
};

export class RelayRequestRejectedError extends Error {
  constructor(message = "The approval request could not be completed.") {
    super(message);
    this.name = "RelayRequestRejectedError";
  }
}

export class RelayVerificationError extends Error {
  constructor() {
    super("The verification request could not be completed.");
    this.name = "RelayVerificationError";
  }
}

function validateChallengeSecret(secret: Buffer) {
  if (secret.length < 32) {
    throw new Error("Relay challenge secrets must contain at least 32 bytes.");
  }
}

function challengeDigest(secret: Buffer, requestId: string, code: string) {
  return createHmac("sha256", secret)
    .update(`authidenty:relay-challenge:${requestId}:${code}`)
    .digest();
}

const riskRank: Record<RelayRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function maximumRisk(...risks: RelayRisk[]): RelayRisk {
  return risks.reduce((highest, risk) =>
    riskRank[risk] > riskRank[highest] ? risk : highest,
  );
}

function safetyIdentifier(userId: string) {
  return createHash("sha256")
    .update(`authidenty:relay-safety:${userId}`)
    .digest("hex");
}

function fallbackClassification(
  serviceName: string,
): RelayActionClassification {
  return {
    purpose: "other",
    summary: `${serviceName} requests approval for an action that requires review.`,
    suggestedRisk: "high",
  };
}

function parseApprovalRequest(input: unknown) {
  const result = relayApprovalRequestSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const personalDataIssue = result.error.issues.find(
    (issue) => issue.message === "Approval request contains personal data or secrets.",
  );

  if (personalDataIssue) {
    throw new RelayRequestRejectedError(personalDataIssue.message);
  }

  throw new RelayRequestRejectedError();
}

export async function createRelayApprovalRequest(
  database: Database.Database,
  requestInput: unknown,
  dependencies: CreateRelayDependencies,
) {
  const request = parseApprovalRequest(requestInput);
  validateChallengeSecret(dependencies.challengeSecret);
  const profile = findActiveRelayProfileByHandle(database, request.relayHandle);

  if (!profile) {
    throw new RelayRequestRejectedError();
  }

  let classification: RelayActionClassification;
  let classificationSource: "gpt-5.6" | "conservative_fallback" = "gpt-5.6";

  try {
    classification = await dependencies.classifier.classify({
      serviceName: request.serviceName,
      actionDescription: request.actionDescription,
      safetyIdentifier: safetyIdentifier(profile.userId),
    });
  } catch {
    classification = fallbackClassification(request.serviceName);
    classificationSource = "conservative_fallback";
  }

  const encryptedPhone = findEncryptedPhoneByUserId(database, profile.userId);

  if (!encryptedPhone) {
    throw new RelayRequestRejectedError();
  }

  let phone: string;

  try {
    phone = dependencies.vault.decryptPhone(profile.userId, encryptedPhone);
  } catch {
    throw new RelayRequestRejectedError();
  }

  const now = dependencies.now();
  const requestId = dependencies.generateId("request");
  const notificationId = dependencies.generateId("notification");
  const code = dependencies.generateCode();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("Relay challenge generators must return exactly six digits.");
  }

  const expiresAt = now + 300;
  const finalRisk = maximumRisk(
    "medium",
    request.declaredRisk,
    classification.suggestedRisk,
  );
  const destination = maskPhoneDestination(phone);

  createRelayRequest(database, {
    request: {
      id: requestId,
      userId: profile.userId,
      relyingService: request.serviceName,
      summary: classification.summary,
      purpose: classification.purpose,
      declaredRisk: request.declaredRisk,
      modelRisk: classification.suggestedRisk,
      finalRisk,
      factor: "sms_otp",
      createdAt: now,
      expiresAt,
    },
    challenge: {
      codeDigest: challengeDigest(
        dependencies.challengeSecret,
        requestId,
        code,
      ),
      maxAttempts: 5,
    },
    notification: {
      id: notificationId,
      maskedDestination: destination,
    },
  });

  let delivery: Awaited<
    ReturnType<RelayNotificationAdapter["send"]>
  >;

  try {
    delivery = await dependencies.notificationAdapter.send({
      requestId,
      destination: phone,
      code,
      summary: classification.summary,
    });
    recordRelayNotificationResult(database, requestId, "delivered", now);
  } catch {
    recordRelayNotificationResult(database, requestId, "failed", now);
    throw new RelayRequestRejectedError();
  }

  return {
    requestId,
    status: "challenge_sent" as const,
    summary: classification.summary,
    classificationSource,
    finalRisk,
    factor: "sms_otp" as const,
    destination,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    ...(process.env.NODE_ENV !== "production" && delivery.previewCode
      ? { demoCode: delivery.previewCode }
      : {}),
  };
}

export function verifyRelayApprovalRequest(
  database: Database.Database,
  verificationInput: unknown,
  dependencies: VerifyRelayDependencies,
) {
  const parsed = relayVerificationRequestSchema.safeParse(verificationInput);

  if (!parsed.success) {
    throw new RelayVerificationError();
  }

  validateChallengeSecret(dependencies.challengeSecret);
  const now = dependencies.now();
  const receiptId = dependencies.generateId("receipt");
  const result = verifyRelayChallenge(database, {
    requestId: parsed.data.requestId,
    candidateDigest: challengeDigest(
      dependencies.challengeSecret,
      parsed.data.requestId,
      parsed.data.code,
    ),
    now,
    receipt: {
      id: receiptId,
      expiresAt: now + 300,
    },
  });

  if (result.status !== "verified") {
    throw new RelayVerificationError();
  }

  const receipt = findVerificationReceiptById(database, result.receiptId);

  if (!receipt) {
    throw new RelayVerificationError();
  }

  return {
    receiptId: receipt.id,
    subject: receipt.subjectId,
    purpose: receipt.purpose,
    risk: receipt.risk,
    factor: receipt.factor,
    verifiedAt: new Date(receipt.createdAt * 1000).toISOString(),
    expiresAt: new Date(receipt.expiresAt * 1000).toISOString(),
  };
}
