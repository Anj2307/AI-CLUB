"use strict";
const express = require("express");
const pkg = require("../../../package.json");

module.exports = function healthRoutes(repos) {
  const r = express.Router();
  r.get("/health", (_req, res) => {
    let db = "ok";
    try { repos.db.prepare("SELECT 1").get(); } catch { db = "error"; }
    res.status(db === "ok" ? 200 : 503).json({ status: db === "ok" ? "ok" : "degraded", db, version: pkg.version, uptime: Math.round(process.uptime()) });
  });
  return r;
};
