// Mail contracts, route and construction grants, and bank loans.
window.UpShip = window.UpShip || {};
(function (U) {
  const E = () => U.ECONOMY;
  const S = () => U.sim;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const nowHour = state => S().H(state.tick);
  const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
  const name = id => U.cityById[id].name;
  const nationOf = cityId => U.nationOfCountry[U.cityById[cityId].country] || null;
  const tierRank = { small: 0, medium: 1, large: 2, major: 3 };

  function init(state) {
    Object.assign(state, {
      offers: [], contracts: [], grants: [], buildGrant: null,
      loan: 0, bankruptStrikes: 0, bankrupt: false,
      nextOfferHour: nowHour(state) + rand(...E().offerEveryDays) * 24 / U.NATIONS[state.company.nation].subsidy.frequency ** 0.3
    });
    firstOffer(state);
  }

  // Mail contracts ------------------------------------------------------------------
  function mailMonthly(km, perWeek) { return Math.round(km * perWeek / 7 * 30 * 2 * E().mailRatePerKm / 10) * 10; }

  function mailOffer(state, a, b, opts = {}) {
    const km = S().distanceKm(a, b);
    const perWeek = opts.perWeek || pick([3, 7, 7]);
    const years = opts.years || pick([1, 2, 2, 3]);
    const monthly = Math.round(mailMonthly(km, perWeek) * (opts.generous || 1) * (state.company.nation === "usa" ? 1.3 : 1) / 10) * 10;          // America's Post Office pays well
    const authority = opts.authority || U.NATIONS[state.company.nation].name;
    return { id: "o" + state.nextId++, kind: "mail", a, b, perWeek, years, monthly, authority,
      expiresHour: nowHour(state) + E().offerOpenDays * 24, warned: false, tutorial: !!opts.tutorial };
  }

  // The first offer: home city to a nearby larger city within the first ship's range.
  function firstOffer(state) {
    const home = U.cityById[state.company.home];
    const range = U.SHIP_CLASSES[state.ships[0].classId].rangeKm;
    // A real city the company may land at (never a refuelling station), at least a large one, or as large as home.
    const ok = c => c.id !== home.id && !c.station && S().hasRights(state, c.id);
    const choices = U.CITIES.filter(c => ok(c) && tierRank[c.tier] >= Math.max(Math.min(tierRank[home.tier], tierRank.large), 1))
      .map(c => ({ c, d: S().distanceKm(home, c) }))
      .filter(x => x.d >= 150 && x.d <= Math.min(range * 0.8, 800))
      .sort((x, y) => (y.c.country === home.country) - (x.c.country === home.country) || x.d - y.d);
    // Failing that, the nearest suitable city of any size.
    const nearest = U.CITIES.filter(ok).map(c => ({ c, d: S().distanceKm(home, c) })).filter(x => x.d >= 150).sort((x, y) => x.d - y.d)[0];
    const target = (choices[0] || nearest).c;
    const offer = mailOffer(state, home.id, target.id, { perWeek: 3, years: 2, generous: 1.6, tutorial: true });
    offer.expiresHour = nowHour(state) + 60 * 24;
    state.offers.push(offer);
    const posts = state.company.nation === "usa" ? "post office department" : state.company.nation === "japan" ? "ministry of communications" : "ministry of posts";
    S().telegram(state, nowHour(state), `${posts} offers mail award ${home.name} to ${target.name} stop ${gbp(offer.monthly)} monthly for two years stop see contracts stop`, false, { type: "contracts" });
  }

  function networkCities(state) { return new Set(state.routes.flatMap(r => r.stops).concat([state.company.home])); }

  // How many flights a week the company's ships already make each way between two cities on its routes.
  function weeklyService(state, a, b) {
    let n = 0;
    for (const r of state.routes) {
      if (!r.stops.includes(a) || !r.stops.includes(b)) continue;
      const ships = state.ships.filter(sh => sh.routeId === r.id && sh.deliveryTick <= state.tick && !sh.lost); if (!ships.length) continue;
      let hours = 0; for (const [x, y] of S().routeLegs(r)) hours += S().distanceKm(x, y) / U.research.stats(state, ships[0]).speedKmh + E().turnaroundHours;
      if (!(r.circuit && r.stops.length > 2)) hours *= 2;          // out and back
      n += ships.length * 168 / Math.max(6, hours);
    }
    return n;
  }
  // A mail award is offered only for two cities one of the company's routes already joins: the mail rides the ships
  // already flying, and the minimum asked is well within what they fly now.
  function randomMailOffer(state) {
    const nation = state.company.nation, pairs = [], seen = new Set();
    for (const r of state.routes) for (let i = 0; i < r.stops.length; i++) for (let j = i + 1; j < r.stops.length; j++) {
      const a = r.stops[i], b = r.stops[j], key = a < b ? a + ">" + b : b + ">" + a; if (seen.has(key)) continue; seen.add(key);
      if (U.cityById[a].station || U.cityById[b].station) continue;
      if (state.contracts.some(k => (k.a === a && k.b === b) || (k.a === b && k.b === a))) continue;
      const svc = weeklyService(state, a, b); if (svc < 1.4) continue;
      const home = nationOf(a) === nation || nationOf(b) === nation, authority = home ? U.NATIONS[nation].name : U.cityById[a].country;
      pairs.push({ a, b, w: U.TIERS[U.cityById[a].tier].demand * U.TIERS[U.cityById[b].tier].demand, authority, perWeek: Math.max(1, Math.min(7, Math.floor(svc * 0.7))) });
    }
    if (!pairs.length) return null;
    let r0 = Math.random() * pairs.reduce((t, p0) => t + p0.w, 0);
    const chosen = pairs.find(p0 => (r0 -= p0.w) <= 0) || pairs[0];
    return mailOffer(state, chosen.a, chosen.b, { authority: chosen.authority, perWeek: chosen.perWeek });
  }

  // Giving up a mail award costs nothing: the retainer simply stops.
  function dropContract(state, id) {
    const k = state.contracts.find(x => x.id === id);
    if (!k) return 0;
    state.contracts = state.contracts.filter(x => x !== k);
    for (const sh of state.ships) sh.mailAboard = (sh.mailAboard || []).filter(m => m.to !== k.a && m.to !== k.b);
    return 0;
  }

  // Grants ---------------------------------------------------------------------------
  function grantOffer(state) {
    const nat = U.NATIONS[state.company.nation], sub = nat.subsidy;
    const homeCities = U.CITIES.filter(c => nationOf(c.id) === state.company.nation);
    const pairs = [];
    for (const a of homeCities) for (const b of U.CITIES) {
      if (a.id === b.id || state.grants.some(g => (g.a === a.id && g.b === b.id) || (g.a === b.id && g.b === a.id))) continue;
      const km = S().distanceKm(a, b);
      let ok = false;
      if (sub.leaning === "imperial") ok = U.IMPERIAL.includes(b.id);
      else if (sub.leaning === "mediterranean") ok = U.MEDITERRANEAN.includes(b.id) && nationOf(b.id) !== "italy";
      else if (sub.leaning === "capitals") ok = b.specialty === "capital" && nationOf(b.id) !== state.company.nation;
      else ok = tierRank[b.tier] >= 2 && nationOf(b.id) !== state.company.nation;
      if (ok && km >= 250 && km <= 2600) pairs.push({ a: a.id, b: b.id, km });
    }
    if (!pairs.length) return null;
    const p = pick(pairs);
    const upfront = Math.round(p.km * 10 * sub.scale / 500) * 500;
    const monthly = Math.round(p.km * 0.5 * sub.scale / 10) * 10;
    return { id: "o" + state.nextId++, kind: "route", a: p.a, b: p.b, upfront, monthly, years: E().grantYears,
      expiresHour: nowHour(state) + E().offerOpenDays * 24, warned: false };
  }

  function buildOffer(state) {
    const sub = U.NATIONS[state.company.nation].subsidy;
    return { id: "o" + state.nextId++, kind: "build", share: sub.buildShare,
      expiresHour: nowHour(state) + E().offerOpenDays * 24, warned: false };
  }

  function randomOffer(state) {
    const sub = U.NATIONS[state.company.nation].subsidy;
    const r = Math.random();
    const grantChance = 0.3 * sub.frequency;
    if (r < grantChance * 0.7) return grantOffer(state) || randomMailOffer(state);
    if (r < grantChance) return state.buildGrant ? randomMailOffer(state) : buildOffer(state);
    return randomMailOffer(state);
  }

  const CHARTERS = [
    ["the Royal Geographical Society", "an Arctic survey from Spitsbergen", 24, 3000],
    ["a newspaper syndicate", "a round-Europe publicity flight with reporters aboard", 10, 1500],
    ["a film company", "location filming over the Alps", 14, 1200],
    ["a royal household", "a state visit, carrying the royal party and their suite", 7, 1500],
    ["a scientific congress", "upper-air research flights over the North Sea", 12, 1000],
    ["a shipping magnate", "a private pleasure cruise for his guests", 9, 1200]
  ];
  const NAVY = [["the United States Navy", "scouting for the Atlantic Fleet's exercises", 14, 2000], ["the United States Navy", "carrying officers to the Pacific Fleet at San Diego", 8, 3000],
    ["the Navy Department", "trials of a new mooring mast on a ship at sea", 6, 1000]];
  // Now and then a charter: good pay and standing, but the ship leaves her route for days or weeks.
  function maybeCharter(state) {
    if (Math.random() > 0.3 || !state.ships.some(s => s.deliveryTick <= state.tick)) return;
    const pool = state.company.nation === "usa" && Math.random() < 0.5 ? NAVY : CHARTERS;          // the Navy as a partner
    const [who, what, days, range] = pool[Math.floor(Math.random() * pool.length)];
    const pay = Math.round(days * (900 + Math.random() * 600) / 100) * 100;
    state.offers.push({ id: "o" + state.nextId++, kind: "charter", who, what, days, range, pay, expiresHour: nowHour(state) + 14 * 24, warned: false });
    S().telegram(state, nowHour(state), `charter offered by ${who} stop ${what} stop ${days} days for ${gbp(pay)} stop see contracts stop`, false, { type: "contracts" });
  }
  // Record attempts: a fast run between two great cities. The record stands until beaten.
  const RECORDS = [["london", "cairo"], ["berlin", "moscow"], ["paris", "constantinople"], ["london", "athens"], ["madrid", "stockholm"], ["rome", "london"]];
  const PUSH = { steady: { speed: 1.0, risk: 0, name: "steady" }, hard: { speed: 1.08, risk: 0.07, name: "hard" }, allout: { speed: 1.16, risk: 0.16, name: "all out" } };
  function maybeRecord(state) {
    if (Math.random() > 0.22 || !state.ships.some(s => s.deliveryTick <= state.tick)) return;
    const [a, b] = RECORDS[Math.floor(Math.random() * RECORDS.length)], key = a + ">" + b, km = Math.round(S().distanceKm(a, b));
    state.records = state.records || {};
    if (!state.records[key]) state.records[key] = { hours: Math.round(km / 125 * 10) / 10, by: "a naval airship" };          // faster than early ships cruise: beating it takes a push or a faster ship
    const prize = Math.round((5000 + km * 4) / 500) * 500;
    state.offers.push({ id: "o" + state.nextId++, kind: "record", a, b, km, prize, expiresHour: nowHour(state) + 21 * 24, warned: false });
    S().telegram(state, nowHour(state), `aero club prize offered stop fastest ${name(a)} to ${name(b)} stop record ${state.records[key].hours} hours stop ${gbp(prize)} to beat it stop see contracts stop`, false, { type: "contracts" });
  }
  // Ships free to take a mission: in service, not under overhaul or other orders, with the range it needs.
  function eligible(state, o) {
    const need = o.kind === "record" ? o.km : o.range || 0;
    return state.ships.filter(s => s.deliveryTick <= state.tick && !s.lost && !s.overhaulUntil && !s.orders && U.research.stats(state, s).rangeKm >= need);
  }
  // The attempt: the chosen ship (or the fastest with the range) flies to the starting city, then makes the run.
  // Pushing harder beats the record more often but risks damage. The result is settled when she lands.
  function attempt(state, offerId, push, shipId) {
    const o = state.offers.find(x => x.id === offerId); if (!o) return null;
    const ok = eligible(state, o); if (!ok.length) return { none: true };
    const ship = (shipId && ok.find(s => s.id === shipId)) || ok.sort((x, y) => U.research.stats(state, y).speedKmh - U.research.stats(state, x).speedKmh)[0];
    if (ship.location !== o.a && !S().hopToward(state, ship, o.a)) return { unreachable: true, ship };
    state.offers = state.offers.filter(x => x !== o);
    const atStart = ship.location === o.a;
    ship.orders = { kind: "record", stage: atStart ? "run" : "toStart", to: atStart ? o.b : o.a, a: o.a, b: o.b, km: o.km, prize: o.prize, push };
    return { ship, pending: true, atStart };
  }
  function settleRecord(state, ship, o, t) {
    const P = PUSH[o.push] || PUSH.steady, key = o.a + ">" + o.b, rec = state.records[key];
    const cap = state.captains.find(c => c.shipId === ship.id), tr = cap ? cap.traits : [];
    const skill = (tr.includes("weatherwise") ? 0.95 : 1) * (tr.includes("harddriving") ? 0.97 : 1) * (tr.includes("careful") ? 1.03 : 1);
    const hours = Math.round(o.km / (U.research.stats(state, ship).speedKmh * P.speed) * skill * (0.9 + Math.random() * 0.22) * 10) / 10;
    const won = hours < rec.hours, damaged = Math.random() < P.risk * (tr.includes("reckless") ? 1.5 : 1) * (tr.includes("careful") ? 0.5 : 1);
    if (damaged) ship.condition = Math.max(0.2, ship.condition - 0.3);
    if (won) { state.records[key] = { hours, by: ship.name }; S().addIncome(state, o.prize, "prizes"); }
    adjustStanding(state, won ? 6 : 1);
    S().telegram(state, t, won ? `new record stop ${ship.name} flies ${name(o.a)} to ${name(o.b)} in ${hours} hours stop beating ${rec.hours} stop prize of ${gbp(o.prize)} won stop`
      : `record attempt fails stop ${ship.name} ${name(o.a)} to ${name(o.b)} in ${hours} hours against ${rec.hours} stop${damaged ? " ship strained and in need of repair stop" : " a creditable run stop"}`, true, { type: "ship", id: ship.id });
    return { ship, won, hours };
  }
  // The ship that would fly a record attempt: the fastest with the range.
  function recordShip(state, offerId) {
    const o = state.offers.find(x => x.id === offerId); if (!o) return null;
    const ok = state.ships.filter(s => s.deliveryTick <= state.tick && !s.lost && !s.overhaulUntil && U.research.stats(state, s).rangeKm >= o.km);
    return ok.sort((x, y) => U.research.stats(state, y).speedKmh - U.research.stats(state, x).speedKmh)[0] || null;
  }
  // Settling an attempt flown at the helm: the time and any damage come from the flight itself.
  function attemptFlown(state, offerId, ship, hours, damage) {
    const o = state.offers.find(x => x.id === offerId); if (!o) return null;
    state.offers = state.offers.filter(x => x !== o);
    const now = nowHour(state), key = o.a + ">" + o.b, rec = state.records[key], won = hours < rec.hours;
    ship.location = o.b; ship.orders = null; ship.readyHour = Math.max(ship.readyHour, now) + Math.ceil(hours + 12);          // she lies at the far end
    if (damage > 0) ship.condition = Math.max(0.2, ship.condition - damage);
    if (won) { state.records[key] = { hours, by: ship.name }; S().addIncome(state, o.prize, "prizes"); }
    adjustStanding(state, won ? 7 : 1);
    return { won, prize: o.prize, rec: rec.hours };
  }
  // Government offers with conditions, about twice a year: opening a far destination, diplomatic mail, a grant for two ships.
  const FAR = { germany: ["moscow", "constantinople", "cairo", "newyork", "recife", "buenosaires"], britain: ["cairo", "baghdad", "karachi", "bombay", "nairobi", "capetown", "newyork", "calcutta", "singapore", "hongkong", "sydney", "auckland"],
    france: ["algiers", "tunis", "casablanca", "dakar", "beirut", "saigon"], italy: ["tripoli", "benghazi", "tunis", "constantinople"], japan: ["seoul", "taihoku", "shanghai", "manila", "mukden"], usa: ["havana", "mexicocity", "montreal", "london", "panama", "rio", "manila"] };
  // The great schemes, offered once each: a large sum for a regular service to the far end of an imperial route within five years.
  const SCHEMES = { germany: { year: 1930, month: 4, city: "rio", pay: 100000, who: "the Reich Ministry of Transport", text: "reich ministry of transport seeks a regular airship service to rio de janeiro by way of recife within five years" },
    britain: { year: 1924, month: 9, city: "karachi", pay: 120000, who: "the Air Ministry", text: "air ministry announces the imperial airship scheme stop a regular service to karachi by way of egypt within five years" },
    france: { year: 1925, month: 3, city: "dakar", pay: 80000, who: "the Ministry of Colonies", text: "ministry of colonies seeks an airship line to dakar within five years" },
    italy: { year: 1926, month: 3, city: "tripoli", pay: 40000, who: "the Ministry of Colonies", text: "ministry of colonies seeks an airship line to tripoli within five years" } };
  // The Imperial Airship Scheme's second stage: once a British company flies to Karachi, the service on to Australia.
  function maybeScheme2(state) {
    if (state.company.nation !== "britain" || state.scheme2Offered || !state.schemeOffered) return;
    if (S().dateOf(state.tick).getUTCFullYear() < 1926 || !state.routes.some(r => r.stops.includes("karachi") && state.ships.some(sh => sh.routeId === r.id))) return;
    state.scheme2Offered = true;
    if (state.routes.some(r => r.stops.includes("darwin"))) return;
    const now = nowHour(state);
    state.offers.push({ id: "o" + state.nextId++, kind: "goal", city: "darwin", pay: 200000, years: 8, scheme: true, authority: "the Air Ministry", expiresHour: now + 90 * 24, warned: false });
    S().telegram(state, now, `air ministry extends the imperial airship scheme stop a regular service to australia landing at darwin within eight years stop ${gbp(200000)} on success stop see contracts stop`, true, { type: "contracts" });
  }
  function maybeScheme(state) {
    const sc = SCHEMES[state.company.nation]; if (!sc || state.schemeOffered) return;
    const d = S().dateOf(state.tick), y = d.getUTCFullYear(), m = d.getUTCMonth();
    if (y < sc.year || (y === sc.year && m < sc.month)) return;
    state.schemeOffered = true;
    if (state.routes.some(r => r.stops.includes(sc.city))) return;          // already flying there
    const now = nowHour(state);
    state.offers.push({ id: "o" + state.nextId++, kind: "goal", city: sc.city, pay: sc.pay, years: 5, scheme: true, authority: sc.who, expiresHour: now + 90 * 24, warned: false });
    S().telegram(state, now, `${sc.text} stop ${gbp(sc.pay)} on success stop see contracts stop`, true, { type: "contracts" });
  }
  const CAPITALS = ["london", "paris", "berlin", "rome", "moscow", "madrid", "vienna"];
  function maybeGovernment(state) {
    if (Math.random() > 0.17) return;
    const nat = state.company.nation, home = state.company.home, gov = U.NATIONS[nat].name, now = nowHour(state), kind = Math.floor(Math.random() * 3);
    if (kind === 0) {
      const options = (FAR[nat] || FAR.germany).filter(id => U.cityById[id] && !state.routes.some(r => r.stops.includes(id)));
      if (!options.length) return;
      const city = options[Math.floor(Math.random() * options.length)], pay = Math.round((20000 + S().distanceKm(home, city) * 12) / 1000) * 1000;
      state.offers.push({ id: "o" + state.nextId++, kind: "goal", city, pay, authority: gov, expiresHour: now + 30 * 24, warned: false });
      S().telegram(state, now, `government offer stop open a regular service to ${name(city)} within two years stop ${gbp(pay)} on success stop see contracts stop`, false, { type: "contracts" });
    } else if (kind === 1 && CAPITALS.some(id => U.cityById[id] && U.cityById[id].country !== U.cityById[home].country && weeklyService(state, home, id) >= 1.4)) {
      const caps = CAPITALS.filter(id => U.cityById[id] && U.cityById[id].country !== U.cityById[home].country && weeklyService(state, home, id) >= 1.4), capital = caps[Math.floor(Math.random() * caps.length)];
      const offer = mailOffer(state, home, capital, { perWeek: Math.max(1, Math.min(3, Math.floor(weeklyService(state, home, capital) * 0.7))), years: 2, generous: 1.8 });
      offer.diplomatic = true; offer.authority = "your foreign ministry";
      state.offers.push(offer);
      S().telegram(state, now, `foreign ministry offers diplomatic mail ${name(home)} to ${name(capital)} stop well paid stop see contracts stop`, false, { type: "contracts" });
    } else {
      state.offers.push({ id: "o" + state.nextId++, kind: "build", share: 0.2, count: 2, expiresHour: now + 30 * 24, warned: false });
      S().telegram(state, now, `government offers construction grant stop twenty percent of your next two ships built at home stop see contracts stop`, false, { type: "contracts" });
    }
  }
  // A destination opened in time pays out: a route to it with a ship on it.
  function checkGoals(state) {
    const now = nowHour(state);
    for (const g of [...(state.goals || [])]) {
      const served = state.routes.some(r => r.stops.includes(g.city) && state.ships.some(s => s.routeId === r.id && s.deliveryTick <= state.tick));
      if (served) { S().addIncome(state, g.pay, "grants"); adjustStanding(state, 4); state.goals = state.goals.filter(x => x !== g);
        S().telegram(state, now, `government pays ${gbp(g.pay)} stop regular service to ${name(g.city)} opened as agreed stop`, false, { type: "finances" }); }
      else if (now > g.until) { state.goals = state.goals.filter(x => x !== g); S().telegram(state, now, `government offer for a service to ${name(g.city)} has lapsed stop`, false, { type: "contracts" }); }
    }
  }
  // Standing is a record (standing, character, notes); this changes the standing figure in it, between 0 and 100.
  function adjustStanding(state, d) {
    if (!state.rep || typeof state.rep !== "object") U.passengers.init(state);
    state.rep.standing = Math.max(0, Math.min(100, (+state.rep.standing || 50) + d));
  }
  function describe(o) {
    if (o.kind === "goal") return `government offer stop open a regular service to ${name(o.city)} within ${({ 5: "five", 8: "eight" })[o.years] || "two"} years stop ${gbp(o.pay)} on success stop`;
    if (o.kind === "record") { const r = (U.state.records || {})[o.a + ">" + o.b]; return `aero club prize stop fastest ${name(o.a)} to ${name(o.b)} stop ${o.km.toLocaleString("en-GB")} km stop record ${r ? r.hours + " hours by " + r.by : "unclaimed"} stop ${gbp(o.prize)} to beat it stop`; }
    if (o.kind === "charter") return `charter for ${o.who} stop ${o.what} stop ${o.days} days for ${gbp(o.pay)} stop needs a ship with ${o.range.toLocaleString("en-GB")} km of range stop`;
    if (o.kind === "mail") return `mail award ${name(o.a)} to ${name(o.b)} stop a retainer of ${gbp(o.monthly)} monthly for ${o.years} year${o.years > 1 ? "s" : ""} stop at least ${o.perWeek === 7 ? "a flight daily" : o.perWeek + (o.perWeek === 1 ? " flight" : " flights") + " weekly"} each way stop no penalties stop`;
    if (o.kind === "route") return `government grant for new service ${name(o.a)} to ${name(o.b)} stop ${gbp(o.upfront)} on opening and ${gbp(o.monthly)} monthly for ${o.years} years stop`;
    return `government construction grant stop ${Math.round(o.share * 100)} percent of your next national-built ship stop`;
  }

  // Player choices ----------------------------------------------------------------------
  function accept(state, offerId, shipId) {
    const o = state.offers.find(x => x.id === offerId);
    if (!o) return null;
    state.offers = state.offers.filter(x => x !== o);
    const now = nowHour(state);
    if (o.kind === "mail") {
      if (o.diplomatic) adjustStanding(state, -3);          // other governments take note
      const k = { id: "c" + state.nextId++, a: o.a, b: o.b, perWeek: o.perWeek, monthly: o.monthly, authority: o.authority,
        startHour: now, endHour: now + o.years * 365 * 24, week: { ab: 0, ba: 0 }, made: 0, required: 0, weeks: 0, penalties: 0, paid: 0, tutorial: o.tutorial };
      state.contracts.push(k);
      return k;
    }
    if (o.kind === "goal") { state.goals = state.goals || []; const g = { city: o.city, pay: o.pay, until: now + (o.years || 2) * 365 * 24 }; state.goals.push(g); return g; }
    if (o.kind === "charter") {
      // The chosen ship goes (or the one that earns least on her route); she flies to where the charter is, and rejoins her route after.
      const ok = eligible(state, o);
      if (!ok.length) { state.offers.push(o); return null; }
      const ship = (shipId && ok.find(x => x.id === shipId)) || ok.sort((a, b) => (a.stats && a.stats.revenue || 0) - (b.stats && b.stats.revenue || 0))[0];
      // Where: a place she can land within reach, a fair way off; failing that, where she lies.
      const plan = S().hopPlan(state, ship, ship.location);
      const places = Object.keys(plan.dist).filter(id => id !== ship.location && plan.dist[id] >= 150 && plan.dist[id] <= Math.max(400, o.range));
      const at = places.length ? places[Math.floor(Math.random() * places.length)] : ship.location;
      ship.orders = { kind: "charter", to: at, days: o.days, who: o.who };
      S().addIncome(state, o.pay, "charters");
      adjustStanding(state, 2);
      return { charter: true, ship, at };
    }
    if (o.kind === "route") {
      const g = { id: "g" + state.nextId++, a: o.a, b: o.b, upfront: o.upfront, monthly: o.monthly, years: o.years,
        acceptedHour: now, openBy: now + E().grantOpenMonths * 30 * 24, opened: null, endHour: null, month: { ab: 0, ba: 0 }, received: 0 };
      state.grants.push(g);
      return g;
    }
    state.buildGrant = { share: o.share, until: now + E().buildGrantMonths * 30 * 24, count: o.count || 1 };
    return state.buildGrant;
  }
  function decline(state, offerId) { state.offers = state.offers.filter(x => x.id !== offerId); }

  // Flights --------------------------------------------------------------------------------
  // Mail rides between the contract's two cities on any route that carries between them,
  // including through stops in between. On leaving a city, a ship takes on mail for every
  // contract whose other city lies ahead of it on its route and still needs a flight this week.
  function mailToLoad(state, from, ahead) {
    const out = [];
    for (const k of state.contracts) {
      if (k.a === from && ahead.includes(k.b) && k.week.ab < k.perWeek) out.push({ k, dir: "ab", to: k.b });
      else if (k.b === from && ahead.includes(k.a) && k.week.ba < k.perWeek) out.push({ k, dir: "ba", to: k.a });
    }
    return out;
  }
  // Returns the tons of cargo space the mail aboard takes on this leg, and counts new mail.
  function loadMail(state, ship, from, ahead, hold) {
    ship.mailAboard = (ship.mailAboard || []).filter(m => m.to !== from && ahead.includes(m.to));
    for (const m of mailToLoad(state, from, ahead)) {
      // A few mailbags ride on any ship, hold or no hold.
      m.k.week[m.dir]++;
      ship.mailAboard.push({ to: m.to });
    }
    return Math.min(hold, ship.mailAboard.length * E().mailTons);
  }
  // Route grants count any flight leaving one of the two cities with the other ahead on the route.
  function recordGrantFlight(state, from, ahead) {
    for (const g of state.grants) {
      const dir = g.a === from && ahead.includes(g.b) ? "ab" : g.b === from && ahead.includes(g.a) ? "ba" : null;
      if (!dir) continue;
      g.month[dir]++;
      if (!g.opened && g.month.ab > 0 && g.month.ba > 0) {
        g.opened = nowHour(state); g.endHour = g.opened + g.years * 365 * 24;
        S().addIncome(state, g.upfront, "grants"); g.received += g.upfront;
        S().telegram(state, nowHour(state), `service ${name(g.a)} to ${name(g.b)} opened stop government grant of ${gbp(g.upfront)} paid stop`, false, { type: "contracts" });
      }
    }
  }

  // Calendar -------------------------------------------------------------------------------
  function daily(state) {
    const now = nowHour(state);
    if (state.bankrupt) return;
    for (const o of state.offers.slice()) {
      if (o.expiresHour <= now) {
        state.offers = state.offers.filter(x => x !== o);
        S().telegram(state, now, `offer lapsed stop ${describe(o)}`, false, { type: "contracts" });
      } else if (!o.warned && o.expiresHour - now <= 7 * 24) {
        o.warned = true;
        S().telegram(state, now, `offer expires in one week stop ${describe(o)}`, true, { type: "contracts" });
      }
    }
    for (const g of state.grants.slice()) if (!g.opened && now > g.openBy) {
      state.grants = state.grants.filter(x => x !== g);
      S().telegram(state, now, `grant for ${name(g.a)} to ${name(g.b)} withdrawn stop service not opened in time stop`, true, { type: "contracts" });
    }
    if (state.buildGrant && now > state.buildGrant.until) {
      state.buildGrant = null;
      S().telegram(state, now, `construction grant lapsed unused stop`, false, { type: "shipyard" });
    }
    if (now >= state.nextOfferHour) {
      const sub = U.NATIONS[state.company.nation].subsidy;
      state.nextOfferHour = now + rand(...E().offerEveryDays) * 24;
      const o = randomOffer(state);
      if (o) {
        state.offers.push(o);
        const from = o.kind === "mail" && o.authority !== U.NATIONS[state.company.nation].name ? `postal authority of ${o.authority}` : "government";
        S().telegram(state, now, `new offer from ${from} stop ${describe(o)} see contracts stop`, true, { type: "contracts" });
      }
    }
  }

  // Each week's flights are tallied toward the month; nothing is fined.
  function weekly(state) {
    const now = nowHour(state);
    for (const k of state.contracts) {
      if (k.startHour > now - 7 * 24 + 1) { k.week = { ab: 0, ba: 0 }; continue; }  // a partial first week does not count
      const missed = Math.max(0, k.perWeek - k.week.ab) + Math.max(0, k.perWeek - k.week.ba), made = k.perWeek * 2 - missed;
      k.required += k.perWeek * 2; k.made += made; k.weeks++;
      k.monthReq = (k.monthReq || 0) + k.perWeek * 2; k.monthMade = (k.monthMade || 0) + made;
      k.week = { ab: 0, ba: 0 };
    }
  }

  function monthly(state) {
    maybeCharter(state);
    maybeRecord(state);
    maybeGovernment(state);
    maybeScheme(state); maybeScheme2(state);
    S().sovietMonthly(state);
    checkGoals(state);
    const now = nowHour(state);
    for (const k of state.contracts.slice()) {
      // The retainer is paid for a month in which at least four fifths of the minimum flights were made. A short month
      // is simply unpaid; three in a row end the award. An award not yet flown at all has three months' grace.
      const kept = !k.monthReq || k.monthMade / k.monthReq >= 0.8, unflown = k.made === 0 && now < k.startHour + 92 * 24;
      if (kept && k.monthReq) { S().addIncome(state, k.monthly, "mail"); k.paid += k.monthly; k.short = 0; }
      else if (!kept && !unflown) {
        k.short = (k.short || 0) + 1; k.unpaid = (k.unpaid || 0) + 1;
        if (k.short >= 3) {
          state.contracts = state.contracts.filter(x => x !== k);
          S().telegram(state, now, `mail award ${name(k.a)} to ${name(k.b)} ended stop the minimum service was not kept for three months stop`, true, { type: "contracts" });
          continue;
        }
        S().telegram(state, now, `mail award ${name(k.a)} to ${name(k.b)} stop ${k.monthMade || 0} of ${k.monthReq} flights made this month stop retainer of ${gbp(k.monthly)} not paid stop`, false, { type: "contracts" });
      }
      k.monthReq = 0; k.monthMade = 0;
      if (now >= k.endHour) {
        state.contracts = state.contracts.filter(x => x !== k);
        S().telegram(state, now, `mail award ${name(k.a)} to ${name(k.b)} completed stop reliability ${k.required ? Math.round(k.made / k.required * 100) : 100} percent stop`, false, { type: "contracts" });
      }
    }
    for (const g of state.grants.slice()) {
      if (!g.opened) { g.month = { ab: 0, ba: 0 }; continue; }
      const kept = g.opened > now - 30 * 24 || (g.month.ab >= E().grantMinPerMonth && g.month.ba >= E().grantMinPerMonth);
      if (!kept) {
        const left = Math.max(0, (g.endHour - now) / (g.endHour - g.opened));
        const repay = Math.round(g.upfront * left / 100) * 100;
        S().addGeneral(state, repay);
        state.grants = state.grants.filter(x => x !== g);
        S().telegram(state, now, `grant for ${name(g.a)} to ${name(g.b)} ended stop service not kept up stop ${gbp(repay)} repaid stop`, true, { type: "contracts" });
        continue;
      }
      S().addIncome(state, g.monthly, "grants"); g.received += g.monthly;
      g.month = { ab: 0, ba: 0 };
      if (now >= g.endHour) {
        state.grants = state.grants.filter(x => x !== g);
        S().telegram(state, now, `grant for ${name(g.a)} to ${name(g.b)} completed stop`, false, { type: "contracts" });
      }
    }
    // Standing monthly installment, if one is set, skipped when it would overdraw the account.
    if (state.installment && state.loan > 0) {
      const due = Math.min(state.installment, state.loan);
      if (state.money - due >= 0) { state.loan -= due; state.money -= due; }
      else S().telegram(state, now, `loan installment of ${gbp(due)} skipped stop not enough funds stop`, false, { type: "finances" });
      if (state.loan <= 0) { state.installment = 0; S().telegram(state, now, `bank loan repaid in full stop`, false, { type: "finances" }); }
    }
    // Company overheads: offices, clerks, ground staff, management. Each ship in service costs more to manage
    // the larger the fleet, so overheads grow with the square of the fleet: trivial for a few ships, heavy for many.
    const fleet = state.ships.filter(s => !s.lost && s.deliveryTick <= state.tick).length, over = Math.round(E().overheadPerShip * fleet * fleet);
    if (over) { S().addGeneral(state, over); state.year.overheads = (state.year.overheads || 0) + over; state.overheadsLast = over; }
    // Loan interest and bankruptcy.
    if (state.loan > 0) {
      const interest = Math.round(state.loan * E().loanRate / 12);
      S().addGeneral(state, interest);
      state.year.interest = (state.year.interest || 0) + interest;
    }
    if (state.money < 0 && loanLimit(state) - state.loan < E().loanStep) {
      state.bankruptStrikes++;
      if (state.bankruptStrikes >= E().bankruptMonths) {
        state.bankrupt = true;
        S().telegram(state, now, `company declared bankrupt stop creditors take control stop`, true, { type: "finances" });
      } else {
        S().telegram(state, now, `bankruptcy warning ${state.bankruptStrikes} of ${E().bankruptMonths - 1} stop funds overdrawn and no further credit stop`, true, { type: "finances" });
      }
    } else state.bankruptStrikes = 0;
  }

  // Loans ------------------------------------------------------------------------------
  function loanLimit(state) {
    const ships = state.ships.filter(s => s.deliveryTick <= state.tick).reduce((a, s) => a + S().saleValue(state, s), 0);
    return Math.floor((E().loanBase + ships * E().loanShipShare) / E().loanStep) * E().loanStep;
  }
  // Borrow any amount up to the remaining credit (a standard step if none is given). Returns what was lent.
  function borrow(state, amount) {
    const room = loanLimit(state) - state.loan;
    amount = Math.floor(Math.min(amount == null ? E().loanStep : amount, room));
    if (!(amount > 0)) return 0;
    state.loan += amount; state.money += amount;
    return amount;
  }
  // Repay any amount up to what is owed and what the account holds.
  function repay(state, amount) {
    amount = Math.floor(Math.min(amount, state.loan, state.money));
    if (!(amount > 0)) return 0;
    state.loan -= amount; state.money -= amount;
    return amount;
  }
  function setInstallment(state, amount) { state.installment = Math.max(0, Math.floor(amount || 0)); }

  // Construction grants ---------------------------------------------------------------------
  function buildGrantFor(state, classId, price) {
    const g = state.buildGrant;
    if (!g || U.SHIP_CLASSES[classId].kind === "surplus") return 0;
    return Math.round(price * g.share / 1000) * 1000;
  }
  function useBuildGrant(state, amount) {
    if (state.buildGrant && state.buildGrant.count > 1) state.buildGrant.count--; else state.buildGrant = null;
    state.year.grants = (state.year.grants || 0) + amount;
  }

  U.contracts = { randomMailOffer, weeklyService, eligible, settleRecord, recordShip, attemptFlown, attempt, init, dropContract, accept, decline, describe, loadMail, recordGrantFlight, daily, weekly, monthly,
    loanLimit, borrow, repay, setInstallment, buildGrantFor, useBuildGrant, mailMonthly };
})(window.UpShip);
