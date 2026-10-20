"use strict";
const express = require("express");
const { COLLECTIONS, SETTINGS, z } = require("../lib/schemas");
const { validate } = require("../middleware/validate");
const { requireRole } = require("../middleware/auth");
const { notFound } = require("../lib/errors");

const REORDER = z.object({ ids: z.array(z.string().max(64)).max(5000) }).strict();
const canEdit = requireRole("admin", "editor");
const titleOf = (item) => item?.title || item?.name || item?.caption || item?.id;

// CRUD for every collection in the registry, plus site settings.
module.exports = function contentRoutes(repos) {
  const r = express.Router();

  r.put("/settings", canEdit, validate(SETTINGS), (req, res) => {
    repos.settings.set(req.body);
    repos.audit.record(req.user, "update", "settings", null, Object.keys(req.body).join(", "));
    res.json(repos.settings.getAll());
  });

  r.param("collection", (req, _res, next, name) => {
    req.coll = Object.hasOwn(COLLECTIONS, name) ? COLLECTIONS[name] : null;
    next(req.coll ? undefined : notFound(`Unknown collection "${name}"`));
  });

  r.get("/:collection", (req, res) => res.json({ items: repos.content.list(req.coll) }));

  r.get("/:collection/:id", (req, res) => {
    const item = repos.content.get(req.coll, req.params.id);
    if (!item) throw notFound();
    res.json(item);
  });

  r.post("/:collection", canEdit, (req, res, next) => validate(req.coll.create)(req, res, next), (req, res) => {
    const item = repos.content.create(req.coll, req.body);
    repos.audit.record(req.user, "create", req.coll.name, item.id, titleOf(item));
    res.status(201).location(`${req.baseUrl}/${req.coll.name}/${item.id}`).json(item);
  });

  r.post("/:collection/reorder", canEdit, validate(REORDER), (req, res) => {
    repos.content.reorder(req.coll, req.body.ids);
    repos.audit.record(req.user, "reorder", req.coll.name, null, `${req.body.ids.length} items`);
    res.json({ items: repos.content.list(req.coll) });
  });

  r.patch("/:collection/:id", canEdit, (req, res, next) => validate(req.coll.update)(req, res, next), (req, res) => {
    const item = repos.content.update(req.coll, req.params.id, req.body);
    if (!item) throw notFound();
    repos.audit.record(req.user, "update", req.coll.name, item.id, titleOf(item));
    res.json(item);
  });

  r.delete("/:collection/:id", canEdit, (req, res) => {
    const item = repos.content.get(req.coll, req.params.id);
    if (!item || !repos.content.remove(req.coll, req.params.id)) throw notFound();
    repos.audit.record(req.user, "delete", req.coll.name, req.params.id, titleOf(item));
    res.status(204).end();
  });

  return r;
};
