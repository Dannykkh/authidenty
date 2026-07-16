import { describe, expect, test } from "vitest";
import { openDatabase } from "../db/database";
import { createUser } from "../db/passkey-repository";

async function loadRelayRepositories() {
  try {
    const [relayRepository, vaultRepository] = await Promise.all([
      import("./relay-repository"),
      import("./identity-vault-repository"),
    ]);
    return { ...relayRepository, ...vaultRepository };
  } catch {
    expect.fail("The relay repositories are not implemented yet.");
  }
}

function createAccount(database: ReturnType<typeof openDatabase>) {
  createUser(database, {
    id: "user-1",
    username: "casey@example.com",
    displayName: "Casey",
    webauthnUserId: "A".repeat(43),
  });
}

describe("private identity relay repositories", () => {
  test("keeps encrypted contact data separate from the active relay profile", async () => {
    const {
      findActiveRelayProfileByHandle,
      findEncryptedPhoneByUserId,
      saveEncryptedPhone,
      saveRelayProfile,
      setRelayProfileStatus,
    } = await loadRelayRepositories();
    const database = openDatabase(":memory:");

    try {
      createAccount(database);
      saveRelayProfile(database, {
        userId: "user-1",
        relayHandle: "relay_0123456789abcdefghijkl",
        subjectId: "subject_0123456789abcdefghij",
      });
      saveEncryptedPhone(database, "user-1", {
        ciphertext: Buffer.from([1, 2, 3]),
        iv: Buffer.alloc(12, 4),
        authTag: Buffer.alloc(16, 5),
        keyVersion: "demo-v1",
      });

      expect(
        findActiveRelayProfileByHandle(
          database,
          "relay_0123456789abcdefghijkl",
        ),
      ).toEqual({
        userId: "user-1",
        relayHandle: "relay_0123456789abcdefghijkl",
        subjectId: "subject_0123456789abcdefghij",
      });
      expect(findEncryptedPhoneByUserId(database, "user-1")).toEqual({
        ciphertext: Buffer.from([1, 2, 3]),
        iv: Buffer.alloc(12, 4),
        authTag: Buffer.alloc(16, 5),
        keyVersion: "demo-v1",
      });

      setRelayProfileStatus(database, "user-1", "disabled");
      expect(
        findActiveRelayProfileByHandle(
          database,
          "relay_0123456789abcdefghijkl",
        ),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  test("atomically creates a request, challenge, and PII-free notification record", async () => {
    const { createRelayRequest, findRelayRequestById } =
      await loadRelayRepositories();
    const database = openDatabase(":memory:");

    try {
      createAccount(database);
      createRelayRequest(database, {
        request: {
          id: "request-1",
          userId: "user-1",
          relyingService: "OpenClaw",
          summary: "Approve a saved-supplier transfer.",
          purpose: "payment_approval",
          declaredRisk: "medium",
          modelRisk: "high",
          finalRisk: "high",
          factor: "sms_otp",
          createdAt: 1_900_000_000,
          expiresAt: 1_900_000_300,
        },
        challenge: {
          codeDigest: Buffer.alloc(32, 8),
          maxAttempts: 3,
        },
        notification: {
          id: "notification-1",
          maskedDestination: "***-***-0184",
        },
      });

      expect(findRelayRequestById(database, "request-1")).toMatchObject({
        id: "request-1",
        userId: "user-1",
        finalRisk: "high",
        status: "challenge_sent",
      });
      expect(
        database
          .prepare(
            `SELECT channel, masked_destination, status
             FROM relay_notification_outbox
             WHERE request_id = ?`,
          )
          .get("request-1"),
      ).toEqual({
        channel: "sms",
        masked_destination: "***-***-0184",
        status: "queued",
      });
    } finally {
      database.close();
    }
  });

  test("limits wrong codes and never permits a locked request", async () => {
    const { createRelayRequest, verifyRelayChallenge } =
      await loadRelayRepositories();
    const database = openDatabase(":memory:");

    try {
      createAccount(database);
      createRelayRequest(database, {
        request: {
          id: "request-1",
          userId: "user-1",
          relyingService: "OpenClaw",
          summary: "Approve an account change.",
          purpose: "account_change",
          declaredRisk: "high",
          modelRisk: "high",
          finalRisk: "high",
          factor: "sms_otp",
          createdAt: 1_900_000_000,
          expiresAt: 1_900_000_300,
        },
        challenge: { codeDigest: Buffer.alloc(32, 8), maxAttempts: 2 },
        notification: {
          id: "notification-1",
          maskedDestination: "***-***-0184",
        },
      });

      expect(
        verifyRelayChallenge(database, {
          requestId: "request-1",
          candidateDigest: Buffer.alloc(32, 1),
          now: 1_900_000_010,
          receipt: {
            id: "receipt-1",
            expiresAt: 1_900_000_310,
          },
        }),
      ).toEqual({ status: "invalid", attemptsRemaining: 1 });
      expect(
        verifyRelayChallenge(database, {
          requestId: "request-1",
          candidateDigest: Buffer.alloc(32, 1),
          now: 1_900_000_011,
          receipt: {
            id: "receipt-1",
            expiresAt: 1_900_000_311,
          },
        }),
      ).toEqual({ status: "locked", attemptsRemaining: 0 });
      expect(
        verifyRelayChallenge(database, {
          requestId: "request-1",
          candidateDigest: Buffer.alloc(32, 8),
          now: 1_900_000_012,
          receipt: {
            id: "receipt-1",
            expiresAt: 1_900_000_312,
          },
        }),
      ).toEqual({ status: "locked", attemptsRemaining: 0 });
    } finally {
      database.close();
    }
  });

  test("issues one receipt for a valid challenge and rejects replay", async () => {
    const {
      createRelayRequest,
      findVerificationReceiptById,
      saveRelayProfile,
      verifyRelayChallenge,
    } = await loadRelayRepositories();
    const database = openDatabase(":memory:");

    try {
      createAccount(database);
      saveRelayProfile(database, {
        userId: "user-1",
        relayHandle: "relay_0123456789abcdefghijkl",
        subjectId: "subject_0123456789abcdefghij",
      });
      createRelayRequest(database, {
        request: {
          id: "request-1",
          userId: "user-1",
          relyingService: "OpenClaw",
          summary: "Approve a saved-supplier transfer.",
          purpose: "payment_approval",
          declaredRisk: "medium",
          modelRisk: "high",
          finalRisk: "high",
          factor: "sms_otp",
          createdAt: 1_900_000_000,
          expiresAt: 1_900_000_300,
        },
        challenge: { codeDigest: Buffer.alloc(32, 8), maxAttempts: 3 },
        notification: {
          id: "notification-1",
          maskedDestination: "***-***-0184",
        },
      });

      expect(
        verifyRelayChallenge(database, {
          requestId: "request-1",
          candidateDigest: Buffer.alloc(32, 8),
          now: 1_900_000_010,
          receipt: {
            id: "receipt-1",
            expiresAt: 1_900_000_310,
          },
        }),
      ).toEqual({ status: "verified", receiptId: "receipt-1" });
      expect(findVerificationReceiptById(database, "receipt-1")).toEqual({
        id: "receipt-1",
        requestId: "request-1",
        subjectId: "subject_0123456789abcdefghij",
        purpose: "payment_approval",
        risk: "high",
        factor: "sms_otp",
        createdAt: 1_900_000_010,
        expiresAt: 1_900_000_310,
      });
      expect(
        verifyRelayChallenge(database, {
          requestId: "request-1",
          candidateDigest: Buffer.alloc(32, 8),
          now: 1_900_000_011,
          receipt: {
            id: "receipt-2",
            expiresAt: 1_900_000_311,
          },
        }),
      ).toEqual({ status: "consumed" });
    } finally {
      database.close();
    }
  });
});
