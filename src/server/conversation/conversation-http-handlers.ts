import { NextResponse, type NextRequest } from "next/server";
import {
  assertSameOriginJson,
  InvalidRequestContextError,
} from "../http/same-origin-json";
import { ConversationConfigurationError } from "./conversation-runtime";
import {
  ConversationEnrollmentError,
  ConversationVerificationError,
} from "./conversation-service";

type HandlerDependencies = {
  expectedOrigin: string;
};

type EnrollmentDependencies = HandlerDependencies & {
  enroll: (body: unknown) => unknown | Promise<unknown>;
};

type MatchDependencies = HandlerDependencies & {
  match: (body: unknown) => unknown | Promise<unknown>;
};

type VerificationDependencies = HandlerDependencies & {
  verify: (body: unknown) => unknown | Promise<unknown>;
};

function guardRequest(request: NextRequest, expectedOrigin: string) {
  try {
    assertSameOriginJson(request, expectedOrigin);
    return null;
  } catch (error) {
    if (error instanceof InvalidRequestContextError) {
      return NextResponse.json(
        {
          code: "REQUEST_NOT_ALLOWED",
          message: "The request origin or content type is not allowed.",
        },
        { status: 403 },
      );
    }

    throw error;
  }
}

function configurationResponse() {
  return NextResponse.json(
    {
      code: "CONVERSATION_NOT_CONFIGURED",
      message: "Conversational verification is not configured.",
    },
    { status: 503 },
  );
}

function invalidRequestResponse() {
  return NextResponse.json(
    {
      code: "CONVERSATION_REQUEST_REJECTED",
      message: "The conversational verification request was rejected.",
    },
    { status: 400 },
  );
}

function internalErrorResponse(operation: string, error: unknown) {
  console.error(
    `${operation} failed:`,
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    {
      code: "CONVERSATION_UNAVAILABLE",
      message: "Conversational verification is temporarily unavailable.",
    },
    { status: 500 },
  );
}

function knownErrorResponse(error: unknown) {
  if (error instanceof ConversationConfigurationError) {
    return configurationResponse();
  }

  if (
    error instanceof ConversationEnrollmentError ||
    error instanceof ConversationVerificationError ||
    error instanceof SyntaxError
  ) {
    return invalidRequestResponse();
  }

  return null;
}

export async function handleConversationEnrollment(
  request: NextRequest,
  dependencies: EnrollmentDependencies,
) {
  const guardResponse = guardRequest(
    request,
    dependencies.expectedOrigin,
  );
  if (guardResponse) {
    return guardResponse;
  }

  try {
    return NextResponse.json(
      await dependencies.enroll(await request.json()),
      { status: 201 },
    );
  } catch (error) {
    return (
      knownErrorResponse(error) ??
      internalErrorResponse("Conversation enrollment", error)
    );
  }
}

export async function handleConversationMatch(
  request: NextRequest,
  dependencies: MatchDependencies,
) {
  const guardResponse = guardRequest(
    request,
    dependencies.expectedOrigin,
  );
  if (guardResponse) {
    return guardResponse;
  }

  try {
    const result = await dependencies.match(await request.json());
    const status =
      typeof result === "object" &&
      result !== null &&
      "status" in result &&
      result.status === "challenge_sent"
        ? 201
        : 200;

    return NextResponse.json(result, { status });
  } catch (error) {
    return (
      knownErrorResponse(error) ??
      internalErrorResponse("Conversation pattern match", error)
    );
  }
}

export async function handleConversationVerification(
  request: NextRequest,
  challengeId: string,
  dependencies: VerificationDependencies,
) {
  const guardResponse = guardRequest(
    request,
    dependencies.expectedOrigin,
  );
  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = (await request.json()) as { code?: unknown };
    return NextResponse.json(
      await dependencies.verify({
        challengeId,
        code: body.code,
      }),
    );
  } catch (error) {
    return (
      knownErrorResponse(error) ??
      internalErrorResponse("Conversation device verification", error)
    );
  }
}
