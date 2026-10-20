"use strict";

function createSettingsRepo(db) {
  function getAll() {
    const out = {};
    for (const { key, value } of db.prepare("SELECT key, value FROM settings").all()) out[key] = JSON.parse(value);
    return out;
  }
  const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
  const set = db.transaction((patch) => {
    const t = new Date().toISOString();
    for (const [k, v] of Object.entries(patch)) upsert.run(k, JSON.stringify(v), t);
  });
  function replaceAll(obj) {
    db.prepare("DELETE FROM settings").run();
    set(obj);
  }
  return { getAll, set, replaceAll };
}

module.exports = { createSettingsRepo };
