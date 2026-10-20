"use strict";
const config = require("./config");
const log = require("./logger");
const db = require("./db");
const { createRepos } = require("./repositories");
const { createApp } = require("./app");
const { seedContent, ensureAdmin } = require("./db/seed");

const { createStorage } = require("./lib/storage");

(async () => {
  const connection = await db.open();
  const storage = createStorage();
  const repos = createRepos(connection);
  await seedContent(repos);
  await ensureAdmin(repos);

  const server = createApp(repos, storage).listen(config.port, config.host, () => {
    log.info(`AI Club server listening on http://localhost:${config.port}`, { env: config.env, db: connection.dialect, uploads: storage.kind });
  });

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, close the DB.
  function shutdown(signal) {
    log.info(`${signal} received, shutting down`);
    server.close(async () => {
      await connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})().catch((err) => {
  log.error("Failed to start", { err: err.stack || String(err) });
  process.exit(1);
});
