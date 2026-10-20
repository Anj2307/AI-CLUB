"use strict";
const express = require("express");
const { MESSAGE, z } = require("../lib/schemas");
const { validate } = require("../middleware/validate");
const { requireRole } = require("../middleware/auth");
const { contactLimiter } = require("../middleware/security");
const { notFound } = require("../lib/errors");

const STATUS = z.object({ status: z.enum(["new", "read", "archived"]) }).strict();
const staff = requireRole("admin", "editor");

module.exports = function messageRoutes(repos) {
  const r = express.Router();

  // Public contact form.
  r.post("/", contactLimiter, validate(MESSAGE), (req, res) => {
    if (req.body.website) return res.status(202).json({ ok: true }); // honeypot tripped: pretend success
    repos.messages.create(req.body);
    res.status(201).json({ ok: true });
  });

  r.get("/", staff, (req, res) => {
    const status = ["new", "read", "archived"].includes(req.query.status) ? req.query.status : null;
    res.json({ items: repos.messages.list(status) });
  });

  r.patch("/:id", staff, validate(STATUS), (req, res) => {
    if (!repos.messages.setStatus(req.params.id, req.body.status)) throw notFound();
    res.status(204).end();
  });

  r.delete("/:id", staff, (req, res) => {
    if (!repos.messages.remove(req.params.id)) throw notFound();
    repos.audit.record(req.user, "delete", "messages", req.params.id);
    res.status(204).end();
  });

  return r;
};
