// Starts the game and runs the turns.
window.UpShip = window.UpShip || {};
(function (U) {
  // A turn is half a day. Pressing Next turn plays it out over a few seconds;
  // auto-play starts the next turn as soon as one finishes. Turning auto-play
  // off freezes the turn where it is; Next turn resumes it.
  // Major telegrams stop auto-play. Minor ones slow it to normal speed until dismissed.
  let auto = 0, lastAuto = 1, elapsed = 0, turnLength = 0, lastFrame = null, frozen = false, slowedFrom = 0;

  function boot() {
    U.state = U.sim.load();
    U.progress = 0;
    U.turnActive = false;
    U.map.init(document.getElementById("map"), { onSelect: sel => U.ui.select(sel) });
    U.ui.init({ nextTurn, setAuto, toggleAuto, newGame, changed });
    U.ui.onTelegramClosed(telegramClosed);
    U.setup.init();
    U.tutorial.init();
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
    U.tutorial.render();
    deliverTelegrams(U.sim.H(U.state.tick));
    if (U.state.bankrupt) { U.ui.showBankrupt(U.state); return; }
    if (U.state.tick === 0 && !U.state.routes.length && !U.state.tutorial) {
      const ship = U.state.ships[0];
      U.ui.notify(`${U.state.company.name} is founded. Your first ship, ${ship.name}, waits at ${U.cityById[U.homeCity].name}. Open Routes to draw its first route.`);
    }
  }

  function changed() {
    U.map.syncRoutes(U.state);
    U.tutorial.check();
    U.sim.save(U.state);
  }

  function setTurnLength(ms) {
    const p = turnLength ? elapsed / turnLength : 0;
    turnLength = ms; elapsed = p * ms;
  }

  function nextTurn() {
    if (!U.state || U.ui.isDrawing() || U.state.bankrupt || !U.tutorial.allowsTurns()) return;
    if (U.turnActive) { frozen = false; return; }
    U.sim.beginTurn(U.state);
    U.turnActive = true; frozen = false; elapsed = 0; U.progress = 0;
    turnLength = U.TIME.msPerTurn[auto || 1];
  }
  function setAuto(s) {
    if (!U.state || U.state.bankrupt || !U.tutorial.allowsTurns()) return;
    if (s) lastAuto = s;
    auto = s; slowedFrom = 0;
    if (U.turnActive) setTurnLength(U.TIME.msPerTurn[auto || 1]);
    if (auto) nextTurn();
    else if (U.turnActive) frozen = true;
  }
  function toggleAuto() { setAuto(auto ? 0 : lastAuto); }

  function newGame() {
    if (!confirm("Start a new game? Your current game will be lost.")) return;
    U.sim.clearSave();
    location.reload();
  }

  // Telegrams ------------------------------------------------------------------------
  function deliverTelegrams(hour) {
    const st = U.state, due = st.pendingTelegrams.filter(t => t.hour <= hour + 1e-6);
    if (!due.length) return;
    st.pendingTelegrams = st.pendingTelegrams.filter(t => t.hour > hour + 1e-6);
    due.sort((a, b) => a.hour - b.hour);
    for (const t of due) {
      st.telegrams.push(t);
      U.ui.showTelegram(t);
      if (t.major) { if (auto || U.turnActive) { lastAuto = auto || lastAuto; auto = 0; slowedFrom = 0; if (U.turnActive) frozen = true; } }
      else if (auto > 1) { slowedFrom = auto; auto = 1; if (U.turnActive) setTurnLength(U.TIME.msPerTurn[1]); }
    }
    // Keep about three months of telegrams in the log.
    st.telegrams = st.telegrams.filter(t => t.hour > hour - 90 * 24);
  }
  function telegramClosed() {
    if (slowedFrom && U.ui.openTelegramCount() === 0) {
      auto = slowedFrom; slowedFrom = 0;
      if (U.turnActive) setTurnLength(U.TIME.msPerTurn[auto]);
    }
  }

  function endTurn() {
    U.sim.advance(U.state);
    U.turnActive = false; U.progress = 0; elapsed = 0;
    U.map.syncRoutes(U.state);
    U.sim.save(U.state);
    deliverTelegrams(U.sim.H(U.state.tick));
    U.ui.rerenderIf(["ship", "route", "city", "fleet", "routes", "finances", "shipyard", "company", "telegrams", "contracts"]);
    U.tutorial.check();
    if (U.state.bankrupt) { auto = 0; U.ui.showBankrupt(U.state); return; }
    if (auto && !U.ui.isDrawing()) nextTurn();
  }

  function frame(now) {
    const dt = lastFrame == null ? 0 : Math.min(250, now - lastFrame);
    lastFrame = now;
    if (U.state) {
      if (U.turnActive && !frozen) {
        elapsed += dt;
        U.progress = Math.min(1, elapsed / turnLength);
        deliverTelegrams(U.sim.H(U.state.tick) + U.progress * U.TIME.tickHours);
        if (!frozen && elapsed >= turnLength) endTurn();
      }
      U.map.drawShips(U.state, U.progress);
      U.map.drawWeather(U.state, U.progress);
      U.map.syncTransport(U.state); U.map.drawTraffic();
    }
    U.ui.updateBar(U.state, auto, U.progress, frozen);
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.UpShip);
