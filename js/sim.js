// Game state, turns, routes, ships, wear, incidents, telegrams, and the economy.
window.UpShip = window.UpShip || {};
(function (U) {
  const SAVE_KEY = "upship.save.v11";
  const VERSION = 11;
  const E = () => U.ECONOMY;
  const TH = () => U.TIME.tickHours;
  const H = tick => tick * TH();                 // hours since 7 am, 1 January 1919
  const cls = ship => U.SHIP_CLASSES[ship.classId];
  const rand = (a, b) => a + Math.random() * (b - a);

  // Geography -------------------------------------------------------------------
  function distanceKm(a, b) {
    if (typeof a === "string") a = U.cityById[a];
    if (typeof b === "string") b = U.cityById[b];
    const R = 6371, rad = Math.PI / 180;
    const la = a.realLat ?? a.lat, lo = a.realLon ?? a.lon, lb = b.realLat ?? b.lat, lob = b.realLon ?? b.lon;      // gateways measure from their real places
    // Mountain walls: where the straight way would cross one, the distance is by a pass or round an end.
    if (U.barriers) return U.barriers.route([la, lo], [lb, lob]).km;
    const dLat = (lb - la) * rad, dLon = (lob - lo) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la * rad) * Math.cos(lb * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // The way between two places: its distance, the passes or headlands it goes by, and any load limit a high pass sets.
  function legWay(a, b) {
    if (typeof a === "string") a = U.cityById[a]; if (typeof b === "string") b = U.cityById[b];
    return U.barriers.route([a.realLat ?? a.lat, a.realLon ?? a.lon], [b.realLat ?? b.lat, b.realLon ?? b.lon]);
  }
  function nearestCity(lat, lon) {
    let best = null, bd = Infinity;
    for (const c of U.CITIES) { const d = distanceKm({ lat, lon }, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  // Prices and demand -------------------------------------------------------------
  const fare = km => E().fareBase + E().farePerKm * km;
  const freightRate = km => E().freightBase + E().freightPerKm * km;
  // A city's tier, allowing for booms (Oklahoma City's oil from 1928).
  const tierOf = c => c.boom && U.state && dateOf(U.state.tick).getUTCFullYear() >= c.boom.year ? c.boom.tier : c.tier;
  function paxWeight(c) { return U.TIERS[tierOf(c)].demand * U.SPECIALTIES[c.specialty].passengerBoost * (c.station ? 0.15 : 1); }
  function freightWeight(c) { return U.TIERS[tierOf(c)].demand / 6 * U.SPECIALTIES[c.specialty].freightBoost; }
  // Seasons: travel peaks in high summer and falls off in winter, about 15% either way.
  const season = () => { if (!U.state) return 1; const m = dateOf(U.state.tick).getUTCMonth(); return 1 + 0.15 * Math.cos((m - 6.5) / 12 * 2 * Math.PI); };
  // Travel into and out of the Soviet Union was restricted: few visas, so few passengers for a foreign line.
  const soviet = id => U.cityById[id].empire === "ussr";
  function dailyPassengers(a, b) { return Math.sqrt(paxWeight(U.cityById[a]) * paxWeight(U.cityById[b])) * E().passengerShare * season() * (soviet(a) || soviet(b) ? 0.6 : 1); }
  function dailyFreight(a, b) { return Math.sqrt(freightWeight(U.cityById[a]) * freightWeight(U.cityById[b])) * E().freightShare; }
  const pairKey = (a, b) => a + ">" + b;

  function servedPairs(state) {
    const set = new Set();
    for (const r of state.routes)
      for (let i = 0; i < r.stops.length; i++)
        for (let j = 0; j < r.stops.length; j++)
          if (i !== j) set.add(pairKey(r.stops[i], r.stops[j]));
    return [...set];
  }

  // Travelers arrive through the day; a half-day turn brings half a day's worth.
  function refillDemand(state, first, share = 0.5) {
    const swing = () => 1 + (Math.random() * 2 - 1) * E().demandSwing;
    const next = {}, pulls = U.passengers.pairPulls(state);
    for (const key of servedPairs(state)) {
      const [a, b] = key.split(">");
      const boost = state.facilities ? U.facilities.demandBoost(state, a) * U.facilities.demandBoost(state, b) : 1;
      // Comfort and fares on the routes serving this pair decide how many travelers it generates.
      const pull = pulls[key] || { first: 1, second: 1 };
      // Competition from rail, sea, and air reshapes demand pair by pair (the map-wide average stays the same).
      const comp = U.competition.mult(state, a, b);
      const raw = U.passengers.demandSplit(state, a, b, dailyPassengers(a, b) * boost * comp), f = dailyFreight(a, b) * (1 + (comp - 1) * 0.7);
      const split = { first: raw.first * pull.first, second: raw.second * pull.second };
      const w = state.waiting[key];
      next[key] = !w ? (first ? { p1: split.first, p2: split.second, tons: f } : { p1: 0, p2: 0, tons: 0 })
        : { p1: Math.min(w.p1 + split.first * share * swing(), split.first * E().passengerWaitDays),
            p2: Math.min(w.p2 + split.second * share * swing(), split.second * E().passengerWaitDays),
            tons: Math.min(w.tons + f * share * swing(), f * E().freightWaitDays) };
    }
    state.waiting = next;
  }

  // Names -------------------------------------------------------------------------
  function roman(n) {
    const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let out = "";
    for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
    return out;
  }
  // Uses every name in the class's list, then the whole list again with II, III, and so on.
  // The next name for a ship of a class: the class's own names first, then the theme chosen for the design (or the
  // nation's usual style), and only then numerals.
  function suggestName(state, classId) {
    const c = U.SHIP_CLASSES[classId], e = c.designed && (state.designs || []).find(x => x.id === c.designId);
    const own = c.names || [], pool = U.themeNames ? U.themeNames(state, e && e.theme) : [];
    const names = own.concat(pool).filter((n, i, all) => all.indexOf(n) === i);
    for (const n of names) if (!state.usedNames[n]) return n;
    for (let round = 1; round < 100; round++)
      for (const n of names) {
        const name = round === 1 ? n : `${n} ${roman(round)}`;
        if (!state.usedNames[name]) return name;
      }
    return names[0] + " " + Date.now();
  }

  // Telegrams ---------------------------------------------------------------------
  // major: stops auto-play. Minor ones slow it to normal speed until dismissed.
  function telegram(state, hour, text, major, target) {
    state.pendingTelegrams.push({ id: "t" + state.nextId++, hour, text: text.toUpperCase(), major: !!major, target: target || null });
  }

  // New game ----------------------------------------------------------------------
  function blankDay() { return { revenue: 0, costs: 0, byRoute: {} }; }
  function blankStats() { return { flights: 0, passengers: 0, tons: 0, revenue: 0, costs: 0 }; }

  function newShip(state, classId, name, location, deliveryTick, config = "two", gas = "hydrogen") {
    const c = U.SHIP_CLASSES[classId], surplus = c.kind === "surplus";
    const ship = {
      id: "s" + state.nextId++, name, classId,
      routeId: null, location, turnLocation: location, stop: 0, dir: 1,
      legs: [], readyHour: H(deliveryTick), deliveryTick,
      condition: surplus ? E().surplusStartCondition : 1,
      lifeYears: surplus ? E().lifeYears.surplus : E().lifeYears.built,
      overhaulAt: E().defaultOverhaulAt, overhaulUntil: null, endWarned: false,
      fitted: state.research ? U.research.builtWith(state) : [], refitPlan: [], art: c.designed ? c.art : undefined,
      config: c.passengers ? config : null, reconfigTo: null,
      gas, gasTo: null, gasLeft: U.facilities.GAS[gas].range, sinceTopUp: 0,
      stats: blankStats()
    };
    if (ship.fitted.includes("structures3")) ship.lifeYears += 3;
    state.usedNames[name] = true;
    state.ships.push(ship);
    return ship;
  }

  // config: { nation, home, name, director, emblem } from the setup screen.
  function start(config) {
    const homeCity = U.cityById[config.home];
    const state = {
      research: null,
      version: VERSION, tick: 0, plannedTick: -1, nextId: 1,
      money: E().startingMoney + (homeCity.works ? 0 : E().noWorksBonus),
      company: { name: config.name, director: config.director, nation: config.nation, home: config.home, emblem: config.emblem },
      routes: [], ships: [], waiting: {}, usedNames: {},
      surplusLeft: {},
      day: blankDay(), history: [],
      year: { year: 1919, revenue: 0, costs: 0, purchases: 0, sales: 0 },
      totals: blankStats(),
      telegrams: [], pendingTelegrams: [],
      month: 0, fundsWarned: false
    };
    U.research.init(state);
    U.facilities.init(state);
    U.passengers.init(state);
    state.empireCarried = true; state.sovietCarried = true;
    if (config.nation === "japan" && state.research) { state.research.done = state.research.done || {}; state.research.done.operations1 = true; }          // an island empire keeps a weather service
    if (config.nation === "usa") state.gasPolicy = { all: "helium", byClass: {} };          // America's helium, from the start
    U.weather.init(state);
    for (const id of catalog(state)) if (U.SHIP_CLASSES[id].kind === "surplus") state.surplusLeft[id] = E().surplusStock;
    const first = catalog(state)[0];
    newShip(state, first, suggestName(state, first), config.home, 0);
    U.crew.init(state);
    U.contracts.init(state);
    state.tutorial = config.tutorial ? { step: 1 } : null;
    if (config.nation === "usa") for (const sh of state.ships) { sh.gas = "helium"; if (U.facilities.GAS && U.facilities.GAS.helium) sh.gasLeft = U.facilities.GAS.helium.range; }          // the first ship too
    return state;
  }

  // The national 1919 catalog plus any classes research has unlocked.
  function catalog(state) { return U.NATIONS[state.company.nation].catalog.concat(state.research ? U.research.unlockedClasses(state) : []); }

  function orderTerms(state, classId) {
    const c = U.SHIP_CLASSES[classId], works = U.cityById[state.company.home].works;
    return {
      price: Math.round(c.price * (works ? E().worksPriceFactor : 1) / 1000) * 1000,
      days: Math.round(c.buildDays * (works ? E().worksBuildFactor : 1))
    };
  }

  // Routes ------------------------------------------------------------------------
  function routeName(stops, circuit) {
    const names = stops.map(s => U.cityById[s].name);
    return circuit ? names.join("–") + "–" + names[0] : names.join("–");
  }
  function routeLegs(route) {
    const legs = [];
    for (let i = 1; i < route.stops.length; i++) legs.push([route.stops[i - 1], route.stops[i]]);
    if (route.circuit && route.stops.length > 2) legs.push([route.stops[route.stops.length - 1], route.stops[0]]);
    return legs;
  }
  function longestLeg(stops, circuit) {
    let m = 0;
    for (const [a, b] of routeLegs({ stops, circuit })) m = Math.max(m, distanceKm(a, b));
    return m;
  }
  function createRoute(state, stops, circuit) {
    const route = { id: "r" + state.nextId++, stops: stops.slice(), circuit: !!circuit && stops.length > 2, fare: "standard", custom: null };
    state.routes.push(route);
    refillDemand(state, true);
    return route;
  }
  // Change an existing route's stops. Ships on it pick up the new stops as they go.
  function editRoute(state, routeId, stops, circuit) {
    const route = state.routes.find(r => r.id === routeId);
    if (!route) return null;
    route.stops = stops.slice();
    route.circuit = !!circuit && stops.length > 2;
    for (const s of state.ships) if (s.routeId === routeId) {
      const at = route.stops.indexOf(s.location);
      if (at >= 0) { s.stop = at; if (!route.circuit && at === route.stops.length - 1) s.dir = -1; }
    }
    refillDemand(state, true);
    return route;
  }

  function deleteRoute(state, routeId) {
    for (const s of state.ships) if (s.routeId === routeId) s.routeId = null;
    state.routes = state.routes.filter(r => r.id !== routeId);
  }
  function canAssign(state, ship, route) {
    const c = U.research.stats(state, ship), longest = longestLeg(route.stops, route.circuit);
    if (longest > c.rangeKm) {
      // If the mountains are why, say which way the leg must go.
      const legs = routeLegs(route).map(([a, b]) => ({ a, b, w: legWay(a, b) })).sort((x, y) => y.w.km - x.w.km)[0], by = legs.w.via.length ? `, which goes by ${legs.w.via.map(v => v.name).join(" and ")} because the mountains bar the direct way,` : "";
      return `A leg of ${Math.round(longest).toLocaleString("en-GB")} km${by} is beyond its ${c.rangeKm.toLocaleString("en-GB")} km range`;
    }
    if (ship.gas === "helium" && state.company.nation !== "usa" && route.stops.some(id => U.cityById[id].country === "United States"))
      return "America sells no helium to foreign lines: American routes need a hydrogen ship";
    { const p = hopPlan(state, ship, ship.location); if (!route.stops.some(id => id === ship.location || p.dist[id] != null)) return cannotReach(ship, "this route", p.range) + ": send her nearer, or build masts on the way"; }
    const closed = route.stops.find(id => !hasRights(state, id));
    if (closed) return `No landing rights at ${U.cityById[closed].name} yet: send a survey flight first`;
    return null;
  }
  function assign(state, shipId, routeId) {
    const ship = state.ships.find(s => s.id === shipId);
    ship.routeId = routeId || null;
    const route = routeOf(state, ship);
    if (!route) return;
    const at = route.stops.indexOf(ship.location);
    if (at >= 0) { ship.stop = at; ship.dir = !route.circuit && at === route.stops.length - 1 ? -1 : 1; }
  }
  function routeOf(state, ship) { return state.routes.find(r => r.id === ship.routeId) || null; }

  // Buying, selling, renaming --------------------------------------------------------
  const HELIUM_FILL = 0.15;
  // The first fill of a lifting gas: helium costly, Aetherium more so until refining research brings it down.
  const heliumFill = (state, classId, gas) => gas === "helium" ? Math.round(U.SHIP_CLASSES[classId].price * HELIUM_FILL / 1000) * 1000
    : gas === "aetherium" ? U.aether.fill(state, classId) : 0;
  // The gas a new ship must use under the company's policy, if any.
  function policyGas(state, classId) { const p = state.gasPolicy || {}; return p.byClass && p.byClass[classId] || p.all || null; }
  // What an order really costs: the price, less any grant, plus the first fill of helium for a helium ship.
  function priceToOrder(state, classId, gas) {
    gas = policyGas(state, classId) || gas || "hydrogen";
    const t = orderTerms(state, classId), grant = U.contracts.buildGrantFor(state, classId, t.price), fill = heliumFill(state, classId, gas);
    return { price: t.price - grant + fill, base: t.price, grant, fill, gas };
  }
  function order(state, classId, name, config, gas) {
    gas = policyGas(state, classId) || gas || "hydrogen";
    const c = U.SHIP_CLASSES[classId], t = orderTerms(state, classId), P = priceToOrder(state, classId, gas);
    const grant = P.grant;
    t.price = P.price;
    // Each refusal says why, for the Shipyard to show.
    state.orderError = null;
    if (state.money < t.price) { state.orderError = `Not enough money: she costs £${Math.round(t.price).toLocaleString("en-GB")}${P.fill ? `, including £${P.fill.toLocaleString("en-GB")} for her first fill of helium` : ""}, and you have £${Math.round(state.money).toLocaleString("en-GB")}.`; return null; }
    if (c.kind === "surplus" && !(state.surplusLeft[classId] > 0)) { state.orderError = "No surplus hulls of this kind are left to buy."; return null; }
    const deliverAt = U.facilities.deliveryCity(state, classId);
    if (!deliverAt) { state.orderError = "No shed you can use is large enough to build or receive her: build or enlarge a shed first."; return null; }
    if (grant) U.contracts.useBuildGrant(state, grant);
    if (c.kind === "surplus") state.surplusLeft[classId] -= 1;
    state.money -= t.price;
    state.year.purchases += t.price;
    const clean = (name || "").trim() || suggestName(state, classId);
    return newShip(state, classId, clean, deliverAt, state.tick + t.days * 2, config || "two", gas);
  }
  function rename(state, shipId, name) {
    const clean = name.trim();
    if (!clean) return false;
    state.ships.find(s => s.id === shipId).name = clean;
    state.usedNames[clean] = true;
    return true;
  }

  const ageYears = (state, ship) => Math.max(0, (state.tick - ship.deliveryTick) / 730);
  function saleValue(state, ship) {
    const life = Math.max(E().scrapShare, 1 - ageYears(state, ship) / ship.lifeYears);
    return Math.round(cls(ship).price * life * (0.6 + 0.4 * ship.condition) / 100) * 100;
  }
  // Where the ship is at a given hour: flying (with the leg), or moored at a city.
  function positionAt(ship, hour) {
    let last = null;
    for (const leg of ship.legs) {
      if (leg.start <= hour) {
        if (hour < leg.start + leg.hours) return { flying: true, leg, fraction: (hour - leg.start) / leg.hours };
        last = leg;
      }
    }
    if (last) return { flying: false, at: last.to, leg: last };
    const next = ship.legs.find(l => l.start > hour);
    return { flying: false, at: next ? next.from : ship.turnLocation, upcoming: next || null };
  }
  function canSell(state, ship, hour) {
    if (ship.deliveryTick > state.tick) return "Still being built";
    if (positionAt(ship, hour).flying) return "In flight";
    return null;
  }
  function sell(state, shipId, hour) {
    const ship = state.ships.find(s => s.id === shipId);
    if (!ship || canSell(state, ship, hour)) return 0;
    const value = saleValue(state, ship);
    state.money += value;
    state.year.sales += value;
    state.ships = state.ships.filter(s => s !== ship);
    return value;
  }

  // Flying ------------------------------------------------------------------------------
  // Finding the way: a ship off her route flies in hops, each within her range, through places she can land.
  // Returns, for every place she can reach from where she is, the distance by the shortest chain and the first hop on it.
  function hopPlan(state, ship, from, freeEnd) {
    const range = U.research.stats(state, ship).rangeKm, nodes = U.CITIES.map(c => c.id).filter(id => id === from || id === freeEnd || U.facilities.canLand(state, id));
    const dist = {}, first = {}, done = new Set(); dist[from] = 0;
    for (;;) {
      let u = null; for (const id of nodes) if (!done.has(id) && dist[id] != null && (u == null || dist[id] < dist[u])) u = id;
      if (u == null) break; done.add(u);
      if (u === freeEnd) continue;                              // a place she may reach but not fly on from (a survey's end)
      for (const v of nodes) {
        if (done.has(v)) continue; const d = distanceKm(u, v); if (d > range) continue;
        if (dist[v] == null || dist[u] + d < dist[v]) { dist[v] = dist[u] + d; first[v] = u === from ? v : first[u]; }
      }
    }
    return { dist, first, range };
  }
  const hopToward = (state, ship, to, freeEnd) => { const p = hopPlan(state, ship, ship.location, freeEnd ? to : null); return p.dist[to] != null ? p.first[to] : null; };
  const cannotReach = (ship, name, range) => `${ship.name} cannot reach ${name}: no chain of landing places within her ${Math.round(range).toLocaleString("en-GB")} km range`;
  function nextStop(state, ship, route) {
    const at = route.stops.indexOf(ship.location);
    if (at < 0) {
      // Off her route: by hops to whichever stop on it is nearest by the way she can actually fly.
      const p = hopPlan(state, ship, ship.location);
      let best = null; for (const s of route.stops) if (p.dist[s] != null && (best == null || p.dist[s] < p.dist[best])) best = s;
      return best ? { to: p.first[best], ferry: true } : { stuck: true, range: p.range };
    }
    ship.stop = at;
    if (route.circuit && route.stops.length > 2) { ship.dir = 1; return { to: route.stops[(at + 1) % route.stops.length], ferry: false }; }
    if (at + ship.dir < 0 || at + ship.dir >= route.stops.length) ship.dir = -ship.dir;
    return { to: route.stops[at + ship.dir], ferry: false };
  }

  // Downstream stops a passenger boarding here can travel to, nearest first.
  function downstream(route, ship) {
    const n = route.stops.length, out = [];
    if (route.circuit && n > 2) for (let k = 1; k < n; k++) out.push(route.stops[(ship.stop + k) % n]);
    else for (let j = ship.stop + ship.dir; j >= 0 && j < n; j += ship.dir) out.push(route.stops[j]);
    return out;
  }

  const DAY_HOURS = 12;
  const SPECIAL = { mail: { share: 0.25, premium: 2.2 }, reefer: { share: 0.3, premium: 1.7 }, strong: { share: 0.04, premium: 5 }, garage: { share: 0.05, premium: 2.5 } };
  // Heat and height cut lift (at half strength). A city's temperature swings between its winter and summer values,
  // the seasons reversed south of the equator; above 15 degrees every degree thins the air, and so does every metre of height.
  // The load a ship can carry on a leg is set by the worse of its two ends; a design with lift to spare loses less.
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function liftAt(state, id, month) {
    const c = U.cityById[id]; if (!c) return { f: 1, heat: 0, height: 0 };
    const m = month == null ? dateOf(state.tick).getUTCMonth() : month, peak = (c.realLat ?? c.lat) < 0 ? 0 : 6;
    const T = c.hot == null ? 15 : c.cool + (c.hot - c.cool) * (0.5 + 0.5 * Math.cos(2 * Math.PI * (m - peak) / 12));
    const heat = T > 15 ? 1.5 * (1 - 288 / (273 + T)) : 0, height = (c.elev || 0) > 300 ? 1.1 * (1 - Math.exp(-c.elev / 8400)) : 0;
    return { f: Math.max(0.5, 1 - heat - height), heat, height, temp: Math.round(T), why: heat > 0.02 && height > 0.02 ? "heat and height" : height > heat ? "height" : "heat" };
  }
  // The worst month of the year at a city: for planning.
  function liftWorst(state, id) { let w = null; for (let m = 0; m < 12; m++) { const l = liftAt(state, id, m); if (!w || l.f < w.f) w = { ...l, month: MONTH_NAMES[m] }; } return w; }
  function legLift(state, ship, a, b) {
    const A = liftAt(state, a), B = liftAt(state, b), w = A.f <= B.f ? { ...A, at: a } : { ...B, at: b };
    const spare = cls(ship).liftSpare || 0;
    // A high pass on the way sets its own limit.
    const way = legWay(a, b), pass = way.load < 1 ? way.via.find(v => v.load) : null;
    const f = Math.min(1, w.f + spare * 3);
    if (pass && way.load < f) return { f: way.load, why: "climb over " + pass.name, at: b, pass: pass.name };
    return { f, why: w.why, at: w.at };
  }
  function board(state, ship, route, reserved = 0) {
    const c = U.research.stats(state, ship);
    const from = route.stops[ship.stop];
    const room = U.facilities.roomToday(state, from);
    // Berths by class, cut back if the terminal can't board everyone today.
    const b = U.passengers.berths(state, ship), cut = b.total ? Math.min(1, room.pax / b.total) : 0;
    let seats1 = Math.floor(b.first * cut), daySeats = Math.floor((b.seats || 0) * cut), seats2 = Math.floor(b.second * cut) - daySeats;
    let hold = Math.min(c.cargoTons - reserved, room.tons), revenue = 0, tons = 0, p1 = 0, p2 = 0;
    const mix0 = (ship.interior && ship.interior.cargoMix) || cls(ship).cargoMix, cap = {};
    // Special compartments: their own capacity, cut back only if the terminal cannot take a full hold today.
    const cut0 = Math.min(1, room.tons / Math.max(0.1, c.cargoTons));
    if (mix0) for (const [k0, v] of Object.entries(mix0)) { cap[k0] = v * cut0; hold -= cap[k0]; }
    // Every ship carries a little mail in her hold, between the cities she already serves; a mail room carries far more.
    if (!cap.mail && hold > 0.4) { cap.mail = Math.min(0.5, hold * 0.15); hold -= cap.mail; }
    hold = Math.max(0, hold);
    // Heat and height: she lifts less out of, or into, a hot or high city, so she boards fewer and loads less.
    const nextStop = downstream(route, ship)[0], LF = nextStop ? legLift(state, ship, from, nextStop) : { f: 1 };
    ship.lastLift = LF.f < 0.97 ? LF : null;          // under 3% is not worth cutting or mentioning
    if (ship.lastLift) { seats1 = Math.floor(seats1 * LF.f); seats2 = Math.floor(seats2 * LF.f); daySeats = Math.floor(daySeats * LF.f); hold *= LF.f; for (const k0 in cap) cap[k0] *= LF.f; }
    for (const to of downstream(route, ship)) {
      const w = state.waiting[pairKey(from, to)];
      if (!w) continue;
      const km = distanceKm(from, to), fr = U.passengers.fares(state, route, km, c.fare);
      // Saloon seats are for trips of up to 12 hours; longer trips need a berth.
      const day = km / c.speedKmh <= DAY_HOURS;
      const a = Math.min(seats1, Math.floor(w.p1)), s2 = Math.min(seats2 + (day ? daySeats : 0), Math.floor(w.p2));
      const fromSeats = day ? Math.min(daySeats, s2) : 0; daySeats -= fromSeats;
      const t = Math.min(hold, Math.floor(w.tons * 10) / 10);
      w.p1 = Math.max(0, w.p1 - a); w.p2 = Math.max(0, w.p2 - s2); w.tons -= t;
      seats1 -= a; seats2 -= s2 - fromSeats; hold -= t; p1 += a; p2 += s2; tons += t;
      revenue += a * fr.first + s2 * fr.second + t * freightRate(km);
      // Mail, perishables, valuables, and motor cars: each a share of the freight between two cities, paying a premium.
      for (const [k0, X] of Object.entries(SPECIAL)) {
        if (!cap[k0] || (k0 === "garage" && km < 600)) continue;
        const want = dailyFreight(from, to) * X.share * 1.5, ld = Math.min(cap[k0], Math.floor(want * 10) / 10);
        if (ld <= 0) continue;
        cap[k0] -= ld; tons += ld; revenue += ld * freightRate(km) * X.premium;
      }
    }
    const pax = p1 + p2;
    const fee = U.facilities.recordBoarding(state, from, pax, tons);
    return { pax, p1, p2, tons: Math.round(tons * 10) / 10, revenue: Math.round(revenue), fee: Math.round(fee) };
  }

  function routeDay(state, routeId) {
    const key = routeId || "none";
    return state.day.byRoute[key] = state.day.byRoute[key] || { revenue: 0, costs: 0, seats: 0, pax: 0, hold: 0, tons: 0 };
  }
  function addCost(state, ship, amount) {
    state.day.costs += amount; ship.stats.costs += amount; state.totals.costs += amount;
    routeDay(state, ship.routeId).costs += amount;
  }

  // A cost not tied to one ship, such as penalties and interest.
  function addGeneral(state, amount) {
    state.day.costs += amount; state.totals.costs += amount;
  }
  function addIncome(state, amount, kind) {
    state.day.revenue += amount; state.totals.revenue += amount;
    if (kind) { state.year[kind] = (state.year[kind] || 0) + amount; state.totals[kind] = (state.totals[kind] || 0) + amount; }
  }

  function wearFactor(state, ship) {
    const frac = ageYears(state, ship) / ship.lifeYears;
    return (cls(ship).kind === "surplus" ? E().surplusWearFactor : 1) * (frac >= 1 ? 2 : frac > 0.8 ? 1.5 : 1) * U.research.stats(state, ship).wear;
  }

  function startOverhaul(state, ship, t) {
    const frac = ageYears(state, ship) / ship.lifeYears;
    const publicShed = !U.facilities.effective(state, ship.location, "shed").own;
    const cost = Math.round(cls(ship).price * E().overhaulCostShare * (frac > 0.8 ? 1.5 : 1) * (publicShed ? 1 + U.facilities.FEES.shed : 1) / 100) * 100;
    const refit = U.research.applyRefits(state, ship);
    if (ship.reconfigTo && ship.reconfigTo !== ship.config) {
      const rc = Math.round(cls(ship).price * U.passengers.RECONFIG_SHARE / 100) * 100;
      refit.cost += rc; refit.done.push(`new cabins, ${U.passengers.CONFIGS[ship.reconfigTo].name.toLowerCase()}`);
      ship.config = ship.reconfigTo;
    }
    ship.reconfigTo = null;
    if (ship.gasTo && ship.gasTo !== ship.gas) {
      refit.cost += ship.gasTo === "hydrogen" ? Math.round(cls(ship).price * 0.01 / 100) * 100 : heliumFill(state, ship.classId, ship.gasTo);
      refit.done.push(`refilled with ${ship.gasTo}`);
      ship.gas = ship.gasTo;
    }
    ship.gasTo = null; ship.gasLeft = U.facilities.GAS[ship.gas].range; ship.sinceTopUp = 0;
    let extraDays = 0;
    if (ship.refitInterior) {
      refit.cost += Math.round(cls(ship).price * 0.08 / 100) * 100; extraDays = 14;
      ship.interior = ship.refitInterior; ship.refitInterior = null; refit.done.push("a new interior");
    }
    addCost(state, ship, cost + refit.cost);
    ship.overhaulNow = false;
    ship.overhaulUntil = t + (E().overhaulDays + extraDays) * 24;
    ship.readyHour = ship.overhaulUntil;
    const refitText = refit.done.length ? ` refit with ${refit.done.join(" and ").toLowerCase()} stop` : "";
    telegram(state, t, `${ship.name} in for overhaul at ${U.cityById[ship.location].name} stop${refitText} cost £${(cost + refit.cost).toLocaleString("en-GB")} stop back in service in three weeks stop`, false, { type: "ship", id: ship.id });
  }
  function finishOverhaul(state, ship) {
    const frac = ageYears(state, ship) / ship.lifeYears;
    ship.condition = frac > 0.8 ? Math.max(0.75, 1 - (frac - 0.8)) : 1;
    const cc = U.SHIP_CLASSES[ship.classId], repaint = cc.designed && ship.art !== cc.art;
    if (repaint) ship.art = cc.art;
    telegram(state, ship.overhaulUntil, `${ship.name} overhaul complete stop condition ${Math.round(ship.condition * 100)} percent stop${repaint ? " repainted in the new livery stop" : ""}`, false, { type: "ship", id: ship.id });
    ship.overhaulUntil = null;
  }

  // Plans every departure that happens during the coming turn.
  function planShip(state, ship, T0, T1) {
    ship.turnLocation = ship.location;
    ship.legs = ship.legs.filter(l => l.start + l.hours > T0 - TH());
    for (let guard = 0; guard < 8; guard++) {
      if (ship.overhaulUntil && ship.overhaulUntil <= Math.max(ship.readyHour, T0)) finishOverhaul(state, ship);
      const t = Math.max(ship.readyHour, T0);
      if (t >= T1 || ship.overhaulUntil) return;
      let next;
      // Orders (a survey, a charter, a record attempt, or simply being sent somewhere) come first: she flies there in real hops.
      if (ship.orders) {
        const o = ship.orders;
        if (o.until != null) { if (t < o.until) { ship.readyHour = o.until; return; } endOrders(state, ship, t); continue; }
        if (ship.location === o.to) { arriveOrders(state, ship, t); continue; }
        const hop = hopToward(state, ship, o.to, o.kind === "survey");
        if (!hop) { telegram(state, t, `${cannotReach(ship, U.cityById[o.to].name, U.research.stats(state, ship).rangeKm)} stop her orders are cancelled stop`, true, { type: "ship", id: ship.id }); ship.orders = null; continue; }
        if (!fly(state, ship, { to: hop, ferry: true }, t)) return;
        continue;
      }
      const shed = ship.condition < ship.overhaulAt || ship.overhaulNow ? U.facilities.nearestShed(state, ship) : null;
      if (shed) {
        if (ship.location === shed) { startOverhaul(state, ship, t); continue; }
        next = { to: shed, ferry: true };
      } else {
        if (ship.condition < ship.overhaulAt || ship.overhaulNow) {
          const month = Math.floor(t / 720);
          if (ship.noShedWarned !== month) {
            ship.noShedWarned = month;
            telegram(state, t, `${ship.name} due for overhaul stop no shed big enough within range stop build or enlarge a shed stop`, false, { type: "ship", id: ship.id });
          }
        }
        const route = routeOf(state, ship);
        if (!route) { ship.readyHour = t; return; }
        if (!ship.captainId) { ship.readyHour = T1; return; }        // no captain, no flight
        next = nextStop(state, ship, route);
        // A stop where her landing rights have lapsed (a Soviet permit not renewed): she waits, and says so.
        if (!next.stuck && !hasRights(state, next.to)) {
          const month = Math.floor(t / 720);
          if (ship.rightsWarned !== month) { ship.rightsWarned = month; telegram(state, t, `${ship.name} held at ${U.cityById[ship.location].name} stop no landing rights at ${U.cityById[next.to].name} stop renew the permit or change her route stop`, true, { type: "ship", id: ship.id }); }
          ship.readyHour = T1; return;
        }
        // Soviet inspections: now and then a ship leaving a Soviet city is held while her papers, crew, and cargo are checked.
        if (!next.stuck && authority(ship.location) === "ussr" && ship.inspectedAt !== ship.location + ":" + (ship.arrivedHour ?? 0)) {
          ship.inspectedAt = ship.location + ":" + (ship.arrivedHour ?? 0);
          if (Math.random() < (state.company.nation === "germany" ? 0.01 : 0.04)) {
            const days = 1 + Math.floor(Math.random() * 3), who = dateAtHour(t).getUTCFullYear() >= 1934 ? "nkvd" : "ogpu";
            telegram(state, t, `${ship.name} held at ${U.cityById[ship.location].name} stop ${who} inspection of papers crew and cargo stop released in ${days} day${days > 1 ? "s" : ""} stop`, false, { type: "ship", id: ship.id });
            ship.readyHour = t + days * 24; ship.waitNote = "Held for inspection"; return;
          }
        }
        // An even timetable: ships on the route keep their distance, so they do not fly nose to tail.
        if (!next.stuck && !next.ferry && route.even) {
          const hold = evenHold(state, ship, route, next, t);
          if (hold > t + 0.5) { ship.readyHour = hold; ship.waitNote = "Holding for the timetable"; if (hold >= T1) return; continue; }
        }
        // A leg of her route now beyond her range (the mountain walls may have lengthened it): she waits, and says so.
        if (!next.stuck && !next.ferry && distanceKm(ship.location, next.to) > U.research.stats(state, ship).rangeKm * 1.001) {
          const month = Math.floor(t / 720), way = legWay(ship.location, next.to);
          if (ship.stuckWarned !== month) { ship.stuckWarned = month; telegram(state, t, `${ship.name} cannot fly ${U.cityById[ship.location].name} to ${U.cityById[next.to].name} stop ${Math.round(way.km).toLocaleString("en-GB")} km${way.via.length ? " by " + way.via.map(v => v.name).join(" and ") : ""} is beyond her range stop change her route stop`, true, { type: "ship", id: ship.id }); }
          ship.readyHour = T1; return;
        }
        if (next.stuck) {
          const month = Math.floor(t / 720);
          if (ship.stuckWarned !== month) { ship.stuckWarned = month; telegram(state, t, `${cannotReach(ship, "her route", next.range)} stop send her nearer or build masts on the way stop`, true, { type: "ship", id: ship.id }); }
          ship.readyHour = T1; return;
        }
        // A ship won't leave nearly empty: it waits for a fair load, but never more than about half a day.
        if (!next.ferry && !worthLeaving(state, ship, route, next, t)) { ship.readyHour = T1; return; }
      }
      const depFrom = ship.location, went = fly(state, ship, next, t);
      if (went && !next.ferry) { const r0 = routeOf(state, ship); if (r0 && r0.even) { r0.lastDep = r0.lastDep || {}; r0.lastDep[depFrom + ">" + next.to] = t; } }
      if (!went) return;
    }
  }

  // The round trip of a route for a ship, in hours, and the gap an even timetable keeps between its ships.
  function routeRound(state, ship, route) {
    let hours = 0; const sp = U.research.stats(state, ship).speedKmh;
    for (const [a, b] of routeLegs(route)) hours += distanceKm(a, b) / sp + E().turnaroundHours;
    return route.circuit && route.stops.length > 2 ? hours : hours * 2;
  }
  function evenHold(state, ship, route, next, t) {
    const n = state.ships.filter(sh => sh.routeId === route.id && sh.deliveryTick <= state.tick && !sh.lost && !sh.overhaulUntil && !sh.orders).length;
    if (n < 2) return t;
    const gap = routeRound(state, ship, route) / n * 0.85, last = (route.lastDep || {})[ship.location + ">" + next.to];
    return last != null && t < last + gap ? last + gap : t;
  }
  // Arriving where her orders sent her.
  function arriveOrders(state, ship, t) {
    const o = ship.orders, name = U.cityById[o.to].name;
    if (o.kind === "survey") {
      state.gateways = state.gateways || {}; state.gateways[o.to] = { openAt: t, by: ship.name };
      telegram(state, t, `survey flight to ${name} complete stop ${ship.name} lies at ${name} stop landing rights granted stop routes may now end there stop`, true, { type: "city", id: o.to });
      ship.orders = null;
    } else if (o.kind === "charter") {
      o.until = t + o.days * 24; ship.readyHour = o.until;
    } else if (o.kind === "record" && o.stage === "toStart") {
      o.stage = "run"; o.to = o.b;
    } else if (o.kind === "record") {
      U.contracts.settleRecord(state, ship, o, t); ship.orders = null;
    } else {
      telegram(state, t, `${ship.name} arrives at ${name} as ordered stop`, false, { type: "ship", id: ship.id }); ship.orders = null;
    }
  }
  function endOrders(state, ship, t) {
    const o = ship.orders;
    if (o.kind === "charter") telegram(state, t, `${ship.name} ends her charter for ${o.who} at ${U.cityById[o.to].name} stop back in service stop`, false, { type: "ship", id: ship.id });
    ship.orders = null;
  }
  // Sending a ship somewhere without a route: she leaves any route she is on, and flies there in hops.
  function sendShip(state, shipId, cityId) {
    const ship = state.ships.find(s => s.id === shipId); if (!ship) return "No such ship.";
    if (ship.location === cityId && !ship.orders) return `${ship.name} is already at ${U.cityById[cityId].name}.`;
    if (!U.facilities.canLand(state, cityId)) return `${U.cityById[cityId].name} has no mast she can use.`;
    if (!hopToward(state, ship, cityId)) return cannotReach(ship, U.cityById[cityId].name, U.research.stats(state, ship).rangeKm) + ".";
    ship.routeId = null; ship.orders = { kind: "send", to: cityId };
    return null;
  }
  function cancelOrders(state, shipId) { const ship = state.ships.find(s => s.id === shipId); if (ship && ship.orders && ship.orders.until == null) ship.orders = null; }
  function worthLeaving(state, ship, route, next, t) {
    if (U.crew.mods(state, ship).punctual) return true;              // a punctual captain leaves on time, full or not
    if (t - (ship.arrivedHour ?? -1e9) >= E().maxWaitHours) return true;
    const c = U.research.stats(state, ship), from = route.stops[ship.stop];
    let pax = 0, tons = 0;
    for (const to of downstream(route, ship)) {
      const w = state.waiting[pairKey(from, to)];
      if (w) { pax += w.p1 + w.p2; tons += w.tons; }
    }
    const seats = U.passengers.berths(state, ship).total;
    const fill = (seats ? Math.min(1, pax / seats) * 0.8 : 0) + Math.min(1, tons / c.cargoTons) * (seats ? 0.2 : 1);
    return fill >= E().minLoadToLeave;
  }

  function fly(state, ship, next, t) {
    const c = Object.assign({ price: cls(ship).price }, U.research.stats(state, ship)), route = routeOf(state, ship);
    let km = distanceKm(ship.location, next.to);
    const from = ship.location;
    // Weather: judged once, at departure, against the forecast.
    const wx = U.weather.judge(state, ship, from, next.to, t, km, c.speedKmh);
    if (wx.mode === "wait") { ship.readyHour = t + wx.wait; ship.waitNote = `Waiting out ${wx.reason}`; return false; }
    ship.waitNote = null;
    km = wx.km;
    const cm = U.crew.mods(state, ship);
    let hours = km / c.speedKmh * wx.slow * cm.slow;
    // Minor incidents, more likely in poor condition.
    const p = (E().incidentBase + E().incidentWear * (1 - ship.condition) ** 2) * c.incidents;
    let incident = Math.random() < p ? (Math.random() < 0.6 ? "forced" : "cancelled") : null;
    if (incident === "forced" && Math.random() > c.engineFailure) incident = null;
    if (incident) U.passengers.recordIncident(state, incident);
    if (incident === "cancelled") {
      const days = 2;
      const fine = Math.round(c.passengers * fare(km) * 0.3 + 300);
      addCost(state, ship, fine);
      ship.readyHour = t + days * 24;
      ship.condition = Math.max(0, ship.condition - 0.02);
      telegram(state, t, `${ship.name} flight to ${U.cityById[next.to].name} cancelled stop gas cell damage found at ${U.cityById[from].name} stop repairs two days stop compensation £${fine.toLocaleString("en-GB")} stop`, true, { type: "ship", id: ship.id });
      return;
    }
    // Not enough gas to reach the next stop: valve down to fly light for this leg.
    if (ship.gasLeft > 0 && ship.gasLeft < km && !U.facilities.canTopUp(state, from, ship.gas, ship)) {
      ship.gasLeft = 0;
      const month = Math.floor(t / 720);
      if (ship.gasWarned !== month) ship.gasWarned = month, telegram(state, t, `${ship.name} short of ${ship.gas} leaving ${U.cityById[from].name} stop flying light with reduced payload stop needs a gas stop on route ${route ? routeName(route.stops, route.circuit) : ""} stop`, false, { type: "ship", id: ship.id });
    }
    const ahead = next.ferry || !route ? [] : downstream(route, ship);
    const mail = next.ferry || !route ? 0 : U.contracts.loadMail(state, ship, from, ahead, c.cargoTons);
    const load = next.ferry || !route ? { pax: 0, tons: 0, revenue: 0 } : board(state, ship, route, mail);
    if (!next.ferry && route) U.contracts.recordGrantFlight(state, from, ahead);
    const fuel = Math.round(km * c.fuelPerKm * E().costFactor);
    const berth = U.facilities.dock(state, next.to, t + hours, c.turnaround);
    hours += berth.delay;                               // circling while waiting for a berth
    addCost(state, ship, berth.fee + (load.fee || 0));
    const seats = U.passengers.berths(state, ship).total;
    ship.legs.push({ from, to: next.to, start: t, hours, km: Math.round(km), ferry: next.ferry, mail: mail > 0,
      pax: load.pax, p1: load.p1 || 0, p2: load.p2 || 0, tons: load.tons, seats, hold: c.cargoTons, revenue: load.revenue });
    if (!next.ferry && route) U.passengers.recordFlight(state, ship, route, load);
    state.day.revenue += load.revenue; state.totals.revenue += load.revenue;
    addCost(state, ship, fuel);
    const rd = routeDay(state, ship.routeId);
    rd.revenue += load.revenue;
    if (!next.ferry) { rd.seats += seats; rd.pax += load.pax; rd.hold += c.cargoTons; rd.tons += load.tons; }
    ship.stats.flights += 1; ship.stats.passengers += load.pax; ship.stats.tons += load.tons; ship.stats.revenue += load.revenue;
    state.totals.flights += 1; state.totals.passengers += load.pax; state.totals.tons += load.tons;
    ship.condition = Math.max(0, ship.condition - hours * E().wearPerFlightHour * wearFactor(state, ship));
    // Gas: used with distance, topped up wherever a supply allows.
    ship.gasLeft -= km * cm.gas * c.gasUse; ship.sinceTopUp += km * cm.gas * c.gasUse;
    if (U.facilities.canTopUp(state, next.to, ship.gas, ship)) {
      const G = U.facilities.GAS[ship.gas];
      const rate = ship.gas === "aetherium" ? U.aether.perKm(state, next.to) : G.perKm * (ship.gas === "helium" ? U.facilities.heliumPrice(state, next.to) : 1);
      addCost(state, ship, Math.round(ship.sinceTopUp * rate * cls(ship).price / 90000));
      ship.gasLeft = G.range; ship.sinceTopUp = 0;
    } else if (ship.gasLeft < 0) ship.gasLeft = 0;
    ship.location = next.to;
    ship.arrivedHour = t + hours;
    ship.readyHour = t + hours + c.turnaround;
    U.crew.flew(state, ship, hours);
    const leg0 = ship.legs[ship.legs.length - 1];
    if (wx.via) leg0.via = wx.via;
    if (wx.notes.length) leg0.note = wx.notes[0];
    else if (ship.lastLift && !next.ferry) leg0.note = ship.lastLift.pass ? `load cut to ${Math.round(ship.lastLift.f * 100)}% for the ${ship.lastLift.why}` : `load cut to ${Math.round(ship.lastLift.f * 100)}% by the ${ship.lastLift.why} at ${U.cityById[ship.lastLift.at].name}`;
    // Serious accidents: rare, likelier in storms, in worn ships, and on hydrogen.
    {
      const kind = U.weather.serious(state, ship, leg0, wx.risk);
      if (kind) U.weather.consequences(state, ship, leg0, kind, t + hours * 0.6, !!wx.bold);
    }
    if (incident === "forced") {
      const a = U.cityById[from], b = U.cityById[next.to];
      const near = nearestCity((a.lat + b.lat) / 2, (a.lon + b.lon) / 2);
      const days = Math.max(1, Math.round(rand(3, 10) * c.repairDays));
      const cost = Math.round(rand(1000, 4000) * c.price / 90000 / 100) * 100;
      addCost(state, ship, cost);
      ship.condition = Math.max(0, ship.condition - 0.05);
      ship.readyHour += days * 24;
      telegram(state, t + hours * 0.6, `${ship.name} forced down near ${near.name} stop engine failure stop no one hurt stop repairs ${days} days cost £${cost.toLocaleString("en-GB")} stop`, true, { type: "ship", id: ship.id });
    }
    return true;
  }

  function beginTurn(state) {
    if (state.plannedTick === state.tick) return;
    state.plannedTick = state.tick;
    U.weather.turn(state);
    const T0 = H(state.tick), T1 = T0 + TH();
    for (const ship of state.ships) planShip(state, ship, T0, T1);
  }

  // Money settles once a day.
  function settleDay(state) {
    for (const ship of state.ships) {
      if (ship.deliveryTick > state.tick) continue;
      const c = U.research.stats(state, ship);
      addCost(state, ship, Math.round(c.dailyCost * E().costFactor * (1 + E().lowConditionCostRise * (1 - ship.condition))));
    }
    U.research.daily(state);
    U.facilities.daily(state);
    state.money += state.day.revenue - state.day.costs;
    state.year.revenue += state.day.revenue; state.year.costs += state.day.costs;
    state.history.push(state.day);
    if (state.history.length > 30) state.history.shift();
    state.day = blankDay();
    if (state.money < 0 && !state.fundsWarned) {
      state.fundsWarned = true;
      telegram(state, H(state.tick), `funds exhausted stop company account overdrawn stop sell ships or cut costs stop`, true, { type: "finances" });
    } else if (state.money >= 0) state.fundsWarned = false;
  }

  // Ends the turn: the clock moves on half a day.
  function advance(state) {
    beginTurn(state);
    state.tick += 1;
    const now = H(state.tick);
    for (const ship of state.ships) {
      if (ship.deliveryTick === state.tick) {
        // A new ship without a captain asks for one; otherwise she simply reports ready.
        const noCaptain = U.crew && !ship.captainId;
        if (noCaptain) telegram(state, now, `${ship.name} delivered at ${U.cityById[ship.location].name} stop no captain aboard stop hire or appoint one before she can fly stop`, true, { type: "crew" });
        else telegram(state, now, `${ship.name} delivered at ${U.cityById[ship.location].name} stop ready for service stop`, false, { type: "ship", id: ship.id });
      }
      if (!ship.endWarned && ship.deliveryTick <= state.tick && ageYears(state, ship) >= ship.lifeYears) {
        ship.endWarned = true;
        telegram(state, now, `${ship.name} has reached the end of its service life stop wear and costs will rise stop consider selling stop`, true, { type: "ship", id: ship.id });
      }
    }
    if (state.tick % 2 === 0) { settleDay(state); U.contracts.daily(state); }
    if (state.tick % 14 === 0) U.contracts.weekly(state);
    refillDemand(state, false);
    const d = dateOf(state.tick);
    const month = d.getUTCFullYear() * 12 + d.getUTCMonth();
    if (state.month && month !== state.month) {
      U.contracts.monthly(state);
      U.passengers.monthly(state);
      U.weather.monthly(state);
      U.crew.monthly(state);
      U.competition.monthly(state);
      U.aether.monthly(state);
      for (const r of state.routes) {
        const s = routeSummary(state, r.id);
        if (s.days >= 30 && s.profit < 0)
          telegram(state, now, `route ${routeName(r.stops, r.circuit)} lost £${Math.abs(s.profit).toLocaleString("en-GB")} last month stop`, false, { type: "route", id: r.id });
      }
    }
    state.month = month;
    const year = d.getUTCFullYear();
    if (year !== state.year.year) {
      const y = state.year, profit = y.revenue - y.costs;
      telegram(state, now, `${y.year} results stop income £${Math.round(y.revenue).toLocaleString("en-GB")} stop costs £${Math.round(y.costs).toLocaleString("en-GB")} stop operating ${profit < 0 ? "loss" : "profit"} £${Math.abs(Math.round(profit)).toLocaleString("en-GB")} stop`, false, { type: "company" });
      state.year = { year, revenue: 0, costs: 0, purchases: 0, sales: 0 };
      for (const s of state.ships) s.stats = blankStats();
    }
  }

  function dateOf(tick, fraction = 0) {
    const hours = U.TIME.firstDepartureHour + (tick + fraction) * TH();
    return new Date(U.TIME.startDate + hours * 3600 * 1000);
  }
  const dateAtHour = hour => new Date(U.TIME.startDate + (U.TIME.firstDepartureHour + hour) * 3600 * 1000);

  function routeSummary(state, routeId) {
    const sum = { revenue: 0, costs: 0, seats: 0, pax: 0, hold: 0, tons: 0, days: 0 };
    for (const d of state.history) {
      const r = d.byRoute[routeId];
      if (!r) continue;
      for (const k of ["revenue", "costs", "seats", "pax", "hold", "tons"]) sum[k] += r[k];
      sum.days += 1;
    }
    sum.profit = sum.revenue - sum.costs;
    sum.load = sum.seats ? sum.pax / sum.seats : null;
    sum.cargoLoad = sum.hold ? sum.tons / sum.hold : null;
    return sum;
  }

  // Saving ------------------------------------------------------------------------------
  let saving = true;
  function save(state) {
    if (!saving || !state) return false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.version !== VERSION) return null;
      // Games saved before research existed carry on with an empty research record.
      if (!s.research) U.research.init(s);
      for (const sh of s.ships) { sh.fitted = sh.fitted || []; sh.refitPlan = sh.refitPlan || []; }
      s.installment = s.installment || 0;
      // Repair: an American company's gas policy was once set without its per-class part.
      if (s.gasPolicy && typeof s.gasPolicy === "object" && !s.gasPolicy.byClass) s.gasPolicy.byClass = {};
      // A company that already surveyed an American city before permits existed holds America's permit.
      if (s.gateways && !(s.permits && s.permits.na) && Object.keys(s.gateways).some(id => regionOf(id) === "na")) { s.permits = s.permits || {}; s.permits.na = { appliedAt: 0, grantAt: 0 }; }
      // The Soviet rules arrived later: a company keeps each Soviet city it already flies to or has built at, with a permit running two years from now.
      if (!s.sovietCarried) {
        s.sovietCarried = true; s.gateways = s.gateways || {}; s.permits = s.permits || {};
        const keep = new Set(); for (const r of s.routes || []) for (const id of r.stops) keep.add(id);
        for (const id in (s.facilities || {})) { const f = s.facilities[id]; if (f && (f.mast || f.terminal || f.shed)) keep.add(id); }
        if (s.company && s.company.home) keep.add(s.company.home);
        for (const id of keep) if (U.cityById[id] && U.cityById[id].empire === "ussr") {
          if (!s.gateways[id]) s.gateways[id] = { openAt: 0, carried: true };
          if (!s.permits["city:" + id]) s.permits["city:" + id] = { appliedAt: 0, grantAt: 0, expires: s.tick * 12 + SOVIET.years * 365 * 24 };
        }
      }
      // The empire rule arrived later: a company keeps landing rights wherever it already flies or has built.
      if (!s.empireCarried) {
        s.empireCarried = true; s.gateways = s.gateways || {};
        const keep = new Set(); for (const r of s.routes || []) for (const id of r.stops) keep.add(id);
        for (const id in (s.facilities || {})) { const f = s.facilities[id]; if (f && (f.mast || f.terminal || f.shed)) keep.add(id); }
        for (const id of keep) if (authority(id) && !s.gateways[id]) s.gateways[id] = { openAt: 0, carried: true };
      }
      // And one that surveyed Rio as a gateway holds South America's.
      if (s.gateways && !(s.permits && s.permits.sa) && Object.keys(s.gateways).some(id => regionOf(id) === "sa")) { s.permits = s.permits || {}; s.permits.sa = { appliedAt: 0, grantAt: 0 }; }
      // Likewise a company that surveyed Cape Town or Bombay as gateways holds the region's permit.
      if (s.gateways && !(s.permits && s.permits.mea) && Object.keys(s.gateways).some(id => regionOf(id) === "mea")) { s.permits = s.permits || {}; s.permits.mea = { appliedAt: 0, grantAt: 0 }; }
      // Repair: an earlier version could overwrite the standing record with a bare number, lost on saving.
      if (!s.rep || typeof s.rep !== "object" || !Number.isFinite(+s.rep.standing)) {
        const was = typeof s.rep === "number" && Number.isFinite(s.rep) ? s.rep : 50, month = s.repMonth;
        U.passengers.init(s); s.rep.standing = Math.max(0, Math.min(100, was)); if (month && typeof month === "object") s.repMonth = month;
      }
      return s;
    } catch (e) { return null; }
  }
  // Stops the game saving itself, so a game just loaded from a file is not overwritten as the page reloads.
  function stopSaving() { saving = false; }
  // A survey flight to a gateway: the ship leaves her route for the round trip and two days there; landing rights follow.
  // Regions: Europe (cities without one) and those beyond. A company working outside its home region needs that
  // government's permit before its first survey there; after that, landing rights city by city.
  const regionOf = id => (U.cityById[id] && U.cityById[id].region) || "eu";
  const homeRegion = state => regionOf(state.company.home);
  const REGION_GOV = { na: { name: "Washington", country: "America" }, eu: { name: "the European governments", country: "Europe" },
    mea: { name: "the governments of the region", country: "the Middle East and Africa" },
    sa: { name: "the governments of South America", country: "South America" }, as: { name: "the governments of Asia", country: "Asia" }, oc: { name: "the governments of Oceania", country: "Oceania" } };          // until the empire rule replaces it
  // An ocean leg: to or from a station, or between the Old World and the Americas.
  const landmass = id => regionOf(id) === "na" || regionOf(id) === "sa" ? "americas" : "oldworld";
  // The sea crossings to and within Oceania count too: the Timor and Coral Seas, the Tasman, and the south Pacific.
  function oceanLeg(a, b) {
    const A = U.cityById[a], B = U.cityById[b]; if (!A || !B) return false;
    if (A.station || B.station || landmass(a) !== landmass(b)) return true;
    return (A.region === "oc" || B.region === "oc") && A.country !== B.country && distanceKm(a, b) > 1200;
  }
  // The empire rule: a colony, mandate, or dominion is governed by its imperial power; independent countries of the region by themselves.
  // A company of the governing nation flies there as at home; anyone else needs that power's permit, then landing rights by survey.
  const POWERS = { britain: { name: "the Colonial Office in London", rule: "British rule" }, france: { name: "the Ministry of Colonies in Paris", rule: "French rule" },
    italy: { name: "the Ministry of Colonies in Rome", rule: "Italian rule" }, belgium: { name: "the Ministry of Colonies in Brussels", rule: "Belgian rule" },
    egypt: { name: "the Egyptian government", rule: "the Egyptian government" }, ethiopia: { name: "the Emperor's government in Addis Ababa", rule: "the Ethiopian empire" },
    // Asia: the Dutch and American possessions, Japan's empire, the Soviet Union's far side, and the independent states.
    netherlands: { name: "the Ministry of Colonies in The Hague", rule: "Dutch rule" }, usa: { name: "Washington", rule: "American rule" }, japan: { name: "the Japanese government", rule: "Japanese rule" },
    // The Soviet Union: a permit for each city, renewed every two years; inspections; few travellers; no foreign sheds.
    ussr: { name: "the Soviet government", rule: "Soviet rule", perCity: true },
    china: { name: "the Chinese government", rule: "its own government" }, siam: { name: "the Siamese government", rule: "its own government" },
    persia: { name: "the Persian government", rule: "its own government" }, afghanistan: { name: "the Afghan government", rule: "its own government" },
    // South America's republics: each grants its own permit, cheaper and quicker than a great power's; German companies
    // are welcome where German communities and German-run airlines are established.
    brazil: { name: "the Brazilian government", rule: "its own government", republic: true, germanTies: true }, argentina: { name: "the Argentine government", rule: "its own government", republic: true, germanTies: true }, chile: { name: "the Chilean government", rule: "its own government", republic: true, germanTies: true }, colombia: { name: "the Colombian government", rule: "its own government", republic: true, germanTies: true }, uruguay: { name: "the Uruguayan government", rule: "its own government", republic: true }, peru: { name: "the Peruvian government", rule: "its own government", republic: true }, venezuela: { name: "the Venezuelan government", rule: "its own government", republic: true }, paraguay: { name: "the Paraguayan government", rule: "its own government", republic: true }, bolivia: { name: "the Bolivian government", rule: "its own government", republic: true }, ecuador: { name: "the Ecuadorian government", rule: "its own government", republic: true } };
  // What a permit costs and how long it takes.
  const SOVIET = { fee: 2000, renew: 1000, years: 2 };
  function permitTerms(state, key) {
    if (key.startsWith("city:")) { const g = state.company.nation === "germany";          // German ties (Deruluft, the joint airline of 1922): half the wait
      return { fee: SOVIET.fee, days: g ? [21, 14] : [42, 28], weeks: g ? "three to five weeks" : "six to ten weeks", perCity: true }; }
    const P0 = key.startsWith("emp:") ? POWERS[key.slice(4)] : null;
    let fee = P0 && P0.republic ? 1500 : 3000, days = P0 && P0.republic ? [14, 14] : [35, 20];
    if (P0 && P0.germanTies && state.company.nation === "germany") { fee = 750; days = [7, 7]; }
    // The Soviet permit is slow and dear, except for a German company (Deruluft, the joint airline, flew from 1922).
    if (P0 && P0.fee && !(P0.germanUsual && state.company.nation === "germany")) return { fee: P0.fee, days: P0.days, weeks: P0.weeks };
    return { fee, days, weeks: P0 && P0.republic ? (fee === 750 ? "one to two weeks" : "two to four weeks") : "five to eight weeks" };
  }
  // Who governs a city; some change hands (Mukden and Harbin pass to Japan in September 1931).
  const authority = id => {
    const c = U.cityById[id]; if (!c || !c.empire) return null;
    if (c.empireLater && U.state) { const d = dateOf(U.state.tick); if (d.getUTCFullYear() * 12 + d.getUTCMonth() >= c.empireLater.year * 12 + c.empireLater.month) return c.empireLater.to; }
    return c.empire;
  };
  // Britain kept imperial communications and the Canal under Egypt's independence of 1922: a British company keeps its rights there.
  const ownEmpire = (state, id) => { const a = authority(id), n = state.company.nation; return !!a && (a === n || (a === "egypt" && n === "britain")); };
  const perCity = id => { const a = authority(id); return !!(a && POWERS[a].perCity); };
  const permitKey = id => authority(id) ? (perCity(id) ? "city:" + id : "emp:" + authority(id)) : regionOf(id);
  const permitName = key => key.startsWith("city:") ? `the Soviet government (for ${U.cityById[key.slice(5)].name})` : key.startsWith("emp:") ? POWERS[key.slice(4)].name : REGION_GOV[key].name;
  const permitHeld = (state, key) => { const pm = state.permits && state.permits[key], now = H(state.tick); return !!(pm && pm.grantAt <= now && (!pm.expires || pm.expires > now)); };
  // A Soviet permit's state for a city: none, pending, valid (with its expiry), or lapsed.
  function permitState(state, id) {
    const pm = state.permits && state.permits[permitKey(id)], now = H(state.tick);
    if (!pm) return { status: "none" };
    if (pm.grantAt > now) return { status: "pending", at: pm.grantAt };
    if (pm.expires && pm.expires <= now) return { status: "lapsed", at: pm.expires };
    return { status: "valid", at: pm.expires || null };
  }
  // Once a month: warnings a month before a Soviet permit lapses, and when it does.
  function sovietMonthly(state) {
    const now = H(state.tick);
    for (const [key, pm] of Object.entries(state.permits || {})) {
      if (!key.startsWith("city:") || !pm.expires || pm.grantAt > now) continue;
      const nm = U.cityById[key.slice(5)].name, target = { type: "city", id: key.slice(5) };
      if (pm.expires <= now && !pm.lapsedTold) { pm.lapsedTold = true; telegram(state, now, `soviet permit for ${nm} has lapsed stop your ships may not land there until it is renewed stop`, true, target); }
      else if (pm.expires > now && pm.expires - now <= 45 * 24 && !pm.warned) { pm.warned = true; telegram(state, now, `soviet permit for ${nm} lapses on ${dateAtHour(pm.expires).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })} stop renew it at the city for £${SOVIET.renew.toLocaleString("en-GB")} stop`, true, target); }
    }
  }
  function hasRights(state, id) {
    const c = U.cityById[id]; if (!c) return false;
    if (perCity(id)) return gatewayOpen(state, id) && permitHeld(state, permitKey(id));          // the Soviet permit must be in force
    if (authority(id)) return ownEmpire(state, id) || gatewayOpen(state, id);
    const r = regionOf(id);
    if (r === homeRegion(state) && !c.station && !(c.gateway && r === "eu")) return true;
    return gatewayOpen(state, id);
  }
  function needsPermit(state, id) {
    if (perCity(id)) return !permitHeld(state, permitKey(id));
    if (authority(id)) return !ownEmpire(state, id) && !permitHeld(state, permitKey(id)) && !permitHeld(state, "mea") && !permitHeld(state, regionOf(id)) && !(authority(id) === "usa" && permitHeld(state, "na"));          // (older games may hold the region's permit)
    const r = regionOf(id); if (r === "ocean") return false; return r !== homeRegion(state) && !(state.permits && state.permits[r] && state.permits[r].grantAt <= H(state.tick)); }
  function applyPermit(state, region) {
    state.permits = state.permits || {};
    const old = state.permits[region];
    if (old && region.startsWith("city:") && old.grantAt <= H(state.tick)) {
      // Renewing a Soviet permit: two more years from its expiry, or from now if it has lapsed.
      if (state.money < SOVIET.renew) return "Not enough money for the renewal.";
      state.money -= SOVIET.renew; addGeneral(state, 0);
      old.expires = Math.max(H(state.tick), old.expires || 0) + SOVIET.years * 365 * 24; old.warned = false; old.lapsedTold = false;
      return null;
    }
    if (old) return "Already applied for.";
    const T = permitTerms(state, region), fee = T.fee; if (state.money < fee) return "Not enough money for the application.";
    state.money -= fee; addGeneral(state, 0);
    const now = H(state.tick), grantAt = now + (T.days[0] + Math.floor(Math.random() * T.days[1])) * 24;
    state.permits[region] = { appliedAt: now, grantAt };
    if (region.startsWith("city:")) state.permits[region].expires = grantAt + SOVIET.years * 365 * 24;
    telegram(state, grantAt, `${permitName(region)} grants your company a permit to operate stop surveys may now win landing rights city by city stop foreign lines pay the usual fees stop`, true, { type: "company" });
    return null;
  }
  function surveyFlight(state, gatewayId, shipId, flownHours, damage) {
    if (needsPermit(state, gatewayId)) return `A permit from ${permitName(permitKey(gatewayId))} comes first: apply in this city's panel.`;
    const ship = state.ships.find(s => s.id === shipId), g = U.cityById[gatewayId], c = cls(ship), now = H(state.tick);
    const km = distanceKm(ship.location, gatewayId), rs = U.research.stats(state, ship);
    if (flownHours) {
      // Flown at the helm: the flight has been made; she lies at the city, and the rights are granted on arrival.
      if (rs.rangeKm < km) return `${ship.name} cannot reach ${g.name}: ${Math.round(km)} km, against her range of ${rs.rangeKm} km.`;
      if (damage > 0) ship.condition = Math.max(0.2, ship.condition - damage);
      addCost(state, ship, 4000);
      ship.routeId = null; ship.orders = null; ship.location = gatewayId; ship.readyHour = Math.max(ship.readyHour, now) + Math.round(flownHours + 24);
      state.gateways = state.gateways || {}; state.gateways[gatewayId] = { openAt: ship.readyHour, by: ship.name };
      telegram(state, ship.readyHour, `survey flight to ${g.name} complete stop ${ship.name} lies at ${g.name} stop landing rights granted stop routes may now end there stop`, true, { type: "city", id: gatewayId });
      return null;
    }
    // Sent with her captain: she flies there in hops, each within her range, and the rights are granted when she arrives.
    if (!hopToward(state, ship, gatewayId, true)) return cannotReach(ship, g.name, rs.rangeKm) + ".";
    addCost(state, ship, 4000);
    ship.orders = { kind: "survey", to: gatewayId };
    return null;
  }
  const gatewayOpen = (state, id) => { const g = state.gateways && state.gateways[id]; return !!g && g.openAt <= H(state.tick); };
  function clearSave() {
    saving = false;
    try { for (const k of ["upship.save.v1", "upship.save.v2", "upship.save.v3", "upship.save.v4", "upship.save.v5", "upship.save.v6", "upship.save.v7", "upship.save.v8", "upship.save.v9", "upship.save.v10", SAVE_KEY]) localStorage.removeItem(k); } catch (e) {}
  }

  U.sim = { permitState, sovietMonthly, SOVIET, routeRound, permitTerms, legWay, hopPlan, hopToward, sendShip, cancelOrders, liftAt, liftWorst, legLift, POWERS, authority, ownEmpire, permitKey, permitName, hasRights, oceanLeg, regionOf, homeRegion, needsPermit, applyPermit, REGION_GOV, surveyFlight, gatewayOpen, stopSaving, finishOverhaul, telegram, addGeneral, addIncome, nearestCity, distanceKm, fare, freightRate, dailyPassengers, dailyFreight, start, advance, beginTurn, dateOf, dateAtHour, H,
    routeSummary, save, load, clearSave, editRoute, routeOf, routeName, routeLegs, createRoute, deleteRoute, canAssign, assign,
    order, priceToOrder, HELIUM_FILL, policyGas, heliumFill, rename, suggestName, longestLeg, catalog, orderTerms, saleValue, canSell, sell, positionAt, ageYears, roman };
})(window.UpShip);
