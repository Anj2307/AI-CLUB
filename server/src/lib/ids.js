"use strict";
const crypto = require("node:crypto");

// Short, URL-safe, sortable-enough ids: <prefix>_<time><random>.
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
}

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

module.exports = { newId, camelToSnake, snakeToCamel };
