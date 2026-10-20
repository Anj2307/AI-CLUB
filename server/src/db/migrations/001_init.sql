-- Users who can sign in to the admin panel.
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  token_version INTEGER NOT NULL DEFAULT 0,  -- bump to revoke every session for a user
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

-- Key/value site settings (branding, contact, stats). Values are JSON.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Content collections. Every table shares: id, position (manual ordering), timestamps.
CREATE TABLE people (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL, role TEXT NOT NULL, team TEXT NOT NULL, year TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '', github TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL, domain TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Ongoing',
  image TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  tech TEXT NOT NULL DEFAULT '[]', team TEXT NOT NULL DEFAULT '[]',
  github TEXT NOT NULL DEFAULT '', demo TEXT NOT NULL DEFAULT '', year INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE events (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '', venue TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Other', image TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  register_link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX events_date_idx ON events (date);

CREATE TABLE gallery (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  src TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', album TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE news (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL, date TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Announcement',
  image TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX news_date_idx ON news (date);

CREATE TABLE sponsors (
  id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL, logo TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Messages sent through the public contact form.
CREATE TABLE messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  topic      TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX messages_status_idx ON messages (status, created_at);

-- Files uploaded through the admin panel.
CREATE TABLE uploads (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  uploaded_by   TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Who changed what, for accountability between club generations.
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  summary    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX audit_created_idx ON audit_log (created_at);
