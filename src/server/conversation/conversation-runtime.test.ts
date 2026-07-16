import { describe, expect, test } from "vitest";

async function loadConversationRuntime() {
  try {
    return await import("./conversation-runtime");
  } catch {
    expect.fail(
      "The conversational identity runtime is not implemented yet.",
    );
  }
}

describe("conversational identity runtime", () => {
  test("loads independent 32-byte vault and challenge secrets", async () => {
    const { createConversationRuntime } =
      await loadConversationRuntime();
    const runtime = createConversationRuntime({
      AUTHIDENTY_VAULT_KEY_BASE64: Buffer.alloc(32, 7).toString(
        "base64",
      ),
      AUTHIDENTY_CHALLENGE_SECRET_BASE64: Buffer.alloc(32, 9).toString(
        "base64",
      ),
    });

    const encrypted = runtime.vault.encryptPhone(
      "user-1",
      "+12025550184",
    );
    expect(runtime.vault.decryptPhone("user-1", encrypted)).toBe(
      "+12025550184",
    );
    expect(runtime.challengeSecret).toEqual(Buffer.alloc(32, 9));
    await expect(
      runtime.analyzer.analyze({
        enrolledVector: {
          version: "style-v1",
          sampleCount: 3,
          metrics: {
            averageWords: 0.4,
            averageWordLength: 0.5,
            commaRate: 0.1,
            exclamationRate: 0,
            lowercaseStartRate: 1,
            contractionRate: 0.2,
            firstPersonRate: 0.3,
            hedgeRate: 0.2,
            connectorRate: 0.4,
          },
        },
        candidateVector: {
          version: "style-v1",
          sampleCount: 3,
          metrics: {
            averageWords: 0.4,
            averageWordLength: 0.5,
            commaRate: 0.1,
            exclamationRate: 0,
            lowercaseStartRate: 1,
            contractionRate: 0.2,
            firstPersonRate: 0.3,
            hedgeRate: 0.2,
            connectorRate: 0.4,
          },
        },
        safetyIdentifier: "hashed-user",
      }),
    ).rejects.toThrow("OpenAI pattern analysis is not configured.");
  });

  test("simulated delivery exposes a code only as a local preview", async () => {
    const { createSimulatedConversationNotificationAdapter } =
      await loadConversationRuntime();
    const adapter =
      createSimulatedConversationNotificationAdapter();

    await expect(
      adapter.send({
        challengeId: "challenge-1",
        destination: "+12025550184",
        code: "184205",
        displayName: "Danny Kim",
      }),
    ).resolves.toEqual({
      status: "delivered",
      previewCode: "184205",
    });
  });
});
