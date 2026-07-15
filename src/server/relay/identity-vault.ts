import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const e164PhonePattern = /^\+[1-9]\d{7,14}$/;
const algorithm = "aes-256-gcm";

export type EncryptedPhoneDestination = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
};

type IdentityVaultCipherConfig = {
  activeKeyVersion: string;
  keys: Record<string, Buffer>;
};

function validatePhone(phone: string) {
  if (!e164PhonePattern.test(phone)) {
    throw new Error("Phone number must use E.164 format.");
  }
}

function authenticatedData(userId: string, keyVersion: string) {
  return Buffer.from(`authidenty:identity-vault:phone:${keyVersion}:${userId}`, "utf8");
}

export function createIdentityVaultCipher(config: IdentityVaultCipherConfig) {
  const keys = Object.fromEntries(
    Object.entries(config.keys).map(([version, key]) => {
      if (key.length !== 32) {
        throw new Error("Identity vault keys must contain exactly 32 bytes.");
      }

      return [version, Buffer.from(key)];
    }),
  );
  const activeKey = keys[config.activeKeyVersion];

  if (!activeKey) {
    throw new Error("The active identity vault key version is not configured.");
  }

  return {
    encryptPhone(userId: string, phone: string): EncryptedPhoneDestination {
      validatePhone(phone);
      const iv = randomBytes(12);
      const cipher = createCipheriv(algorithm, activeKey, iv);
      cipher.setAAD(authenticatedData(userId, config.activeKeyVersion));
      const ciphertext = Buffer.concat([
        cipher.update(phone, "utf8"),
        cipher.final(),
      ]);

      return {
        ciphertext,
        iv,
        authTag: cipher.getAuthTag(),
        keyVersion: config.activeKeyVersion,
      };
    },

    decryptPhone(userId: string, encrypted: EncryptedPhoneDestination): string {
      const key = keys[encrypted.keyVersion];

      if (!key) {
        throw new Error("Contact destination could not be decrypted.");
      }

      try {
        const decipher = createDecipheriv(algorithm, key, encrypted.iv);
        decipher.setAAD(authenticatedData(userId, encrypted.keyVersion));
        decipher.setAuthTag(encrypted.authTag);
        const phone = Buffer.concat([
          decipher.update(encrypted.ciphertext),
          decipher.final(),
        ]).toString("utf8");
        validatePhone(phone);
        return phone;
      } catch {
        throw new Error("Contact destination could not be decrypted.");
      }
    },
  };
}

export function maskPhoneDestination(phone: string) {
  validatePhone(phone);
  return `***-***-${phone.slice(-4)}`;
}
