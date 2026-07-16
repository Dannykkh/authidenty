import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

async function loadConversationRoutes() {
  try {
    const [enroll, match, verify] = await Promise.all([
      import("./enroll/route"),
      import("./match/route"),
      import("./challenges/[challengeId]/verify/route"),
    ]);
    return {
      enroll: enroll.POST,
      match: match.POST,
      verify: verify.POST,
    };
  } catch (error) {
    expect.fail(
      error instanceof Error
        ? `The conversational API routes could not load: ${error.name}: ${error.message}`
        : "The conversational API routes could not load.",
    );
  }
}

function crossOriginRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      Host: "localhost:3000",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
}

describe("conversational identity route wiring", () => {
  test("rejects cross-origin enrollment, match, and verification before runtime access", async () => {
    const routes = await loadConversationRoutes();

    const [enrollResponse, matchResponse, verifyResponse] =
      await Promise.all([
        routes.enroll(
          crossOriginRequest("/api/conversation/enroll"),
        ),
        routes.match(crossOriginRequest("/api/conversation/match")),
        routes.verify(
          crossOriginRequest(
            "/api/conversation/challenges/challenge-1/verify",
          ),
          {
            params: Promise.resolve({ challengeId: "challenge-1" }),
          },
        ),
      ]);

    expect(enrollResponse.status).toBe(403);
    expect(matchResponse.status).toBe(403);
    expect(verifyResponse.status).toBe(403);
  });
});
