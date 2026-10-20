"use strict";
const express = require("express");
const { requireRole } = require("../middleware/auth");
const { importSnapshot, exportSnapshot } = require("../lib/importer");

module.exports = function adminRoutes(repos) {
  const r = express.Router();
  const staff = requireRole("admin", "editor");

  r.get("/overview", staff, (_req, res) => {
    res.json({ counts: repos.content.counts(), newMessages: repos.messages.countNew(), users: repos.users.count(), recent: repos.audit.list(8) });
  });

  r.get("/audit", requireRole("admin"), (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ items: repos.audit.list(limit) });
  });

  r.get("/export", staff, (req, res) => {
    const stamp = new Date().toISOString().slice(0, 10);
    res.set("Content-Disposition", `attachment; filename="aiclub-backup-${stamp}.json"`);
    res.json(exportSnapshot(repos));
  });

  // Replaces ALL content. Admin only; validated in full before anything is written.
  r.post("/import", requireRole("admin"), express.json({ limit: "20mb" }), (req, res) => {
    importSnapshot(repos, req.body);
    repos.audit.record(req.user, "import", "site", null, "Full content import");
    res.json({ ok: true, counts: repos.content.counts() });
  });

  return r;
};
