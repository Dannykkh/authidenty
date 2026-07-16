import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../server/db/database";
import { resolveRelyingParty } from "../../../../server/passkeys/relying-party";
import { handleConversationEnrollment } from "../../../../server/conversation/conversation-http-handlers";
import { createConversationRuntime } from "../../../../server/conversation/conversation-runtime";
import { enrollConversationProfile } from "../../../../server/conversation/conversation-service";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleConversationEnrollment(request, {
    expectedOrigin: resolveRelyingParty().origin,
    enroll(body) {
      const conversationRuntime = createConversationRuntime();
      return enrollConversationProfile(getDatabase(), body, {
        vault: conversationRuntime.vault,
        generateId: conversationRuntime.generateId,
      });
    },
  });
}
