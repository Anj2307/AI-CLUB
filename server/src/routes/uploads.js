"use strict";
const express = require("express");
const multer = require("multer");
const config = require("../config");
const { newId } = require("../lib/ids");
const { requireRole } = require("../middleware/auth");
const { badRequest, notFound } = require("../lib/errors");

// Allowed types, identified by file signature rather than the client-supplied mime type.
const SIGNATURES = [
  { mime: "image/png", ext: ".png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: ".jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", ext: ".gif", test: (b) => b.subarray(0, 6).toString("ascii").startsWith("GIF8") },
  { mime: "image/webp", ext: ".webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "image/avif", ext: ".avif", test: (b) => b.subarray(4, 12).toString("ascii") === "ftypavif" },
  // SVG is served with a sandboxing CSP (see app.js), so embedded scripts can't run.
  { mime: "image/svg+xml", ext: ".svg", test: (b) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(b.subarray(0, 1024).toString("utf8")) }
];

// storage: where files go (local disk or Supabase Storage, see lib/storage.js).
module.exports = function uploadRoutes(repos, storage) {
  const r = express.Router();
  r.use(requireRole("admin", "editor"));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 }
  });

  r.post("/", upload.single("file"), async (req, res) => {
    if (!req.file) throw badRequest('Attach an image in the "file" field');
    const kind = SIGNATURES.find((s) => s.test(req.file.buffer));
    if (!kind) throw badRequest("Only PNG, JPEG, GIF, WebP, AVIF or SVG images are allowed");
    const id = newId("upl");
    const filename = id + kind.ext;
    await storage.save(filename, req.file.buffer, kind.mime);
    await repos.uploads.create({
      id, filename, originalName: req.file.originalname.slice(0, 200), mime: kind.mime, size: req.file.size, uploadedBy: req.user.id
    });
    await repos.audit.record(req.user, "upload", "uploads", id, req.file.originalname);
    res.status(201).json({ id, url: storage.urlFor(filename), mime: kind.mime, size: req.file.size });
  });

  r.get("/", async (_req, res) => res.json({ items: (await repos.uploads.list()).map((u) => ({ ...u, url: storage.urlFor(u.filename) })) }));

  r.delete("/:id", async (req, res) => {
    const u = await repos.uploads.get(req.params.id);
    if (!u) throw notFound();
    await storage.remove(u.filename);
    await repos.uploads.remove(u.id);
    await repos.audit.record(req.user, "delete", "uploads", u.id, u.original_name);
    res.status(204).end();
  });

  return r;
};
