"use strict";
const rateLimit = require("express-rate-limit");
const config = require("../config");
const { forbidden } = require("../lib/errors");

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF defence for cookie auth: state-changing requests must come from our own
// origin (or an explicitly allowed one). Browsers always send Origin on such requests.
function sameOrigin(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next(); // non-browser clients (curl, tests) - auth still applies
  const self = `${req.protocol}://${req.get("host")}`;
  if (origin === self || config.corsOrigins.includes(origin)) return next();
  next(forbidden("Cross-origin request blocked"));
}

// Minimal CORS for a separately hosted frontend (e.g. GitHub Pages) listed in CORS_ORIGINS.
function cors(req, res, next) {
  const origin = req.get("origin");
  if (origin && config.corsOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "600");
      return res.sendStatus(204);
    }
  }
  next();
}

const limiter = (windowMs, limit, message) => rateLimit({
  windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false,
  skip: () => config.isTest,
  handler: (_req, res) => res.status(429).json({ error: { message } })
});

const loginLimiter = limiter(15 * 60 * 1000, 10, "Too many sign-in attempts. Try again in 15 minutes.");
const contactLimiter = limiter(60 * 60 * 1000, 5, "Too many messages. Please try again later.");
const apiLimiter = limiter(60 * 1000, 300, "Too many requests. Slow down a little.");

module.exports = { sameOrigin, cors, loginLimiter, contactLimiter, apiLimiter };
