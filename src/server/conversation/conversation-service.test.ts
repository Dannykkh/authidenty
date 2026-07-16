import { describe, expect, test, vi } from "vitest";
import { openDatabase } from "../db/database";
import { findEncryptedPhoneByUserId } from "../relay/identity-vault-repository";
import { createIdentityVaultCipher } from "../relay/identity-vault";

async function loadConversationService() {
  try {
    return await import("./conversation-service");
  } catch {
    expect.fail("The conversational identity service is not implemented yet.");
  }
}

const enrolledAnswers = [
  "honestly, i usually start with the smallest part because it keeps things clear.",
  "i'd check the details first, then move once the risk feels low.",
  "usually i write a short list, but i keep the final answer direct.",
];

const returningAnswers = [
  "honestly, i'd compare two options first because guessing wastes time.",
  "i usually make the safe choice, then explain the reason in one line.",
  "short answer first, details second. that keeps things clear.",
];

function idGenerator(prefix: string) {
  return `${prefix}_0123456789abcdefghijkl`;
}

function dependencies() {
  const vault = createIdentityVaultCipher({
    activeKeyVersion: "demo-v1",
    keys: { "demo-v1": Buffer.alloc(32, 7) },
  });

  return {
    vault,
    challengeSecret: Buffer.alloc(32, 11),
    generateId: idGenerator,
    generateCode: () => "184205",
    now: () => 1_900_000_000,
  };
}

