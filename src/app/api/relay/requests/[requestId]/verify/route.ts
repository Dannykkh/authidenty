import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../../../server/db/database";
import { resolveRelyingParty } from "../../../../../../server/passkeys/relying-party";
import { handleRelayVerification } from "../../../../../../server/relay/relay-http-handlers";
import { createRelayRuntime } from "../../../../../../server/relay/relay-runtime";
import { verifyRelayApprovalRequest } from "../../../../../../server/relay/relay-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { requestId } = await context.params;

  return handleRelayVerification(request, requestId, {
    expectedOrigin: resolveRelyingParty().origin,
    verify(body) {
      const relayRuntime = createRelayRuntime();
      return verifyRelayApprovalRequest(getDatabase(), body, {
        challengeSecret: relayRuntime.challengeSecret,
        generateId: relayRuntime.generateId,
        now: relayRuntime.now,
      });
    },
  });
}
