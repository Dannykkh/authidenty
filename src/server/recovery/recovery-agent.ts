import { z } from "zod";

export const recoveryFailureCodeSchema = z.enum([
  "DEVICE_LOST",
  "PASSKEY_NOT_FOUND",
  "PROMPT_CANCELLED",
  "USER_VERIFICATION_FAILED",
  "RECOVERY_FACTOR_UNAVAILABLE",
]);

export const recoveryActionSchema = z.enum([
  "retry_passkey",
  "use_another_device",
  "use_recovery_factor",
  "contact_support",
]);

const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(500),
});

export const recoveryRequestSchema = z.object({
  failureCode: recoveryFailureCodeSchema,
  message: z.string().trim().min(1).max(500),
  history: z.array(conversationMessageSchema).max(6).default([]),
});

export const recoveryReplySchema = z.object({
  diagnosis: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .describe("A brief explanation of the likely passkey failure, without claiming certainty."),
  guidance: z
    .string()
    .trim()
    .min(1)
    .max(700)
    .describe("A concise, calm explanation of the next secure step."),
  actions: z
    .array(recoveryActionSchema)
    .min(1)
    .max(3)
    .describe("Only actions that the Authidenty server permits the interface to show."),
});

export type RecoveryRequest = z.infer<typeof recoveryRequestSchema>;
export type RecoveryReply = z.infer<typeof recoveryReplySchema>;

export type RecoveryModelInput = RecoveryRequest & {
  safetyIdentifier: string;
};

export interface RecoveryModel {
  generate(input: RecoveryModelInput): Promise<unknown>;
}

export function parseRecoveryRequest(input: unknown): RecoveryRequest {
  return recoveryRequestSchema.parse(input);
}

export async function createRecoveryGuidance(
  request: unknown,
  model: RecoveryModel,
  safetyIdentifier: string,
): Promise<RecoveryReply> {
  const input = parseRecoveryRequest(request);
  const output = await model.generate({
    ...input,
    safetyIdentifier,
  });

  return recoveryReplySchema.parse(output);
}
