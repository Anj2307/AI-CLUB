document.addEventListener("site:ready", () => {
  const { getData, chips, unique, observeReveal } = window.Site;
  const { projectCard, bindCardClicks } = window.Cards;
  const data = getData();
  const grid = document.getElementById("projects-grid");
  let domain = "All domains", status = "Any status";

  function render() {
    const list = data.projects.filter((p) =>
      (domain === "All domains" || p.domain === domain) && (status === "Any status" || p.status === status));
    grid.innerHTML = list.map(projectCard).join("") || '<div class="empty" style="grid-column:1/-1">No projects match these filters.</div>';
    observeReveal(grid);
  }
  chips(document.getElementById("domain-filter"), ["All domains", ...unique(data.projects.map((p) => p.domain))], (v) => { domain = v; render(); });
  chips(document.getElementById("status-filter"), ["Any status", "Ongoing", "Completed", "Planned"], (v) => { status = v; render(); });
  render();
  bindCardClicks(data);
});
