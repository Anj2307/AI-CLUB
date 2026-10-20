"use strict";
/*
 * Seeds an empty database from public/assets/js/data.js (the same file the
 * static frontend falls back to), and makes sure an admin account exists.
 *
 *   npm run seed            seed only if the database has no content
 *   npm run seed -- --force replace all content with data.js
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const config = require("../config");
const log = require("../logger");
const { importSnapshot } = require("../lib/importer");

function loadStaticData() {
  const file = path.join(config.publicDir, "assets", "js", "data.js");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file, timeout: 1000 });
  return sandbox.window.DEFAULT_SITE_DATA;
}

async function seedContent(repos, { force = false } = {}) {
  const counts = await repos.content.counts();
  const empty = Object.values(counts).every((n) => n === 0) && !Object.keys(await repos.settings.getAll()).length;
  if (!empty && !force) return false;
  await importSnapshot(repos, loadStaticData());
  log.info("Seeded content from data.js");
  return true;
}

// First boot: create an admin from ADMIN_EMAIL / ADMIN_PASSWORD, or generate a password and print it once.
async function ensureAdmin(repos) {
  if (await repos.users.count() > 0) return null;
  const { email, name } = config.bootstrapAdmin;
  let password = config.bootstrapAdmin.password;
  const generated = !password;
  if (generated) password = crypto.randomBytes(12).toString("base64url");
  await repos.users.create({ email, name, role: "admin", password });
  if (generated) {
    log.warn("Created initial admin account - change this password after signing in", { email, password });
  } else {
    log.info("Created initial admin account", { email });
  }
  return { email, password, generated };
}

if (require.main === module) {
  (async () => {
    const { open } = require("./index");
    const { createRepos } = require("../repositories");
    const db = await open();
    const repos = createRepos(db);
    const did = await seedContent(repos, { force: process.argv.includes("--force") });
    await ensureAdmin(repos);
    await db.close();
    console.log(did ? "Content seeded." : "Database already has content - use --force to overwrite.");
  })();
}

module.exports = { seedContent, ensureAdmin, loadStaticData };
