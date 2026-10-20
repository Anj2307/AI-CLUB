"use strict";
const { newId } = require("../lib/ids");

const COLS = 'id, name, email, topic, body, status, created_at AS "createdAt"';

function createMessagesRepo(db) {
  return {
    create: async ({ name, email, topic, body }) => {
      const id = newId("msg");
      await db.run("INSERT INTO messages (id, name, email, topic, body) VALUES (?, ?, ?, ?, ?)", [id, name, email, topic, body]);
      return id;
    },
    list: (status) => status
      ? db.all(`SELECT ${COLS} FROM messages WHERE status = ? ORDER BY created_at DESC`, [status])
      : db.all(`SELECT ${COLS} FROM messages ORDER BY created_at DESC`),
    setStatus: async (id, status) => (await db.run("UPDATE messages SET status = ? WHERE id = ?", [status, id])).changes > 0,
    remove: async (id) => (await db.run("DELETE FROM messages WHERE id = ?", [id])).changes > 0,
    countNew: async () => Number(await db.scalar("SELECT COUNT(*) FROM messages WHERE status = 'new'"))
  };
}

module.exports = { createMessagesRepo };
