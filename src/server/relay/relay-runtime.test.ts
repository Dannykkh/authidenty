import { describe, expect, test } from "vitest";

async function loadRelayRuntime() {
  try {
    return await import("./relay-runtime");
  } catch {
    expect.fail("The relay runtime configuration is not implemented yet.");
  }
}

describe("private identity relay runtime", () => {
  test("loads independent 32-byte vault and challenge secrets", async () => {
    const { createRelayRuntime } = await loadRelayRuntime();
    const runtime = createRelayRuntime({
      AUTHIDENTY_VAULT_KEY_BASE64: Buffer.alloc(32, 7).toString("base64"),
      AUTHIDENTY_CHALLENGE_SECRET_BASE64: Buffer.alloc(32, 9).toString(
        "base64",
      ),
    });

    const encrypted = runtime.vault.encryptPhone("user-1", "+12025550184");
    expect(runtime.vault.decryptPhone("user-1", encrypted)).toBe(
      "+12025550184",
    );
    expect(runtime.challengeSecret).toEqual(Buffer.alloc(32, 9));
    await expect(
      runtime.classifier.classify({
        serviceName: "OpenClaw",
        actionDescription: "Approve a test action.",
        safetyIdentifier: "safety-test",
      }),
    ).rejects.toThrow("OpenAI action classification is not configured.");
  });

  test.each([
    {
      name: "missing vault key",
      environment: {
        AUTHIDENTY_CHALLENGE_SECRET_BASE64: Buffer.alloc(32).toString(
          "base64",
        ),
      },
    },
    {
      name: "short challenge secret",
      environment: {
        AUTHIDENTY_VAULT_KEY_BASE64: Buffer.alloc(32).toString("base64"),
        AUTHIDENTY_CHALLENGE_SECRET_BASE64: Buffer.alloc(16).toString(
          "base64",
        ),
      },
    },
  ])("rejects $name", async ({ environment }) => {
    const { createRelayRuntime } = await loadRelayRuntime();

    expect(() => createRelayRuntime(environment)).toThrow(
      "Private relay encryption is not configured.",
    );
  });

  test("simulated delivery returns the code only as an explicit preview", async () => {
    const { createSimulatedNotificationAdapter } = await loadRelayRuntime();
    const adapter = createSimulatedNotificationAdapter();

    await expect(
      adapter.send({
        requestId: "request-1",
        destination: "+12025550184",
        code: "184205",
        summary: "Approve a test action.",
      }),
    ).resolves.toEqual({ status: "delivered", previewCode: "184205" });
  });
});
