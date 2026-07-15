import { describe, expect, test } from "vitest";
import { buildOpenAIRecoveryRequest } from "./openai-recovery-model";

describe("OpenAI recovery model request", () => {
  test("uses GPT-5.6 without storing the recovery conversation", () => {
    const request = buildOpenAIRecoveryRequest({
      failureCode: "DEVICE_LOST",
      message: "My phone is gone.",
      history: [],
      safetyIdentifier: "hashed-session-id",
    });

    expect(request).toMatchObject({
      model: "gpt-5.6",
      store: false,
      safety_identifier: "hashed-session-id",
      max_output_tokens: 700,
      reasoning: { effort: "low" },
    });
  });

  test("makes the non-decision boundary part of the developer instructions", () => {
    const request = buildOpenAIRecoveryRequest({
      failureCode: "PASSKEY_NOT_FOUND",
      message: "The browser cannot find my passkey.",
      history: [],
      safetyIdentifier: "hashed-session-id",
    });

    expect(request.instructions).toContain("Never authenticate the user");
    expect(request.instructions).toContain("Never request passwords, PINs, one-time codes");
    expect(request.instructions).toContain("Do not claim that re-enrollment is approved");
    expect(request.input).toContain('"failureCode":"PASSKEY_NOT_FOUND"');
  });
});
