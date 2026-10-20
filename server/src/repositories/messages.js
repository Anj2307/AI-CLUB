"use strict";
const { newId } = require("../lib/ids");

const COLS = "id, name, email, topic, body, status, created_at AS createdAt";

function createMessagesRepo(db) {
  return {
    create: ({ name, email, topic, body }) => {
      const id = newId("msg");
      db.prepare("INSERT INTO messages (id, name, email, topic, body) VALUES (?, ?, ?, ?, ?)").run(id, name, email, topic, body);
      return id;
    },
    list: (status) => status
      ? db.prepare(`SELECT ${COLS} FROM messages WHERE status = ? ORDER BY created_at DESC`).all(status)
      : db.prepare(`SELECT ${COLS} FROM messages ORDER BY created_at DESC`).all(),
    setStatus: (id, status) => db.prepare("UPDATE messages SET status = ? WHERE id = ?").run(status, id).changes > 0,
    remove: (id) => db.prepare("DELETE FROM messages WHERE id = ?").run(id).changes > 0,
    countNew: () => db.scalar("SELECT COUNT(*) FROM messages WHERE status = 'new'")
  };
}

module.exports = { createMessagesRepo };
