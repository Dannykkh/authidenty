import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../../server/db/database";
import { resolveRelyingParty } from "../../../../../server/passkeys/relying-party";
import { setupDemoRelayProfile } from "../../../../../server/relay/demo-relay-setup";
import { handleDemoRelaySetup } from "../../../../../server/relay/relay-http-handlers";
import { createRelayRuntime } from "../../../../../server/relay/relay-runtime";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleDemoRelaySetup(request, {
    expectedOrigin: resolveRelyingParty().origin,
    setup(body) {
      const relayRuntime = createRelayRuntime();
      return setupDemoRelayProfile(getDatabase(), body, {
        vault: relayRuntime.vault,
        generateId: relayRuntime.generateId,
      });
    },
  });
}
