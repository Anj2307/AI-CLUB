"use strict";
const bcrypt = require("bcryptjs");
const { newId } = require("../lib/ids");

const PUBLIC_COLS = 'id, email, name, role, created_at AS "createdAt", last_login_at AS "lastLoginAt"';
const BCRYPT_ROUNDS = 12;

function createUsersRepo(db) {
  const list = () => db.all(`SELECT ${PUBLIC_COLS} FROM users ORDER BY created_at`);
  const get = async (id) => (await db.get(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`, [id])) || null;
  const getAuth = async (id) => (await db.get('SELECT id, role, name, token_version AS "tokenVersion" FROM users WHERE id = ?', [id])) || null;
  // Emails are stored lowercased, so lowercasing the input makes lookups case-insensitive on both databases.
  const findByEmailWithHash = async (email) => (await db.get("SELECT * FROM users WHERE email = ?", [String(email).toLowerCase()])) || null;
  const count = async () => Number(await db.scalar("SELECT COUNT(*) FROM users"));
  const countAdmins = async () => Number(await db.scalar("SELECT COUNT(*) FROM users WHERE role = 'admin'"));

  async function create({ email, name, role, password }) {
    const id = newId("usr");
    await db.run("INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)",
      [id, email.toLowerCase(), name, role, await bcrypt.hash(password, BCRYPT_ROUNDS)]);
    return get(id);
  }

  async function update(id, { name, role, password }) {
    if (name !== undefined) await db.run("UPDATE users SET name = ? WHERE id = ?", [name, id]);
    // A role change revokes existing sessions so the new permissions apply immediately.
    if (role !== undefined) await db.run("UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ? AND role <> ?", [role, id, role]);
    if (password !== undefined) await setPassword(id, password);
    return get(id);
  }

  // Changing a password signs the user out everywhere.
  async function setPassword(id, password) {
    await db.run("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
      [await bcrypt.hash(password, BCRYPT_ROUNDS), id]);
  }

  const remove = async (id) => (await db.run("DELETE FROM users WHERE id = ?", [id])).changes > 0;
  const touchLogin = (id) => db.run("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  const verifyPassword = (user, password) => bcrypt.compare(password, user.password_hash);

  return { list, get, getAuth, findByEmailWithHash, count, countAdmins, create, update, setPassword, remove, touchLogin, verifyPassword };
}

module.exports = { createUsersRepo };
