"use strict";
const fs = require("node:fs");
const path = require("node:path");
const config = require("../config");
const log = require("../logger");

// Node's built-in SQLite driver: no native build step, so installs work on any OS without compilers.
let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  throw new Error(`This app needs Node.js 22.13 or newer (found ${process.version}). Install the current LTS from https://nodejs.org`);
}

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Thin wrapper adding the two conveniences the repositories use: scalar() and nestable transaction().
class Database {
  constructor(file) {
    this.raw = new DatabaseSync(file);
    this.depth = 0;
  }

  prepare(sql) { return this.raw.prepare(sql); }
  exec(sql) { this.raw.exec(sql); }
  close() { this.raw.close(); }

  // First column of the first row, e.g. scalar("SELECT COUNT(*) FROM users").
  scalar(sql, ...params) {
    const row = this.raw.prepare(sql).get(...params);
    return row ? Object.values(row)[0] : undefined;
  }

  // Wraps fn so it runs atomically. Nested calls use savepoints, so an inner
  // failure rolls back only its own work unless the error propagates.
  transaction(fn) {
    return (...args) => {
      const level = this.depth;
      const sp = `sp_${level}`;
      this.raw.exec(level === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${sp}`);
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.raw.exec(level === 0 ? "COMMIT" : `RELEASE ${sp}`);
        return result;
      } catch (err) {
        this.depth--;
        this.raw.exec(level === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
        throw err;
      }
    };
  }
}

// Applies every migrations/NNN_name.sql not yet recorded in schema_migrations, in order.
function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(db.prepare("SELECT name FROM schema_migrations").all().map((r) => r.name));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    })();
    log.info("Applied migration", { file });
  }
}

function open(file = config.dbFile) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  migrate(db);
  return db;
}

module.exports = { open, migrate };
