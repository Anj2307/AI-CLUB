"use strict";
const express = require("express");
const { USER_CREATE, USER_UPDATE } = require("../lib/schemas");
const { validate } = require("../middleware/validate");
const { requireRole } = require("../middleware/auth");
const { notFound, conflict, badRequest } = require("../lib/errors");

// Admin-only account management.
module.exports = function userRoutes(repos) {
  const r = express.Router();
  r.use(requireRole("admin"));

  r.get("/", async (_req, res) => res.json({ items: await repos.users.list() }));

  r.post("/", validate(USER_CREATE), async (req, res) => {
    if (await repos.users.findByEmailWithHash(req.body.email)) throw conflict("An account with that email already exists");
    const user = await repos.users.create(req.body);
    await repos.audit.record(req.user, "create", "users", user.id, user.email);
    res.status(201).json(user);
  });

  r.patch("/:id", validate(USER_UPDATE), async (req, res) => {
    const existing = await repos.users.get(req.params.id);
    if (!existing) throw notFound();
    if (req.body.role === "editor" && existing.role === "admin" && await repos.users.countAdmins() <= 1) {
      throw badRequest("There must always be at least one admin");
    }
    const user = await repos.users.update(req.params.id, req.body);
    await repos.audit.record(req.user, "update", "users", user.id, user.email);
    res.json(user);
  });

  r.delete("/:id", async (req, res) => {
    if (req.params.id === req.user.id) throw badRequest("You can't delete your own account");
    const existing = await repos.users.get(req.params.id);
    if (!existing) throw notFound();
    if (existing.role === "admin" && await repos.users.countAdmins() <= 1) throw badRequest("There must always be at least one admin");
    await repos.users.remove(req.params.id);
    await repos.audit.record(req.user, "delete", "users", req.params.id, existing.email);
    res.status(204).end();
  });

  return r;
};
