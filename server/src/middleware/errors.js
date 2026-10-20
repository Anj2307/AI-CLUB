"use strict";
const multer = require("multer");
const { HttpError } = require("../lib/errors");
const log = require("../logger");

function notFoundApi(req, res) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError) err = new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message);
  if (err.type === "entity.parse.failed") err = new HttpError(400, "Malformed JSON body");
  if (err.type === "entity.too.large") err = new HttpError(413, "Request body too large");

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) log.error("Unhandled error", { method: req.method, path: req.path, err: err.stack || String(err) });
  res.status(status).json({
    error: {
      message: status >= 500 ? "Something went wrong on our side" : err.message,
      ...(err.details ? { details: err.details } : {})
    }
  });
}

module.exports = { notFoundApi, errorHandler };
