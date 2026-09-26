// Aetherium: the game's one deliberate wonder. Discovered by research, expensive at first but quickly
// cheaper with refining research; supplied only by refineries, whose capacity limits how many ships can use it.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;
  const CAPACITY = [0, 4, 10, 25];                   // ships each refinery size can supply
  const BASE_PER_KM = 0.0135;                          // three times helium's top-up rate
  const FILL_SHARE = 0.45;                             // of a ship's price, to fill it the first time
  const now = state => S().H(state.tick);
  const A = state => state.aether = state.aether || { discovered: null, priceMult: 1, capMult: 1, publicOpen: null };

  function researched(state, id) {
    const a = A(state);
    if (id === "gas7") {
      a.discovered = now(state);
      S().telegram(state, a.discovered, "aetherium isolated stop a gas that lifts a fifth more than hydrogen and cannot burn stop costly and made only at refineries stop decide how to use it", true, { type: "aetherdecision" });
    }
    if (id === "gas8") { a.priceMult *= 0.45; a.capMult *= 1.5; S().telegram(state, now(state), "aetherium refining perfected stop price falls by more than half stop refineries supply half again as many ships stop", false, { type: "research" }); }
    if (id === "refine-gas") { a.priceMult *= 0.7; a.capMult *= 1.25; }
  }
  const discovered = state => A(state).discovered != null;
  // Each country's government opens an Aetherium works at its capital about a year after the discovery.
  function capital(state) { return (U.CITIES.find(c => c.country === U.NATIONS[state.company.nation].name && c.specialty === "capital") || U.cityById[state.company.home]).id; }
  function monthly(state) {
    const a = A(state);
    if (a.discovered != null && a.publicOpen == null && now(state) - a.discovered >= 365 * 24) {
      a.publicOpen = now(state);
      S().telegram(state, a.publicOpen, `government aetherium works opens at ${U.cityById[capital(state)].name} stop open to all companies for a fee stop`, false, { type: "city", id: capital(state) });
    }
  }
  // How many Aetherium ships the company's own refineries can supply.
  function capacity(state) {
    let n = 0;
    for (const id in state.facilities) n += CAPACITY[(state.facilities[id] || {}).refinery || 0];
    return Math.floor(n * A(state).capMult);
  }
  // Ships beyond capacity are the newest ones: the oldest customers are served first.
  function supplied(state, ship) {
    const list = state.ships.filter(s => s.gas === "aetherium").sort((x, y) => x.id.localeCompare(y.id, undefined, { numeric: true }));
    return list.indexOf(ship) < capacity(state);
  }
  function canTopUp(state, cityId, ship) {
    if (!discovered(state)) return false;
    const own = ((state.facilities[cityId] || {}).refinery || 0) > 0 && (!ship || supplied(state, ship));
    const pub = A(state).publicOpen != null && cityId === capital(state);
    return own || !!pub;
  }
  // Top-up price per km, scaled like other gases by the ship's size; the public works charges half again.
  function perKm(state, cityId) {
    const own = ((state.facilities[cityId] || {}).refinery || 0) > 0;
    return BASE_PER_KM * A(state).priceMult * (own ? 1 : 1.5);
  }
  const fill = (state, classId) => Math.round(U.SHIP_CLASSES[classId].price * FILL_SHARE * A(state).priceMult / 1000) * 1000;

  U.aether = { CAPACITY, researched, discovered, monthly, capacity, supplied, canTopUp, perKm, fill, capital };
})(window.UpShip);
