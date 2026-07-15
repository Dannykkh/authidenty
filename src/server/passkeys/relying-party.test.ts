import { afterEach, describe, expect, test } from "vitest";
import { resolveRelyingParty } from "./relying-party";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("WebAuthn relying-party configuration", () => {
  test("uses localhost only during development", () => {
    expect(resolveRelyingParty({ nodeEnv: "development" })).toEqual({
      name: "Authidenty",
      id: "localhost",
      origin: "http://localhost:3000",
    });
  });

  test("requires explicit production values", () => {
    expect(() => resolveRelyingParty({ nodeEnv: "production" })).toThrow(
      "WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN",
    );
  });

  test("rejects an origin outside the relying-party domain", () => {
    expect(() =>
      resolveRelyingParty({
        nodeEnv: "production",
        rpId: "authidenty.example",
        origin: "https://attacker.example",
      }),
    ).toThrow("must match the WebAuthn RP ID");
  });
});
