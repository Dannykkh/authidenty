import { z } from "zod";
import { postJson, type Fetcher } from "../../../lib/api-client";

const identifierSchema = z.string().min(24).max(128);
const maskedDestinationSchema = z
  .string()
  .regex(/^\*\*\*-\*\*\*-\d{4}$/);
type ConversationAnswers = string[];

const enrollmentResponseSchema = z.object({
  profileId: identifierSchema,
  status: z.literal("enrolled"),
  displayName: z.string().min(1).max(80),
  destination: maskedDestinationSchema,
  sampleCount: z.number().int().min(3).max(6),
});

const noMatchResponseSchema = z.object({
  status: z.literal("no_match"),
  explanation: z.string().min(1).max(280),
});

const challengeResponseSchema = z.object({
  status: z.literal("challenge_sent"),
  challengeId: identifierSchema,
  candidate: z.object({
    displayName: z.string().min(1).max(80),
    destination: maskedDestinationSchema,
  }),
  score: z.number().min(0).max(1),
  analysisSource: z.enum(["gpt-5.6", "conservative_fallback"]),
  explanation: z.string().min(1).max(280),
  factor: z.literal("sms_otp"),
  demoCode: z.string().regex(/^\d{6}$/).optional(),
});

const matchResponseSchema = z.discriminatedUnion("status", [
  noMatchResponseSchema,
  challengeResponseSchema,
]);

const verificationResponseSchema = z.object({
  status: z.literal("verified"),
  displayName: z.string().min(1).max(80),
  destination: maskedDestinationSchema,
  factor: z.literal("sms_otp"),
  verifiedAt: z.string().datetime(),
});

export type ConversationEnrollment = z.infer<
  typeof enrollmentResponseSchema
>;
export type ConversationMatch = z.infer<typeof matchResponseSchema>;
export type ConversationChallenge = z.infer<
  typeof challengeResponseSchema
>;
export type ConversationVerification = z.infer<
  typeof verificationResponseSchema
>;

export function enrollConversationProfile(
  input: {
    displayName: string;
    phone: string;
    answers: ConversationAnswers;
  },
  fetcher?: Fetcher,
) {
  return postJson(
    "/api/conversation/enroll",
    input,
    enrollmentResponseSchema,
    fetcher,
  );
}

export function matchConversationProfile(
  input: { answers: ConversationAnswers },
  fetcher?: Fetcher,
) {
  return postJson(
    "/api/conversation/match",
    input,
    matchResponseSchema,
    fetcher,
  );
}

export function verifyConversationChallenge(
  challengeId: string,
  code: string,
  fetcher?: Fetcher,
) {
  return postJson(
    `/api/conversation/challenges/${encodeURIComponent(challengeId)}/verify`,
    { code },
    verificationResponseSchema,
    fetcher,
  );
}
