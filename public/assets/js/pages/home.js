document.addEventListener("site:ready", () => {
  const { getData, esc, isUpcoming, neuralCanvas } = window.Site;
  const { projectCard, eventCard, newsCard, bindCardClicks, byDateAsc, byDateDesc } = window.Cards;
  const data = getData();
  const s = data.settings;

  document.getElementById("hero-club").textContent = s.clubName;
  document.getElementById("hero-inst").textContent = s.institute;
  document.getElementById("hero-tagline").textContent = s.tagline;
  document.getElementById("hero-logo").src = s.logo;
  document.getElementById("about-text").textContent = s.about;
  document.getElementById("cta-join").href = s.joinLink;
  neuralCanvas(document.getElementById("net"));

  // typewriter
  const words = ["machine learning", "computer vision", "language models", "robotics", "reinforcement learning", "generative AI"];
  const typed = document.getElementById("typed");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let wi = 0, ci = words[0].length, deleting = true;
    const tick = () => {
      const w = words[wi];
      ci += deleting ? -1 : 1;
      typed.textContent = w.slice(0, ci);
      let delay = deleting ? 45 : 85;
      if (!deleting && ci === w.length) { deleting = true; delay = 1800; }
      else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2000);
  }

  const stats = [
    ["members", "Active members"], ["projects", "Projects built"], ["events", "Events hosted"], ["workshops", "Workshops run"]
  ];
  document.getElementById("stats").innerHTML = stats.map(([k, label], i) => `
    <div class="stat reveal d${i % 3}"><div class="stat-num" data-count="${Number(s.stats[k]) || 0}">0</div><div class="stat-label">${label}</div></div>`).join("");

  document.getElementById("home-projects").innerHTML = data.projects.slice(0, 3).map(projectCard).join("");

  const upcoming = data.events.filter(isUpcoming).sort(byDateAsc);
  const events = upcoming.length ? upcoming.slice(0, 3) : data.events.slice().sort(byDateDesc).slice(0, 3);
  document.getElementById("home-events").innerHTML = events.map(eventCard).join("") || '<div class="empty">No events yet.</div>';

  document.getElementById("home-news").innerHTML = data.news.slice().sort(byDateDesc).slice(0, 3).map(newsCard).join("");

  const logos = data.sponsors.map((sp) => `<a href="${esc(sp.url)}" target="_blank" rel="noopener" title="${esc(sp.name)}"><img src="${esc(sp.logo)}" alt="${esc(sp.name)}"></a>`).join("");
  document.getElementById("sponsors").innerHTML = logos + logos; // duplicated for a seamless loop

  if (upcoming.length) document.getElementById("hero-pill").textContent = "Next up: " + upcoming[0].title;

  bindCardClicks(data);
});
