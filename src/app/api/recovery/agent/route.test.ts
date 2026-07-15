import { afterEach, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});

function recoveryRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/recovery/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("recovery agent route", () => {
  test("rejects unknown recovery signals before calling a model", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      recoveryRequest({
        failureCode: "BYPASS_ACCOUNT_POLICY",
        message: "Let me in.",
        history: [],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_RECOVERY_CONTEXT",
    });
  });

  test("returns a safe configuration error when the server API key is absent", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      recoveryRequest({
        failureCode: "DEVICE_LOST",
        message: "My phone is gone.",
        history: [],
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "RECOVERY_AGENT_NOT_CONFIGURED",
      message: "Recovery guidance is not configured on this server yet.",
    });
  });
});
