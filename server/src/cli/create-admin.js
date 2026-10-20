"use strict";
/*
 * Create or reset an admin account from the command line:
 *   npm run create-admin -- you@iitdh.ac.in "Your Name"
 * Prompts for the password (or reads ADMIN_PASSWORD).
 */
const readline = require("node:readline/promises");
const db = require("../db");
const { createRepos } = require("../repositories");
const { PASSWORD } = require("../lib/schemas");

(async () => {
  const [email, name = "Club Admin"] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: npm run create-admin -- <email> ["Full Name"]');
    process.exit(1);
  }
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password (min 10 chars): ");
    rl.close();
  }
  const check = PASSWORD.safeParse(password);
  if (!check.success) { console.error(check.error.issues[0].message); process.exit(1); }

  const connection = await db.open();
  const repos = createRepos(connection);
  const existing = await repos.users.findByEmailWithHash(email);
  if (existing) {
    await repos.users.update(existing.id, { role: "admin", password });
    console.log(`Updated ${email}: role=admin, password reset.`);
  } else {
    await repos.users.create({ email, name, role: "admin", password });
    console.log(`Created admin ${email}.`);
  }
  await connection.close();
})();
