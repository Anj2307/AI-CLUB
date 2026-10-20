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

  async function list(coll) {
    return (await db.all(`SELECT * FROM ${coll.table} ORDER BY ${coll.orderBy}`)).map((r) => fromRow(coll, r));
  }

  async function get(coll, id) {
    return fromRow(coll, await db.get(`SELECT * FROM ${coll.table} WHERE id = ?`, [id]));
  }

  // New items go to the top of manually-ordered lists.
  async function create(coll, data, { id, position } = {}) {
    const row = toRow(coll, { ...coll.defaults, ...data });
    row.id = id || newId(coll.name.slice(0, 3));
    row.position = position ?? await db.scalar(`SELECT COALESCE(MIN(position), 0) - 1 FROM ${coll.table}`);
    const cols = Object.keys(row);
    await db.run(`INSERT INTO ${coll.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, Object.values(row));
    return get(coll, row.id);
  }

  async function update(coll, id, data) {
    const row = toRow(coll, data);
    const cols = Object.keys(row);
    if (!cols.length) return get(coll, id);
    const res = await db.run(`UPDATE ${coll.table} SET ${cols.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
      [...Object.values(row), now(), id]);
    return res.changes ? get(coll, id) : null;
  }

  async function remove(coll, id) {
    return (await db.run(`DELETE FROM ${coll.table} WHERE id = ?`, [id])).changes > 0;
  }

  // ids: the full desired order. Unknown ids are ignored; missing ones keep relative order after.
  const reorder = (coll, ids) => db.transaction(async () => {
    for (const [i, id] of ids.entries()) await db.run(`UPDATE ${coll.table} SET position = ? WHERE id = ?`, [i, id]);
  });

  async function replaceAll(coll, items) {
    await db.run(`DELETE FROM ${coll.table}`);
    for (const [i, item] of items.entries()) await create(coll, item, { id: item.id, position: i });
  }

  async function snapshot() {
    const out = {};
    for (const coll of Object.values(COLLECTIONS)) out[coll.name] = await list(coll);
    return out;
  }

  async function counts() {
    const out = {};
    for (const coll of Object.values(COLLECTIONS)) out[coll.name] = Number(await db.scalar(`SELECT COUNT(*) FROM ${coll.table}`));
    return out;
  }

  return { list, get, create, update, remove, reorder, replaceAll, snapshot, counts };
}

module.exports = { createContentRepo };
