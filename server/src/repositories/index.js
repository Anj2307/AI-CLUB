"use strict";
const { createContentRepo } = require("./content");
const { createSettingsRepo } = require("./settings");
const { createUsersRepo } = require("./users");
const { createMessagesRepo } = require("./messages");
const { createAuditRepo } = require("./audit");
const { createUploadsRepo } = require("./uploads");

function createRepos(db) {
  return {
    db,
    content: createContentRepo(db),
    settings: createSettingsRepo(db),
    users: createUsersRepo(db),
    messages: createMessagesRepo(db),
    audit: createAuditRepo(db),
    uploads: createUploadsRepo(db)
  };
}

module.exports = { createRepos };
