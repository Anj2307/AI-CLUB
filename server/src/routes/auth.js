"use strict";
const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const { z, PASSWORD } = require("../lib/schemas");
const { validate } = require("../middleware/validate");
const { requireAuth, issueSession, clearSession } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/security");
const { unauthorized, badRequest } = require("../lib/errors");

const LOGIN = z.object({ email: z.string().trim().max(254), password: z.string().max(200) }).strict();
const CHANGE_PASSWORD = z.object({ currentPassword: z.string().max(200), newPassword: PASSWORD }).strict();

module.exports = function authRoutes(repos) {
  const r = express.Router();

  r.post("/login", loginLimiter, validate(LOGIN), async (req, res) => {
    const user = await repos.users.findByEmailWithHash(req.body.email);
    // Same message and similar timing whether the email exists or not.
    const ok = await repos.users.verifyPassword(user || { password_hash: dummyHash() }, req.body.password) && !!user;
    if (!ok) throw unauthorized("Incorrect email or password");
    await repos.users.touchLogin(user.id);
    issueSession(res, { id: user.id, tokenVersion: user.token_version });
    await repos.audit.record(user, "login", "session", user.id);
    res.json({ user: await repos.users.get(user.id) });
  });

  r.post("/logout", (req, res) => {
    clearSession(res);
    res.status(204).end();
  });

  // Session probe: 200 either way, so the admin app can check sign-in state without a console error.
  r.get("/me", async (req, res) => res.json({ user: req.user ? await repos.users.get(req.user.id) : null }));

  r.post("/password", requireAuth, validate(CHANGE_PASSWORD), async (req, res) => {
    const full = await repos.users.findByEmailWithHash((await repos.users.get(req.user.id)).email);
    if (!await repos.users.verifyPassword(full, req.body.currentPassword)) throw badRequest("Current password is incorrect");
    await repos.users.setPassword(req.user.id, req.body.newPassword);
    const fresh = await repos.users.getAuth(req.user.id);
    issueSession(res, fresh); // keep this browser signed in; other sessions are revoked
    await repos.audit.record(req.user, "update", "password", req.user.id);
    res.status(204).end();
  });

  return r;
};

// Hash of a random secret, compared against for unknown emails so response timing doesn't reveal which emails exist.
let cachedDummy;
function dummyHash() {
  cachedDummy ??= bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);
  return cachedDummy;
}
