// Captains and crews: named captains with traits and experience; a company pool of hands; training schools.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");

  // Every trait is a trade-off: there is no best captain, only the right one for a ship and route.
  const TRAITS = {
    weatherwise: { name: "Weatherwise", good: "Spots storms early and flies weather safely", bad: "Diverts or waits even under a bold policy", seesEarly: true, forceCautious: true, weatherRisk: 0.6 },
    careful: { name: "Careful", good: "Fewer accidents, less wear", bad: "Waits out doubtful weather; slower turnarounds", risk: 0.75, wear: 0.9, turnaround: 1, forceCautious: true },
    harddriving: { name: "Hard-driving", good: "Faster, with quicker turnarounds", bad: "More wear and more risk", speed: 1.06, turnaround: -1, wear: 1.15, risk: 1.25 },
    showman: { name: "Showman", good: "Passengers love the voyage: comfort up", bad: "Extravagant: higher running costs", comfort: 10, cost: 1.12 },
    navigator: { name: "Navigator", good: "Less fuel; gas lasts longer", bad: "Efficient courses run a little slower", fuel: 0.88, gas: 0.8, slow: 1.05 },
    punctual: { name: "Punctual", good: "Leaves on schedule; mail kept", bad: "Emptier holds; flies in weather to keep time", punctual: true, weatherRisk: 1.3 },
    reckless: { name: "Reckless", good: "Never waits, always fastest", bad: "Serious risk in bad weather", speed: 1.04, forceBold: true, weatherRisk: 1.8 },
    brusque: { name: "Brusque", good: "A lean ship: lower crew costs", bad: "Passengers find it cold: comfort down", comfort: -8, cost: 0.9 }
  };
  const GRADES = [
    { name: "Novice", hours: 0, wage: 40, risk: 1.2 },
    { name: "Seasoned", hours: 10000, wage: 60, risk: 1 },
    { name: "Veteran", hours: 30000, wage: 85, risk: 0.85 },
    { name: "Master", hours: 70000, wage: 120, risk: 0.7 }
  ];
  const BACKGROUNDS = {
    naval: { name: "Ex-naval airshipman", hours: [14000, 45000], traits: ["weatherwise", "careful", "harddriving", "navigator", "brusque", "reckless"], weight: 0.18 },
    merchant: { name: "Merchant marine officer", hours: [4000, 18000], traits: ["punctual", "showman", "careful", "navigator", "brusque"], weight: 0.35 },
    army: { name: "Army balloonist", hours: [1500, 11000], traits: ["weatherwise", "harddriving", "reckless", "navigator", "brusque"], weight: 0.3 },
    promoted: { name: "Promoted from the company's own officers", hours: [3000, 8000], traits: Object.keys(TRAITS), weight: 0 }
  };
  const NAMES = {
    britain: { m: ["Arthur", "Herbert", "Walter", "Reginald", "George", "Harold", "Frederick", "Cecil", "Edward", "Albert"], f: ["Edith", "Margaret", "Winifred", "Dorothy", "Violet", "Hilda"],
      s: ["Scott", "Maitland", "Irwin", "Atherstone", "Booth", "Hinchliffe", "Pritchard", "Cave-Browne", "Wann", "Elmhirst", "Colmore", "Johnston"] },
    germany: { m: ["Ernst", "Hans", "Max", "Ludwig", "Heinrich", "Albert", "Anton", "Kurt", "Walter", "Friedrich"], f: ["Hanna", "Elly", "Liesel", "Marga", "Thea", "Grete"],
      s: ["Lehmann", "Pruss", "Wittemann", "Flemming", "von Schiller", "Sammt", "Bauer", "Heinen", "Strasser", "Dörr", "Mathy", "Kolle"] },
    france: { m: ["Jean", "Louis", "Henri", "Pierre", "Marcel", "Émile", "André", "Paul", "Georges", "Maurice"], f: ["Marie", "Adrienne", "Hélène", "Jeanne", "Marthe", "Suzanne"],
      s: ["du Plessis", "Joux", "Tixier", "Lefèvre", "Mercier", "Bonnet", "Girard", "Rousseau", "Lambert", "Fournier", "Caussin", "Delorme"] },
    italy: { m: ["Umberto", "Giuseppe", "Carlo", "Alfredo", "Luigi", "Mario", "Vittorio", "Enrico", "Arturo", "Filippo"], f: ["Maria", "Rosa", "Giulia", "Teresa", "Elena", "Anna"],
      s: ["Nobile", "Crocco", "Ricaldoni", "Usuelli", "Forlanini", "Pastine", "Valle", "Rossi", "Ferrari", "Bianchi", "Mariano", "Zappi"] }
  };
  const HAND_WAGE = 8, HAND_FEE = 5, TRAIN_COST = 15;
  const STAFFING = { full: { name: "Full", share: 1, incidents: 1, wear: 1, comfort: 0 }, reduced: { name: "Reduced", share: 0.75, incidents: 1.2, wear: 1.1, comfort: -5 },
    skeleton: { name: "Skeleton", share: 0.5, incidents: 1.5, wear: 1.25, comfort: -15 } };
  const SCHOOL_OUTPUT = [0, 3, 6, 10];

  const now = state => S().H(state.tick);
  const year = state => S().dateAtHour(now(state)).getUTCFullYear();
  const grade = c => { let g = GRADES[0]; for (const x of GRADES) if (c.hours >= x.hours) g = x; return g; };
  const wage = c => grade(c).wage * (c.blamed ? 0.8 : 1);

  function makeCaptain(state, bgKey) {
    const bg = BACKGROUNDS[bgKey], nation = state.company.nation, N = NAMES[nation] || NAMES.britain;
    const womanChance = Math.min(0.15, 0.03 + (year(state) - 1919) * 0.008);
    const female = Math.random() < womanChance;
    const t1 = pick(bg.traits); let t2 = Math.random() < 0.55 ? pick(bg.traits) : null; if (t2 === t1) t2 = null;
    return { id: "c" + state.nextId++, name: `${pick(female ? N.f : N.m)} ${pick(N.s)}`, female, background: bgKey, traits: t2 ? [t1, t2] : [t1],
      hours: Math.round(rand(...bg.hours)), shipId: null, blamed: 0, cleared: 0, joined: now(state), serviceYears: Math.round(rand(20, 28)) };
  }
  function candidate(state) {
    const r = Math.random(); let acc = 0;
    for (const [k, b] of Object.entries(BACKGROUNDS)) { acc += b.weight; if (r < acc) return makeCaptain(state, k); }
    return makeCaptain(state, "merchant");
  }

  function init(state) {
    const first = makeCaptain(state, "merchant"); first.hours = 11000;
    state.captains = [first];
    state.board = [candidate(state), candidate(state), candidate(state)];
    state.crew = { hands: 0, skill: 0.6, warned: -1 };
    const ship = state.ships[0];
    if (ship) { first.shipId = ship.id; ship.captainId = first.id; state.crew.hands = U.SHIP_CLASSES[ship.classId].crew + 2; }
  }
  const captainOf = (state, ship) => ship && ship.captainId ? state.captains.find(c => c.id === ship.captainId) : null;

  // What a ship's captain and crew change. Multipliers default to 1.
  function mods(state, ship) {
    const c = captainOf(state, ship), m = { speed: 1, turnaround: 0, fuel: 1, gas: 1, slow: 1, comfort: 0, cost: 1, risk: 1, weatherRisk: 1, wear: 1, incidents: 1,
      seesEarly: false, forceCautious: false, forceBold: false, punctual: false };
    if (c) {
      for (const t of c.traits) {
        const T = TRAITS[t];
        for (const k of ["speed", "fuel", "gas", "slow", "cost", "risk", "weatherRisk", "wear"]) if (T[k] != null) m[k] *= T[k];
        if (T.turnaround) m.turnaround += T.turnaround;
        if (T.comfort) m.comfort += T.comfort;
        for (const k of ["seesEarly", "forceCautious", "forceBold", "punctual"]) if (T[k]) m[k] = true;
      }
      m.risk *= grade(c).risk;
      if (c.blamed) m.comfort -= 5;
      if (m.forceBold && m.forceCautious) m.forceBold = false;       // a careful streak wins out
    }
    const st = STAFFING[effectiveStaffing(state, ship)];
    m.incidents *= st.incidents * (1.3 - 0.5 * state.crew.skill);
    m.wear *= st.wear; m.comfort += st.comfort;
    return m;
  }
  // Hands each ship needs, and whether the pool can supply them.
  const needFor = (state, ship) => Math.round(U.SHIP_CLASSES[ship.classId].crew * STAFFING[ship.staffing || "full"].share);
  function needed(state) { return state.ships.filter(s => s.deliveryTick <= state.tick).reduce((a, s) => a + needFor(state, s), 0); }
  function effectiveStaffing(state, ship) {
    const want = ship.staffing || "full", need = needed(state);
    if (!need || state.crew.hands >= need) return want;
    const ratio = state.crew.hands / need;                            // short-handed: everyone drops a level
    if (want === "full") return ratio > 0.6 ? "reduced" : "skeleton";
    return ratio > 0.8 ? want : "skeleton";                         // already reduced: only drops when badly short
  }

  // Once a ship flies: the captain gains experience, and so, slowly, does the pool.
  function flew(state, ship, hours) {
    const c = captainOf(state, ship); if (c) c.hours += hours;
    state.crew.skill = Math.min(0.9, state.crew.skill + hours * 0.00002);
  }

  // Monthly: wages, the school's graduates, the hiring board, retirements, and short-handed warnings.
  function monthly(state) {
    const t = now(state);
    const wages = state.captains.reduce((a, c) => a + wage(c), 0) + state.crew.hands * HAND_WAGE;
    S().addGeneral(state, wages); state.year.wages = (state.year.wages || 0) + wages;
    // Training schools turn out trained hands, and now and then an officer ready for command.
    let grads = 0, officer = false;
    for (const id in state.facilities) { const lvl = (state.facilities[id] || {}).school || 0; if (!lvl) continue;
      grads += SCHOOL_OUTPUT[lvl]; if (Math.random() < lvl * 0.15) officer = true; }
    if (grads) {
      const before = state.crew.hands; state.crew.hands += grads;
      state.crew.skill = (state.crew.skill * before + 0.6 * grads) / state.crew.hands;
      S().addGeneral(state, grads * TRAIN_COST);
    }
    state.board = state.board.filter(() => Math.random() < 0.4);                         // most candidates find other posts
    while (state.board.length < 3) state.board.push(candidate(state));
    if (officer) state.board.push(makeCaptain(state, "promoted"));
    // Retirements.
    for (const c of state.captains.slice()) {
      if ((t - c.joined) / (24 * 365) < c.serviceYears) continue;
      retire(state, c, `captain ${c.name} retires after ${Math.round((t - c.joined) / (24 * 365))} years with the company stop`);
    }
    const need = needed(state);
    if (need > state.crew.hands) S().telegram(state, t, `crews short-handed stop ${state.crew.hands} hands for ${need} berths stop ships flying reduced stop hire hands or build a training school stop`, false, { type: "crew" });
  }
  function retire(state, c, text) {
    const ship = state.ships.find(s => s.id === c.shipId);
    if (ship) ship.captainId = null;
    state.captains = state.captains.filter(x => x !== c);
    if (text) S().telegram(state, now(state), text + (ship ? `${ship.name} needs a new captain stop` : ""), false, { type: "crew" });
  }

  // After a serious accident: the captain's fate and the inquiry.
  function afterAccident(state, ship, kind, bold, t) {
    const c = captainOf(state, ship); if (!c) return "";
    if (kind === "disaster" && Math.random() < 0.5) { retire(state, c, null); return ` stop captain ${c.name} among those lost`; }
    let blameChance = 0.2;
    if (bold) blameChance += 0.35;
    if (ship.condition < 0.35) blameChance += 0.3;
    if (c.traits.includes("reckless")) blameChance += 0.2;
    if (Math.random() < Math.min(0.9, blameChance)) {
      c.blamed++;
      if (Math.random() < 0.25) { retire(state, c, null); return ` stop inquiry blames captain ${c.name} who resigns`; }
      return ` stop inquiry blames captain ${c.name} stop keep or dismiss in the crew panel`;
    }
    c.cleared++;
    if (kind !== "damage" && !c.traits.includes("careful") && c.traits.length < 2) c.traits.push("careful");   // shaken, and more careful since
    return ` stop inquiry clears captain ${c.name}`;
  }

  // Actions from the crew panel.
  function hire(state, id) {
    const c = state.board.find(x => x.id === id); if (!c) return false;
    const fee = wage(c) * 2; if (state.money < fee) return false;
    state.money -= fee; state.board = state.board.filter(x => x !== c); state.captains.push(c); c.joined = now(state);
    const idle = state.ships.find(s => !s.captainId && s.deliveryTick <= state.tick);
    if (idle) assign(state, c.id, idle.id);
    return true;
  }
  function assign(state, captainId, shipId) {
    const c = state.captains.find(x => x.id === captainId), ship = state.ships.find(s => s.id === shipId);
    if (!c || !ship) return;
    const prev = state.ships.find(s => s.captainId === c.id); if (prev) prev.captainId = null;
    const old = captainOf(state, ship); if (old) old.shipId = null;
    ship.captainId = c.id; c.shipId = ship.id;
  }
  function dismiss(state, id) { const c = state.captains.find(x => x.id === id); if (c) retire(state, c, null); }
  function hireHands(state, n) { const fee = n * HAND_FEE; if (state.money < fee) return; state.money -= fee;
    const before = state.crew.hands; state.crew.hands += n; state.crew.skill = (state.crew.skill * before + 0.3 * n) / state.crew.hands; }
  function releaseHands(state, n) { state.crew.hands = Math.max(0, state.crew.hands - n); }
  const skillWord = s => s < 0.45 ? "Green" : s < 0.75 ? "Trained" : "Seasoned";

  U.crew = { TRAITS, GRADES, BACKGROUNDS, STAFFING, SCHOOL_OUTPUT, HAND_WAGE, HAND_FEE, init, captainOf, mods, needFor, needed, effectiveStaffing, flew, monthly,
    afterAccident, hire, assign, dismiss, hireHands, releaseHands, grade, wage, skillWord };
})(window.UpShip);
