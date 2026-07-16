import type { NextRequest } from "next/server";
import { getDatabase } from "../../../../../../server/db/database";
import { resolveRelyingParty } from "../../../../../../server/passkeys/relying-party";
import { handleConversationVerification } from "../../../../../../server/conversation/conversation-http-handlers";
import { createConversationRuntime } from "../../../../../../server/conversation/conversation-runtime";
import { confirmConversationChallenge } from "../../../../../../server/conversation/conversation-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ challengeId: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const { challengeId } = await context.params;

  return handleConversationVerification(
    request,
    challengeId,
    {
      expectedOrigin: resolveRelyingParty().origin,
      verify(body) {
        const conversationRuntime = createConversationRuntime();
        return confirmConversationChallenge(
          getDatabase(),
          body,
          {
            challengeSecret:
              conversationRuntime.challengeSecret,
            now: conversationRuntime.now,
          },
        );
      },
    },
  );
}
