// Starts the game and runs the clock.
window.UpShip = window.UpShip || {};
(function (U) {
  let speed = 0, lastSpeed = 1, elapsed = 0, lastFrame = null;

  function boot() {
    U.state = U.sim.load() || U.sim.start();
    U.homeCity = U.state.company.home;
    U.progress = 0;
    U.map.init(document.getElementById("map"), { onSelect: sel => U.ui.select(sel) });
    U.ui.init({ setSpeed, togglePause, newGame });
    U.map.syncRoutes(U.state);
    frame(performance.now());
    window.addEventListener("beforeunload", () => U.sim.save(U.state));
    document.addEventListener("visibilitychange", () => { if (document.hidden) U.sim.save(U.state); });
  }

  function setSpeed(s) { if (s) lastSpeed = s; speed = s; if (!s) U.sim.save(U.state); }
  function togglePause() { setSpeed(speed ? 0 : lastSpeed); }

  function newGame() {
    if (!confirm("Start a new game? Your current game will be lost.")) return;
    U.sim.clearSave();
    location.reload();
  }

  function frame(now) {
    const dt = lastFrame == null ? 0 : Math.min(250, now - lastFrame);
    lastFrame = now;
    if (speed) {
      const per = U.TIME.msPerTick[speed];
      elapsed += dt;
      while (elapsed >= per) {
        elapsed -= per;
        const wasNewDay = (U.state.tick + 1) % 2 === 0;
        U.sim.advance(U.state);
        if (wasNewDay) { U.map.syncRoutes(U.state); U.sim.save(U.state); }
      }
      U.progress = elapsed / per;
    }
    U.map.drawShips(U.state, U.progress);
    U.ui.updateBar(U.state, speed, U.progress);
    U.ui.render();
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.UpShip);
