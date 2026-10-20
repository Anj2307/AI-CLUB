"use strict";
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const env = process.env;
const isProd = env.NODE_ENV === "production";

function int(name, fallback) {
  const v = env[name];
  if (v == null || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`${name} must be an integer, got "${v}"`);
  return n;
}

const dataDir = path.resolve(ROOT, env.DATA_DIR || "data");

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) throw new Error("JWT_SECRET must be set in production");
  // Dev only: a per-process secret means sessions reset on restart, which is fine locally.
  jwtSecret = crypto.randomBytes(32).toString("hex");
}

const config = Object.freeze({
  env: env.NODE_ENV || "development",
  isProd,
  isTest: env.NODE_ENV === "test",
  port: int("PORT", 3000),
  host: env.HOST || "0.0.0.0",
  rootDir: ROOT,
  publicDir: path.join(ROOT, "public"),
  dataDir,
  dbFile: env.DB_FILE || path.join(dataDir, "aiclub.db"),
  // Postgres (e.g. Supabase) instead of the SQLite file. TLS is on unless the host is local; DATABASE_SSL overrides.
  databaseUrl: env.DATABASE_URL || "",
  databaseSsl: env.DATABASE_SSL ? env.DATABASE_SSL !== "false" : null,
  databasePoolSize: int("DATABASE_POOL_SIZE", 5),
  uploadDir: path.resolve(ROOT, env.UPLOAD_DIR || path.join(dataDir, "uploads")),
  // Supabase Storage for uploaded images instead of UPLOAD_DIR (needs a public bucket).
  supabase: {
    // Accept the project URL with or without a copied API path such as /rest/v1/.
    url: (env.SUPABASE_URL || "").replace(/\/+$/, "").replace(/\/(rest|storage|auth)\/v1$/, ""),
    serviceKey: env.SUPABASE_SERVICE_KEY || "",
    bucket: env.SUPABASE_BUCKET || "uploads"
  },
  maxUploadMb: int("MAX_UPLOAD_MB", 8),
  jwtSecret,
  sessionHours: int("SESSION_HOURS", 12),
  // Comma separated list of extra origins allowed to call the API (e.g. a GitHub Pages frontend).
  corsOrigins: (env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  trustProxy: env.TRUST_PROXY || (isProd ? "1" : "0"),
  bootstrapAdmin: {
    email: env.ADMIN_EMAIL || "admin@aiclub.local",
    password: env.ADMIN_PASSWORD || "",
    name: env.ADMIN_NAME || "Club Admin"
  }
});

module.exports = config;
