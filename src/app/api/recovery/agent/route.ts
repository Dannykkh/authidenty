import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  createRecoveryGuidance,
  parseRecoveryRequest,
} from "../../../../server/recovery/recovery-agent";
import { createOpenAIRecoveryModel } from "../../../../server/recovery/openai-recovery-model";

export const runtime = "nodejs";

const recoveryCookie = "authidenty_recovery";
const recoveryCookiePath = "/api/recovery";

function invalidContextResponse() {
  return NextResponse.json(
    {
      code: "INVALID_RECOVERY_CONTEXT",
      message: "Choose a known sign-in problem and keep each message under 500 characters.",
    },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  let recoveryRequest;

  try {
    recoveryRequest = parseRecoveryRequest(await request.json());
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return invalidContextResponse();
    }

    throw error;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        code: "RECOVERY_AGENT_NOT_CONFIGURED",
        message: "Recovery guidance is not configured on this server yet.",
      },
      { status: 503 },
    );
  }

  const existingSession = request.cookies.get(recoveryCookie)?.value;
  const sessionId = existingSession ?? randomUUID();
  const safetyIdentifier = createHash("sha256").update(sessionId).digest("hex");

  try {
    const guidance = await createRecoveryGuidance(
      recoveryRequest,
      createOpenAIRecoveryModel(apiKey),
      safetyIdentifier,
    );
    const response = NextResponse.json({
      ...guidance,
      model: "gpt-5.6",
      boundary: "Guidance only. Authidenty security policy still controls re-enrollment.",
    });

    if (!existingSession) {
      response.cookies.set({
        name: recoveryCookie,
        value: sessionId,
        httpOnly: true,
        sameSite: "strict",
        secure: request.nextUrl.protocol === "https:",
        path: recoveryCookiePath,
        maxAge: 30 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error(
      "Recovery guidance failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        code: "RECOVERY_AGENT_UNAVAILABLE",
        message: "Recovery guidance is temporarily unavailable. No security decision was made.",
      },
      { status: 502 },
    );
  }
}
