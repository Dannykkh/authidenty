import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const migrations = [
  { version: 1, name: "initial" },
  { version: 2, name: "private_identity_relay" },
  { version: 3, name: "conversational_continuity" },
] as const;

const latestSchemaVersion = migrations.at(-1)?.version ?? 0;

function migrationPath(version: number, direction: "up" | "down") {
  const migration = migrations.find((candidate) => candidate.version === version);

  if (!migration) {
    throw new Error(`Database migration ${version} is not registered.`);
  }

  return join(
    process.cwd(),
    "src",
    "server",
    "db",
    "migrations",
    `${String(version).padStart(3, "0")}_${migration.name}.${direction}.sql`,
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
