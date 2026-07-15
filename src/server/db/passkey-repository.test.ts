import { describe, expect, test } from "vitest";
import { openDatabase } from "./database";
import {
  consumeChallenge,
  createUser,
  findUserByUsername,
  listCredentialsByUserId,
  saveCredential,
  storeChallenge,
} from "./passkey-repository";

describe("passkey repository", () => {
  test("opens a migrated database and finds normalized usernames", () => {
    const database = openDatabase(":memory:");

    try {
      const created = createUser(database, {
        id: "user-1",
        username: "casey@example.com",
        displayName: "Casey",
        webauthnUserId: "A".repeat(43),
      });

      expect(created.username).toBe("casey@example.com");
      expect(findUserByUsername(database, "  CASEY@EXAMPLE.COM ")).toEqual(created);
    } finally {
      database.close();
    }
  });

  test("consumes a registration challenge exactly once", () => {
    const database = openDatabase(":memory:");

    try {
      createUser(database, {
        id: "user-1",
        username: "casey@example.com",
        displayName: "Casey",
        webauthnUserId: "A".repeat(43),
      });
      storeChallenge(database, {
        sessionId: "session-1",
        ceremonyType: "registration",
        userId: "user-1",
        challenge: "C".repeat(43),
        expiresAt: 1_900_000_060,
      });

      expect(
        consumeChallenge(database, "session-1", "registration", 1_900_000_000),
      ).toMatchObject({ userId: "user-1", challenge: "C".repeat(43) });
      expect(
        consumeChallenge(database, "session-1", "registration", 1_900_000_000),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  test("deletes an expired challenge instead of returning it", () => {
    const database = openDatabase(":memory:");

    try {
      createUser(database, {
        id: "user-1",
        username: "casey@example.com",
        displayName: "Casey",
        webauthnUserId: "A".repeat(43),
      });
      storeChallenge(database, {
        sessionId: "session-1",
        ceremonyType: "registration",
        userId: "user-1",
        challenge: "C".repeat(43),
        expiresAt: 1_900_000_060,
      });

      expect(
        consumeChallenge(database, "session-1", "registration", 1_900_000_061),
      ).toBeNull();
      expect(
        consumeChallenge(database, "session-1", "registration", 1_900_000_000),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  test("round-trips the fields required for later authentication", () => {
    const database = openDatabase(":memory:");

    try {
      createUser(database, {
        id: "user-1",
        username: "casey@example.com",
        displayName: "Casey",
        webauthnUserId: "A".repeat(43),
      });
      saveCredential(database, {
        id: "credential-1",
        userId: "user-1",
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 7,
        deviceType: "multiDevice",
        backedUp: true,
        transports: ["internal", "hybrid"],
      });

      expect(listCredentialsByUserId(database, "user-1")).toEqual([
        {
          id: "credential-1",
          userId: "user-1",
          publicKey: new Uint8Array([1, 2, 3, 4]),
          counter: 7,
          deviceType: "multiDevice",
          backedUp: true,
          transports: ["internal", "hybrid"],
        },
      ]);
    } finally {
      database.close();
    }
  });
});
