import { describe, expect, test } from "vitest";
import { openDatabase } from "../db/database";
import { findEncryptedPhoneByUserId } from "./identity-vault-repository";
import { createIdentityVaultCipher } from "./identity-vault";

async function loadDemoRelaySetup() {
  try {
    return await import("./demo-relay-setup");
  } catch {
    expect.fail("The demo relay setup service is not implemented yet.");
  }
}

function generateId(prefix: string) {
  const id = `${prefix}_0123456789abcdefghijkl`;
  return prefix === "webauthn" ? `${id}_id` : id;
}

describe("demo private relay setup", () => {
  test("stores the contact destination only as user-bound ciphertext", async () => {
    const { setupDemoRelayProfile } = await loadDemoRelaySetup();
    const database = openDatabase(":memory:");
    const vault = createIdentityVaultCipher({
      activeKeyVersion: "demo-v1",
      keys: { "demo-v1": Buffer.alloc(32, 7) },
    });

    try {
      const result = setupDemoRelayProfile(
        database,
        { displayName: "Casey", phone: "+12025550184" },
        { vault, generateId },
      );

      expect(result).toEqual({
        relayHandle: "relay_0123456789abcdefghijkl",
        destination: "***-***-0184",
        status: "demo_ready",
        boundary:
          "Simulated enrollment only. Real contact ownership verification is not implemented.",
      });
      expect(
        database
          .prepare(
            `SELECT username, display_name
             FROM users
             WHERE id = ?`,
          )
          .get("user_0123456789abcdefghijkl"),
      ).toEqual({
        username: "user_0123456789abcdefghijkl@relay.invalid",
        display_name: "Casey",
      });
      const encrypted = findEncryptedPhoneByUserId(
        database,
        "user_0123456789abcdefghijkl",
      );
      expect(encrypted).not.toBeNull();
      expect(encrypted?.ciphertext.includes(Buffer.from("+12025550184"))).toBe(
        false,
      );
      expect(
        vault.decryptPhone("user_0123456789abcdefghijkl", encrypted!),
      ).toBe("+12025550184");
    } finally {
      database.close();
    }
  });

  test("rejects malformed destinations before writing an account", async () => {
    const { setupDemoRelayProfile } = await loadDemoRelaySetup();
    const database = openDatabase(":memory:");
    const vault = createIdentityVaultCipher({
      activeKeyVersion: "demo-v1",
      keys: { "demo-v1": Buffer.alloc(32, 7) },
    });

    try {
      expect(() =>
        setupDemoRelayProfile(
          database,
          { displayName: "Casey", phone: "010-1234-0184" },
          { vault, generateId },
        ),
      ).toThrow("Enter a short display name and an E.164 phone number.");
      expect(
        database.prepare("SELECT COUNT(*) AS count FROM users").get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
