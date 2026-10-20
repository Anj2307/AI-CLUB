"use strict";
const jwt = require("jsonwebtoken");
const config = require("../config");
const { unauthorized, forbidden } = require("../lib/errors");

const COOKIE = "aiclub_session";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: config.sessionHours * 3600 * 1000
  };
}

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, v: user.tokenVersion ?? 0 }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
    issuer: "aiclub-api"
  });
  res.cookie(COOKIE, token, cookieOptions());
}

function clearSession(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE, opts);
}

// Resolves req.user from the session cookie (or a Bearer token for scripts).
// The token_version check lets password/role changes revoke existing sessions.
function authenticate(repos) {
  return async (req, _res, next) => {
    const header = req.get("authorization");
    const token = req.cookies?.[COOKIE] || (header?.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token) return next();
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { issuer: "aiclub-api" });
    } catch { return next(); /* invalid or expired - treat as anonymous */ }
    try {
      const user = await repos.users.getAuth(payload.sub);
      if (user && user.tokenVersion === payload.v) req.user = user;
      next();
    } catch (err) { next(err); }
  };
}

const requireAuth = (req, _res, next) => (req.user ? next() : next(unauthorized()));

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

module.exports = { authenticate, requireAuth, requireRole, issueSession, clearSession, COOKIE };
