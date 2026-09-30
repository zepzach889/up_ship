// Designs from files: rebuilt field by field from what the rules allow, so a hand-edited file
// cannot make an impossible ship. Anything out of range is trimmed, and each change is noted.
// Research limits are not applied here: a design beyond the company's research imports as it is,
// and is marked as needing research instead.
window.UpShip = window.UpShip || {};
(function (U) {
  const num = (v, lo, hi, def, changes, what) => {
    let n = Number(v);
    if (!isFinite(n)) { if (v !== undefined) changes.push(`${what} was unreadable`); return def; }
    if (n < lo || n > hi) { changes.push(`${what} trimmed to ${n < lo ? lo : hi}`); n = Math.max(lo, Math.min(hi, n)); }
    return n;
  };
  const pick = (v, allowed, def, changes, what) => {
    if (allowed.includes(v)) return v;
    if (v !== undefined) changes.push(`${what} "${String(v).slice(0, 20)}" is not an option`);
    return def;
  };
  const colour = (v, def) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : def;

  function clean(state, raw) {
    const changes = [], r = raw && typeof raw === "object" ? raw : {};
    const d = {
      type: typeof r.type === "string" ? r.type.slice(0, 40) : "Design study",
      D: Math.round(num(r.D, 12, 52, 22, changes, "Diameter") * 2) / 2,
      bays: Math.round(num(r.bays, 2, 22, 7, changes, "Length") * 2) / 2,
      nose: pick(r.nose, ["rounded", "pointed", "blunt"], "rounded", changes, "Nose"),
      tail: pick(r.tail, ["standard", "tapered", "cruciform"], "standard", changes, "Tail"),
      fins: pick(r.fins, ["standard", "large", "twin"], "standard", changes, "Fins"),
      car: pick(r.car, ["external", "recessed", "streamlined"], "external", changes, "Control car"),
      gas: pick(r.gas, ["hydrogen", "helium", "aetherium"], "hydrogen", changes, "Gas")
    };
    // Systems: a control car in bay 1; modules only in whole bays; up to two fittings a bay; one engine pair a bay.
    const s = r.systems && typeof r.systems === "object" ? r.systems : {}, whole = Math.floor(d.bays), all = Math.ceil(d.bays - 1e-6);
    const sys = { modules: { 1: "control" }, fittings: {}, engines: [], deckCount: {} };
    for (const [k, m] of Object.entries(s.modules || {})) {
      const b = +k;
      if (b === 1) continue;
      if (!(b >= 2 && b <= whole) || !["passenger", "cargo", "crew"].includes(m)) { changes.push(`a module in bay ${k} was removed`); continue; }
      sys.modules[b] = m;
    }
    for (const [k, list] of Object.entries(s.fittings || {})) {
      const b = +k;
      if (!(b >= 1 && b <= all) || !Array.isArray(list)) continue;
      const ok = list.filter(x => x === "fuel" || x === "ballast").slice(0, 2);
      if (ok.length < list.length) changes.push(`fittings in bay ${k} were trimmed`);
      if (ok.length) sys.fittings[b] = ok;
    }
    for (const e of Array.isArray(s.engines) ? s.engines : []) {
      const b = +(e && e.bay);
      if (!(b >= 1 && b <= all) || sys.engines.some(x => x.bay === b)) continue;
      sys.engines.push({ bay: b, mount: e.mount === "sides" ? "sides" : "below" });
    }
    for (const [k, n] of Object.entries(s.deckCount || {})) if (sys.modules[+k] === "passenger") sys.deckCount[+k] = n >= 2 ? 2 : 1;
    d.systems = sys;
    // The deck plan: only cells of known room types, in passenger bays, within the deck's width.
    const plan = { nextId: 1, cells: {}, first: {} }, rows = U.decks.widthSq(d.D), TYPES = Object.keys(U.decks.TYPES);
    const rp = r.plan && typeof r.plan === "object" ? r.plan : {};
    let dropped = 0, maxId = 0;
    for (const [k, c] of Object.entries(rp.cells || {})) {
      const m = /^(lower|upper):(\d+):(\d+):(\d+)$/.exec(k);
      const ok = m && c && TYPES.includes(c.type) && sys.modules[+m[2]] === "passenger" && +m[3] < 6 && +m[4] < rows
        && (m[1] === "lower" || (sys.deckCount[+m[2]] === 2 && d.D >= U.physics.TWO_DECKS)) && Number.isInteger(c.id) && c.id > 0;
      if (!ok) { dropped++; continue; }
      plan.cells[k] = { type: c.type, id: c.id }; maxId = Math.max(maxId, c.id);
    }
    for (const [id, v] of Object.entries(rp.first || {})) if (v === true && +id <= maxId) plan.first[+id] = true;
    plan.nextId = maxId + 1;
    if (dropped) changes.push(`${dropped} deck square${dropped > 1 ? "s" : ""} outside the passenger decks ${dropped > 1 ? "were" : "was"} dropped`);
    d.plan = plan;
    // The livery: colours, known decorations with their settings in range, the name, and up to three emblems.
    const lv = r.livery && typeof r.livery === "object" ? r.livery : {}, base = U.livery.fresh(state);
    const L = { preset: null, hull: colour(lv.hull, base.hull), twoTone: !!lv.twoTone, lower: colour(lv.lower, base.lower),
      split: num(lv.split, -0.6, 0.8, base.split, changes, "Two-tone split"),
      nose: lv.nose ? colour(lv.nose, null) : null, tail: lv.tail ? colour(lv.tail, null) : null,
      fins: colour(lv.fins, base.fins), rudders: colour(lv.rudders, base.rudders), car: colour(lv.car, base.car),
      engines: colour(lv.engines, base.engines), gondolas: colour(lv.gondolas, base.gondolas), decorations: [], name: {}, emblems: [] };
    for (const dc of (Array.isArray(lv.decorations) ? lv.decorations : []).slice(0, 6)) {
      const T = dc && U.livery.DECOR[dc.type];
      if (!T) { changes.push("an unknown decoration was removed"); continue; }
      const out = { type: dc.type, color: colour(dc.color, "#9b2a24") };
      for (const [k, n, lo, hi, def] of T.params) out[k] = num(dc[k], lo, hi, def, changes, `${T.name} ${n.toLowerCase()}`);
      if (T.flag) out.flag = !!dc.flag;
      L.decorations.push(out);
    }
    const nm = lv.name && typeof lv.name === "object" ? lv.name : {};
    L.name = { text: typeof nm.text === "string" ? nm.text.slice(0, 24) : "", font: pick(nm.font, Object.keys(U.livery.FONTS), "deco", changes, "Lettering"),
      size: num(nm.size, 0.5, 2, 1, changes, "Name size"), color: colour(nm.color, base.name.color),
      x: num(nm.x, 0.02, 0.98, base.name.x, changes, "Name position"), y: num(nm.y, -0.95, 0.95, base.name.y, changes, "Name position") };
    for (const e of (Array.isArray(lv.emblems) ? lv.emblems : []).slice(0, 3))
      L.emblems.push({ x: num(e && e.x, 0.02, 0.98, 0.5, changes, "Emblem position"), y: num(e && e.y, -1.9, 1.9, -0.6, changes, "Emblem position"), size: num(e && e.size, 0.4, 2, 1, changes, "Emblem size") });
    d.livery = L;
    return { d, changes: [...new Set(changes)] };
  }

  U.designIO = { clean };
})(window.UpShip);
