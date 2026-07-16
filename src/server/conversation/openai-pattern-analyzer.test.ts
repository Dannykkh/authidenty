import { describe, expect, test, vi } from "vitest";
import { extractStyleVector } from "./style-vector";

async function loadPatternAnalyzer() {
  try {
    return await import("./openai-pattern-analyzer");
  } catch {
    expect.fail("The OpenAI pattern analyzer is not implemented yet.");
  }
}

const enrolledVector = extractStyleVector([
  "honestly, i start with the smallest part because it keeps things clear.",
  "i'd check the details first, then move once the risk feels low.",
  "usually i write a short list, but i keep the final answer direct.",
]);

const candidateVector = extractStyleVector([
  "honestly, i'd compare two options first because guessing wastes time.",
  "i usually make the safe choice, then explain the reason in one line.",
  "short answer first, details second. that keeps things clear.",
]);

describe("OpenAI conversational pattern analyzer", () => {
  test("builds a PII-free GPT-5.6 Structured Outputs request", async () => {
    const { buildOpenAIPatternAnalysisRequest } =
      await loadPatternAnalyzer();

    const request = buildOpenAIPatternAnalysisRequest({
      enrolledVector,
      candidateVector,
      safetyIdentifier: "hashed-user-identifier",
    });

    expect(request).toMatchObject({
      model: "gpt-5.6",
      store: false,
      safety_identifier: "hashed-user-identifier",
      reasoning: { effort: "low" },
    });
    expect(request).not.toHaveProperty("tools");
    expect(request.instructions).toContain("Never authenticate");
    expect(request.instructions).toContain("derived numerical features");
    expect(request.input).toBe(
      JSON.stringify({
        enrolledVector,
        candidateVector,
      }),
    );
    expect(request.input).not.toContain("Danny");
    expect(request.input).not.toContain("phone");
    expect(request.input).not.toContain("honestly");
  });

  test("returns only the validated similarity assessment", async () => {
    const { OpenAIPatternAnalyzer } = await loadPatternAnalyzer();
    const parse = vi.fn(async () => ({
      output_parsed: {
        score: 0.88,
        explanation:
          "Both vectors show concise, lowercase, reason-first responses.",
      },
    }));
    const analyzer = new OpenAIPatternAnalyzer({ responses: { parse } });

    await expect(
      analyzer.analyze({
        enrolledVector,
        candidateVector,
        safetyIdentifier: "hashed-user-identifier",
      }),
    ).resolves.toEqual({
      score: 0.88,
      explanation:
        "Both vectors show concise, lowercase, reason-first responses.",
    });
    expect(parse).toHaveBeenCalledOnce();
  });

  test("rejects a missing structured result", async () => {
    const { OpenAIPatternAnalyzer } = await loadPatternAnalyzer();
    const analyzer = new OpenAIPatternAnalyzer({
      responses: {
        parse: vi.fn(async () => ({ output_parsed: null })),
      },
    });

    await expect(
      analyzer.analyze({
        enrolledVector,
        candidateVector,
        safetyIdentifier: "hashed-user-identifier",
      }),
    ).rejects.toThrow(
      "The pattern analyzer did not return a structured result.",
    );
  });
});
