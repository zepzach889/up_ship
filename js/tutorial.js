// The first-contract tutorial. While it runs, the rest of the game unlocks step by step.
window.UpShip = window.UpShip || {};
(function (U) {
  const $ = sel => document.querySelector(sel);
  const name = id => U.cityById[id].name;

  // What each step allows. Dock buttons and turn controls outside these are locked.
  const STEPS = {
    1: { dock: ["contracts", "telegrams"], turns: false, target: '[data-open="contracts"]' },
    2: { dock: ["contracts", "routes", "telegrams"], turns: false, target: '[data-open="routes"]' },
    3: { dock: ["contracts", "routes", "fleet", "telegrams"], turns: false, target: null },
    4: { dock: ["contracts", "routes", "fleet", "telegrams"], turns: true, target: "#next-turn" },
    5: { dock: ["contracts", "routes", "fleet", "finances", "telegrams"], turns: true, target: '[data-open="finances"]' },
    6: { dock: ["contracts", "routes", "fleet", "finances", "research", "telegrams"], turns: true, target: '[data-open="research"]' },
    7: { dock: ["contracts", "routes", "fleet", "finances", "research", "telegrams"], turns: true, target: null },
    8: { dock: null, turns: true, target: null }
  };

  const tut = () => U.state && U.state.tutorial;
  const facilityCount = () => Object.values(U.state.facilities || {}).reduce((a, f) => a + f.mast + f.terminal + f.shed, 0);
  const contract = () => U.state.contracts.find(k => k.tutorial) || U.state.offers.find(o => o.tutorial);
  const pairRoute = () => { const k = contract(); return k && U.state.routes.find(r => r.stops.includes(k.a) && r.stops.includes(k.b)); };
  // While the tutorial asks for its route, only the contract's two cities can be chosen.
  function draftCities() { const t = tut(), k = t && t.step === 2 && contract(); return k ? [k.a, k.b] : null; }

  function text(step) {
    const k = contract(), ship = U.state.ships[0];
    const a = k ? name(k.a) : "", b = k ? name(k.b) : "";
    return {
      1: `Your government has offered ${U.state.company.name} its first mail contract, ${a} to ${b}. Open <b>Contracts</b> and accept it.`,
      2: `Now fly it. Open <b>Routes</b>, choose <b>Draw a new route</b>, click ${a} and then ${b} on the map, and press <b>Create route</b>. (The contract's <b>Draw this route</b> button does the first part for you.)`,
      3: `Put ${ship ? ship.name : "your ship"} on the new route: in the route's panel, choose <b>Add a ship</b> and pick it.`,
      4: `Press <b>Next turn</b> to play half a day, and keep going until ${ship ? ship.name : "your ship"} has flown the route. Auto-play works too.`,
      5: `The route's results appear after its first full day: click the route line to see them. Then open <b>Finances</b> for the company's money.`,
      6: `Research makes ships faster, bigger, and cheaper to run, and unlocks new classes. Open <b>Research</b> and start a project. <b>Normal</b> funding is a good default.`,
      7: `Cities need masts, terminals, and sheds. Larger cities have public ones you pay to use; your own avoid the fees and add room. Click ${b || "a city on your route"} on the map and build or enlarge something under <b>Facilities</b>.`,
      8: `That's the basics. Everything is unlocked now: order ships from the <b>Shipyard</b>, draw more routes, and watch for new offers by telegram.`
    }[step];
  }

  function allowsDock(kind) { const t = tut(); if (!t) return true; const d = STEPS[t.step].dock; return !d || d.includes(kind); }
  function allowsTurns() { const t = tut(); return !t || STEPS[t.step].turns; }

  // Move on when the player has done what the step asks, whatever order they did it in.
  function check(selection) {
    const t = tut();
    if (!t) return;
    const k = contract();
    const accepted = U.state.contracts.some(c => c.tutorial);
    const route = pairRoute();
    const ship = U.state.ships[0];
    if (t.step === 1 && accepted) t.step = 2;
    if (t.step === 2 && route) t.step = 3;
    if (t.step === 3 && route && U.state.ships.some(s => s.routeId === route.id)) t.step = 4;
    if (t.step === 4 && U.state.totals.flights >= 1 && U.state.history.some(d => route && d.byRoute[route.id])) t.step = 5;
    if (t.step === 5 && selection && selection.type === "finances") t.step = 6;
    if (t.step === 6 && (U.state.research.current || Object.keys(U.state.research.done).length)) { t.step = 7; t.facBase = facilityCount(); }
    if (t.step === 7 && facilityCount() > (t.facBase || 0)) t.step = 8;
    if (!k && t.step < 3) { U.state.tutorial = null; }
    render();
  }

  function render() {
    const box = $("#tutorial"), t = tut();
    document.querySelectorAll(".tut-target").forEach(e => e.classList.remove("tut-target"));
    document.querySelectorAll("[data-open]").forEach(b => { const ok = allowsDock(b.dataset.open); b.disabled = !ok; b.classList.toggle("is-locked", !ok); });
    if (!t) { box.hidden = true; return; }
    box.hidden = false;
    $("#tutorial-text").innerHTML = text(t.step);
    $("#tutorial-step").textContent = t.step < 8 ? `Getting started, ${t.step} of 7` : "Getting started";
    $("#tutorial-finish").hidden = t.step !== 8;
    $("#tutorial-skip").hidden = t.step === 8;
    const target = STEPS[t.step].target && $(STEPS[t.step].target);
    if (target) target.classList.add("tut-target");
  }

  function finish() { if (U.state) U.state.tutorial = null; U.sim.save(U.state); render(); }

  function init() {
    $("#tutorial-skip").addEventListener("click", finish);
    $("#tutorial-finish").addEventListener("click", finish);
  }

  U.tutorial = { init, check, render, allowsDock, allowsTurns, draftCities };
})(window.UpShip);
