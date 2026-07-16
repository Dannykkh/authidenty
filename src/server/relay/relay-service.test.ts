import { describe, expect, test, vi } from "vitest";
import { openDatabase } from "../db/database";
import { createUser } from "../db/passkey-repository";
import {
  findEncryptedPhoneByUserId,
  saveEncryptedPhone,
} from "./identity-vault-repository";
import { createIdentityVaultCipher } from "./identity-vault";
import {
  findRelayRequestById,
  saveRelayProfile,
} from "./relay-repository";

async function loadRelayService() {
  try {
    return await import("./relay-service");
  } catch {
    expect.fail("The private identity relay service is not implemented yet.");
  }
}

function setupRelayAccount() {
  const database = openDatabase(":memory:");
  const vault = createIdentityVaultCipher({
    activeKeyVersion: "demo-v1",
    keys: { "demo-v1": Buffer.alloc(32, 7) },
  });

  createUser(database, {
    id: "user-1",
    username: "casey@example.com",
    displayName: "Casey",
    webauthnUserId: "A".repeat(43),
  });
  saveRelayProfile(database, {
    userId: "user-1",
    relayHandle: "relay_0123456789abcdefghijkl",
    subjectId: "subject_0123456789abcdefghij",
  });
  saveEncryptedPhone(
    database,
    "user-1",
    vault.encryptPhone("user-1", "+12025550184"),
  );

  return { database, vault };
}

function idGenerator(prefix: string) {
  return `${prefix}_0123456789abcdefghijkl`;
}

