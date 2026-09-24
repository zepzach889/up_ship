// Starts the game and runs the turns.
window.UpShip = window.UpShip || {};
(function (U) {
  // A turn is half a day. Pressing Next turn plays it out over a few seconds;
  // auto-play starts the next turn as soon as one finishes. Turning auto-play
  // off freezes the turn where it is; Next turn resumes it.
  let auto = 0, lastAuto = 1, elapsed = 0, turnLength = 0, lastFrame = null, frozen = false;

  function boot() {
    U.state = U.sim.load();
    U.homeCity = U.state ? U.state.company.home : null;
    U.progress = 0;
    U.turnActive = false;
    U.map.init(document.getElementById("map"), { onSelect: sel => U.ui.select(sel) });
    U.ui.init({ nextTurn, setAuto, toggleAuto, newGame, changed });
    U.setup.init();
    if (U.state) begin();
    else U.setup.start(config => { U.state = U.sim.start(config); U.sim.save(U.state); begin(); });
    frame(performance.now());
    window.addEventListener("beforeunload", () => { if (U.state) U.sim.save(U.state); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && U.state) U.sim.save(U.state); });
  }

  function begin() {
    U.homeCity = U.state.company.home;
    U.map.setHome(U.homeCity);
    U.ui.showCompany(U.state);
    U.map.syncRoutes(U.state);
    U.ui.select(null);
    if (U.state.tick === 0 && !U.state.routes.length) {
      const ship = U.state.ships[0];
      U.ui.notify(`${U.state.company.name} is founded. Your first ship, ${ship.name}, waits at ${U.cityById[U.homeCity].name}. Open Routes to draw its first route.`);
    }
  }

  // Something the player did changed the game.
  function changed() {
    U.map.syncRoutes(U.state);
    U.sim.save(U.state);
  }

  function nextTurn() {
    if (!U.state || U.ui.isDrawing()) return;
    if (U.turnActive) { frozen = false; return; }
    U.turnActive = true; frozen = false; elapsed = 0; U.progress = 0;
    turnLength = U.TIME.msPerTurn[auto || 1];
  }
  function setAuto(s) {
    if (!U.state) return;
    if (s) lastAuto = s;
    auto = s;
    if (auto) nextTurn();
    else if (U.turnActive) frozen = true;
  }
  function toggleAuto() { setAuto(auto ? 0 : lastAuto); }

  function newGame() {
    if (!confirm("Start a new game? Your current game will be lost.")) return;
    U.sim.clearSave();
    location.reload();
  }

  function endTurn() {
    U.sim.advance(U.state);
    U.turnActive = false; U.progress = 0; elapsed = 0;
    U.map.syncRoutes(U.state);
    U.sim.save(U.state);
    while (U.state.notices.length) U.ui.notify(U.state.notices.shift());
    U.ui.rerenderIf(["ship", "route", "city", "fleet", "routes", "finances", "shipyard"]);
    if (auto && !U.ui.isDrawing()) nextTurn();
  }

  function frame(now) {
    const dt = lastFrame == null ? 0 : Math.min(250, now - lastFrame);
    lastFrame = now;
    if (U.state) {
      if (U.turnActive && !frozen) {
        elapsed += dt;
        U.progress = Math.min(1, elapsed / turnLength);
        if (elapsed >= turnLength) endTurn();
      }
      U.map.drawShips(U.state, U.progress);
    }
    U.ui.updateBar(U.state, auto, U.progress, frozen);
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.UpShip);
