document.addEventListener("site:ready", () => {
  const { getData, esc, fmtDate, parseDate, isUpcoming, avatar, chips, unique, icon } = window.Site;
  const { bindCardClicks, byDateAsc, byDateDesc } = window.Cards;
  const data = getData();
  const s = data.settings;

  // ---------- KPI tiles ----------
  const upcoming = data.events.filter(isUpcoming).sort(byDateAsc);
  const kpi = (id, ic, val, label, sub) => {
    document.getElementById(id).innerHTML = `
      <div class="kpi"><div class="kpi-icon">${icon(ic)}</div>
        <div><div class="kpi-val" data-count="${val}">0</div><div class="kpi-label">${label}</div></div></div>
      <div class="kpi-sub">${sub}</div>`;
  };
  kpi("kpi-members", "users", Number(s.stats.members) || 0, "Members", `${data.people.length} listed on the People page`);
  kpi("kpi-projects", "rocket", data.projects.length, "Projects", `${data.projects.filter((p) => p.status === "Ongoing").length} in progress`);
  kpi("kpi-events", "calendar", data.events.length, "Events", `${upcoming.length} upcoming`);
  kpi("kpi-photos", "image", data.gallery.length, "Photos", `${unique(data.gallery.map((g) => g.album)).length} albums`);

  // ---------- events per month (single-series bar chart) ----------
  const chartEl = document.getElementById("events-chart");
  function monthBuckets(n) {
    const now = new Date();
    const out = [];
    // window ends 2 months ahead so scheduled events are visible
    for (let i = n - 3; i >= -2; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("en-IN", { month: "short" }), full: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), count: 0, titles: [] });
    }
    data.events.forEach((e) => {
      const d = parseDate(e.date);
      const b = out.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (b) { b.count++; b.titles.push(e.title); }
    });
    return out;
  }

  function drawChart(n) {
    const buckets = monthBuckets(n);
    const W = 640, H = 230, padL = 28, padB = 26, padT = 18;
    const max = Math.max(2, ...buckets.map((b) => b.count));
    const step = (W - padL) / buckets.length;
    const bw = Math.min(34, step * 0.56);
    const y = (v) => H - padB - (v / max) * (H - padB - padT);
    const ticks = [];
    for (let t = 0; t <= max; t += Math.ceil(max / 4)) ticks.push(t);

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of events per month">`;
    ticks.forEach((t) => {
      svg += `<line class="grid-line" x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-label" x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
    });
    buckets.forEach((b, i) => {
      const cx = padL + step * i + step / 2;
      const top = y(b.count), base = H - padB, x = cx - bw / 2, r = Math.min(4, base - top);
      // rounded data-end, square baseline
      const path = b.count ? `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z` : "";
      svg += `<rect class="bar-hit" x="${padL + step * i}" y="${padT}" width="${step}" height="${H - padT - padB}" data-i="${i}"/>`;
      svg += path ? `<path class="bar" d="${path}"/>` : "";
      if (b.count) svg += `<text class="val-label" x="${cx}" y="${top - 6}" text-anchor="middle">${b.count}</text>`;
      svg += `<text class="axis-label" x="${cx}" y="${H - 8}" text-anchor="middle">${b.label}</text>`;
    });
    svg += `<line x1="${padL}" x2="${W}" y1="${H - padB}" y2="${H - padB}" stroke="var(--border-strong)"/></svg>`;
    chartEl.innerHTML = svg + '<div class="chart-tip" id="tip"></div>';
    document.getElementById("events-range").textContent = `${buckets[0].full} - ${buckets[buckets.length - 1].full}`;

    const tip = document.getElementById("tip");
    chartEl.querySelectorAll(".bar-hit").forEach((hit) => {
      hit.addEventListener("mouseenter", () => {
        const b = buckets[hit.dataset.i];
        const box = chartEl.getBoundingClientRect(), hb = hit.getBoundingClientRect();
        tip.innerHTML = `<b>${b.count} event${b.count === 1 ? "" : "s"}</b><span class="muted">${esc(b.full)}</span>${b.titles.length ? "<br>" + b.titles.map(esc).join("<br>") : ""}`;
        tip.style.left = hb.left - box.left + hb.width / 2 + "px";
        tip.style.top = Math.max(0, y(b.count) / H * box.height) + "px";
        tip.classList.add("show");
      });
      hit.addEventListener("mouseleave", () => tip.classList.remove("show"));
    });

    document.getElementById("events-table").innerHTML = `<table><thead><tr><th>Month</th><th>Events</th></tr></thead><tbody>${buckets.map((b) => `<tr><td>${esc(b.full)}</td><td>${b.count}</td></tr>`).join("")}</tbody></table>`;
  }
  chips(document.getElementById("range-filter"), ["6M", "12M"], (v) => drawChart(v === "6M" ? 6 : 12), "12M");
  drawChart(12);

  // ---------- project status ring ----------
  const total = data.projects.length || 1;
  const counts = ["Completed", "Ongoing", "Planned"].map((st) => [st, data.projects.filter((p) => p.status === st).length]);
  const pct = Math.round((counts[0][1] / total) * 100);
  const ring = document.getElementById("ring");
  ring.style.setProperty("--p", pct);
  ring.dataset.label = pct + "%";
  ring.setAttribute("role", "img");
  ring.setAttribute("aria-label", `${pct}% of projects completed`);
  const tagFor = { Completed: "good", Ongoing: "cyan", Planned: "warn" };
  document.getElementById("status-list").innerHTML = `<p class="small muted" style="margin-bottom:10px">of projects completed</p>` +
    counts.map(([st, c]) => `<div style="display:flex;justify-content:space-between;padding:6px 0"><span class="tag ${tagFor[st]} status-dot">${st}</span><b>${c}</b></div>`).join("");

  // ---------- horizontal bars ----------
  function hbars(el, entries) {
    const max = Math.max(1, ...entries.map((e) => e[1]));
    el.innerHTML = entries.map(([k, v]) => `
      <div class="hbar"><span>${esc(k)}</span><div class="hbar-track"><div class="hbar-fill" style="width:${(v / max) * 100}%"></div></div><span>${v}</span></div>`).join("");
  }
  const countBy = (arr, key) => unique(arr.map((x) => x[key])).map((k) => [k, arr.filter((x) => x[key] === k).length]).sort((a, b) => b[1] - a[1]);
  hbars(document.getElementById("domain-bars"), countBy(data.projects, "domain"));
  hbars(document.getElementById("team-bars"), countBy(data.people, "team"));

  // ---------- lists ----------
  const dateBox = (d) => { const x = parseDate(d); return `<div class="date-box"><b>${x.getDate()}</b><small>${x.toLocaleDateString("en-IN", { month: "short" })}</small></div>`; };
  document.getElementById("upcoming-list").innerHTML = upcoming.slice(0, 5).map((e) => `
    <li data-event="${esc(e.id)}" style="cursor:pointer" tabindex="0">${dateBox(e.date)}<div class="grow"><b>${esc(e.title)}</b><small>${esc(e.time)} &middot; ${esc(e.venue)}</small></div><span class="tag primary">${esc(e.type)}</span></li>`).join("")
    || '<li class="muted">No upcoming events scheduled.</li>';

  document.getElementById("news-list").innerHTML = data.news.slice().sort(byDateDesc).slice(0, 4).map((n) => `
    <li data-news="${esc(n.id)}" style="cursor:pointer" tabindex="0"><img class="thumb" src="${esc(n.image)}" alt=""><div class="grow"><b>${esc(n.title)}</b><small>${fmtDate(n.date)} &middot; ${esc(n.category)}</small></div></li>`).join("");

  document.getElementById("core-list").innerHTML = data.people.filter((p) => p.team === "Core" || p.team === "Faculty").slice(0, 5).map((p) => `
    <li>${avatar(p, "avatar-sm")}<div class="grow"><b>${esc(p.name)}</b><small>${esc(p.role)}</small></div></li>`).join("");

  // timeline mixes recent past events and news
  const items = [
    ...data.events.filter((e) => !isUpcoming(e)).map((e) => ({ date: e.date, title: e.title, kind: e.type })),
    ...data.news.map((n) => ({ date: n.date, title: n.title, kind: n.category }))
  ].sort(byDateDesc).slice(0, 6);
  document.getElementById("timeline").innerHTML = items.map((it) => `
    <div class="tl-item"><span class="muted small">${fmtDate(it.date)}</span><h4>${esc(it.title)}</h4><span class="tag">${esc(it.kind)}</span></div>`).join("");

  bindCardClicks(data);
});
