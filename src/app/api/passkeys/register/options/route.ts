import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { getDatabase } from "@/server/db/database";
import {
  beginPasskeyRegistration,
  RegistrationConflictError,
} from "@/server/passkeys/registration-service";
import { resolveRelyingParty } from "@/server/passkeys/relying-party";

export const runtime = "nodejs";

const registrationCookie = "authidenty_registration";
const registrationCookiePath = "/api/passkeys/register";

export async function POST(request: NextRequest) {
  try {
    const relyingParty = resolveRelyingParty();
    const body = (await request.json()) as {
      username?: string;
      displayName?: string;
    };
    const sessionId = randomUUID();
    const result = await beginPasskeyRegistration(getDatabase(), {
      username: body.username ?? "",
      displayName: body.displayName ?? "",
      sessionId,
      relyingParty,
      now: Math.floor(Date.now() / 1000),
    });
    const response = NextResponse.json(result.options);
    response.cookies.set({
      name: registrationCookie,
      value: sessionId,
      httpOnly: true,
      sameSite: "strict",
      secure: relyingParty.origin.startsWith("https://"),
      path: registrationCookiePath,
      maxAge: 5 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: "INVALID_PROFILE",
          message: "Enter a valid email address and a display name.",
        },
        { status: 400 },
      );
    }

    if (error instanceof RegistrationConflictError) {
      return NextResponse.json(
        {
          code: "ACCOUNT_REQUIRES_SIGN_IN",
          message: "This account must sign in before adding another passkey.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Passkey registration options failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { code: "REGISTRATION_UNAVAILABLE", message: "Passkey setup is unavailable right now." },
      { status: 500 },
    );
  }
}
