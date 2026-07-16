import { z } from "zod";
import { postJson, type Fetcher } from "../../../lib/api-client";

const relayIdSchema = z.string().min(24).max(128);
const maskedDestinationSchema = z.string().regex(/^\*\*\*-\*\*\*-\d{4}$/);
const riskSchema = z.enum(["low", "medium", "high"]);

const demoSetupResponseSchema = z.object({
  relayHandle: z.string().regex(/^relay_[A-Za-z0-9_-]+$/),
  destination: maskedDestinationSchema,
  status: z.literal("demo_ready"),
  boundary: z.string().min(1).max(240),
});

const approvalResponseSchema = z.object({
  requestId: relayIdSchema,
  status: z.literal("challenge_sent"),
  summary: z.string().min(1).max(180),
  classificationSource: z.enum(["gpt-5.6", "conservative_fallback"]),
  finalRisk: riskSchema,
  factor: z.literal("sms_otp"),
  destination: maskedDestinationSchema,
  expiresAt: z.string().datetime(),
  demoCode: z.string().regex(/^\d{6}$/).optional(),
});

const receiptResponseSchema = z.object({
  receiptId: relayIdSchema,
  subject: relayIdSchema,
  purpose: z.enum([
    "login",
    "payment_approval",
    "account_change",
    "destructive_action",
    "data_access",
    "other",
  ]),
  risk: riskSchema,
  factor: z.literal("sms_otp"),
  verifiedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type DemoRelaySetup = z.infer<typeof demoSetupResponseSchema>;
export type PrivateApproval = z.infer<typeof approvalResponseSchema>;
export type VerificationReceipt = z.infer<typeof receiptResponseSchema>;

export function setupDemoRelay(
  input: { displayName: string; phone: string },
  fetcher?: Fetcher,
) {
  return postJson(
    "/api/relay/demo/setup",
    input,
    demoSetupResponseSchema,
    fetcher,
  );
}

export function createPrivateApproval(
  input: {
    relayHandle: string;
    serviceName: string;
    actionDescription: string;
    declaredRisk: "low" | "medium" | "high";
  },
  fetcher?: Fetcher,
) {
  return postJson(
    "/api/relay/requests",
    input,
    approvalResponseSchema,
    fetcher,
  );
}

export function verifyPrivateApproval(
  requestId: string,
  code: string,
  fetcher?: Fetcher,
) {
  return postJson(
    `/api/relay/requests/${encodeURIComponent(requestId)}/verify`,
    { code },
    receiptResponseSchema,
    fetcher,
  );
}
