// Taking the helm: for record attempts and survey flights, the player plots the course across the live weather
// map, chooses an engine setting, and makes the calls as the flight unfolds (storms, headwinds, fuel).
// The result (hours, damage) goes back to whatever asked for the flight.
window.UpShip = window.UpShip || {};
(function (U) {
  const SETTINGS = { economy: { name: "Economy", speed: 0.86, fuel: 0.72, strain: 0 }, cruising: { name: "Cruising", speed: 1, fuel: 1, strain: 0 }, full: { name: "Full speed", speed: 1.12, fuel: 1.38, strain: 0.08 } };
  const NS = "http://www.w3.org/2000/svg";
  let H = null;

  const svg = () => document.querySelector("#map svg");
  const pt = id => { const c = U.cityById[id]; const [x, y] = U.map.project(c.lon, c.lat); return { x, y }; };
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  // A storm's place at a future hour, and whether a point lies inside it.
  const stormAt = (s, hours) => ({ x: s.x + s.vx * hours / 12, y: s.y + s.vy * hours / 12 });
  function inside(s, p, hours) {
    const c = stormAt(s, hours), a = -s.rot * Math.PI / 180, dx = p.x - c.x, dy = p.y - c.y;
    const u = dx * Math.cos(a) - dy * Math.sin(a), v = dx * Math.sin(a) + dy * Math.cos(a);
    return (u * u) / (s.rx * s.rx) + (v * v) / (s.ry * s.ry) <= 1;
  }
  const hazards = () => (U.state.weather && U.state.weather.systems || []).filter(s => s.kind === "storm" || s.kind === "gale" || s.kind === "front");

  function start(o) {
    if (H) return;
    const st = U.state, ship = o.ship, rs = U.research.stats(st, ship);
    const A = pt(o.from), B = pt(o.to), km = U.sim.distanceKm(o.from, o.to);
    H = { o, ship, rs, A, B, kmPerUnit: km / Math.max(1, dist(A, B)), way: [], setting: "cruising", phase: "plot", log: [],
      wind: { dir: Math.random() * Math.PI * 2, kmh: 8 + Math.random() * 38 } };
    U.game && U.game.setAuto && U.game.setAuto(0);
    const g = document.createElementNS(NS, "g"); g.id = "helm-layer"; svg().appendChild(g); H.layer = g;
    const box = document.createElement("div"); box.id = "helm"; box.className = "helm"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Taking the helm");
    document.body.appendChild(box); H.box = box;
    H.onClick = e => { if (!H || H.phase !== "plot") return; e.stopPropagation(); e.preventDefault(); const m = svg().getScreenCTM().inverse(), p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); H.way.push({ x: p.x, y: p.y }); draw(); };
    svg().addEventListener("click", H.onClick, true);
    box.addEventListener("click", onPanel);
    draw();
  }
  const course = () => [H.A, ...H.way, H.B];
  function courseKm() { const c = course(); let u = 0; for (let i = 1; i < c.length; i++) u += dist(c[i - 1], c[i]); return u * H.kmPerUnit; }
  const speed = () => H.rs.speedKmh * SETTINGS[H.setting].speed;
  // Where the plotted course meets forecast bad weather, judged at the hour the ship would be there.
  function warnings() {
    const c = course(), out = []; let hours = 0;
    for (let i = 1; i < c.length; i++) {
      const n = Math.max(1, Math.ceil(dist(c[i - 1], c[i]) / 6));
      for (let k = 1; k <= n; k++) {
        const p = { x: c[i - 1].x + (c[i].x - c[i - 1].x) * k / n, y: c[i - 1].y + (c[i].y - c[i - 1].y) * k / n };
        hours += dist(c[i - 1], c[i]) / n * H.kmPerUnit / speed();
        for (const s of hazards()) if (inside(s, p, hours) && !out.includes(s.name)) out.push(s.name);
      }
    }
    return out;
  }
  function draw() {
    const c = course(), g = H.layer, k = 1 / (U.map.zoomLevel ? U.map.zoomLevel() : 1);
    let html = "";
    // The forecast: where each storm will be over the next day and a half.
    for (const s of hazards()) { const f = stormAt(s, 36); html += `<ellipse cx="${f.x}" cy="${f.y}" rx="${s.rx}" ry="${s.ry}" transform="rotate(${s.rot} ${f.x} ${f.y})" class="helm-forecast"/><line x1="${s.x}" y1="${s.y}" x2="${f.x}" y2="${f.y}" class="helm-drift"/>`; }
    html += `<polyline points="${c.map(p => `${p.x},${p.y}`).join(" ")}" class="helm-course"/>`;
    html += c.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${i === 0 || i === c.length - 1 ? 5 : 3.5}" class="helm-point${i === 0 || i === c.length - 1 ? " end" : ""}"/>`).join("");
    if (H.marker) html += `<circle cx="${H.marker.x}" cy="${H.marker.y}" r="6" class="helm-ship"/>`;
    g.innerHTML = html;
    panel();
  }
  function panel() {
    const km = courseKm(), est = km / speed(), w = H.phase === "plot" ? warnings() : [], rangeOk = km * SETTINGS[H.setting].fuel <= H.rs.rangeKm;
    const name = id => U.cityById[id].name;
    let body = "";
    if (H.phase === "plot") body = `<p>Click the map to set waypoints from ${name(H.o.from)} to ${name(H.o.to)}. The faint ellipses show where each storm is forecast to be in a day and a half.</p>
      <dl><dt>Course</dt><dd>${Math.round(km).toLocaleString("en-GB")} km (direct ${Math.round(U.sim.distanceKm(H.o.from, H.o.to)).toLocaleString("en-GB")} km)</dd>
        <dt>Estimated time</dt><dd>${est.toFixed(1)} hours${H.o.record ? `, against a record of ${H.o.record} hours` : ""}</dd>
        <dt>Fuel</dt><dd>${rangeOk ? "Enough for this course" : `<span class="neg">Not enough at this setting: ${H.rs.rangeKm.toLocaleString("en-GB")} km of range</span>`}</dd></dl>
      ${w.length ? `<p class="helm-warn">The course crosses forecast bad weather: ${w.join(", ")}.</p>` : `<p class="small">No forecast storms on this course.</p>`}
      <p class="field-label">Engines</p><div class="seg">${Object.entries(SETTINGS).map(([k, s]) => `<button data-set="${k}" aria-pressed="${H.setting === k}">${s.name}</button>`).join("")}</div>
      <div class="btn-row"><button class="btn-quiet" data-h="undo" ${H.way.length ? "" : "disabled"}>Undo waypoint</button><button class="btn-quiet" data-h="clear" ${H.way.length ? "" : "disabled"}>Clear</button></div>
      <div class="btn-row"><button class="btn" data-h="fly">Fly her</button><button class="btn-quiet" data-h="cancel">${H.o.cancelText || "Let the captain fly it"}</button></div>`;
    else if (H.phase === "fly") body = `<p>${H.ship.name} is under way. ${H.hours.toFixed(1)} hours flown, ${Math.round(H.kmLeft).toLocaleString("en-GB")} km to go.</p>${H.log.length ? `<ul class="helm-log">${H.log.slice(-4).map(l => `<li>${l}</li>`).join("")}</ul>` : ""}
      ${H.ask ? `<div class="helm-ask"><p><b>${H.ask.text}</b></p><div class="btn-row">${H.ask.opts.map((x, i) => `<button class="${i ? "btn-quiet" : "btn"}" data-ask="${i}">${x[0]}</button>`).join("")}</div></div>` : ""}`;
    else body = `<p><b>${H.result.headline}</b></p><p>${H.result.text}</p>${H.log.length ? `<ul class="helm-log">${H.log.map(l => `<li>${l}</li>`).join("")}</ul>` : ""}<div class="btn-row"><button class="btn" data-h="done">Back to the map</button></div>`;
    H.box.innerHTML = `<h2>${H.o.title}</h2><p class="sub">${H.ship.name}, ${H.rs.speedKmh} km/h, range ${H.rs.rangeKm.toLocaleString("en-GB")} km</p>${body}`;
  }
  function onPanel(e) {
    const b = e.target.closest("button"); if (!b || !H) return;
    if (b.dataset.set) { H.setting = b.dataset.set; draw(); return; }
    if (b.dataset.ask != null) { const opt = H.ask.opts[+b.dataset.ask]; H.ask = null; opt[1](); panel(); H.last = performance.now(); requestAnimationFrame(step); return; }
    const h = b.dataset.h;
    if (h === "undo") { H.way.pop(); draw(); }
    if (h === "clear") { H.way = []; draw(); }
    if (h === "cancel") { const o = H.o; end(); o.onCancel && o.onCancel(); }
    if (h === "fly") fly();
    if (h === "done") { const o = H.o, r = H.result; end(); o.onFinish(r); }
  }
  // The flight: the ship follows the course through the moving weather, stopping for decisions.
  function fly() {
    const c = course();
    H.phase = "fly"; H.seg = 1; H.t = 0; H.hours = 0; H.kmLeft = courseKm(); H.damage = 0; H.extraHours = 0; H.fuelUsed = 0;
    H.asked = { storms: new Set(), wind: false, fuel: false }; H.climbed = false; H.c = c; H.marker = { ...c[0] }; H.last = performance.now();
    // The whole flight takes about seven seconds on screen, however often the browser draws; decisions pause the clock.
    let units = 0; for (let i = 1; i < c.length; i++) units += dist(c[i - 1], c[i]); H.pace = units / 7000;
    draw(); requestAnimationFrame(step);
  }
  function step(now) {
    if (!H || H.phase !== "fly" || H.ask) return;
    const c = H.c, a = c[H.seg - 1], b = c[H.seg], segLen = dist(a, b);
    const dt = Math.min(1000, now - H.last); H.last = now;
    const advance = Math.max(0.2, H.pace * dt);
    H.t = Math.min(segLen, H.t + advance);
    const p = { x: a.x + (b.x - a.x) * H.t / Math.max(0.01, segLen), y: a.y + (b.y - a.y) * H.t / Math.max(0.01, segLen) };
    const kmStep = advance * H.kmPerUnit, heading = Math.atan2(b.y - a.y, b.x - a.x);
    const head = Math.max(0, -Math.cos(heading - H.wind.dir)) * H.wind.kmh * (H.climbed ? 0.45 : 1);    // the headwind component
    const sp = Math.max(30, speed() - head);
    H.hours += kmStep / sp; H.kmLeft = Math.max(0, H.kmLeft - kmStep); H.fuelUsed += kmStep * SETTINGS[H.setting].fuel * (1 + head / 200);
    H.marker = p;
    // A storm ahead.
    for (const s of hazards()) if (!H.asked.storms.has(s.id) && inside(s, p, H.hours)) {
      H.asked.storms.add(s.id);
      return decide(`${s.name} ahead.`, [["Push through", () => { H.log.push(`Pushed through the ${s.name.toLowerCase()}.`); if (Math.random() < 0.35 + SETTINGS[H.setting].strain) { H.damage += 0.15; H.log.push("The ship took a beating: some damage."); } }],
        ["Divert around it", () => { const add = (s.rx + s.ry) * H.kmPerUnit * 0.9; H.extraHours += add / speed(); H.fuelUsed += add * SETTINGS[H.setting].fuel; H.log.push(`Diverted around the ${s.name.toLowerCase()}: about ${Math.round(add)} km more.`); }]]);
    }
    // A strong headwind.
    if (!H.asked.wind && head > 22) {
      H.asked.wind = true;
      return decide(`A ${Math.round(head)} km/h headwind is slowing her.`, [["Climb for better winds", () => { H.climbed = true; H.damage += 0.02; H.log.push("Climbed and valved gas to find better winds."); }],
        ["Press on low", () => H.log.push("Pressed on low through the headwind.")]]);
    }
    // Fuel running short.
    const need = H.fuelUsed + H.kmLeft * SETTINGS[H.setting].fuel;
    if (!H.asked.fuel && need > H.rs.rangeKm * 0.98 && H.kmLeft > 50) {
      H.asked.fuel = true;
      return decide("Fuel is running short for the distance left.", [["Slow to economy", () => { H.setting = "economy"; H.log.push("Throttled back to economy to make it."); }],
        ["Keep the pace", () => { if (Math.random() < 0.5) { H.extraHours += 8; H.log.push("Ran short: an unplanned stop to refuel, eight hours lost."); } else H.log.push("Kept the pace, and made it on the last of the fuel."); }]]);
    }
    if (H.t >= segLen) { H.seg++; H.t = 0; if (H.seg >= c.length) return land(); }
    draw();
    requestAnimationFrame(step);
  }
  function decide(text, opts) { H.ask = { text, opts }; draw(); }
  function land() {
    const cap = U.state.captains.find(x => x.shipId === H.ship.id), tr = cap ? cap.traits : [];
    // A good captain makes the player's choices go better.
    const skill = (tr.includes("weatherwise") ? 0.96 : 1) * (tr.includes("harddriving") ? 0.98 : 1) * (tr.includes("careful") ? 1.02 : 1);
    const hours = Math.round((H.hours + H.extraHours) * skill * 10) / 10;
    let damaged = H.damage + SETTINGS[H.setting].strain * (Math.random() < 0.5 ? 1 : 0);
    if (tr.includes("careful")) damaged *= 0.6; if (tr.includes("reckless")) damaged *= 1.4;
    H.phase = "done"; H.marker = { ...H.B };
    H.result = { hours, damage: Math.round(damaged * 100) / 100, ...(H.o.judge ? H.o.judge(hours) : { headline: `Arrived in ${hours} hours.`, text: "" }) };
    draw();
  }
  function end() {
    if (!H) return;
    svg() && svg().removeEventListener("click", H.onClick, true);
    H.layer.remove(); H.box.remove(); H = null;
  }
  U.helm = { start, active: () => !!H };
})(window.UpShip);
