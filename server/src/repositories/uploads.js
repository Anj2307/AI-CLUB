"use strict";

function createUploadsRepo(db) {
  return {
    create: (u) => db.run("INSERT INTO uploads (id, filename, original_name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
      [u.id, u.filename, u.originalName, u.mime, u.size, u.uploadedBy]),
    list: () => db.all(`SELECT id, filename, original_name AS "originalName", mime, size, created_at AS "createdAt"
      FROM uploads ORDER BY created_at DESC`),
    get: async (id) => (await db.get("SELECT * FROM uploads WHERE id = ?", [id])) || null,
    remove: async (id) => (await db.run("DELETE FROM uploads WHERE id = ?", [id])).changes > 0
  };
}

module.exports = { createUploadsRepo };
