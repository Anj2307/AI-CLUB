"use strict";
const bcrypt = require("bcryptjs");
const { newId } = require("../lib/ids");

const PUBLIC_COLS = "id, email, name, role, created_at AS createdAt, last_login_at AS lastLoginAt";
const BCRYPT_ROUNDS = 12;

function createUsersRepo(db) {
  const list = () => db.prepare(`SELECT ${PUBLIC_COLS} FROM users ORDER BY created_at`).all();
  const get = (id) => db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`).get(id) || null;
  const getAuth = (id) => db.prepare("SELECT id, role, name, token_version AS tokenVersion FROM users WHERE id = ?").get(id) || null;
  const findByEmailWithHash = (email) => db.prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
  const count = () => db.prepare("SELECT COUNT(*) FROM users").pluck().get();
  const countAdmins = () => db.prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'").pluck().get();

  function create({ email, name, role, password }) {
    const id = newId("usr");
    db.prepare("INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, email.toLowerCase(), name, role, bcrypt.hashSync(password, BCRYPT_ROUNDS));
    return get(id);
  }

  function update(id, { name, role, password }) {
    if (name !== undefined) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
    // A role change revokes existing sessions so the new permissions apply immediately.
    if (role !== undefined) db.prepare("UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ? AND role <> ?").run(role, id, role);
    if (password !== undefined) setPassword(id, password);
    return get(id);
  }

  // Changing a password signs the user out everywhere.
  function setPassword(id, password) {
    db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?")
      .run(bcrypt.hashSync(password, BCRYPT_ROUNDS), id);
  }

  const remove = (id) => db.prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
  const touchLogin = (id) => db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  const verifyPassword = (user, password) => bcrypt.compareSync(password, user.password_hash);

  return { list, get, getAuth, findByEmailWithHash, count, countAdmins, create, update, setPassword, remove, touchLogin, verifyPassword };
}

module.exports = { createUsersRepo };
