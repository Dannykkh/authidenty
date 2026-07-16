import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../server/db/database";
import { resolveRelyingParty } from "../../../../server/passkeys/relying-party";
import { handleConversationMatch } from "../../../../server/conversation/conversation-http-handlers";
import { createConversationRuntime } from "../../../../server/conversation/conversation-runtime";
import { startConversationMatch } from "../../../../server/conversation/conversation-service";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleConversationMatch(request, {
    expectedOrigin: resolveRelyingParty().origin,
    match(body) {
      const conversationRuntime = createConversationRuntime();
      return startConversationMatch(getDatabase(), body, {
        analyzer: conversationRuntime.analyzer,
        vault: conversationRuntime.vault,
        notificationAdapter:
          conversationRuntime.notificationAdapter,
        challengeSecret: conversationRuntime.challengeSecret,
        generateCode: conversationRuntime.generateCode,
        generateId: conversationRuntime.generateId,
        now: conversationRuntime.now,
      });
    },
  });
}
