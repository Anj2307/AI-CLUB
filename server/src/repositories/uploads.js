"use strict";

function createUploadsRepo(db) {
  return {
    create: (u) => db.prepare("INSERT INTO uploads (id, filename, original_name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)")
      .run(u.id, u.filename, u.originalName, u.mime, u.size, u.uploadedBy),
    list: () => db.prepare(`SELECT id, filename, original_name AS originalName, mime, size, created_at AS createdAt
      FROM uploads ORDER BY created_at DESC`).all(),
    get: (id) => db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) || null,
    remove: (id) => db.prepare("DELETE FROM uploads WHERE id = ?").run(id).changes > 0
  };
}

module.exports = { createUploadsRepo };
