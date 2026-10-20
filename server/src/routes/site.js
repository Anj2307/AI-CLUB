"use strict";
const express = require("express");
const { exportSnapshot } = require("../lib/importer");

// Public, read-only bootstrap: everything a page needs in one cached request.
module.exports = function siteRoutes(repos) {
  const r = express.Router();
  r.get("/site", async (_req, res) => {
    res.set("Cache-Control", "no-cache"); // always revalidate; ETag makes repeat loads cheap
    res.json(await exportSnapshot(repos));
  });
  r.get("/settings", async (_req, res) => res.json(await repos.settings.getAll()));
  return r;
};
