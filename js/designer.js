// The Drawing Office: a full-screen designer over the map. Time keeps running while it is open;
// routine telegrams show as a banner, and serious ones pause the game with a way back to the map.
window.UpShip = window.UpShip || {};
(function (U) {
  const P = () => U.physics;
  let root = null, tab = "hull", compare = "none", clockTimer = null, bannerTimer = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n, d = 0) => Number(n).toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = n => "£" + fmt(Math.round(n));
  const isOpen = () => !!root && !root.hidden;

  // Historic ships to compare against, available from the year they flew.
  const REFS = [
    { id: "r34", name: "R34", year: 1919, L: 196, D: 24.4 },
    { id: "graf", name: "Graf Zeppelin", year: 1928, L: 236.6, D: 30.5 },
    { id: "hindenburg", name: "Hindenburg", year: 1936, L: 245, D: 41.2 }
  ];
  const OPTIONS = {
    nose: [["rounded", "Rounded"], ["pointed", "Pointed"], ["blunt", "Blunt"]],
    tail: [["standard", "Standard"], ["tapered", "Tapered"], ["cruciform", "Cruciform"]],
    fins: [["standard", "Standard"], ["large", "Large"], ["twin", "Twin"]],
    car: [["external", "External"], ["recessed", "Recessed"], ["streamlined", "Streamlined"]]
  };
  const ABOUT = {
    nose: { rounded: "The usual shape.", pointed: "Less drag, a little less gas.", blunt: "More gas and cheaper, but more drag." },
    tail: { standard: "The usual shape.", tapered: "Less drag, a little less gas.", cruciform: "Steadier in bad weather, but heavier." },
    fins: { standard: "The usual size.", large: "Steadier in storms, but more drag.", twin: "Easier at the mast, but costlier." },
    car: { external: "Hung beneath the hull.", recessed: "Set into the hull: less drag, costlier.", streamlined: "Faired in: less drag, heavier." }
  };

  function draft(state) {
    if (!state.drawing) state.drawing = U.physics.preset(state, "blank");
    if (!state.drawing.livery) state.drawing.livery = U.livery.fresh(state);
    return state.drawing;
  }

  // Opening and closing ----------------------------------------------------------------
  function open() {
    if (!U.state) return;
    resetAnim();
    if (!root) build();
    root.hidden = false;
    document.body.classList.add("office-open");
    render();
    clockTimer = setInterval(clock, 400);
  }
  function close() {
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("office-open");
    clearInterval(clockTimer);
    U.sim.save(U.state);
  }
  function build() {
    root = document.createElement("div");
    root.id = "office"; root.className = "office"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Drawing Office");
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("click", e => { const h = e.target.closest("[data-bay]"); if (h && tab === "systems") { selBay = +h.dataset.bay; refresh(); } });
    root.addEventListener("keydown", e => {
      const h = e.target.closest && e.target.closest("[data-bay]");
      if (h && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selBay = +h.dataset.bay; refresh(); root.querySelector(`[data-bay="${selBay}"]`)?.focus(); }
    });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("keydown", e => {
      if (tab !== "paint" || !paintSel || e.target.closest("input, select, textarea")) return;
      const k = { ArrowLeft: [-0.004, 0], ArrowRight: [0.004, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key];
      if (!k) return;
      e.preventDefault();
      const lv = draft(U.state).livery, it = paintSel === "name" ? lv.name : lv.emblems[+paintSel.split(":")[1]];
      if (!it) return;
      it.x = Math.max(0.02, Math.min(0.98, it.x + k[0])); it.y += k[1];
      root.querySelector(".do-paintsheet").innerHTML = paintSvg(U.state, draft(U.state), P().figures(U.state, draft(U.state)));
    });
    root.addEventListener("keydown", e => {
      const h = e.target.closest && e.target.closest("[data-handle]");
      if (!h) return;
      const d = draft(U.state), lim = P().limits(U.state), k = h.dataset.handle;
      const up = e.key === "ArrowRight" || e.key === "ArrowUp", down = e.key === "ArrowLeft" || e.key === "ArrowDown";
      if (!up && !down) return;
      e.preventDefault();
      if (k === "length") { d.bays = Math.max(2, Math.min(lim.maxBays, d.bays + (up ? 0.5 : -0.5))); trimSystems(d); kick(); }
      else d.D = Math.max(lim.minD, Math.min(lim.maxD, d.D + (up ? 0.5 : -0.5)));
      render(); root.querySelector(`[data-handle="${k}"]`)?.focus();
    });
    window.addEventListener("pointermove", moveGhost);
    window.addEventListener("pointerup", onPointerUp);
    root.addEventListener("input", onInput);
    document.addEventListener("keydown", e => { if (isOpen() && e.key === "Escape") close(); });
  }

  // The clock in the header: the date, and the game's speed controls.
  function clock() {
    if (!isOpen() || !U.state) return;
    const d = U.sim.dateOf(U.state.tick, U.progress || 0);
    const el = root.querySelector(".do-date");
    if (el) el.textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const a = U.game ? U.game.auto() : 0;
    root.querySelectorAll("[data-speed]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.speed === a)));
  }
  // Telegrams arriving while the office is open.
  function telegram(t) {
    if (!isOpen()) return;
    const b = root.querySelector(".do-banner");
    if (!b) return;
    b.hidden = false;
    b.className = "do-banner" + (t.major ? " major" : "");
    b.innerHTML = `<span class="do-banner-text">${esc(t.text)}</span>` + (t.major
      ? `<span class="do-banner-note">The game is paused.</span><button class="btn" data-do="back">Back to the map</button>`
      : `<button class="btn-quiet" data-do="dismiss">Dismiss</button>`);
    clearTimeout(bannerTimer);
    if (!t.major) bannerTimer = setTimeout(() => { b.hidden = true; }, 9000);
  }

  // Rendering ------------------------------------------------------------------------------
  function render() {
    const st = U.state, d = draft(st), f = P().figures(st, d);
    root.innerHTML = `
      <header class="do-head">
        <div class="do-brand">${logo()}<div><h1>Drawing Office</h1><p>Design · Refine · Build</p></div></div>
        <nav class="do-tabs" aria-label="Drawing Office sections">
          ${[["hull", "Hull"], ["systems", "Systems"], ["accommodation", "Accommodation"], ["paint", "Paint"]].map(([k, n]) =>
            `<button data-tab="${k}" aria-pressed="${tab === k}">${n}</button>`).join("")}
        </nav>
        <label class="do-start">Start from <select data-preset-select><option value="">Choose a starting design</option>${Object.entries(P().PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join("")}</select></label>
        <div class="do-clock"><span class="do-date"></span>
          <div class="do-speed" role="group" aria-label="Game speed">
            <button data-speed="0" aria-label="Pause">${icon("pause")}</button><button data-speed="1" aria-label="Normal speed">${icon("play")}</button>
            <button data-speed="2" aria-label="Fast">${icon("fast")}</button><button data-speed="3" aria-label="Fastest">${icon("fastest")}</button>
          </div>
          <button class="btn-quiet do-close" data-do="back">To the map</button></div>
      </header>
      <div class="do-banner" hidden></div>
      <div class="do-body">
        <main class="do-main">${tab === "hull" ? hullTab(st, d, f) : tab === "systems" ? systemsTab(st, d, f) : tab === "accommodation" ? accTab(st, d, f) : paintTab(st, d, f)}</main>
        <aside class="do-figures" aria-label="Figures">${figuresPanel(st, d, f)}</aside>
      </div>`;
    clock();
  }
  function laterTab() {
    const what = { accommodation: "Painting the passenger decks comes in stage 3.", paint: "Liveries, the ship's name, and the emblem come in stage 3." }[tab];
    return `<div class="do-sheet do-later"><p>${what}</p></div>`;
  }

  // The Hull tab: the blueprint sheet and the configuration bar.
  function hullTab(st, d, f) {
    const lim = P().limits(st), year = U.sim.dateOf(st.tick).getFullYear();
    const refs = REFS.filter(r => r.year <= year);
    return `<div class="do-sheet">${blueprint(st, d, f)}</div>
      <section class="do-config" aria-label="Hull configuration">
        <h2 class="do-config-title">Hull configuration</h2>
        <div class="do-field"><label for="do-dia">Diameter</label>
          <div class="do-big">${fmt(d.D, 1)} m</div>
          <input id="do-dia" type="range" min="${lim.minD}" max="${lim.maxD}" step="0.5" value="${d.D}" data-field="D">
          <small>Up to ${lim.maxD} m with today's girders</small></div>
        <div class="do-field"><span class="do-label">Number of bays</span>
          <div class="do-stepper"><button data-bays="-1" aria-label="Half a bay fewer">−</button><span>${bayText(d.bays)}</span><button data-bays="1" aria-label="Half a bay more">+</button></div>
          <small>15 m per bay (${fmt(f.L)} m overall)</small></div>
        <div class="do-field"><span class="do-label">Lifting gas</span>
          <div class="do-seg">${["hydrogen", "helium"].concat(U.aether && U.aether.discovered(st) ? ["aetherium"] : []).map(g =>
            `<button data-gas="${g}" aria-pressed="${d.gas === g}">${g[0].toUpperCase() + g.slice(1)}</button>`).join("")}</div></div>
        <div class="do-field"><span class="do-label">Compare with</span>
          <div class="do-seg do-compare"><button data-compare="none" aria-pressed="${compare === "none"}">None</button>${refs.map(r =>
            `<button data-compare="${r.id}" aria-pressed="${compare === r.id}">${r.name}</button>`).join("")}</div>
          <small>${compare !== "none" ? (() => { const r = REFS.find(x => x.id === compare); return `${r.L} m by ${r.D} m, drawn dashed`; })() : "A famous ship, drawn to the same scale"}</small></div>
        ${["nose", "tail", "fins", "car"].map(k => `<div class="do-field"><span class="do-label">${{ nose: "Nose shape", tail: "Tail style", fins: "Fin style", car: "Control car" }[k]}</span>
          <div class="do-opts">${OPTIONS[k].map(([v, n]) => `<button data-opt="${k}:${v}" aria-pressed="${d[k] === v}" title="${esc(ABOUT[k][v])}">${optIcon(d, k, v)}<span>${n}</span></button>`).join("")}</div>
          <small>${esc(ABOUT[k][d[k]])}</small></div>`).join("")}
      </section>`;
  }

  // The blueprint: side elevation above; cross-section, bay section, scale, and title block below.
  function blueprint(st, d0, f0) {
    // The drawing follows animated values, so the framework stretches and swells into place.
    const A = animFor(d0), d = { ...d0, bays: A.B, D: A.D }, hl = P().hullLengths(d), f = { ...f0, ...hl };
    const W = 1200, H = 660, ref = REFS.find(r => r.id === compare);
    const L = f.L, D = d.D, fitL = Math.max(L, ref ? ref.L : 0), fitD = Math.max(D, ref ? ref.D : 0);
    // While a handle is being dragged, the scale and the bow stay put, so the ship grows under the pointer;
    // afterwards the view eases back to fit the ship.
    const sFit = Math.min(1000 / fitL, 200 / fitD), xFit = 130 + (1000 - L * sFit) / 2;
    if (hullDrag) { A.s = hullDrag.s; A.x0 = hullDrag.x0; }
    else if (A.s == null) { A.s = sFit; A.x0 = xFit; }
    A.sFit = sFit; A.xFit = xFit;
    const s = A.s, x0 = A.x0, cy = 190;
    bpGeom = { s, x0, cy };
    const X = x => x0 + x * s, Y = y => cy + y * s;
    const r = x => P().radius(d, x);
    // Hull outline.
    const N = 160, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = L * i / N; top.push(`${X(x).toFixed(1)},${Y(-r(x)).toFixed(1)}`); bot.push(`${X(x).toFixed(1)},${Y(r(x)).toFixed(1)}`); }
    const outline = `M${top.join(" L")} L${bot.reverse().join(" L")} Z`;
    // Rings: through the nose, at each whole bay, at a finished half bay, the ring still being pulled out, and through the tail.
    // The stretch not yet a half or full bay is unfinished: pale brass hatching, dashed ring and bracing.
    const halves = Math.floor(d.bays * 2 + 1e-6), done = halves / 2, moving = d.bays - done > 0.004 ? f.ln + d.bays * 15 : null;
    const main = [], light = [];
    for (let t = 0.3; t < 1; t += 0.35) main.push(f.ln * t);
    main.push(f.ln);
    for (let i = 1; i <= Math.floor(done); i++) main.push(f.ln + i * 15);
    if (done % 1) main.push(f.ln + done * 15);
    if (moving) main.push(moving);
    for (let x = f.ln + f.mid + 15; x < L - 4; x += 15) main.push(x);
    main.sort((a, b) => a - b);
    for (let i = 0; i < main.length - 1; i++) if (!(moving && Math.abs(main[i + 1] - moving) < 1e-6)) light.push((main[i] + main[i + 1]) / 2);
    const now = performance.now();
    // Freshly finished members glow brass and cool to ink over a second or so.
    const glow = x => { const step = Math.round((x - f.ln) / 7.5); if (Math.abs(x - (f.ln + step * 7.5)) > 0.1 || A.fresh[step] == null) return 0; return Math.max(0, 1 - (now - A.fresh[step]) / 1200); };
    const ring = (x, cls) => {
      if (moving && Math.abs(x - moving) < 1e-6) return `<line x1="${X(x).toFixed(1)}" y1="${Y(-r(x)).toFixed(1)}" x2="${X(x).toFixed(1)}" y2="${Y(r(x)).toFixed(1)}" class="bp-ring-unfin"/>`;
      const gl = cls === "bp-ring" ? Math.max(glow(x), A.glow) : 0;
      return `<line x1="${X(x).toFixed(1)}" y1="${Y(-r(x)).toFixed(1)}" x2="${X(x).toFixed(1)}" y2="${Y(r(x)).toFixed(1)}" class="${cls}"${gl > 0.02 ? ` style="stroke:${mixHex("#2d2418", "#b8862e", gl)}"` : ""}/>`;
    };
    let unfin = "";
    if (moving) {
      const a = f.ln + done * 15, pts = [];
      for (let i = 0; i <= 12; i++) { const x = a + (moving - a) * i / 12; pts.push(`${X(x).toFixed(1)},${Y(-r(x)).toFixed(1)}`); }
      for (let i = 12; i >= 0; i--) { const x = a + (moving - a) * i / 12; pts.push(`${X(x).toFixed(1)},${Y(r(x)).toFixed(1)}`); }
      unfin = `<path d="M${pts.join(" L")} Z" fill="url(#bp-unfin)"/>`;
    }
    // Longitudinals, and diagonal bracing in each panel between main rings.
    const K = 9, lon = [];
    for (let k = 1; k < K; k++) {
      const c = Math.cos(k * Math.PI / K), pts = [];
      for (let i = 0; i <= N; i++) { const x = L * i / N; pts.push(`${X(x).toFixed(1)},${Y(r(x) * c).toFixed(1)}`); }
      lon.push(`<polyline points="${pts.join(" ")}" class="bp-lon"/>`);
    }
    let diag = "", diagHot = "";
    for (let i = 0; i < main.length - 1; i++) {
      const a = main[i], b = main[i + 1], isUnfin = moving && Math.abs(b - moving) < 1e-6, gl = isUnfin ? 0 : glow(b);
      let seg = "";
      for (let k = 0; k < K; k++) {
        const c1 = Math.cos(k * Math.PI / K), c2 = Math.cos((k + 1) * Math.PI / K);
        seg += `M${X(a).toFixed(1)},${Y(r(a) * c1).toFixed(1)} L${X(b).toFixed(1)},${Y(r(b) * c2).toFixed(1)} M${X(a).toFixed(1)},${Y(r(a) * c2).toFixed(1)} L${X(b).toFixed(1)},${Y(r(b) * c1).toFixed(1)} `;
      }
      if (isUnfin) diagHot += `<path d="${seg}" class="bp-diag-unfin"/>`;
      else if (gl > 0.02) diagHot += `<path d="${seg}" style="stroke:${mixHex("#2d2418", "#b8862e", gl)};stroke-width:${0.3 + 0.4 * gl};opacity:${0.45 + 0.45 * gl};fill:none"/>`;
      else diag += `<path d="${seg}"/>`;
    }
    // The keel, running inside the bottom of the hull from the control car to the tail.
    const kx0 = f.ln * 0.6, kx1 = L - f.lt * 0.5, kpts = [];
    for (let x = kx0; x <= kx1; x += (kx1 - kx0) / 60) kpts.push(`${X(x).toFixed(1)},${Y(r(x) * 0.93).toFixed(1)}`);
    const keel = `<polyline points="${kpts.join(" ")}" class="bp-keel"/>`;
    const fins = finsDrawing(d, f, X, Y, r, s);
    const car = carDrawing(d, f, X, Y, r, s);
    const engines = d.systems.engines.map(e => { const ex = P().bayCentre(d, f.ln, e.bay); return e.mount === "sides" ? engineCar(ex, "sides", r, X, Y, s, D).replace(/cw-nacelle/g, "bp-car").replace(/cw-strut/g, "bp-strut").replace(/cw-prop/g, "bp-prop") : engineDrawing(ex, r, X, Y, s, D); }).join("");
    // The comparison ship, dashed, aligned at the bow.
    let refDraw = "";
    if (ref) {
      const rd = { ...d, D: ref.D, bays: Math.max(1, Math.round((ref.L - ref.D * 2.2) / 15)), nose: "rounded", tail: "standard" };
      const rl = P().hullLengths(rd), rs = ref.L / rl.L, pts = [], pb = [];
      for (let i = 0; i <= N; i++) { const x = rl.L * i / N; pts.push(`${X(x * rs).toFixed(1)},${Y(-P().radius(rd, x)).toFixed(1)}`); pb.push(`${X(x * rs).toFixed(1)},${Y(P().radius(rd, x)).toFixed(1)}`); }
      refDraw = `<path d="M${pts.join(" L")} L${pb.reverse().join(" L")} Z" class="bp-ref"/><text x="${X(ref.L) + 6}" y="${Y(-ref.D / 2) - 4}" class="bp-small">${ref.name}</text>`;
    }
    // Dimensions: overall length above, diameter at the left, bays numbered below.
    const yTop = Y(-D / 2) - 38, xL = x0 - 50;
    const dims = `<line x1="${X(0)}" y1="${yTop}" x2="${X(L)}" y2="${yTop}" class="bp-dim" marker-start="url(#bp-arrow)" marker-end="url(#bp-arrow)"/>
      <line x1="${X(0)}" y1="${yTop - 8}" x2="${X(0)}" y2="${Y(0)}" class="bp-ext"/><line x1="${X(L)}" y1="${yTop - 8}" x2="${X(L)}" y2="${Y(0)}" class="bp-ext"/>
      <rect x="${X(L / 2) - 62}" y="${yTop - 10}" width="124" height="20" class="bp-paper"/><text x="${X(L / 2)}" y="${yTop + 5}" class="bp-dimtext">${fmt(L)} m overall</text>
      <line x1="${xL}" y1="${Y(-D / 2)}" x2="${xL}" y2="${Y(D / 2)}" class="bp-dim" marker-start="url(#bp-arrow)" marker-end="url(#bp-arrow)"/>
      <line x1="${xL - 8}" y1="${Y(-D / 2)}" x2="${X(f.ln)}" y2="${Y(-D / 2)}" class="bp-ext"/><line x1="${xL - 8}" y1="${Y(D / 2)}" x2="${X(f.ln)}" y2="${Y(D / 2)}" class="bp-ext"/>
      <rect x="${xL - 30}" y="${cy - 17}" width="60" height="34" class="bp-paper"/><text x="${xL}" y="${cy - 2}" class="bp-dimtext">${fmt(D, 1)} m</text><text x="${xL}" y="${cy + 13}" class="bp-small mid">diameter</text>`;
    const yB = Math.max(Y(D / 2) + 64, 330);
    let bays = "";
    const numbered = Math.ceil(done - 1e-6), half = done % 1 > 0.25;
    for (let i = 1; i <= numbered; i++) {
      const x = X(f.ln + (i - 1) * 15 + (half && i === numbered ? 3.75 : 7.5));
      bays += `<line x1="${x}" y1="${Y(D / 2) + 8}" x2="${x}" y2="${yB - 14}" class="bp-lead"/><text x="${x}" y="${yB}" class="bp-small mid">${half && i === numbered ? (i - 1) + "½" : i}</text>`;
    }
    bays += `<text x="${X(f.ln + f.mid / 2)}" y="${yB + 22}" class="bp-label mid">Bays, numbered from the bow</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="bp" role="img" aria-label="Blueprint of the hull: side elevation, cross-section, bay section, and title block">
      <defs><pattern id="bp-unfin" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="7" height="7" fill="#e8cf95" opacity="0.55"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b8862e" stroke-width="1.2" opacity="0.6"/></pattern>
        <marker id="bp-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9" fill="none" stroke="#2d2418" stroke-width="1.4"/></marker>
        <pattern id="bp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#2d2418" stroke-width="0.6"/></pattern></defs>
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" class="bp-frame"/>
      <text x="30" y="36" class="bp-title">Side elevation <tspan class="bp-sub">(port side)</tspan></text>
      <path d="${outline}" class="bp-skin"/>
      ${unfin}<g class="bp-diag">${diag}</g>${diagHot}${lon.join("")}${light.map(x => ring(x, "bp-ring-l")).join("")}${main.map(x => ring(x, "bp-ring")).join("")}
      ${keel}${fins}<path d="${outline}" class="bp-outline"/>${car}${engines}${refDraw}
      <line x1="${X(-6)}" y1="${cy}" x2="${X(L + 8)}" y2="${cy}" class="bp-centre"/>
      ${dims}${bays}
      ${handle("length", X(L) + 18, cy, "Drag to lengthen or shorten the ship, a bay at a time")}
      ${handle("diameter", X(f.ln + f.mid * 0.5), Y(-D / 2), "Drag up or down to change the diameter")}
      <line x1="16" y1="392" x2="${W - 16}" y2="392" class="bp-rule"/>
      ${crossSection(d0, f0)}${baySection(d0, f0)}${scaleAndTitle(st, d0, f0, s)}
    </svg>`;
  }
  // Animation of the framework: the drawn length and diameter ease toward the design's, following the pointer while dragging.
  let anim = null, animRaf = null;
  function animFor(d) {
    if (!anim) anim = { B: d.bays, D: d.D, fresh: {}, glow: 0, s: null, x0: null };
    return anim;
  }
  function resetAnim() { anim = null; }
  function kick() { if (!animRaf) { animLast = performance.now(); animRaf = requestAnimationFrame(animTick); } }
  let animLast = 0;
  function animTick(now) {
    animRaf = null;
    if (!isOpen() || tab !== "hull" || !anim) return;
    const d = draft(U.state), dt = Math.min(0.05, (now - animLast) / 1000); animLast = now;
    const target = hullDrag && hullDrag.kind === "length" ? hullDrag.cont : d.bays, before = anim.B;
    anim.B += (target - anim.B) * (1 - Math.exp(-dt * (hullDrag ? 18 : 4.5))); if (Math.abs(target - anim.B) < 0.002) anim.B = target;
    for (let h = Math.floor(before * 2 + 1e-6) + 1; h <= Math.floor(anim.B * 2 + 1e-6); h++) anim.fresh[h] = now;
    const dB = anim.D; anim.D += (d.D - anim.D) * (1 - Math.exp(-dt * 5)); if (Math.abs(d.D - anim.D) < 0.01) anim.D = d.D;
    anim.glow = Math.max(0, Math.min(1, Math.abs(anim.D - dB) * 12 + anim.glow * 0.9)); if (anim.glow < 0.02) anim.glow = 0;
    if (!hullDrag && anim.sFit != null) { anim.s += (anim.sFit - anim.s) * 0.12; anim.x0 += (anim.xFit - anim.x0) * 0.12; }
    const sheet = root.querySelector(".do-sheet");
    if (sheet) sheet.innerHTML = blueprint(U.state, d, P().figures(U.state, d));
    const busy = anim.B !== target || anim.D !== d.D || anim.glow > 0 || Object.values(anim.fresh).some(t => now - t < 1300)
      || (!hullDrag && anim.sFit != null && (Math.abs(anim.s - anim.sFit) > 0.002 || Math.abs(anim.x0 - anim.xFit) > 0.3)) || !!hullDrag;
    if (busy) animRaf = requestAnimationFrame(animTick);
  }
  const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

  const bayText = n => Math.floor(n) + (n % 1 > 0.25 ? "½" : "");
  // A drag handle: a brass knob with arrows showing which way it moves.
  function handle(kind, x, y, label) {
    const arrows = kind === "length" ? `<path d="M-15,0 L-9,-5 L-9,5 Z M15,0 L9,-5 L9,5 Z"/>` : `<path d="M0,-15 L-5,-9 L5,-9 Z M0,15 L-5,9 L5,9 Z"/>`;
    return `<g class="bp-handle${hullDrag && hullDrag.kind === kind ? " active" : ""}" data-handle="${kind}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="slider" aria-label="${label}">
      <circle r="17" class="bp-handle-hit"/><circle r="8" class="bp-handle-knob"/><g class="bp-handle-arrows">${arrows}</g><title>${label}</title></g>`;
  }
  function finsDrawing(d, f, X, Y, r, s) {
    const L = f.L, D = d.D;
    // Each fin is a trapezoid rooted on the hull, standing clear of it by a share of the diameter; the rear part is the rudder.
    const len = f.lt * (d.fins === "large" ? 0.72 : 0.6), xe = L - f.lt * (d.tail === "cruciform" ? -0.04 : 0.1), xs = xe - len;
    const proj = D * (d.fins === "large" ? 0.3 : d.fins === "twin" ? 0.17 : 0.22);
    const fin = (sign, pr, x1 = xs, x2 = xe) => {
      const ln = x2 - x1, tip = sign * (r(x1) * 0.92 + pr), yr1 = Y(sign * r(x1)), yr2 = Y(sign * r(Math.min(x2, L)));
      const pts = [[X(x1), yr1], [X(x1 + ln * 0.42), Y(tip)], [X(x2), Y(tip)], [X(x2), yr2]];
      const xr = x2 - ln * 0.28;
      const rud = [[X(xr), Y(sign * r(xr))], [X(xr), Y(tip)], [X(x2), Y(tip)], [X(x2), yr2]];
      let ribs = "";
      for (let t = 0.25; t < 0.7; t += 0.15) { const x = x1 + ln * t, yt = Math.abs(tip) - (1 - Math.min(1, t / 0.42)) * pr; ribs += `<line x1="${X(x)}" y1="${Y(sign * r(x))}" x2="${X(x)}" y2="${Y(sign * yt)}" class="bp-lon"/>`; }
      return `<path d="M${pts.map(p => p.join(",")).join(" L")} Z" class="bp-fin"/>${ribs}<path d="M${rud.map(p => p.join(",")).join(" L")} Z" class="bp-rudder"/>`;
    };
    // The horizontal fins, seen edge-on as a thin plane along the centre line.
    const plane = `<path d="M${X(xs + len * 0.4)},${Y(-0.4)} L${X(xe)},${Y(-0.4)} L${X(xe)},${Y(0.4)} L${X(xs + len * 0.4)},${Y(0.4)} Z" class="bp-fin"/>`;
    let out = fin(-1, proj) + fin(1, proj) + plane;
    if (d.fins === "twin") out += fin(-1, proj * 0.9, xs - len * 0.55, xs - len * 0.05) + fin(1, proj * 0.9, xs - len * 0.55, xs - len * 0.05);
    return out;
  }
  function carDrawing(d, f, X, Y, r, s) {
    const D = d.D, a = f.ln + 1, b = f.ln + Math.min(14, f.mid - 1), h = Math.max(2.4, D * 0.11);
    const yb = r(a + 3), top = d.car === "recessed" ? yb - h * 0.5 : yb;
    const bottom = top + h;
    if (d.car === "streamlined")
      return `<path d="M${X(a)},${Y(top)} C${X(a - 2)},${Y(bottom)} ${X(a + 4)},${Y(bottom + 1)} ${X(a + 8)},${Y(bottom)} L${X(b)},${Y(top + h * 0.45)} L${X(b)},${Y(top)} Z" class="bp-car"/>
        ${[0.25, 0.4, 0.55].map(t => `<rect x="${X(a + (b - a) * t)}" y="${Y(top + h * 0.28)}" width="${Math.max(2, s * 0.9)}" height="${Math.max(2, h * s * 0.28)}" class="bp-win"/>`).join("")}`;
    let wins = "";
    for (let x = a + 1.5; x < b - 1; x += 2.2) wins += `<rect x="${X(x)}" y="${Y(top + h * 0.25)}" width="${Math.max(2, s * 1.2)}" height="${Math.max(2, h * s * 0.3)}" class="bp-win"/>`;
    return `<rect x="${X(a)}" y="${Y(top)}" width="${(b - a) * s}" height="${h * s}" rx="${Math.min(6, h * s * 0.35)}" class="bp-car"/>${wins}`;
  }
  function engineDrawing(x, r, X, Y, s, D) {
    const len = Math.max(5, D * 0.26), h = Math.max(1.8, D * 0.08), yb = r(x) + D * 0.1;
    return `<line x1="${X(x - len * 0.2)}" y1="${Y(r(x) * 0.98)}" x2="${X(x - len * 0.2)}" y2="${Y(yb)}" class="bp-strut"/><line x1="${X(x + len * 0.25)}" y1="${Y(r(x) * 0.98)}" x2="${X(x + len * 0.25)}" y2="${Y(yb)}" class="bp-strut"/>
      <path d="M${X(x - len / 2)},${Y(yb + h / 2)} C${X(x - len / 2)},${Y(yb - h * 0.2)} ${X(x + len * 0.3)},${Y(yb - h * 0.1)} ${X(x + len / 2)},${Y(yb + h / 2)} C${X(x + len * 0.3)},${Y(yb + h * 1.1)} ${X(x - len / 2)},${Y(yb + h * 1.2)} ${X(x - len / 2)},${Y(yb + h / 2)} Z" class="bp-car"/>
      <line x1="${X(x - len / 2 - 0.6)}" y1="${Y(yb + h / 2 - h * 1.3)}" x2="${X(x - len / 2 - 0.6)}" y2="${Y(yb + h / 2 + h * 1.3)}" class="bp-prop"/>`;
  }
  // Cross-section at a main ring: the ring, its bracing wires, the gas cell, the keel and catwalk, and a person for scale.
  function crossSection(d, f) {
    const cx = 178, cy = 530, R = 90, n = 18;
    const poly = k => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2; return `${(cx + Math.cos(a) * R * k).toFixed(1)},${(cy + Math.sin(a) * R * k).toFixed(1)}`; });
    const outer = poly(1), inner = poly(0.93);
    let wires = "";
    for (const p of outer) wires += `<line x1="${cx}" y1="${cy}" x2="${p.split(",")[0]}" y2="${p.split(",")[1]}" class="bp-wire"/>`;
    const person = 1.75 / d.D * 2 * R, kt = cy + R * 0.76, kb = cy + R;
    const lab = (y, t, tx, ty) => `<line x1="${tx}" y1="${ty}" x2="${cx + R + 22}" y2="${y}" class="bp-lead"/><text x="${cx + R + 26}" y="${y + 4}" class="bp-small">${t}</text>`;
    return `<text x="30" y="420" class="bp-title">Cross-section <tspan class="bp-sub">at main ring</tspan></text>
      <polygon points="${outer.join(" ")}" class="bp-envelope"/><polygon points="${inner.join(" ")}" class="bp-ring-l"/>${wires}
      <circle cx="${cx}" cy="${cy - 4}" r="${R * 0.86}" class="bp-cell"/>
      <path d="M${cx - R * 0.26},${kt} L${cx + R * 0.26},${kt} L${cx},${kb} Z" class="bp-keelx"/>
      <line x1="${cx - R * 0.16}" y1="${kt + 7}" x2="${cx + R * 0.16}" y2="${kt + 7}" class="bp-catwalk"/>
      <g transform="translate(${cx} ${kt + 7})"><line x1="0" y1="0" x2="0" y2="${-person * 0.55}" class="bp-person"/><circle cx="0" cy="${-person * 0.85}" r="${Math.max(0.8, person * 0.14)}" class="bp-personhead"/>
        <line x1="${-person * 0.2}" y1="0" x2="0" y2="${-person * 0.3}" class="bp-person"/><line x1="${person * 0.2}" y1="0" x2="0" y2="${-person * 0.3}" class="bp-person"/></g>
      <line x1="${cx - R - 26}" y1="${cy - R}" x2="${cx - R - 26}" y2="${cy + R}" class="bp-dim" marker-start="url(#bp-arrow)" marker-end="url(#bp-arrow)"/>
      <text x="${cx - R - 34}" y="${cy + 4}" class="bp-small end">${fmt(d.D, 1)} m</text>
      ${lab(cy - R * 0.8, "Envelope (fabric)", cx + R * 0.55, cy - R * 0.8)}${lab(cy - R * 0.45, "Gas cell", cx + R * 0.5, cy - R * 0.4)}
      ${lab(cy - R * 0.1, "Main ring", cx + R * 0.96, cy - R * 0.1)}${lab(cy + R * 0.25, "Bracing wire", cx + R * 0.45, cy + R * 0.2)}
      ${lab(cy + R * 0.6, "Catwalk", cx + R * 0.16, kt + 7)}${lab(cy + R * 0.92, "Keel", cx + R * 0.1, kb - 4)}
      ${decksInSection(d, cx, cy, R)}`;
  }
  // The passenger decks drawn into the cross-section at their true width, so the Accommodation tab holds no surprises.
  function decksInSection(d, cx, cy, R) {
    const Rm = d.D / 2, k = R / Rm, w = U.decks.widthSq(d.D) * 2.5;
    const yLow = Math.sqrt(Math.max(0, Rm * Rm - (w / 2) * (w / 2)));          // the floor sits where the hull is exactly that wide
    const two = d.D >= P().TWO_DECKS, yUp = yLow - 2.8;
    const line = (y, ww, cls) => `<line x1="${cx - ww / 2 * k}" y1="${cy + y * k}" x2="${cx + ww / 2 * k}" y2="${cy + y * k}" class="${cls}"/>`;
    const upW = two ? Math.min(2 * Math.sqrt(Rm * Rm - yUp * yUp), w + 3) : 0;
    return `${line(yLow, w, "bp-deck")}${two ? line(yUp, upW, "bp-deck up") : ""}
      <line x1="${cx - w / 2 * k}" y1="${cy + yLow * k + 9}" x2="${cx + w / 2 * k}" y2="${cy + yLow * k + 9}" class="bp-dim" marker-start="url(#bp-arrow)" marker-end="url(#bp-arrow)"/>
      <text x="${cx}" y="${cy + R + 22}" class="bp-small mid bp-decklabel">Passenger deck ${fmt(w, 1)} m wide${two ? ", with an upper deck above" : ""}</text>`;
  }
  // A typical bay seen from the side: two ring frames, longitudinals, crossed bracing, and the keel walkway.
  function baySection(d, f) {
    const x0 = 420, y0 = 436, maxH = 158, sb = Math.min(maxH / d.D, 150 / 15), w = 15 * sb, h = d.D * sb;
    const left = x0 + (150 - w) / 2 + 20, top = y0 + (maxH - h) / 2 + 10;
    const K = 8;
    let g = "";
    for (let k = 0; k <= K; k++) { const y = top + h * k / K; g += `<line x1="${left}" y1="${y}" x2="${left + w}" y2="${y}" class="${k === 0 || k === K ? "bp-ring" : "bp-lon"}"/>`; }
    for (let k = 0; k < K; k++) { const y1 = top + h * k / K, y2 = top + h * (k + 1) / K; g += `<path d="M${left},${y1} L${left + w},${y2} M${left},${y2} L${left + w},${y1}" class="bp-wire"/>`; }
    const lab = (y, t) => `<line x1="${left + w + 4}" y1="${y}" x2="${left + w + 26}" y2="${y}" class="bp-lead"/><text x="${left + w + 30}" y="${y + 4}" class="bp-small">${t}</text>`;
    return `<text x="${x0}" y="420" class="bp-title">Typical bay <tspan class="bp-sub">(looking aft)</tspan></text>
      <rect x="${left - 3}" y="${top}" width="6" height="${h}" class="bp-frame-bar"/><rect x="${left + w - 3}" y="${top}" width="6" height="${h}" class="bp-frame-bar"/>
      ${g}<rect x="${left}" y="${top + h - Math.max(4, h * 0.07)}" width="${w}" height="${Math.max(4, h * 0.07)}" fill="url(#bp-hatch)" class="bp-keelbox"/>
      ${lab(top + 2, "Upper longitudinal")}${lab(top + h * 0.35, "Gas cell space")}${lab(top + h * 0.6, "Diagonal bracing")}${lab(top + h - 2, "Keel walkway")}
      <line x1="${left}" y1="${top + h + 18}" x2="${left + w}" y2="${top + h + 18}" class="bp-dim" marker-start="url(#bp-arrow)" marker-end="url(#bp-arrow)"/>
      <text x="${left + w / 2}" y="${top + h + 34}" class="bp-small mid">15 m (one bay)</text>`;
  }
  function scaleAndTitle(st, d, f, s) {
    const x0 = 790, y0 = 418, marks = [0, 10, 20, 50];
    const bar = marks.map((m, i) => `<line x1="${x0 + m * s}" y1="${y0 + 20}" x2="${x0 + m * s}" y2="${y0 + 30}" class="bp-dim"/><text x="${x0 + m * s}" y="${y0 + 16}" class="bp-small mid">${m}${i === marks.length - 1 ? " m" : ""}</text>`).join("")
      + `<rect x="${x0}" y="${y0 + 24}" width="${10 * s}" height="5" class="bp-barfill"/><rect x="${x0 + 10 * s}" y="${y0 + 24}" width="${10 * s}" height="5" class="bp-barempty"/><rect x="${x0 + 20 * s}" y="${y0 + 24}" width="${30 * s}" height="5" class="bp-barfill"/>`;
    const date = U.sim.dateOf(st.tick).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const rows = [["Type", d.type || "Design study"], ["Length", `${fmt(f.L)} m`], ["Diameter", `${fmt(d.D, 1)} m`], ["Bays", d.bays % 1 ? `${bayText(d.bays)} (15 m; the last 7.5 m)` : `${d.bays} (15 m each)`],
      ["Lifting gas", (d.gas || "hydrogen").replace(/^./, c => c.toUpperCase())], ["Date", date]];
    const ty = 470;
    return `<text x="${x0}" y="${y0 - 2}" class="bp-title">Scale</text>${bar}
      <rect x="${x0}" y="${ty}" width="380" height="170" class="bp-block"/><line x1="${x0}" y1="${ty + 40}" x2="${x0 + 380}" y2="${ty + 40}" class="bp-dim"/>
      <line x1="${x0 + 270}" y1="${ty + 40}" x2="${x0 + 270}" y2="${ty + 170}" class="bp-dim"/>
      <g transform="translate(${x0 + 14} ${ty + 12})">${logoLines()}</g><text x="${x0 + 74}" y="${ty + 24}" class="bp-blocktitle">Drawing Office</text>
      <text x="${x0 + 74}" y="${ty + 36}" class="bp-tiny">${esc(U.state.company.name)}</text>
      ${rows.map(([k, v], i) => `<text x="${x0 + 12}" y="${ty + 60 + i * 18}" class="bp-small">${k}:</text><text x="${x0 + 92}" y="${ty + 60 + i * 18}" class="bp-small strong">${esc(v)}</text>`).join("")}
      <text x="${x0 + 280}" y="${ty + 60}" class="bp-small">General arrangement</text><text x="${x0 + 280}" y="${ty + 76}" class="bp-small">of hull structure</text>
      <text x="${x0 + 280}" y="${ty + 130}" class="bp-small">Drawing No.</text><text x="${x0 + 280}" y="${ty + 146}" class="bp-small strong">DO-${String(st.drawingNo || 1).padStart(3, "0")}</text>
      <text x="${x0 + 280}" y="${ty + 162}" class="bp-small">Scale 1 : ${fmt(Math.round(1000 / s / 5) * 5 * 1)}</text>`;
  }

  // The Figures panel: whether it will fly, and everything the design adds up to.
  function figuresPanel(st, d, f) {
    const status = { fly: ["ok", "It will fly"], heavy: ["warn", "It flies, but heavily"], sink: ["bad", "It will not fly"] }[f.status];
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const gasName = (d.gas || "hydrogen").replace(/^./, c => c.toUpperCase());
    return `<h2>Figures</h2>
      <div class="do-status ${status[0]}">${status[1]}</div>
      <h3>Flight and performance</h3><dl>
        ${row("Length overall", `${fmt(f.L)} m`)}${row("Diameter", `${fmt(d.D, 1)} m`)}${row("Gas volume", `${fmt(Math.round(f.volume / 100) * 100)} m³ (${gasName})`)}
        ${row("Gross lift", `${fmt(f.gross, 1)} t`)}${row("Empty weight", `${fmt(f.empty, 1)} t`)}${row("Useful lift", `${fmt(f.useful, 1)} t`)}
        ${row("Engines", f.engines ? `${f.engines} × ${fmt(f.hpEach)} hp` : "None")}${row("Cruising speed", `${fmt(f.speed)} km/h`)}${row("Range", `${fmt(Math.round(f.range / 50) * 50)} km`)}</dl>
      ${trimGauge(f)}
      <h3>Capacity</h3><dl>
        ${row("Passengers", f.planned ? `${f.berths} (${f.firstBerths} first class)` : `about ${f.berths}`)}${f.planned && f.berths ? row("Comfort", `${f.comfort} of 100`) : ""}${row("Cargo", `${fmt(f.cargoCap, 1)} t`)}${row("Crew", `${f.crew} needed, ${f.crewBerths} berths`)}</dl>
      <h3>Cost and building</h3><dl>
        ${row("Price", money(f.price))}${row("Build time", `${fmt(f.buildDays / 30.4, 1)} months`)}${row("Running cost", `${money(f.daily)} a day`)}${row("Shed needed", f.shed ? f.shed.name : "None large enough")}</dl>
      <h3>Notes</h3><ul class="do-notes">${f.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      <p class="do-foot">Systems, decks, and paint come from the starting design until their tabs arrive.</p>`;
  }

  // The level gauge: a spirit level that tilts with the ship's trim. Green band level, amber flies trimmed, red cannot fly.
  function trimGauge(f) {
    const P_ = P(), deg = Math.max(-12, Math.min(12, f.trim * 100 * 1.2)), off = Math.abs(f.trim);
    const state = off <= P_.LEVEL ? ["ok", "Level"] : off <= P_.LIMIT ? ["warn", `${fmt(Math.abs(deg), 1)}° ${f.trim > 0 ? "nose-up" : "nose-down"}`] : ["bad", "Cannot fly level"];
    // Reads like a see-saw: the heavy end dips, and the weight slides toward it. Bow on the left, as in the drawings.
    const pos = Math.max(-1, Math.min(1, f.trim / (P_.LIMIT * 1.3)));          // below 0: toward the bow
    return `<div class="do-trim"><div class="do-trim-head"><span>Trim</span><span class="do-trim-${state[0]}">${state[1]}</span></div>
      <svg viewBox="0 0 240 46" width="100%" height="46" aria-hidden="true">
        <g transform="rotate(${Math.max(-5, Math.min(5, deg * 0.45)).toFixed(1)} 120 28)">
          <rect x="10" y="16" width="220" height="20" rx="10" class="tg-tube"/>
          <rect x="${120 - 110 * P_.LEVEL / (P_.LIMIT * 1.3)}" y="16" width="${220 * P_.LEVEL / (P_.LIMIT * 1.3)}" height="20" class="tg-ok"/>
          <rect x="${120 - 110 / 1.3}" y="16" width="3" height="20" class="tg-limit"/><rect x="${120 + 110 / 1.3 - 3}" y="16" width="3" height="20" class="tg-limit"/>
          <circle cx="${120 + pos * 100}" cy="26" r="8" class="tg-bubble tg-${state[0]}"/>
          <line x1="120" y1="12" x2="120" y2="40" class="tg-mark"/></g>
        <text x="12" y="10" class="tg-lab">Bow</text><text x="228" y="10" class="tg-lab end">Stern</text></svg>
      <p class="do-trim-note">The heavy end dips.</p></div>`;
  }

  // The Systems tab ---------------------------------------------------------------------------
  // What can be placed: main modules (one a bay), fittings (two a bay, along the keel), and engine pairs (outside the hull).
  const CARDS = [
    { id: "control", name: "Control car", kind: "module", file: "control-car", about: "Navigation and command. Fixed at the bow.", fixed: true },
    { id: "engine", name: "Engine pair", kind: "engine", file: "engine-pair", about: "Two engines, hung under the hull or on its sides." },
    { id: "passenger", name: "Passenger decks", kind: "module", file: "passenger-decks", about: "One or two decks, laid out on the Accommodation tab." },
    { id: "cargo", name: "Cargo hold", kind: "module", file: "cargo-hold", about: "Freight, mail, and baggage." },
    { id: "crew", name: "Crew quarters", kind: "module", file: "crew-quarters", about: "Berths and a mess for the crew." },
    { id: "clear", name: "Clear to gas", kind: "module", file: "clear-to-gas", about: "Nothing below: the gas cell fills the bay." },
    { id: "fuel", name: "Fuel tanks", kind: "fitting", file: "fuel-tanks", about: "Range. Shares a bay; good for trimming." },
    { id: "ballast", name: "Water ballast", kind: "fitting", file: "water-ballast", about: "Needed to land. Shares a bay; good for trimming." }
  ];
  const MODULE_NAMES = { control: "Control car", passenger: "Passenger decks", cargo: "Cargo hold", crew: "Crew quarters" };
  let selBay = null, drag = null, cutGeom = null, hullDrag = null, bpGeom = null;

  function systemsTab(st, d, f) {
    return `<div class="do-sheet do-cutaway">${cutaway(st, d, f)}</div>
      <section class="do-tray" aria-label="Systems modules">
        <div class="do-cards"><h2 class="do-config-title">Systems modules <span>Drag onto a bay</span></h2>
          <div class="do-card-row">${CARDS.map(c => `<button class="do-card${c.fixed ? " fixed" : ""}" data-card="${c.id}" ${c.fixed ? 'aria-disabled="true"' : ""} title="${esc(c.about)}">
            <b>${c.name}</b><span class="do-card-art">${cardArt(c.id)}<img src="img/cards/card-${c.file}.png" alt="" onerror="this.remove()"></span><small>${esc(c.about)}</small></button>`).join("")}</div></div>
        <div class="do-bay" aria-live="polite">${bayPanel(st, d, f)}</div>
      </section>`;
  }

  // The cutaway: gas cells above, modules in the keel space, fittings along the keel, engines outside.
  function cutaway(st, d, f) {
    const W = 1200, H = 470, L = f.L, D = d.D;
    const s = Math.min(1040 / L, 300 / D), x0 = 80 + (1040 - L * s) / 2, cy = 215;
    const X = x => x0 + x * s, Y = y => cy + y * s, r = x => P().radius(d, x);
    const N = 160, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = L * i / N; top.push(`${X(x).toFixed(1)},${Y(-r(x)).toFixed(1)}`); bot.push(`${X(x).toFixed(1)},${Y(r(x)).toFixed(1)}`); }
    const outline = `M${top.join(" L")} L${bot.slice().reverse().join(" L")} Z`;
    const sys = d.systems, bay0 = b => f.ln + (b - 1) * 15, NB = P().bayCount(d), BL = b => P().bayLen(d, b);
    cutGeom = { x0, s, ln: f.ln, bays: NB, end: f.ln + d.bays * 15, top: Y(-D / 2) - 30, bottom: Y(D / 2) + 40 };
    // Gas cells: one to a bay, and more through the nose and tail; they fill the bay where it is clear to gas.
    const cell = (a, b, lowShare) => {
      // A soft bag: its top and bottom swell toward the middle and round off at the ends.
      const pts = [], n = 18;
      for (let i = 0; i <= n; i++) { const t = i / n, x = a + (b - a) * t, g = Math.pow(Math.sin(Math.PI * t), 0.45); pts.push(`${X(x).toFixed(1)},${Y(-r(x) * (0.72 + 0.18 * g)).toFixed(1)}`); }
      for (let i = n; i >= 0; i--) { const t = i / n, x = a + (b - a) * t, g = Math.pow(Math.sin(Math.PI * t), 0.45); pts.push(`${X(x).toFixed(1)},${Y(r(x) * lowShare * (0.82 + 0.18 * g)).toFixed(1)}`); }
      return `<path d="M${pts.join(" L")} Z" class="cw-cell"/>`;
    };
    let cells = "";
    const nosePieces = Math.max(1, Math.round(f.ln / 12));
    for (let i = 0; i < nosePieces; i++) cells += cell(f.ln * i / nosePieces + (i ? 0.5 : f.ln * 0.08), f.ln * (i + 1) / nosePieces - 0.5, 0.86);
    for (let b = 1; b <= NB; b++) cells += cell(bay0(b) + 0.6, bay0(b) + BL(b) - 0.6, sys.modules[b] ? 0.36 : 0.86);
    for (let x = f.ln + f.mid; x < L - 6; x += 15) cells += cell(x + 0.6, Math.min(L - 3, x + 14.4), 0.86);
    // Framework, drawn light over the cells.
    let frame = "";
    for (let b = 0; b <= NB; b++) { const x = Math.min(f.ln + b * 15, f.ln + d.bays * 15); frame += `<line x1="${X(x)}" y1="${Y(-r(x))}" x2="${X(x)}" y2="${Y(r(x))}" class="cw-ring"/>`; }
    for (let k = 1; k < 9; k++) { const c = Math.cos(k * Math.PI / 9), pts = []; for (let i = 0; i <= N; i += 2) { const x = L * i / N; pts.push(`${X(x).toFixed(1)},${Y(r(x) * c).toFixed(1)}`); } frame += `<polyline points="${pts.join(" ")}" class="cw-lon"/>`; }
    // Modules in the keel space, and fittings in two slots along the keel.
    let mods = "", fits = "";
    for (let b = 1; b <= NB; b++) {
      const a = bay0(b) + 0.8, e = bay0(b) + BL(b) - 0.8, yt = r(a) * 0.4, yb = r(a) * 0.82, m = sys.modules[b];
      if (m) mods += `<g data-item="module:${b}" class="cw-mod">${moduleDrawing(m, X(a), Y(yt), (e - a) * s, (yb - yt) * s, (sys.deckCount || {})[b] || 1, f.twoDecksOk)}</g>`;
      (sys.fittings[b] || []).forEach((k, i) => {
        const fw = BL(b) === 15 ? 6 : 2.8, fa = bay0(b) + 1 + i * (fw + 0.8), fy = r(a) * 0.84, fh = Math.max(1.4, D * 0.07);
        fits += `<g data-item="fit:${b}:${i}" class="cw-fit"><rect x="${X(fa)}" y="${Y(fy)}" width="${fw * s}" height="${fh * s}" rx="${fh * s / 2}" class="cw-${k}"/>
          <line x1="${X(fa) + fh * s * 0.5}" y1="${Y(fy) + fh * s * 0.3}" x2="${X(fa + fw) - fh * s * 0.5}" y2="${Y(fy) + fh * s * 0.3}" class="cw-shine"/></g>`;
      });
    }
    // Engines: under the hull, or on outriggers at the sides.
    const engs = sys.engines.map(en => `<g data-item="eng:${en.bay}" class="cw-eng">${engineCar(P().bayCentre(d, f.ln, en.bay), en.mount, r, X, Y, s, D)}</g>`).join("");
    const car = carDrawing(d, f, X, Y, r, s).replace(/class="bp-car"/g, 'class="cw-car"').replace(/class="bp-win"/g, 'class="cw-win"');
    const finsD = finsDrawing(d, f, X, Y, r, s);
    // Bays you can drop onto, numbered below.
    let hits = "", nums = "";
    const yB = Y(D / 2) + 46;
    for (let b = 1; b <= NB; b++) {
      const a = bay0(b), sel = selBay === b;
      hits += `<rect x="${X(a)}" y="${Y(-D / 2) - 6}" width="${BL(b) * s}" height="${D * s + 40}" class="cw-hit${sel ? " sel" : ""}" data-bay="${b}" tabindex="0" role="button" aria-label="Bay ${b}${sys.modules[b] ? ", " + (MODULE_NAMES[sys.modules[b]] || sys.modules[b]) : ", clear to gas"}"/>`;
      nums += `<text x="${X(a + BL(b) / 2)}" y="${yB}" class="bp-small mid${sel ? " cw-selnum" : ""}">${P().isHalf(d, b) ? (b - 1) + "½" : b}</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="bp cw" role="img" aria-label="Cutaway of the ship showing gas cells, modules, fittings, and engines">
      <defs>${cutawayDefs()}</defs>
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" class="bp-frame"/>
      <text x="30" y="36" class="bp-title">Side cutaway <tspan class="bp-sub">(port side)</tspan></text>
      <path d="${outline}" class="cw-skin"/>${cells}${frame}${hits}${mods}${fits}${finsD}<path d="${outline}" class="bp-outline"/>${car}${engs}
      ${nums}<text x="${X(f.ln + f.mid / 2)}" y="${yB + 22}" class="bp-label mid">Bays, numbered from the bow</text>
      <g class="cw-legend" transform="translate(30 ${H - 34})">
        <rect width="16" height="9" rx="4.5" class="cw-fuel"/><text x="22" y="9" class="bp-small">Fuel</text>
        <rect x="70" width="16" height="9" rx="4.5" class="cw-ballast"/><text x="92" y="9" class="bp-small">Water ballast</text>
        <text x="200" y="9" class="bp-small">Click a bay to see what is in it. Drag anything out of the hull to remove it.</text></g>
    </svg>`;
  }
  function engineCar(x, mount, r, X, Y, s, D) {
    const len = Math.max(5, D * 0.26), h = Math.max(1.8, D * 0.08);
    const yb = mount === "sides" ? r(x) * 0.5 : r(x) + D * 0.1;
    const struts = mount === "sides"
      ? `<line x1="${X(x - len * 0.15)}" y1="${Y(r(x) * 0.3)}" x2="${X(x - len * 0.15)}" y2="${Y(yb)}" class="cw-strut"/><line x1="${X(x + len * 0.2)}" y1="${Y(r(x) * 0.3)}" x2="${X(x + len * 0.2)}" y2="${Y(yb)}" class="cw-strut"/>`
      : `<line x1="${X(x - len * 0.2)}" y1="${Y(r(x) * 0.98)}" x2="${X(x - len * 0.2)}" y2="${Y(yb)}" class="cw-strut"/><line x1="${X(x + len * 0.25)}" y1="${Y(r(x) * 0.98)}" x2="${X(x + len * 0.25)}" y2="${Y(yb)}" class="cw-strut"/>`;
    return `${struts}<path d="M${X(x - len / 2)},${Y(yb + h / 2)} C${X(x - len / 2)},${Y(yb - h * 0.2)} ${X(x + len * 0.3)},${Y(yb - h * 0.1)} ${X(x + len / 2)},${Y(yb + h / 2)} C${X(x + len * 0.3)},${Y(yb + h * 1.1)} ${X(x - len / 2)},${Y(yb + h * 1.2)} ${X(x - len / 2)},${Y(yb + h / 2)} Z" class="cw-nacelle"/>
      <ellipse cx="${X(x - len / 2 - 0.6)}" cy="${Y(yb + h / 2)}" rx="${Math.max(1, 0.35 * s)}" ry="${h * 1.4 * s}" class="cw-prop"/>`;
  }
  // What each module looks like in the cutaway.
  function moduleDrawing(m, x, y, w, h, decks, twoOk) {
    if (m === "control") {
      let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="cw-room cw-controlroom"/>`;
      for (let i = 0; i < 3; i++) g += `<circle cx="${x + w * (0.25 + i * 0.25)}" cy="${y + h * 0.55}" r="${Math.min(w, h) * 0.12}" class="cw-dial"/>`;
      return g;
    }
    if (m === "passenger") {
      const n = twoOk ? decks : 1, dh = h / n;
      let g = "";
      for (let k = 0; k < n; k++) {
        const yy = y + k * dh;
        g += `<rect x="${x}" y="${yy}" width="${w}" height="${dh}" class="cw-room cw-pax"/>`;
        const wins = Math.max(3, Math.floor(w / 9));
        for (let i = 0; i < wins; i++) g += `<rect x="${x + 3 + i * (w - 6) / wins}" y="${yy + dh * 0.25}" width="${(w - 6) / wins * 0.6}" height="${dh * 0.35}" class="cw-lit"/>`;
        g += `<line x1="${x}" y1="${yy + dh}" x2="${x + w}" y2="${yy + dh}" class="cw-floor"/>`;
      }
      return g;
    }
    if (m === "cargo") {
      let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="cw-room cw-hold"/>`;
      const c = Math.min(h * 0.42, w / 5);
      for (let i = 0; i < 4; i++) g += `<rect x="${x + 4 + i * (c + 3)}" y="${y + h - c - 2}" width="${c}" height="${c}" class="cw-crate"/>`;
      g += `<rect x="${x + 4 + c * 0.5}" y="${y + h - c * 2 - 4}" width="${c}" height="${c}" class="cw-crate"/><rect x="${x + 4 + c * 1.6}" y="${y + h - c * 2 - 4}" width="${c}" height="${c}" class="cw-crate"/>`;
      return g;
    }
    if (m === "crew") {
      let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="cw-room cw-crewroom"/>`;
      const bw = Math.min(w / 4, 26);
      for (let i = 0; i < 3; i++) { const bx = x + 4 + i * (bw + 4); g += `<rect x="${bx}" y="${y + h * 0.2}" width="${bw}" height="${h * 0.14}" class="cw-bunk"/><rect x="${bx}" y="${y + h * 0.6}" width="${bw}" height="${h * 0.14}" class="cw-bunk"/>`; }
      return g;
    }
    return "";
  }
  function cutawayDefs() {
    return `<radialGradient id="cw-gas" cx="0.38" cy="0.3" r="0.78"><stop offset="0" stop-color="#fffdf5"/><stop offset="0.5" stop-color="#f1e7cd"/><stop offset="0.85" stop-color="#d9c9a3"/><stop offset="1" stop-color="#b9a47a"/></radialGradient>
      <linearGradient id="cw-paxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a86f3e"/><stop offset="1" stop-color="#7d4f2a"/></linearGradient>`;
  }
  // Small drawn stand-ins for the card pictures, until the painted ones arrive.
  function cardArt(id) {
    const a = {
      control: `<rect x="8" y="14" width="44" height="14" rx="6" fill="#b8b3a4" stroke="#3a3228"/><g fill="#2d3f66">${[14, 22, 30, 38].map(x => `<rect x="${x}" y="17" width="5" height="5"/>`).join("")}</g><line x1="16" y1="14" x2="18" y2="8" stroke="#3a3228"/><line x1="44" y1="14" x2="42" y2="8" stroke="#3a3228"/>`,
      engine: `<path d="M12,20 C12,12 38,12 44,20 C38,28 12,28 12,20 Z" fill="#9aa3a8" stroke="#3a3228"/><ellipse cx="9" cy="20" rx="2" ry="11" fill="#6b4529" opacity="0.8"/><line x1="24" y1="13" x2="24" y2="5" stroke="#3a3228"/><line x1="34" y1="13" x2="34" y2="5" stroke="#3a3228"/>`,
      passenger: `<rect x="6" y="8" width="48" height="22" fill="#a86f3e" stroke="#3a3228"/><line x1="6" y1="19" x2="54" y2="19" stroke="#3a3228"/><g fill="#fff1c4">${[10, 20, 30, 40].map(x => `<rect x="${x}" y="11" width="6" height="5"/><rect x="${x}" y="22" width="6" height="5"/>`).join("")}</g>`,
      cargo: `<g fill="#b58b54" stroke="#3a3228">${[[8, 16], [22, 16], [36, 16], [15, 4], [29, 4]].map(([x, y]) => `<rect x="${x}" y="${y}" width="13" height="12"/><line x1="${x}" y1="${y}" x2="${x + 13}" y2="${y + 12}"/>`).join("")}</g>`,
      crew: `<rect x="6" y="6" width="48" height="24" fill="#9aa3a8" stroke="#3a3228"/><g fill="#6b5a43">${[10, 26, 42].map(x => `<rect x="${x - 2}" y="10" width="12" height="3"/><rect x="${x - 2}" y="20" width="12" height="3"/>`).join("")}</g>`,
      clear: `<ellipse cx="30" cy="18" rx="24" ry="13" fill="#f3ecd8" stroke="#3a3228"/><path d="M8,18 H52 M30,5 V31 M13,9 L47,27 M13,27 L47,9" stroke="#3a3228" stroke-width="0.6" opacity="0.5"/>`,
      fuel: `<g stroke="#3a3228">${[8, 18, 28].map(y => `<rect x="8" y="${y}" width="44" height="7" rx="3.5" fill="#4f6b3a"/>`).join("")}</g>`,
      ballast: `<g stroke="#3a3228"><rect x="8" y="10" width="44" height="9" rx="4.5" fill="#3f5f8a"/><ellipse cx="18" cy="27" rx="9" ry="5" fill="#7d8b8f"/><ellipse cx="40" cy="27" rx="9" ry="5" fill="#7d8b8f"/></g>`
    }[id];
    return `<svg viewBox="0 0 60 36" aria-hidden="true">${a}</svg>`;
  }
  // The panel for the selected bay: what is there, and what can be changed.
  function bayPanel(st, d, f) {
    if (!selBay || selBay > P().bayCount(d)) return `<h3>Selected bay</h3><p class="do-hint">Click a bay to see what is in it. Drag a module onto a bay to place it there, or drag anything out of the hull to remove it.</p>`;
    const b = selBay, sys = d.systems, m = sys.modules[b], fits = sys.fittings[b] || [], eng = sys.engines.find(e => e.bay === b);
    const decks = (sys.deckCount || {})[b] || 1;
    return `<h3>${P().isHalf(d, b) ? `Half bay ${b - 1}½` : `Bay ${b}`}</h3>${P().isHalf(d, b) ? `<p class="do-hint">A half bay holds gas, fittings, and engines, but no module.</p>` : ""}
      <p class="do-bay-mod">${m ? MODULE_NAMES[m] : "Clear to gas"}${m && m !== "control" ? ` <button class="btn-quiet" data-clear-bay="${b}">Clear</button>` : ""}</p>
      ${m === "passenger" ? `<div class="do-seg" role="group" aria-label="Decks">${[1, 2].map(n => `<button data-decks="${n}" aria-pressed="${decks === n}" ${n === 2 && !f.twoDecksOk ? "disabled" : ""}>${n === 1 ? "One deck" : "Two decks"}</button>`).join("")}</div>
        ${!f.twoDecksOk ? `<small class="do-hint">Two decks need a hull at least ${P().TWO_DECKS} m wide.</small>` : ""}` : ""}
      <h4>Fittings (up to 2)</h4>
      ${fits.length ? `<ul class="do-list">${fits.map((k, i) => `<li>${k === "fuel" ? "Fuel tanks" : "Water ballast"} <button class="btn-quiet" data-remove-fit="${i}" aria-label="Remove">✕</button></li>`).join("")}</ul>` : `<p class="do-hint">None</p>`}
      <h4>Engines</h4>
      ${eng ? `<div class="do-seg" role="group" aria-label="Engine mounting">${[["below", "Under the hull"], ["sides", "On the sides"]].map(([k, n]) => `<button data-mount="${k}" aria-pressed="${eng.mount === k}">${n}</button>`).join("")}</div>
        <button class="btn-quiet do-rm" data-remove-eng="${b}">Remove the engines</button>` : `<p class="do-hint">None</p>`}`;
  }

  // Placing things: drop a card onto a bay, or move something already placed.
  function place(kind, bay, from) {
    const d = draft(U.state), sys = d.systems;
    if (from) remove(from);
    const card = CARDS.find(c => c.id === kind);
    if (!card || card.fixed) return;
    if (card.kind === "module") {
      if (bay === 1) { note("Bay 1 holds the control car."); if (from) undoRemove(from); return; }
      if (P().isHalf(d, bay)) { note("A half bay holds gas, fittings, and engines, but no module."); if (from) undoRemove(from); return; }
      if (kind === "clear") { delete sys.modules[bay]; if (sys.deckCount) delete sys.deckCount[bay]; }
      else sys.modules[bay] = kind;
    }
    if (card.kind === "fitting") {
      const list = sys.fittings[bay] = sys.fittings[bay] || [];
      if (list.length >= 2) { note(`Bay ${bay} already has two fittings.`); if (from) undoRemove(from); return; }
      list.push(kind);
    }
    if (card.kind === "engine") {
      if (sys.engines.some(e => e.bay === bay)) { note(`Bay ${bay} already has an engine pair.`); if (from) undoRemove(from); return; }
      sys.engines.push({ bay, mount: from && from.mount || "below" });
    }
    selBay = bay;
  }
  let lastRemoved = null;
  function remove(item) {
    const sys = draft(U.state).systems;
    lastRemoved = JSON.parse(JSON.stringify(sys));
    if (item.type === "module") { delete sys.modules[item.bay]; if (sys.deckCount) delete sys.deckCount[item.bay]; }
    if (item.type === "fit") { sys.fittings[item.bay].splice(item.i, 1); if (!sys.fittings[item.bay].length) delete sys.fittings[item.bay]; }
    if (item.type === "eng") sys.engines = sys.engines.filter(e => e.bay !== item.bay);
  }
  function undoRemove() { if (lastRemoved) draft(U.state).systems = lastRemoved; }

  // Dragging, with pointer events so it works with a mouse, a pen, or a finger.
  function onPointerDown(e) {
    if (pop && !e.target.closest(".do-pop") && !e.target.closest("[data-color]")) closePalette();
    if (tab === "accommodation" && e.target.closest && e.target.closest("svg.do-deck")) {
      const d = draft(U.state);
      accCtx = U.decks.context(d, accDeck);
      const cell = accCell(e); if (!cell) return;
      e.preventDefault();
      U.decks.paintStart(accCtx, cell.r, cell.c, accTool);
      accRedraw();
      if (accTool === "first") { accCtx = null; refreshFigures(); }
      return;
    }
    if (tab === "paint" && e.target.closest && e.target.closest("[data-drag]")) {
      paintDrag = { item: e.target.closest("[data-drag]").dataset.drag };
      paintSel = paintDrag.item; e.preventDefault(); return;
    }
    const h = e.target.closest && e.target.closest("[data-handle]");
    if (h && tab === "hull") {
      const d = draft(U.state), svg = root.querySelector("svg.bp");
      hullDrag = { kind: h.dataset.handle, x0: bpGeom.x0, s: bpGeom.s, cx: e.clientX, cy: e.clientY, bays: d.bays, cont: d.bays, D: d.D, unit: svg.getScreenCTM().a };
      e.preventDefault(); kick(); return;
    }
    if (tab !== "systems") return;
    const card = e.target.closest("[data-card]"), item = e.target.closest("[data-item]");
    if (!card && !item) return;
    let kind, from = null;
    if (card) { const c = CARDS.find(x => x.id === card.dataset.card); if (c.fixed) return; kind = c.id; }
    else {
      const [t, b, i] = item.dataset.item.split(":"), sys = draft(U.state).systems;
      if (t === "module") { kind = sys.modules[b]; if (kind === "control") return; }
      if (t === "fit") kind = sys.fittings[b][+i];
      if (t === "eng") kind = "engine";
      from = { type: t, bay: +b, i: +i, mount: t === "eng" ? (sys.engines.find(x => x.bay === +b) || {}).mount : null };
    }
    const ghost = document.createElement("div");
    ghost.className = "do-ghost"; ghost.innerHTML = cardArt(kind === "engine" ? "engine" : kind);
    document.body.appendChild(ghost);
    drag = { kind, from, ghost, x0: e.clientX, y0: e.clientY, moved: false, card };
    moveGhost(e);
    e.preventDefault();
  }
  function bayAt(e) {
    const svg = root.querySelector("svg.cw");
    if (!svg || !cutGeom) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (p.y < cutGeom.top || p.y > cutGeom.bottom) return null;
    const xm = (p.x - cutGeom.x0) / cutGeom.s;
    if (xm > cutGeom.end) return null;
    const b = Math.floor((xm - cutGeom.ln) / 15) + 1;
    return b >= 1 && b <= cutGeom.bays ? b : null;
  }
  function moveGhost(e) {
    if (hullDrag) { dragHull(e); return; }
    if (accCtx && U.decks.painting()) { const cell = accCell(e); if (cell) { U.decks.paintAt(accCtx, cell.r, cell.c); accRedraw(); } return; }
    if (paintDrag) { paintMove(e); return; }
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
    drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px";
    drag.ghost.style.visibility = drag.moved ? "visible" : "hidden";
    drag.ghost.style.pointerEvents = "none";
    const b = bayAt(e);
    root.querySelectorAll(".cw-hit").forEach(h => h.classList.toggle("over", +h.dataset.bay === b));
  }
  function onPointerUp(e) {
    if (hullDrag) { const d = draft(U.state); if (hullDrag.kind === "length") d.bays = Math.round(hullDrag.cont * 2) / 2; hullDrag = null; trimSystems(d); render(); kick(); return; }
    if (accCtx) { U.decks.paintEnd(); accCtx = null; refreshFigures(); return; }
    if (paintDrag) { paintDrag = null; render(); return; }
    if (!drag) return;
    const dd = drag; drag = null; dd.ghost.remove();
    root.querySelectorAll(".cw-hit.over").forEach(h => h.classList.remove("over"));
    if (!dd.moved) {
      // A click rather than a drag: on a card, place into the selected bay; on an item, select its bay.
      if (dd.card && selBay) { place(dd.kind, selBay, null); refresh(); }
      else if (dd.from) { selBay = dd.from.bay; refresh(); }
      return;
    }
    const b = bayAt(e);
    if (b) place(dd.kind, b, dd.from);
    else if (dd.from) remove(dd.from);                // dragged out of the hull: removed
    refresh();
  }
  // Dragging the stern handle adds or removes whole bays; dragging the top handle changes the diameter.
  function dragHull(e) {
    const st = U.state, d = draft(st), lim = P().limits(st), g = hullDrag;
    const metres = px => px / g.unit / g.s;
    if (g.kind === "length") {
      g.cont = Math.max(2, Math.min(lim.maxBays, g.bays + metres(e.clientX - g.cx) / 15));
      const snapped = Math.round(g.cont * 2) / 2;
      if (snapped !== d.bays) { d.bays = snapped; refreshFigures(); }
      kick(); return;
    }
    const D = Math.max(lim.minD, Math.min(lim.maxD, Math.round((g.D - 2 * metres(e.clientY - g.cy)) * 2) / 2));
    if (D === d.D) return;
    d.D = D; refreshFigures(); kick();
    const big = root.querySelector(".do-big"); if (big) big.textContent = `${fmt(d.D, 1)} m`;
  }
  function refreshFigures() { const st = U.state, d = draft(st); root.querySelector(".do-figures").innerHTML = figuresPanel(st, d, P().figures(st, d)); }
  // Redraw the cutaway, the bay panel, and the figures without rebuilding the whole office.
  function refresh() {
    const st = U.state, d = draft(st), f = P().figures(st, d);
    const sheet = root.querySelector(".do-sheet"); if (sheet) sheet.innerHTML = tab === "systems" ? cutaway(st, d, f) : blueprint(st, d, f);
    const bp = root.querySelector(".do-bay"); if (bp) bp.innerHTML = bayPanel(st, d, f);
    root.querySelector(".do-figures").innerHTML = figuresPanel(st, d, f);
  }

  // The Accommodation tab -------------------------------------------------------------------
  let accDeck = "lower", accTool = "cabin", accGrid = false, accCtx = null;
  function accTab(st, d, f) {
    const D = U.decks, lower = D.context(d, "lower"), upper = D.context(d, "upper");
    if (accDeck === "upper" && !upper.cols.length) accDeck = "lower";
    const ctx = accDeck === "upper" ? upper : lower;
    const tools = Object.entries(D.TYPES).map(([k, t]) => `<button data-acc-tool="${k}" aria-pressed="${accTool === k}"><span class="sw" style="background:${t.sw}"></span>${t.name}</button>`).join("")
      + `<button data-acc-tool="first" aria-pressed="${accTool === "first"}" title="Click a cabin to make it first class, or back"><span class="sw sw-first">1</span>First class</button>`
      + `<button data-acc-tool="erase" aria-pressed="${accTool === "erase"}"><span class="sw" style="background:#e4d8bb"></span>Clear a square</button>`;
    const head = `<div class="do-acc-bar">
        <div class="do-seg" role="group" aria-label="Deck"><button data-acc-deck="lower" aria-pressed="${accDeck === "lower"}">Lower deck</button><button data-acc-deck="upper" aria-pressed="${accDeck === "upper"}" ${upper.cols.length ? "" : "disabled"}>Upper deck</button></div>
        <span class="do-acc-info">${ctx.cols.length ? `${ctx.bays.length} bay${ctx.bays.length > 1 ? "s" : ""}, ${ctx.rows} squares wide. Each stroke paints one room; start inside a room to extend it.` : ""}</span>
        <button class="btn-quiet" data-acc="grid" aria-pressed="${accGrid}">Show the grid</button><button class="btn-quiet" data-acc="standard">Standard layout</button><button class="btn-quiet" data-acc="clear">Clear this deck</button></div>`;
    if (!ctx.cols.length) return `<div class="do-sheet do-later"><p>This ship has no passenger decks. Place a passenger deck module in a bay on the Systems tab, then lay it out here.</p></div>`;
    return `${head}<div class="do-sheet do-accsheet">${accSvg(ctx)}</div><div class="do-palette" role="group" aria-label="Room type">${tools}</div>`;
  }
  function accSvg(ctx) {
    const W = ctx.width, H = ctx.rows * U.decks.S, pad = 40;
    return `<svg viewBox="${-pad - 30} ${-pad} ${W + pad * 2 + 130} ${H + pad * 2 + 60}" class="bp do-deck" data-deck="${ctx.deck}" aria-label="Deck plan, seen from above: bow to the left">
      <defs>${U.decks.defs()}</defs>
      ${U.decks.render(ctx, { grid: accGrid })}
      <text x="${W / 2}" y="${-24}" class="bp-small mid">Port side</text><text x="${W / 2}" y="${H + 42}" class="bp-small mid">Starboard side</text>
      <text x="-22" y="${H / 2}" class="bp-small mid" transform="rotate(-90 -22 ${H / 2})">Bow</text><text x="${W + 72}" y="${H / 2}" class="bp-small mid" transform="rotate(90 ${W + 72} ${H / 2})">Stern</text></svg>`;
  }
  function accCell(e) {
    const svg = root.querySelector("svg.do-deck"); if (!svg || !accCtx) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()), S = U.decks.S;
    const r = Math.floor(p.y / S), c = accCtx.cols.findIndex((col, i) => p.x >= accCtx.colX(i) && p.x < accCtx.colX(i) + S);
    return r >= 0 && r < accCtx.rows && c >= 0 ? { r, c } : null;
  }
  function accRedraw() { const sh = root.querySelector(".do-accsheet"); if (sh && accCtx) sh.innerHTML = accSvg(accCtx); }

  // The Paint tab ---------------------------------------------------------------------------
  let paintSel = null, paintDrag = null, paintGeom = null, pop = null;
  function paintTab(st, d, f) {
    const lv = d.livery, L = U.livery;
    const chip = (target, color, label, nullable) => `<button class="do-chip" data-color="${target}" ${nullable ? 'data-nullable="1"' : ""} aria-label="${label}: ${color || "none"}"><span style="background:${color || "transparent"}" class="${color ? "" : "none"}"></span>${label}</button>`;
    const presets = Object.entries(L.presets(st)).map(([k, p]) => `<button class="do-preset" data-livery="${k}" aria-pressed="${lv.preset === k}">
      <span class="do-preset-bar"><i style="background:${p.hull}"></i><i style="background:${p.fins}"></i>${(p.decorations || []).slice(0, 2).map(x => `<i style="background:${x.color}"></i>`).join("")}</span>${p.label}</button>`).join("");
    const decos = lv.decorations.map((dc, i) => {
      const T = L.DECOR[dc.type];
      return `<li class="do-deco"><div class="do-deco-head">${chip("deco:" + i, dc.color, T.name)}<button class="btn-quiet" data-deco-remove="${i}" aria-label="Remove ${T.name}">✕</button></div>
        ${T.params.map(([k, n, lo, hi, def, step]) => `<label class="do-slider"><span>${n}</span><input type="range" min="${lo}" max="${hi}" step="${step || (hi - lo) / 100}" value="${dc[k] ?? def}" data-deco="${i}:${k}"></label>`).join("")}
        ${T.flag ? `<label class="do-check"><input type="checkbox" data-deco-flag="${i}" ${dc.flag ? "checked" : ""}> ${T.flag}</label>` : ""}</li>`;
    }).join("");
    const addable = Object.entries(L.DECOR).filter(([k, T]) => !T.max || !lv.decorations.some(x => x.type === k));
    return `<div class="do-sheet do-paintsheet">${paintSvg(st, d, f)}</div>
      <section class="do-paint" aria-label="Paint">
        <div class="do-pcol"><h2 class="do-config-title">Livery presets</h2><div class="do-presets">${presets}</div></div>
        <div class="do-pcol"><h2 class="do-config-title">Paint</h2><div class="do-chips">
          ${chip("hull", lv.hull, "Hull")}${chip("fins", lv.fins, "Fins")}${chip("rudders", lv.rudders, "Rudders")}
          ${chip("nose", lv.nose, "Nose cap", true)}${chip("tail", lv.tail, "Tail cone", true)}${chip("car", lv.car, "Control car")}${chip("engines", lv.engines, "Engine cars")}
          ${chip("gondolas", lv.gondolas, "Passenger gondolas")}</div>
          <label class="do-check"><input type="checkbox" data-twotone ${lv.twoTone ? "checked" : ""}> Two-tone hull</label>
          ${lv.twoTone ? `<div class="do-row">${chip("lower", lv.lower, "Lower hull")}<label class="do-slider"><span>Split</span><input type="range" min="-0.6" max="0.8" step="0.01" value="${lv.split}" data-split></label></div>` : ""}</div>
        <div class="do-pcol do-pdeco"><h2 class="do-config-title">Decorations <span>${lv.decorations.length} of 6</span></h2>
          <ul class="do-decos">${decos || `<li class="do-hint">None yet.</li>`}</ul>
          ${lv.decorations.length < 6 ? `<select data-deco-add><option value="">Add a decoration…</option>${addable.map(([k, T]) => `<option value="${k}">${T.name}</option>`).join("")}</select>` : ""}</div>
        <div class="do-pcol"><h2 class="do-config-title">Name and emblem</h2>
          <label class="do-field-s"><span>Ship's name</span><input type="text" maxlength="24" value="${esc(lv.name.text)}" data-name-text placeholder="Name this design's ships"></label>
          <div class="do-seg" role="group" aria-label="Lettering">${Object.entries(L.FONTS).map(([k, F]) => `<button data-font="${k}" aria-pressed="${lv.name.font === k}" style="font-family:${F.css.replace(/"/g, "'")};font-weight:${F.weight}">${F.name}</button>`).join("")}</div>
          <div class="do-row">${chip("name", lv.name.color, "Lettering")}<label class="do-slider"><span>Size</span><input type="range" min="0.5" max="2" step="0.05" value="${lv.name.size}" data-name-size></label></div>
          <div class="do-row"><span class="do-label">Emblems: ${lv.emblems.length} of 3</span>${lv.emblems.length < 3 ? `<button class="btn-quiet" data-emblem-add>Add</button>` : ""}${paintSel && paintSel.startsWith("emblem") ? `<button class="btn-quiet" data-emblem-remove>Remove selected</button>` : ""}</div>
          ${paintSel && paintSel.startsWith("emblem") && lv.emblems[+paintSel.split(":")[1]] ? `<label class="do-slider"><span>Size</span><input type="range" min="0.4" max="2" step="0.05" value="${lv.emblems[+paintSel.split(":")[1]].size}" data-emblem-size></label>` : ""}
          <p class="do-hint">Drag the name and emblems on the ship. They snap to guide lines; hold Alt to place freely. Arrow keys nudge the selected one.</p></div>
      </section>`;
  }
  function paintSvg(st, d, f) {
    const W = 1200, H = 540, L = f.L, D = d.D;
    const s = Math.min(1000 / L, 230 / D), x0 = 100 + (1000 - L * s) / 2, cy = 200;
    const X = x => x0 + x * s, Y = y => cy + y * s;
    paintGeom = { s, x0, cy, L, D };
    const s2 = Math.min(760 / L, 70 / D), tx0 = 220 + (760 - L * s2) / 2, tcy = 478;
    const TX = x => tx0 + x * s2, TY = y => tcy + y * s2;
    const sel = paintSel ? selectionBox(d, f, X, Y) : "";
    const guides = paintDrag && paintDrag.guides ? paintDrag.guides.map(g => g.x != null ? `<line x1="${X(g.x)}" y1="${Y(-D * 0.8)}" x2="${X(g.x)}" y2="${Y(D * 0.8)}" class="lv-guide"/>` : `<path d="${guidePath(d, f, X, Y, g.y)}" class="lv-guide"/>`).join("") : "";
    return `<svg viewBox="0 0 ${W} ${H}" class="bp lv-view" aria-label="Exterior view of the design in its livery, and as seen from above">
      <defs><linearGradient id="lv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fbad0"/><stop offset="0.7" stop-color="#e9e2cf"/><stop offset="1" stop-color="#e2d6b8"/></linearGradient></defs>
      <rect x="6" y="6" width="${W - 12}" height="404" fill="url(#lv-sky)"/>
      <path d="M6,330 C200,300 380,318 560,306 C760,292 940,316 1194,300 L1194,410 L6,410 Z" fill="#b9c2c4" opacity="0.6"/>
      <path d="M6,372 C300,360 800,366 1194,356 L1194,410 L6,410 Z" fill="#a9a877" opacity="0.7"/>
      <image href="img/paint-backdrop.png" x="6" y="6" width="${W - 12}" height="404" preserveAspectRatio="xMidYMid slice" onerror="this.remove()"/>
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" class="bp-frame"/>
      <text x="30" y="34" class="bp-title">Exterior view <tspan class="bp-sub">(port side)</tspan></text>
      <g class="lv-ship">${U.livery.side(d, f, X, Y)}</g>${guides}${sel}
      <rect x="6" y="410" width="${W - 12}" height="${H - 416}" fill="#ebe0c4"/><line x1="16" y1="410" x2="${W - 16}" y2="410" class="bp-rule"/>
      <text x="30" y="438" class="bp-title">Seen from above <tspan class="bp-sub">(as on the map)</tspan></text>
      <g>${U.livery.top(d, f, TX, TY)}</g></svg>`;
  }
  function guidePath(d, f, X, Y, fy) {
    const pts = []; for (let i = 0; i <= 60; i++) { const x = f.L * i / 60; pts.push(`${X(x).toFixed(1)},${Y(P().radius(d, x) * fy).toFixed(1)}`); }
    return "M" + pts.join(" L");
  }
  function selectionBox(d, f, X, Y) {
    const lv = d.livery, R = d.D / 2;
    if (paintSel === "name" && lv.name.text) { const x = f.L * lv.name.x, y = lv.name.y * P().radius(d, x), h = R * 0.4 * lv.name.size;
      return `<rect x="${X(x) - 6}" y="${Y(y - h / 2) - 4}" width="${(Y(h) - Y(0)) * lv.name.text.length * 0.72 + 12}" height="${Y(h) - Y(0) + 8}" class="lv-sel"/>`; }
    if (paintSel && paintSel.startsWith("emblem")) { const e = lv.emblems[+paintSel.split(":")[1]]; if (!e) return "";
      const x = f.L * e.x, y = U.livery.emblemY(e, P().radius(d, x), R), sz = Y(R * 0.55 * e.size) - Y(0);
      return `<rect x="${X(x) - sz / 2 - 4}" y="${Y(y) - sz / 2 - 4}" width="${sz + 8}" height="${sz + 8}" class="lv-sel"/>`; }
    return "";
  }
  // Dragging the name and emblems, with snapping to the centre line, the two-tone split, and the middle of each bay.
  function paintMove(e) {
    const st = U.state, d = draft(st), f = P().figures(st, d), lv = d.livery, g = paintGeom, svg = root.querySelector("svg.lv-view");
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const xm = Math.max(0.02 * f.L, Math.min(0.98 * f.L, (p.x - g.x0) / g.s)), ym = (p.y - g.cy) / g.s, r = P().radius(d, xm), R = d.D / 2;
    let fx = xm / f.L, fy, guides = [];
    const fin = U.livery.finShapes(d, f);
    const onFin = paintDrag.item !== "name" && Math.abs(ym) > r && xm >= fin.x0 && xm <= fin.x1;
    if (onFin) { const out = Math.min(fin.proj * 0.95, Math.abs(ym) - r) / R; fy = Math.sign(ym) * (1 + Math.max(0.02, out)); }
    else fy = Math.max(-0.95, Math.min(0.95, ym / Math.max(0.1, r)));
    if (!e.altKey) {
      if (!onFin && Math.abs(fy) < 0.07) { fy = 0; guides.push({ y: 0 }); }
      if (!onFin && lv.twoTone && Math.abs(fy - lv.split) < 0.07) { fy = lv.split; guides.push({ y: lv.split }); }
      for (let b = 1; b <= P().bayCount(d); b++) { const bx = P().bayCentre(d, f.ln, b) / f.L; if (Math.abs(fx - bx) < 0.008) { fx = bx; guides.push({ x: bx * f.L }); break; } }
    }
    if (paintDrag.item === "name") { lv.name.x = fx; lv.name.y = fy; }
    else { const em = lv.emblems[+paintDrag.item.split(":")[1]]; em.x = fx; em.y = fy; }
    paintDrag.guides = guides;
    root.querySelector(".do-paintsheet").innerHTML = paintSvg(st, d, f);
  }
  // The colour palette: the period colours, and a picker for anything else.
  function openPalette(btn) {
    closePalette();
    const target = btn.dataset.color, lv = draft(U.state).livery, cur = colorOf(lv, target) || "#c9cbc8";
    pop = document.createElement("div");
    pop.className = "do-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose a colour");
    pop.innerHTML = `<div class="do-swatches">${U.livery.PALETTE.map(c => `<button data-pick="${c}" style="background:${c}" aria-label="${c}" ${c === cur ? 'aria-pressed="true"' : ""}></button>`).join("")}</div>
      <label class="do-picker"><span>Any colour</span><input type="color" value="${cur}" data-pick-input></label>
      ${btn.dataset.nullable ? `<button class="btn-quiet" data-pick="">None (hull colour)</button>` : ""}`;
    pop.dataset.target = target;
    root.appendChild(pop);
    const b = btn.getBoundingClientRect(), rr = root.getBoundingClientRect();
    pop.style.left = Math.min(b.left - rr.left, rr.width - 250) + "px"; pop.style.top = (b.top - rr.top - 8) + "px"; pop.style.transform = "translateY(-100%)";
  }
  function closePalette() { if (pop) { pop.remove(); pop = null; } }
  function colorOf(lv, t) {
    if (t.startsWith("deco:")) return lv.decorations[+t.split(":")[1]].color;
    if (t === "name") return lv.name.color;
    return lv[t];
  }
  function setColor(t, c) {
    const lv = draft(U.state).livery;
    if (t.startsWith("deco:")) lv.decorations[+t.split(":")[1]].color = c;
    else if (t === "name") lv.name.color = c;
    else lv[t] = c || null;
    lv.preset = null;
  }

  // Small drawings: the office's logo, the speed icons, and a hull silhouette for each option.
  function logoLines() {
    return `<g fill="none" stroke="#2d2418" stroke-width="1.2"><ellipse cx="24" cy="10" rx="22" ry="7"/><line x1="4" y1="10" x2="44" y2="10"/><path d="M18,17 h12 v3 h-12 z"/></g>`;
  }
  function logo() {
    return `<svg viewBox="0 0 60 26" width="60" height="26" aria-hidden="true"><g fill="none" stroke="var(--brass-hi)" stroke-width="1.4"><ellipse cx="30" cy="11" rx="26" ry="8"/><path d="M6,11 H54 M14,6 Q30,2 46,6 M14,16 Q30,20 46,16"/><path d="M24,19 h12 v4 h-12 z"/></g></svg>`;
  }
  function icon(k) {
    const p = { pause: "M5,4 h3 v12 h-3 z M12,4 h3 v12 h-3 z", play: "M6,4 L15,10 L6,16 Z", fast: "M3,4 L10,10 L3,16 Z M10,4 L17,10 L10,16 Z", fastest: "M1,4 L7,10 L1,16 Z M7,4 L13,10 L7,16 Z M13,4 L19,10 L13,16 Z" }[k];
    return `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="${p}" fill="currentColor"/></svg>`;
  }
  function optIcon(d, k, v) {
    const t = { ...d, [k]: v, D: 10, bays: 3, systems: d.systems }, hl = P().hullLengths(t), s = 56 / hl.L, top = [], bot = [];
    for (let i = 0; i <= 40; i++) { const x = hl.L * i / 40, r = P().radius(t, x); top.push(`${(2 + x * s).toFixed(1)},${(12 - r * s).toFixed(1)}`); bot.push(`${(2 + x * s).toFixed(1)},${(12 + r * s).toFixed(1)}`); }
    let extra = "";
    if (k === "fins" || k === "tail") {
      const xe = hl.L - hl.lt * (t.tail === "cruciform" ? 0.02 : 0.12), len = hl.lt * (t.fins === "large" ? 0.78 : 0.68), h = t.fins === "large" ? 4.6 : t.fins === "twin" ? 3 : 3.6;
      extra = `<path d="M${2 + (xe - len) * s},${12 - P().radius(t, xe - len) * s} L${2 + (xe - len * 0.5) * s},${12 - (h + 1) * s * 1.6} L${2 + xe * s},${12 - (h + 1) * s * 1.6} L${2 + xe * s},12 Z" class="oi-fin"/>`;
      if (t.fins === "twin") extra += `<path d="M${2 + (xe - len * 1.3) * s},${12 - P().radius(t, xe - len * 1.3) * s} L${2 + (xe - len) * s},${12 - (h + 1) * s * 1.5} L${2 + (xe - len * 0.55) * s},${12 - (h + 1) * s * 1.5} L${2 + (xe - len * 0.4) * s},${12 - P().radius(t, xe - len * 0.4) * s} Z" class="oi-fin"/>`;
    }
    if (k === "car") {
      const a = 2 + (hl.ln + 0.5) * s, w = 12 * s, y = 12 + 5 * s;
      extra = v === "streamlined" ? `<path d="M${a},${y - 1} C${a},${y + 5} ${a + w},${y + 3} ${a + w},${y - 1} Z" class="oi-car"/>`
        : `<rect x="${a}" y="${v === "recessed" ? y - 2.5 : y - 1}" width="${w}" height="4" rx="1.2" class="oi-car"/>`;
    }
    return `<svg viewBox="0 0 60 24" width="60" height="24" aria-hidden="true"><path d="M${top.join(" L")} L${bot.reverse().join(" L")} Z" class="oi-hull"/>${extra}</svg>`;
  }

  // Controls -------------------------------------------------------------------------------
  function onClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    const st = U.state, d = draft(st), lim = P().limits(st);
    if (b.dataset.do === "back") { close(); return; }
    if (b.dataset.do === "dismiss") { root.querySelector(".do-banner").hidden = true; return; }
    if (b.dataset.speed != null) { U.game && U.game.setAuto(+b.dataset.speed); clock(); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; closePalette(); render(); return; }
    // Accommodation
    if (b.dataset.accTool) { accTool = b.dataset.accTool; render(); return; }
    if (b.dataset.accDeck) { accDeck = b.dataset.accDeck; render(); return; }
    if (b.dataset.acc === "grid") { accGrid = !accGrid; render(); return; }
    if (b.dataset.acc === "standard") { if (!d.plan || !Object.keys(d.plan.cells).length || confirm("Replace both decks with the standard layout?")) { U.decks.standardLayout(d); render(); } return; }
    if (b.dataset.acc === "clear") { if (confirm("Clear everything painted on this deck?")) { for (const k of Object.keys((d.plan || {}).cells || {})) if (k.startsWith(accDeck + ":")) delete d.plan.cells[k]; render(); } return; }
    // Paint
    const lv = d.livery;
    if (b.dataset.color) { if (pop && pop.dataset.target === b.dataset.color) closePalette(); else openPalette(b); return; }
    if (b.dataset.pick != null) { setColor(pop.dataset.target, b.dataset.pick); closePalette(); render(); return; }
    if (b.dataset.livery) { U.livery.applyPreset(st, lv, b.dataset.livery); render(); return; }
    if (b.dataset.decoRemove) { lv.decorations.splice(+b.dataset.decoRemove, 1); lv.preset = null; render(); return; }
    if (b.dataset.font) { lv.name.font = b.dataset.font; render(); return; }
    if (b.dataset.emblemAdd != null) { lv.emblems.push({ x: 0.5, y: -0.6, size: 1 }); paintSel = "emblem:" + (lv.emblems.length - 1); render(); return; }
    if (b.dataset.emblemRemove != null) { lv.emblems.splice(+paintSel.split(":")[1], 1); paintSel = null; render(); return; }
    const sys = d.systems;
    if (b.dataset.clearBay) { remove({ type: "module", bay: +b.dataset.clearBay }); refresh(); return; }
    if (b.dataset.decks) { sys.deckCount = sys.deckCount || {}; sys.deckCount[selBay] = +b.dataset.decks; refresh(); return; }
    if (b.dataset.removeFit != null) { remove({ type: "fit", bay: selBay, i: +b.dataset.removeFit }); refresh(); return; }
    if (b.dataset.removeEng) { remove({ type: "eng", bay: +b.dataset.removeEng }); refresh(); return; }
    if (b.dataset.mount) { const en = sys.engines.find(x => x.bay === selBay); if (en) en.mount = b.dataset.mount; refresh(); return; }
    if (b.dataset.preset) { startFrom(b.dataset.preset); return; }
    if (b.dataset.bays) { d.bays = Math.max(2, Math.min(lim.maxBays, d.bays + b.dataset.bays * 0.5)); trimSystems(d); render(); kick(); return; }
    if (b.dataset.gas) { d.gas = b.dataset.gas; render(); return; }
    if (b.dataset.opt) { const [k, v] = b.dataset.opt.split(":"); d[k] = v; render(); return; }
    if (b.dataset.compare) { compare = b.dataset.compare; render(); return; }
  }
  function onInput(e) {
    const t = e.target;
    if (tab === "paint") {
      const d = draft(U.state), lv = d.livery, redraw = () => { root.querySelector(".do-paintsheet").innerHTML = paintSvg(U.state, d, P().figures(U.state, d)); };
      if (t.dataset.pickInput != null && pop) { setColor(pop.dataset.target, t.value); redraw(); const chip = root.querySelector(`[data-color="${pop.dataset.target}"] span`); if (chip) chip.style.background = t.value; return; }
      if (t.dataset.deco) { const [i, k] = t.dataset.deco.split(":"); lv.decorations[+i][k] = +t.value; lv.preset = null; redraw(); return; }
      if (t.dataset.decoFlag) { lv.decorations[+t.dataset.decoFlag].flag = t.checked; redraw(); return; }
      if (t.dataset.decoAdd != null && t.value) {
        const T = U.livery.DECOR[t.value], dc = { type: t.value, color: (U.state.company.emblem || {}).c1 || "#9b2a24" };
        for (const [k, , , , def] of T.params) dc[k] = def;
        if (T.flag) dc.flag = false;
        lv.decorations.push(dc); lv.preset = null; render(); return;
      }
      if (t.dataset.twotone != null) { lv.twoTone = t.checked; render(); return; }
      if (t.dataset.split != null) { lv.split = +t.value; redraw(); return; }
      if (t.dataset.nameText != null) { lv.name.text = t.value; redraw(); return; }
      if (t.dataset.nameSize != null) { lv.name.size = +t.value; redraw(); return; }
      if (t.dataset.emblemSize != null && paintSel) { lv.emblems[+paintSel.split(":")[1]].size = +t.value; redraw(); return; }
    }
    if (t.dataset.presetSelect != null && t.value) { startFrom(t.value); return; }
    if (t.dataset.field === "D") {
      draft(U.state).D = +t.value; kick();
      // Redraw without rebuilding the slider, so dragging stays smooth.
      const st = U.state, d = draft(st), f = P().figures(st, d);
      root.querySelector(".do-sheet").innerHTML = blueprint(st, d, f);
      root.querySelector(".do-figures").innerHTML = figuresPanel(st, d, f);
      root.querySelector(".do-big").textContent = `${fmt(d.D, 1)} m`;
    }
  }
  function startFrom(key) {
    const st = U.state, lim = P().limits(st), p = P().preset(st, key);
    const keep = st.drawing && st.drawing.livery;
    p.livery = keep || U.livery.fresh(st);
    st.drawing = p; st.drawingNo = (st.drawingNo || 0) + 1;
    resetAnim(); render();
    if (p.trimmed) note(`Diameter trimmed to ${lim.maxD} m, the most your girders allow today.`);
  }
  // When bays are removed, anything placed in them goes.
  function trimSystems(d) {
    // Modules need a whole bay; fittings and engines can use a half bay at the stern.
    const s = d.systems, whole = Math.floor(d.bays + 1e-6), all = P().bayCount(d);
    s.engines = s.engines.filter(e => e.bay <= all);
    for (const k of Object.keys(s.modules)) if (+k > whole) delete s.modules[k];
    for (const k of Object.keys(s.fittings)) if (+k > all) delete s.fittings[k];
  }
  function note(text) {
    const b = root.querySelector(".do-banner");
    b.hidden = false; b.className = "do-banner"; b.innerHTML = `<span class="do-banner-text">${esc(text)}</span><button class="btn-quiet" data-do="dismiss">Dismiss</button>`;
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.hidden = true; }, 7000);
  }

  U.designer = { open, close, isOpen, telegram };
})(window.UpShip);
