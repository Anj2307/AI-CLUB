document.addEventListener("site:ready", () => {
  const { getData, esc, fmtDate, parseDate, isUpcoming, icon, chips, unique, observeReveal } = window.Site;
  const { bindCardClicks, byDateAsc, byDateDesc } = window.Cards;
  const data = getData();

  // Spotlight the next upcoming event with a live countdown.
  const next = data.events.filter(isUpcoming).sort(byDateAsc)[0];
  const spot = document.getElementById("spotlight");
  if (next) {
    spot.innerHTML = `
      <div class="card spotlight reveal">
        <div class="card-media"><img src="${esc(next.image)}" alt="${esc(next.title)}"></div>
        <div class="card-body">
          <div class="eyebrow">Next event</div>
          <h2>${esc(next.title)}</h2>
          <div class="meta"><span>${icon("calendar")} ${fmtDate(next.date, { weekday: "short", day: "numeric", month: "long" })}</span><span>${icon("clock")} ${esc(next.time)}</span><span>${icon("pin")} ${esc(next.venue)}</span></div>
          <div class="countdown" id="countdown" aria-live="off"></div>
          <div class="hero-cta" style="margin-top:0">
            ${next.registerLink ? `<a class="btn btn-primary" href="${esc(next.registerLink)}" target="_blank" rel="noopener">Register ${icon("arrow")}</a>` : ""}
            <button class="btn" type="button" data-event="${esc(next.id)}">Details</button>
          </div>
        </div>
      </div>`;
    const target = new Date(next.date + "T" + (next.time || "00:00") + ":00");
    const cd = document.getElementById("countdown");
    const tick = () => {
      let s = Math.max(0, Math.floor((target - new Date()) / 1000));
      const parts = [["Days", Math.floor(s / 86400)], ["Hours", Math.floor((s %= 86400) / 3600)], ["Mins", Math.floor((s %= 3600) / 60)], ["Secs", s % 60]];
      cd.innerHTML = parts.map(([l, v]) => `<div><b>${String(v).padStart(2, "0")}</b><small>${l}</small></div>`).join("");
    };
    tick(); setInterval(tick, 1000);
  }

  const grid = document.getElementById("events-grid");
  let when = "Upcoming", type = "All types";

  function card(e, i) {
    const d = parseDate(e.date);
    return `
      <article class="card event-card hoverable reveal d${i % 3}" data-event="${esc(e.id)}" data-tilt="3" tabindex="0" role="button" aria-label="Open ${esc(e.title)}">
        <div class="card-media" style="position:relative">
          <div class="event-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-IN", { month: "short" })}</small></div>
          <img src="${esc(e.image)}" alt="" loading="lazy">
        </div>
        <div class="card-body">
          <div class="tags"><span class="tag primary">${esc(e.type)}</span>${isUpcoming(e) ? '<span class="tag good status-dot">Upcoming</span>' : '<span class="tag">Past</span>'}</div>
          <h3 style="margin-top:10px">${esc(e.title)}</h3>
          <div class="meta"><span>${icon("clock")} ${esc(e.time)}</span><span>${icon("pin")} ${esc(e.venue)}</span></div>
          <p>${esc(e.description)}</p>
        </div>
      </article>`;
  }

  function render() {
    let list = data.events.filter((e) => type === "All types" || e.type === type);
    if (when === "Upcoming") list = list.filter(isUpcoming).sort(byDateAsc);
    else if (when === "Past") list = list.filter((e) => !isUpcoming(e)).sort(byDateDesc);
    else list = list.sort(byDateDesc);
    grid.innerHTML = list.map(card).join("") || `<div class="empty" style="grid-column:1/-1">No ${when.toLowerCase()} events here yet - check back soon!</div>`;
    observeReveal(grid);
  }
  chips(document.getElementById("when-filter"), ["Upcoming", "Past", "All"], (v) => { when = v; render(); });
  chips(document.getElementById("type-filter"), ["All types", ...unique(data.events.map((e) => e.type))], (v) => { type = v; render(); });
  render();
  bindCardClicks(data);
});
