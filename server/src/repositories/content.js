"use strict";
const { COLLECTIONS } = require("../lib/schemas");
const { newId, camelToSnake, snakeToCamel } = require("../lib/ids");

const HIDDEN = new Set(["position"]);
const now = () => new Date().toISOString();

// Generic repository for every collection in the registry.
function createContentRepo(db) {
  function toRow(coll, data) {
    const row = {};
    for (const [k, v] of Object.entries(data)) {
      if (!(k in coll.shape)) continue;
      row[camelToSnake(k)] = coll.json.includes(k) ? JSON.stringify(v ?? []) : v;
    }
    return row;
  }

  function fromRow(coll, row) {
    if (!row) return null;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (HIDDEN.has(k)) continue;
      const key = snakeToCamel(k);
      out[key] = coll.json.includes(key) ? JSON.parse(v) : v;
    }
    return out;
  }

  function list(coll) {
    return db.prepare(`SELECT * FROM ${coll.table} ORDER BY ${coll.orderBy}`).all().map((r) => fromRow(coll, r));
  }

  function get(coll, id) {
    return fromRow(coll, db.prepare(`SELECT * FROM ${coll.table} WHERE id = ?`).get(id));
  }

  // New items go to the top of manually-ordered lists.
  function create(coll, data, { id, position } = {}) {
    const row = toRow(coll, { ...coll.defaults, ...data });
    row.id = id || newId(coll.name.slice(0, 3));
    row.position = position ?? db.scalar(`SELECT COALESCE(MIN(position), 0) - 1 FROM ${coll.table}`);
    const cols = Object.keys(row);
    db.prepare(`INSERT INTO ${coll.table} (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")})`).run(row);
    return get(coll, row.id);
  }

  function update(coll, id, data) {
    const row = toRow(coll, data);
    const cols = Object.keys(row);
    if (!cols.length) return get(coll, id);
    row.id = id;
    row.updated_at = now();
    const res = db.prepare(`UPDATE ${coll.table} SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = @updated_at WHERE id = @id`).run(row);
    return res.changes ? get(coll, id) : null;
  }

  function remove(coll, id) {
    return db.prepare(`DELETE FROM ${coll.table} WHERE id = ?`).run(id).changes > 0;
  }

  // ids: the full desired order. Unknown ids are ignored; missing ones keep relative order after.
  const reorder = (coll, ids) => db.transaction(() => {
    const stmt = db.prepare(`UPDATE ${coll.table} SET position = ? WHERE id = ?`);
    ids.forEach((id, i) => stmt.run(i, id));
  })();

  function replaceAll(coll, items) {
    db.prepare(`DELETE FROM ${coll.table}`).run();
    items.forEach((item, i) => create(coll, item, { id: item.id, position: i }));
  }

  function snapshot() {
    const out = {};
    for (const coll of Object.values(COLLECTIONS)) out[coll.name] = list(coll);
    return out;
  }

  function counts() {
    const out = {};
    for (const coll of Object.values(COLLECTIONS)) out[coll.name] = db.scalar(`SELECT COUNT(*) FROM ${coll.table}`);
    return out;
  }

  return { list, get, create, update, remove, reorder, replaceAll, snapshot, counts };
}

module.exports = { createContentRepo };
