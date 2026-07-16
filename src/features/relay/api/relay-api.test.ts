import { describe, expect, test, vi } from "vitest";

async function loadRelayApi() {
  try {
    return await import("./relay-api");
  } catch {
    expect.fail("The relay browser API client is not implemented yet.");
  }
}

describe("relay browser API", () => {
  test("submits a private approval and validates the bounded response", async () => {
    const { createPrivateApproval } = await loadRelayApi();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          requestId: "request_0123456789abcdefghijkl",
          status: "challenge_sent",
          summary: "OpenClaw requests approval for a supplier transfer.",
          classificationSource: "gpt-5.6",
          finalRisk: "high",
          factor: "sms_otp",
          destination: "***-***-0184",
          expiresAt: "2030-03-17T17:51:40.000Z",
          demoCode: "184205",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await createPrivateApproval(
      {
        relayHandle: "relay_0123456789abcdefghijkl",
        serviceName: "OpenClaw",
        actionDescription: "Approve a transfer to the saved supplier.",
        declaredRisk: "high",
      },
      fetcher,
    );

    expect(result.classificationSource).toBe("gpt-5.6");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/relay/requests",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("rejects malformed success data instead of trusting it", async () => {
    const { setupDemoRelay } = await loadRelayApi();
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ relayHandle: "raw-phone-leak" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      setupDemoRelay(
        { displayName: "Build Week tester", phone: "+12025550184" },
        fetcher,
      ),
    ).rejects.toThrow("The server returned an unexpected response.");
  });

  test("uses the safe server message for rejected requests", async () => {
    const { verifyPrivateApproval } = await loadRelayApi();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "RELAY_VERIFICATION_FAILED",
          message: "The verification request could not be completed.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      verifyPrivateApproval(
        "request_0123456789abcdefghijkl",
        "000000",
        fetcher,
      ),
    ).rejects.toThrow("The verification request could not be completed.");
  });
});
