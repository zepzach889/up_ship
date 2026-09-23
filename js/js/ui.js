// Top bar, speed controls, and the detail panel.
window.UpShip = window.UpShip || {};
(function (U) {
  const $ = sel => document.querySelector(sel);
  const money = n => (n < 0 ? "−£" : "£") + Math.abs(Math.round(n)).toLocaleString("en-GB");
  const pct = n => Math.round(n * 100) + "%";
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function clock(d) {
    let h = d.getUTCHours(), m = d.getUTCMinutes() < 30 ? "00" : "30";
    const ap = h < 12 ? "am" : "pm";
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }
  function dateLine(d) { return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }

  let selection = null;

  function init(handlers) {
    document.querySelectorAll("[data-auto]").forEach(b => b.addEventListener("click", () => handlers.setAuto(+b.dataset.auto)));
    $("#next-turn").addEventListener("click", handlers.nextTurn);
    $("#zoom-in").addEventListener("click", () => U.map.zoomBy(1.4));
    $("#zoom-out").addEventListener("click", () => U.map.zoomBy(1 / 1.4));
    $("#panel-close").addEventListener("click", () => select(null));
    $("#new-game").addEventListener("click", handlers.newGame);
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === " " && !e.target.closest("button, [role=button]")) { e.preventDefault(); handlers.toggleAuto(); }
      else if ((e.key === "n" || e.key === "N" || e.key === "Enter") && !e.target.closest("button, [role=button]")) handlers.nextTurn();
      else if (e.key === "0" || e.key === "1" || e.key === "2" || e.key === "3") handlers.setAuto(+e.key);
      else if (e.key === "Escape") select(null);
    });
  }

  function updateBar(state, auto, progress) {
    const d = U.sim.dateOf(state.tick, progress);
    $("#date").textContent = dateLine(d);
    $("#time").textContent = clock(d);
    $("#money").textContent = money(state.money);
    $("#money").classList.toggle("is-negative", state.money < 0);
    document.querySelectorAll("[data-auto]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.auto === auto)));
    const next = $("#next-turn");
    next.disabled = U.turnActive || auto > 0;
    next.classList.toggle("is-playing", U.turnActive);
  }

  function select(sel) {
    selection = sel;
    U.map.highlight(sel);
    $("#panel").hidden = !sel;
    render();
  }

  function row(label, value) { return `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`; }

  function cityPanel(state, c) {
    const tier = U.TIERS[c.tier], sp = U.SPECIALTIES[c.specialty];
    const served = state.ships.filter(s => U.sim.routeOf(state, s).stops.includes(c.id));
    const demand = { major: "Very high", large: "High", medium: "Moderate", small: "Low" }[c.tier];
    return `
      <h2>${c.name}</h2>
      <p class="sub">${c.country}${c.id === state.company.home ? ", your home base" : ""}</p>
      <dl>
        ${row("Size", tier.name)}
        ${row("Specialty", `${sp.name}. ${sp.note}.`)}
        ${row("Passenger demand", demand)}
        ${row("Your ships here", served.length ? served.map(s => `<button class="link" data-ship="${s.id}">${s.name}</button>`).join(", ") : "None yet")}
      </dl>`;
  }

  function shipPanel(state, ship, progress) {
    const cls = U.SHIP_CLASSES[ship.classId];
    const route = U.sim.routeOf(state, ship);
    const pos = U.map.shipPosition(ship, progress);
    let status, paxLabel = "Passengers aboard";
    if (ship.leg && U.turnActive && pos.flying) {
      const arrive = U.sim.dateOf(state.tick, ship.leg.hours / U.TIME.tickHours);
      status = `Flying to ${U.cityById[ship.leg.to].name}, arriving about ${clock(arrive)}`;
    } else if (ship.leg && U.turnActive) {
      status = `Moored at ${U.cityById[ship.leg.to].name}, next departure ${clock(U.sim.dateOf(state.tick + 1))}`;
      paxLabel = "Passengers carried";
    } else if (ship.leg) {
      status = `Moored at ${U.cityById[ship.leg.from].name}, departs ${clock(U.sim.dateOf(state.tick))} for ${U.cityById[ship.leg.to].name}`;
      paxLabel = "Passengers booked";
    } else {
      status = `Moored at ${U.cityById[route.stops[ship.at]].name}`;
    }
    const st = ship.stats, profit = st.revenue - st.costs;
    return `
      <h2>${ship.name}</h2>
      <p class="sub">${cls.name}. ${cls.builder}.</p>
      <p class="status">${status}</p>
      <dl>
        ${ship.leg ? row(paxLabel, `${ship.leg.passengers} of ${cls.passengers}`) : ""}
        ${row("Route", `<button class="link" data-route="${route.id}">${route.stops.map(s => U.cityById[s].name).join(" and ")}</button>`)}
        ${row("Cruising speed", cls.speedKmh + " km/h")}
        ${row("Range", cls.rangeKm.toLocaleString("en-GB") + " km")}
        ${row("Crew", cls.crew)}
      </dl>
      <h3>This year</h3>
      <dl>
        ${row("Flights", st.flights)}
        ${row("Passengers", st.passengers.toLocaleString("en-GB"))}
        ${row("Income", money(st.revenue))}
        ${row("Costs", money(st.costs))}
        ${row("Profit", `<span class="${profit < 0 ? "neg" : "pos"}">${money(profit)}</span>`)}
      </dl>
      <p class="note">${cls.basis}.</p>`;
  }

  function routePanel(state, route) {
    const a = U.cityById[route.stops[0]], b = U.cityById[route.stops[1]];
    const km = U.sim.distanceKm(a, b);
    const ships = state.ships.filter(s => s.routeId === route.id);
    const cls = U.SHIP_CLASSES[ships[0].classId];
    const sum = U.sim.routeSummary(state, route.id);
    const hours = km / cls.speedKmh;
    return `
      <h2>${a.name} and ${b.name}</h2>
      <p class="sub">Two departures a day, 7 am and 7 pm</p>
      <dl>
        ${row("Distance", Math.round(km) + " km")}
        ${row("Flight time", `about ${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min`)}
        ${row("Fare", money(U.sim.fare(km)))}
        ${row("Ships", ships.map(s => `<button class="link" data-ship="${s.id}">${s.name}</button>`).join(", "))}
      </dl>
      <h3>Last ${sum.days || 30} days</h3>
      ${sum.days ? `<dl>
        ${row("Seats filled", pct(sum.load))}
        ${row("Income", money(sum.revenue))}
        ${row("Costs", money(sum.costs))}
        ${row("Profit", `<span class="${sum.profit < 0 ? "neg" : "pos"}">${money(sum.profit)}</span>`)}
      </dl>` : `<p class="note">Results appear after the first full day of service.</p>`}`;
  }

  let lastHtml = "";
  function render() {
    const body = $("#panel-body");
    if (!selection) { body.innerHTML = ""; lastHtml = ""; return; }
    const s = U.state, prog = U.progress || 0;
    let html = "";
    if (selection.type === "city") html = cityPanel(s, U.cityById[selection.id]);
    else if (selection.type === "ship") html = shipPanel(s, s.ships.find(x => x.id === selection.id), prog);
    else if (selection.type === "route") html = routePanel(s, s.routes.find(x => x.id === selection.id));
    if (html === lastHtml) return;
    lastHtml = html;
    body.innerHTML = html;
    body.querySelectorAll("[data-ship]").forEach(b => b.addEventListener("click", () => select({ type: "ship", id: b.dataset.ship })));
    body.querySelectorAll("[data-route]").forEach(b => b.addEventListener("click", () => select({ type: "route", id: b.dataset.route })));
  }

  U.ui = { init, updateBar, select, render };
})(window.UpShip);
