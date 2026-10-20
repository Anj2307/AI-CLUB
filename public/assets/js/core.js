/* Shared runtime for every page: data loading, layout, theme, icons and interaction effects. */
(function () {
  "use strict";

  const THEME_KEY = "aiclub-theme";

  const NAV = [
    { href: "index.html", label: "Home" },
    { href: "dashboard.html", label: "Dashboard" },
    { href: "people.html", label: "People" },
    { href: "projects.html", label: "Projects" },
    { href: "events.html", label: "Events" },
    { href: "gallery.html", label: "Gallery" },
    { href: "news.html", label: "News" },
    { href: "contact.html", label: "Contact" }
  ];

  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = () => window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- storage (try/catch: private windows can throw) ----------
  function readLS(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- API client ----------
  // API origin: same origin by default; a static host (e.g. GitHub Pages) can point at a deployed
  // backend with <meta name="aiclub-api" content="https://api.example.com">.
  const apiMeta = document.querySelector('meta[name="aiclub-api"]');
  const API_BASE = ((apiMeta && apiMeta.content) || "").replace(/\/$/, "") + "/api/v1";
  const API_AVAILABLE = location.protocol !== "file:" || !!(apiMeta && apiMeta.content);

  class ApiError extends Error {
    constructor(status, message, details) { super(message); this.status = status; this.details = details; }
  }

  async function api(path, opts = {}) {
    const init = { method: opts.method || "GET", credentials: "include", headers: {} };
    if (opts.body instanceof FormData) init.body = opts.body;
    else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers["Content-Type"] = "application/json"; }
    if (opts.signal) init.signal = opts.signal;
    let res;
    try { res = await fetch(API_BASE + path, init); }
    catch (e) { throw new ApiError(0, "Can't reach the server. Check your connection."); }
    if (res.status === 204) return null;
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, (body && body.error && body.error.message) || `Request failed (${res.status})`, body && body.error && body.error.details);
    return body;
  }

  // ---------- site data ----------
  // Pages read content through getData(). It comes from the API; if the API is unreachable
  // (static hosting, offline) we fall back to the bundled assets/js/data.js.
  let siteData = null;
  let mode = "api";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.onload = resolve; el.onerror = reject;
      document.head.append(el);
    });
  }
  function scriptBase() {
    const me = document.querySelector('script[src*="core.js"]');
    return me ? me.getAttribute("src").replace(/core\.js.*$/, "") : "assets/js/";
  }

  async function loadData() {
    if (API_AVAILABLE) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        siteData = await api("/site", { signal: ctrl.signal });
        return;
      } catch (e) { /* fall back below */ } finally { clearTimeout(timer); }
    }
    mode = "static";
    if (!window.DEFAULT_SITE_DATA) await loadScript(scriptBase() + "data.js");
    siteData = clone(window.DEFAULT_SITE_DATA);
  }

  const getData = () => siteData;

  // ---------- helpers ----------
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function parseDate(d) { return new Date(d + "T00:00:00"); }
  function fmtDate(d, opts) {
    if (!d) return "";
    return parseDate(d).toLocaleDateString("en-IN", opts || { day: "numeric", month: "short", year: "numeric" });
  }
  function today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function isUpcoming(ev) { return parseDate(ev.date) >= today(); }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }
  function hueFor(str) {
    let h = 0;
    for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  }
  // Photo if present, otherwise a generated initials avatar.
  function avatar(person, cls) {
    if (person.photo) return `<img class="${cls || "avatar"}" src="${esc(person.photo)}" alt="${esc(person.name)}" loading="lazy">`;
    const h = hueFor(person.name);
    return `<div class="${cls || "avatar"} avatar-fallback" style="--h:${h}" aria-label="${esc(person.name)}">${esc(initials(person.name))}</div>`;
  }
  function uid(prefix) { return (prefix || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- icons (24px line icons, stroke = currentColor) ----------
  const ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    github: '<path d="M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowUpRight: '<path d="M7 17L17 7M8 7h9v9"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    brain: '<path d="M9.5 3A3 3 0 0 0 6.5 6v.3A3.5 3.5 0 0 0 4 9.7a3.5 3.5 0 0 0 .7 5.4A3.5 3.5 0 0 0 8 20a2.7 2.7 0 0 0 4-1V5.5A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3a3 3 0 0 1 3 3v.3a3.5 3.5 0 0 1 2.5 3.4 3.5 3.5 0 0 1-.7 5.4A3.5 3.5 0 0 1 16 20a2.7 2.7 0 0 1-4-1"/><path d="M8 9.5h1.5M14.5 9.5H16M8.5 14H10M14 14h1.5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5M9 4h6M2 13v2M22 13v2"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/>',
    flask: '<path d="M9 3h6M10 3v6L4.3 18.5A1.7 1.7 0 0 0 5.8 21h12.4a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
    scale: '<path d="M12 3v18M7 21h10M4 7h16M6.5 7L3 14a3.5 3.5 0 0 0 7 0zM17.5 7L14 14a3.5 3.5 0 0 0 7 0z"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4.5-6.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3a12 12 0 0 1 9-9h6v6a12 12 0 0 1-9 9z"/><circle cx="15.5" cy="8.5" r="1.8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    news: '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M17 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-4 0M7 8h6M7 12h6M7 16h4"/>',
    partners: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M13.5 9.5l2 2"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    enter: '<path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>'
  };
  const iconSvg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const icon = (name, cls) => `<span class="icon${cls ? " " + cls : ""}" aria-hidden="true">${iconSvg(name)}</span>`;

  function socialLinks(socials, email) {
    const items = Object.entries(socials || {}).filter(([, url]) => url)
      .map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(k)}" class="social">${icon(k)}</a>`);
    if (email) items.push(`<a href="mailto:${esc(email)}" aria-label="Email" class="social">${icon("email")}</a>`);
    return items.join("");
  }

  // Swap any <i data-icon="name"></i> placeholder in static HTML for its SVG.
  function hydrateIcons(root) {
    (root || document).querySelectorAll("i[data-icon]").forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, el.className);
    });
  }

  // ---------- theme ----------
  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
  }
  function currentTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  applyTheme(readLS(THEME_KEY));

  // ---------- layout ----------
  function renderLayout() {
    const s = getData().settings;
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase().replace(/^(?!.*\.html$)(.+)$/, "$1.html");
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");

    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="container nav-wrap">
        <a class="brand" href="index.html" aria-label="${esc(s.clubName)} home">
          <img src="${esc(s.logo)}" alt="" class="brand-logo">
          <span class="brand-text"><strong>${esc(s.clubName)}</strong><small>${esc(s.institute)}</small></span>
        </a>
        <nav class="nav" id="site-nav" aria-label="Main">
          <span class="nav-pill" aria-hidden="true"></span>
          ${NAV.map((n) => `<a href="${n.href}" class="${page === n.href ? "active" : ""}" ${page === n.href ? 'aria-current="page"' : ""}>${n.label}</a>`).join("")}
        </nav>
        <div class="nav-actions">
          <button class="search-btn" id="search-open" type="button" aria-label="Search the site">
            ${icon("search")}<span class="hide-md">Search</span><kbd class="hide-md">${isMac ? "&#8984;" : "Ctrl"} K</kbd>
          </button>
          <button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle colour theme"></button>
          <a class="btn btn-sm btn-primary hide-sm" href="${esc(s.joinLink)}" target="_blank" rel="noopener">Join us</a>
          <button class="icon-btn menu-btn" id="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">${icon("menu")}</button>
        </div>
      </div>`;
    document.body.prepend(header);
    document.body.prepend(progress);

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container">
        <div class="footer-cta">
          <h2>Let's build something <span class="grad-text">intelligent</span>.</h2>
          <div class="hero-cta" style="margin:0">
            <a class="btn btn-primary" href="${esc(s.joinLink)}" target="_blank" rel="noopener" data-magnetic>Become a member ${icon("arrowUpRight")}</a>
            <a class="btn" href="contact.html">Talk to us</a>
          </div>
        </div>
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html">
              <img src="${esc(s.logo)}" alt="" class="brand-logo">
              <span class="brand-text"><strong>${esc(s.clubName)}</strong><small>${esc(s.institute)}</small></span>
            </a>
            <p class="muted footer-tag">${esc(s.tagline)}</p>
            <div class="socials">${socialLinks(s.socials, s.email)}</div>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>${NAV.slice(1, 5).map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("")}</ul>
          </div>
          <div>
            <h4>More</h4>
            <ul>${NAV.slice(5).map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("")}<li><a href="admin.html">Admin</a></li></ul>
          </div>
          <div>
            <h4>Visit</h4>
            <p class="muted small">${esc(s.address)}</p>
            <img src="${esc(s.instituteLogo)}" alt="${esc(s.institute)} logo" class="inst-logo">
          </div>
        </div>
        <div class="footer-wordmark" aria-hidden="true">${esc(s.clubName)}</div>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} ${esc(s.clubName)}, ${esc(s.institute)}</span>
          <span class="mono">Made by students, for students.</span>
        </div>
      </div>`;
    document.body.append(footer);

    const toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.type = "button";
    toTop.setAttribute("aria-label", "Back to top");
    toTop.innerHTML = icon("arrowUp");
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" }));
    document.body.append(toTop);

    // theme toggle
    const tbtn = document.getElementById("theme-toggle");
    const paintToggle = () => { tbtn.innerHTML = icon(currentTheme() === "dark" ? "sun" : "moon"); };
    paintToggle();
    tbtn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      const swap = () => { applyTheme(next); writeLS(THEME_KEY, next); paintToggle(); document.dispatchEvent(new CustomEvent("themechange")); };
      if (document.startViewTransition && !reduceMotion()) document.startViewTransition(swap);
      else swap();
    });

    // mobile menu
    const mbtn = document.getElementById("menu-toggle");
    const nav = document.getElementById("site-nav");
    mbtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      mbtn.setAttribute("aria-expanded", open);
      mbtn.innerHTML = icon(open ? "close" : "menu");
    });

    initNavPill(nav);
    document.getElementById("search-open").addEventListener("click", openPalette);

    // header state + progress bar + back-to-top
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      progress.style.transform = `scaleX(${p})`;
      header.classList.toggle("scrolled", window.scrollY > 8);
      toTop.classList.toggle("show", window.scrollY > 600);
      toTop.style.setProperty("--p", (p * 100).toFixed(1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Sliding highlight that follows the hovered nav link, resting on the active one.
  function initNavPill(nav) {
    const pill = nav.querySelector(".nav-pill");
    const active = nav.querySelector("a.active");
    const moveTo = (a) => {
      if (!a || window.innerWidth <= 1080) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("mouseenter", () => moveTo(a)));
    nav.addEventListener("mouseleave", () => moveTo(active));
    window.addEventListener("resize", () => moveTo(active));
    // fonts change link widths once loaded
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
      pill.classList.add("no-anim"); moveTo(active);
      requestAnimationFrame(() => pill.classList.remove("no-anim"));
    });
  }

  // ---------- command palette (Ctrl/Cmd + K) ----------
  function paletteItems() {
    const d = getData();
    const pages = NAV.map((n) => ({ group: "Pages", title: n.label, sub: n.href.replace(".html", ""), url: n.href, ic: "file" }));
    return pages.concat(
      d.projects.map((p) => ({ group: "Projects", title: p.title, sub: `${p.domain} · ${p.status}`, url: `projects.html#${p.id}`, ic: "rocket" })),
      d.events.map((e) => ({ group: "Events", title: e.title, sub: `${fmtDate(e.date)} · ${e.venue}`, url: `events.html#${e.id}`, ic: "calendar" })),
      d.people.map((p) => ({ group: "People", title: p.name, sub: p.role, url: `people.html#${p.id}`, ic: "user" })),
      d.news.map((n) => ({ group: "News", title: n.title, sub: fmtDate(n.date), url: `news.html#${n.id}`, ic: "news" }))
    );
  }

  function openPalette() {
    if (!siteData || document.querySelector(".palette")) return;
    const all = paletteItems();
    const wrap = document.createElement("div");
    wrap.className = "palette";
    wrap.innerHTML = `
      <div class="palette-backdrop" data-close></div>
      <div class="palette-card" role="dialog" aria-modal="true" aria-label="Search">
        <div class="palette-input">${icon("search")}<input type="text" placeholder="Search projects, events, people, news..." aria-label="Search" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
        <div class="palette-results" role="listbox"></div>
        <div class="palette-foot"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span><span><kbd>&crarr;</kbd> open</span></div>
      </div>`;
    document.body.append(wrap);
    document.body.classList.add("no-scroll");
    const input = wrap.querySelector("input");
    const list = wrap.querySelector(".palette-results");
    let results = [], sel = 0;

    const score = (it, q) => {
      const t = it.title.toLowerCase(), s = (it.sub || "").toLowerCase();
      if (t.startsWith(q)) return 3;
      if (t.includes(q)) return 2;
      if (s.includes(q)) return 1;
      return 0;
    };
    function render() {
      const q = input.value.trim().toLowerCase();
      results = q ? all.map((it) => [it, score(it, q)]).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([it]) => it).slice(0, 40)
        : all.filter((it) => it.group === "Pages" || it.group === "Events").slice(0, 12);
      sel = Math.min(sel, Math.max(0, results.length - 1));
      let lastGroup = "";
      list.innerHTML = results.map((it, i) => {
        const head = it.group !== lastGroup ? `<div class="palette-group">${esc(it.group)}</div>` : "";
        lastGroup = it.group;
        return `${head}<a class="palette-item ${i === sel ? "sel" : ""}" href="${esc(it.url)}" data-i="${i}" role="option" aria-selected="${i === sel}">
          <span class="palette-ic">${icon(it.ic)}</span><span class="grow"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></span>${icon("enter", "palette-enter")}</a>`;
      }).join("") || `<div class="palette-empty">No results for "${esc(input.value)}"</div>`;
      const cur = list.querySelector(".sel");
      if (cur) cur.scrollIntoView({ block: "nearest" });
    }
    function close() { wrap.remove(); document.body.classList.remove("no-scroll"); }
    function go(i) {
      const it = results[i];
      if (!it) return;
      close();
      const [file, hash] = it.url.split("#");
      const here = (location.pathname.split("/").pop() || "index.html");
      if (hash && (here === file || here + ".html" === file)) { location.hash = hash; window.dispatchEvent(new HashChangeEvent("hashchange")); }
      else location.href = it.url;
    }
    input.addEventListener("input", () => { sel = 0; render(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
      else if (e.key === "Enter") { e.preventDefault(); go(sel); }
      else if (e.key === "Escape") close();
    });
    list.addEventListener("click", (e) => { const a = e.target.closest("[data-i]"); if (a) { e.preventDefault(); go(Number(a.dataset.i)); } });
    list.addEventListener("mousemove", (e) => {
      const a = e.target.closest("[data-i]");
      if (a && Number(a.dataset.i) !== sel) { sel = Number(a.dataset.i); list.querySelectorAll(".palette-item").forEach((x) => x.classList.toggle("sel", x === a)); }
    });
    wrap.querySelector("[data-close]").addEventListener("click", close);
    render();
    input.focus(); // synchronously, so keys typed right after Ctrl+K aren't lost
    requestAnimationFrame(() => wrap.classList.add("show"));
  }
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !document.body.hasAttribute("data-no-layout")) { e.preventDefault(); openPalette(); }
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.body.hasAttribute("data-no-layout")) { e.preventDefault(); openPalette(); }
  });

  // ---------- interaction effects ----------
  // Cards light up under the cursor: CSS reads --mx/--my set here.
  function initSpotlight() {
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest(".card, .panel, .stat, .bento-tile");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  // [data-tilt]: subtle 3D tilt toward the pointer.
  function initTilt() {
    if (!finePointer() || reduceMotion()) return;
    let current = null;
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest("[data-tilt]");
      if (current && current !== el) { current.style.transform = ""; current = null; }
      if (!el) return;
      current = el;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      const max = Number(el.dataset.tilt) || 6;
      el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-4px)`;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { if (current) current.style.transform = ""; });
  }

  // [data-magnetic]: buttons drift slightly toward the cursor.
  function initMagnetic() {
    if (!finePointer() || reduceMotion()) return;
    document.addEventListener("pointermove", (e) => {
      document.querySelectorAll("[data-magnetic].magnet-on").forEach((b) => {
        if (!b.contains(e.target)) { b.style.transform = ""; b.classList.remove("magnet-on"); }
      });
      const b = e.target.closest && e.target.closest("[data-magnetic]");
      if (!b) return;
      const r = b.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      b.classList.add("magnet-on");
      b.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    }, { passive: true });
  }

  // ---------- reveal on scroll ----------
  function observeReveal(root) {
    const els = (root || document).querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
  }

  // ---------- animated counters ----------
  function animateCount(el, target) {
    if (reduceMotion()) { el.textContent = target.toLocaleString("en-IN"); return; }
    const dur = 1400, start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString("en-IN");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function observeCounters(root) {
    (root || document).querySelectorAll("[data-count]:not([data-counted])").forEach((el) => {
      el.dataset.counted = "1";
      const target = Number(el.dataset.count) || 0;
      if (!("IntersectionObserver" in window)) { el.textContent = target; return; }
      const io = new IntersectionObserver((ents) => {
        if (ents[0].isIntersecting) { animateCount(el, target); io.disconnect(); }
      });
      io.observe(el);
    });
  }

  // ---------- modal ----------
  function openModal(html, opts) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.className = "modal" + (opts && opts.wide ? " modal-wide" : "");
    wrap.innerHTML = `<div class="modal-backdrop" data-close></div>
      <div class="modal-card" role="dialog" aria-modal="true">
        <button class="icon-btn modal-close" data-close aria-label="Close">${icon("close")}</button>
        ${html}
      </div>`;
    document.body.append(wrap);
    document.body.classList.add("no-scroll");
    wrap.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
    requestAnimationFrame(() => wrap.classList.add("show"));
    return wrap;
  }
  function closeModal() {
    document.querySelectorAll(".modal").forEach((m) => m.remove());
    if (!document.querySelector(".palette")) document.body.classList.remove("no-scroll");
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  // ---------- neural-network background canvas ----------
  function neuralCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, nodes, raf, mouse = { x: -999, y: -999 };
    const color = () => getComputedStyle(document.documentElement).getPropertyValue("--net").trim() || "124,92,255";

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 14000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 1
      }));
    }
    function frame() {
      const c = color();
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        // gentle attraction toward the cursor
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 200 && d > 1) { p.vx += (dx / d) * 0.006; p.vy += (dy / d) * 0.006; }
        p.vx = Math.max(-0.6, Math.min(0.6, p.vx)); p.vy = Math.max(-0.6, Math.min(0.6, p.vy));
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < 16000) {
            ctx.strokeStyle = `rgba(${c},${0.22 * (1 - d / 16000)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 160) {
          ctx.strokeStyle = `rgba(${c},${0.45 * (1 - md / 160)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${c},0.75)`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduceMotion()) raf = requestAnimationFrame(frame);
    }
    resize(); frame();
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); frame(); });
    const host = canvas.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      host.style.setProperty("--hx", `${mouse.x}px`); host.style.setProperty("--hy", `${mouse.y}px`);
    });
    host.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
    // pause when off-screen to save battery
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => {
        cancelAnimationFrame(raf);
        if (en.isIntersecting) frame();
      }).observe(canvas);
    }
  }

  // ---------- filter chips ----------
  // Renders a chip row into `el`; calls onChange(value) when one is picked.
  function chips(el, values, onChange, initial) {
    let active = initial || values[0];
    const paint = () => {
      el.innerHTML = values.map((v) => `<button type="button" class="chip ${v === active ? "active" : ""}" data-v="${esc(v)}" aria-pressed="${v === active}">${esc(v)}</button>`).join("");
    };
    paint();
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      active = b.dataset.v; paint(); onChange(active);
    });
    return () => active;
  }
  const unique = (arr) => [...new Set(arr.filter(Boolean))];

  window.Site = {
    getData, api, ApiError, mode: () => mode, esc, fmtDate, parseDate, isUpcoming, today,
    avatar, initials, uid, icon, socialLinks, observeReveal, observeCounters, hydrateIcons,
    openModal, closeModal, toast, neuralCanvas, clone, chips, unique, reduceMotion
  };

  document.addEventListener("DOMContentLoaded", async () => {
    hydrateIcons();
    // The admin app manages its own data and skips the public layout.
    if (!document.body.hasAttribute("data-no-layout")) {
      await loadData();
      renderLayout();
      initSpotlight();
      initTilt();
      initMagnetic();
    }
    document.body.classList.add("ready");
    document.dispatchEvent(new CustomEvent("site:ready"));
    hydrateIcons();
    observeReveal();
    observeCounters();
  });
})();
