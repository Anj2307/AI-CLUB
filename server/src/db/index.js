"use strict";
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const config = require("../config");
const log = require("../logger");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Applies every migrations/NNN_name.sql not yet recorded in schema_migrations, in order.
function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(db.prepare("SELECT name FROM schema_migrations").pluck().all());
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
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  migrate(db);
  return db;
}

module.exports = { open, migrate };
