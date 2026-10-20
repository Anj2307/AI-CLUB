"use strict";
const { badRequest } = require("../lib/errors");

// Parses req.body with a zod schema; replaces it with the clean, typed result.
const validate = (schema) => (req, _res, next) => {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    return next(badRequest("Validation failed", fields));
  }
  req.body = r.data;
  next();
};

module.exports = { validate };
