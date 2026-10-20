document.addEventListener("site:ready", () => {
  const { getData, esc, fmtDate, chips, unique, observeReveal } = window.Site;
  const { newsCard, bindCardClicks, byDateDesc } = window.Cards;
  const data = getData();
  const news = data.news.slice().sort(byDateDesc);

  const top = news[0];
  if (top) {
    document.getElementById("news-featured").innerHTML = `
      <article class="card news-featured hoverable reveal" data-news="${esc(top.id)}" tabindex="0" role="button">
        <div class="card-media"><img src="${esc(top.image)}" alt=""></div>
        <div class="card-body">
          <div class="tags"><span class="tag cyan">${esc(top.category)}</span><span class="tag">${fmtDate(top.date)}</span></div>
          <h2 style="margin-top:14px">${esc(top.title)}</h2>
          <p class="muted">${esc(top.summary)}</p>
          <span class="person-role">Read the story &rarr;</span>
        </div>
      </article>`;
  }

  const grid = document.getElementById("news-grid");
  const search = document.getElementById("news-search");
  let cat = "All";
  function render() {
    const q = search.value.trim().toLowerCase();
    const base = cat === "All" && !q ? news.slice(1) : news; // featured story shown above
    const list = base.filter((n) => (cat === "All" || n.category === cat) &&
      (!q || (n.title + " " + n.summary).toLowerCase().includes(q)));
    grid.innerHTML = list.map(newsCard).join("") || '<div class="empty" style="grid-column:1/-1">No stories match.</div>';
    observeReveal(grid);
  }
  chips(document.getElementById("cat-filter"), ["All", ...unique(news.map((n) => n.category))], (v) => { cat = v; render(); });
  search.addEventListener("input", render);
  render();
  bindCardClicks(data);
});
