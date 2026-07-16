import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { openDatabase } from "./database";

const migrationDirectory = join(process.cwd(), "src", "server", "db", "migrations");

function readMigration(direction: "up" | "down") {
  return readFileSync(join(migrationDirectory, `001_initial.${direction}.sql`), "utf8");
}

function tableNames(database: Database.Database) {
  return database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => (row as { name: string }).name);
}

function columnNames(database: Database.Database, table: string) {
  return database
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name);
}

describe("initial SQLite migration", () => {
  test("creates only the account, passkey, and challenge tables", () => {
    const database = new Database(":memory:");

    try {
      database.pragma("foreign_keys = ON");
      database.exec(readMigration("up"));

      expect(tableNames(database)).toEqual([
        "passkey_credentials",
        "users",
        "webauthn_challenges",
      ]);
      expect(columnNames(database, "users")).toEqual([
        "id",
        "username",
        "display_name",
        "webauthn_user_id",
        "created_at",
        "updated_at",
      ]);
      expect(columnNames(database, "passkey_credentials")).toEqual([
        "id",
        "user_id",
        "public_key",
        "counter",
        "device_type",
        "backed_up",
        "transports",
        "created_at",
        "last_used_at",
      ]);
    } finally {
      database.close();
    }
  });

  test("enforces credential ownership and removes credentials with their user", () => {
    const database = new Database(":memory:");

    try {
      database.pragma("foreign_keys = ON");
      database.exec(readMigration("up"));

      expect(() =>
        database
          .prepare(
            `INSERT INTO passkey_credentials
              (id, user_id, public_key, counter, device_type, backed_up, transports)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run("credential-id", "missing-user", Buffer.from("public-key"), 0, "singleDevice", 0, "[]"),
      ).toThrow();

      database
        .prepare(
          `INSERT INTO users (id, username, display_name, webauthn_user_id)
           VALUES (?, ?, ?, ?)`,
        )
        .run("user-id", "demo@example.com", "Demo User", "A".repeat(43));
      database
        .prepare(
          `INSERT INTO passkey_credentials
            (id, user_id, public_key, counter, device_type, backed_up, transports)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run("credential-id", "user-id", Buffer.from("public-key"), 0, "singleDevice", 0, "[]");

      database.prepare("DELETE FROM users WHERE id = ?").run("user-id");

      expect(
        database.prepare("SELECT COUNT(*) AS count FROM passkey_credentials").get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });

  test("rolls back without leaving application tables", () => {
    const database = new Database(":memory:");

    try {
      database.pragma("foreign_keys = ON");
      database.exec(readMigration("up"));
      database.exec(readMigration("down"));

      expect(tableNames(database)).toEqual([]);
    } finally {
      database.close();
    }
  });
});

describe("database migrations", () => {
  test("creates separate relay, vault, challenge, outbox, and receipt tables", () => {
    const database = openDatabase(":memory:");

    try {
      expect(tableNames(database)).toEqual([
        "conversation_challenges",
        "conversation_profiles",
        "identity_vault_entries",
        "passkey_credentials",
        "relay_challenges",
        "relay_notification_outbox",
        "relay_profiles",
        "relay_requests",
        "users",
        "verification_receipts",
        "webauthn_challenges",
      ]);
      expect(columnNames(database, "conversation_profiles")).toEqual([
        "user_id",
        "profile_version",
        "style_vector",
        "sample_count",
        "status",
        "created_at",
        "updated_at",
      ]);
      expect(columnNames(database, "conversation_challenges")).toEqual([
        "id",
        "user_id",
        "deterministic_score",
        "model_score",
        "final_score",
        "model_source",
        "explanation",
        "code_digest",
        "masked_destination",
        "status",
        "attempt_count",
        "max_attempts",
        "created_at",
        "updated_at",
        "expires_at",
        "verified_at",
      ]);
      expect(columnNames(database, "identity_vault_entries")).toEqual([
        "user_id",
        "phone_ciphertext",
        "phone_iv",
        "phone_auth_tag",
        "key_version",
        "created_at",
        "updated_at",
      ]);
      expect(columnNames(database, "relay_profiles")).toEqual([
        "user_id",
        "relay_handle",
        "subject_id",
        "status",
        "created_at",
        "updated_at",
      ]);
      expect(columnNames(database, "relay_requests")).toEqual([
        "id",
        "user_id",
        "relying_service",
        "summary",
        "purpose",
        "declared_risk",
        "model_risk",
        "final_risk",
        "factor",
        "status",
        "created_at",
        "updated_at",
        "expires_at",
        "verified_at",
      ]);
      expect(columnNames(database, "relay_challenges")).toEqual([
        "request_id",
        "code_digest",
        "attempt_count",
        "max_attempts",
        "created_at",
        "updated_at",
        "expires_at",
        "consumed_at",
      ]);
      expect(columnNames(database, "relay_notification_outbox")).toEqual([
        "id",
        "request_id",
        "channel",
        "masked_destination",
        "status",
        "created_at",
        "updated_at",
        "delivered_at",
      ]);
      expect(columnNames(database, "verification_receipts")).toEqual([
        "id",
        "request_id",
        "subject_id",
        "purpose",
        "risk",
        "factor",
        "created_at",
        "updated_at",
        "expires_at",
      ]);
    } finally {
      database.close();
    }
  });

  test("rejects an unmasked contact destination in the notification outbox", () => {
    const database = openDatabase(":memory:");

    try {
      database
        .prepare(
          `INSERT INTO users (id, username, display_name, webauthn_user_id)
           VALUES (?, ?, ?, ?)`,
        )
        .run("user-id", "demo@example.com", "Demo User", "A".repeat(43));
      database
        .prepare(
          `INSERT INTO relay_requests
            (id, user_id, relying_service, summary, purpose, declared_risk,
             model_risk, final_risk, factor, status, created_at, updated_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "request-id",
          "user-id",
          "OpenClaw",
          "Approve a test action.",
          "other",
          "medium",
          "high",
          "high",
          "sms_otp",
          "challenge_sent",
          1_900_000_000,
          1_900_000_000,
          1_900_000_300,
        );

      expect(() =>
        database
          .prepare(
            `INSERT INTO relay_notification_outbox
              (id, request_id, channel, masked_destination, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            "notification-id",
            "request-id",
            "sms",
            "+12025550184",
            "queued",
            1_900_000_000,
            1_900_000_000,
          ),
      ).toThrow();
    } finally {
      database.close();
    }
  });
});
