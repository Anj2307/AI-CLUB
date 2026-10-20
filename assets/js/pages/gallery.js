document.addEventListener("site:ready", () => {
  const { getData, esc, chips, unique, openModal, observeReveal } = window.Site;
  const photos = getData().gallery;
  const grid = document.getElementById("gallery-grid");
  let album = "All", list = photos;

  function render() {
    list = photos.filter((p) => album === "All" || p.album === album);
    grid.innerHTML = list.map((p, i) => `
      <figure class="reveal" tabindex="0" data-i="${i}">
        <img src="${esc(p.src)}" alt="${esc(p.caption)}" loading="lazy">
        <figcaption>${esc(p.caption)}</figcaption>
      </figure>`).join("") || '<div class="empty">No photos in this album yet.</div>';
    document.getElementById("photo-count").textContent = `${list.length} photo${list.length === 1 ? "" : "s"}`;
    observeReveal(grid);
  }

  function lightbox(i) {
    const p = list[i];
    const m = openModal(`
      <img class="lightbox-img" src="${esc(p.src)}" alt="${esc(p.caption)}">
      <div class="lightbox-nav">
        <button class="btn btn-sm" data-step="-1" aria-label="Previous photo">&larr; Prev</button>
        <div class="center"><b>${esc(p.caption)}</b><div class="muted small">${esc(p.album)} &middot; ${i + 1} / ${list.length}</div></div>
        <button class="btn btn-sm" data-step="1" aria-label="Next photo">Next &rarr;</button>
      </div>`, { wide: true });
    m.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => lightbox((i + Number(b.dataset.step) + list.length) % list.length)));
    m.dataset.i = i;
  }

  grid.addEventListener("click", (e) => { const f = e.target.closest("figure"); if (f) lightbox(Number(f.dataset.i)); });
  grid.addEventListener("keydown", (e) => { const f = e.target.closest("figure"); if (f && e.key === "Enter") lightbox(Number(f.dataset.i)); });
  document.addEventListener("keydown", (e) => {
    const m = document.querySelector(".modal");
    if (!m || m.dataset.i == null) return;
    if (e.key === "ArrowRight") lightbox((Number(m.dataset.i) + 1) % list.length);
    if (e.key === "ArrowLeft") lightbox((Number(m.dataset.i) - 1 + list.length) % list.length);
  });

  chips(document.getElementById("album-filter"), ["All", ...unique(photos.map((p) => p.album))], (v) => { album = v; render(); });
  render();
});
