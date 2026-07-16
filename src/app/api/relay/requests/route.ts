import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../server/db/database";
import { resolveRelyingParty } from "../../../../server/passkeys/relying-party";
import { handleRelayRequestCreation } from "../../../../server/relay/relay-http-handlers";
import { createRelayRuntime } from "../../../../server/relay/relay-runtime";
import { createRelayApprovalRequest } from "../../../../server/relay/relay-service";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleRelayRequestCreation(request, {
    expectedOrigin: resolveRelyingParty().origin,
    createRequest(body) {
      const relayRuntime = createRelayRuntime();
      return createRelayApprovalRequest(getDatabase(), body, {
        classifier: relayRuntime.classifier,
        vault: relayRuntime.vault,
        notificationAdapter: relayRuntime.notificationAdapter,
        challengeSecret: relayRuntime.challengeSecret,
        generateCode: relayRuntime.generateCode,
        generateId: relayRuntime.generateId,
        now: relayRuntime.now,
      });
    },
  });
}
