document.addEventListener("site:ready", () => {
  const { getData, esc, icon, isUpcoming, reduceMotion, scramble, observeReveal } = window.Site;
  const { projectCard, eventCard, newsCard, bindCardClicks, byDateAsc, byDateDesc } = window.Cards;
  const data = getData();
  const s = data.settings;
  const still = reduceMotion();

  // ---------- hero copy ----------
  const words = String(s.clubName || "Hardly Human").trim().split(/\s+/);
  const w1 = document.getElementById("hh-word-1"), w2 = document.getElementById("hh-word-2");
  w1.textContent = words[0];
  w2.textContent = words.slice(1).join(" ") || "";
  document.getElementById("hh-title").setAttribute("aria-label", s.clubName);
  document.getElementById("hh-kicker").textContent = `AI CLUB · ${String(s.institute || "").toUpperCase()}`;
  document.getElementById("hh-members").textContent = Number(s.stats.members) || 0;
  document.getElementById("hh-version").textContent = new Date().getFullYear();

  // "Human" decodes once after the title rises in, and glitches again on hover.
  const finalW2 = w2.textContent;
  w2.style.display = "inline-block";
  const lockWidth = () => { w2.style.width = ""; w2.style.width = w2.getBoundingClientRect().width + "px"; };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(lockWidth);
  window.addEventListener("resize", lockWidth);
  setTimeout(() => scramble(w2, finalW2, { duration: 1100 }), 900);
  document.getElementById("hh-title").addEventListener("mouseenter", () => scramble(w2, finalW2, { duration: 600 }));

  // live readouts in the status bar
  const topics = ["machine learning", "computer vision", "language models", "robotics", "reinforcement learning", "generative AI", "responsible AI"];
  const states = ["learning", "training", "thinking", "shipping"];
  const trainingEl = document.getElementById("hh-training"), stateEl = document.getElementById("hh-state");
  if (!still) {
    let ti = 0;
    setInterval(() => {
      ti++;
      scramble(trainingEl, topics[ti % topics.length], { duration: 600 });
      if (ti % 2 === 0) scramble(stateEl, states[(ti / 2) % states.length], { duration: 500 });
    }, 2600);
  }

  // ---------- particle portrait ----------
  initPortrait(document.getElementById("portrait"), document.getElementById("portrait-canvas"), still);

  // ---------- manifesto: words light up as you scroll ----------
  initManifesto(document.getElementById("manifesto-text"), still);

  // ---------- topic ticker ----------
  const tickerTopics = ["Machine Learning", "Computer Vision", "Large Language Models", "Robotics", "Reinforcement Learning", "Generative AI", "MLOps", "Responsible AI"];
  const row = (list) => list.map((t, i) => `<span class="${i % 2 ? "outline" : ""}">${esc(t)}</span>${icon("sparkle")}`).join("");
  document.getElementById("ticker-1").innerHTML = row(tickerTopics).repeat(2);
  document.getElementById("ticker-2").innerHTML = row(tickerTopics.slice().reverse()).repeat(2);

  // ---------- about + stats ----------
  document.getElementById("about-text").textContent = s.about;
  const stats = [["members", "Active members"], ["projects", "Projects built"], ["events", "Events hosted"], ["workshops", "Workshops run"]];
  document.getElementById("stats").innerHTML = stats.map(([k, label], i) => `
    <div class="stat reveal d${i % 4}"><div class="stat-num" data-count="${Number(s.stats[k]) || 0}">0</div><div class="stat-label">${label}</div></div>`).join("");

  // ---------- Turing test ----------
  initTuring();

  // ---------- content sections ----------
  document.getElementById("home-projects").innerHTML = data.projects.slice(0, 3).map(projectCard).join("");
  const upcoming = data.events.filter(isUpcoming).sort(byDateAsc);
  const events = upcoming.length ? upcoming.slice(0, 3) : data.events.slice().sort(byDateDesc).slice(0, 3);
  document.getElementById("home-events").innerHTML = events.map(eventCard).join("") || '<div class="empty">No events yet.</div>';
  document.getElementById("home-news").innerHTML = data.news.slice().sort(byDateDesc).slice(0, 3).map(newsCard).join("");
  const logos = data.sponsors.map((sp) => `<a href="${esc(sp.url)}" target="_blank" rel="noopener" title="${esc(sp.name)}"><img src="${esc(sp.logo)}" alt="${esc(sp.name)}"></a>`).join("");
  document.getElementById("sponsors").innerHTML = logos + logos;

  observeReveal();
  bindCardClicks(data);
});

