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
    const monthly = Math.round(mailMonthly(km, perWeek) * (opts.generous || 1) / 10) * 10;
    const authority = opts.authority || U.NATIONS[state.company.nation].name;
    return { id: "o" + state.nextId++, kind: "mail", a, b, perWeek, years, monthly, authority,
      expiresHour: nowHour(state) + E().offerOpenDays * 24, warned: false, tutorial: !!opts.tutorial };
  }

  // The first offer: home city to a nearby larger city within the first ship's range.
  function firstOffer(state) {
    const home = U.cityById[state.company.home];
    const range = U.SHIP_CLASSES[state.ships[0].classId].rangeKm;
    const choices = U.CITIES.filter(c => c.id !== home.id && tierRank[c.tier] >= Math.max(tierRank[home.tier], 1))
      .map(c => ({ c, d: S().distanceKm(home, c) }))
      .filter(x => x.d >= 150 && x.d <= Math.min(range * 0.8, 800))
      .sort((x, y) => (y.c.country === home.country) - (x.c.country === home.country) || x.d - y.d);
    const target = (choices[0] || { c: U.CITIES.find(c => c.id !== home.id) }).c;
    const offer = mailOffer(state, home.id, target.id, { perWeek: 3, years: 2, generous: 1.6, tutorial: true });
    offer.expiresHour = nowHour(state) + 60 * 24;
    state.offers.push(offer);
    S().telegram(state, nowHour(state), `ministry of posts offers mail contract ${home.name} to ${target.name} stop ${gbp(offer.monthly)} monthly for two years stop see contracts stop`, false, { type: "contracts" });
  }

  function networkCities(state) { return new Set(state.routes.flatMap(r => r.stops).concat([state.company.home])); }

  function randomMailOffer(state) {
    const nation = state.company.nation, net = networkCities(state);
    // Authorities: home, plus any country the network already reaches.
    const reached = new Set([...net].map(nationOf).filter(Boolean));
    const foreign = [...net].map(id => U.cityById[id]).filter(c => nationOf(c.id) !== nation);
    const pairs = [];
    for (const a of U.CITIES) {
      const aHome = nationOf(a.id) === nation;
      const aForeignReached = !aHome && foreign.some(c => c.country === a.country);
      if (!aHome && !aForeignReached) continue;
      for (const b of U.CITIES) {
        if (b.id === a.id) continue;
        const km = S().distanceKm(a, b);
        if (km < 150 || km > 1100) continue;
        if (!aHome && !net.has(b.id)) continue;
        if (state.contracts.some(k => (k.a === a.id && k.b === b.id) || (k.a === b.id && k.b === a.id))) continue;
        const w = (U.TIERS[a.tier].demand * U.TIERS[b.tier].demand) * (net.has(a.id) || net.has(b.id) ? 2 : 1);
        const authority = aHome ? U.NATIONS[nation].name : a.country;
        if ((state.postBlocks || {})[authority] > nowHour(state)) continue;   // a postal service we walked out on
        pairs.push({ a: a.id, b: b.id, w, authority });
      }
    }
    if (!pairs.length) return null;
    let r = Math.random() * pairs.reduce((s, p) => s + p.w, 0);
    const chosen = pairs.find(p => (r -= p.w) <= 0) || pairs[0];
    return mailOffer(state, chosen.a, chosen.b, { authority: chosen.authority });
  }

  // Dropping a mail contract costs a month's pay, and that postal service offers nothing for about six months.
  function dropContract(state, id) {
    const k = state.contracts.find(x => x.id === id);
    if (!k) return 0;
    state.contracts = state.contracts.filter(x => x !== k);
    S().addGeneral(state, k.monthly);
    state.year.penalties = (state.year.penalties || 0) + k.monthly;
    state.postBlocks = state.postBlocks || {};
    state.postBlocks[k.authority] = nowHour(state) + 180 * 24;
    for (const sh of state.ships) sh.mailAboard = (sh.mailAboard || []).filter(m => m.to !== k.a && m.to !== k.b);
    return k.monthly;
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

  function describe(o) {
    if (o.kind === "mail") return `mail contract ${name(o.a)} to ${name(o.b)} stop ${o.perWeek === 7 ? "daily" : o.perWeek + " times weekly"} each way stop ${gbp(o.monthly)} monthly for ${o.years} year${o.years > 1 ? "s" : ""} stop`;
    if (o.kind === "route") return `government grant for new service ${name(o.a)} to ${name(o.b)} stop ${gbp(o.upfront)} on opening and ${gbp(o.monthly)} monthly for ${o.years} years stop`;
    return `government construction grant stop ${Math.round(o.share * 100)} percent of your next national-built ship stop`;
  }

  // Player choices ----------------------------------------------------------------------
  function accept(state, offerId) {
    const o = state.offers.find(x => x.id === offerId);
    if (!o) return null;
    state.offers = state.offers.filter(x => x !== o);
    const now = nowHour(state);
    if (o.kind === "mail") {
      const k = { id: "c" + state.nextId++, a: o.a, b: o.b, perWeek: o.perWeek, monthly: o.monthly, authority: o.authority,
        startHour: now, endHour: now + o.years * 365 * 24, week: { ab: 0, ba: 0 }, made: 0, required: 0, weeks: 0, penalties: 0, paid: 0, tutorial: o.tutorial };
      state.contracts.push(k);
      return k;
    }
    if (o.kind === "route") {
      const g = { id: "g" + state.nextId++, a: o.a, b: o.b, upfront: o.upfront, monthly: o.monthly, years: o.years,
        acceptedHour: now, openBy: now + E().grantOpenMonths * 30 * 24, opened: null, endHour: null, month: { ab: 0, ba: 0 }, received: 0 };
      state.grants.push(g);
      return g;
    }
    state.buildGrant = { share: o.share, until: now + E().buildGrantMonths * 30 * 24 };
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
      if ((ship.mailAboard.length + 1) * E().mailTons > hold) break;
      m.k.week[m.dir]++;
      ship.mailAboard.push({ to: m.to });
    }
    return ship.mailAboard.length * E().mailTons;
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

  function weekly(state) {
    const now = nowHour(state);
    for (const k of state.contracts.slice()) {
      if (k.startHour > now - 7 * 24 + 1) { k.week = { ab: 0, ba: 0 }; continue; }  // no charge for a partial first week
      const missed = Math.max(0, k.perWeek - k.week.ab) + Math.max(0, k.perWeek - k.week.ba);
      k.required += k.perWeek * 2; k.made += k.perWeek * 2 - missed; k.weeks++;
      U.passengers.recordMail(state, k.perWeek * 2, missed);
      if (missed) {
        const fine = Math.round(k.monthly / (k.perWeek * 2 * 4.3) * E().missedFlightPenalty * missed);
        S().addGeneral(state, fine); k.penalties += fine;
        S().telegram(state, now, `mail ${name(k.a)} to ${name(k.b)} stop ${missed} required flight${missed > 1 ? "s" : ""} missed this week stop penalty ${gbp(fine)} stop`, false, { type: "contracts" });
      }
      k.week = { ab: 0, ba: 0 };
      if (k.weeks >= E().contractGraceWeeks && k.made / k.required < E().minReliability) {
        state.contracts = state.contracts.filter(x => x !== k);
        S().telegram(state, now, `mail contract ${name(k.a)} to ${name(k.b)} cancelled stop reliability ${Math.round(k.made / k.required * 100)} percent stop`, true, { type: "contracts" });
      }
    }
  }

  function monthly(state) {
    const now = nowHour(state);
    for (const k of state.contracts.slice()) {
      S().addIncome(state, k.monthly, "mail"); k.paid += k.monthly;
      if (now >= k.endHour) {
        state.contracts = state.contracts.filter(x => x !== k);
        S().telegram(state, now, `mail contract ${name(k.a)} to ${name(k.b)} completed stop reliability ${k.required ? Math.round(k.made / k.required * 100) : 100} percent stop`, false, { type: "contracts" });
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
  function borrow(state) {
    if (state.loan + E().loanStep > loanLimit(state)) return false;
    state.loan += E().loanStep; state.money += E().loanStep;
    return true;
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
    state.buildGrant = null;
    state.year.grants = (state.year.grants || 0) + amount;
  }

  U.contracts = { init, dropContract, accept, decline, describe, loadMail, recordGrantFlight, daily, weekly, monthly,
    loanLimit, borrow, repay, setInstallment, buildGrantFor, useBuildGrant, mailMonthly };
})(window.UpShip);
