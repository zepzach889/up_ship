// Top bar, dock, detail panels, and route drawing.
window.UpShip = window.UpShip || {};
(function (U) {
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = n => (n < 0 ? "−£" : "£") + Math.abs(Math.round(n)).toLocaleString("en-GB");
  const pct = n => n == null ? "–" : Math.round(n * 100) + "%";
  // Fares in pounds and shillings, as a 1920s ticket would show them.
  const lsd = n => { let l = Math.floor(n), s = Math.round((n - l) * 20); if (s === 20) { l += 1; s = 0; } return `£${l}${s ? " " + s + "s" : ""}`; };
  const km = n => Math.round(n).toLocaleString("en-GB") + " km";
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const city = id => U.cityById[id];

  function clock(d) {
    let h = d.getUTCHours(), m = d.getUTCMinutes() < 30 ? "00" : "30";
    const ap = h < 12 ? "am" : "pm";
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }
  const dateLine = d => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const shortDate = d => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  let selection = null, h = null, draft = null, editing = null, picking = null;

  function init(handlers) {
    h = handlers;
    document.querySelectorAll("[data-auto]").forEach(b => b.addEventListener("click", () => h.setAuto(+b.dataset.auto)));
    $("#next-turn").addEventListener("click", h.nextTurn);
    $("#zoom-in").addEventListener("click", () => U.map.zoomBy(1.4));
    $("#zoom-out").addEventListener("click", () => U.map.zoomBy(1 / 1.4));
    $("#panel-close").addEventListener("click", () => select(null));
    $("#new-game").addEventListener("click", h.newGame);
    $("#company").addEventListener("click", () => select({ type: "company" }));
    $("#telegrams .tg-all").addEventListener("click", dismissAll);
    document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => select({ type: b.dataset.open })));
    $("#draft-undo").addEventListener("click", () => { draft.pop(); updateDraft(); });
    $("#draft-cancel").addEventListener("click", () => endDraft());
    $("#draft-circuit").addEventListener("change", () => updateDraft());
    $("#draft-create").addEventListener("click", () => {
      const route = U.sim.createRoute(U.state, draft, $("#draft-circuit").checked);
      endDraft();
      h.changed();
      select({ type: "route", id: route.id });
    });
    // Panel buttons are rebuilt often, so listen once on the panel itself.
    $("#panel-body").addEventListener("click", onPanelClick);
    $("#panel-body").addEventListener("submit", onPanelSubmit);
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea, select")) return;
      const onControl = e.target.closest("button, [role=button]");
      if (e.key === " " && !onControl) { e.preventDefault(); h.toggleAuto(); }
      else if ((e.key === "n" || e.key === "N" || (e.key === "Enter" && !onControl))) h.nextTurn();
      else if (["0", "1", "2", "3"].includes(e.key)) h.setAuto(+e.key);
      else if (e.key === "Escape") { if (draft) endDraft(); else select(null); }
    });
  }

  // Top bar ----------------------------------------------------------------------
  function updateBar(state, auto, progress, frozen) {
    if (!state) { $("#date").textContent = dateLine(U.sim.dateOf(0)); $("#time").textContent = ""; return; }
    const d = U.sim.dateOf(state.tick, progress);
    $("#date").textContent = dateLine(d);
    $("#time").textContent = clock(d);
    $("#money").textContent = money(state.money);
    $("#money").classList.toggle("is-negative", state.money < 0);
    document.querySelectorAll("[data-auto]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.auto === auto)));
    const next = $("#next-turn");
    next.disabled = (U.turnActive && !frozen) || auto > 0 || !!draft;
    next.textContent = frozen ? "Resume turn" : "Next turn";
    $(".hint").hidden = state.tick > 0 || !!draft;
    const live = $("#live-status");
    if (live && selection && selection.type === "ship") {
      const ship = state.ships.find(s => s.id === selection.id);
      if (ship) live.textContent = shipStatus(state, ship, progress);
    }
  }

  // Notices ----------------------------------------------------------------------
  let noticeTimer = null;
  function notify(text) {
    const n = $("#notice");
    n.textContent = text; n.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { n.hidden = true; }, 5000);
  }

  // Selection and panels ----------------------------------------------------------
  function select(sel) {
    if (U.setup && U.setup.handleSelect(sel)) return;
    if (sel && sel.type === "country") return;
    if (draft && sel && sel.type === "city") { addDraftStop(sel.id); return; }
    selection = sel; editing = null; picking = null;
    U.map.highlight(sel);
    $("#panel").hidden = !sel;
    document.querySelectorAll("[data-open]").forEach(b => b.classList.toggle("is-active", !!sel && sel.type === b.dataset.open));
    render();
  }

  const row = (label, value) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`;
  const shipLink = s => `<button class="link" data-go="ship:${s.id}">${esc(s.name)}</button>`;
  const routeLink = r => `<button class="link" data-go="route:${r.id}">${esc(U.sim.routeName(r.stops, r.circuit))}</button>`;

  function render() {
    const body = $("#panel-body");
    if (!selection) { body.innerHTML = ""; return; }
    const s = U.state;
    const views = { city: cityPanel, ship: shipPanel, route: routePanel, shipyard: shipyardPanel, fleet: fleetPanel, routes: routesPanel,
      finances: financesPanel, company: companyPanel, telegrams: telegramsPanel };
    const html = views[selection.type](s, selection.id);
    if (html == null) { select(null); return; }
    body.innerHTML = html;
    const input = body.querySelector("input[autofocus]");
    if (input) { input.focus(); input.select(); }
  }

  function cityPanel(state, id) {
    const c = city(id), tier = U.TIERS[c.tier], sp = U.SPECIALTIES[c.specialty];
    const routes = state.routes.filter(r => r.stops.includes(c.id));
    const here = state.ships.filter(s => s.deliveryTick <= state.tick && !s.leg && s.location === c.id);
    const demand = { major: "Very high", large: "High", medium: "Moderate", small: "Low" }[c.tier];
    return `
      <h2>${c.name}</h2>
      <p class="sub">${c.country}${c.id === state.company.home ? ", your home base" : ""}</p>
      <dl>
        ${row("Size", tier.name)}
        ${row("Specialty", `${sp.name}. ${sp.note}.`)}
        ${row("Passenger demand", demand)}
        ${row("Your routes", routes.length ? routes.map(routeLink).join("<br>") : "None")}
        ${row("Moored here now", here.length ? here.map(shipLink).join(", ") : "None")}
      </dl>`;
  }

  function shipStatus(state, ship, progress) {
    if (ship.deliveryTick > state.tick) return `Under construction, delivery ${shortDate(U.sim.dateOf(ship.deliveryTick))}`;
    const pos = U.map.shipPosition(ship, progress), c = n => city(n).name;
    if (pos.flying) {
      const arrive = U.sim.dateAtHour(pos.leg.start + pos.leg.hours);
      const sameDay = arrive.getUTCDate() === U.sim.dateAtHour(pos.hour).getUTCDate();
      return `${pos.leg.ferry ? "Positioning flight" : "Flying"} to ${c(pos.leg.to)}, arriving about ${clock(arrive)}${sameDay ? "" : " " + shortDate(arrive)}`;
    }
    if (ship.overhaulUntil && pos.hour < ship.overhaulUntil) return `In overhaul at ${c(pos.at)} until ${shortDate(U.sim.dateAtHour(ship.overhaulUntil))}`;
    if (pos.upcoming) return `Moored at ${c(pos.at)}, departing ${clock(U.sim.dateAtHour(pos.upcoming.start))} for ${c(pos.upcoming.to)}`;
    if (ship.readyHour > pos.hour + 12 && ship.routeId) return `Grounded for repairs at ${c(pos.at)} until ${shortDate(U.sim.dateAtHour(ship.readyHour))}`;
    if (!ship.routeId) return `Waiting at ${c(pos.at)} with no route`;
    return `Moored at ${c(pos.at)}`;
  }

  function shipPanel(state, id) {
    const ship = state.ships.find(s => s.id === id);
    if (!ship) return null;
    const cls = U.SHIP_CLASSES[ship.classId];
    const route = U.sim.routeOf(state, ship);
    const building = ship.deliveryTick > state.tick;
    const title = editing === ship.id
      ? `<form class="rename" data-rename="${ship.id}">
           <label for="rename-input" class="sr">Ship name</label>
           <input id="rename-input" name="name" value="${esc(ship.name)}" maxlength="28" autofocus autocomplete="off">
           <button type="submit" class="btn">Save</button>
           <button type="button" class="btn-quiet" data-act="cancel-rename">Cancel</button>
         </form>`
      : `<h2>${esc(ship.name)}</h2><button class="btn-quiet rename-btn" data-act="rename">Rename</button>`;
    let routeBlock;
    if (picking === ship.id) {
      routeBlock = `<div class="picker"><p class="picker-title">Choose a route</p>
        ${state.routes.map(r => {
          const why = U.sim.canAssign(state, ship, r);
          return `<button class="pick" data-assign="${ship.id}:${r.id}" ${why ? "disabled" : ""}>
            <span>${esc(U.sim.routeName(r.stops, r.circuit))}</span>${why ? `<small>${esc(why)}</small>` : ""}</button>`;
        }).join("") || `<p class="note">You have no routes yet. Draw one from the Routes panel.</p>`}
        ${ship.routeId ? `<button class="pick" data-assign="${ship.id}:">No route (stay after the current flight)</button>` : ""}
        <button class="btn-quiet" data-act="cancel-pick">Cancel</button></div>`;
    } else {
      routeBlock = `<dl>${row("Route", route ? routeLink(route) : "None")}</dl>
        <button class="btn" data-act="pick">${route ? "Change route" : "Assign a route"}</button>
        ${building && route ? `<p class="note">It will fly this route as soon as it is delivered.</p>` : ""}`;
    }
    const pos = building ? null : U.map.shipPosition(ship, U.progress || 0);
    const leg = pos && pos.flying ? pos.leg : null, st = ship.stats, profit = st.revenue - st.costs;
    const age = U.sim.ageYears(state, ship);
    const cond = Math.round(ship.condition * 100);
    const sellWhy = U.sim.canSell(state, ship, pos ? pos.hour : 0);
    return `
      <div class="title-row">${title}</div>
      <p class="sub">${cls.name}. ${cls.role}.</p>
      ${U.shipArt.illustration(cls.kind, 250)}
      <p class="status" id="live-status">${shipStatus(state, ship, U.progress || 0)}</p>
      ${routeBlock}
      ${leg && !leg.ferry ? `<dl class="spaced">
        ${cls.passengers ? row("Passengers aboard", `${leg.pax} of ${cls.passengers}`) : ""}
        ${row("Cargo aboard", `${leg.tons} of ${cls.cargoTons} ${cls.cargoTons === 1 ? "ton" : "tons"}`)}
      </dl>` : ""}
      ${building ? "" : `<h3>Condition</h3>
      <div class="meter" role="img" aria-label="Condition ${cond} percent"><span style="width:${cond}%" class="${cond < 40 ? "low" : cond < 60 ? "mid" : ""}"></span></div>
      <dl>
        ${row("Condition", cond + "%")}
        ${row("Age", `${age.toFixed(1)} of ${ship.lifeYears} years`)}
        ${row("Overhaul when below", `<span class="stepper"><button class="btn-quiet" data-threshold="-0.1" aria-label="Lower threshold">−</button>
          <span>${Math.round(ship.overhaulAt * 100)}%</span><button class="btn-quiet" data-threshold="0.1" aria-label="Raise threshold">+</button></span>`)}
      </dl>
      ${ship.overhaulUntil || ship.overhaulNow ? "" : `<button class="btn-quiet" data-act="overhaul-now">Overhaul at next chance</button>`}`}
      <h3>Ship</h3>
      <dl>
        ${row("Passengers", cls.passengers || "None")}
        ${row("Cargo", cls.cargoTons + (cls.cargoTons === 1 ? " ton" : " tons"))}
        ${row("Cruising speed", cls.speedKmh + " km/h")}
        ${row("Range", km(cls.rangeKm))}
        ${row("Crew", cls.crew)}
        ${row("Running cost", money(cls.dailyCost * U.ECONOMY.costFactor) + " a day, plus fuel")}
      </dl>
      ${building ? "" : `<h3>This year</h3>
      <dl>
        ${row("Flights", st.flights)}
        ${row("Passengers carried", st.passengers.toLocaleString("en-GB"))}
        ${row("Cargo carried", Math.round(st.tons).toLocaleString("en-GB") + " tons")}
        ${row("Income", money(st.revenue))}
        ${row("Costs", money(st.costs))}
        ${row("Profit", `<span class="${profit < 0 ? "neg" : "pos"}">${money(profit)}</span>`)}
      </dl>
      <h3>Sell</h3>
      <dl>${row("Sale value", money(U.sim.saleValue(state, ship)))}</dl>
      <button class="btn-danger" data-act="sell" ${sellWhy ? "disabled" : ""}>Sell ${esc(ship.name)}</button>
      ${sellWhy ? `<p class="note">${sellWhy}; it can be sold once moored.</p>` : ""}`}
      <p class="note">${cls.basis}.${cls.note ? " " + cls.note : ""}</p>`;
  }

  function routePanel(state, id) {
    const route = state.routes.find(r => r.id === id);
    if (!route) return null;
    const legs = U.sim.routeLegs(route);
    const ships = state.ships.filter(s => s.routeId === route.id);
    const sum = U.sim.routeSummary(state, route.id);
    const first = route.stops[0], last = route.stops[route.stops.length - 1];
    let adder;
    if (picking === route.id) {
      const others = state.ships.filter(s => s.routeId !== route.id);
      adder = `<div class="picker"><p class="picker-title">Add a ship</p>
        ${others.map(s => {
          const why = U.sim.canAssign(state, s, route);
          const r0 = U.sim.routeOf(state, s);
          const where = (r0 ? "Now on " + U.sim.routeName(r0.stops, r0.circuit) : "No route") + (s.deliveryTick > state.tick ? ", still being built" : "");
          return `<button class="pick" data-assign="${s.id}:${route.id}" ${why ? "disabled" : ""}>
            <span>${esc(s.name)}</span><small>${esc(why || where)}</small></button>`;
        }).join("") || `<p class="note">Every ship you own is already on this route. Order more from the Shipyard.</p>`}
        <button class="btn-quiet" data-act="cancel-pick">Cancel</button></div>`;
    } else adder = `<button class="btn" data-act="pick">Add a ship</button>`;
    return `
      <h2>${esc(U.sim.routeName(route.stops, route.circuit))}</h2>
      <p class="sub">${route.circuit ? "Circuit" : "Out and back"}. Ships leave as soon as they are ready.</p>
      <dl>
        ${legs.map(([a, b]) => row(`${city(a).name} to ${city(b).name}`, km(U.sim.distanceKm(a, b)))).join("")}
        ${route.circuit ? "" : row(`Fare, ${city(first).name} to ${city(last).name}`, lsd(U.sim.fare(U.sim.distanceKm(first, last))))}
      </dl>
      <h3>Ships</h3>
      ${ships.length ? `<ul class="plain-list">${ships.map(s => `<li>${shipLink(s)} <button class="btn-quiet" data-unassign="${s.id}">Remove</button></li>`).join("")}</ul>`
        : `<p class="note">No ships on this route yet.</p>`}
      ${adder}
      <h3>Last ${sum.days || 30} days</h3>
      ${sum.days ? `<dl>
        ${row("Seats filled", pct(sum.load))}
        ${row("Cargo space filled", pct(sum.cargoLoad))}
        ${row("Income", money(sum.revenue))}
        ${row("Costs", money(sum.costs))}
        ${row("Profit", `<span class="${sum.profit < 0 ? "neg" : "pos"}">${money(sum.profit)}</span>`)}
      </dl>` : `<p class="note">Results appear after the first full day of service.</p>`}
      <button class="btn-danger" data-act="delete-route">Delete route</button>`;
  }

  function shipyardPanel(state) {
    const home = city(state.company.home), nation = U.NATIONS[state.company.nation];
    return `
      <h2>Shipyard</h2>
      <p class="sub">${nation.name}'s builders. New ships are delivered at ${home.name}${home.works ? ", where your works build them faster and cheaper" : ""}.</p>
      ${U.sim.catalog(state).map(id => {
        const c = U.SHIP_CLASSES[id], t = U.sim.orderTerms(state, id);
        const weeks = t.days < 45 ? `${Math.round(t.days / 7)} weeks` : `${Math.round(t.days / 30 * 2) / 2} months`;
        const surplus = c.kind === "surplus", left = state.surplusLeft[id] || 0;
        const blocked = state.money < t.price || (surplus && !left);
        return `<section class="card">
          <h4>${c.name}</h4>
          ${U.shipArt.illustration(c.kind, 270)}
          <p class="card-role">${c.role}. ${c.basis}.</p>
          <dl>
            ${row("Passengers", c.passengers || "None")}
            ${row("Cargo", c.cargoTons + (c.cargoTons === 1 ? " ton" : " tons"))}
            ${row("Speed", c.speedKmh + " km/h")}
            ${row("Range", km(c.rangeKm))}
            ${row("Running cost", money(c.dailyCost * U.ECONOMY.costFactor) + " a day")}
            ${row("Delivery", weeks)}
            ${row("Service life", (surplus ? U.ECONOMY.lifeYears.surplus : U.ECONOMY.lifeYears.built) + " years")}
            ${surplus ? row("Hulls left", left ? `${left} of ${U.ECONOMY.surplusStock}` : "None") : ""}
          </dl>
          <div class="card-foot"><span class="price">${money(t.price)}</span>
            <button class="btn" data-order="${id}" ${blocked ? "disabled" : ""}>Order</button></div>
          ${surplus && !left ? `<p class="note">Every surplus hull has been sold.</p>` : state.money < t.price ? `<p class="note">Not enough funds.</p>` : ""}
        </section>`;
      }).join("")}`;
  }

  function fleetPanel(state) {
    const counts = {};
    for (const sh of state.ships) counts[sh.classId] = (counts[sh.classId] || 0) + 1;
    return `
      <h2>Fleet</h2>
      <p class="sub">${state.ships.length} ship${state.ships.length === 1 ? "" : "s"}</p>
      <dl>${Object.keys(counts).map(id => row(U.SHIP_CLASSES[id].name, counts[id])).join("")}</dl>
      <ul class="ledger spaced">${state.ships.map(s => {
        const r = U.sim.routeOf(state, s);
        const status = s.deliveryTick > state.tick ? "Delivery " + shortDate(U.sim.dateOf(s.deliveryTick)) + (r ? ", then " + U.sim.routeName(r.stops, r.circuit) : "")
          : (r ? U.sim.routeName(r.stops, r.circuit) : "No route") + `, condition ${Math.round(s.condition * 100)}%`;
        return `<li><button class="ledger-item" data-go="ship:${s.id}"><span>${esc(s.name)}</span>
          <small>${U.SHIP_CLASSES[s.classId].name}. ${esc(status)}</small></button></li>`;
      }).join("")}</ul>
      <button class="btn" data-open-panel="shipyard">Order a ship</button>`;
  }

  function companyPanel(state) {
    const c = state.company, T = state.totals;
    const served = new Set(state.routes.flatMap(r => r.stops));
    const counts = {};
    for (const sh of state.ships) counts[sh.classId] = (counts[sh.classId] || 0) + 1;
    return `
      <div class="company-head">${U.emblem.svg(c.emblem, 64)}<div><h2>${esc(c.name)}</h2>
        <p class="sub">${U.NATIONS[c.nation].name}, based at ${city(c.home).name}. Director ${esc(c.director)}.</p></div></div>
      <h3>Since founding, 1 January 1919</h3>
      <dl>
        ${row("Flights", T.flights.toLocaleString("en-GB"))}
        ${row("Passengers flown", T.passengers.toLocaleString("en-GB"))}
        ${row("Freight carried", Math.round(T.tons).toLocaleString("en-GB") + " tons")}
        ${row("Income", money(T.revenue))}
        ${row("Running costs", money(T.costs))}
      </dl>
      <h3>Today</h3>
      <dl>
        ${row("Funds", money(state.money))}
        ${row("Ships", state.ships.length)}
        ${Object.keys(counts).map(id => row("&nbsp;&nbsp;" + U.SHIP_CLASSES[id].name, counts[id])).join("")}
        ${row("Routes", state.routes.length)}
        ${row("Cities served", served.size)}
      </dl>`;
  }

  function telegramsPanel(state) {
    const log = state.telegrams.slice().reverse();
    return `
      <h2>Telegrams</h2>
      <p class="sub">The last three months</p>
      ${log.length ? `<ul class="tg-log">${log.map(t => `<li>
        <p class="tg-date">${shortDate(U.sim.dateAtHour(t.hour))}</p>
        <p class="tg-text">${esc(t.text)}</p>
        ${t.target ? `<button class="link" data-go="${t.target.type}:${t.target.id || ""}">Open</button>` : ""}</li>`).join("")}</ul>`
        : `<p class="note">No telegrams yet.</p>`}`;
  }

  function routesPanel(state) {
    return `
      <h2>Routes</h2>
      <p class="sub">${state.routes.length} route${state.routes.length === 1 ? "" : "s"}</p>
      <ul class="ledger">${state.routes.map(r => {
        const n = state.ships.filter(s => s.routeId === r.id).length;
        const sum = U.sim.routeSummary(state, r.id);
        return `<li><button class="ledger-item" data-go="route:${r.id}"><span>${esc(U.sim.routeName(r.stops, r.circuit))}</span>
          <small>${n} ship${n === 1 ? "" : "s"}${sum.days ? `. Last 30 days: <span class="${sum.profit < 0 ? "neg" : "pos"}">${money(sum.profit)}</span>` : ""}</small></button></li>`;
      }).join("")}</ul>
      <button class="btn" data-act="new-route">Draw a new route</button>`;
  }

  function financesPanel(state) {
    const y = state.year, net = y.revenue - y.costs - y.purchases + (y.sales || 0);
    return `
      <h2>Finances</h2>
      <p class="sub">${esc(state.company.name)}, ${y.year} so far. Director ${esc(state.company.director)}.</p>
      <dl>
        ${row("Income", money(y.revenue))}
        ${row("Running costs", money(y.costs))}
        ${row("Operating profit", `<span class="${y.revenue - y.costs < 0 ? "neg" : "pos"}">${money(y.revenue - y.costs)}</span>`)}
        ${row("Ship purchases", money(y.purchases))}
        ${row("Ship sales", money(y.sales || 0))}
        ${row("Change in funds", `<span class="${net < 0 ? "neg" : "pos"}">${money(net)}</span>`)}
      </dl>
      <h3>Routes, last 30 days</h3>
      <dl>${state.routes.map(r => { const s = U.sim.routeSummary(state, r.id);
        return row(routeLink(r), s.days ? `<span class="${s.profit < 0 ? "neg" : "pos"}">${money(s.profit)}</span>` : "New"); }).join("") || `<p class="note">No routes.</p>`}</dl>
      <h3>Ships, ${y.year}</h3>
      <dl>${state.ships.map(s => { const p = s.stats.revenue - s.stats.costs;
        return row(shipLink(s), s.deliveryTick > state.tick ? "Being built" : `<span class="${p < 0 ? "neg" : "pos"}">${money(p)}</span>`); }).join("")}</dl>`;
  }

  // Panel actions -------------------------------------------------------------------
  function onPanelClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const s = U.state;
    if (b.dataset.go) { const [type, id] = b.dataset.go.split(":"); select({ type, id: id || undefined }); return; }
    if (b.dataset.threshold) {
      const ship = s.ships.find(x => x.id === selection.id);
      ship.overhaulAt = Math.min(0.8, Math.max(0.2, Math.round((ship.overhaulAt + +b.dataset.threshold) * 10) / 10));
      h.changed(); render(); return;
    }
    if (b.dataset.openPanel) { select({ type: b.dataset.openPanel }); return; }
    if (b.dataset.order) {
      const ship = U.sim.order(s, b.dataset.order);
      if (ship) { notify(`Ordered ${ship.name}, ${U.SHIP_CLASSES[ship.classId].name}. Delivery ${shortDate(U.sim.dateOf(ship.deliveryTick))}.`); h.changed(); render(); }
      return;
    }
    if (b.dataset.assign) {
      const [shipId, routeId] = b.dataset.assign.split(":");
      U.sim.assign(s, shipId, routeId || null);
      picking = null; h.changed(); render(); return;
    }
    if (b.dataset.unassign) { U.sim.assign(s, b.dataset.unassign, null); h.changed(); render(); return; }
    switch (b.dataset.act) {
      case "rename": editing = selection.id; render(); break;
      case "cancel-rename": editing = null; render(); break;
      case "pick": picking = selection.id; render(); break;
      case "cancel-pick": picking = null; render(); break;
      case "new-route": startDraft(); break;
      case "overhaul-now": { const ship = s.ships.find(x => x.id === selection.id); ship.overhaulNow = true; h.changed(); render(); break; }
      case "sell": {
        const ship = s.ships.find(x => x.id === selection.id);
        const value = U.sim.saleValue(s, ship);
        if (confirm(`Sell ${ship.name} for ${money(value)}? This cannot be undone.`)) {
          const hour = U.map.shipPosition(ship, U.progress || 0).hour;
          if (U.sim.sell(s, ship.id, hour)) { notify(`${ship.name} sold for ${money(value)}.`); h.changed(); select({ type: "fleet" }); }
        }
        break;
      }
      case "delete-route":
        if (confirm("Delete this route? Its ships will finish their current flight and wait for a new route.")) {
          U.sim.deleteRoute(s, selection.id); h.changed(); select({ type: "routes" });
        }
        break;
    }
  }

  function onPanelSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (f.dataset.rename) {
      if (U.sim.rename(U.state, f.dataset.rename, f.elements.name.value)) { editing = null; h.changed(); render(); }
    }
  }

  // Drawing a route ---------------------------------------------------------------------
  function startDraft() {
    draft = [];
    $("#draft-circuit").checked = false;
    select(null);
    $("#draft").hidden = false;
    updateDraft();
  }
  function endDraft() {
    draft = null;
    $("#draft").hidden = true;
    U.map.drawDraft(null);
  }
  function addDraftStop(id) {
    if (draft.includes(id) || draft.length >= U.ECONOMY.maxStops) return;
    draft.push(id);
    updateDraft();
  }
  function updateDraft() {
    const circuit = $("#draft-circuit").checked && draft.length > 2;
    U.map.drawDraft(draft, circuit);
    const n = draft.length, max = U.ECONOMY.maxStops;
    let text;
    if (!n) text = "Click the first city on the route.";
    else if (n === 1) text = `${city(draft[0]).name}. Click the next city.`;
    else {
      const longest = U.sim.longestLeg(draft, circuit);
      const cat = U.sim.catalog(U.state);
      const fits = cat.filter(c => U.SHIP_CLASSES[c].rangeKm >= longest).map(c => U.SHIP_CLASSES[c].name);
      text = `${U.sim.routeName(draft, circuit)}. Longest leg ${km(longest)}. ` +
        (fits.length === cat.length ? "Every ship class can fly it." : fits.length ? `Only the ${fits.join(" and ")} can fly it.` : "No ship class has the range for it.");
      if (n < max) text += ` Up to ${max - n} more.`;
    }
    $("#draft-text").textContent = text;
    $("#draft-undo").disabled = !n;
    $("#draft-create").disabled = n < 2;
    $("#draft-circuit").disabled = n < 3;
  }

  // Company name and emblem in the top bar, and the company color on the map.
  function showCompany(state) {
    const c = state.company;
    $("#company").innerHTML = `${U.emblem.svg(c.emblem, 34)}<span class="company-name">${esc(c.name)}</span>`;
    $("#company").hidden = false;
    document.documentElement.style.setProperty("--company", c.emblem.c1);
  }

  // Telegrams ---------------------------------------------------------------------
  let onTelegramClosed = () => {};
  function showTelegram(t) {
    const stack = $("#telegrams");
    const card = document.createElement("div");
    card.className = "telegram" + (t.major ? " is-major" : "");
    card.dataset.id = t.id;
    card.innerHTML = `<p class="tg-head">Telegram, ${shortDate(U.sim.dateAtHour(t.hour))}</p><p class="tg-text">${esc(t.text)}</p>
      <div class="tg-actions">${t.target ? `<button class="btn-quiet" data-tg-open>Open</button>` : ""}<button class="btn" data-tg-close>Dismiss</button></div>`;
    card.querySelector("[data-tg-close]").addEventListener("click", () => closeTelegram(card, t));
    const open = card.querySelector("[data-tg-open]");
    if (open) open.addEventListener("click", () => { select({ type: t.target.type, id: t.target.id }); closeTelegram(card, t); });
    stack.insertBefore(card, stack.querySelector(".tg-all"));
    updateStack();
  }
  function closeTelegram(card, t) { card.remove(); updateStack(); onTelegramClosed(t); }
  function updateStack() {
    const stack = $("#telegrams"), cards = stack.querySelectorAll(".telegram");
    stack.hidden = !cards.length;
    stack.querySelector(".tg-all").hidden = cards.length < 2;
    // Show only the three newest; the log keeps everything.
    cards.forEach((c, i) => c.hidden = i < cards.length - 3);
  }
  function dismissAll() {
    const cards = [...$("#telegrams").querySelectorAll(".telegram")];
    cards.forEach(c => c.remove());
    updateStack();
    onTelegramClosed(null, true);
  }
  const openTelegramCount = () => $("#telegrams").querySelectorAll(".telegram").length;
  const openMajorCount = () => $("#telegrams").querySelectorAll(".telegram.is-major").length;

  U.ui = { init, showCompany, showTelegram, dismissAll, openTelegramCount, openMajorCount,
    onTelegramClosed: fn => { onTelegramClosed = fn; }, updateBar, select, render, notify, isDrawing: () => !!draft, rerenderIf: types => { if (selection && types.includes(selection.type) && !editing) render(); } };
})(window.UpShip);
