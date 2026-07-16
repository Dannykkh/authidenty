import { randomInt, randomUUID } from "node:crypto";
import type { RelayActionClassifier } from "./openai-action-classifier";
import { createOpenAIActionClassifier } from "./openai-action-classifier";
import { createIdentityVaultCipher } from "./identity-vault";
import type { RelayNotificationAdapter } from "./relay-service";

type RelayEnvironment = Record<string, string | undefined>;

export class RelayConfigurationError extends Error {
  constructor() {
    super("Private relay encryption is not configured.");
    this.name = "RelayConfigurationError";
  }
}

function decodeSecret(value: string | undefined) {
  if (!value) {
    throw new RelayConfigurationError();
  }

  const secret = Buffer.from(value, "base64");

  if (secret.length !== 32) {
    throw new RelayConfigurationError();
  }

  return secret;
}

function unavailableClassifier(): RelayActionClassifier {
  return {
    async classify() {
      throw new Error("OpenAI action classification is not configured.");
    },
  };
}

export function createSimulatedNotificationAdapter(): RelayNotificationAdapter {
  return {
    async send(input) {
      return { status: "delivered", previewCode: input.code };
    },
  };
}

export function createRelayRuntime(environment: RelayEnvironment = process.env) {
  const vaultKey = decodeSecret(environment.AUTHIDENTY_VAULT_KEY_BASE64);
  const challengeSecret = decodeSecret(
    environment.AUTHIDENTY_CHALLENGE_SECRET_BASE64,
  );
  const apiKey = environment.OPENAI_API_KEY?.trim();

  return {
    vault: createIdentityVaultCipher({
      activeKeyVersion: "env-v1",
      keys: { "env-v1": vaultKey },
    }),
    challengeSecret,
    classifier: apiKey
      ? createOpenAIActionClassifier(apiKey)
      : unavailableClassifier(),
    notificationAdapter: createSimulatedNotificationAdapter(),
    generateCode: () => randomInt(0, 1_000_000).toString().padStart(6, "0"),
    generateId: (prefix: string) => `${prefix}_${randomUUID()}`,
    now: () => Math.floor(Date.now() / 1000),
  };
}
