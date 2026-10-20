"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");
const config = require("../config");
const log = require("../logger");

/*
 * One async interface over two drivers, so repositories never care which is in use:
 *   all(sql, params) -> rows        get(sql, params) -> row | undefined
 *   run(sql, params) -> { changes } scalar(sql, params) -> first column of first row
 *   exec(sql)                       transaction(async fn) -> fn's result, atomically
 * SQL uses "?" placeholders and must stay portable between SQLite and Postgres.
 *
 * SQLite (default): a file under DATA_DIR. Good for local development and tests.
 * Postgres: used when DATABASE_URL is set (e.g. Supabase), so data survives hosts with a temporary disk.
 */

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Node's built-in SQLite driver: no native build step, so installs work on any OS without compilers.
class SqliteDatabase {
  constructor(file) {
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require("node:sqlite"));
    } catch {
      throw new Error(`This app needs Node.js 22.13 or newer (found ${process.version}). Install the current LTS from https://nodejs.org`);
    }
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.dialect = "sqlite";
    this.raw = new DatabaseSync(file);
    this.statements = new Map();
    this.depth = 0;
    this.raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  }

  stmt(sql) {
    let s = this.statements.get(sql);
    if (!s) this.statements.set(sql, (s = this.raw.prepare(sql)));
    return s;
  }

  async all(sql, params = []) { return this.stmt(sql).all(...params); }
  async get(sql, params = []) { return this.stmt(sql).get(...params); }
  async run(sql, params = []) { return { changes: Number(this.stmt(sql).run(...params).changes) }; }
  async exec(sql) { this.raw.exec(sql); }
  async close() { this.raw.close(); }

  async scalar(sql, params = []) {
    const row = await this.get(sql, params);
    return row ? Object.values(row)[0] : undefined;
  }

  // Nested calls use savepoints, so an inner failure rolls back only its own work unless the error propagates.
  // The driver is synchronous, so a transaction body that only awaits this database never yields to other requests.
  async transaction(fn) {
    const level = this.depth;
    const sp = `sp_${level}`;
    this.raw.exec(level === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${sp}`);
    this.depth++;
    try {
      const result = await fn();
      this.depth--;
      this.raw.exec(level === 0 ? "COMMIT" : `RELEASE ${sp}`);
      return result;
    } catch (err) {
      this.depth--;
      this.raw.exec(level === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
      throw err;
    }
  }
}

class PostgresDatabase {
  constructor(url) {
    const pg = require("pg");
    // COUNT(*) and identity columns are int8; the values here are small, so return plain numbers.
    pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number.parseInt(v, 10));
    this.dialect = "postgres";
    const ssl = config.databaseSsl ?? !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
    this.pool = new pg.Pool({
      connectionString: url,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      max: config.databasePoolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    this.pool.on("error", (err) => log.error("Postgres pool error", { err: err.message }));
    // Queries inside transaction() must use the transaction's client, wherever they are issued from.
    this.tx = new AsyncLocalStorage();
  }

  // "?" -> "$1, $2, ..." (none of our SQL has a literal "?" inside quotes).
  static toPg(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  query(sql, params = []) {
    const client = this.tx.getStore()?.client || this.pool;
    return client.query(PostgresDatabase.toPg(sql), params);
  }

  async all(sql, params) { return (await this.query(sql, params)).rows; }
  async get(sql, params) { return (await this.query(sql, params)).rows[0]; }
  async run(sql, params) { return { changes: (await this.query(sql, params)).rowCount ?? 0 }; }
  async exec(sql) { await (this.tx.getStore()?.client || this.pool).query(sql); }
  async close() { await this.pool.end(); }

  async scalar(sql, params) {
    const row = await this.get(sql, params);
    return row ? Object.values(row)[0] : undefined;
  }

  async transaction(fn) {
    const outer = this.tx.getStore();
    if (outer) {
      const sp = `sp_${outer.depth++}`;
      await outer.client.query(`SAVEPOINT ${sp}`);
      try {
        const result = await fn();
        await outer.client.query(`RELEASE SAVEPOINT ${sp}`);
        return result;
      } catch (err) {
        await outer.client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        throw err;
      } finally {
        outer.depth--;
      }
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.tx.run({ client, depth: 0 }, fn);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

// Applies every migrations/<dialect>/NNN_name.sql not yet recorded in schema_migrations, in order.
async function migrate(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  // Keep Supabase's auto-generated public API away from our tables (the app itself bypasses RLS as owner).
  if (db.dialect === "postgres") await db.exec("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
  const applied = new Set((await db.all("SELECT name FROM schema_migrations")).map((r) => r.name));
  const dir = path.join(MIGRATIONS_DIR, db.dialect);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.transaction(async () => {
      await db.exec(sql);
      await db.run("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)", [file, new Date().toISOString()]);
    });
    log.info("Applied migration", { file, dialect: db.dialect });
  }
}

// open() picks Postgres when DATABASE_URL is set, otherwise SQLite; open(":memory:") is always SQLite (tests).
async function open(target = config.databaseUrl || config.dbFile) {
  const db = /^postgres(ql)?:\/\//.test(target) ? new PostgresDatabase(target) : new SqliteDatabase(target);
  await migrate(db);
  return db;
}

module.exports = { open, migrate };
