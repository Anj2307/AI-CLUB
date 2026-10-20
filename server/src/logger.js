"use strict";
// Minimal structured logger: JSON lines in production, readable lines in development.
const config = require("./config");

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const threshold = LEVELS[process.env.LOG_LEVEL || (config.isTest ? "silent" : "info")] ?? 20;

function write(level, msg, meta) {
  if (LEVELS[level] < threshold) return;
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  if (config.isProd) {
    stream.write(JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta }) + "\n");
  } else {
    const extra = meta && Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    stream.write(`${new Date().toISOString().slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${msg}${extra}\n`);
  }
}

module.exports = {
  debug: (m, meta) => write("debug", m, meta),
  info: (m, meta) => write("info", m, meta),
  warn: (m, meta) => write("warn", m, meta),
  error: (m, meta) => write("error", m, meta)
};
