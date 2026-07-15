import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/server/db/database";
import {
  finishPasskeyRegistration,
  RegistrationSessionError,
  RegistrationVerificationError,
} from "@/server/passkeys/registration-service";
import { resolveRelyingParty } from "@/server/passkeys/relying-party";

export const runtime = "nodejs";

const registrationCookie = "authidenty_registration";
const registrationCookiePath = "/api/passkeys/register";

function clearRegistrationCookie(response: NextResponse) {
  response.cookies.set({
    name: registrationCookie,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: resolveRelyingParty().origin.startsWith("https://"),
    path: registrationCookiePath,
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(registrationCookie)?.value;

  if (!sessionId) {
    return NextResponse.json(
      { code: "REGISTRATION_SESSION_MISSING", message: "Start passkey setup again." },
      { status: 400 },
    );
  }

  try {
    const result = await finishPasskeyRegistration(getDatabase(), {
      sessionId,
      response: (await request.json()) as RegistrationResponseJSON,
      relyingParty: resolveRelyingParty(),
      now: Math.floor(Date.now() / 1000),
    });

    return clearRegistrationCookie(NextResponse.json(result));
  } catch (error) {
    if (error instanceof RegistrationSessionError) {
      return clearRegistrationCookie(
        NextResponse.json(
          { code: "REGISTRATION_SESSION_EXPIRED", message: "Start passkey setup again." },
          { status: 400 },
        ),
      );
    }

    if (error instanceof RegistrationVerificationError) {
      return clearRegistrationCookie(
        NextResponse.json(
          { code: "VERIFICATION_FAILED", message: "The passkey could not be verified." },
          { status: 400 },
        ),
      );
    }

    console.error(
      "Passkey registration verification failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return clearRegistrationCookie(
      NextResponse.json(
        { code: "VERIFICATION_FAILED", message: "The passkey could not be verified." },
        { status: 400 },
      ),
    );
  }
}
