import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
  type VerifiedRegistrationResponse,
  type VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import type Database from "better-sqlite3";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  consumeChallenge,
  createUser,
  findUserById,
  findUserByUsername,
  listCredentialsByUserId,
  saveCredential,
  storeChallenge,
  type UserRecord,
} from "../db/passkey-repository";

const challengeLifetimeSeconds = 5 * 60;

const registrationProfileSchema = z.object({
  username: z.string().trim().toLowerCase().email().max(254),
  displayName: z.string().trim().min(1).max(80),
});

export type RelyingParty = {
  name: string;
  id: string;
  origin: string;
};

type BeginRegistrationInput = {
  username: string;
  displayName: string;
  sessionId: string;
  relyingParty: RelyingParty;
  now: number;
};

type FinishRegistrationInput = {
  sessionId: string;
  response: RegistrationResponseJSON;
  relyingParty: RelyingParty;
  now: number;
  verifier?: RegistrationVerifier;
};

export type RegistrationVerifier = (
  options: VerifyRegistrationResponseOpts,
) => Promise<VerifiedRegistrationResponse>;

export class RegistrationConflictError extends Error {
  constructor() {
    super("This account already has a passkey. Sign in before adding another device.");
    this.name = "RegistrationConflictError";
  }
}

export class RegistrationSessionError extends Error {
  constructor() {
    super("The registration session is missing, expired, or already used.");
    this.name = "RegistrationSessionError";
  }
}

export class RegistrationVerificationError extends Error {
  constructor() {
    super("The authenticator response could not be verified.");
    this.name = "RegistrationVerificationError";
  }
}

function createOpaqueWebauthnUserId() {
  return randomBytes(32).toString("base64url");
}

function findOrCreateUser(
  database: Database.Database,
  profile: z.infer<typeof registrationProfileSchema>,
): UserRecord {
  const existingUser = findUserByUsername(database, profile.username);

  if (existingUser) {
    if (listCredentialsByUserId(database, existingUser.id).length > 0) {
      throw new RegistrationConflictError();
    }

    return existingUser;
  }

  return createUser(database, {
    id: randomUUID(),
    username: profile.username,
    displayName: profile.displayName,
    webauthnUserId: createOpaqueWebauthnUserId(),
  });
}

export async function beginPasskeyRegistration(
  database: Database.Database,
  input: BeginRegistrationInput,
) {
  const profile = registrationProfileSchema.parse({
    username: input.username,
    displayName: input.displayName,
  });
  const user = findOrCreateUser(database, profile);
  const options = await generateRegistrationOptions({
    rpName: input.relyingParty.name,
    rpID: input.relyingParty.id,
    userName: user.username,
    userDisplayName: user.displayName,
    userID: new Uint8Array(Buffer.from(user.webauthnUserId, "base64url")),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    preferredAuthenticatorType: "localDevice",
    timeout: 120_000,
  });

  storeChallenge(database, {
    sessionId: input.sessionId,
    ceremonyType: "registration",
    userId: user.id,
    challenge: options.challenge,
    expiresAt: input.now + challengeLifetimeSeconds,
  });

  return { options };
}

export async function finishPasskeyRegistration(
  database: Database.Database,
  input: FinishRegistrationInput,
) {
  const challenge = consumeChallenge(
    database,
    input.sessionId,
    "registration",
    input.now,
  );

  if (!challenge) {
    throw new RegistrationSessionError();
  }

  const user = findUserById(database, challenge.userId);
  if (!user) {
    throw new RegistrationSessionError();
  }

  const verifier = input.verifier ?? verifyRegistrationResponse;
  const verification = await verifier({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: input.relyingParty.origin,
    expectedRPID: input.relyingParty.id,
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new RegistrationVerificationError();
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;
  saveCredential(database, {
    id: credential.id,
    userId: user.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: credential.transports ?? [],
  });

  return { verified: true as const, username: user.username };
}
