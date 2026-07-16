import type Database from "better-sqlite3";
import { z } from "zod";
import { createUser } from "../db/passkey-repository";
import { saveEncryptedPhone } from "./identity-vault-repository";
import type { EncryptedPhoneDestination } from "./identity-vault";
import { maskPhoneDestination } from "./identity-vault";
import { saveRelayProfile } from "./relay-repository";

const demoRelaySetupSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

type DemoVault = {
  encryptPhone(userId: string, phone: string): EncryptedPhoneDestination;
};

type DemoRelaySetupDependencies = {
  vault: DemoVault;
  generateId: (
    prefix: "user" | "relay" | "subject" | "webauthn",
  ) => string;
};

export function setupDemoRelayProfile(
  database: Database.Database,
  input: unknown,
  dependencies: DemoRelaySetupDependencies,
) {
  const parsed = demoRelaySetupSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Enter a short display name and an E.164 phone number.");
  }

  const userId = dependencies.generateId("user");
  const relayHandle = dependencies.generateId("relay");
  const subjectId = dependencies.generateId("subject");
  const webauthnUserId = dependencies.generateId("webauthn");
  const encryptedPhone = dependencies.vault.encryptPhone(
    userId,
    parsed.data.phone,
  );
  const setup = database.transaction(() => {
    createUser(database, {
      id: userId,
      username: `${userId}@relay.invalid`,
      displayName: parsed.data.displayName,
      webauthnUserId,
    });
    saveRelayProfile(database, { userId, relayHandle, subjectId });
    saveEncryptedPhone(database, userId, encryptedPhone);
  });

  setup.immediate();

  return {
    relayHandle,
    destination: maskPhoneDestination(parsed.data.phone),
    status: "demo_ready" as const,
    boundary:
      "Simulated enrollment only. Real contact ownership verification is not implemented.",
  };
}
