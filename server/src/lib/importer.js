"use strict";
const { COLLECTIONS, SETTINGS } = require("./schemas");
const { badRequest } = require("./errors");

// Validates a full-site snapshot ({ settings, people, projects, ... }) and replaces all content atomically.
function importSnapshot(repos, snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw badRequest("Expected a JSON object");
  const problems = [];
  const parsed = {};

  const s = SETTINGS.safeParse(snapshot.settings || {});
  if (!s.success) problems.push({ path: "settings", issues: s.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  else parsed.settings = s.data;

  for (const coll of Object.values(COLLECTIONS)) {
    const items = snapshot[coll.name] ?? [];
    if (!Array.isArray(items)) { problems.push({ path: coll.name, issues: ["must be an array"] }); continue; }
    parsed[coll.name] = items.map((item, i) => {
      const r = coll.import.safeParse(item);
      if (!r.success) problems.push({ path: `${coll.name}[${i}]`, issues: r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`) });
      return r.data;
    });
  }
  if (problems.length) throw badRequest("Import failed validation", problems.slice(0, 20));

  repos.db.transaction(() => {
    repos.settings.replaceAll(parsed.settings);
    for (const coll of Object.values(COLLECTIONS)) repos.content.replaceAll(coll, parsed[coll.name]);
  })();
}

function exportSnapshot(repos) {
  return { settings: repos.settings.getAll(), ...repos.content.snapshot() };
}

module.exports = { importSnapshot, exportSnapshot };
