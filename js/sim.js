// Game state, turns, routes, ships, and the economy.
window.UpShip = window.UpShip || {};
(function (U) {
  const SAVE_KEY = "upship.save.v2";
  const VERSION = 2;
  const E = () => U.ECONOMY;
  const HOURS = () => U.TIME.tickHours;

  // Geography -----------------------------------------------------------------
  function distanceKm(a, b) {
    if (typeof a === "string") a = U.cityById[a];
    if (typeof b === "string") b = U.cityById[b];
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Prices and demand -----------------------------------------------------------
  const fare = km => Math.round(E().fareBase + E().farePerKm * km);
  const freightRate = km => Math.round(E().freightBase + E().freightPerKm * km);

  function paxWeight(c) { return U.TIERS[c.tier].demand * U.SPECIALTIES[c.specialty].passengerBoost; }
  function freightWeight(c) { return U.TIERS[c.tier].demand / 6 * U.SPECIALTIES[c.specialty].freightBoost; }
  function dailyPassengers(a, b) { return Math.sqrt(paxWeight(U.cityById[a]) * paxWeight(U.cityById[b])) * E().passengerShare; }
  function dailyFreight(a, b) { return Math.sqrt(freightWeight(U.cityById[a]) * freightWeight(U.cityById[b])) * E().freightShare; }

  const pairKey = (a, b) => a + ">" + b;

  // All origin-destination pairs the company's routes serve, in both directions.
  function servedPairs(state) {
    const set = new Set();
    for (const r of state.routes)
      for (let i = 0; i < r.stops.length; i++)
        for (let j = 0; j < r.stops.length; j++)
          if (i !== j && r.stops[i] !== r.stops[j]) set.add(pairKey(r.stops[i], r.stops[j]));
    return [...set];
  }

  // Waiting passengers and freight build up daily and give up after a while.
  function refillDemand(state, first) {
    const swing = () => 1 + (Math.random() * 2 - 1) * E().demandSwing;
    const next = {};
    for (const key of servedPairs(state)) {
      const [a, b] = key.split(">");
      const p = dailyPassengers(a, b), f = dailyFreight(a, b);
      const w = state.waiting[key] || { pax: 0, tons: 0 };
      next[key] = first && !state.waiting[key]
        ? { pax: p, tons: f }
        : { pax: Math.min(w.pax + p * swing(), p * E().passengerWaitDays), tons: Math.min(w.tons + f * swing(), f * E().freightWaitDays) };
    }
    state.waiting = next;
  }

  // New game --------------------------------------------------------------------
  function newShip(state, classId, name, location, deliveryTick) {
    const ship = {
      id: "s" + state.nextId++, name, classId,
      routeId: null, location, stop: 0, dir: 1,
      leg: null, deliveryTick,
      stats: { flights: 0, passengers: 0, tons: 0, revenue: 0, costs: 0 }
    };
    state.ships.push(ship);
    return ship;
  }

  function start() {
    const state = {
      version: VERSION, tick: 0, nextId: 1,
      money: E().startingMoney,
      company: { name: "Your company", home: "friedrichshafen", country: "Germany" },
      routes: [], ships: [], waiting: {},
      usedNames: {},
      day: blankDay(), history: [],
      year: { year: 1919, revenue: 0, costs: 0, purchases: 0 },
      notices: []
    };
    const route = createRoute(state, ["friedrichshafen", "berlin"]);
    const ship = newShip(state, "seeschwalbe", "Konstanz", "friedrichshafen", 0);
    state.usedNames.Konstanz = true;
    assign(state, ship.id, route.id);
    refillDemand(state, true);
    departAll(state);
    return state;
  }

  function blankDay() { return { revenue: 0, costs: 0, byRoute: {} }; }

  // Routes ------------------------------------------------------------------------
  function routeName(stops) { return stops.map(s => U.cityById[s].name).join("–"); }

  function createRoute(state, stops) {
    const route = { id: "r" + state.nextId++, stops: stops.slice() };
    state.routes.push(route);
    refillDemand(state, true);
    return route;
  }

  function deleteRoute(state, routeId) {
    for (const s of state.ships) if (s.routeId === routeId) s.routeId = null;
    state.routes = state.routes.filter(r => r.id !== routeId);
  }

  function longestLeg(stops) {
    let m = 0;
    for (let i = 1; i < stops.length; i++) m = Math.max(m, distanceKm(stops[i - 1], stops[i]));
    return m;
  }

  // Can this ship fly this route? Returns an explanation when it can't.
  function canAssign(state, ship, route) {
    const cls = U.SHIP_CLASSES[ship.classId];
    if (ship.deliveryTick > state.tick) return "Still being built";
    const longest = longestLeg(route.stops);
    if (longest > cls.rangeKm) return `A leg of ${Math.round(longest)} km is beyond its ${cls.rangeKm.toLocaleString("en-GB")} km range`;
    return null;
  }

  function assign(state, shipId, routeId) {
    const ship = state.ships.find(s => s.id === shipId);
    ship.routeId = routeId;
    if (!routeId || ship.leg) return;
    const route = state.routes.find(r => r.id === routeId);
    const at = route.stops.indexOf(ship.location);
    if (at >= 0) { ship.stop = at; ship.dir = at === route.stops.length - 1 ? -1 : 1; }
  }

  // Ships -------------------------------------------------------------------------
  function suggestName(state, classId) {
    const names = U.SHIP_CLASSES[classId].names;
    const free = names.find(n => !state.usedNames[n]);
    if (free) return free;
    let i = 2;
    while (state.usedNames[names[0] + " " + i]) i++;
    return names[0] + " " + i;
  }

  function order(state, classId, name) {
    const cls = U.SHIP_CLASSES[classId];
    if (state.money < cls.price) return null;
    state.money -= cls.price;
    state.year.purchases += cls.price;
    const clean = (name || "").trim() || suggestName(state, classId);
    state.usedNames[clean] = true;
    return newShip(state, classId, clean, state.company.home, state.tick + cls.buildDays * 2);
  }

  function rename(state, shipId, name) {
    const clean = name.trim();
    if (!clean) return false;
    state.ships.find(s => s.id === shipId).name = clean;
    state.usedNames[clean] = true;
    return true;
  }

  function routeOf(state, ship) { return state.routes.find(r => r.id === ship.routeId) || null; }

  // Where the ship goes next, or null to stay put.
  function nextLeg(state, ship) {
    const route = routeOf(state, ship);
    if (!route) return null;
    const at = route.stops.indexOf(ship.location);
    if (at < 0) {
      // Not on its route yet: fly empty to the nearest stop.
      let best = route.stops[0], bd = Infinity;
      for (const s of route.stops) { const d = distanceKm(ship.location, s); if (d < bd) { bd = d; best = s; } }
      return { to: best, ferry: true };
    }
    ship.stop = at;
    if (at + ship.dir < 0 || at + ship.dir >= route.stops.length) ship.dir = -ship.dir;
    return { to: route.stops[at + ship.dir], ferry: false };
  }

  function board(state, ship, route) {
    const cls = U.SHIP_CLASSES[ship.classId];
    let seats = cls.passengers, hold = cls.cargoTons, revenue = 0, pax = 0, tons = 0;
    // Serve the nearest downstream stops first.
    for (let j = ship.stop + ship.dir; j >= 0 && j < route.stops.length; j += ship.dir) {
      const key = pairKey(route.stops[ship.stop], route.stops[j]);
      const w = state.waiting[key];
      if (!w) continue;
      const km = distanceKm(route.stops[ship.stop], route.stops[j]);
      const p = Math.min(seats, Math.floor(w.pax));
      const t = Math.min(hold, Math.floor(w.tons * 10) / 10);
      w.pax -= p; w.tons -= t; seats -= p; hold -= t;
      pax += p; tons += t;
      revenue += p * fare(km) + Math.round(t * freightRate(km));
    }
    return { pax, tons: Math.round(tons * 10) / 10, revenue };
  }

  function depart(state, ship) {
    if (ship.leg || ship.deliveryTick > state.tick) return;
    const next = nextLeg(state, ship);
    if (!next) return;
    const cls = U.SHIP_CLASSES[ship.classId];
    const km = distanceKm(ship.location, next.to);
    const load = next.ferry ? { pax: 0, tons: 0, revenue: 0 } : board(state, ship, routeOf(state, ship));
    const fuel = Math.round(km * cls.fuelPerKm);
    ship.leg = { from: ship.location, to: next.to, km: Math.round(km), hours: km / cls.speedKmh,
      startTick: state.tick, ferry: next.ferry, pax: load.pax, tons: load.tons,
      seats: cls.passengers, hold: cls.cargoTons, revenue: load.revenue, fuel };
    const rd = routeDay(state, ship.routeId);
    state.day.revenue += load.revenue; state.day.costs += fuel;
    rd.revenue += load.revenue; rd.costs += fuel;
    if (!next.ferry) { rd.seats += cls.passengers; rd.pax += load.pax; rd.hold += cls.cargoTons; rd.tons += load.tons; }
    ship.stats.flights += 1; ship.stats.passengers += load.pax; ship.stats.tons += load.tons;
    ship.stats.revenue += load.revenue; ship.stats.costs += fuel;
  }

  function departAll(state) { for (const ship of state.ships) depart(state, ship); }

  // The hour (from the start of the game) when a leg's ship is ready to leave again.
  const readyHour = leg => leg.startTick * HOURS() + leg.hours + U.TIME.turnaroundHours;

  function arrivals(state) {
    const endHour = (state.tick + 1) * HOURS();
    for (const ship of state.ships) {
      if (ship.leg && readyHour(ship.leg) <= endHour) {
        ship.location = ship.leg.to;
        ship.leg = null;
        const route = routeOf(state, ship);
        if (route) {
          const at = route.stops.indexOf(ship.location);
          if (at >= 0) ship.stop = at;
        }
      }
    }
  }

  function routeDay(state, routeId) {
    const key = routeId || "none";
    return state.day.byRoute[key] = state.day.byRoute[key] || { revenue: 0, costs: 0, seats: 0, pax: 0, hold: 0, tons: 0 };
  }

  function settleDay(state) {
    for (const ship of state.ships) {
      if (ship.deliveryTick > state.tick) continue;
      const cost = U.SHIP_CLASSES[ship.classId].dailyCost;
      state.day.costs += cost; ship.stats.costs += cost;
      routeDay(state, ship.routeId).costs += cost;
    }
    state.money += state.day.revenue - state.day.costs;
    state.year.revenue += state.day.revenue; state.year.costs += state.day.costs;
    state.history.push(state.day);
    if (state.history.length > 30) state.history.shift();
    state.day = blankDay();
    refillDemand(state, false);
  }

  // One turn: finish arrivals, move the clock on half a day, then depart.
  function advance(state) {
    arrivals(state);
    state.tick += 1;
    // Deliveries
    for (const ship of state.ships) {
      if (ship.deliveryTick === state.tick) {
        state.notices.push(`${ship.name} has been delivered at ${U.cityById[ship.location].name}.`);
      }
    }
    if (state.tick % 2 === 0) settleDay(state);
    const year = dateOf(state.tick).getUTCFullYear();
    if (year !== state.year.year) {
      state.year = { year, revenue: 0, costs: 0, purchases: 0 };
      for (const s of state.ships) s.stats = { flights: 0, passengers: 0, tons: 0, revenue: 0, costs: 0 };
    }
    departAll(state);
  }

  function dateOf(tick, fraction = 0) {
    const hours = U.TIME.firstDepartureHour + (tick + fraction) * HOURS();
    return new Date(U.TIME.startDate + hours * 3600 * 1000);
  }

  // Results over the last 30 days.
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

  // Saving ----------------------------------------------------------------------
  let saving = true;
  function save(state) {
    if (!saving) return false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.version === VERSION ? s : null;
    } catch (e) { return null; }
  }
  // Stops all further saving for this page, so a reload starts fresh.
  function clearSave() {
    saving = false;
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem("upship.save.v1"); } catch (e) {}
  }

  U.sim = { distanceKm, fare, freightRate, dailyPassengers, dailyFreight, start, advance, dateOf, routeSummary,
    save, load, clearSave, routeOf, routeName, createRoute, deleteRoute, canAssign, assign, order, rename,
    suggestName, longestLeg, readyHour };
})(window.UpShip);
