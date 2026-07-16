import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

async function loadRequestGuard() {
  try {
    return await import("./same-origin-json");
  } catch {
    expect.fail("The same-origin JSON request guard is not implemented yet.");
  }
}

function request(headers: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/relay/requests", {
    method: "POST",
    headers,
    body: "{}",
  });
}

describe("same-origin JSON request guard", () => {
  test("accepts exact origin, host, and JSON content type", async () => {
    const { assertSameOriginJson } = await loadRequestGuard();

    expect(() =>
      assertSameOriginJson(
        request({
          Origin: "http://localhost:3000",
          Host: "localhost:3000",
          "Content-Type": "application/json; charset=utf-8",
        }),
        "http://localhost:3000",
      ),
    ).not.toThrow();
  });

  test.each([
    {
      name: "cross-site origin",
      headers: {
        Origin: "https://attacker.example",
        Host: "localhost:3000",
        "Content-Type": "application/json",
      },
    },
    {
      name: "forwarded host mismatch",
      headers: {
        Origin: "http://localhost:3000",
        Host: "attacker.example",
        "Content-Type": "application/json",
      },
    },
    {
      name: "non-JSON content",
      headers: {
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
        "Content-Type": "text/plain",
      },
    },
  ])("rejects $name", async ({ headers }) => {
    const { assertSameOriginJson } = await loadRequestGuard();

    expect(() =>
      assertSameOriginJson(request(headers), "http://localhost:3000"),
    ).toThrow("The request origin or content type is not allowed.");
  });
});
