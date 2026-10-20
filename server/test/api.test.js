"use strict";
process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = require("node:path").join(require("node:os").tmpdir(), `aiclub-test-uploads-${process.pid}`);

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const db = require("../src/db");
const { createRepos } = require("../src/repositories");
const { createApp } = require("../src/app");
const { seedContent, loadStaticData } = require("../src/db/seed");

const SEED_NAME = loadStaticData().settings.clubName;

const ADMIN = { email: "admin@test.dev", password: "correct-horse-battery" };
const EDITOR = { email: "editor@test.dev", password: "editor-password-1" };

function setup() {
  const repos = createRepos(db.open(":memory:"));
  seedContent(repos);
  repos.users.create({ ...ADMIN, name: "Admin", role: "admin" });
  repos.users.create({ ...EDITOR, name: "Editor", role: "editor" });
  return { repos, app: createApp(repos) };
}

async function login(app, creds) {
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send(creds).expect(200);
  return agent;
}

describe("public API", () => {
  const { app } = setup();

  test("health check reports ok", async () => {
    const res = await request(app).get("/api/v1/health").expect(200);
    assert.equal(res.body.status, "ok");
  });

  test("site bootstrap returns seeded content", async () => {
    const res = await request(app).get("/api/v1/site").expect(200);
    assert.equal(res.body.settings.clubName, SEED_NAME);
    assert.ok(res.body.people.length > 0);
    assert.ok(Array.isArray(res.body.projects[0].tech), "JSON columns are decoded");
    assert.ok(!("position" in res.body.people[0]), "internal columns are hidden");
  });

  test("collections can be read but not written anonymously", async () => {
    await request(app).get("/api/v1/events").expect(200);
    await request(app).post("/api/v1/events").send({ title: "x", date: "2026-01-01", type: "Talk" }).expect(401);
  });

  test("unknown collection is a 404", async () => {
    await request(app).get("/api/v1/nope").expect(404);
  });

  test("contact form stores a message and validates input", async () => {
    await request(app).post("/api/v1/messages").send({ name: "A", email: "a@b.co", topic: "Other", body: "Hi" }).expect(201);
    const bad = await request(app).post("/api/v1/messages").send({ name: "", email: "nope", topic: "x", body: "" }).expect(400);
    assert.ok(bad.body.error.details.email);
  });

  test("clean URLs and HTML 404 page", async () => {
    await request(app).get("/people").expect(200).expect("content-type", /html/);
    await request(app).get("/does-not-exist").set("Accept", "text/html").expect(404).expect("content-type", /html/);
  });

  test("security headers are set", async () => {
    const res = await request(app).get("/");
    assert.match(res.headers["content-security-policy"], /script-src 'self'/);
    assert.equal(res.headers["x-powered-by"], undefined);
  });
});

describe("auth", () => {
  const { app } = setup();

  test("rejects a wrong password with a generic message", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ ...ADMIN, password: "wrong" }).expect(401);
    assert.equal(res.body.error.message, "Incorrect email or password");
    await request(app).post("/api/v1/auth/login").send({ email: "ghost@x.dev", password: "wrong" }).expect(401);
  });

  test("login sets an httpOnly cookie and /me works", async () => {
    const res = await request(app).post("/api/v1/auth/login").send(ADMIN).expect(200);
    assert.match(res.headers["set-cookie"][0], /HttpOnly/i);
    const agent = await login(app, ADMIN);
    const me = await agent.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.user.role, "admin");
    assert.equal(me.body.user.password_hash, undefined);
  });

  test("changing password revokes other sessions", async () => {
    const a = await login(app, EDITOR);
    const b = await login(app, EDITOR);
    await a.post("/api/v1/auth/password").send({ currentPassword: EDITOR.password, newPassword: "a-brand-new-pass" }).expect(204);
    await a.get("/api/v1/auth/me").expect(200);
    assert.equal((await b.get("/api/v1/auth/me").expect(200)).body.user, null);
    await b.get("/api/v1/messages").expect(401);
  });

  test("cross-origin writes are blocked", async () => {
    const agent = await login(app, ADMIN);
    await agent.put("/api/v1/settings").set("Origin", "https://evil.example").send({ tagline: "pwned" }).expect(403);
  });
});

