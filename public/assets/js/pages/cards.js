/* Card renderers and detail modals shared by the home, projects, events and news pages. */
(function () {
  "use strict";
  const { esc, fmtDate, parseDate, isUpcoming, icon, openModal } = window.Site;

  const STATUS_TAG = { Ongoing: "cyan", Completed: "good", Planned: "warn" };

  function projectCard(p, i) {
    return `
      <article class="card hoverable reveal d${(i || 0) % 3}" data-project="${esc(p.id)}" data-tilt="5" tabindex="0" role="button" aria-label="Open ${esc(p.title)}">
        <span class="tag ${STATUS_TAG[p.status] || ""} status-dot badge-float">${esc(p.status)}</span>
        <div class="card-media"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></div>
        <div class="card-body">
          <span class="tag primary">${esc(p.domain)}</span>
          <h3 style="margin-top:12px">${esc(p.title)}</h3>
          <p>${esc(p.description)}</p>
          <div class="tags">${(p.tech || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </article>`;
  }

  function projectModal(p) {
    const links = [
      p.github ? `<a class="btn btn-sm" href="${esc(p.github)}" target="_blank" rel="noopener">${icon("github")} Code</a>` : "",
      p.demo ? `<a class="btn btn-sm btn-primary" href="${esc(p.demo)}" target="_blank" rel="noopener">${icon("link")} Live demo</a>` : ""
    ].join("");
    openModal(`
      <img class="article-img" src="${esc(p.image)}" alt="">
      <div class="tags"><span class="tag primary">${esc(p.domain)}</span><span class="tag ${STATUS_TAG[p.status] || ""} status-dot">${esc(p.status)}</span><span class="tag">${esc(p.year)}</span></div>
      <h2 style="margin-top:14px">${esc(p.title)}</h2>
      <p class="article-body">${esc(p.description)}</p>
      <h4>Tech stack</h4>
      <div class="tags" style="margin-bottom:16px">${(p.tech || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <h4>Team</h4>
      <p class="muted">${(p.team || []).map(esc).join(", ") || "-"}</p>
      <div class="hero-cta" style="margin-top:12px">${links}</div>`);
  }

  function eventCard(e, i) {
    const d = parseDate(e.date);
    const upcoming = isUpcoming(e);
    return `
      <article class="card hoverable reveal d${(i || 0) % 3}" data-event="${esc(e.id)}" data-tilt="5" tabindex="0" role="button" aria-label="Open ${esc(e.title)}">
        <div class="event-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-IN", { month: "short" })} ${d.getFullYear()}</small></div>
        <div class="card-media"><img src="${esc(e.image)}" alt="${esc(e.title)}" loading="lazy"></div>
        <div class="card-body">
          <div class="tags"><span class="tag primary">${esc(e.type)}</span>${upcoming ? '<span class="tag good status-dot">Upcoming</span>' : '<span class="tag">Past</span>'}</div>
          <h3 style="margin-top:12px">${esc(e.title)}</h3>
          <div class="meta"><span>${icon("clock")} ${esc(e.time)}</span><span>${icon("pin")} ${esc(e.venue)}</span></div>
          <p>${esc(e.description)}</p>
        </div>
      </article>`;
  }

  function eventModal(e) {
    const upcoming = isUpcoming(e);
    openModal(`
      <img class="article-img" src="${esc(e.image)}" alt="">
      <div class="tags"><span class="tag primary">${esc(e.type)}</span>${upcoming ? '<span class="tag good status-dot">Upcoming</span>' : '<span class="tag">Past event</span>'}</div>
      <h2 style="margin-top:14px">${esc(e.title)}</h2>
      <div class="meta"><span>${icon("calendar")} ${fmtDate(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span>${icon("clock")} ${esc(e.time)}</span><span>${icon("pin")} ${esc(e.venue)}</span></div>
      <p class="article-body">${esc(e.description)}</p>
      ${upcoming && e.registerLink ? `<a class="btn btn-primary" href="${esc(e.registerLink)}" target="_blank" rel="noopener">Register now ${icon("arrow")}</a>` : ""}`);
  }

  function newsCard(n, i) {
    return `
      <article class="card hoverable reveal d${(i || 0) % 3}" data-news="${esc(n.id)}" data-tilt="5" tabindex="0" role="button" aria-label="Read ${esc(n.title)}">
        <div class="card-media"><img src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy"></div>
        <div class="card-body">
          <div class="tags"><span class="tag cyan">${esc(n.category)}</span><span class="tag">${fmtDate(n.date)}</span></div>
          <h3 style="margin-top:12px">${esc(n.title)}</h3>
          <p>${esc(n.summary)}</p>
          <span class="read-more">Read story ${icon("arrow")}</span>
        </div>
      </article>`;
  }

  function newsModal(n) {
    openModal(`
      <img class="article-img" src="${esc(n.image)}" alt="">
      <div class="tags"><span class="tag cyan">${esc(n.category)}</span><span class="tag">${fmtDate(n.date, { day: "numeric", month: "long", year: "numeric" })}</span></div>
      <h2 style="margin-top:14px">${esc(n.title)}</h2>
      <div class="article-body">${String(n.content || n.summary).split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}</div>`);
  }

  // One delegated handler opens the right modal for any card on the page.
  function bindCardClicks(data) {
    const open = (el) => {
      if (el.dataset.project) { const p = data.projects.find((x) => x.id === el.dataset.project); if (p) projectModal(p); }
      else if (el.dataset.event) { const e = data.events.find((x) => x.id === el.dataset.event); if (e) eventModal(e); }
      else if (el.dataset.news) { const n = data.news.find((x) => x.id === el.dataset.news); if (n) newsModal(n); }
    };
    const sel = "[data-project],[data-event],[data-news]";
    document.addEventListener("click", (ev) => {
      const el = ev.target.closest(sel);
      if (el && !ev.target.closest("a")) open(el);
    });
    document.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches(sel)) { ev.preventDefault(); open(ev.target); }
    });

    // Deep links (projects.html#<id>) open that item - used by search and shared links.
    const openFromHash = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      if (data.projects.some((x) => x.id === id)) projectModal(data.projects.find((x) => x.id === id));
      else if (data.events.some((x) => x.id === id)) eventModal(data.events.find((x) => x.id === id));
      else if (data.news.some((x) => x.id === id)) newsModal(data.news.find((x) => x.id === id));
    };
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  }

  const byDateAsc = (a, b) => parseDate(a.date) - parseDate(b.date);
  const byDateDesc = (a, b) => parseDate(b.date) - parseDate(a.date);

  window.Cards = { projectCard, eventCard, newsCard, projectModal, eventModal, newsModal, bindCardClicks, byDateAsc, byDateDesc, STATUS_TAG };
})();
