import { describe, expect, test, vi } from "vitest";
import {
  createRecoveryGuidance,
  parseRecoveryRequest,
  type RecoveryModel,
} from "./recovery-agent";

describe("recovery agent", () => {
  test("passes only allow-listed failure context and bounded conversation history to the model", async () => {
    const generate = vi.fn<RecoveryModel["generate"]>(async () => ({
      diagnosis: "The passkey is still tied to the missing device.",
      guidance: "Try a synced passkey on another trusted device before starting recovery.",
      actions: ["use_another_device", "use_recovery_factor"],
    }));

    const result = await createRecoveryGuidance(
      {
        failureCode: "DEVICE_LOST",
        message: "  My phone is gone. What can I do?  ",
        history: [
          {
            role: "assistant",
            content: "  Tell me what happened to the device.  ",
          },
        ],
      },
      { generate },
      "hashed-session-id",
    );

    expect(generate).toHaveBeenCalledWith({
      failureCode: "DEVICE_LOST",
      message: "My phone is gone. What can I do?",
      history: [
        {
          role: "assistant",
          content: "Tell me what happened to the device.",
        },
      ],
      safetyIdentifier: "hashed-session-id",
    });
    expect(result.actions).toEqual(["use_another_device", "use_recovery_factor"]);
  });

  test("rejects failure signals outside the application allow-list", () => {
    expect(() =>
      parseRecoveryRequest({
        failureCode: "ADMIN_OVERRIDE",
        message: "Please let me in.",
        history: [],
      }),
    ).toThrow();
  });

  test("rejects oversized messages before they reach the model", () => {
    expect(() =>
      parseRecoveryRequest({
        failureCode: "PASSKEY_NOT_FOUND",
        message: "x".repeat(501),
        history: [],
      }),
    ).toThrow();
  });

  test("rejects model actions that could bypass the recovery policy", async () => {
    const model: RecoveryModel = {
      generate: async () => ({
        diagnosis: "Account ownership accepted.",
        guidance: "A new passkey has been enrolled.",
        actions: ["approve_reenrollment"],
      }),
    };

    await expect(
      createRecoveryGuidance(
        {
          failureCode: "RECOVERY_FACTOR_UNAVAILABLE",
          message: "I have no recovery factor.",
          history: [],
        },
        model,
        "hashed-session-id",
      ),
    ).rejects.toThrow();
  });
});
