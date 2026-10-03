// Designed ship classes: a design becomes a class when its first ship is ordered. The class keeps a snapshot
// of the design and its figures, so its ships fly the same however the design is later copied or deleted.
// Classes live in the save (state.designClasses) and are re-registered, with their drawings, when a game loads.
window.UpShip = window.UpShip || {};
(function (U) {
  const P = () => U.physics;
  const K = 0.6;                                        // drawing units per metre, to match the hand-drawn ships
  const FUEL_COST = 60;                                 // pounds per tonne of fuel, in the game's running-cost terms (calibrated to the builders' ships)
  const artKey = (id, rev) => `design-${id}-r${rev}`;

  // Figures from the physics, turned into a class. Research built into the figures is recorded as "baked",
  // so only research beyond it (a later build, or a refit) adds its bonus.
  function makeClass(state, entry) {
    const d = JSON.parse(JSON.stringify(entry.d)), f = P().figures(state, d);
    const id = "d" + entry.id, year = U.sim.dateOf(state.tick).getFullYear();
    // A design too heavy to carry a full load flies with what it can lift.
    const lift = f.demand > 0 ? Math.max(0, Math.min(1, f.payloadRoom / f.demand)) : 1;
    const berths = Math.floor(f.passengers * lift), first = f.planned ? f.firstBerths : 0, seats = Math.floor((f.daySeats || 0) * lift);
    const c = {
      id, name: entry.name, role: "Own design", basis: `Designed by your Drawing Office, ${year}`,
      kind: berths ? "passenger" : "cargo", designed: true, designId: entry.id,
      passengers: berths, cargoTons: Math.round(f.cargoCap * lift * 10) / 10,
      speedKmh: Math.round(f.speed), rangeKm: Math.round(f.range / 100) * 100, crew: f.crew,
      price: f.price, dailyCost: f.daily, fuelPerKm: Math.round(f.fuelPerKm * FUEL_COST * 1000) / 1000, buildDays: f.buildDays,
      shedSize: f.shed ? f.shed.n : 3, liner: f.L > 200, gas: d.gas || "hydrogen",
      firstShare: berths && f.passengers ? first / f.passengers : 0, seats, fuelCal: FUEL_COST, comfort: f.planned && f.comfort != null ? f.comfort : 55,
      baked: U.research.builtWith(state), names: [entry.name], requires: [],
      design: d, rev: 1, revs: { 1: JSON.parse(JSON.stringify(d.livery)) }, art: artKey(id, 1)
    };
    return c;
  }
  // The first order of a design: make and register its class, and lock the design.
  function ensure(state, entry) {
    state.designClasses = state.designClasses || {};
    if (entry.classId && state.designClasses[entry.classId]) return state.designClasses[entry.classId];
    const c = makeClass(state, entry);
    state.designClasses[c.id] = c;
    entry.classId = c.id; entry.locked = true;
    register(c);
    return c;
  }
  function register(c) {
    U.SHIP_CLASSES[c.id] = c;
    for (const rev of Object.keys(c.revs)) drawings(c, +rev);
  }
  // A livery change on a locked design becomes a new revision; ships take it at their next overhaul.
  function syncLivery(state) {
    for (const e of state.designs || []) {
      const c = e.classId && state.designClasses && state.designClasses[e.classId];
      if (!c) continue;
      if (JSON.stringify(e.d.livery) === JSON.stringify(c.revs[c.rev])) continue;
      c.rev += 1; c.revs[c.rev] = JSON.parse(JSON.stringify(e.d.livery)); c.art = artKey(c.id, c.rev);
      drawings(c, c.rev);
    }
  }
  function restore(state) {
    for (const c of Object.values(state.designClasses || {})) {
      // Classes made before the fuel figure was recalibrated burn as they should from now on.
      if (!c.fuelCal) { c.fuelPerKm = Math.round(c.fuelPerKm * FUEL_COST / 110 * 1000) / 1000; c.fuelCal = FUEL_COST; }
      if (c.seats == null) c.seats = 0;
      register(c);
    }
  }

  // Generated drawings: a side view and a top view in the livery, bow toward +x like the hand-drawn ships.
  function drawings(c, rev) {
    const key = artKey(c.id, rev), defs = document.querySelector("#map svg defs");
    if (!defs || document.getElementById("art-" + key)) return;
    const d = { ...c.design, livery: c.revs[rev] }, hl = P().hullLengths(d), f = { ...hl };
    const X = x => (hl.L / 2 - x) * K, Y = y => y * K;
    // Mirroring the length puts the bow at +x; the side view is then the ship's starboard side, as the map shows it.
    const side = U.livery.side(d, f, X, Y), top = U.livery.top(d, f, X, Y);
    defs.insertAdjacentHTML("beforeend", `<g id="art-${key}" class="art-designed">${side}</g><g id="art-top-${key}" class="art-designed">${top}</g>`);
    const hw = hl.L * K / 2, hh = d.D * K / 2;
    U.shipArt.SHADOW[key] = [hw, hh * 1.05];
    U.shipArt.VIEW[key] = `${(-hw - 6).toFixed(1)} ${(-hh * 1.9).toFixed(1)} ${(hw * 2 + 12).toFixed(1)} ${(hh * 3.9).toFixed(1)}`;
  }

  // The builders' classes are designs too: their figures come from the lineup the physics produced.
  function applyLineup() {
    for (const [id, L] of Object.entries(U.LINEUP || {})) {
      const c = U.SHIP_CLASSES[id]; if (!c) continue;
      Object.assign(c, { passengers: L.passengers, seats: L.seats, firstShare: L.firstShare, comfort: L.comfort, cargoTons: L.cargoTons,
        speedKmh: L.speedKmh, rangeKm: L.rangeKm, crew: L.crew, price: L.price, dailyCost: L.dailyCost, fuelPerKm: L.fuelPerKm,
        buildDays: L.buildDays, shedSize: L.shedSize, baked: L.baked, design: L.design, fromDesign: true });
      if (c.kind !== "surplus") c.kind = L.passengers ? "passenger" : "cargo";
    }
  }
  applyLineup();
  U.designClass = { ensure, restore, syncLivery, artKey, applyLineup };
})(window.UpShip);
