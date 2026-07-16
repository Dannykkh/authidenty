import { randomInt, randomUUID } from "node:crypto";
import { createIdentityVaultCipher } from "../relay/identity-vault";
import type {
  ConversationNotificationAdapter,
  ConversationPatternAnalyzer,
} from "./conversation-service";
import { createOpenAIPatternAnalyzer } from "./openai-pattern-analyzer";

type ConversationEnvironment = Record<string, string | undefined>;

export class ConversationConfigurationError extends Error {
  constructor() {
    super("Conversational verification is not configured.");
    this.name = "ConversationConfigurationError";
  }
}

function decodeSecret(value: string | undefined) {
  if (!value) {
    throw new ConversationConfigurationError();
  }

  const secret = Buffer.from(value, "base64");
  if (secret.length !== 32) {
    throw new ConversationConfigurationError();
  }

  return secret;
}

function unavailableAnalyzer(): ConversationPatternAnalyzer {
  return {
    async analyze() {
      throw new Error("OpenAI pattern analysis is not configured.");
    },
  };
}

export function createSimulatedConversationNotificationAdapter(): ConversationNotificationAdapter {
  return {
    async send(input) {
      return {
        status: "delivered",
        previewCode: input.code,
      };
    },
  };
}

export function createConversationRuntime(
  environment: ConversationEnvironment = process.env,
) {
  const vaultKey = decodeSecret(
    environment.AUTHIDENTY_VAULT_KEY_BASE64,
  );
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
    analyzer: apiKey
      ? createOpenAIPatternAnalyzer(apiKey)
      : unavailableAnalyzer(),
    notificationAdapter:
      createSimulatedConversationNotificationAdapter(),
    generateCode: () =>
      randomInt(0, 1_000_000).toString().padStart(6, "0"),
    generateId: (prefix: string) => `${prefix}_${randomUUID()}`,
    now: () => Math.floor(Date.now() / 1000),
  };
}
