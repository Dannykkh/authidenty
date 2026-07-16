import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

async function loadRelayRoutes() {
  try {
    const [setup, request, verify] = await Promise.all([
      import("./demo/setup/route"),
      import("./requests/route"),
      import("./requests/[requestId]/verify/route"),
    ]);
    return { setup: setup.POST, request: request.POST, verify: verify.POST };
  } catch (error) {
    expect.fail(
      error instanceof Error
        ? `The private relay API routes could not load: ${error.name}: ${error.message}`
        : "The private relay API routes could not load.",
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

describe("private relay route wiring", () => {
  test("rejects cross-origin setup, request, and verification before runtime access", async () => {
    const routes = await loadRelayRoutes();

    const [setupResponse, requestResponse, verifyResponse] = await Promise.all([
      routes.setup(crossOriginRequest("/api/relay/demo/setup")),
      routes.request(crossOriginRequest("/api/relay/requests")),
      routes.verify(
        crossOriginRequest("/api/relay/requests/request-1/verify"),
        { params: Promise.resolve({ requestId: "request-1" }) },
      ),
    ]);

    expect(setupResponse.status).toBe(403);
    expect(requestResponse.status).toBe(403);
    expect(verifyResponse.status).toBe(403);
  });
});
