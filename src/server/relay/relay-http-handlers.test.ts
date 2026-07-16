import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { RelayConfigurationError } from "./relay-runtime";
import {
  RelayRequestRejectedError,
  RelayVerificationError,
} from "./relay-service";

async function loadRelayHttpHandlers() {
  try {
    return await import("./relay-http-handlers");
  } catch {
    expect.fail("The relay HTTP handlers are not implemented yet.");
  }
}

function jsonRequest(path: string, body: unknown, origin = "http://localhost:3000") {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      Host: "localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("private relay HTTP handlers", () => {
  test("returns bounded setup, request, and verification responses", async () => {
    const {
      handleDemoRelaySetup,
      handleRelayRequestCreation,
      handleRelayVerification,
    } = await loadRelayHttpHandlers();
    const setup = vi.fn(() => ({
      relayHandle: "relay_0123456789abcdefghijkl",
      destination: "***-***-0184",
      status: "demo_ready" as const,
      boundary: "Simulated enrollment only.",
    }));
    const createRequest = vi.fn(async () => ({
      requestId: "request_0123456789abcdefghijkl",
      status: "challenge_sent" as const,
      summary: "Approve a test action.",
      classificationSource: "gpt-5.6" as const,
      finalRisk: "high" as const,
      factor: "sms_otp" as const,
      destination: "***-***-0184",
      expiresAt: "2030-03-17T17:51:40.000Z",
      demoCode: "184205",
    }));
    const verify = vi.fn(() => ({
      receiptId: "receipt_0123456789abcdefghijkl",
      subject: "subject_0123456789abcdefghij",
      purpose: "other" as const,
      risk: "high" as const,
      factor: "sms_otp" as const,
      verifiedAt: "2030-03-17T17:46:50.000Z",
      expiresAt: "2030-03-17T17:51:50.000Z",
    }));

    const setupResponse = await handleDemoRelaySetup(
      jsonRequest("/api/relay/demo/setup", {
        displayName: "Casey",
        phone: "+12025550184",
      }),
      { expectedOrigin: "http://localhost:3000", setup },
    );
    const requestResponse = await handleRelayRequestCreation(
      jsonRequest("/api/relay/requests", {
        relayHandle: "relay_0123456789abcdefghijkl",
        serviceName: "OpenClaw",
        actionDescription: "Approve a test action.",
        declaredRisk: "high",
      }),
      { expectedOrigin: "http://localhost:3000", createRequest },
    );
    const verifyResponse = await handleRelayVerification(
      jsonRequest(
        "/api/relay/requests/request_0123456789abcdefghijkl/verify",
        { code: "184205" },
      ),
      "request_0123456789abcdefghijkl",
      { expectedOrigin: "http://localhost:3000", verify },
    );

    expect(setupResponse.status).toBe(201);
    expect(requestResponse.status).toBe(201);
    expect(verifyResponse.status).toBe(200);
    await expect(setupResponse.json()).resolves.toMatchObject({
      destination: "***-***-0184",
    });
    await expect(requestResponse.json()).resolves.toMatchObject({
      classificationSource: "gpt-5.6",
      demoCode: "184205",
      finalRisk: "high",
    });
    await expect(verifyResponse.json()).resolves.toMatchObject({
      receiptId: "receipt_0123456789abcdefghijkl",
    });
    expect(verify).toHaveBeenCalledWith({
      requestId: "request_0123456789abcdefghijkl",
      code: "184205",
    });
  });

  test("rejects cross-origin requests before invoking the domain", async () => {
    const { handleRelayRequestCreation } = await loadRelayHttpHandlers();
    const createRequest = vi.fn();

    const response = await handleRelayRequestCreation(
      jsonRequest(
        "/api/relay/requests",
        { relayHandle: "relay_0123456789abcdefghijkl" },
        "https://attacker.example",
      ),
      { expectedOrigin: "http://localhost:3000", createRequest },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: "REQUEST_NOT_ALLOWED",
      message: "The request origin or content type is not allowed.",
    });
    expect(createRequest).not.toHaveBeenCalled();
  });

  test.each([
    {
      name: "configuration",
      error: new RelayConfigurationError(),
      status: 503,
      code: "RELAY_NOT_CONFIGURED",
    },
    {
      name: "request validation",
      error: new RelayRequestRejectedError(),
      status: 400,
      code: "RELAY_REQUEST_REJECTED",
    },
    {
      name: "verification",
      error: new RelayVerificationError(),
      status: 400,
      code: "RELAY_VERIFICATION_FAILED",
    },
  ])("maps $name errors without internal details", async ({ error, status, code }) => {
    const {
      handleRelayRequestCreation,
      handleRelayVerification,
    } = await loadRelayHttpHandlers();
    const operation = vi.fn(async () => {
      throw error;
    });
    const response =
      error instanceof RelayVerificationError
        ? await handleRelayVerification(
            jsonRequest("/api/relay/requests/request-1/verify", {
              code: "184205",
            }),
            "request-1",
            {
              expectedOrigin: "http://localhost:3000",
              verify: operation,
            },
          )
        : await handleRelayRequestCreation(
            jsonRequest("/api/relay/requests", {}),
            {
              expectedOrigin: "http://localhost:3000",
              createRequest: operation,
            },
          );

    expect(response.status).toBe(status);
    const responseCopy = response.clone();
    await expect(response.json()).resolves.toMatchObject({ code });
    await expect(responseCopy.text()).resolves.not.toContain(
      "provider account details",
    );
  });
});
