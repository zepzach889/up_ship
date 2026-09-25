// Era I research: technologies, their effects on ships, the classes they unlock, and refits.
window.UpShip = window.UpShip || {};
(function (U) {
  const BRANCHES = [
    { id: "engines", name: "Engines", refine: { name: "Engine refinement", effect: "2% faster, every ship" } },
    { id: "structures", name: "Structures", refine: { name: "Structural refinement", effect: "2% more payload, every ship" } },
    { id: "operations", name: "Operations", refine: { name: "Operating refinement", effect: "3% lower running costs" } }
  ];
  // fit: "ship" = built into new ships, refit available; "new" = new ships only; "company" = every ship at once.
  const TECHS = [
    { id: "engines1", branch: "engines", tier: 1, name: "Improved engines", fit: "ship", effect: "8% faster; engine failures 25% less likely" },
    { id: "engines2", branch: "engines", tier: 2, name: "Reversible engines", fit: "ship", effect: "Turnaround an hour shorter" },
    { id: "engines3", branch: "engines", tier: 3, name: "Blau gas fuel", fit: "ship", effect: "20% more range; 10% lower fuel cost" },
    { id: "engines4", branch: "engines", tier: 4, name: "Diesel engines", fit: "ship", effect: "25% lower fuel cost; lower fire risk later" },
    { id: "structures1", branch: "structures", tier: 1, name: "Improved duralumin girders", fit: "ship", effect: "10% more passengers and cargo" },
    { id: "structures2", branch: "structures", tier: 2, name: "Better gas cells", fit: "ship", effect: "20% slower wear; 5% more payload" },
    { id: "structures3", branch: "structures", tier: 3, name: "Deep ring frames", fit: "ship", effect: "3 more years of service life" },
    { id: "structures4", branch: "structures", tier: 4, name: "Streamlined hulls", fit: "new", effect: "10% faster and 10% more range, new ships only" },
    { id: "operations1", branch: "operations", tier: 1, name: "Weather service", fit: "company", effect: "All incidents 20% less likely" },
    { id: "operations2", branch: "operations", tier: 2, name: "Radio navigation", fit: "company", effect: "Forced-landing repairs take half as long" },
    { id: "operations3", branch: "operations", tier: 3, name: "High mooring masts", fit: "company", effect: "Turnaround an hour shorter, every ship" },
    { id: "operations4", branch: "operations", tier: 4, name: "Passenger comforts", fit: "ship", effect: "15% higher fares on equipped ships" }
  ];
  const TIER_COST = { 1: 25000, 2: 32000, 3: 40000, 4: 50000 };
  const TIER_DAYS = { 1: 250, 2: 290, 3: 360, 4: 390 };       // at normal funding: about ten years for all twelve
  const FUNDING = {
    low: { name: "Low", cost: 0.6, speed: 0.55 },
    normal: { name: "Normal", cost: 1, speed: 1 },
    high: { name: "High", cost: 1.7, speed: 1.5 }
  };
  const REFINE_COST = 30000, REFINE_DAYS = 180, REFINE_GROWTH = 1.25;
  const REFIT_SHARE = { ship: 0.05, operations4: 0.04 };
  const techById = Object.fromEntries(TECHS.map(t => [t.id, t]));

  // Classes unlocked by research. German figures are the baseline; other countries scale them.
  const UNLOCKS = [
    { role: "medium", kind: "passenger", requires: ["engines1", "structures2"], base: { passengers: 45, cargoTons: 2, speedKmh: 115, rangeKm: 2500, crew: 18, price: 150000, dailyCost: 220, fuelPerKm: 0.13, buildDays: 150 },
      names: { germany: "Möwe", britain: "Kittiwake", france: "Mouette", italy: "Rondine" }, roleName: "Medium passenger ship" },
    { role: "freighter", kind: "cargo", requires: ["structures3", "operations3"], base: { passengers: 0, cargoTons: 25, speedKmh: 95, rangeKm: 3000, crew: 16, price: 140000, dailyCost: 200, fuelPerKm: 0.14, buildDays: 150 },
      names: { germany: "Pelikan", britain: "Cormorant", france: "Pélican", italy: "Pellicano" }, roleName: "Heavy freighter" },
    { role: "liner", kind: "passenger", requires: ["structures3", "engines3", "operations2"], base: { passengers: 60, cargoTons: 8, speedKmh: 115, rangeKm: 7000, crew: 36, price: 280000, dailyCost: 420, fuelPerKm: 0.22, buildDays: 240 },
      names: { germany: "Albatros", britain: "Imperial", france: "Frégate", italy: "Falco" }, roleName: "Long-range liner", liner: true }
  ];
  const NATION_SCALE = {
    germany: { cap: 1, range: 1, speed: 1, price: 1, days: 0 },
    britain: { cap: 1.2, range: 1.15, speed: 0.93, price: 1.12, days: 30 },
    france: { cap: 0.9, range: 1, speed: 1, price: 0.88, days: 0 },
    italy: { cap: 0.8, range: 0.85, speed: 1, price: 0.8, days: -30 }
  };
  const SHIP_NAMES = {
    medium: { germany: ["Allgäu", "Schwarzwald", "Taunus", "Harz", "Eifel", "Spessart"], britain: ["Pennine", "Cotswold", "Chiltern", "Mendip", "Quantock", "Malvern"],
      france: ["Champagne", "Bourgogne", "Auvergne", "Savoie", "Anjou", "Berry"], italy: ["Piemonte", "Veneto", "Marche", "Abruzzo", "Calabria", "Molise"] },
    freighter: { germany: ["Hansa", "Ruhr", "Saar", "Mosel", "Neckar", "Main"], britain: ["Tyneside", "Clydeside", "Humber", "Solent", "Medway", "Wear"],
      france: ["Loire", "Seine", "Rhône", "Garonne", "Marne", "Saône"], italy: ["Po", "Arno", "Adige", "Piave", "Brenta", "Isonzo"] },
    liner: { germany: ["Rheinland", "Westfalen", "Pommern", "Holstein", "Thüringen", "Franken"], britain: ["Britannia", "Empire", "Dominion", "Commonwealth", "Endeavour", "Resolution"],
      france: ["Atlantide", "Méridien", "Horizon", "Zénith", "Étoile", "Aurore"], italy: ["Vittoria", "Aurora", "Serenissima", "Fortuna", "Concordia", "Speranza"] }
  };

  // Build the twelve new classes into the ship catalog.
  const CLASS_UNLOCK = {};
  for (const nation of U.NATION_ORDER) {
    const s = NATION_SCALE[nation];
    U.RESEARCH_CATALOG = U.RESEARCH_CATALOG || {};
    U.RESEARCH_CATALOG[nation] = [];
    for (const u of UNLOCKS) {
      const id = `${u.role}-${nation}`, b = u.base;
      U.SHIP_CLASSES[id] = {
        id, kind: u.kind, art: u.role, liner: !!u.liner, name: `${u.names[nation]} class`, role: u.roleName,
        basis: "Built with Era I research", requires: u.requires,
        passengers: Math.round(b.passengers * s.cap), cargoTons: Math.round(b.cargoTons * s.cap),
        speedKmh: Math.round(b.speedKmh * s.speed), rangeKm: Math.round(b.rangeKm * s.range / 100) * 100, crew: Math.round(b.crew * s.cap),
        price: Math.round(b.price * s.price / 1000) * 1000, dailyCost: Math.round(b.dailyCost * s.price), fuelPerKm: b.fuelPerKm * s.cap,
        buildDays: b.buildDays + s.days, names: SHIP_NAMES[u.role][nation]
      };
      U.RESEARCH_CATALOG[nation].push(id);
      CLASS_UNLOCK[id] = u.requires;
    }
  }

  // State ---------------------------------------------------------------------------------
  function init(state) {
    state.research = { done: {}, progress: {}, current: null, funding: "normal", refinements: { engines: 0, structures: 0, operations: 0 } };
  }
  const R = state => state.research;
  const has = (state, id) => !!R(state).done[id];

  function available(state, id) {
    if (id.startsWith("refine-")) {
      const branch = id.slice(7);
      return TECHS.filter(t => t.branch === branch).every(t => has(state, t.id));
    }
    const t = techById[id];
    if (!t || has(state, id)) return false;
    return TECHS.filter(x => x.branch === t.branch && x.tier < t.tier).every(x => has(state, x.id));
  }
  function projectInfo(state, id) {
    if (id.startsWith("refine-")) {
      const branch = id.slice(7), n = R(state).refinements[branch], b = BRANCHES.find(x => x.id === branch);
      return { id, name: `${b.refine.name} ${U.sim.roman(n + 1)}`, effect: b.refine.effect, cost: Math.round(REFINE_COST * REFINE_GROWTH ** n / 1000) * 1000, days: REFINE_DAYS, branch };
    }
    const t = techById[id];
    return { id, name: t.name, effect: t.effect, cost: TIER_COST[t.tier], days: TIER_DAYS[t.tier], branch: t.branch, tech: t };
  }
  function choose(state, id) {
    if (!available(state, id)) return false;
    R(state).current = id;
    return true;
  }
  function setFunding(state, level) { if (FUNDING[level]) R(state).funding = level; }
  function monthlyCost(state) {
    const r = R(state);
    if (!r.current) return 0;
    const p = projectInfo(state, r.current);
    return p.cost / p.days * 30 * FUNDING[r.funding].cost;
  }
  function daysLeft(state) {
    const r = R(state);
    if (!r.current) return 0;
    const p = projectInfo(state, r.current);
    return Math.ceil((1 - (r.progress[r.current] || 0)) * p.days / FUNDING[r.funding].speed);
  }

  // Called once a day from the simulation.
  function daily(state) {
    const r = R(state);
    if (!r.current) return;
    const p = projectInfo(state, r.current);
    const f = FUNDING[r.funding];
    const cost = p.cost / p.days * f.cost;
    U.sim.addGeneral(state, cost);
    state.year.research = (state.year.research || 0) + cost;
    r.progress[r.current] = (r.progress[r.current] || 0) + f.speed / p.days;
    if (r.progress[r.current] >= 1) {
      const hour = U.sim.H(state.tick);
      delete r.progress[r.current];
      if (p.id.startsWith("refine-")) r.refinements[p.branch] += 1;
      else r.done[p.id] = true;
      r.current = null;
      const unlocked = Object.keys(CLASS_UNLOCK).filter(id => U.RESEARCH_CATALOG[state.company.nation].includes(id)
        && CLASS_UNLOCK[id].includes(p.id) && CLASS_UNLOCK[id].every(x => has(state, x)));
      U.sim.telegram(state, hour, `research complete stop ${p.name} stop${unlocked.map(id => ` new ship available ${U.SHIP_CLASSES[id].name} stop`).join("")} choose next project stop`, true, { type: "research" });
    }
  }

  function unlockedClasses(state) {
    return (U.RESEARCH_CATALOG[state.company.nation] || []).filter(id => CLASS_UNLOCK[id].every(x => has(state, x)));
  }

  // Ships ---------------------------------------------------------------------------------
  // Improvements a newly ordered ship is built with.
  function builtWith(state) {
    return TECHS.filter(t => (t.fit === "ship" || t.fit === "new") && has(state, t.id)).map(t => t.id);
  }
  function refitOptions(state, ship) {
    const fitted = new Set(ship.fitted || []);
    const price = U.SHIP_CLASSES[ship.classId].price;
    return TECHS.filter(t => t.fit === "ship" && has(state, t.id) && !fitted.has(t.id))
      .map(t => ({ id: t.id, name: t.name, effect: t.effect, cost: Math.round(price * (REFIT_SHARE[t.id] || REFIT_SHARE.ship) / 100) * 100 }));
  }
  // Apply the refits chosen for this ship, during its overhaul. Returns the total cost.
  function applyRefits(state, ship) {
    const plan = ship.refitPlan || [];
    let cost = 0;
    const done = [];
    for (const o of refitOptions(state, ship)) {
      if (!plan.includes(o.id)) continue;
      cost += o.cost; ship.fitted.push(o.id); done.push(o.name);
      if (o.id === "structures3") ship.lifeYears += 3;
    }
    ship.refitPlan = [];
    return { cost, done };
  }

  // A ship's working figures after research.
  function stats(state, ship) {
    const c = U.SHIP_CLASSES[ship.classId], f = new Set(ship.fitted || []), r = R(state);
    // Helium lifts about 8% less: it comes out of cargo, since passenger ships fill their cabins before their lift.
    // A ship out of gas flies light, losing a fifth of everything it can carry.
    const light = ship.gasLeft != null && ship.gasLeft <= 0 ? 0.8 : 1, heCargo = ship.gas === "helium" ? 0.92 : 1;
    const payload = (f.has("structures1") ? 1.1 : 1) * (f.has("structures2") ? 1.05 : 1) * (1 + 0.02 * r.refinements.structures) * light;
    const speed = c.speedKmh * (f.has("engines1") ? 1.08 : 1) * (f.has("structures4") ? 1.1 : 1) * (1 + 0.02 * r.refinements.engines);
    return {
      passengers: Math.floor(c.passengers * payload),
      cargoTons: Math.round(c.cargoTons * payload * heCargo * 10) / 10,
      speedKmh: Math.round(speed),
      rangeKm: Math.round(c.rangeKm * (f.has("engines3") ? 1.2 : 1) * (f.has("structures4") ? 1.1 : 1) / 100) * 100,
      fuelPerKm: c.fuelPerKm * (f.has("engines3") ? 0.9 : 1) * (f.has("engines4") ? 0.75 : 1),
      dailyCost: c.dailyCost * (1 - 0.03 * r.refinements.operations),
      wear: f.has("structures2") ? 0.8 : 1,
      engineFailure: f.has("engines1") ? 0.75 : 1,
      incidents: has(state, "operations1") ? 0.8 : 1,
      repairDays: has(state, "operations2") ? 0.5 : 1,
      turnaround: Math.max(1, U.ECONOMY.turnaroundHours - (f.has("engines2") ? 1 : 0) - (has(state, "operations3") ? 1 : 0)),
      fare: f.has("operations4") ? 1.15 : 1
    };
  }

  U.research = { BRANCHES, TECHS, FUNDING, techById, init, has, available, projectInfo, choose, setFunding, monthlyCost, daysLeft,
    daily, unlockedClasses, builtWith, refitOptions, applyRefits, stats, CLASS_UNLOCK };
})(window.UpShip);
