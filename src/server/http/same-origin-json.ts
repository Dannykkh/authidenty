import type { NextRequest } from "next/server";

export class InvalidRequestContextError extends Error {
  constructor() {
    super("The request origin or content type is not allowed.");
    this.name = "InvalidRequestContextError";
  }
}

export function assertSameOriginJson(
  request: NextRequest,
  expectedOrigin: string,
) {
  const expected = new URL(expectedOrigin);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (
    origin !== expected.origin ||
    host !== expected.host ||
    contentType !== "application/json"
  ) {
    throw new InvalidRequestContextError();
  }
}
