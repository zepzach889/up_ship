// Game state, turns, routes, ships, wear, incidents, telegrams, and the economy.
window.UpShip = window.UpShip || {};
(function (U) {
  const SAVE_KEY = "upship.save.v6";
  const VERSION = 6;
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
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nearestCity(lat, lon) {
    let best = null, bd = Infinity;
    for (const c of U.CITIES) { const d = distanceKm({ lat, lon }, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  // Prices and demand -------------------------------------------------------------
  const fare = km => E().fareBase + E().farePerKm * km;
  const freightRate = km => E().freightBase + E().freightPerKm * km;
  function paxWeight(c) { return U.TIERS[c.tier].demand * U.SPECIALTIES[c.specialty].passengerBoost; }
  function freightWeight(c) { return U.TIERS[c.tier].demand / 6 * U.SPECIALTIES[c.specialty].freightBoost; }
  function dailyPassengers(a, b) { return Math.sqrt(paxWeight(U.cityById[a]) * paxWeight(U.cityById[b])) * E().passengerShare; }
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
    const next = {};
    for (const key of servedPairs(state)) {
      const [a, b] = key.split(">");
      const boost = state.facilities ? U.facilities.demandBoost(state, a) * U.facilities.demandBoost(state, b) : 1;
      const p = dailyPassengers(a, b) * boost, f = dailyFreight(a, b);
      const w = state.waiting[key];
      next[key] = !w ? (first ? { pax: p, tons: f } : { pax: 0, tons: 0 })
        : { pax: Math.min(w.pax + p * share * swing(), p * E().passengerWaitDays), tons: Math.min(w.tons + f * share * swing(), f * E().freightWaitDays) };
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
  function suggestName(state, classId) {
    const names = U.SHIP_CLASSES[classId].names;
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

  function newShip(state, classId, name, location, deliveryTick) {
    const c = U.SHIP_CLASSES[classId], surplus = c.kind === "surplus";
    const ship = {
      id: "s" + state.nextId++, name, classId,
      routeId: null, location, turnLocation: location, stop: 0, dir: 1,
      legs: [], readyHour: H(deliveryTick), deliveryTick,
      condition: surplus ? E().surplusStartCondition : 1,
      lifeYears: surplus ? E().lifeYears.surplus : E().lifeYears.built,
      overhaulAt: E().defaultOverhaulAt, overhaulUntil: null, endWarned: false,
      fitted: state.research ? U.research.builtWith(state) : [], refitPlan: [],
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
    for (const id of catalog(state)) if (U.SHIP_CLASSES[id].kind === "surplus") state.surplusLeft[id] = E().surplusStock;
    const first = catalog(state)[0];
    newShip(state, first, suggestName(state, first), config.home, 0);
    U.contracts.init(state);
    state.tutorial = config.tutorial ? { step: 1 } : null;
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
    const route = { id: "r" + state.nextId++, stops: stops.slice(), circuit: !!circuit && stops.length > 2 };
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
    if (longest > c.rangeKm) return `A leg of ${Math.round(longest)} km is beyond its ${c.rangeKm.toLocaleString("en-GB")} km range`;
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
  function order(state, classId, name) {
    const c = U.SHIP_CLASSES[classId], t = orderTerms(state, classId);
    const grant = U.contracts.buildGrantFor(state, classId, t.price);
    t.price -= grant;
    if (state.money < t.price) return null;
    if (grant) U.contracts.useBuildGrant(state, grant);
    if (c.kind === "surplus" && !(state.surplusLeft[classId] > 0)) return null;
    const deliverAt = U.facilities.deliveryCity(state, classId);
    if (!deliverAt) return null;
    if (c.kind === "surplus") state.surplusLeft[classId] -= 1;
    state.money -= t.price;
    state.year.purchases += t.price;
    const clean = (name || "").trim() || suggestName(state, classId);
    return newShip(state, classId, clean, deliverAt, state.tick + t.days * 2);
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
  function nextStop(state, ship, route) {
    const at = route.stops.indexOf(ship.location);
    if (at < 0) {
      let best = route.stops[0], bd = Infinity;
      for (const s of route.stops) { const d = distanceKm(ship.location, s); if (d < bd) { bd = d; best = s; } }
      return { to: best, ferry: true };
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

  function board(state, ship, route, reserved = 0) {
    const c = U.research.stats(state, ship);
    const from = route.stops[ship.stop];
    const room = U.facilities.roomToday(state, from);
    let seats = Math.min(c.passengers, room.pax), hold = Math.min(c.cargoTons - reserved, room.tons), revenue = 0, pax = 0, tons = 0;
    for (const to of downstream(route, ship)) {
      const w = state.waiting[pairKey(from, to)];
      if (!w) continue;
      const km = distanceKm(from, to);
      const p = Math.min(seats, Math.floor(w.pax));
      const t = Math.min(hold, Math.floor(w.tons * 10) / 10);
      w.pax -= p; w.tons -= t; seats -= p; hold -= t;
      pax += p; tons += t;
      revenue += p * fare(km) * c.fare + t * freightRate(km);
    }
    const fee = U.facilities.recordBoarding(state, from, pax, tons);
    return { pax, tons: Math.round(tons * 10) / 10, revenue: Math.round(revenue), fee: Math.round(fee) };
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
    addCost(state, ship, cost + refit.cost);
    ship.overhaulNow = false;
    ship.overhaulUntil = t + E().overhaulDays * 24;
    ship.readyHour = ship.overhaulUntil;
    const refitText = refit.done.length ? ` refit with ${refit.done.join(" and ").toLowerCase()} stop` : "";
    telegram(state, t, `${ship.name} in for overhaul at ${U.cityById[ship.location].name} stop${refitText} cost £${(cost + refit.cost).toLocaleString("en-GB")} stop back in service in three weeks stop`, false, { type: "ship", id: ship.id });
  }
  function finishOverhaul(state, ship) {
    const frac = ageYears(state, ship) / ship.lifeYears;
    ship.condition = frac > 0.8 ? Math.max(0.75, 1 - (frac - 0.8)) : 1;
    telegram(state, ship.overhaulUntil, `${ship.name} overhaul complete stop condition ${Math.round(ship.condition * 100)} percent stop`, false, { type: "ship", id: ship.id });
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
        next = nextStop(state, ship, route);
        // A ship won't leave nearly empty: it waits for a fair load, but never more than about half a day.
        if (!next.ferry && !worthLeaving(state, ship, route, next, t)) { ship.readyHour = T1; return; }
      }
      fly(state, ship, next, t);
    }
  }

  function worthLeaving(state, ship, route, next, t) {
    if (t - (ship.arrivedHour ?? -1e9) >= E().maxWaitHours) return true;
    const c = U.research.stats(state, ship), from = route.stops[ship.stop];
    let pax = 0, tons = 0;
    for (const to of downstream(route, ship)) {
      const w = state.waiting[pairKey(from, to)];
      if (w) { pax += w.pax; tons += w.tons; }
    }
    const fill = (c.passengers ? Math.min(1, pax / c.passengers) * 0.8 : 0) + Math.min(1, tons / c.cargoTons) * (c.passengers ? 0.2 : 1);
    return fill >= E().minLoadToLeave;
  }

  function fly(state, ship, next, t) {
    const c = Object.assign({ price: cls(ship).price }, U.research.stats(state, ship)), route = routeOf(state, ship);
    const km = distanceKm(ship.location, next.to);
    let hours = km / c.speedKmh;
    const from = ship.location;
    // Minor incidents, more likely in poor condition.
    const p = (E().incidentBase + E().incidentWear * (1 - ship.condition) ** 2) * c.incidents;
    let incident = Math.random() < p ? (Math.random() < 0.6 ? "forced" : "cancelled") : null;
    if (incident === "forced" && Math.random() > c.engineFailure) incident = null;
    if (incident === "cancelled") {
      const days = 2;
      const fine = Math.round(c.passengers * fare(km) * 0.3 + 300);
      addCost(state, ship, fine);
      ship.readyHour = t + days * 24;
      ship.condition = Math.max(0, ship.condition - 0.02);
      telegram(state, t, `${ship.name} flight to ${U.cityById[next.to].name} cancelled stop gas cell damage found at ${U.cityById[from].name} stop repairs two days stop compensation £${fine.toLocaleString("en-GB")} stop`, true, { type: "ship", id: ship.id });
      return;
    }
    const ahead = next.ferry || !route ? [] : downstream(route, ship);
    const mail = next.ferry || !route ? 0 : U.contracts.loadMail(state, ship, from, ahead, c.cargoTons);
    const load = next.ferry || !route ? { pax: 0, tons: 0, revenue: 0 } : board(state, ship, route, mail);
    if (!next.ferry && route) U.contracts.recordGrantFlight(state, from, ahead);
    const fuel = Math.round(km * c.fuelPerKm * E().costFactor);
    const berth = U.facilities.dock(state, next.to, t + hours, c.turnaround);
    hours += berth.delay;                               // circling while waiting for a berth
    addCost(state, ship, berth.fee + (load.fee || 0));
    ship.legs.push({ from, to: next.to, start: t, hours, km: Math.round(km), ferry: next.ferry, mail: mail > 0,
      pax: load.pax, tons: load.tons, seats: c.passengers, hold: c.cargoTons, revenue: load.revenue });
    state.day.revenue += load.revenue; state.totals.revenue += load.revenue;
    addCost(state, ship, fuel);
    const rd = routeDay(state, ship.routeId);
    rd.revenue += load.revenue;
    if (!next.ferry) { rd.seats += c.passengers; rd.pax += load.pax; rd.hold += c.cargoTons; rd.tons += load.tons; }
    ship.stats.flights += 1; ship.stats.passengers += load.pax; ship.stats.tons += load.tons; ship.stats.revenue += load.revenue;
    state.totals.flights += 1; state.totals.passengers += load.pax; state.totals.tons += load.tons;
    ship.condition = Math.max(0, ship.condition - hours * E().wearPerFlightHour * wearFactor(state, ship));
    ship.location = next.to;
    ship.arrivedHour = t + hours;
    ship.readyHour = t + hours + c.turnaround;
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
  }

  function beginTurn(state) {
    if (state.plannedTick === state.tick) return;
    state.plannedTick = state.tick;
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
      if (ship.deliveryTick === state.tick)
        telegram(state, now, `${ship.name} delivered at ${U.cityById[ship.location].name} stop ready for service stop`, false, { type: "ship", id: ship.id });
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
      return s;
    } catch (e) { return null; }
  }
  function clearSave() {
    saving = false;
    try { for (const k of ["upship.save.v1", "upship.save.v2", "upship.save.v3", "upship.save.v4", "upship.save.v5", SAVE_KEY]) localStorage.removeItem(k); } catch (e) {}
  }

  U.sim = { telegram, addGeneral, addIncome, nearestCity, distanceKm, fare, freightRate, dailyPassengers, dailyFreight, start, advance, beginTurn, dateOf, dateAtHour, H,
    routeSummary, save, load, clearSave, editRoute, routeOf, routeName, routeLegs, createRoute, deleteRoute, canAssign, assign,
    order, rename, suggestName, longestLeg, catalog, orderTerms, saleValue, canSell, sell, positionAt, ageYears, roman };
})(window.UpShip);
