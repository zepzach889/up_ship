// Game state, the half-day tick, and the economy.
window.UpShip = window.UpShip || {};
(function (U) {
  const SAVE_KEY = "upship.save.v1";

  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function fare(km) {
    return Math.round(U.ECONOMY.fareBase + U.ECONOMY.farePerKm * km);
  }

  // Expected passengers for one departure between two cities.
  function legDemand(a, b) {
    const ta = U.TIERS[a.tier].demand * U.SPECIALTIES[a.specialty].passengerBoost;
    const tb = U.TIERS[b.tier].demand * U.SPECIALTIES[b.specialty].passengerBoost;
    return Math.sqrt(ta * tb) * U.ECONOMY.demandShare;
  }

  function newGame() {
    const route = { id: "r1", stops: ["friedrichshafen", "berlin"] };
    const ship = {
      id: "s1", name: "Konstanz", classId: "seeschwalbe", routeId: "r1",
      at: 0,             // index of the stop the ship is at or leaving from
      leg: null,         // { from, to, km, hours, passengers, revenue, fuel }
      stats: { flights: 0, passengers: 0, revenue: 0, costs: 0 }
    };
    return {
      version: 1,
      tick: 0,
      money: U.ECONOMY.startingMoney,
      company: { name: "Bodensee Luftreederei", home: "friedrichshafen" },
      routes: [route],
      ships: [ship],
      day: { revenue: 0, costs: 0 },
      history: [],       // last 30 days: { revenue, costs, byRoute: { id: { revenue, costs, seats, pax } } }
      yearStats: { year: 1919, revenue: 0, costs: 0 }
    };
  }

  function routeOf(state, ship) { return state.routes.find(r => r.id === ship.routeId); }

  function startLeg(state, ship) {
    const route = routeOf(state, ship);
    if (!route || route.stops.length < 2) { ship.leg = null; return; }
    const cls = U.SHIP_CLASSES[ship.classId];
    const from = U.cityById[route.stops[ship.at]];
    const to = U.cityById[route.stops[(ship.at + 1) % route.stops.length]];
    const km = distanceKm(from, to);
    const swing = 1 + (Math.random() * 2 - 1) * U.ECONOMY.demandSwing;
    const passengers = Math.max(0, Math.min(cls.passengers, Math.round(legDemand(from, to) * swing)));
    ship.leg = {
      from: from.id, to: to.id, km: Math.round(km),
      hours: km / cls.speedKmh,
      passengers, seats: cls.passengers,
      revenue: passengers * fare(km),
      fuel: Math.round(km * cls.fuelPerKm)
    };
  }

  function routeDay(state, routeId) {
    state.day.byRoute = state.day.byRoute || {};
    return state.day.byRoute[routeId] = state.day.byRoute[routeId] || { revenue: 0, costs: 0, seats: 0, pax: 0 };
  }

  function finishLeg(state, ship) {
    const leg = ship.leg;
    if (!leg) return;
    const rd = routeDay(state, ship.routeId);
    state.day.revenue += leg.revenue; state.day.costs += leg.fuel;
    rd.revenue += leg.revenue; rd.costs += leg.fuel; rd.seats += leg.seats; rd.pax += leg.passengers;
    ship.stats.flights += 1; ship.stats.passengers += leg.passengers;
    ship.stats.revenue += leg.revenue; ship.stats.costs += leg.fuel;
    const route = routeOf(state, ship);
    ship.at = (ship.at + 1) % route.stops.length;
    ship.leg = null;
  }

  function settleDay(state) {
    for (const ship of state.ships) {
      const cost = U.SHIP_CLASSES[ship.classId].dailyCost;
      state.day.costs += cost; ship.stats.costs += cost;
      routeDay(state, ship.routeId).costs += cost;
    }
    state.money += state.day.revenue - state.day.costs;
    state.yearStats.revenue += state.day.revenue; state.yearStats.costs += state.day.costs;
    state.history.push(state.day);
    if (state.history.length > 30) state.history.shift();
    state.day = { revenue: 0, costs: 0 };
  }

  // Advance one half-day. Legs flown during the tick finish; new legs depart.
  function advance(state) {
    for (const ship of state.ships) finishLeg(state, ship);
    state.tick += 1;
    if (state.tick % 2 === 0) settleDay(state);
    const year = dateOf(state.tick).getUTCFullYear();
    if (year !== state.yearStats.year) {
      state.yearStats = { year, revenue: 0, costs: 0 };
      for (const s of state.ships) s.stats = { flights: 0, passengers: 0, revenue: 0, costs: 0 };
    }
    for (const ship of state.ships) startLeg(state, ship);
  }

  function dateOf(tick, fraction = 0) {
    const hours = U.TIME.firstDepartureHour + (tick + fraction) * U.TIME.tickHours;
    return new Date(U.TIME.startDate + hours * 3600 * 1000);
  }

  // Route results over the last 30 days.
  function routeSummary(state, routeId) {
    const sum = { revenue: 0, costs: 0, seats: 0, pax: 0, days: 0 };
    for (const d of state.history) {
      const r = d.byRoute && d.byRoute[routeId];
      if (!r) continue;
      sum.revenue += r.revenue; sum.costs += r.costs; sum.seats += r.seats; sum.pax += r.pax; sum.days += 1;
    }
    sum.profit = sum.revenue - sum.costs;
    sum.load = sum.seats ? sum.pax / sum.seats : null;
    return sum;
  }

  function save(state) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.version === 1 ? s : null;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  function start() {
    const state = newGame();
    for (const ship of state.ships) startLeg(state, ship);
    return state;
  }

  U.sim = { distanceKm, fare, legDemand, start, advance, dateOf, routeSummary, save, load, clearSave, routeOf };
})(window.UpShip);
