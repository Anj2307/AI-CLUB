"use strict";

function createSettingsRepo(db) {
  async function getAll() {
    const out = {};
    for (const { key, value } of await db.all("SELECT key, value FROM settings")) out[key] = JSON.parse(value);
    return out;
  }
  const set = (patch) => db.transaction(async () => {
    const t = new Date().toISOString();
    for (const [k, v] of Object.entries(patch)) {
      await db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [k, JSON.stringify(v), t]);
    }
  });
  async function replaceAll(obj) {
    await db.run("DELETE FROM settings");
    await set(obj);
  }
  return { getAll, set, replaceAll };
}

module.exports = { createSettingsRepo };
