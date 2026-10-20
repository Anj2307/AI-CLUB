document.addEventListener("site:ready", () => {
  const { getData, esc, icon, isUpcoming, neuralCanvas, avatar, reduceMotion, observeReveal } = window.Site;
  const { projectCard, eventCard, newsCard, bindCardClicks, byDateAsc, byDateDesc } = window.Cards;
  const data = getData();
  const s = data.settings;

  document.getElementById("hero-club").textContent = s.clubName;
  document.getElementById("hero-inst").textContent = s.institute;
  document.getElementById("hero-tagline").textContent = s.tagline;
  document.getElementById("hero-logo").src = s.logo;
  document.getElementById("about-text").textContent = s.about;
  document.getElementById("hero-members").textContent = `${Number(s.stats.members) || 0}+`;
  document.getElementById("hero-avatars").innerHTML = data.people.slice(0, 5).map((p) => avatar(p, "avatar-sm")).join("");
  neuralCanvas(document.getElementById("net"));

  // typewriter
  const words = ["machine learning", "computer vision", "language models", "robotics", "reinforcement learning", "generative AI"];
  const typed = document.getElementById("typed");
  if (!reduceMotion()) {
    let wi = 0, ci = words[0].length, deleting = true;
    const tick = () => {
      const w = words[wi];
      ci += deleting ? -1 : 1;
      typed.textContent = w.slice(0, ci);
      let delay = deleting ? 40 : 80;
      if (!deleting && ci === w.length) { deleting = true; delay = 1900; }
      else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2200);
  }

  // topic ticker: two rows scrolling in opposite directions, duplicated for a seamless loop
  const topics = ["Machine Learning", "Computer Vision", "Large Language Models", "Robotics", "Reinforcement Learning", "Generative AI", "MLOps", "Responsible AI"];
  const row = (list) => list.map((t, i) => `<span class="${i % 2 ? "outline" : ""}">${esc(t)}</span>${icon("sparkle")}`).join("");
  document.getElementById("ticker-1").innerHTML = row(topics).repeat(2);
  document.getElementById("ticker-2").innerHTML = row(topics.slice().reverse()).repeat(2);

  const stats = [["members", "Active members"], ["projects", "Projects built"], ["events", "Events hosted"], ["workshops", "Workshops run"]];
  document.getElementById("stats").innerHTML = stats.map(([k, label], i) => `
    <div class="stat reveal d${i % 4}"><div class="stat-num" data-count="${Number(s.stats[k]) || 0}">0</div><div class="stat-label">${label}</div></div>`).join("");

  document.getElementById("home-projects").innerHTML = data.projects.slice(0, 3).map(projectCard).join("");

  const upcoming = data.events.filter(isUpcoming).sort(byDateAsc);
  const events = upcoming.length ? upcoming.slice(0, 3) : data.events.slice().sort(byDateDesc).slice(0, 3);
  document.getElementById("home-events").innerHTML = events.map(eventCard).join("") || '<div class="empty">No events yet.</div>';

  document.getElementById("home-news").innerHTML = data.news.slice().sort(byDateDesc).slice(0, 3).map(newsCard).join("");

  const logos = data.sponsors.map((sp) => `<a href="${esc(sp.url)}" target="_blank" rel="noopener" title="${esc(sp.name)}"><img src="${esc(sp.logo)}" alt="${esc(sp.name)}"></a>`).join("");
  document.getElementById("sponsors").innerHTML = logos + logos;

  if (upcoming.length) {
    document.getElementById("hero-pill").textContent = upcoming[0].title;
    document.getElementById("hero-announce").href = `events.html#${upcoming[0].id}`;
  }

  observeReveal();
  bindCardClicks(data);
});
