"use strict";
const express = require("express");
const pkg = require("../../../package.json");

module.exports = function healthRoutes(repos) {
  const r = express.Router();
  r.get("/health", async (_req, res) => {
    let db = "ok";
    try { await repos.db.get("SELECT 1"); } catch { db = "error"; }
    res.status(db === "ok" ? 200 : 503).json({ status: db === "ok" ? "ok" : "degraded", db, version: pkg.version, uptime: Math.round(process.uptime()) });
  });
  return r;
};
