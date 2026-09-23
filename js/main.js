// Starts the game and runs the clock.
window.UpShip = window.UpShip || {};
(function (U) {
  // A turn is half a day. Pressing Next turn plays it out over a couple of seconds;
  // auto-play starts the next turn as soon as one finishes.
  let auto = 0, lastAuto = 1, elapsed = 0, turnLength = 0, lastFrame = null;

  function boot() {
    U.state = U.sim.load() || U.sim.start();
    U.homeCity = U.state.company.home;
    U.progress = 0;
    U.map.init(document.getElementById("map"), { onSelect: sel => U.ui.select(sel) });
    U.turnActive = false;
    U.ui.init({ nextTurn, setAuto, toggleAuto, newGame });
    U.map.syncRoutes(U.state);
    frame(performance.now());
    window.addEventListener("beforeunload", () => U.sim.save(U.state));
    document.addEventListener("visibilitychange", () => { if (document.hidden) U.sim.save(U.state); });
  }

  function nextTurn() {
    if (U.turnActive) return;
    U.turnActive = true; elapsed = 0; U.progress = 0;
    turnLength = U.TIME.msPerTurn[auto || 1];
  }
  function setAuto(s) {
    if (s) lastAuto = s;
    auto = s;
    if (auto) nextTurn();
  }
  function toggleAuto() { setAuto(auto ? 0 : lastAuto); }

  function newGame() {
    if (!confirm("Start a new game? Your current game will be lost.")) return;
    U.sim.clearSave();
    location.reload();
  }

  function frame(now) {
    const dt = lastFrame == null ? 0 : Math.min(250, now - lastFrame);
    lastFrame = now;
    if (U.turnActive) {
      const per = turnLength;
      elapsed += dt;
      U.progress = Math.min(1, elapsed / per);
      if (elapsed >= per) {
        const newDay = (U.state.tick + 1) % 2 === 0;
        U.sim.advance(U.state);
        U.turnActive = false; U.progress = 0; elapsed = 0;
        if (newDay) U.map.syncRoutes(U.state);
        U.sim.save(U.state);
        if (auto) nextTurn();
      }
    }
    U.map.drawShips(U.state, U.progress);
    U.ui.updateBar(U.state, auto, U.progress);
    U.ui.render();
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.UpShip);
