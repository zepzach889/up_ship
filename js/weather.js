// Weather: moving systems born in their home regions, flights judged against the forecast,
// serious accidents, and insurance.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;
  const rand = (a, b) => a + Math.random() * (b - a);
  const city = id => U.cityById[id];
  const monthOf = state => S().dateAtHour(S().H(state.tick)).getUTCMonth();   // 0 = January

  // Where and when weather is born. Rates are chances per half-day turn; speeds in map units an hour (about 2.6 km each).
  const SOURCES = [
    { kind: "storm", name: "Atlantic storm", at: () => ({ x: city("dublin").x - 170, y: rand(city("glasgow").y - 40, city("bordeaux").y) }),
      rate: m => [0.11, 0.1, 0.08, 0.06, 0.04, 0.03, 0.03, 0.04, 0.07, 0.09, 0.11, 0.12][m], vx: [10, 16], vy: [-3, 3], rx: [110, 170], ry: [45, 70], life: [80, 130] },
    { kind: "storm", name: "Alpine thunderstorm", at: () => ({ x: rand(city("zurich").x - 30, city("munich").x + 40), y: rand(city("munich").y - 10, city("zurich").y + 30) }),
      rate: m => [0, 0, 0, 0.03, 0.08, 0.16, 0.2, 0.16, 0.06, 0, 0, 0][m], vx: [2, 5], vy: [-1, 1], rx: [45, 75], ry: [38, 55], life: [8, 20] },
    { kind: "storm", name: "Mediterranean storm", at: () => ({ x: rand(city("genoa").x - 60, city("rome").x), y: rand(city("genoa").y + 30, city("rome").y + 40) }),
      rate: m => [0.04, 0.03, 0.03, 0.02, 0.01, 0, 0, 0, 0.04, 0.06, 0.06, 0.05][m], vx: [6, 11], vy: [-2, 3], rx: [80, 120], ry: [40, 60], life: [40, 80] },
    { kind: "storm", name: "Baltic gale", at: () => ({ x: rand(city("copenhagen").x - 40, city("stockholm").x), y: rand(city("stockholm").y, city("copenhagen").y + 30) }),
      rate: m => [0.06, 0.05, 0.03, 0.02, 0, 0, 0, 0, 0.02, 0.04, 0.06, 0.07][m], vx: [8, 13], vy: [-2, 2], rx: [90, 130], ry: [40, 60], life: [50, 90] },
    { kind: "fog", name: "North Sea fog", at: () => ({ x: rand(city("amsterdam").x - 40, city("hamburg").x), y: rand(city("hamburg").y, city("amsterdam").y + 20) }),
      rate: m => [0.08, 0.06, 0.03, 0.01, 0, 0, 0, 0.01, 0.06, 0.1, 0.12, 0.1][m], vx: [0.5, 2], vy: [-0.5, 0.5], rx: [80, 130], ry: [22, 34], life: [20, 50] },
    { kind: "fog", name: "Channel fog", at: () => ({ x: rand(city("london").x - 30, city("paris").x), y: rand(city("london").y + 20, city("paris").y - 30) }),
      rate: m => [0.06, 0.05, 0.03, 0.01, 0, 0, 0, 0, 0.03, 0.07, 0.08, 0.07][m], vx: [0.5, 2], vy: [-0.5, 0.5], rx: [70, 110], ry: [20, 30], life: [16, 40] },
    { kind: "wind", name: "Mistral", at: () => ({ x: city("marseille").x + rand(-6, 6), y: city("marseille").y - 70 }), fixedRot: -84,
      rate: m => [0.07, 0.08, 0.08, 0.06, 0.04, 0.01, 0, 0, 0.01, 0.02, 0.04, 0.06][m], vx: [0, 0], vy: [0, 0], rx: [85, 110], ry: [20, 30], life: [24, 70] },
    { kind: "fair", name: "Fair-weather cloud", at: () => { const c = U.CITIES[Math.floor(Math.random() * U.CITIES.length)]; return { x: c.x + rand(-120, 120), y: c.y + rand(-90, 90) }; },
      rate: () => 0.3, vx: [4, 9], vy: [-2, 2], rx: [35, 65], ry: [25, 40], life: [12, 36] }
  ];
  const MAX = { all: 14, storm: 5, fog: 3, wind: 1, fair: 6 };

  function init(state) {
    state.weather = { systems: [], nextId: 1 };
    state.weatherPolicy = "cautious";
    state.settings = state.settings || { accidents: "golden" };
    state.insurance = { cover: "hull", factor: 1, paidThisYear: 0 };
  }

  // Once a turn: systems drift, fade, and new ones are born by season.
  function turn(state) {
    const W = state.weather, now = S().H(state.tick), m = monthOf(state), step = U.TIME.tickHours;
    for (const s of W.systems) { s.x += s.vx * step; s.y += s.vy * step; }
    W.systems = W.systems.filter(s => s.dies > now && s.x < 2800 && s.x > -600);
    const count = k => W.systems.filter(s => s.kind === k).length;
    for (const src of SOURCES) {
      if (W.systems.length >= MAX.all || count(src.kind) >= MAX[src.kind]) continue;
      if (Math.random() > src.rate(m)) continue;
      const p = src.at(), rx = rand(...src.rx), ry = rand(...src.ry);
      const parts = src.kind === "storm" ? [{ dx: 0, dy: 0, rx, ry }, { dx: rand(-0.4, -0.1) * rx, dy: rand(-0.2, 0.2) * ry, rx: rx * 0.45, ry: ry * 1.05 },
        { dx: rand(0.2, 0.45) * rx, dy: rand(-0.15, 0.25) * ry, rx: rx * 0.35, ry: ry * 0.9 }] : [{ dx: 0, dy: 0, rx, ry }];
      W.systems.push({ id: W.nextId++, kind: src.kind, name: src.name, x: p.x, y: p.y, rx, ry, rot: src.fixedRot ?? rand(-30, 30),
        vx: rand(...src.vx), vy: rand(...src.vy), born: now, dies: now + rand(...src.life), seed: Math.floor(rand(1, 90)), parts });
    }
  }

  // Is a point inside a system's area at a given hour? Uses a slightly shrunk ellipse, so edges are forgiving.
  function covers(s, x, y, hour, shrink = 0.85) {
    const dt = hour - (s.at ?? 0);
    const cx = s.x + s.vx * dt, cy = s.y + s.vy * dt, a = -s.rot * Math.PI / 180;
    const dx = x - cx, dy = y - cy, u = dx * Math.cos(a) - dy * Math.sin(a), v = dx * Math.sin(a) + dy * Math.cos(a);
    return (u * u) / (s.rx * s.rx * shrink * shrink) + (v * v) / (s.ry * s.ry * shrink * shrink) <= 1;
  }
  const bez = (a, c, b, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  // Which systems a path crosses: the storms and winds along it, and fog at either end.
  function crossings(systems, a, b, via, depart, hours, now) {
    const hits = new Set(), fogEnds = new Set();
    for (const s of systems) s.at = now;
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, p = via ? bez(a, via, b, t) : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, hr = depart + t * hours;
      for (const s of systems) {
        if (s.kind === "fair" || !covers(s, p.x, p.y, hr)) continue;
        if (s.kind === "fog") { if (i === 0 || i === 14) fogEnds.add(s); } else hits.add(s);
      }
    }
    return { storms: [...hits].filter(s => s.kind === "storm"), winds: [...hits].filter(s => s.kind === "wind"), fog: [...fogEnds] };
  }
  const pathLen = (a, via, b) => { let L = 0, prev = a; for (let i = 1; i <= 16; i++) { const p = bez(a, via, b, i / 16); L += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; } return L; };

  // Judge a flight at departure: clear, divert round known storms, wait, or fly through.
  function judge(state, ship, from, to, depart, km, speed) {
    const W = state.weather, now = S().H(state.tick);
    const cm = state.crew && U.crew ? U.crew.mods(state, ship) : {};
    let policy = ship.weatherPolicy || state.weatherPolicy || "cautious";
    if (cm.forceBold) policy = "bold"; else if (cm.forceCautious) policy = "cautious";      // the captain has views of their own
    const service = U.research.has(state, "operations1") || cm.seesEarly;
    const known = W.systems.filter(s => service || depart - s.born >= 12);          // young systems are surprises without the weather service
    const a = city(from), b = city(to), hours = km / speed;
    const all = crossings(W.systems, a, b, null, depart, hours, now);
    const seen = crossings(known, a, b, null, depart, hours, now);
    const out = { mode: "clear", via: null, km, slow: 1, risk: 1, notes: [] };
    if (policy === "cautious") {
      if (seen.fog.length) return { mode: "wait", wait: 12, reason: `fog at ${seen.fog.some(s => covers(s, b.x, b.y, depart + hours)) ? city(to).name : city(from).name}` };
      if (seen.storms.length) {
        // Try curving round the storm on either side, a little wider each time.
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, size = Math.max(...seen.storms.map(s => Math.max(s.rx, s.ry)));
        let best = null;
        for (const k of [1.1, 1.6, 2.2, 3]) for (const sg of [1, -1]) {
          const via = { x: mid.x + nx * sg * size * k, y: mid.y + ny * sg * size * k };
          const L = pathLen(a, via, b), kmV = km * L / len;
          if (kmV > km * 1.6) continue;
          if (crossings(known, a, b, via, depart, kmV / speed, now).storms.length) continue;
          if (!best || kmV < best.km) best = { via, km: kmV };
        }
        if (!best) return { mode: "wait", wait: 12, reason: "a storm across the route with no way round" };
        out.mode = "divert"; out.via = best.via; out.km = best.km;
        out.notes.push("diverting round a storm");
      }
      // Anything not yet known, or not avoided, is flown through.
      const actual = out.via ? crossings(W.systems, a, b, out.via, depart, out.km / speed, now) : all;
      if (actual.storms.length) { out.slow *= 1.15; out.risk *= 4 * (cm.weatherRisk || 1); out.notes.push("caught by a storm"); }
      if (actual.winds.length) { out.slow *= 1.1; out.risk *= 1.5; }
      if (actual.fog.length) { out.risk *= 2; }
      return out;
    }
    // Bold: straight through whatever is there.
    out.bold = true;
    if (all.storms.length) { out.mode = "through"; out.slow *= 1.15; out.risk *= 4 * (cm.weatherRisk || 1); out.notes.push("flying through a storm"); }
    if (all.winds.length) { out.slow *= 1.1; out.risk *= 1.5; }
    if (all.fog.length) { out.slow *= 1.05; out.risk *= 2; }
    return out;
  }

  // Serious accidents ------------------------------------------------------------------
  const LEVEL = { sheltered: { rate: 0.67, fatalH: 0, fatalHe: 0 }, golden: { rate: 1, fatalH: 0.2, fatalHe: 0.05 }, unforgiving: { rate: 2, fatalH: 0.35, fatalHe: 0.1 } };
  const PER_HOUR = 1 / (25 * 365 * 24 * 0.5);          // about one per 25 years of a ship's flying, if it flies half the time
  function serious(state, ship, leg, risk) {
    const lvl = LEVEL[(state.settings || {}).accidents] || LEVEL.golden;
    const cm = state.crew && U.crew ? U.crew.mods(state, ship) : { risk: 1 };
    let p = leg.hours * PER_HOUR * risk * cm.risk * lvl.rate * (1 + (1 - ship.condition));
    if (ship.gas === "helium") p *= 0.5;
    if (U.research.has(state, "operations1")) p *= 0.8;
    if (Math.random() > p) return null;
    const fatalChance = ship.gas === "helium" ? lvl.fatalHe : lvl.fatalH;
    const r = Math.random();
    return r < fatalChance ? "disaster" : r < fatalChance + (1 - fatalChance) * 0.4 ? "wreck" : "damage";
  }

  // What happens after a serious accident: the ship, the insurance, the standing, the telegram.
  function consequences(state, ship, leg, kind, t, bold) {
    const I = state.insurance, value = S().saleValue(state, ship), where = placeNear(leg);
    const claims = kind === "damage" ? 0 : Math.round((leg.pax || 0) * 300 + (leg.tons || 0) * 200);
    let paid = 0, cost = 0;
    if (kind === "damage") {
      const repair = Math.round(U.SHIP_CLASSES[ship.classId].price * 0.2 / 100) * 100;
      cost = repair; if (I.cover !== "none") paid = repair;
      ship.condition = Math.max(0.2, ship.condition - 0.3);
      ship.readyHour = t + rand(30, 60) * 24; ship.grounded = ship.readyHour;
    } else {
      cost = value + claims;
      if (I.cover !== "none") paid += value;
      if (I.cover === "full") paid += claims;
    }
    S().addGeneral(state, cost - paid);
    if (paid) I.factor = Math.min(3, I.factor * 1.5);
    const hit = kind === "disaster" ? 25 : kind === "wreck" ? 10 : 5;
    state.rep.standing = Math.max(0, state.rep.standing - hit);
    const money = n => "£" + Math.round(n).toLocaleString("en-GB");
    const cover = paid ? ` stop insurance paid ${money(paid)}` : I.cover === "none" ? " stop uninsured" : "";
    const pays = cost - paid > 0 ? ` stop cost to the company ${money(cost - paid)}` : "";
    let text;
    if (kind === "damage") text = `${ship.name} badly damaged in a forced landing near ${where} stop all aboard safe stop out of service for repairs${cover}${pays} stop`;
    else if (kind === "wreck") text = `${ship.name} wrecked near ${where} stop all aboard rescued stop the ship is lost${cover}${pays} stop`;
    else {
      const aboard = (leg.pax || 0) + Math.max(8, Math.round(U.SHIP_CLASSES[ship.classId].crew || 12));
      const lost = Math.max(1, Math.round(aboard * rand(0.25, 0.8)));
      text = `${ship.name} lost by fire near ${where} stop ${lost} of ${aboard} aboard did not survive stop an inquiry will follow${cover}${pays} stop`;
    }
    if (U.crew) text = text.replace(/ stop$/, "") + U.crew.afterAccident(state, ship, kind, bold, t) + " stop";
    S().telegram(state, t, text, true, kind === "disaster" && ship.gas !== "helium" && state.ships.some(s => s !== ship && s.gas !== "helium") ? { type: "gasdecision" } : { type: "finances" });
    if (kind !== "damage") state.ships = state.ships.filter(s => s !== ship);
  }
  function placeNear(leg) {
    const a = city(leg.from), b = city(leg.to), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let best = a, bd = Infinity;
    for (const c of U.CITIES) { const d = Math.hypot(c.x - mid.x, c.y - mid.y); if (d < bd) { bd = d; best = c; } }
    return best.name;
  }

  // Insurance premiums, monthly. A share of each ship's value a year, by gas and policy, raised by recent claims.
  function premium(state) {
    const I = state.insurance; if (I.cover === "none") return 0;
    let total = 0;
    for (const sh of state.ships) {
      if (sh.deliveryTick > state.tick) continue;
      let rate = sh.gas === "helium" ? 0.01 : 0.02;
      if ((sh.weatherPolicy || state.weatherPolicy) === "bold") rate += 0.003;
      if (state.rep && state.rep.standing > 70) rate *= 0.9;
      total += S().saleValue(state, sh) * rate;
    }
    return total * I.factor * (I.cover === "full" ? 1.4 : 1) / 12;
  }
  function monthly(state) {
    const p = premium(state);
    if (p) { S().addGeneral(state, p); state.year.insurance = (state.year.insurance || 0) + p; }
    state.insurance.factor = 1 + (state.insurance.factor - 1) * (1 - 1 / 36);
  }

  U.weather = { SOURCES, init, turn, judge, serious, consequences, premium, monthly, covers, bez };
})(window.UpShip);