describe("conversational identity service", () => {
  test("enrolls only a derived style vector and an encrypted destination", async () => {
    const { enrollConversationProfile } = await loadConversationService();
    const database = openDatabase(":memory:");
    const deps = dependencies();

    try {
      const enrolled = enrollConversationProfile(
        database,
        {
          displayName: "Danny Kim",
          phone: "+12025550184",
          answers: enrolledAnswers,
        },
        deps,
      );

      expect(enrolled).toEqual({
        profileId: "user_0123456789abcdefghijkl",
        status: "enrolled",
        displayName: "Danny Kim",
        destination: "***-***-0184",
        sampleCount: 3,
      });

      const row = database
        .prepare(
          `SELECT style_vector, sample_count
           FROM conversation_profiles
           WHERE user_id = ?`,
        )
        .get(enrolled.profileId) as {
        style_vector: string;
        sample_count: number;
      };
      expect(row.sample_count).toBe(3);
      expect(row.style_vector).not.toContain("honestly");
      expect(row.style_vector).not.toContain("smallest part");
      expect(JSON.parse(row.style_vector)).toMatchObject({
        version: "style-v1",
        sampleCount: 3,
      });

      const encrypted = findEncryptedPhoneByUserId(
        database,
        enrolled.profileId,
      );
      expect(encrypted).not.toBeNull();
      expect(encrypted?.ciphertext.includes(Buffer.from("+12025550184"))).toBe(
        false,
      );
      expect(
        deps.vault.decryptPhone(enrolled.profileId, encrypted!),
      ).toBe("+12025550184");
    } finally {
      database.close();
    }
  });

  test("reveals a matched profile only after a strong cross-question pattern match", async () => {
    const { enrollConversationProfile, startConversationMatch } =
      await loadConversationService();
    const database = openDatabase(":memory:");
    const deps = dependencies();
    const analyze = vi.fn(async () => ({
      score: 0.91,
      explanation:
        "The answers keep the same concise, lowercase, reason-first structure.",
    }));
    const send = vi.fn(async (input: { code: string }) => ({
      status: "delivered" as const,
      previewCode: input.code,
    }));

    try {
      enrollConversationProfile(
        database,
        {
          displayName: "Danny Kim",
          phone: "+12025550184",
          answers: enrolledAnswers,
        },
        deps,
      );

      const matched = await startConversationMatch(
        database,
        { answers: returningAnswers },
        {
          ...deps,
          analyzer: { analyze },
          notificationAdapter: { send },
        },
      );

      expect(matched).toMatchObject({
        status: "challenge_sent",
        challengeId: "challenge_0123456789abcdefghijkl",
        candidate: {
          displayName: "Danny Kim",
          destination: "***-***-0184",
        },
        analysisSource: "gpt-5.6",
        explanation:
          "The answers keep the same concise, lowercase, reason-first structure.",
        factor: "sms_otp",
        demoCode: "184205",
      });

      if (matched.status !== "challenge_sent") {
        expect.fail("Expected a matched challenge.");
      }

      expect(matched.score).toBeGreaterThanOrEqual(0.72);
      expect(analyze).toHaveBeenCalledWith({
        enrolledVector: expect.objectContaining({ version: "style-v1" }),
        candidateVector: expect.objectContaining({ version: "style-v1" }),
        safetyIdentifier: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(send).toHaveBeenCalledWith({
        challengeId: "challenge_0123456789abcdefghijkl",
        destination: "+12025550184",
        code: "184205",
        displayName: "Danny Kim",
      });
      expect(JSON.stringify(matched)).not.toContain("+12025550184");
    } finally {
      database.close();
    }
  });

  test("returns no identity or challenge for a weak response pattern", async () => {
    const { enrollConversationProfile, startConversationMatch } =
      await loadConversationService();
    const database = openDatabase(":memory:");
    const deps = dependencies();
    const send = vi.fn();

    try {
      enrollConversationProfile(
        database,
        {
          displayName: "Danny Kim",
          phone: "+12025550184",
          answers: enrolledAnswers,
        },
        deps,
      );

      const result = await startConversationMatch(
        database,
        {
          answers: [
            "YES!!! Absolutely incredible.",
            "Whatever works for me.",
            "Kindly be advised that this matter requires extensive deliberation.",
          ],
        },
        {
          ...deps,
          analyzer: {
            analyze: vi.fn(async () => ({
              score: 0.15,
              explanation: "The response pattern is inconsistent.",
            })),
          },
          notificationAdapter: { send },
        },
      );

      expect(result).toEqual({
        status: "no_match",
        explanation:
          "The response pattern was not consistent enough to select an enrolled profile.",
      });
      expect(JSON.stringify(result)).not.toContain("Danny");
      expect(JSON.stringify(result)).not.toContain("0184");
      expect(send).not.toHaveBeenCalled();
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM conversation_challenges")
          .get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });

  test("uses the device code as the final one-time verification factor", async () => {
    const {
      confirmConversationChallenge,
      enrollConversationProfile,
      startConversationMatch,
    } = await loadConversationService();
    const database = openDatabase(":memory:");
    const deps = dependencies();

    try {
      enrollConversationProfile(
        database,
        {
          displayName: "Danny Kim",
          phone: "+12025550184",
          answers: enrolledAnswers,
        },
        deps,
      );
      const matched = await startConversationMatch(
        database,
        { answers: returningAnswers },
        {
          ...deps,
          analyzer: {
            analyze: vi.fn(async () => ({
              score: 0.91,
              explanation: "The response pattern is consistent.",
            })),
          },
          notificationAdapter: {
            send: vi.fn(async (input: { code: string }) => ({
              status: "delivered" as const,
              previewCode: input.code,
            })),
          },
        },
      );

      if (matched.status !== "challenge_sent") {
        expect.fail("Expected a matched challenge.");
      }

      const verified = confirmConversationChallenge(
        database,
        {
          challengeId: matched.challengeId,
          code: "184205",
        },
        {
          challengeSecret: deps.challengeSecret,
          now: () => 1_900_000_010,
        },
      );

      expect(verified).toEqual({
        status: "verified",
        displayName: "Danny Kim",
        destination: "***-***-0184",
        factor: "sms_otp",
        verifiedAt: "2030-03-17T17:46:50.000Z",
      });
      expect(() =>
        confirmConversationChallenge(
          database,
          {
            challengeId: matched.challengeId,
            code: "184205",
          },
          {
            challengeSecret: deps.challengeSecret,
            now: () => 1_900_000_011,
          },
        ),
      ).toThrow("The device verification could not be completed.");
    } finally {
      database.close();
    }
  });
});
