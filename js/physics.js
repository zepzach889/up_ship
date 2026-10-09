// Honest, simplified airship physics for the Drawing Office.
// Calibrated so a design of the Graf Zeppelin's size (236 m x 30.5 m, 5 x 550 hp) cruises near 117 km/h,
// and one of the Hindenburg's (245 m x 41.2 m, 4 x 1,200 hp) holds about 200,000 cubic metres and cruises near 122 km/h.
window.UpShip = window.UpShip || {};
(function (U) {
  const BAY = 15;                                        // metres per bay
  const TWO_DECKS = 28;                                  // diameter needed for two decks of cabins in one bay
  const LEVEL = 0.02, LIMIT = 0.07;                      // balance: level within 2% of the length; cannot fly beyond 7%
  const NOSE = { rounded: 0.7, pointed: 0.95, blunt: 0.45 };      // nose length, as a share of the diameter
  const TAIL = { standard: 1.5, tapered: 2.0, cruciform: 1.5 };   // tail length, likewise
  const FULL = { nose: { rounded: 0, pointed: -0.02, blunt: 0.03 }, tail: { standard: 0, tapered: -0.03, cruciform: 0 } };
  const LIFT = { hydrogen: 1.10, helium: 1.02, aetherium: 1.32 }; // tonnes lifted per 1,000 cubic metres
  // Trade-offs of the hull options: drag, structure weight, extra weight (t), extra cost (£).
  const OPTION = {
    nose: { rounded: { drag: 1 }, pointed: { drag: 0.96 }, blunt: { drag: 1.08, cost: 0.95 } },
    tail: { standard: { drag: 1 }, tapered: { drag: 0.95 }, cruciform: { drag: 1.02, struct: 1.03 } },
    fins: { standard: { drag: 1 }, large: { drag: 1.05, struct: 1.02 }, twin: { drag: 1.03, struct: 1.02, cost: 1.03 } },
    car: { external: { drag: 1 }, recessed: { drag: 0.96, cost: 1.03 }, streamlined: { drag: 0.97, weight: 1.5 } }
  };
  const has = (state, id) => !!(state && U.research && U.research.has(state, id));

  // What research allows: largest diameter, engine power and thirst, and the length the sheds can take.
  function limits(state) {
    const maxD = has(state, "structures6") ? 50 : has(state, "structures3") ? 41 : 30;
    const hp = has(state, "engines7") ? 1300 : has(state, "engines5") ? 1050 : has(state, "engines4") ? 850 : has(state, "engines1") ? 400 : 260;
    const diesel = has(state, "engines4");
    const sfc = (diesel ? 0.18 : 0.23) * (has(state, "engines7") ? 0.85 : 1);   // kg of fuel per horsepower-hour
    const great = has(state, "structures8");
    return { maxD, minD: 12, hp, diesel, sfc, great, maxBays: 22 };
  }
  // Shed sizes: the length and diameter each can hold.
  function shedNeeded(state, L, D) {
    const great = has(state, "structures8");
    const sizes = [{ n: 1, name: "Small", L: 150, D: 22 }, { n: 2, name: "Medium", L: 210, D: 32 }, { n: 3, name: "Large", L: great ? 320 : 250, D: great ? 52 : 44 }];
    return sizes.find(s => L <= s.L && D <= s.D) || null;
  }

  // Bays are 15 m, except that the last may be a half bay of 7.5 m (holding gas, fittings, and engines, but no module).
  const bayCount = d => Math.ceil(d.bays - 1e-6);
  const isHalf = (d, b) => b === bayCount(d) && d.bays % 1 > 0.25;
  const bayLen = (d, b) => isHalf(d, b) ? BAY / 2 : BAY;
  const bayCentre = (d, ln, b) => ln + (b - 1) * BAY + bayLen(d, b) / 2;
  function hullLengths(d) {
    const ln = NOSE[d.nose] * d.D, lt = TAIL[d.tail] * d.D, mid = d.bays * BAY;
    return { ln, lt, mid, L: ln + mid + lt };
  }
  // The hull's radius along its length, bow (x = 0) to stern.
  function radius(d, x) {
    const { ln, lt, L } = hullLengths(d), R = d.D / 2;
    if (x <= ln) {
      const t = Math.max(0, x / ln);
      if (d.nose === "pointed") return R * Math.pow(1 - Math.pow(1 - t, 1.7), 0.62);
      if (d.nose === "blunt") return R * Math.pow(1 - Math.pow(1 - t, 3), 0.5);
      return R * Math.sqrt(1 - (1 - t) * (1 - t));
    }
    if (x >= L - lt) {
      const u = Math.min(1, (x - (L - lt)) / lt);
      const r = d.tail === "tapered" ? R * (1 - Math.pow(u, 1.35)) : R * Math.pow(1 - Math.pow(u, 1.9), 0.85);
      return Math.max(R * 0.035, r);
    }
    return R;
  }

  // All the figures for a design.
  function figures(state, d) {
    const lim = limits(state), { ln, lt, mid, L } = hullLengths(d), D = d.D, R = D / 2, k = D / 30, k2 = k * k;
    const f = { L, D, ln, lt, mid, notes: [] };
    // Volume: the enclosing cylinder times a fullness factor for the tapering ends.
    const Cp = 0.61 + FULL.nose[d.nose] + FULL.tail[d.tail] + 0.05 * (mid / L - 0.66);
    f.volume = Math.PI * R * R * L * Cp;
    const gas = d.gas || "hydrogen";
    f.gross = f.volume * 0.97 * LIFT[gas] / 1000;
    // Structure: the hull's surface, at a weight per square metre that grows a little with diameter; research lightens it.
    const opt = k => OPTION[k][d[k]] || {};
    // A bigger hull needs deeper rings and heavier girders, so weight per square metre grows with the diameter.
    const structK = 2.5 * Math.pow(D / 35, 1.1) * (has(state, "structures1") ? 0.9 : 1) * (has(state, "structures5") ? 0.9 : 1);
    f.area = Math.PI * D * L * 0.78;
    f.structure = f.area * structK / 1000 * (opt("tail").struct || 1) * (opt("fins").struct || 1);
    // Systems (edited on the Systems tab; until then, the preset's).
    const sys = d.systems;
    const engines = sys.engines.length * 2, hpEach = lim.hp;
    f.engines = engines; f.hpEach = hpEach; f.power = engines * hpEach;
    f.engineWeight = engines * (0.3 + hpEach / 450);
    // Modules and fittings scale with the hull: a bay of a big ship holds more, and weighs more.
    // Every tonne is placed at its bay, so the balance can be worked out: mass list of [tonnes, x].
    const at = bay => bayCentre(d, ln, +bay), masses = [], put = (t, x) => { if (t) masses.push([t, x]); };
    const carW = 0.5 + D / 12 + (opt("car").weight || 0);
    let modWeight = carW, decks = 0, holds = 0, crewBays = 0;
    put(carW, ln + 6);
    const twoDecksOk = D >= TWO_DECKS;
    f.twoDecksOk = twoDecksOk;
    const paxBays = [], holdBays = [], crewAt = [];
    for (const [b, m] of Object.entries(sys.modules)) {
      const x = at(+b);
      if (m === "passenger") { const n = twoDecksOk ? ((sys.deckCount || {})[b] || 1) : 1; decks += n; modWeight += 3.5 * k * n; put(3.5 * k * n, x); paxBays.push([n, x]); }
      if (m === "cargo") { holds++; modWeight += 1.2 * k; put(1.2 * k, x); holdBays.push(x); }
      if (m === "crew") { crewBays++; modWeight += 2 * k; put(2 * k, x); crewAt.push(x); }
    }
    if (!twoDecksOk && Object.values(sys.deckCount || {}).some(n => n > 1)) f.notes.push(`Two decks need a hull at least ${TWO_DECKS} m across; those bays have one deck.`);
    let fuelCap = 0, ballastCap = 0;
    const fuelAt = [], ballastAt = [];
    for (const [b, list] of Object.entries(sys.fittings)) for (const it of list) {
      const x = at(+b);
      if (it === "fuel") { fuelCap += 5 * k2; modWeight += 0.4 * k; put(0.4 * k, x); fuelAt.push(x); }
      if (it === "ballast") { ballastCap += 5 * k2; modWeight += 0.3 * k; put(0.3 * k, x); ballastAt.push(x); }
    }
    for (const e of sys.engines) put((0.3 + hpEach / 450) * 2, at(e.bay));
    f.empty = f.structure + f.engineWeight + modWeight;
    f.useful = f.gross - f.empty;
    // Crew grows with the ship's size, its engines, and its passengers.
    // The painted deck plan decides the berths once there is one; until then, an estimate from the decks.
    if (sys.gondola) for (let b = sys.gondola.bay; b < sys.gondola.bay + sys.gondola.len && b <= Math.floor(d.bays); b++) { modWeight += 3 * k; put(3 * k, at(b)); }
    const plan = U.decks && d.plan ? U.decks.stats(d) : null;
    f.planned = !!(plan && plan.laidOut);
    f.berths = f.planned ? plan.berths : decks * Math.round(12 * k);
    f.daySeats = f.planned ? plan.daySeats : 0;                      // saloon seats: legs of up to 12 hours only
    f.passengers = f.berths + f.daySeats;
    f.firstBerths = f.planned ? plan.first : 0; f.comfort = f.planned ? plan.comfort : null; f.plan = plan;
    f.cargoCap = holds * 6 * k2;
    // Special compartments take their share of the holds: a square holds the bay's capacity spread over its squares,
    // less for the refrigerated hold (its cooling plant) and the strongroom (its vault).
    f.cargoMix = null;
    if (plan && holds) {
      const perSq = 6 * k2 / (6 * plan.holdRows), h = plan.holdSq;
      const mix = { mail: h.mailroom * perSq, reefer: h.reefer * perSq * 0.8, strong: h.strongroom * perSq * 0.5, garage: h.garage * perSq };
      if (mix.mail + mix.reefer + mix.strong + mix.garage > 0) {
        f.cargoMix = Object.fromEntries(Object.entries(mix).map(([k0, v]) => [k0, Math.round(v * 10) / 10]));
        f.cargoCap = Math.max(0, f.cargoCap - (h.mailroom + h.reefer + h.strongroom + h.garage) * perSq) + mix.mail + mix.reefer + mix.strong + mix.garage;
      }
    }
    f.crewQ = plan ? plan.crewQ : null;
    f.crew = Math.round(4 + 2 * engines + f.berths / 5 + holds + L / 50);
    f.crewBerths = crewBays * Math.round(14 * k) + 8;
    // Ships carry only the ballast they need to land, about 6% of their lift, however much tank space they have.
    f.fuel = fuelCap; f.ballastCap = ballastCap; f.ballast = Math.min(ballastCap, f.gross * 0.06);
    f.payloadRoom = f.useful - fuelCap - f.ballast - f.crew * 0.1;
    f.demand = f.passengers * 0.12 + f.cargoCap;
    // The load, placed where it rides: fuel and ballast in their tanks, passengers on their decks, cargo in the holds, crew in their quarters.
    for (const x of fuelAt) put(fuelCap / fuelAt.length, x);
    for (const x of ballastAt) put(f.ballast / ballastAt.length, x);
    const perDeck = decks ? f.passengers * 0.12 / decks : 0;
    for (const [n, x] of paxBays) put(perDeck * n, x);
    for (const x of holdBays) put(f.cargoCap / holdBays.length, x);
    const crewX = crewAt.length ? crewAt : [ln + 6];
    for (const x of crewX) put(f.crew * 0.1 / crewX.length, x);
    // The structure's weight follows the hull's surface; the fins sit at the tail. The gas's lift follows its volume.
    let sw = 0, swx = 0, gv = 0, gvx = 0;
    for (let i = 0; i <= 120; i++) { const x = L * i / 120, r = radius(d, x); sw += r; swx += r * x; gv += r * r; gvx += r * r * x; }
    put(f.structure * 0.96, swx / sw); put(f.structure * 0.04, L - lt * 0.35);
    const total = masses.reduce((a, m) => a + m[0], 0), cg = masses.reduce((a, m) => a + m[0] * m[1], 0) / total, cb = gvx / gv;
    f.trim = (cg - cb) / L;                                // above 0: tail-heavy, flies nose-up; below 0: nose-heavy
    f.cg = cg; f.cb = cb;
    const off = Math.abs(f.trim);
    f.trimDrag = off <= LEVEL ? 1 : 1 + (off - LEVEL) / (LIMIT - LEVEL) * 0.25;
    // Engine placement: toward the tail a little more efficient; beside the passenger decks, noisy.
    f.noisy = 0;
    for (const e of sys.engines) for (const [n, x] of paxBays) if (Math.abs(at(e.bay) - x) <= BAY + 1) f.noisy++;
    f.rearEngines = sys.engines.filter(e => at(e.bay) > ln + mid * 0.66).length;
    // Speed: cruising power against drag, which grows with the hull's size and falls with good proportions.
    const fin = L / D;
    let drag = 1 + 0.035 * (fin - 6) * (fin - 6);
    for (const k of ["nose", "tail", "fins", "car"]) drag *= opt(k).drag || 1;
    drag *= (has(state, "structures4") ? 0.9 : 1) * (1 + 0.01 * engines) * f.trimDrag;
    drag *= 1 + 0.006 * sys.engines.filter(e => e.mount === "sides").length;          // outrigger struts
    if (sys.gondola) drag *= 1 + 0.035 * sys.gondola.len;                               // a hanging gondola
    const cruise = f.power * 0.7 * (1 + 0.03 * (sys.engines.length ? f.rearEngines / sys.engines.length : 0));
    f.speed = f.power ? 122 * Math.cbrt(cruise / (drag * Math.pow(f.volume, 2 / 3))) : 0;
    f.fuelPerKm = f.speed ? cruise * lim.sfc / f.speed / 1000 : 0;       // tonnes per km
    f.range = f.fuelPerKm ? fuelCap / f.fuelPerKm : 0;
    f.fineness = fin; f.drag = drag;
    // Cost: materials and engines; build time and running cost follow from the price.
    const costK = (opt("nose").cost || 1) * (opt("fins").cost || 1) * (opt("car").cost || 1);
    f.price = Math.round((f.structure * 4500 * costK + f.power * 12 * (lim.diesel ? 1.3 : 1) + 8000 + decks * 6000 + holds * 2000 + crewBays * 3000) / 1000) * 1000;
    f.buildDays = Math.round(90 + f.price / 2000);
    f.daily = Math.round(f.price * 0.0014);
    f.shed = shedNeeded(state, L, D);
    // Is it sound?
    const lean = f.trim > 0 ? "tail-heavy" : "nose-heavy";
    if (f.useful <= 0) { f.status = "sink"; f.notes.push("It cannot lift its own weight. Make the hull longer or wider, or lighten it."); }
    else if (off > LIMIT) { f.status = "sink"; f.notes.push(`Far too ${lean} to fly. Move weight ${f.trim > 0 ? "forward" : "aft"}, or add ballast ${f.trim > 0 ? "toward the bow" : "toward the tail"}.`); }
    else if (f.payloadRoom < f.demand * 0.5) { f.status = "heavy"; f.notes.push(`It flies, but can carry only ${Math.max(0, Math.round(f.payloadRoom / Math.max(1, f.demand) * 100))}% of a full load.`); }
    else f.status = "fly";
    if (f.status !== "sink" && off > LEVEL) f.notes.push(`Somewhat ${lean}: it flies ${f.trim > 0 ? "nose-up" : "nose-down"}, costing speed and fuel.`);
    if (f.noisy) f.notes.push("Engines beside the passenger decks make the cabins noisy.");
    if (f.status !== "sink" && f.payloadRoom < f.demand) f.notes.push("Fully loaded it would be overweight: lighten it, or fly with fewer passengers and less cargo.");
    if (!f.shed) f.notes.push("No shed is large enough to build it.");
    if (!engines) f.notes.push("It has no engines.");
    if (ballastCap < f.gross * 0.04) f.notes.push("Too little water ballast to land safely.");
    // Crews sleep in watches, so berths are needed for about 60% of them.
    f.crewNeedBerths = Math.ceil(f.crew * 0.6);
    if (f.crewBerths < f.crewNeedBerths) f.notes.push(`Berths for ${f.crewNeedBerths} crew needed (they sleep in watches), but only ${f.crewBerths}.`);
    if (fin > 9) f.notes.push("Very long and slender: more drag from its skin, and hard to handle.");
    if (fin < 4) f.notes.push("Short and fat: a lot of drag for its size.");
    if (f.planned) { f.notes.push(...plan.notes); if (plan.empty.length) f.notes.push(`Not laid out yet: the ${plan.empty.join(", ")}.`); }
    else if (decks) f.notes.push("The passenger decks are not laid out yet; passenger figures are estimates.");
    if (f.status === "fly" && f.notes.length === 0) f.notes.push("Flies, and everyone has a berth.");
    return f;
  }

  // Starting points. Each gives proportions and systems; diameters beyond what research allows are trimmed.
  const sys = (engines, modules, fittings, deckCount = {}, mount = "below") => ({ engines: engines.map(e => ({ mount, ...e })), modules, fittings, deckCount });
  const PRESETS = {
    blank: { label: "Blank hull", type: "Design study", D: 22, bays: 7, nose: "rounded", tail: "standard", fins: "standard", car: "external",
      systems: sys([{ bay: 5 }, { bay: 7 }], { 1: "control", 2: "passenger", 4: "cargo", 6: "crew" }, { 3: ["fuel"], 5: ["ballast"], 6: ["fuel"] }) },
    bodensee: { label: "A Bodensee type", type: "Short-haul passenger ship", D: 18.7, bays: 5, nose: "rounded", tail: "standard", fins: "standard", car: "external",
      systems: sys([{ bay: 4 }, { bay: 5 }], { 1: "control", 2: "passenger" }, { 3: ["fuel"], 4: ["ballast"] }) },
    graf: { label: "A Graf Zeppelin type", type: "Long-range passenger ship", D: 30.5, bays: 11, nose: "rounded", tail: "standard", fins: "standard", car: "external",
      systems: sys([{ bay: 5 }, { bay: 8 }, { bay: 10 }], { 1: "control", 2: "passenger", 3: "passenger", 4: "cargo", 6: "crew", 7: "cargo", 9: "crew" },
        { 3: ["fuel"], 5: ["ballast"], 6: ["fuel"], 8: ["fuel"], 9: ["ballast"], 10: ["fuel"] }) },
    liner: { label: "A great liner", type: "Great liner", D: 41.2, bays: 10, nose: "rounded", tail: "cruciform", fins: "standard", car: "external",
      systems: sys([{ bay: 7 }, { bay: 9 }], { 1: "control", 3: "passenger", 4: "passenger", 5: "cargo", 6: "crew", 8: "cargo", 9: "crew" },
        { 2: ["fuel"], 3: ["fuel", "ballast"], 6: ["fuel"], 7: ["ballast"], 9: ["fuel"], 10: ["fuel", "ballast"] }, { 4: 2, 5: 2 }, "sides") }
  };
  function preset(state, key) {
    const p = JSON.parse(JSON.stringify(PRESETS[key])), lim = limits(state);
    p.trimmed = p.D > lim.maxD;
    p.D = Math.min(p.D, lim.maxD);
    p.gas = "hydrogen"; p.key = key;
    if (U.decks) U.decks.standardLayout(p);
    return p;
  }

  U.physics = { bayCount, isHalf, bayLen, bayCentre, BAY, TWO_DECKS, LEVEL, LIMIT, figures, radius, hullLengths, limits, shedNeeded, preset, PRESETS };
})(window.UpShip);
