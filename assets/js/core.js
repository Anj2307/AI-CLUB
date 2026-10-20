/* Shared runtime for every page: data store, layout, theme and small UI helpers. */
(function () {
  "use strict";

  const STORE_KEY = "aiclub-data-v1";
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

  // ---------- storage (try/catch: private windows can throw) ----------
  function readLS(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function removeLS(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Admin edits are saved to localStorage and override data.js for this browser.
  function getData() {
    const saved = readLS(STORE_KEY);
    if (saved) {
      try { return Object.assign(clone(window.DEFAULT_SITE_DATA), JSON.parse(saved)); } catch (e) { /* fall through */ }
    }
    return clone(window.DEFAULT_SITE_DATA);
  }
  function saveData(data) { return writeLS(STORE_KEY, JSON.stringify(data)); }
  function resetData() { removeLS(STORE_KEY); }
  function hasLocalEdits() { return !!readLS(STORE_KEY); }

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

  const ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    email: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
  };
  const icon = (name) => `<span class="icon" aria-hidden="true">${ICONS[name] || ""}</span>`;

  function socialLinks(socials, email) {
    const items = Object.entries(socials || {}).filter(([, url]) => url)
      .map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(k)}" class="social">${icon(k)}</a>`);
    if (email) items.push(`<a href="mailto:${esc(email)}" aria-label="Email" class="social">${icon("email")}</a>`);
    return items.join("");
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
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="container nav-wrap">
        <a class="brand" href="index.html">
          <img src="${esc(s.logo)}" alt="${esc(s.clubName)} logo" class="brand-logo">
          <span class="brand-text"><strong>${esc(s.clubName)}</strong><small>${esc(s.institute)}</small></span>
        </a>
        <nav class="nav" id="site-nav" aria-label="Main">
          ${NAV.map((n) => `<a href="${n.href}" class="${page === n.href ? "active" : ""}">${n.label}</a>`).join("")}
        </nav>
        <div class="nav-actions">
          <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme"></button>
          <a class="btn btn-sm btn-primary hide-sm" href="${esc(s.joinLink)}" target="_blank" rel="noopener">Join us</a>
          <button class="icon-btn menu-btn" id="menu-toggle" aria-label="Open menu" aria-expanded="false">${icon("menu")}</button>
        </div>
      </div>`;
    document.body.prepend(header);

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-grid">
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
      <div class="container footer-bottom">
        <span>&copy; ${new Date().getFullYear()} ${esc(s.clubName)}, ${esc(s.institute)}. All rights reserved.</span>
        <a href="#top" class="muted">Back to top &uarr;</a>
      </div>`;
    document.body.append(footer);
    document.body.id = "top";

    // theme toggle
    const tbtn = document.getElementById("theme-toggle");
    const paintToggle = () => { tbtn.innerHTML = icon(currentTheme() === "dark" ? "sun" : "moon"); };
    paintToggle();
    tbtn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next); writeLS(THEME_KEY, next); paintToggle();
      document.dispatchEvent(new CustomEvent("themechange"));
    });

    // mobile menu
    const mbtn = document.getElementById("menu-toggle");
    const nav = document.getElementById("site-nav");
    mbtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      mbtn.setAttribute("aria-expanded", open);
      mbtn.innerHTML = icon(open ? "close" : "menu");
    });

    // header shadow on scroll
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---------- reveal on scroll ----------
  function observeReveal(root) {
    const els = (root || document).querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  // ---------- animated counters ----------
  function animateCount(el, target) {
    const dur = 1200, start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-IN");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function observeCounters(root) {
    (root || document).querySelectorAll("[data-count]").forEach((el) => {
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
    document.body.classList.remove("no-scroll");
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2400);
  }

  // ---------- neural-network background canvas ----------
  function neuralCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    resize(); frame();
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); frame(); });
    canvas.parentElement.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("mouseleave", () => { mouse.x = mouse.y = -999; });
  }

  // ---------- filter chips ----------
  // Renders a chip row into `el`; calls onChange(value) when one is picked.
  function chips(el, values, onChange, initial) {
    let active = initial || values[0];
    const paint = () => {
      el.innerHTML = values.map((v) => `<button type="button" class="chip ${v === active ? "active" : ""}" data-v="${esc(v)}">${esc(v)}</button>`).join("");
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
    getData, saveData, resetData, hasLocalEdits, esc, fmtDate, parseDate, isUpcoming, today,
    avatar, initials, uid, icon, socialLinks, observeReveal, observeCounters,
    openModal, closeModal, toast, neuralCanvas, clone, chips, unique
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.hasAttribute("data-no-layout")) renderLayout();
    document.dispatchEvent(new CustomEvent("site:ready"));
    observeReveal();
    observeCounters();
  });
})();