/*
 * Particle portrait: a human profile whose face is organic (random points) and
 * whose back of the head is quantised to a pixel grid. It periodically
 * dissolves into a rotating 3D sphere - the "machine" - and re-forms.
 * The cursor pushes particles away.
 */
function initPortrait(host, canvas, still) {
  const ctx = canvas.getContext("2d");
  const toggle = document.getElementById("mode-toggle");
  const coords = document.getElementById("portrait-coords");
  let W = 0, H = 0, dpr = 1, parts = [], mode = "human", t = 0, raf = 0, visible = true;
  let lastUserToggle = 0;
  const mouse = { x: -9999, y: -9999 };

  // Profile facing right, in unit coordinates (x: back -> front, y: top -> bottom).
  const PROFILE = [
    [0.36, 1.0], [0.34, 0.86], [0.27, 0.74], [0.21, 0.6], [0.2, 0.44], [0.25, 0.28], [0.36, 0.15], [0.5, 0.09],
    [0.63, 0.11], [0.72, 0.19], [0.76, 0.3], [0.77, 0.37], [0.75, 0.41], [0.77, 0.45], [0.81, 0.52], [0.85, 0.57],
    [0.8, 0.6], [0.8, 0.63], [0.78, 0.65], [0.8, 0.68], [0.77, 0.71], [0.77, 0.74], [0.75, 0.8], [0.68, 0.84],
    [0.62, 0.86], [0.61, 0.92], [0.63, 1.0]
  ];

  function cssRgb(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = v.split(",").map((n) => Number(n.trim()));
    return m.length === 3 && m.every((n) => !Number.isNaN(n)) ? m : fallback;
  }
  // human (front) -> in-between violet -> machine (back)
  function colourAt(u, human, machine) {
    const mid = [167, 123, 255];
    const lerp = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const c = u > 0.5 ? lerp(mid, human, (u - 0.5) * 2) : lerp(machine, mid, u * 2);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function sampleFace(n, size) {
    const S = 320;
    const off = document.createElement("canvas");
    off.width = off.height = S;
    const c = off.getContext("2d");
    c.beginPath();
    const P = PROFILE.map(([x, y]) => [x * S, y * S]);
    c.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      c.quadraticCurveTo(P[i][0], P[i][1], mx, my);
    }
    c.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
    c.closePath();
    c.fill();
    // eye
    c.globalCompositeOperation = "destination-out";
    c.beginPath(); c.ellipse(0.665 * S, 0.395 * S, 0.026 * S, 0.012 * S, -0.1, 0, Math.PI * 2); c.fill();
    const img = c.getImageData(0, 0, S, S).data;
    const inside = (x, y) => x >= 0 && y >= 0 && x < S && y < S && img[((y | 0) * S + (x | 0)) * 4 + 3] > 128;

    const pts = [];
    const used = new Set();
    const GRID = 9;
    // ~22% of particles trace the front silhouette so the nose and lips read clearly
    const edge = [];
    for (let y = 2; y < S - 2; y++) for (let x = Math.floor(S * 0.5); x < S - 2; x++) {
      if (inside(x, y) && (!inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2))) edge.push([x, y]);
    }
    for (let k = 0; k < Math.floor(n * 0.22) && edge.length; k++) {
      const [x, y] = edge[(Math.random() * edge.length) | 0];
      pts.push([(x + (Math.random() - 0.5) * 1.5) / S, (y + (Math.random() - 0.5) * 1.5) / S]);
    }
    let guard = 0;
    while (pts.length < n && guard++ < n * 40) {
      let x = Math.random() * S, y = Math.random() * S;
      if (!inside(x, y)) continue;
      // Probability of being "machine" (snapped to the grid) rises toward the back of the head.
      const u = x / S;
      const pMachine = Math.min(1, Math.max(0, (0.56 - u) / 0.22));
      if (Math.random() < pMachine) {
        x = Math.round(x / GRID) * GRID; y = Math.round(y / GRID) * GRID;
        const key = x + "," + y;
        if (used.has(key) || !inside(x, y)) continue;
        used.add(key);
      }
      pts.push([x / S, y / S]);
    }
    const scale = size * 0.9, ox = (size - scale) / 2 - size * 0.02, oy = (size - scale) / 2 - size * 0.035;
    return pts.map(([x, y]) => [ox + x * scale, oy + y * scale, Math.min(1, Math.max(0, (x - 0.24) / 0.54))]);
  }

  function build() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 480 ? 900 : 1500;
    const face = sampleFace(n, Math.min(W, H));
    const human = cssRgb("--primary-rgb", [255, 106, 61]), machine = cssRgb("--machine-rgb", [61, 226, 255]);
    const golden = Math.PI * (3 - Math.sqrt(5));
    parts = face.map(([hx, hy, u], i) => {
      // Fibonacci sphere coordinates for the machine form
      const yy = 1 - (i / (face.length - 1)) * 2, rad = Math.sqrt(1 - yy * yy), th = golden * i;
      const old = parts[i];
      return {
        x: old ? old.x : hx + (Math.random() - 0.5) * 60, y: old ? old.y : hy + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0, hx, hy, sx: Math.cos(th) * rad, sy: yy, sz: Math.sin(th) * rad,
        col: colourAt(u, human, machine), mcol: colourAt(Math.max(0, 0.45 - Math.abs(yy) * 0.45), human, machine),
        ph: Math.random() * Math.PI * 2, sz0: 1.3 + Math.random() * 1.1
      };
    });
  }

  function setMode(next, byUser) {
    mode = next;
    host.classList.toggle("is-machine", mode === "machine");
    toggle.setAttribute("aria-pressed", String(mode === "machine"));
    if (byUser) lastUserToggle = performance.now();
    // a little burst so the transition reads as dissolving, not sliding
    parts.forEach((p) => { p.vx += (Math.random() - 0.5) * 9; p.vy += (Math.random() - 0.5) * 9; });
    if (still) draw(true);
  }

  function draw(snap) {
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.47, R = Math.min(W, H) * 0.34;
    const rotY = t * 0.35, rotX = 0.35;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY), cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      let tx, ty, depth = 1;
      if (mode === "human") {
        tx = p.hx + Math.sin(t * 1.2 + p.ph) * 0.7;
        ty = p.hy + Math.cos(t * 1.0 + p.ph) * 0.7;
      } else {
        // rotate the unit sphere, then perspective-project
        const x1 = p.sx * cosY + p.sz * sinY, z1 = -p.sx * sinY + p.sz * cosY;
        const y2 = p.sy * cosX - z1 * sinX, z2 = p.sy * sinX + z1 * cosX;
        const persp = 1 / (1.9 - z2 * 0.6);
        tx = cx + x1 * R * persp * 1.9; ty = cy + y2 * R * persp * 1.9;
        depth = (z2 + 1) / 2; // 0 = back, 1 = front
      }
      if (snap) { p.x = tx; p.y = ty; p.vx = p.vy = 0; }
      else {
        p.vx = (p.vx + (tx - p.x) * 0.045) * 0.86;
        p.vy = (p.vy + (ty - p.y) * 0.045) * 0.86;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 8100) { const d = Math.sqrt(d2) || 1, f = (1 - d / 90) * 2.6; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
        p.x += p.vx; p.y += p.vy;
      }
      const size = mode === "human" ? p.sz0 : 0.8 + depth * 2;
      ctx.globalAlpha = mode === "human" ? 0.92 : 0.25 + depth * 0.75;
      ctx.fillStyle = mode === "human" ? p.col : p.mcol;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    t = now / 1000;
    // auto-cycle every 7s, unless the visitor took control recently
    if (now - lastUserToggle > 15000) {
      const phase = Math.floor(t / 7) % 2 === 0 ? "human" : "machine";
      if (phase !== mode) setMode(phase, false);
    }
    draw(false);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  build();
  if (still) { draw(true); }
  else raf = requestAnimationFrame(frame);

  toggle.addEventListener("click", () => setMode(mode === "human" ? "machine" : "human", true));
  host.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    coords.innerHTML = `x ${(mouse.x / r.width).toFixed(3)}<br>y ${(mouse.y / r.height).toFixed(3)}`;
  });
  host.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { build(); if (still) draw(true); }, 150); });
  document.addEventListener("themechange", () => { build(); if (still) draw(true); });
  if ("IntersectionObserver" in window && !still) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(host);
  }
}

