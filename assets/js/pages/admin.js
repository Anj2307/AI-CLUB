/*
 * Admin panel.
 *
 * NOTE: this is a static site, so the password check runs in the browser and is
 * only a soft gate to stop casual edits - it is NOT real security. Edits are
 * saved to this browser's localStorage; use "Export data.js" and commit the
 * downloaded file to publish changes for everyone.
 */
document.addEventListener("site:ready", () => {
  const { getData, saveData, resetData, hasLocalEdits, esc, fmtDate, uid, icon, openModal, closeModal, toast, neuralCanvas, clone, avatar } = window.Site;

  const PW_KEY = "aiclub-admin-pw";
  const SESSION_KEY = "aiclub-admin-session";
  const DEFAULT_PW = "aiclub@admin";

  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  // FNV-1a - fine for a soft gate, works on file:// where crypto.subtle may be missing.
  const hash = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  };
  const pwHash = () => ls.get(PW_KEY) || hash(DEFAULT_PW);

  let data = getData();
  let view = "overview";

  // ---------- schemas: drive the tables and the edit forms ----------
  const SCHEMAS = {
    people: {
      label: "People", singular: "person", emoji: "&#128101;", prefix: "p",
      columns: [["photo", "avatar"], ["name", "text"], ["role", "text"], ["team", "tag"], ["year", "text"]],
      fields: [
        { k: "name", label: "Full name", required: true },
        { k: "role", label: "Role / position", required: true },
        { k: "team", label: "Team", type: "select", options: ["Faculty", "Core", "Tech", "Research", "Events", "Design"] },
        { k: "year", label: "Year & branch", placeholder: "3rd Year, CSE" },
        { k: "photo", label: "Photo", type: "image", hint: "Leave empty to show an initials avatar." },
        { k: "bio", label: "Short bio", type: "textarea", full: true },
        { k: "linkedin", label: "LinkedIn URL" },
        { k: "github", label: "GitHub URL" },
        { k: "email", label: "Email", type: "email" }
      ]
    },
    projects: {
      label: "Projects", singular: "project", emoji: "&#128640;", prefix: "pr",
      columns: [["image", "thumb"], ["title", "text"], ["domain", "tag"], ["status", "status"], ["year", "text"]],
      fields: [
        { k: "title", label: "Title", required: true, full: true },
        { k: "domain", label: "Domain", placeholder: "Computer Vision" },
        { k: "status", label: "Status", type: "select", options: ["Ongoing", "Completed", "Planned"] },
        { k: "year", label: "Year", type: "number" },
        { k: "image", label: "Cover image", type: "image" },
        { k: "description", label: "Description", type: "textarea", full: true },
        { k: "tech", label: "Tech stack", type: "list", hint: "Comma separated, e.g. PyTorch, FastAPI" },
        { k: "team", label: "Team members", type: "list", hint: "Comma separated names" },
        { k: "github", label: "GitHub URL" },
        { k: "demo", label: "Demo URL" }
      ]
    },
    events: {
      label: "Events", singular: "event", emoji: "&#128197;", prefix: "e",
      columns: [["image", "thumb"], ["title", "text"], ["date", "date"], ["type", "tag"], ["venue", "text"]],
      sort: (a, b) => (a.date < b.date ? 1 : -1),
      fields: [
        { k: "title", label: "Title", required: true, full: true },
        { k: "date", label: "Date", type: "date", required: true },
        { k: "time", label: "Time", type: "time" },
        { k: "type", label: "Type", type: "select", options: ["Workshop", "Hackathon", "Talk", "Reading Group", "Competition", "Meetup", "Other"] },
        { k: "venue", label: "Venue" },
        { k: "image", label: "Banner image", type: "image" },
        { k: "registerLink", label: "Registration link" },
        { k: "description", label: "Description", type: "textarea", full: true }
      ]
    },
    gallery: {
      label: "Gallery", singular: "photo", emoji: "&#128248;", prefix: "g",
      columns: [["src", "thumb"], ["caption", "text"], ["album", "tag"]],
      fields: [
        { k: "src", label: "Image", type: "image", required: true, full: true },
        { k: "caption", label: "Caption", full: true },
        { k: "album", label: "Album", placeholder: "Hackathons, Workshops, Team..." }
      ]
    },
    news: {
      label: "News", singular: "article", emoji: "&#128240;", prefix: "n",
      columns: [["image", "thumb"], ["title", "text"], ["date", "date"], ["category", "tag"]],
      sort: (a, b) => (a.date < b.date ? 1 : -1),
      fields: [
        { k: "title", label: "Headline", required: true, full: true },
        { k: "date", label: "Date", type: "date", required: true },
        { k: "category", label: "Category", type: "select", options: ["Announcement", "Achievement", "Research", "Event Recap", "Other"] },
        { k: "image", label: "Image", type: "image", full: true },
        { k: "summary", label: "Summary (shown on cards)", type: "textarea", full: true },
        { k: "content", label: "Full article", type: "textarea", full: true, rows: 8, hint: "Blank lines separate paragraphs." }
      ]
    },
    sponsors: {
      label: "Partners", singular: "partner", emoji: "&#129309;", prefix: "s",
      columns: [["logo", "thumb"], ["name", "text"], ["url", "text"]],
      fields: [
        { k: "name", label: "Name", required: true },
        { k: "url", label: "Website" },
        { k: "logo", label: "Logo", type: "image", full: true }
      ]
    }
  };

  const NAV = [
    ["overview", "&#128202;", "Overview"],
    ...Object.entries(SCHEMAS).map(([k, s]) => [k, s.emoji, s.label]),
    ["settings", "&#9881;&#65039;", "Site settings"],
    ["data", "&#128190;", "Backup & publish"]
  ];

  // ---------- auth ----------
  function showApp() {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    render();
  }
  document.getElementById("login-logo").src = data.settings.logo;
  document.getElementById("side-logo").src = data.settings.logo;
  if (ss.get(SESSION_KEY) === pwHash()) showApp();
  else neuralCanvas(document.getElementById("net"));

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("pw");
    if (hash(pw.value) === pwHash()) { ss.set(SESSION_KEY, pwHash()); showApp(); }
    else { pw.value = ""; pw.focus(); toast("Incorrect password"); }
  });
  document.getElementById("logout").addEventListener("click", () => { ss.del(SESSION_KEY); location.reload(); });

  const side = document.getElementById("side");
  const sideToggle = document.getElementById("side-toggle");
  sideToggle.innerHTML = icon("menu");
  sideToggle.addEventListener("click", () => side.classList.toggle("open"));

  // ---------- persistence ----------
  function commit(msg) {
    if (!saveData(data)) toast("Could not save - browser storage is full or blocked. Try smaller images.");
    else if (msg) toast(msg);
    render();
  }

  // ---------- rendering ----------
  function renderSide() {
    document.getElementById("side-links").innerHTML = NAV.map(([k, e, l]) => {
      const n = Array.isArray(data[k]) ? `<span class="count">${data[k].length}</span>` : "";
      return `<button type="button" class="side-link ${view === k ? "active" : ""}" data-view="${k}"><span>${e}</span>${l}${n}</button>`;
    }).join("");
  }
  document.getElementById("side-links").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    view = b.dataset.view; side.classList.remove("open"); render(); window.scrollTo(0, 0);
  });

  const main = document.getElementById("admin-main");
  const unsavedNotice = () => hasLocalEdits()
    ? `<div class="notice"><b>Heads up:</b> your edits are saved in this browser only. Go to <a href="#" data-goto="data" class="person-role">Backup &amp; publish</a> and export <code>data.js</code> to make them live for everyone.</div>` : "";

  function render() {
    renderSide();
    if (view === "overview") renderOverview();
    else if (view === "settings") renderSettings();
    else if (view === "data") renderDataView();
    else renderCollection(view);
    main.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); view = a.dataset.goto; render(); }));
  }

  function renderOverview() {
    const cards = Object.entries(SCHEMAS).map(([k, s]) => `
      <button type="button" class="panel span-4" data-goto="${k}" style="text-align:left;cursor:pointer;font:inherit;color:inherit">
        <div class="kpi"><div class="kpi-icon">${s.emoji}</div><div><div class="kpi-val">${data[k].length}</div><div class="kpi-label">${s.label}</div></div></div>
        <div class="kpi-sub">Manage ${s.label.toLowerCase()} &rarr;</div>
      </button>`).join("");
    const upcoming = data.events.filter(window.Site.isUpcoming).length;
    main.innerHTML = `
      <div class="admin-top"><div><h1>Welcome back &#128075;</h1><p class="muted" style="margin:4px 0 0">Here's what's on the site right now.</p></div>
        <div class="admin-actions"><button class="btn btn-primary btn-sm" data-goto="data">Export data.js</button></div></div>
      ${unsavedNotice()}
      <div class="dash-grid">${cards}</div>
      <div class="dash-grid" style="margin-top:20px">
        <div class="panel span-6"><div class="panel-head"><h3>Quick add</h3></div>
          <div class="admin-actions">${Object.entries(SCHEMAS).map(([k, s]) => `<button class="btn btn-sm" data-add="${k}">+ ${s.singular}</button>`).join("")}</div></div>
        <div class="panel span-6"><div class="panel-head"><h3>Health check</h3></div>
          <ul class="list">
            <li><span class="grow">Upcoming events</span><span class="tag ${upcoming ? "good" : "warn"}">${upcoming || "None - add one!"}</span></li>
            <li><span class="grow">People without photos</span><span class="tag ${data.people.some((p) => !p.photo) ? "warn" : "good"}">${data.people.filter((p) => !p.photo).length}</span></li>
            <li><span class="grow">Placeholder images in use</span><span class="tag warn">${countPlaceholders()}</span></li>
          </ul></div>
      </div>`;
    main.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => editItem(b.dataset.add, null)));
  }

  function countPlaceholders() {
    const str = JSON.stringify(data);
    return (str.match(/placeholder/g) || []).length;
  }

  function cell(item, [key, kind]) {
    const v = item[key];
    switch (kind) {
      case "avatar": return avatar(item, "avatar-sm");
      case "thumb": return v ? `<img class="thumb" src="${esc(v)}" alt="">` : '<span class="muted">-</span>';
      case "tag": return v ? `<span class="tag primary">${esc(v)}</span>` : "";
      case "status": return `<span class="tag ${{ Ongoing: "cyan", Completed: "good", Planned: "warn" }[v] || ""} status-dot">${esc(v)}</span>`;
      case "date": return esc(fmtDate(v));
      default: return `<span style="display:inline-block;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">${esc(v)}</span>`;
    }
  }

  function renderCollection(key, query) {
    const s = SCHEMAS[key];
    const q = (query || "").toLowerCase();
    const rows = data[key].map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !q || JSON.stringify(item).toLowerCase().includes(q));
    if (s.sort && !q) rows.sort((a, b) => s.sort(a.item, b.item));
    main.innerHTML = `
      <div class="admin-top">
        <div><h1>${s.emoji} ${s.label}</h1><p class="muted" style="margin:4px 0 0">${data[key].length} ${data[key].length === 1 ? s.singular : s.label.toLowerCase()}</p></div>
        <div class="admin-actions">
          <label class="search" style="min-width:220px"><span class="sr-only">Search</span>${icon("search")}<input type="search" id="q" placeholder="Search ${s.label.toLowerCase()}" value="${esc(query || "")}"></label>
          <button class="btn btn-primary btn-sm" id="add">+ Add ${s.singular}</button>
        </div>
      </div>
      ${unsavedNotice()}
      <div class="table-wrap"><table>
        <thead><tr>${s.columns.map(([k]) => `<th>${esc(k === "src" ? "image" : k)}</th>`).join("")}<th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows.map(({ item, idx }) => `
          <tr>${s.columns.map((c) => `<td>${cell(item, c)}</td>`).join("")}
            <td><div class="row-actions">
              ${s.sort ? "" : `<button class="icon-btn" data-move="-1" data-idx="${idx}" aria-label="Move up" title="Move up">&uarr;</button>
              <button class="icon-btn" data-move="1" data-idx="${idx}" aria-label="Move down" title="Move down">&darr;</button>`}
              <button class="btn btn-sm" data-edit="${idx}">Edit</button>
              <button class="btn btn-sm btn-danger" data-del="${idx}">Delete</button>
            </div></td></tr>`).join("") || `<tr><td colspan="${s.columns.length + 1}" class="center muted" style="padding:40px">Nothing here yet.</td></tr>`}
        </tbody></table></div>
      ${s.sort ? '<p class="hint">Sorted by date on the site automatically.</p>' : '<p class="hint">Use the arrows to change the order items appear on the site.</p>'}`;

    const qInput = document.getElementById("q");
    qInput.addEventListener("input", () => {
      const pos = qInput.selectionStart;
      renderCollection(key, qInput.value);
      const n = document.getElementById("q"); n.focus(); n.setSelectionRange(pos, pos);
    });
    document.getElementById("add").addEventListener("click", () => editItem(key, null));
    main.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editItem(key, Number(b.dataset.edit))));
    main.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      const item = data[key][Number(b.dataset.del)];
      const name = item.name || item.title || item.caption || s.singular;
      if (confirm(`Delete "${name}"? This cannot be undone.`)) { data[key].splice(Number(b.dataset.del), 1); commit("Deleted"); }
    }));
    main.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.idx), j = i + Number(b.dataset.move), arr = data[key];
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      commit();
    }));
  }

  // ---------- generic form ----------
  function fieldHtml(f, value) {
    const id = "fld-" + f.k;
    const req = f.required ? "required" : "";
    const v = value == null ? "" : value;
    let input;
    if (f.type === "textarea") input = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 4}" ${req}>${esc(v)}</textarea>`;
    else if (f.type === "select") {
      const opts = f.options.includes(v) || !v ? f.options : [v, ...f.options];
      input = `<select id="${id}" name="${f.k}">${opts.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (f.type === "list") input = `<input id="${id}" name="${f.k}" value="${esc((v || []).join(", "))}" ${req}>`;
    else if (f.type === "image") {
      input = `
        <div style="display:flex;gap:10px;align-items:center">
          <img class="thumb img-preview" src="${esc(v)}" alt="" style="${v ? "" : "visibility:hidden"};flex-shrink:0">
          <input id="${id}" name="${f.k}" value="${esc(v.startsWith && v.startsWith("data:") ? "" : v)}" data-data="${v.startsWith && v.startsWith("data:") ? "1" : ""}" placeholder="assets/img/... or https://..." ${req && !v ? req : ""}>
        </div>
        <input type="file" accept="image/*" data-upload="${f.k}" style="margin-top:8px;padding:8px">`;
    } else input = `<input id="${id}" name="${f.k}" type="${f.type || "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${req}>`;
    return `<div class="field ${f.full ? "full" : ""}"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}</div>`;
  }

  // Images: either a path/URL, or an uploaded file stored inline as a data URL.
  function wireImageFields(root, values) {
    root.querySelectorAll("[data-upload]").forEach((up) => {
      const k = up.dataset.upload;
      const text = root.querySelector(`[name="${k}"]`);
      const preview = text.parentElement.querySelector(".img-preview");
      if (text.dataset.data) { text.placeholder = "Uploaded image (stored inline)"; }
      text.addEventListener("input", () => { values[k] = text.value; preview.src = text.value; preview.style.visibility = text.value ? "" : "hidden"; });
      up.addEventListener("change", () => {
        const file = up.files[0];
        if (!file) return;
        resizeImage(file, 1400).then((url) => {
          values[k] = url; text.value = ""; text.placeholder = "Uploaded image (stored inline)"; text.required = false;
          preview.src = url; preview.style.visibility = "";
          if (url.length > 600000) toast("Large image - consider adding it to assets/img and using its path instead.");
        });
      });
    });
  }

  function resizeImage(file, maxW) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type === "image/svg+xml") return resolve(reader.result);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function editItem(key, idx) {
    const s = SCHEMAS[key];
    const isNew = idx == null;
    const item = isNew ? {} : clone(data[key][idx]);
    const imageValues = {};
    s.fields.filter((f) => f.type === "image").forEach((f) => { imageValues[f.k] = item[f.k] || ""; });
    const m = openModal(`
      <h2 style="font-size:1.5rem">${isNew ? "Add" : "Edit"} ${s.singular}</h2>
      <form id="edit-form" class="form-grid" style="margin-top:18px">
        ${s.fields.map((f) => fieldHtml(f, item[f.k])).join("")}
        <div class="full admin-actions" style="justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-sm" data-close>Cancel</button>
          <button type="submit" class="btn btn-sm btn-primary">${isNew ? "Add" : "Save changes"}</button>
        </div>
      </form>`, { wide: true });
    const form = m.querySelector("#edit-form");
    wireImageFields(form, imageValues);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = isNew ? { id: uid(s.prefix) } : item;
      for (const f of s.fields) {
        if (f.type === "image") { out[f.k] = imageValues[f.k] || ""; continue; }
        const raw = form.elements[f.k].value.trim();
        if (f.type === "list") out[f.k] = raw ? raw.split(",").map((x) => x.trim()).filter(Boolean) : [];
        else if (f.type === "number") out[f.k] = raw ? Number(raw) : "";
        else out[f.k] = raw;
      }
      const missing = s.fields.find((f) => f.required && !out[f.k]);
      if (missing) { toast(`${missing.label} is required`); return; }
      if (isNew) data[key].unshift(out); else data[key][idx] = out;
      closeModal();
      commit(isNew ? `Added ${s.singular}` : "Saved");
    });
  }

  // ---------- settings ----------
  function renderSettings() {
    const st = data.settings;
    const f = (k, label, v, extra) => `<div class="field ${extra && extra.full ? "full" : ""}"><label for="s-${k}">${label}</label>${extra && extra.area
      ? `<textarea id="s-${k}" name="${k}" rows="4">${esc(v)}</textarea>` : `<input id="s-${k}" name="${k}" type="${(extra && extra.type) || "text"}" value="${esc(v)}">`}</div>`;
    const imageValues = { logo: st.logo, instituteLogo: st.instituteLogo };
    main.innerHTML = `
      <div class="admin-top"><div><h1>&#9881;&#65039; Site settings</h1><p class="muted" style="margin:4px 0 0">Branding, contact details and headline numbers.</p></div></div>
      ${unsavedNotice()}
      <form id="settings-form">
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Branding</h3></div><div class="form-grid">
          ${f("clubName", "Club name", st.clubName)}${f("institute", "Institute", st.institute)}
          ${f("tagline", "Tagline", st.tagline, { full: true })}${f("about", "About the club", st.about, { full: true, area: true })}
          ${fieldHtml({ k: "logo", label: "Club logo", type: "image" }, st.logo)}
          ${fieldHtml({ k: "instituteLogo", label: "Institute logo", type: "image" }, st.instituteLogo)}
        </div></div>
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Contact & links</h3></div><div class="form-grid">
          ${f("email", "Email", st.email, { type: "email" })}${f("joinLink", "Join / recruitment form link", st.joinLink)}
          ${f("address", "Address", st.address, { full: true })}
          ${Object.keys(st.socials).map((k) => f("social-" + k, k[0].toUpperCase() + k.slice(1) + " URL", st.socials[k])).join("")}
        </div></div>
        <div class="panel" style="margin-bottom:20px"><div class="panel-head"><h3>Headline stats (home page)</h3></div><div class="form-grid">
          ${Object.keys(st.stats).map((k) => f("stat-" + k, k[0].toUpperCase() + k.slice(1), st.stats[k], { type: "number" })).join("")}
        </div></div>
        <button class="btn btn-primary" type="submit">Save settings</button>
      </form>
      <div class="panel" style="margin-top:28px"><div class="panel-head"><h3>Admin password</h3></div>
        <form id="pw-form" class="form-grid">
          <div class="field"><label for="pw1">New password</label><input id="pw1" type="password" minlength="6" required autocomplete="new-password"></div>
          <div class="field"><label for="pw2">Confirm</label><input id="pw2" type="password" minlength="6" required autocomplete="new-password"></div>
          <div class="full"><button class="btn btn-sm" type="submit">Change password</button><p class="hint">Stored in this browser only.</p></div>
        </form></div>`;
    const form = document.getElementById("settings-form");
    wireImageFields(form, imageValues);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = (n) => form.elements[n].value.trim();
      ["clubName", "institute", "tagline", "about", "email", "joinLink", "address"].forEach((k) => { st[k] = val(k); });
      Object.keys(st.socials).forEach((k) => { st.socials[k] = val("social-" + k); });
      Object.keys(st.stats).forEach((k) => { st.stats[k] = Number(val("stat-" + k)) || 0; });
      Object.assign(st, imageValues);
      commit("Settings saved");
    });
    document.getElementById("pw-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const a = document.getElementById("pw1").value, b = document.getElementById("pw2").value;
      if (a !== b) { toast("Passwords don't match"); return; }
      ls.set(PW_KEY, hash(a)); ss.set(SESSION_KEY, hash(a));
      toast("Password changed"); e.target.reset();
    });
  }

  // ---------- backup / publish ----------
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function renderDataView() {
    main.innerHTML = `
      <div class="admin-top"><div><h1>&#128190; Backup & publish</h1><p class="muted" style="margin:4px 0 0">Move your edits from this browser to the live site.</p></div></div>
      ${unsavedNotice()}
      <div class="dash-grid">
        <div class="panel span-6"><div class="panel-head"><h3>1. Publish your changes</h3></div>
          <p class="muted small">Download <code>data.js</code> and replace <code>assets/js/data.js</code> in the repository with it. Commit and push - everyone will see the update.</p>
          <button class="btn btn-primary btn-sm" id="exp-js">Export data.js</button></div>
        <div class="panel span-6"><div class="panel-head"><h3>2. Backup as JSON</h3></div>
          <p class="muted small">Keep a copy of all content, or move it to another browser.</p>
          <div class="admin-actions"><button class="btn btn-sm" id="exp-json">Download JSON</button>
          <label class="btn btn-sm" style="margin:0">Import JSON<input type="file" id="imp-json" accept="application/json,.json" hidden></label></div></div>
        <div class="panel span-12"><div class="panel-head"><h3>Discard local edits</h3></div>
          <p class="muted small">Throw away everything saved in this browser and go back to the content in <code>data.js</code>.</p>
          <button class="btn btn-danger btn-sm" id="reset">Reset to published content</button></div>
      </div>`;
    document.getElementById("exp-js").addEventListener("click", () => {
      const header = "/*\n * AI Club IIT Dharwad - site content.\n * Exported from admin.html on " + new Date().toISOString() + "\n */\n";
      download("data.js", header + "window.DEFAULT_SITE_DATA = " + JSON.stringify(data, null, 2) + ";\n", "text/javascript");
    });
    document.getElementById("exp-json").addEventListener("click", () => download("aiclub-data.json", JSON.stringify(data, null, 2), "application/json"));
    document.getElementById("imp-json").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      file.text().then((txt) => {
        try {
          const parsed = JSON.parse(txt);
          if (!parsed.settings || !Array.isArray(parsed.people)) throw new Error("bad shape");
          data = Object.assign(clone(window.DEFAULT_SITE_DATA), parsed);
          commit("Imported");
        } catch (err) { toast("That file isn't a valid AI Club backup"); }
      });
    });
    document.getElementById("reset").addEventListener("click", () => {
      if (!confirm("Discard all local edits?")) return;
      resetData(); data = getData(); render(); toast("Reset to published content");
    });
  }
});
