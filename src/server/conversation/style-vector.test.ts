import { describe, expect, test } from "vitest";

async function loadStyleVector() {
  try {
    return await import("./style-vector");
  } catch {
    expect.fail("The conversational style vector is not implemented yet.");
  }
}

const enrolledAnswers = [
  "honestly, i usually start with the smallest part because it keeps things clear.",
  "i'd check the details first, then move once the risk feels low.",
  "usually i write a short list, but i keep the final answer direct.",
];

const returningAnswers = [
  "honestly, i'd compare two options first because guessing wastes time.",
  "i usually make the safe choice, then explain the reason in one line.",
  "short answer first, details second. that keeps things clear.",
];

describe("conversational style vector", () => {
  test("extracts a bounded derived profile without retaining answer text", async () => {
    const { extractStyleVector } = await loadStyleVector();

    const vector = extractStyleVector(enrolledAnswers);
    const serialized = JSON.stringify(vector);

    expect(vector.version).toBe("style-v1");
    expect(vector.sampleCount).toBe(3);
    expect(serialized).not.toContain("honestly");
    expect(serialized).not.toContain("smallest part");
    expect(Object.values(vector.metrics).every(Number.isFinite)).toBe(true);
  });

  test("recognizes a similar response pattern across different questions", async () => {
    const { compareStyleVectors, extractStyleVector } =
      await loadStyleVector();

    const enrolled = extractStyleVector(enrolledAnswers);
    const returning = extractStyleVector(returningAnswers);
    const different = extractStyleVector([
      "YES!!! Absolutely incredible.",
      "Whatever works for me.",
      "Kindly be advised that the aforementioned matter requires extensive deliberation.",
    ]);

    expect(compareStyleVectors(enrolled, returning)).toBeGreaterThanOrEqual(
      0.72,
    );
    expect(compareStyleVectors(enrolled, different)).toBeLessThan(0.55);
  });
});
