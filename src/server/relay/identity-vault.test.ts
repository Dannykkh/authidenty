import { describe, expect, test } from "vitest";

async function loadIdentityVault() {
  try {
    return await import("./identity-vault");
  } catch {
    expect.fail("The identity vault module is not implemented yet.");
  }
}

describe("identity vault", () => {
  test("encrypts an E.164 phone number with user-bound authenticated encryption", async () => {
    const { createIdentityVaultCipher } = await loadIdentityVault();
    const vault = createIdentityVaultCipher({
      activeKeyVersion: "demo-v1",
      keys: { "demo-v1": Buffer.alloc(32, 7) },
    });

    const encrypted = vault.encryptPhone("user-1", "+12025550184");

    expect(encrypted.keyVersion).toBe("demo-v1");
    expect(encrypted.iv).toHaveLength(12);
    expect(encrypted.authTag).toHaveLength(16);
    expect(encrypted.ciphertext.includes(Buffer.from("+12025550184"))).toBe(false);
    expect(vault.decryptPhone("user-1", encrypted)).toBe("+12025550184");
    expect(() => vault.decryptPhone("user-2", encrypted)).toThrow(
      "Contact destination could not be decrypted.",
    );
  });

  test("rejects invalid phone numbers and invalid AES keys", async () => {
    const { createIdentityVaultCipher } = await loadIdentityVault();

    expect(() =>
      createIdentityVaultCipher({
        activeKeyVersion: "bad-v1",
        keys: { "bad-v1": Buffer.alloc(16) },
      }),
    ).toThrow("Identity vault keys must contain exactly 32 bytes.");

    const vault = createIdentityVaultCipher({
      activeKeyVersion: "demo-v1",
      keys: { "demo-v1": Buffer.alloc(32, 9) },
    });

    expect(() => vault.encryptPhone("user-1", "010-1234-0184")).toThrow(
      "Phone number must use E.164 format.",
    );
  });

  test("masks the destination without exposing country or subscriber digits", async () => {
    const { maskPhoneDestination } = await loadIdentityVault();

    expect(maskPhoneDestination("+12025550184")).toBe("***-***-0184");
    expect(maskPhoneDestination("+12025550199")).toBe("***-***-0199");
  });
});
