/*
 * Admin app. Talks to the backend API (/api/v1) with a session cookie.
 * Roles: "editor" manages content, messages and media; "admin" also manages
 * users, sees the activity log and can import backups.
 */
document.addEventListener("site:ready", () => {
  "use strict";
  const { api, esc, fmtDate, icon, openModal, closeModal, toast, neuralCanvas, avatar, isUpcoming } = window.Site;

  // ---------- content schemas: drive the tables and edit forms ----------
  const SCHEMAS = {
    people: {
      label: "People", singular: "person", ic: "users", ordered: true,
      columns: [["photo", "avatar"], ["name", "text"], ["role", "text"], ["team", "tag"], ["year", "text"]],
      fields: [
        { k: "name", label: "Full name", required: true },
        { k: "role", label: "Role / position", required: true },
        { k: "team", label: "Team", type: "select", options: ["Faculty", "Core", "Tech", "Research", "Events", "Design"] },
        { k: "year", label: "Year & branch", placeholder: "3rd Year, CSE" },
        { k: "photo", label: "Photo", type: "image", full: true, hint: "Square photos look best. Leave empty for an initials avatar." },
        { k: "bio", label: "Short bio", type: "textarea", full: true },
        { k: "linkedin", label: "LinkedIn URL" },
        { k: "github", label: "GitHub URL" },
        { k: "email", label: "Email", type: "email" }
      ]
    },
    projects: {
      label: "Projects", singular: "project", ic: "rocket", ordered: true,
      columns: [["image", "thumb"], ["title", "text"], ["domain", "tag"], ["status", "status"], ["year", "text"]],
      fields: [
        { k: "title", label: "Title", required: true, full: true },
        { k: "domain", label: "Domain", placeholder: "Computer Vision" },
        { k: "status", label: "Status", type: "select", options: ["Ongoing", "Completed", "Planned"] },
        { k: "year", label: "Year", type: "number" },
        { k: "image", label: "Cover image", type: "image", full: true },
        { k: "description", label: "Description", type: "textarea", full: true },
        { k: "tech", label: "Tech stack", type: "list", hint: "Comma separated, e.g. PyTorch, FastAPI" },
        { k: "team", label: "Team members", type: "list", hint: "Comma separated names" },
        { k: "github", label: "GitHub URL" },
        { k: "demo", label: "Demo URL" }
      ]
    },
    events: {
      label: "Events", singular: "event", ic: "calendar",
      columns: [["image", "thumb"], ["title", "text"], ["date", "date"], ["type", "tag"], ["venue", "text"]],
      fields: [
        { k: "title", label: "Title", required: true, full: true },
        { k: "date", label: "Date", type: "date", required: true },
        { k: "time", label: "Time", type: "time" },
        { k: "type", label: "Type", type: "select", options: ["Workshop", "Hackathon", "Talk", "Reading Group", "Competition", "Meetup", "Other"] },
        { k: "venue", label: "Venue" },
        { k: "image", label: "Banner image", type: "image", full: true },
        { k: "registerLink", label: "Registration link", full: true },
        { k: "description", label: "Description", type: "textarea", full: true }
      ]
    },
    gallery: {
      label: "Gallery", singular: "photo", ic: "image", ordered: true,
      columns: [["src", "thumb"], ["caption", "text"], ["album", "tag"]],
      fields: [
        { k: "src", label: "Image", type: "image", required: true, full: true },
        { k: "caption", label: "Caption", full: true },
        { k: "album", label: "Album", placeholder: "Hackathons, Workshops, Team..." }
      ]
    },
    news: {
      label: "News", singular: "article", ic: "news",
      columns: [["image", "thumb"], ["title", "text"], ["date", "date"], ["category", "tag"]],
      fields: [
        { k: "title", label: "Headline", required: true, full: true },
        { k: "date", label: "Date", type: "date", required: true },
        { k: "category", label: "Category", type: "select", options: ["Announcement", "Achievement", "Research", "Event Recap", "Other"] },
        { k: "image", label: "Image", type: "image", full: true },
        { k: "summary", label: "Summary (shown on cards)", type: "textarea", full: true, rows: 3 },
        { k: "content", label: "Full article", type: "textarea", full: true, rows: 10, hint: "Blank lines separate paragraphs." }
      ]
    },
    sponsors: {
      label: "Partners", singular: "partner", ic: "partners", ordered: true,
      columns: [["logo", "thumb"], ["name", "text"], ["url", "text"]],
      fields: [
        { k: "name", label: "Name", required: true },
        { k: "url", label: "Website" },
        { k: "logo", label: "Logo", type: "image", full: true }
      ]
    }
  };

  const NAV = [
    { group: "Workspace" },
    { k: "overview", ic: "grid", l: "Overview" },
    { k: "messages", ic: "inbox", l: "Inbox" },
    { group: "Content" },
    ...Object.entries(SCHEMAS).map(([k, s]) => ({ k, ic: s.ic, l: s.label })),
    { k: "media", ic: "upload", l: "Media library" },
    { k: "settings", ic: "settings", l: "Site settings" },
    { group: "Administration" },
    { k: "users", ic: "key", l: "Users", admin: true },
    { k: "activity", ic: "activity", l: "Activity log", admin: true },
    { k: "backup", ic: "database", l: "Backup & restore" },
    { k: "account", ic: "user", l: "My account" }
  ];

  const state = { me: null, view: "overview", counts: {}, newMessages: 0 };
  const main = document.getElementById("admin-main");
  const isAdmin = () => state.me && state.me.role === "admin";
  const show = (id) => ["boot", "login", "offline", "app"].forEach((x) => document.getElementById(x).classList.toggle("hidden", x !== id));

  // ---------- boot & auth ----------
  async function boot() {
    try {
      const { user } = await api("/auth/me");
      if (!user) { show("login"); neuralCanvas(document.getElementById("net")); document.getElementById("email").focus(); return; }
      state.me = user;
      enterApp();
    } catch (e) { show("offline"); }
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("login-btn");
    const err = document.getElementById("login-error");
    err.textContent = "";
    btn.disabled = true;
    try {
      const { user } = await api("/auth/login", { method: "POST", body: { email: document.getElementById("email").value, password: document.getElementById("pw").value } });
      state.me = user;
      document.getElementById("pw").value = "";
      enterApp();
    } catch (ex) {
      err.textContent = ex.message;
      document.getElementById("pw").select();
    } finally { btn.disabled = false; }
  });

  document.getElementById("logout").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    location.reload();
  });

  const side = document.getElementById("side");
  const sideToggle = document.getElementById("side-toggle");
  sideToggle.innerHTML = icon("menu");
  sideToggle.addEventListener("click", () => side.classList.toggle("open"));

  function enterApp() {
    show("app");
    const fromHash = location.hash.slice(1);
    if (NAV.some((n) => n.k === fromHash)) state.view = fromHash;
    go(state.view);
  }

  // Session expired mid-use: send them back to sign in.
  function handleError(e) {
    if (e.status === 401) { toast("Your session expired - please sign in again"); setTimeout(() => location.reload(), 1200); return; }
    toast(e.message);
  }

  // ---------- navigation ----------
  async function refreshCounts() {
    try {
      const o = await api("/admin/overview");
      state.counts = o.counts; state.newMessages = o.newMessages;
      renderSide();
      return o;
    } catch (e) { handleError(e); return null; }
  }

  function renderSide() {
    document.getElementById("side-links").innerHTML = NAV.filter((n) => !n.admin || isAdmin()).map((n) => {
      if (n.group) return `<div class="side-group">${n.group}</div>`;
      let badge = "";
      if (n.k in state.counts) badge = `<span class="count">${state.counts[n.k]}</span>`;
      if (n.k === "messages" && state.newMessages) badge = `<span class="count alert">${state.newMessages}</span>`;
      return `<button type="button" class="side-link ${state.view === n.k ? "active" : ""}" data-view="${n.k}">${icon(n.ic)}${n.l}${badge}</button>`;
    }).join("");
    document.getElementById("side-user").innerHTML = `${avatar({ name: state.me.name }, "avatar-sm")}<div><b>${esc(state.me.name)}</b><small>${esc(state.me.role)}</small></div>`;
  }
  document.getElementById("side-links").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) go(b.dataset.view);
  });
  main.addEventListener("click", (e) => {
    const a = e.target.closest("[data-goto]");
    if (a) { e.preventDefault(); go(a.dataset.goto); }
  });

  async function go(view) {
    state.view = view;
    history.replaceState(null, "", "#" + view);
    side.classList.remove("open");
    renderSide();
    main.innerHTML = '<div class="login-wrap" style="min-height:40vh"><div class="spinner"></div></div>';
    window.scrollTo(0, 0);
    try {
      if (view === "overview") await viewOverview();
      else if (SCHEMAS[view]) await viewCollection(view);
      else if (view === "messages") await viewMessages();
      else if (view === "media") await viewMedia();
      else if (view === "settings") await viewSettings();
      else if (view === "users" && isAdmin()) await viewUsers();
      else if (view === "activity" && isAdmin()) await viewActivity();
      else if (view === "backup") viewBackup();
      else if (view === "account") viewAccount();
      else return go("overview");
    } catch (e) { handleError(e); main.innerHTML = `<div class="empty">Couldn't load this page: ${esc(e.message)}</div>`; }
    main.focus({ preventScroll: true });
  }

  const header = (title, sub, actions) => `
    <div class="admin-top"><div><h1>${title}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ""}</div>
    ${actions ? `<div class="admin-actions">${actions}</div>` : ""}</div>`;

  const ACTION_VERB = { create: "added", update: "updated", delete: "deleted", reorder: "reordered", upload: "uploaded", import: "imported", login: "signed in" };
  const auditLine = (a) => `<div class="audit-row"><span class="muted small">${esc(new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</span>
    <span><b>${esc(a.userName || "Someone")}</b> ${ACTION_VERB[a.action] || esc(a.action)} ${a.action === "login" ? "" : `<span class="tag">${esc(a.entity)}</span>`} ${a.summary ? `<span class="muted">${esc(a.summary)}</span>` : ""}</span></div>`;

  // ---------- overview ----------
  async function viewOverview() {
    const [o, events] = await Promise.all([refreshCounts(), api("/events")]);
    if (!o) return;
    const upcoming = events.items.filter(isUpcoming).length;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    main.innerHTML = `
      ${header(`${greet}, ${esc(state.me.name.split(" ")[0])}`, "Here's what's on the site right now.")}
      <div class="dash-grid">
        ${Object.entries(SCHEMAS).map(([k, s]) => `
          <button type="button" class="panel span-4" data-goto="${k}" style="text-align:left;cursor:pointer;font:inherit;color:inherit">
            <div class="kpi"><div class="kpi-icon">${icon(s.ic)}</div><div><div class="kpi-val">${o.counts[k]}</div><div class="kpi-label">${s.label}</div></div></div>
            <div class="kpi-sub">Manage ${s.label.toLowerCase()} &rarr;</div>
          </button>`).join("")}
      </div>
      <div class="dash-grid" style="margin-top:20px">
        <div class="panel span-6">
          <div class="panel-head"><h3>Needs attention</h3></div>
          <ul class="list">
            <li><span class="grow">Unread messages</span><a href="#" data-goto="messages" class="tag ${o.newMessages ? "warn" : "good"}">${o.newMessages || "All caught up"}</a></li>
            <li><span class="grow">Upcoming events</span><a href="#" data-goto="events" class="tag ${upcoming ? "good" : "warn"}">${upcoming || "None - add one"}</a></li>
          </ul>
          <div class="panel-head" style="margin-top:18px"><h3>Quick add</h3></div>
          <div class="admin-actions">${Object.entries(SCHEMAS).map(([k, s]) => `<button class="btn btn-sm" data-add="${k}">+ ${s.singular}</button>`).join("")}</div>
        </div>
        <div class="panel span-6">
          <div class="panel-head"><h3>Recent activity</h3>${isAdmin() ? '<a href="#" data-goto="activity" class="small person-role">All &rarr;</a>' : ""}</div>
          ${o.recent.length ? o.recent.map(auditLine).join("") : '<p class="muted">No activity yet.</p>'}
        </div>
      </div>`;
    main.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => editItem(b.dataset.add, null, () => go(b.dataset.add))));
  }

  // ---------- collections ----------
  function cell(item, [key, kind]) {
    const v = item[key];
    switch (kind) {
      case "avatar": return avatar(item, "avatar-sm");
      case "thumb": return v ? `<img class="thumb" src="${esc(v)}" alt="" loading="lazy">` : '<span class="muted">-</span>';
      case "tag": return v ? `<span class="tag primary">${esc(v)}</span>` : "";
      case "status": return `<span class="tag ${{ Ongoing: "cyan", Completed: "good", Planned: "warn" }[v] || ""} status-dot">${esc(v)}</span>`;
      case "date": return esc(fmtDate(v));
      default: return `<span class="cell-text">${esc(v == null ? "" : v)}</span>`;
    }
  }

  async function viewCollection(key) {
    const s = SCHEMAS[key];
    let items = (await api("/" + key)).items;
    let query = "";

    main.innerHTML = `
      ${header(`${icon(s.ic)} ${s.label}`, `<span id="coll-count"></span>`, `
        <label class="search" style="min-width:220px"><span class="sr-only">Search</span>${icon("search")}<input type="search" id="q" placeholder="Search ${s.label.toLowerCase()}"></label>
        <button class="btn btn-primary btn-sm" id="add">+ Add ${s.singular}</button>`)}
      <div class="table-wrap"><table>
        <thead><tr>${s.columns.map(([k]) => `<th>${esc(k === "src" ? "image" : k)}</th>`).join("")}<th style="text-align:right">Actions</th></tr></thead>
        <tbody id="rows"></tbody></table></div>
      <p class="hint">${s.ordered ? "Use the arrows to set the order items appear on the site." : "Sorted by date on the site automatically."}</p>`;

    function paint() {
      const q = query.toLowerCase();
      const rows = items.filter((it) => !q || JSON.stringify(it).toLowerCase().includes(q));
      document.getElementById("coll-count").textContent = `${items.length} ${items.length === 1 ? s.singular : s.label.toLowerCase()}`;
      document.getElementById("rows").innerHTML = rows.map((it) => `
        <tr>${s.columns.map((c) => `<td>${cell(it, c)}</td>`).join("")}
          <td><div class="row-actions">
            ${s.ordered && !q ? `<button class="icon-btn" data-move="-1" data-id="${esc(it.id)}" aria-label="Move up" title="Move up">&uarr;</button>
            <button class="icon-btn" data-move="1" data-id="${esc(it.id)}" aria-label="Move down" title="Move down">&darr;</button>` : ""}
            <button class="btn btn-sm" data-edit="${esc(it.id)}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del="${esc(it.id)}">Delete</button>
          </div></td></tr>`).join("") || `<tr><td colspan="${s.columns.length + 1}" class="center muted" style="padding:40px">${q ? "No matches." : `No ${s.label.toLowerCase()} yet.`}</td></tr>`;
    }
    paint();

    const reload = async () => { items = (await api("/" + key)).items; paint(); refreshCounts(); };
    document.getElementById("q").addEventListener("input", (e) => { query = e.target.value; paint(); });
    document.getElementById("add").addEventListener("click", () => editItem(key, null, reload));
    document.getElementById("rows").addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const id = b.dataset.edit || b.dataset.del || b.dataset.id;
      const item = items.find((x) => x.id === id);
      if (b.dataset.edit) editItem(key, item, reload);
      else if (b.dataset.del) {
        if (!confirm(`Delete "${item.name || item.title || item.caption || s.singular}"? This cannot be undone.`)) return;
        try { await api(`/${key}/${encodeURIComponent(id)}`, { method: "DELETE" }); toast("Deleted"); reload(); } catch (ex) { handleError(ex); }
      } else if (b.dataset.move) {
        const i = items.findIndex((x) => x.id === id), j = i + Number(b.dataset.move);
        if (j < 0 || j >= items.length) return;
        [items[i], items[j]] = [items[j], items[i]];
        paint();
        try { items = (await api(`/${key}/reorder`, { method: "POST", body: { ids: items.map((x) => x.id) } })).items; } catch (ex) { handleError(ex); reload(); }
      }
    });
  }

  // ---------- forms ----------
  function fieldHtml(f, value) {
    const id = "fld-" + f.k;
    const req = f.required ? "required" : "";
    const v = value == null ? "" : value;
    let input;
    if (f.type === "textarea") input = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 4}" ${req}>${esc(v)}</textarea>`;
    else if (f.type === "select") {
      const opts = !v || f.options.includes(v) ? f.options : [v, ...f.options];
      input = `<select id="${id}" name="${f.k}">${opts.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (f.type === "list") input = `<input id="${id}" name="${f.k}" value="${esc((v || []).join(", "))}" ${req}>`;
    else if (f.type === "image") {
      input = `<div class="img-field">
          <img class="thumb img-preview" src="${esc(v)}" alt="" ${v ? "" : 'style="visibility:hidden"'}>
          <input id="${id}" name="${f.k}" value="${esc(v)}" placeholder="Upload, or paste an image URL / path" ${req}>
          <label class="btn btn-sm" style="margin:0">Upload<input type="file" accept="image/*" data-upload="${f.k}" hidden></label>
        </div>`;
    } else input = `<input id="${id}" name="${f.k}" type="${f.type || "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${req}>`;
    return `<div class="field ${f.full ? "full" : ""}" data-field="${f.k}"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}</div>`;
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    return api("/uploads", { method: "POST", body: fd });
  }

  function wireImageFields(root) {
    root.querySelectorAll("[data-upload]").forEach((up) => {
      const text = root.querySelector(`[name="${up.dataset.upload}"]`);
      const preview = text.parentElement.querySelector(".img-preview");
      const sync = () => { preview.src = text.value; preview.style.visibility = text.value ? "" : "hidden"; };
      text.addEventListener("input", sync);
      up.addEventListener("change", async () => {
        const file = up.files[0];
        if (!file) return;
        const label = up.parentElement;
        label.firstChild.textContent = "Uploading...";
        try { text.value = (await uploadFile(file)).url; sync(); toast("Image uploaded"); }
        catch (e) { handleError(e); }
        finally { label.firstChild.textContent = "Upload"; up.value = ""; }
      });
    });
  }

  function showFieldErrors(form, details) {
    form.querySelectorAll(".field-error").forEach((x) => x.remove());
    if (!details || typeof details !== "object") return;
    for (const [k, msg] of Object.entries(details)) {
      const field = form.querySelector(`[data-field="${k.split(".")[0]}"]`);
      if (field) field.insertAdjacentHTML("beforeend", `<div class="field-error">${esc(msg)}</div>`);
    }
  }

  function readForm(form, fields) {
    const out = {};
    for (const f of fields) {
      const raw = form.elements[f.k].value.trim();
      if (f.type === "list") out[f.k] = raw ? raw.split(",").map((x) => x.trim()).filter(Boolean) : [];
      else if (f.type === "number") out[f.k] = raw ? Number(raw) : null;
      else out[f.k] = raw;
    }
    return out;
  }

  function editItem(key, item, onSaved) {
    const s = SCHEMAS[key];
    const isNew = !item;
    const m = openModal(`
      <h2 style="font-size:1.5rem">${isNew ? "Add" : "Edit"} ${s.singular}</h2>
      <form id="edit-form" class="form-grid" style="margin-top:18px" novalidate>
        ${s.fields.map((f) => fieldHtml(f, item ? item[f.k] : (f.type === "date" ? new Date().toISOString().slice(0, 10) : ""))).join("")}
        <div class="full admin-actions" style="justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-sm" data-close>Cancel</button>
          <button type="submit" class="btn btn-sm btn-primary">${isNew ? "Add " + s.singular : "Save changes"}</button>
        </div>
      </form>`, { wide: true });
    const form = m.querySelector("#edit-form");
    wireImageFields(form);
    form.querySelector("input, textarea, select").focus();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const body = readForm(form, s.fields);
        if (isNew) await api("/" + key, { method: "POST", body });
        else await api(`/${key}/${encodeURIComponent(item.id)}`, { method: "PATCH", body });
        closeModal();
        toast(isNew ? `Added ${s.singular}` : "Saved");
        onSaved && onSaved();
      } catch (ex) {
        showFieldErrors(form, ex.details);
        handleError(ex);
      } finally { btn.disabled = false; }
    });
  }

  // ---------- inbox ----------
  async function viewMessages() {
    let filter = "new";
    main.innerHTML = `${header(`${icon("inbox")} Inbox`, "Messages sent through the contact form.")}
      <div id="msg-view"><div class="chips" id="msg-filter" style="margin-bottom:18px"></div>
      <div class="panel" style="padding:0" id="msg-list"></div></div>`;
    const filters = [["new", "Unread"], ["read", "Read"], ["archived", "Archived"], ["", "All"]];

    async function paint() {
      document.getElementById("msg-filter").innerHTML = filters.map(([v, l]) => `<button class="chip ${filter === v ? "active" : ""}" data-f="${v}">${l}</button>`).join("");
      const { items } = await api("/messages" + (filter ? "?status=" + filter : ""));
      document.getElementById("msg-list").innerHTML = items.map((m) => `
        <div class="msg ${m.status === "new" ? "new" : ""}">
          <div class="msg-head"><b>${esc(m.name)}</b><a class="muted small" href="mailto:${esc(m.email)}">${esc(m.email)}</a><br>
            <span class="tag primary">${esc(m.topic)}</span> <span class="muted small">${esc(new Date(m.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</span></div>
          <div class="row-actions" style="align-items:start">
            <a class="btn btn-sm btn-primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: " + m.topic)}">Reply</a>
            ${m.status !== "read" ? `<button class="btn btn-sm" data-status="read" data-id="${esc(m.id)}">Mark read</button>` : `<button class="btn btn-sm" data-status="new" data-id="${esc(m.id)}">Mark unread</button>`}
            ${m.status !== "archived" ? `<button class="btn btn-sm" data-status="archived" data-id="${esc(m.id)}">Archive</button>` : ""}
            <button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">Delete</button>
          </div>
          <div class="msg-body">${esc(m.body)}</div>
        </div>`).join("") || `<div class="empty" style="border:0">${filter === "new" ? `<span class="empty-state">${icon("check")}Inbox zero - no unread messages.</span>` : "No messages here."}</div>`;
    }
    await paint();
    document.getElementById("msg-view").addEventListener("click", async (e) => {
      const f = e.target.closest("[data-f]");
      const st = e.target.closest("[data-status]");
      const del = e.target.closest("[data-del]");
      try {
        if (f) { filter = f.dataset.f; await paint(); }
        else if (st) { await api("/messages/" + st.dataset.id, { method: "PATCH", body: { status: st.dataset.status } }); await paint(); refreshCounts(); }
        else if (del && confirm("Delete this message permanently?")) { await api("/messages/" + del.dataset.del, { method: "DELETE" }); await paint(); refreshCounts(); }
      } catch (ex) { handleError(ex); }
    });
  }

  // ---------- media library ----------
  async function viewMedia() {
    main.innerHTML = `${header(`${icon("upload")} Media library`, "Images uploaded to the server. Copy a link to use it anywhere.")}
      <label class="dropzone" id="drop"><input type="file" accept="image/*" multiple hidden id="media-input">
        ${icon("upload")}<b>Drop images here</b> or click to choose &middot; PNG, JPEG, WebP, GIF, AVIF, SVG</label>
      <div class="media-grid" id="media" style="margin-top:20px"></div>`;
    async function paint() {
      const { items } = await api("/uploads");
      document.getElementById("media").innerHTML = items.map((u) => `
        <div class="media-item"><img src="${esc(u.url)}" alt="" loading="lazy">
          <div class="media-meta"><b title="${esc(u.originalName)}">${esc(u.originalName)}</b><span class="muted">${(u.size / 1024).toFixed(0)} KB</span>
            <div class="admin-actions" style="margin-top:8px"><button class="btn btn-sm" data-copy="${esc(u.url)}">Copy link</button><button class="btn btn-sm btn-danger" data-del="${esc(u.id)}">Delete</button></div>
          </div></div>`).join("") || '<div class="empty" style="grid-column:1/-1">No uploads yet.</div>';
    }
    async function uploadAll(files) {
      for (const f of files) { try { await uploadFile(f); } catch (e) { handleError(e); } }
      toast("Upload complete"); paint();
    }
    const drop = document.getElementById("drop");
    document.getElementById("media-input").addEventListener("change", (e) => uploadAll([...e.target.files]));
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("drag")));
    drop.addEventListener("drop", (e) => { e.preventDefault(); uploadAll([...e.dataTransfer.files]); });
    document.getElementById("media").addEventListener("click", async (e) => {
      const c = e.target.closest("[data-copy]"), d = e.target.closest("[data-del]");
      if (c) {
        const link = new URL(c.dataset.copy, location.href);
        const url = link.origin === location.origin ? link.pathname : link.href; // Supabase Storage links are absolute
        try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { prompt("Copy this link:", url); }
      } else if (d && confirm("Delete this image? Pages still using it will show a broken image.")) {
        try { await api("/uploads/" + d.dataset.del, { method: "DELETE" }); paint(); } catch (ex) { handleError(ex); }
      }
    });
    await paint();
  }

  // ---------- settings ----------
  async function viewSettings() {
    const st = await api("/settings");
    const f = (k, label, v, o = {}) => `<div class="field ${o.full ? "full" : ""}" data-field="${k}"><label for="s-${k}">${label}</label>${o.area
      ? `<textarea id="s-${k}" name="${k}" rows="4">${esc(v)}</textarea>` : `<input id="s-${k}" name="${k}" type="${o.type || "text"}" value="${esc(v == null ? "" : v)}">`}</div>`;
    const cap = (k) => k[0].toUpperCase() + k.slice(1);
    const socials = st.socials || {}, stats = st.stats || {};
    main.innerHTML = `
      ${header(`${icon("settings")} Site settings`, "Branding, contact details and headline numbers.")}
      <form id="settings-form" novalidate>
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Branding</h3></div><div class="form-grid">
          ${f("clubName", "Club name", st.clubName)}${f("institute", "Institute", st.institute)}
          ${f("tagline", "Tagline", st.tagline, { full: true })}${f("about", "About the club", st.about, { full: true, area: true })}
          ${fieldHtml({ k: "logo", label: "Club logo", type: "image", full: true }, st.logo)}
          ${fieldHtml({ k: "instituteLogo", label: "Institute logo", type: "image", full: true }, st.instituteLogo)}
        </div></div>
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Contact &amp; links</h3></div><div class="form-grid">
          ${f("email", "Email", st.email, { type: "email" })}${f("joinLink", "Join / recruitment form link", st.joinLink)}
          ${f("address", "Address", st.address, { full: true })}
          ${Object.keys(socials).map((k) => f("social-" + k, cap(k) + " URL", socials[k])).join("")}
        </div></div>
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Headline stats (home page)</h3></div><div class="form-grid">
          ${Object.keys(stats).map((k) => f("stat-" + k, cap(k), stats[k], { type: "number" })).join("")}
        </div></div>
        <button class="btn btn-primary" type="submit">Save settings</button>
      </form>`;
    const form = document.getElementById("settings-form");
    wireImageFields(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (n) => form.elements[n].value.trim();
      const body = {};
      ["clubName", "institute", "tagline", "about", "email", "joinLink", "address", "logo", "instituteLogo"].forEach((k) => { body[k] = val(k); });
      body.socials = Object.fromEntries(Object.keys(socials).map((k) => [k, val("social-" + k)]));
      body.stats = Object.fromEntries(Object.keys(stats).map((k) => [k, Number(val("stat-" + k)) || 0]));
      try { await api("/settings", { method: "PUT", body }); showFieldErrors(form, null); toast("Settings saved"); }
      catch (ex) { showFieldErrors(form, ex.details); handleError(ex); }
    });
  }

  // ---------- users (admin) ----------
  async function viewUsers() {
    const { items } = await api("/users");
    main.innerHTML = `
      ${header(`${icon("key")} Users`, "People who can sign in to this admin panel.", '<button class="btn btn-primary btn-sm" id="add-user">+ Add user</button>')}
      <div class="notice"><b>Roles:</b> <em>Editors</em> manage content, messages and media. <em>Admins</em> can also manage users, see the activity log and restore backups.</div>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${items.map((u) => `<tr>
          <td>${avatar({ name: u.name }, "avatar-sm")}</td><td>${esc(u.name)}${u.id === state.me.id ? ' <span class="tag cyan">you</span>' : ""}</td>
          <td>${esc(u.email)}</td><td><span class="tag ${u.role === "admin" ? "primary" : ""}">${esc(u.role)}</span></td>
          <td class="muted">${u.lastLoginAt ? esc(new Date(u.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })) : "Never"}</td>
          <td><div class="row-actions"><button class="btn btn-sm" data-edit-user="${esc(u.id)}">Edit</button>
            ${u.id === state.me.id ? "" : `<button class="btn btn-sm btn-danger" data-del-user="${esc(u.id)}">Remove</button>`}</div></td></tr>`).join("")}
        </tbody></table></div>`;

    const userForm = (u) => {
      const m = openModal(`
        <h2 style="font-size:1.5rem">${u ? "Edit user" : "Add user"}</h2>
        <form id="user-form" class="form-grid" style="margin-top:18px" novalidate>
          <div class="field" data-field="name"><label for="u-name">Name *</label><input id="u-name" name="name" value="${esc(u ? u.name : "")}" required></div>
          <div class="field" data-field="email"><label for="u-email">Email *</label><input id="u-email" name="email" type="email" value="${esc(u ? u.email : "")}" ${u ? "disabled" : "required"}></div>
          <div class="field" data-field="role"><label for="u-role">Role</label><select id="u-role" name="role">
            <option value="editor" ${u && u.role === "editor" ? "selected" : ""}>Editor</option><option value="admin" ${u && u.role === "admin" ? "selected" : ""}>Admin</option></select></div>
          <div class="field" data-field="password"><label for="u-pw">${u ? "New password (optional)" : "Password *"}</label><input id="u-pw" name="password" type="password" autocomplete="new-password" minlength="10"><div class="hint">At least 10 characters.</div></div>
          <div class="full admin-actions" style="justify-content:flex-end"><button type="button" class="btn btn-sm" data-close>Cancel</button><button class="btn btn-sm btn-primary" type="submit">${u ? "Save" : "Create user"}</button></div>
        </form>`);
      const form = m.querySelector("#user-form");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = { name: form.elements.name.value.trim(), role: form.elements.role.value };
        if (form.elements.password.value) body.password = form.elements.password.value;
        try {
          if (u) await api("/users/" + u.id, { method: "PATCH", body });
          else await api("/users", { method: "POST", body: { ...body, email: form.elements.email.value.trim() } });
          closeModal(); toast(u ? "User updated" : "User created"); go("users");
        } catch (ex) { showFieldErrors(form, ex.details); handleError(ex); }
      });
    };
    document.getElementById("add-user").addEventListener("click", () => userForm(null));
    main.querySelector("tbody").addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit-user]"), del = e.target.closest("[data-del-user]");
      if (ed) userForm(items.find((u) => u.id === ed.dataset.editUser));
      if (del && confirm("Remove this user's access?")) {
        try { await api("/users/" + del.dataset.delUser, { method: "DELETE" }); toast("User removed"); go("users"); } catch (ex) { handleError(ex); }
      }
    });
  }

  // ---------- activity (admin) ----------
  async function viewActivity() {
    const { items } = await api("/admin/audit?limit=200");
    main.innerHTML = `${header(`${icon("activity")} Activity log`, "Every change made through the admin panel, newest first.")}
      <div class="panel">${items.map(auditLine).join("") || '<p class="muted">Nothing yet.</p>'}</div>`;
  }

  // ---------- backup ----------
  function viewBackup() {
    main.innerHTML = `
      ${header(`${icon("database")} Backup &amp; restore`, "Download a copy of all content, or restore one.")}
      <div class="dash-grid">
        <div class="panel span-6"><div class="panel-head"><h3>Download backup</h3></div>
          <p class="muted small">A JSON file with all settings and content. Uploaded image files live in the server's data folder - back that up too.</p>
          <a class="btn btn-primary btn-sm" href="/api/v1/admin/export" download>Download JSON backup</a></div>
        <div class="panel span-6"><div class="panel-head"><h3>Restore from backup</h3></div>
          ${isAdmin() ? `<p class="muted small">Replaces <b>all</b> content with the file's contents. The file is fully checked first - nothing changes if it's invalid.</p>
          <label class="btn btn-danger btn-sm" style="margin:0">Choose backup file<input type="file" id="imp" accept="application/json,.json" hidden></label>` : '<p class="muted small">Only admins can restore backups.</p>'}</div>
      </div>`;
    const imp = document.getElementById("imp");
    if (imp) imp.addEventListener("change", async () => {
      const file = imp.files[0];
      if (!file) return;
      if (!confirm("Replace ALL site content with this backup?")) { imp.value = ""; return; }
      try {
        const data = JSON.parse(await file.text());
        await api("/admin/import", { method: "POST", body: data });
        toast("Backup restored"); refreshCounts();
      } catch (ex) {
        const detail = Array.isArray(ex.details) && ex.details[0] ? ` (${ex.details[0].path}: ${ex.details[0].issues[0]})` : "";
        toast((ex instanceof SyntaxError ? "That file isn't valid JSON" : ex.message) + detail);
      } finally { imp.value = ""; }
    });
  }

  // ---------- account ----------
  function viewAccount() {
    main.innerHTML = `
      ${header(`${icon("user")} My account`, esc(state.me.email))}
      <div class="panel" style="max-width:560px"><div class="panel-head"><h3>Change password</h3></div>
        <form id="pw-form" novalidate>
          <div class="field" data-field="currentPassword"><label for="pw0">Current password</label><input id="pw0" name="currentPassword" type="password" autocomplete="current-password" required></div>
          <div class="field" data-field="newPassword"><label for="pw1">New password</label><input id="pw1" name="newPassword" type="password" autocomplete="new-password" minlength="10" required><div class="hint">At least 10 characters. Signs you out on other devices.</div></div>
          <div class="field"><label for="pw2">Confirm new password</label><input id="pw2" type="password" autocomplete="new-password" required></div>
          <button class="btn btn-primary btn-sm" type="submit">Update password</button>
        </form></div>`;
    const form = document.getElementById("pw-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.elements.newPassword.value !== document.getElementById("pw2").value) { toast("New passwords don't match"); return; }
      try {
        await api("/auth/password", { method: "POST", body: { currentPassword: form.elements.currentPassword.value, newPassword: form.elements.newPassword.value } });
        form.reset(); showFieldErrors(form, null); toast("Password updated");
      } catch (ex) { showFieldErrors(form, ex.details); handleError(ex); }
    });
  }

  boot();
});
