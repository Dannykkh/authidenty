import type {
  RegistrationResponseJSON,
  VerifiedRegistrationResponse,
  VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { describe, expect, test, vi } from "vitest";
import { openDatabase } from "../db/database";
import {
  createUser,
  findUserByUsername,
  listCredentialsByUserId,
  saveCredential,
} from "../db/passkey-repository";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  RegistrationConflictError,
  RegistrationSessionError,
  type RegistrationVerifier,
} from "./registration-service";

const rp = {
  name: "Authidenty",
  id: "localhost",
  origin: "http://localhost:3000",
};

const browserResponse = {
  id: "new-credential",
  rawId: "new-credential",
  response: {
    attestationObject: "attestation",
    clientDataJSON: "client-data",
    transports: ["internal"],
    publicKeyAlgorithm: -7,
    publicKey: "public-key",
    authenticatorData: "authenticator-data",
  },
  type: "public-key",
  clientExtensionResults: {},
  authenticatorAttachment: "platform",
} as RegistrationResponseJSON;

function verifiedRegistration(): VerifiedRegistrationResponse {
  return {
    verified: true,
    registrationInfo: {
      fmt: "none",
      aaguid: "00000000-0000-0000-0000-000000000000",
      credential: {
        id: "new-credential",
        publicKey: new Uint8Array([9, 8, 7]),
        counter: 0,
        transports: ["internal"],
      },
      credentialType: "public-key",
      attestationObject: new Uint8Array([1]),
      userVerified: true,
      credentialDeviceType: "multiDevice",
      credentialBackedUp: true,
      origin: rp.origin,
      rpID: rp.id,
    },
  };
}

describe("passkey registration service", () => {
  test("creates privacy-preserving registration options and a short-lived challenge", async () => {
    const database = openDatabase(":memory:");

    try {
      const result = await beginPasskeyRegistration(database, {
        username: "  Casey@Example.com ",
        displayName: " Casey ",
        sessionId: "session-1",
        relyingParty: rp,
        now: 1_900_000_000,
      });

      expect(result.options.rp).toMatchObject({ id: rp.id, name: rp.name });
      expect(result.options.user.name).toBe("casey@example.com");
      expect(result.options.user.displayName).toBe("Casey");
      expect(result.options.user.id).not.toContain("casey");
      expect(result.options.authenticatorSelection).toMatchObject({
        residentKey: "required",
        userVerification: "required",
      });

      const user = findUserByUsername(database, "casey@example.com");
      expect(user).not.toBeNull();
      expect(result.options.user.id).toBe(user?.webauthnUserId);
    } finally {
      database.close();
    }
  });

  test("blocks unauthenticated re-enrollment for an account that already has a passkey", async () => {
    const database = openDatabase(":memory:");

    try {
      createUser(database, {
        id: "user-1",
        username: "casey@example.com",
        displayName: "Casey",
        webauthnUserId: "A".repeat(43),
      });
      saveCredential(database, {
        id: "existing-credential",
        userId: "user-1",
        publicKey: new Uint8Array([1]),
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        transports: ["internal"],
      });

      await expect(
        beginPasskeyRegistration(database, {
          username: "casey@example.com",
          displayName: "Casey",
          sessionId: "session-1",
          relyingParty: rp,
          now: 1_900_000_000,
        }),
      ).rejects.toBeInstanceOf(RegistrationConflictError);
    } finally {
      database.close();
    }
  });

  test("verifies the response and stores only reusable credential fields", async () => {
    const database = openDatabase(":memory:");
    let verifierInput: VerifyRegistrationResponseOpts | undefined;
    const verifier: RegistrationVerifier = vi.fn(async (input) => {
      verifierInput = input;
      return verifiedRegistration();
    });

    try {
      await beginPasskeyRegistration(database, {
        username: "casey@example.com",
        displayName: "Casey",
        sessionId: "session-1",
        relyingParty: rp,
        now: 1_900_000_000,
      });

      const result = await finishPasskeyRegistration(database, {
        sessionId: "session-1",
        response: browserResponse,
        relyingParty: rp,
        now: 1_900_000_001,
        verifier,
      });

      expect(result).toEqual({ verified: true, username: "casey@example.com" });
      expect(verifierInput).toMatchObject({
        response: browserResponse,
        expectedOrigin: rp.origin,
        expectedRPID: rp.id,
        requireUserVerification: true,
      });

      const user = findUserByUsername(database, "casey@example.com");
      expect(listCredentialsByUserId(database, user!.id)).toEqual([
        {
          id: "new-credential",
          userId: user!.id,
          publicKey: new Uint8Array([9, 8, 7]),
          counter: 0,
          deviceType: "multiDevice",
          backedUp: true,
          transports: ["internal"],
        },
      ]);
    } finally {
      database.close();
    }
  });

  test("consumes the challenge even when verification fails", async () => {
    const database = openDatabase(":memory:");
    const verifier: RegistrationVerifier = vi.fn(async () => {
      throw new Error("invalid attestation");
    });

    try {
      await beginPasskeyRegistration(database, {
        username: "casey@example.com",
        displayName: "Casey",
        sessionId: "session-1",
        relyingParty: rp,
        now: 1_900_000_000,
      });

      await expect(
        finishPasskeyRegistration(database, {
          sessionId: "session-1",
          response: browserResponse,
          relyingParty: rp,
          now: 1_900_000_001,
          verifier,
        }),
      ).rejects.toThrow("invalid attestation");

      await expect(
        finishPasskeyRegistration(database, {
          sessionId: "session-1",
          response: browserResponse,
          relyingParty: rp,
          now: 1_900_000_002,
          verifier,
        }),
      ).rejects.toBeInstanceOf(RegistrationSessionError);
      expect(verifier).toHaveBeenCalledTimes(1);
    } finally {
      database.close();
    }
  });
});