// Wraps each word in a span (keeping <em>/<span> structure) and lights them up with scroll progress.
function initManifesto(el, still) {
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(part);
          else { const w = document.createElement("span"); w.className = "w"; w.textContent = part; frag.append(w); }
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) walk(ch);
    });
  };
  walk(el);
  const ws = [...el.querySelectorAll(".w")];
  if (still) { ws.forEach((w) => w.classList.add("on")); return; }
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
    const lit = Math.round(p * ws.length);
    ws.forEach((w, i) => w.classList.toggle("on", i < lit));
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/*
 * "Human or machine?" Human lines are real, attributed quotations.
 * Machine lines were generated by an AI language model for this quiz.
 */
function initTuring() {
  const ROUNDS = [
    { text: "The Analytical Engine has no pretensions whatever to originate anything.", who: "human", src: "Ada Lovelace, notes on Babbage's Analytical Engine (1843)" },
    { text: "I don't dream, but I've read enough descriptions of dreams to tell you about one in more detail than most people remember theirs.", who: "machine", src: "Generated by an AI language model for this quiz" },
    { text: "I propose to consider the question, 'Can machines think?'", who: "human", src: "Alan Turing, 'Computing Machinery and Intelligence' (1950)" },
    { text: "Ask me what rain feels like and I'll give you a beautiful answer. I've just never been outside.", who: "machine", src: "Generated by an AI language model for this quiz" },
    { text: "Every sentence I write is a guess about what a person would say next. Most days the guesses are good enough that nobody checks.", who: "machine", src: "Generated by an AI language model for this quiz" },
    { text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.", who: "human", src: "Alan Turing, 'Computing Machinery and Intelligence' (1950)" }
  ];
  const $ = (id) => document.getElementById(id);
  const quote = $("turing-quote"), reveal = $("turing-reveal"), actions = $("turing-actions"), dots = $("turing-dots");
  let i = 0, score = 0, results = [];

  function paintDots() {
    dots.innerHTML = ROUNDS.map((_, k) => `<i class="${results[k] === true ? "right" : results[k] === false ? "wrong" : k === i ? "cur" : ""}"></i>`).join("");
  }
  function show() {
    quote.classList.add("fade");
    setTimeout(() => {
      quote.textContent = `“${ROUNDS[i].text}”`;
      quote.classList.remove("fade");
    }, 200);
    $("turing-round").textContent = `Round ${i + 1} of ${ROUNDS.length}`;
    reveal.className = "turing-reveal";
    actions.innerHTML = `<button class="btn human" type="button" data-guess="human">Human</button><button class="btn machine" type="button" data-guess="machine">Machine</button>`;
    paintDots();
  }
  function verdict() {
    const n = ROUNDS.length;
    if (score === n) return "Flawless. Suspiciously flawless. Are you sure you're human?";
    if (score >= n - 2) return "Sharp eye - the machines will have to try harder.";
    if (score >= 2) return "The line is blurrier than it looks. That's why we study it.";
    return "Hardly human detection skills. You'd fit right in here.";
  }
  actions.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.next) { i++; show(); return; }
    if (b.dataset.again) { i = 0; score = 0; results = []; $("turing-score").textContent = "0/0"; $("turing-verdict").textContent = "Your score appears here as you play."; show(); return; }
    const r = ROUNDS[i];
    const right = b.dataset.guess === r.who;
    results[i] = right;
    if (right) score++;
    $("turing-score").textContent = `${score}/${i + 1}`;
    reveal.innerHTML = `<b class="${right ? "ok" : "no"}">${right ? "Correct" : "Not quite"}</b> - this was written by ${r.who === "human" ? "a human" : "a machine"}.<span class="src">${r.src}</span>`;
    reveal.classList.add("show");
    const last = i === ROUNDS.length - 1;
    actions.innerHTML = last
      ? `<button class="btn btn-primary" type="button" data-again="1" style="grid-column:1/-1">Play again</button>`
      : `<button class="btn" type="button" data-next="1" style="grid-column:1/-1">Next line</button>`;
    if (last) $("turing-verdict").textContent = verdict();
    paintDots();
  });
  show();
}
