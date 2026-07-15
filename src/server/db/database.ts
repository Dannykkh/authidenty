import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const latestSchemaVersion = 1;

function migrationPath(version: number, direction: "up" | "down") {
  return join(
    process.cwd(),
    "src",
    "server",
    "db",
    "migrations",
    `${String(version).padStart(3, "0")}_initial.${direction}.sql`,
  );
}

function applyMigrations(database: Database.Database) {
  const currentVersion = database.pragma("user_version", { simple: true }) as number;

  if (currentVersion > latestSchemaVersion) {
    throw new Error(
      `Database schema ${currentVersion} is newer than supported version ${latestSchemaVersion}.`,
    );
  }

  for (let version = currentVersion + 1; version <= latestSchemaVersion; version += 1) {
    database.exec(readFileSync(migrationPath(version, "up"), "utf8"));
    database.pragma(`user_version = ${version}`);
  }
}

export function openDatabase(filename = ":memory:") {
  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const database = new Database(filename);
  database.pragma("foreign_keys = ON");

  if (filename !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  applyMigrations(database);
  return database;
}

const globalDatabase = globalThis as typeof globalThis & {
  authidentyDatabase?: Database.Database;
};

export function getDatabase() {
  if (!globalDatabase.authidentyDatabase) {
    const filename =
      process.env.AUTHIDENTY_DB_PATH ?? join(process.cwd(), ".data", "authidenty.db");
    globalDatabase.authidentyDatabase = openDatabase(filename);
  }

  return globalDatabase.authidentyDatabase;
}
