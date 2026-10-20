"use strict";
const express = require("express");
const { requireRole } = require("../middleware/auth");
const { importSnapshot, exportSnapshot } = require("../lib/importer");

module.exports = function adminRoutes(repos) {
  const r = express.Router();
  const staff = requireRole("admin", "editor");

  r.get("/overview", staff, async (_req, res) => {
    res.json({
      counts: await repos.content.counts(), newMessages: await repos.messages.countNew(),
      users: await repos.users.count(), recent: await repos.audit.list(8)
    });
  });

  r.get("/audit", requireRole("admin"), async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ items: await repos.audit.list(limit) });
  });

  r.get("/export", staff, async (req, res) => {
    const snapshot = await exportSnapshot(repos);
    const stamp = new Date().toISOString().slice(0, 10);
    res.set("Content-Disposition", `attachment; filename="aiclub-backup-${stamp}.json"`);
    res.json(snapshot);
  });

  // Replaces ALL content. Admin only; validated in full before anything is written.
  r.post("/import", requireRole("admin"), express.json({ limit: "20mb" }), async (req, res) => {
    await importSnapshot(repos, req.body);
    await repos.audit.record(req.user, "import", "site", null, "Full content import");
    res.json({ ok: true, counts: await repos.content.counts() });
  });

  return r;
};
