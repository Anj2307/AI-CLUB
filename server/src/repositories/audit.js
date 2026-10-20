"use strict";

function createAuditRepo(db) {
  return {
    record: (user, action, entity, entityId, summary) =>
      db.run("INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, summary) VALUES (?, ?, ?, ?, ?, ?)",
        [user?.id ?? null, user?.name ?? null, action, entity, entityId ?? null, summary ? String(summary).slice(0, 200) : null]),
    list: (limit = 100) => db.all(`SELECT id, user_name AS "userName", action, entity, entity_id AS "entityId", summary, created_at AS "createdAt"
      FROM audit_log ORDER BY id DESC LIMIT ?`, [limit])
  };
}

module.exports = { createAuditRepo };
