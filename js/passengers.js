// Passenger classes, comfort, fares, and the company's reputation.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;

  // Cabin layouts chosen when a ship is ordered. Berths are a share of the class's most.
  const CONFIGS = {
    first: { name: "First class only", berths: 0.6, firstShare: 1, comfort: 85 },
    two: { name: "Two-class", berths: 0.8, firstShare: 0.2, comfort: 60 },
    second: { name: "Second class only", berths: 1, firstShare: 0, comfort: 35 }
  };
  const CONFIG_ORDER = ["first", "two", "second"];
  const RECONFIG_SHARE = 0.05;
  // How much of a city's travel is first class.
  const FIRST_SHARE = { capital: 0.30, culture: 0.35, commerce: 0.20, port: 0.15, industrial: 0.10 };
  const FIRST_FARE = 1.8, SECOND_FARE = 1.0;
  const FARE_LEVELS = {
    cheap: { name: "Cheap", mult: 0.75 },
    standard: { name: "Standard", mult: 1 },
    premium: { name: "Premium", mult: 1.25 }
  };

  // Berths and comfort --------------------------------------------------------------
  const configOf = ship => CONFIGS[ship.config] || CONFIGS.two;
  function berths(state, ship) {
    const max = U.research.stats(state, ship).passengers;
    if (!max) return { total: 0, first: 0, second: 0 };
    const cfg = configOf(ship), total = Math.max(1, Math.floor(max * cfg.berths));
    const first = Math.round(total * cfg.firstShare);
    return { total, first, second: total - first };
  }
  // Comfort from the layout, adjusted by the kind of ship, then worn down with its condition.
  function comfortNew(ship) {
    const c = U.SHIP_CLASSES[ship.classId];
    let v = configOf(ship).comfort;
    if (c.kind === "surplus") v = Math.min(v - 20, 55);        // converted warships: cramped whatever the layout
    if (c.liner) v += 10; else if (c.art === "medium") v += 5;
    return Math.max(5, Math.min(100, v));
  }
  const comfort = ship => Math.round(comfortNew(ship) * (0.85 + 0.15 * ship.condition));

  // Fares and how travelers respond -------------------------------------------------
  // Fare multipliers for a route's two classes, from its level or the player's own settings.
  function fareMults(route) {
    if (route && route.custom) return { first: route.custom.first / 100, second: route.custom.second / 100 };
    const m = FARE_LEVELS[(route && route.fare) || "standard"].mult;
    return { first: m, second: m };
  }
  // Second-class travelers are price-sensitive (more so upward); first class hardly at all.
  const priceResponse = (m, firstClass) => firstClass ? Math.pow(m, -0.4) : Math.pow(m, m < 1 ? -1.4 : -1.5);
  // How much of the waiting travelers will choose this ship, by class.
  function draw(state, ship, route) {
    const cmf = comfort(ship), f = fareMults(route);
    return {
      first: (0.4 + 1.2 * cmf / 100) * priceResponse(f.first, true),
      second: (0.7 + 0.6 * cmf / 100) * priceResponse(f.second, false)
    };
  }
  // How strongly each city pair draws travelers: the average pull of the ships on the routes serving it.
  function pairPulls(state) {
    const acc = {};
    for (const route of state.routes) {
      const ships = state.ships.filter(sh => sh.routeId === route.id && berths(state, sh).total);
      if (!ships.length) continue;
      const pull = ships.map(sh => draw(state, sh, route)).reduce((a, d) => ({ first: a.first + d.first / ships.length, second: a.second + d.second / ships.length }), { first: 0, second: 0 });
      for (const a of route.stops) for (const b of route.stops) {
        if (a === b) continue;
        const k = a + ">" + b, e = acc[k] = acc[k] || { first: 0, second: 0, n: 0 };
        e.first += pull.first; e.second += pull.second; e.n++;
      }
    }
    const out = {};
    for (const k in acc) out[k] = { first: acc[k].first / acc[k].n, second: acc[k].second / acc[k].n };
    return out;
  }
  const fares = (state, route, km, researchMult) => {
    const f = fareMults(route), base = S().fare(km) * SECOND_FARE * researchMult;
    return { first: base * FIRST_FARE * f.first, second: base * f.second };
  };

  // Demand by class, before any one ship's pull: standing and character act here.
  function firstShareOf(a, b) { return (FIRST_SHARE[U.cityById[a].specialty] + FIRST_SHARE[U.cityById[b].specialty]) / 2; }
  function demandSplit(state, a, b, total) {
    const rep = state.rep || { standing: 50, character: 0 };
    const stand = 0.8 + 0.4 * rep.standing / 100, ch = rep.character / 100;
    const share = firstShareOf(a, b);
    return {
      first: total * share * stand * (ch >= 0 ? 1 + 0.3 * ch : 1 + 0.2 * ch),
      second: total * (1 - share) * stand * (ch >= 0 ? 1 - 0.2 * ch : 1 - 0.3 * ch)
    };
  }

  // Reputation -----------------------------------------------------------------------
  function init(state) {
    state.rep = { standing: 50, character: 0, notes: { standing: [], character: [] }, history: [] };
    state.repMonth = blankMonth();
  }
  function blankMonth() { return { flights: 0, forced: 0, cancelled: 0, pax: 0, comfortSum: 0, mailMissed: 0, mailFlights: 0, premium: 0, cheap: 0, helium: 0, paxFlights: 0 }; }
  const rm = state => state.repMonth = state.repMonth || blankMonth();
  function recordFlight(state, ship, route, load) {
    const m = rm(state);
    m.flights++;
    if (load.pax) { m.pax += load.pax; m.comfortSum += load.pax * comfort(ship); m.paxFlights++; if (ship.gas === "helium") m.helium++; }
    const lvl = route && !route.custom ? route.fare || "standard" : null;
    if (route && route.custom) { const avg = (route.custom.first + route.custom.second) / 200; if (avg < 0.9) m.cheap++; else if (avg > 1.1) m.premium++; }
    else if (lvl === "cheap") m.cheap++; else if (lvl === "premium") m.premium++;
  }
  function recordIncident(state, kind) { const m = rm(state); if (kind === "forced") m.forced++; else m.cancelled++; }
  function recordMail(state, required, missed) { const m = rm(state); m.mailFlights += required; m.mailMissed += missed; }

  // Once a month: standing moves toward what the month deserved (up slowly, down fast); character drifts.
  function monthly(state) {
    const r = state.rep, m = rm(state), notes = { standing: [], character: [] };
    const avgComfort = m.pax ? m.comfortSum / m.pax : null;
    const incidents = m.forced + m.cancelled * 0.5;
    const reliability = Math.max(0, 1 - (m.flights ? incidents / m.flights * 4 : 0) - (m.mailFlights ? m.mailMissed / m.mailFlights : 0));
    if (m.flights) {
      const heliumShare = m.paxFlights ? m.helium / m.paxFlights : 0;
      const target = Math.max(0, Math.min(100, 0.45 * (avgComfort == null ? 50 : avgComfort) + 42 * reliability - 6 * Math.min(3, m.forced) + 5 * heliumShare));
      const gap = target - r.standing;
      r.standing = Math.max(0, Math.min(100, r.standing + gap * (gap > 0 ? 0.12 : 0.35)));
      if (avgComfort != null) notes.standing.push(`Passengers rated the comfort ${Math.round(avgComfort)} of 100 on average.`);
      if (m.forced) notes.standing.push(`${m.forced} forced landing${m.forced > 1 ? "s" : ""} this month.`);
      if (m.cancelled) notes.standing.push(`${m.cancelled} flight${m.cancelled > 1 ? "s" : ""} cancelled.`);
      if (m.mailFlights) notes.standing.push(m.mailMissed ? `${m.mailMissed} of ${m.mailFlights} required mail flights missed.` : "Every required mail flight flown.");
      if (!m.forced && !m.cancelled) notes.standing.push("No incidents.");
      if (heliumShare > 0.05) notes.standing.push(`${Math.round(heliumShare * 100)}% of passenger flights on helium: travelers feel safer.`);
    } else notes.standing.push("No flights this month.");
    // Character: the fleet's layout and the fares charged.
    let firstB = 0, allB = 0;
    for (const sh of state.ships) { const b = berths(state, sh); firstB += b.first; allB += b.total; }
    const firstShare = allB ? firstB / allB : 0.2;
    const fareLean = m.flights ? (m.premium - m.cheap) / m.flights : 0;
    const charTarget = Math.max(-100, Math.min(100, 120 * (firstShare - 0.2) + 60 * fareLean));
    r.character = Math.max(-100, Math.min(100, r.character + (charTarget - r.character) * 0.08));
    if (allB) notes.character.push(`${Math.round(firstShare * 100)}% of your berths are first class.`);
    if (m.premium) notes.character.push(`${Math.round(m.premium / m.flights * 100)}% of flights at premium fares.`);
    if (m.cheap) notes.character.push(`${Math.round(m.cheap / m.flights * 100)}% of flights at cheap fares.`);
    notes.character.push(charTarget > r.character + 3 ? "Slowly moving toward luxury." : charTarget < r.character - 3 ? "Slowly moving toward affordable." : "Holding steady.");
    r.notes = notes;
    r.history.push({ standing: Math.round(r.standing), character: Math.round(r.character) });
    if (r.history.length > 36) r.history.shift();
    state.repMonth = blankMonth();
  }
  const standingWord = v => v >= 80 ? "Excellent" : v >= 65 ? "Good" : v >= 45 ? "Fair" : v >= 30 ? "Poor" : "Bad";
  const characterWord = v => v >= 50 ? "Known for luxury" : v >= 15 ? "Leans luxury" : v > -15 ? "Middle of the road" : v > -50 ? "Leans affordable" : "Known for low fares";

  U.passengers = { CONFIGS, CONFIG_ORDER, RECONFIG_SHARE, FARE_LEVELS, FIRST_SHARE, berths, comfort, comfortNew, configOf, fareMults, draw, fares,
    firstShareOf, demandSplit, pairPulls, init, recordFlight, recordIncident, recordMail, monthly, standingWord, characterWord };
})(window.UpShip);
