import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

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
