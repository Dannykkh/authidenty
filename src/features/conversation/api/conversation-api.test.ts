import { describe, expect, test, vi } from "vitest";

async function loadConversationApi() {
  try {
    return await import("./conversation-api");
  } catch {
    expect.fail(
      "The conversational browser API client is not implemented yet.",
    );
  }
}

describe("conversational browser API", () => {
  test("validates the matched identity and masked device response", async () => {
    const { matchConversationProfile } =
      await loadConversationApi();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "challenge_sent",
          challengeId: "challenge_0123456789abcdefghijkl",
          candidate: {
            displayName: "Danny Kim",
            destination: "***-***-0184",
          },
          score: 0.88,
          analysisSource: "gpt-5.6",
          explanation:
            "The response structure is consistent across questions.",
          factor: "sms_otp",
          demoCode: "184205",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await matchConversationProfile(
      {
        answers: [
          "honestly, i would compare two options first.",
          "i usually make the safe choice, then explain why.",
          "short answer first, details second.",
        ],
      },
      fetcher,
    );

    expect(result).toMatchObject({
      status: "challenge_sent",
      candidate: {
        displayName: "Danny Kim",
        destination: "***-***-0184",
      },
    });
  });

  test("accepts a privacy-preserving no-match response", async () => {
    const { matchConversationProfile } =
      await loadConversationApi();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "no_match",
          explanation:
            "The response pattern was not consistent enough to select an enrolled profile.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      matchConversationProfile(
        {
          answers: [
            "This first answer is sufficiently long.",
            "This second answer is sufficiently long.",
            "This third answer is sufficiently long.",
          ],
        },
        fetcher,
      ),
    ).resolves.toMatchObject({ status: "no_match" });
  });

  test("rejects an unmasked phone number in a success response", async () => {
    const { enrollConversationProfile } =
      await loadConversationApi();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          profileId: "user_0123456789abcdefghijkl",
          status: "enrolled",
          displayName: "Danny Kim",
          destination: "+12025550184",
          sampleCount: 3,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      enrollConversationProfile(
        {
          displayName: "Danny Kim",
          phone: "+12025550184",
          answers: [
            "This first answer is sufficiently long.",
            "This second answer is sufficiently long.",
            "This third answer is sufficiently long.",
          ],
        },
        fetcher,
      ),
    ).rejects.toThrow("The server returned an unexpected response.");
  });
});
