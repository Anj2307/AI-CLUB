"use strict";
const config = require("./config");
const log = require("./logger");
const db = require("./db");
const { createRepos } = require("./repositories");
const { createApp } = require("./app");
const { seedContent, ensureAdmin } = require("./db/seed");

const connection = db.open();
const repos = createRepos(connection);
seedContent(repos);
ensureAdmin(repos);

const server = createApp(repos).listen(config.port, config.host, () => {
  log.info(`AI Club server listening on http://localhost:${config.port}`, { env: config.env });
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish, close the DB.
function shutdown(signal) {
  log.info(`${signal} received, shutting down`);
  server.close(() => {
    connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
