import { NextResponse, type NextRequest } from "next/server";
import {
  assertSameOriginJson,
  InvalidRequestContextError,
} from "../http/same-origin-json";
import { RelayConfigurationError } from "./relay-runtime";
import {
  RelayRequestRejectedError,
  RelayVerificationError,
} from "./relay-service";

type SetupDependencies = {
  expectedOrigin: string;
  setup: (body: unknown) => unknown | Promise<unknown>;
};

type CreateRequestDependencies = {
  expectedOrigin: string;
  createRequest: (body: unknown) => unknown | Promise<unknown>;
};

type VerifyDependencies = {
  expectedOrigin: string;
  verify: (body: unknown) => unknown | Promise<unknown>;
};

function requestNotAllowedResponse() {
  return NextResponse.json(
    {
      code: "REQUEST_NOT_ALLOWED",
      message: "The request origin or content type is not allowed.",
    },
    { status: 403 },
  );
}

function configurationResponse() {
  return NextResponse.json(
    {
      code: "RELAY_NOT_CONFIGURED",
      message: "The private relay is not configured on this server.",
    },
    { status: 503 },
  );
}

function requestRejectedResponse(message?: string) {
  return NextResponse.json(
    {
      code: "RELAY_REQUEST_REJECTED",
      message: message ?? "The approval request could not be completed.",
    },
    { status: 400 },
  );
}

function verificationRejectedResponse() {
  return NextResponse.json(
    {
      code: "RELAY_VERIFICATION_FAILED",
      message: "The verification request could not be completed.",
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
      code: "RELAY_UNAVAILABLE",
      message: "The private relay is temporarily unavailable.",
    },
    { status: 500 },
  );
}

function guardRequest(request: NextRequest, expectedOrigin: string) {
  try {
    assertSameOriginJson(request, expectedOrigin);
    return null;
  } catch (error) {
    if (error instanceof InvalidRequestContextError) {
      return requestNotAllowedResponse();
    }

    throw error;
  }
}

export async function handleDemoRelaySetup(
  request: NextRequest,
  dependencies: SetupDependencies,
) {
  const guardResponse = guardRequest(request, dependencies.expectedOrigin);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    return NextResponse.json(
      await dependencies.setup(await request.json()),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RelayConfigurationError) {
      return configurationResponse();
    }

    if (error instanceof SyntaxError) {
      return requestRejectedResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Enter a short display name and an E.164 phone number."
    ) {
      return requestRejectedResponse(error.message);
    }

    return internalErrorResponse("Demo relay setup", error);
  }
}

export async function handleRelayRequestCreation(
  request: NextRequest,
  dependencies: CreateRequestDependencies,
) {
  const guardResponse = guardRequest(request, dependencies.expectedOrigin);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    return NextResponse.json(
      await dependencies.createRequest(await request.json()),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RelayConfigurationError) {
      return configurationResponse();
    }

    if (error instanceof RelayRequestRejectedError || error instanceof SyntaxError) {
      return requestRejectedResponse(
        error instanceof RelayRequestRejectedError ? error.message : undefined,
      );
    }

    return internalErrorResponse("Relay request creation", error);
  }
}

export async function handleRelayVerification(
  request: NextRequest,
  requestId: string,
  dependencies: VerifyDependencies,
) {
  const guardResponse = guardRequest(request, dependencies.expectedOrigin);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = (await request.json()) as { code?: unknown };
    return NextResponse.json(
      await dependencies.verify({ requestId, code: body.code }),
    );
  } catch (error) {
    if (error instanceof RelayConfigurationError) {
      return configurationResponse();
    }

    if (error instanceof RelayVerificationError || error instanceof SyntaxError) {
      return verificationRejectedResponse();
    }

    return internalErrorResponse("Relay verification", error);
  }
}
