document.addEventListener("site:ready", () => {
  const { getData, esc, avatar, icon, chips, unique, observeReveal } = window.Site;
  const people = getData().people;

  function socials(p) {
    return [
      p.linkedin ? `<a class="social" href="${esc(p.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${icon("linkedin")}</a>` : "",
      p.github ? `<a class="social" href="${esc(p.github)}" target="_blank" rel="noopener" aria-label="GitHub">${icon("github")}</a>` : "",
      p.email ? `<a class="social" href="mailto:${esc(p.email)}" aria-label="Email">${icon("email")}</a>` : ""
    ].join("");
  }

  // Faculty get a featured, wider card above the team grid.
  const faculty = people.filter((p) => p.team === "Faculty");
  document.getElementById("faculty").innerHTML = faculty.length ? `
    <div class="grid grid-2" style="margin-bottom:48px">
      ${faculty.map((p) => `
        <div class="card featured-person reveal">
          ${avatar(p)}
          <div>
            <div class="eyebrow" style="margin-bottom:6px">${esc(p.role)}</div>
            <h3 style="font-size:1.5rem">${esc(p.name)}</h3>
            <p class="muted">${esc(p.bio)}</p>
            <div class="socials">${socials(p)}</div>
          </div>
        </div>`).join("")}
    </div>` : "";

  const members = people.filter((p) => p.team !== "Faculty");
  const order = ["Core", "Tech", "Research", "Events", "Design"];
  const rank = (t) => (order.includes(t) ? order.indexOf(t) : order.length);
  const teams = unique(members.map((p) => p.team)).sort((a, b) => rank(a) - rank(b));
  const grid = document.getElementById("people-grid");
  const search = document.getElementById("people-search");
  let team = "All";

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = members.filter((p) => (team === "All" || p.team === team) &&
      (!q || (p.name + " " + p.role + " " + p.year).toLowerCase().includes(q)));
    grid.innerHTML = list.map((p, i) => `
      <div class="card person hoverable reveal d${i % 3}">
        ${avatar(p)}
        <h3>${esc(p.name)}</h3>
        <div class="person-role">${esc(p.role)}</div>
        <div class="person-year">${esc(p.year)}</div>
        <p class="small" style="margin-top:10px">${esc(p.bio)}</p>
        <div class="socials">${socials(p)}</div>
      </div>`).join("") || '<div class="empty" style="grid-column:1/-1">No one matches that search.</div>';
    observeReveal(grid);
  }
  chips(document.getElementById("team-filter"), ["All", ...teams], (v) => { team = v; render(); });
  search.addEventListener("input", render);
  render();
});
