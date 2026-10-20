"use strict";
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const config = require("./config");
const log = require("./logger");
const { authenticate } = require("./middleware/auth");
const { sameOrigin, cors, apiLimiter } = require("./middleware/security");
const { notFoundApi, errorHandler } = require("./middleware/errors");
const { createStorage } = require("./lib/storage");

// Builds the Express app around an already-open set of repositories (so tests can use an in-memory DB)
// and an upload storage backend (local disk unless Supabase Storage is configured).
function createApp(repos, storage = createStorage()) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        frameSrc: ["https://www.google.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null // TLS is terminated by the reverse proxy, which redirects HTTP itself
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());

  // Request log (skips static assets to keep logs useful).
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => log.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      ms: Number((process.hrtime.bigint() - start) / 1000000n), user: req.user?.id
    }));
    next();
  });

  // ---------- API ----------
  const api = express.Router();
  api.use(cors, apiLimiter, express.json({ limit: "1mb" }), cookieParser(), sameOrigin, authenticate(repos));
  api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  api.use(require("./routes/health")(repos));
  api.use(require("./routes/site")(repos));
  api.use("/auth", require("./routes/auth")(repos));
  api.use("/messages", require("./routes/messages")(repos));
  api.use("/users", require("./routes/users")(repos));
  api.use("/uploads", require("./routes/uploads")(repos, storage));
  api.use("/admin", require("./routes/admin")(repos));
  api.use(require("./routes/content")(repos));
  api.use(notFoundApi);
  api.use(errorHandler);
  app.use("/api/v1", api);

  // ---------- uploaded files ----------
  // Random immutable names -> cache forever. The sandbox CSP neutralises scripts in SVGs opened directly.
  app.use("/uploads", express.static(config.uploadDir, {
    immutable: true, maxAge: "365d", index: false, dotfiles: "deny",
    setHeaders: (res) => {
      res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.set("X-Content-Type-Options", "nosniff");
    }
  }));

  // ---------- website ----------
  app.use(express.static(config.publicDir, {
    extensions: ["html"], // /people -> people.html
    index: "index.html",
    setHeaders: (res, file) => {
      res.set("Cache-Control", file.endsWith(".html") ? "no-cache" : "public, max-age=3600, must-revalidate");
    }
  }));

  app.use((req, res) => {
    if (req.accepts("html")) return res.status(404).sendFile(path.join(config.publicDir, "404.html"));
    res.status(404).json({ error: { message: "Not found" } });
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