describe("content management", () => {
  const { app } = setup();
  let editor;
  before(async () => { editor = await login(app, EDITOR); });

  test("create, update, delete an event", async () => {
    const created = await editor.post("/api/v1/events")
      .send({ title: "Test Talk", date: "2027-01-15", type: "Talk", registerLink: "https://example.com" }).expect(201);
    assert.equal(created.body.registerLink, "https://example.com");
    assert.equal(created.body.venue, "", "defaults are applied");

    const updated = await editor.patch(`/api/v1/events/${created.body.id}`).send({ venue: "LHC-101" }).expect(200);
    assert.equal(updated.body.venue, "LHC-101");
    assert.equal(updated.body.title, "Test Talk");

    await editor.delete(`/api/v1/events/${created.body.id}`).expect(204);
    await editor.get(`/api/v1/events/${created.body.id}`).expect(404);
  });

  test("rejects script URLs and unknown fields", async () => {
    const res = await editor.post("/api/v1/projects").send({ title: "X", status: "Ongoing", github: "javascript:alert(1)" }).expect(400);
    assert.ok(res.body.error.details.github);
    await editor.post("/api/v1/projects").send({ title: "X", status: "Ongoing", hacker: true }).expect(400);
  });

  test("reorder changes list order", async () => {
    const { body } = await editor.get("/api/v1/people").expect(200);
    const ids = body.items.map((p) => p.id).reverse();
    const res = await editor.post("/api/v1/people/reorder").send({ ids }).expect(200);
    assert.deepEqual(res.body.items.map((p) => p.id), ids);
  });

  test("settings update is partial and validated", async () => {
    const res = await editor.put("/api/v1/settings").send({ tagline: "New tagline", stats: { members: 300 } }).expect(200);
    assert.equal(res.body.tagline, "New tagline");
    assert.equal(res.body.clubName, SEED_NAME);
    await editor.put("/api/v1/settings").send({ clubName: "" }).expect(400);
  });

  test("editors cannot manage users or import", async () => {
    await editor.get("/api/v1/users").expect(403);
    await editor.post("/api/v1/admin/import").send({}).expect(403);
  });

  test("changes are recorded in the audit log", async () => {
    const admin = await login(app, ADMIN);
    const res = await admin.get("/api/v1/admin/audit").expect(200);
    assert.ok(res.body.items.some((e) => e.entity === "events" && e.action === "create"));
  });
});

describe("uploads", () => {
  const { app } = setup();
  const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

  test("accepts a real image and serves it", async () => {
    const agent = await login(app, EDITOR);
    const res = await agent.post("/api/v1/uploads").attach("file", PNG, "dot.png").expect(201);
    assert.match(res.body.url, /^\/uploads\/upl_.+\.png$/);
    const file = await request(app).get(res.body.url).expect(200);
    assert.match(file.headers["content-security-policy"], /sandbox/);
  });

  test("rejects non-images even with an image extension", async () => {
    const agent = await login(app, EDITOR);
    await agent.post("/api/v1/uploads").attach("file", Buffer.from("<?php echo 1;"), "evil.png").expect(400);
  });
});

describe("users & backup", () => {
  const { app } = setup();
  let admin;
  before(async () => { admin = await login(app, ADMIN); });

  test("admin can create an editor who can then sign in", async () => {
    await admin.post("/api/v1/users").send({ email: "new@test.dev", name: "New", role: "editor", password: "new-user-password" }).expect(201);
    await admin.post("/api/v1/users").send({ email: "new@test.dev", name: "Dup", role: "editor", password: "new-user-password" }).expect(409);
    await login(app, { email: "new@test.dev", password: "new-user-password" });
  });

  test("the last admin cannot be demoted or deleted", async () => {
    const { body } = await admin.get("/api/v1/users").expect(200);
    const me = body.items.find((u) => u.email === ADMIN.email);
    await admin.patch(`/api/v1/users/${me.id}`).send({ role: "editor" }).expect(400);
    await admin.delete(`/api/v1/users/${me.id}`).expect(400);
  });

  test("export then import round-trips content", async () => {
    const exported = (await admin.get("/api/v1/admin/export").expect(200)).body;
    exported.news = exported.news.slice(0, 1);
    await admin.post("/api/v1/admin/import").send(exported).expect(200);
    const site = (await request(app).get("/api/v1/site").expect(200)).body;
    assert.equal(site.news.length, 1);
    assert.equal(site.people.length, exported.people.length);
  });

  test("invalid import is rejected without changing anything", async () => {
    const before = (await request(app).get("/api/v1/site")).body.people.length;
    await admin.post("/api/v1/admin/import").send({ settings: {}, people: [{ name: "" }] }).expect(400);
    assert.equal((await request(app).get("/api/v1/site")).body.people.length, before);
  });
});