describe("private identity relay service", () => {
  test("privately routes an OTP and issues a minimal receipt after verification", async () => {
    const { createRelayApprovalRequest, verifyRelayApprovalRequest } =
      await loadRelayService();
    const { database, vault } = setupRelayAccount();
    const classify = vi.fn(async () => ({
      purpose: "payment_approval" as const,
      summary: "OpenClaw requests approval for a saved-supplier transfer.",
      suggestedRisk: "low" as const,
    }));
    const send = vi.fn(async (input: { code: string }) => ({
      status: "delivered" as const,
      previewCode: input.code,
    }));

    try {
      const created = await createRelayApprovalRequest(
        database,
        {
          relayHandle: "relay_0123456789abcdefghijkl",
          serviceName: "OpenClaw",
          actionDescription: "Approve a transfer to the saved supplier.",
          declaredRisk: "high",
        },
        {
          classifier: { classify },
          vault,
          notificationAdapter: { send },
          challengeSecret: Buffer.alloc(32, 11),
          generateCode: () => "184205",
          generateId: idGenerator,
          now: () => 1_900_000_000,
        },
      );

      expect(created).toEqual({
        requestId: "request_0123456789abcdefghijkl",
        status: "challenge_sent",
        summary: "OpenClaw requests approval for a saved-supplier transfer.",
        finalRisk: "high",
        factor: "sms_otp",
        destination: "***-***-0184",
        expiresAt: "2030-03-17T17:51:40.000Z",
        demoCode: "184205",
      });
      expect(classify).toHaveBeenCalledWith({
        serviceName: "OpenClaw",
        actionDescription: "Approve a transfer to the saved supplier.",
        safetyIdentifier: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(send).toHaveBeenCalledWith({
        requestId: "request_0123456789abcdefghijkl",
        destination: "+12025550184",
        code: "184205",
        summary: "OpenClaw requests approval for a saved-supplier transfer.",
      });
      expect(JSON.stringify(created)).not.toContain("+12025550184");
      expect(findRelayRequestById(database, created.requestId)).toMatchObject({
        finalRisk: "high",
        modelRisk: "low",
        status: "challenge_sent",
      });
      expect(
        database
          .prepare(
            `SELECT status, delivered_at
             FROM relay_notification_outbox
             WHERE request_id = ?`,
          )
          .get(created.requestId),
      ).toEqual({ status: "delivered", delivered_at: 1_900_000_000 });

      const receipt = verifyRelayApprovalRequest(
        database,
        { requestId: created.requestId, code: "184205" },
        {
          challengeSecret: Buffer.alloc(32, 11),
          generateId: idGenerator,
          now: () => 1_900_000_010,
        },
      );

      expect(receipt).toEqual({
        receiptId: "receipt_0123456789abcdefghijkl",
        subject: "subject_0123456789abcdefghij",
        purpose: "payment_approval",
        risk: "high",
        factor: "sms_otp",
        verifiedAt: "2030-03-17T17:46:50.000Z",
        expiresAt: "2030-03-17T17:51:50.000Z",
      });
      expect(() =>
        verifyRelayApprovalRequest(
          database,
          { requestId: created.requestId, code: "184205" },
          {
            challengeSecret: Buffer.alloc(32, 11),
            generateId: idGenerator,
            now: () => 1_900_000_011,
          },
        ),
      ).toThrow("The verification request could not be completed.");
    } finally {
      database.close();
    }
  });

  test("uses a high-risk fallback when GPT classification is unavailable", async () => {
    const { createRelayApprovalRequest } = await loadRelayService();
    const { database, vault } = setupRelayAccount();
    const send = vi.fn(async () => ({ status: "delivered" as const }));

    try {
      const created = await createRelayApprovalRequest(
        database,
        {
          relayHandle: "relay_0123456789abcdefghijkl",
          serviceName: "OpenClaw",
          actionDescription: "Approve an unfamiliar workspace operation.",
          declaredRisk: "low",
        },
        {
          classifier: {
            classify: vi.fn(async () => {
              throw new Error("model unavailable");
            }),
          },
          vault,
          notificationAdapter: { send },
          challengeSecret: Buffer.alloc(32, 11),
          generateCode: () => "184205",
          generateId: idGenerator,
          now: () => 1_900_000_000,
        },
      );

      expect(created.finalRisk).toBe("high");
      expect(created.summary).toBe(
        "OpenClaw requests approval for an action that requires review.",
      );
      expect(findRelayRequestById(database, created.requestId)).toMatchObject({
        purpose: "other",
        modelRisk: "high",
        finalRisk: "high",
      });
    } finally {
      database.close();
    }
  });

  test("records a generic failure when private challenge delivery fails", async () => {
    const { createRelayApprovalRequest } = await loadRelayService();
    const { database, vault } = setupRelayAccount();

    try {
      await expect(
        createRelayApprovalRequest(
          database,
          {
            relayHandle: "relay_0123456789abcdefghijkl",
            serviceName: "OpenClaw",
            actionDescription: "Approve a transfer to the saved supplier.",
            declaredRisk: "high",
          },
          {
            classifier: {
              classify: vi.fn(async () => ({
                purpose: "payment_approval" as const,
                summary: "OpenClaw requests approval for a supplier transfer.",
                suggestedRisk: "high" as const,
              })),
            },
            vault,
            notificationAdapter: {
              send: vi.fn(async () => {
                throw new Error("provider account details");
              }),
            },
            challengeSecret: Buffer.alloc(32, 11),
            generateCode: () => "184205",
            generateId: idGenerator,
            now: () => 1_900_000_000,
          },
        ),
      ).rejects.toThrow("The approval request could not be completed.");

      expect(
        findRelayRequestById(
          database,
          "request_0123456789abcdefghijkl",
        ),
      ).toMatchObject({ status: "failed" });
      expect(
        database
          .prepare(
            `SELECT status
             FROM relay_notification_outbox
             WHERE request_id = ?`,
          )
          .get("request_0123456789abcdefghijkl"),
      ).toEqual({ status: "failed" });
    } finally {
      database.close();
    }
  });

  test.each([
    "Send the result to casey@example.com.",
    "Call +12025550184 before approval.",
    "Use the birth date 1990-03-14 to confirm.",
  ])("rejects likely PII before calling GPT: %s", async (actionDescription) => {
    const { createRelayApprovalRequest } = await loadRelayService();
    const { database, vault } = setupRelayAccount();
    const classify = vi.fn();
    const send = vi.fn();

    try {
      await expect(
        createRelayApprovalRequest(
          database,
          {
            relayHandle: "relay_0123456789abcdefghijkl",
            serviceName: "OpenClaw",
            actionDescription,
            declaredRisk: "medium",
          },
          {
            classifier: { classify },
            vault,
            notificationAdapter: { send },
            challengeSecret: Buffer.alloc(32, 11),
            generateCode: () => "184205",
            generateId: idGenerator,
            now: () => 1_900_000_000,
          },
        ),
      ).rejects.toThrow("Approval request contains personal data or secrets.");
      expect(classify).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
      expect(findEncryptedPhoneByUserId(database, "user-1")).not.toBeNull();
    } finally {
      database.close();
    }
  });
});
