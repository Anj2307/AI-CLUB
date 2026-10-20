"use strict";
const fs = require("node:fs");
const path = require("node:path");
const config = require("../config");

/*
 * Where uploaded images live:
 *   disk     - UPLOAD_DIR, served by app.js at /uploads/<file> (default)
 *   supabase - a public Supabase Storage bucket, used when SUPABASE_URL and SUPABASE_SERVICE_KEY are set
 * Each backend: save(filename, buffer, mime), remove(filename), urlFor(filename).
 */

function diskStorage(dir = config.uploadDir) {
  fs.mkdirSync(dir, { recursive: true });
  return {
    kind: "disk",
    async save(filename, buffer) { fs.writeFileSync(path.join(dir, filename), buffer, { flag: "wx" }); },
    async remove(filename) { fs.rmSync(path.join(dir, path.basename(filename)), { force: true }); },
    urlFor: (filename) => `/uploads/${filename}`
  };
}

function supabaseStorage({ url, serviceKey, bucket }) {
  const api = `${url}/storage/v1/object`;
  // Legacy service_role keys are JWTs and go in both headers; new sb_secret_ keys go in apikey only.
  const headers = serviceKey.startsWith("eyJ") ? { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } : { apikey: serviceKey };

  async function call(target, init) {
    const res = await fetch(target, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok) throw new Error(`Supabase Storage ${init.method} failed: ${res.status} ${await res.text().catch(() => "")}`.trim());
  }

  return {
    kind: "supabase",
    save: (filename, buffer, mime) => call(`${api}/${bucket}/${encodeURIComponent(filename)}`, {
      method: "POST",
      headers: { "Content-Type": mime, "Cache-Control": "max-age=31536000", "x-upsert": "false" },
      body: buffer
    }),
    remove: (filename) => call(`${api}/${bucket}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [path.basename(filename)] })
    }),
    urlFor: (filename) => `${api}/public/${bucket}/${encodeURIComponent(filename)}`
  };
}

function createStorage() {
  const { supabase } = config;
  if (supabase.url && supabase.serviceKey) return supabaseStorage(supabase);
  return diskStorage();
}

module.exports = { createStorage, diskStorage, supabaseStorage };
