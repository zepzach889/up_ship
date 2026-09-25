// Masts, terminals, and sheds: the company's own, and the public ones at larger cities.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;
  const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
  const cityName = id => U.cityById[id].name;

  // Level 1 to 3 is small, medium, large. Costs are for reaching that level from the one below.
  const TYPES = {
    mast: { name: "Mast", costs: [3500, 6000, 12000], docks: [1, 3, 6],
      about: ["Docks one ship at a time", "Docks three ships at once", "Docks six ships at once"] },
    terminal: { name: "Terminal", costs: [5000, 12000, 27000], pax: [120, 300, Infinity], tons: [40, 100, Infinity],
      about: ["120 passengers and 40 tons a day", "300 passengers and 100 tons a day", "No limit, and 10% more demand"] },
    shed: { name: "Shed", costs: [15000, 24000, 48000],
      about: ["Overhauls and builds small ships", "Overhauls and builds medium ships", "Overhauls and builds every ship"] },
    gasplant: { name: "Gas plant", costs: [4000], about: ["Hydrogen for your ships here, without the public supply"] },
    hestore: { name: "Helium store", costs: [6000], about: ["Helium bought by the trainload: much cheaper here inland"] }
  };
  const GAS_TYPES = ["gasplant", "hestore"];
  const SIZE_NAMES = ["None", "Small", "Medium", "Large"];
  const PUBLIC_LEVEL = 2;
  const BASIC_ROOM = { pax: 40, tons: 15 };            // the waiting room that comes with an own mast
  const FEES = { mast: 2, pax: 0.05, ton: 0.1, shed: 0.15 };
  const UPKEEP = 0.02;                                  // of building cost, per year

  // Public masts, terminals, and sheds stand at major and large cities and capitals.
  const hasPublic = id => { const c = U.cityById[id]; return c.tier === "major" || c.tier === "large" || c.specialty === "capital"; };

  // Ship sizes: 1919 purpose-built ships are small; surplus, medium passenger, and freighter medium; liners large.
  function shipSize(classId) {
    const c = U.SHIP_CLASSES[classId];
    if (c.liner) return 3;
    if (c.kind === "surplus" || c.art === "medium" || c.art === "freighter") return 2;
    return 1;
  }

  function init(state) {
    state.facilities = {};
    state.facilityCost = {};
    state.cityDay = {};
    state.docking = {};
    state.congestion = {};
    const home = state.company.home, hc = U.cityById[home];
    own(state, home).mast = 1;
    state.facilityCost[home] = TYPES.mast.costs[0];
    if (hc.works) own(state, home).shed = 3;
    else if (!hasPublic(home)) own(state, home).shed = 1;
  }
  function own(state, id) {
    const f = state.facilities[id] = state.facilities[id] || { mast: 0, terminal: 0, shed: 0 };
    f.gasplant = f.gasplant || 0; f.hestore = f.hestore || 0;
    return f;
  }
  const ownLevel = (state, id, type) => (state.facilities[id] || {})[type] || 0;

  // What a company can use at a city: its own facility, or the public one.
  function effective(state, id, type) {
    const mine = ownLevel(state, id, type), pub = hasPublic(id) ? PUBLIC_LEVEL : 0;
    if (mine >= pub && mine) return { level: mine, own: true };
    if (pub) return { level: pub, own: false };
    return { level: 0, own: false };
  }
  const canLand = (state, id) => effective(state, id, "mast").level > 0;

  function terminalLimits(state, id) {
    const t = effective(state, id, "terminal");
    if (t.level) return { pax: TYPES.terminal.pax[t.level - 1], tons: TYPES.terminal.tons[t.level - 1], own: t.own, level: t.level };
    if (ownLevel(state, id, "mast")) return { pax: BASIC_ROOM.pax, tons: BASIC_ROOM.tons, own: true, level: 0 };
    return { pax: 0, tons: 0, own: false, level: 0 };
  }
  const demandBoost = (state, id) => ownLevel(state, id, "terminal") === 3 ? 1.1 : 1;

  // Building ---------------------------------------------------------------------------
  function nextCost(state, id, type) {
    const lvl = ownLevel(state, id, type);
    return lvl >= TYPES[type].costs.length ? null : TYPES[type].costs[lvl];
  }
  function build(state, id, type) {
    const cost = nextCost(state, id, type);
    if (cost == null || state.money < cost) return false;
    state.money -= cost;
    own(state, id)[type] += 1;
    state.facilityCost[id] = (state.facilityCost[id] || 0) + cost;
    state.year.facilities = (state.year.facilities || 0) + cost;
    return true;
  }
  // Masts needed before a route can fly: stops with neither an own nor a public mast.
  const mastsNeeded = (state, stops) => [...new Set(stops)].filter(id => !canLand(state, id));

  // Daily running: upkeep, and each city's traffic count starts again.
  function daily(state) {
    const total = Object.values(state.facilityCost).reduce((a, b) => a + b, 0);
    if (total) S().addGeneral(state, total * UPKEEP / 365);
    state.cityDay = {};
  }

  // Boarding limits at a city for today, after what has already boarded.
  function roomToday(state, id) {
    const lim = terminalLimits(state, id), used = state.cityDay[id] || { pax: 0, tons: 0 };
    return { pax: Math.max(0, lim.pax - used.pax), tons: Math.max(0, lim.tons - used.tons), own: lim.own };
  }
  function recordBoarding(state, id, pax, tons) {
    const d = state.cityDay[id] = state.cityDay[id] || { pax: 0, tons: 0 };
    d.pax += pax; d.tons += tons;
    return roomToday(state, id).own ? 0 : pax * FEES.pax + tons * FEES.ton;
  }

  // Docking: a ship arriving when every berth is taken circles until one frees up.
  // Returns the extra hours spent circling and any mast fee.
  function dock(state, id, arrive, stay) {
    const cap = TYPES.mast.docks[effective(state, id, "mast").level - 1] || 1;
    const list = (state.docking[id] = (state.docking[id] || []).filter(x => x.to > arrive - 48));
    let t = arrive;
    for (let guard = 0; guard < 20; guard++) {
      const busy = list.filter(x => x.from < t + stay && x.to > t);
      if (busy.length < cap) break;
      t = Math.min(...busy.map(x => x.to));
    }
    list.push({ from: t, to: t + stay });
    const delay = t - arrive;
    if (delay > 0.5) {
      const c = state.congestion[id] = state.congestion[id] || { hours: 0, warnedMonth: -1, lastHour: 0 };
      c.hours += delay; c.lastHour = t;
      const month = Math.floor(t / (24 * 30));
      if (c.hours > 24 && c.warnedMonth !== month) {
        c.warnedMonth = month; c.hours = 0;
        S().telegram(state, t, `ships circling at ${cityName(id)} waiting for the mast stop a bigger mast would help stop`, false, { type: "city", id });
      }
    }
    return { delay, fee: ownLevel(state, id, "mast") ? 0 : FEES.mast };
  }
  const congested = (state, id, hour) => {
    const c = state.congestion[id];
    const lim = terminalLimits(state, id), used = state.cityDay[id];
    return (c && hour - c.lastHour < 72) || (used && lim.pax !== Infinity && (used.pax >= lim.pax || used.tons >= lim.tons));
  };

  // Sheds ------------------------------------------------------------------------------
  function shedFits(state, id, classId) { return effective(state, id, "shed").level >= shipSize(classId); }
  // The nearest city whose shed can overhaul this ship, and whether it is the company's own.
  function nearestShed(state, ship) {
    let best = null, bd = Infinity;
    const range = U.research.stats(state, ship).rangeKm;
    for (const c of U.CITIES) {
      if (!shedFits(state, c.id, ship.classId)) continue;
      const d = S().distanceKm(ship.location, c.id);
      if (d > range) continue;
      const cost = d + (effective(state, c.id, "shed").own ? 0 : 150);   // prefer own sheds a little
      if (cost < bd) { bd = cost; best = c.id; }
    }
    return best;
  }
  // Where a newly ordered ship can be delivered: home if its shed fits, otherwise the company's own shed that does.
  function deliveryCity(state, classId) {
    if (shedFits(state, state.company.home, classId)) return state.company.home;
    const ownSheds = Object.keys(state.facilities).filter(id => ownLevel(state, id, "shed") >= shipSize(classId));
    return ownSheds[0] || null;
  }

  // Lifting gas --------------------------------------------------------------------------
  const GAS = {
    hydrogen: { name: "Hydrogen", range: 1500, perKm: 0.0006 },
    helium: { name: "Helium", range: 2500, perKm: 0.0045 }
  };
  const HELIUM_PORTS = ["hamburg", "amsterdam", "london", "marseille", "genoa"];
  // Public gas supplies stand in industrial cities and in major and large cities and capitals.
  const publicGas = id => { const c = U.cityById[id]; return c.specialty === "industrial" || hasPublic(id); };
  function canTopUp(state, id, gas) {
    if (publicGas(id)) return true;
    return gas === "helium" ? ownLevel(state, id, "hestore") > 0 : ownLevel(state, id, "gasplant") > 0 || ownLevel(state, id, "hestore") > 0;
  }
  // Helium arrives by rail from the ports: dearer the farther inland, much less so with your own store.
  function heliumPrice(state, id) {
    const km = Math.min(...HELIUM_PORTS.map(p => S().distanceKm(id, p)));
    const factor = Math.min(2.5, 1 + 0.35 * km / 500);
    return ownLevel(state, id, "hestore") ? 1 + (factor - 1) * 0.25 : factor;
  }
  // The longest stretch of a route with nowhere to top up, for warnings when drawing routes.
  function gasGap(state, stops, circuit, gas) {
    const seq = circuit ? stops.concat(stops) : stops.concat(stops.slice(0, -1).reverse(), stops.slice(1));
    let run = 0, worst = { km: 0, from: null, to: null }, from = seq[0];
    for (let i = 1; i < seq.length; i++) {
      run += S().distanceKm(seq[i - 1], seq[i]);
      if (run > worst.km) worst = { km: run, from, to: seq[i] };
      if (canTopUp(state, seq[i], gas)) { run = 0; from = seq[i]; }
    }
    return worst;
  }

  U.facilities = { TYPES, GAS_TYPES, GAS, HELIUM_PORTS, publicGas, canTopUp, heliumPrice, gasGap, SIZE_NAMES, FEES, BASIC_ROOM, hasPublic, shipSize, init, ownLevel, effective, canLand, terminalLimits,
    demandBoost, nextCost, build, mastsNeeded, daily, roomToday, recordBoarding, dock, congested, shedFits, nearestShed, deliveryCity };
})(window.UpShip);
