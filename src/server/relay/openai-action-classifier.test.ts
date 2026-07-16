import { describe, expect, test, vi } from "vitest";

async function loadActionClassifier() {
  try {
    return await import("./openai-action-classifier");
  } catch {
    expect.fail("The OpenAI action classifier is not implemented yet.");
  }
}

describe("OpenAI relay action classifier", () => {
  test("builds a PII-free GPT-5.6 Structured Outputs request", async () => {
    const { buildOpenAIActionClassificationRequest } =
      await loadActionClassifier();

    const request = buildOpenAIActionClassificationRequest({
      serviceName: "OpenClaw",
      actionDescription: "Approve a transfer to the saved supplier.",
      safetyIdentifier: "safety_0123456789",
    });

    expect(request).toMatchObject({
      model: "gpt-5.6",
      store: false,
      safety_identifier: "safety_0123456789",
      reasoning: { effort: "low" },
    });
    expect(request).not.toHaveProperty("tools");
    expect(request.input).toBe(
      JSON.stringify({
        serviceName: "OpenClaw",
        actionDescription: "Approve a transfer to the saved supplier.",
      }),
    );
    expect(request.input).not.toContain("relay_");
    expect(request.input).not.toContain("subject_");
    expect(request.input).not.toContain("phone");
  });

  test("returns only the parsed classification", async () => {
    const { OpenAIActionClassifier } = await loadActionClassifier();
    const parse = vi.fn(async () => ({
      output_parsed: {
        purpose: "payment_approval",
        summary: "OpenClaw requests approval for a supplier transfer.",
        suggestedRisk: "high",
      },
    }));
    const classifier = new OpenAIActionClassifier({ responses: { parse } });

    await expect(
      classifier.classify({
        serviceName: "OpenClaw",
        actionDescription: "Approve a transfer to the saved supplier.",
        safetyIdentifier: "safety_0123456789",
      }),
    ).resolves.toEqual({
      purpose: "payment_approval",
      summary: "OpenClaw requests approval for a supplier transfer.",
      suggestedRisk: "high",
    });
    expect(parse).toHaveBeenCalledOnce();
  });

  test("rejects a missing parsed result instead of inventing a decision", async () => {
    const { OpenAIActionClassifier } = await loadActionClassifier();
    const classifier = new OpenAIActionClassifier({
      responses: { parse: vi.fn(async () => ({ output_parsed: null })) },
    });

    await expect(
      classifier.classify({
        serviceName: "OpenClaw",
        actionDescription: "Delete the production workspace.",
        safetyIdentifier: "safety_0123456789",
      }),
    ).rejects.toThrow("The action classifier did not return a structured result.");
  });
});
