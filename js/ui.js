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
    $("#panel-body").addEventListener("change", onPanelChange);
    $("#panel-body").addEventListener("keydown", e => {
      const n = e.target.closest("g[data-research]");
      if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); n.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
    });
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
    const turnsOk = U.tutorial.allowsTurns() && !state.bankrupt;
    document.querySelectorAll("[data-auto]").forEach(b => { b.setAttribute("aria-pressed", String(+b.dataset.auto === auto)); b.disabled = !turnsOk; });
    const next = $("#next-turn");
    next.disabled = (U.turnActive && !frozen) || auto > 0 || !!draft || !turnsOk;
    next.textContent = frozen ? "Resume turn" : "Next turn";
    $(".hint").hidden = state.tick > 0 || !!draft || !!state.tutorial;
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
    if (U.tutorial) U.tutorial.check(sel);
    $("#panel").hidden = !sel;
    document.querySelectorAll("[data-open]").forEach(b => b.classList.toggle("is-active", !!sel && sel.type === b.dataset.open));
    render();
    $(".panel-inner").scrollTop = 0;    // a newly opened panel starts at its top
  }

  const row = (label, value) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`;
  const shipLink = s => `<button class="link" data-go="ship:${s.id}">${esc(s.name)}</button>`;
  const routeLink = r => `<button class="link" data-go="route:${r.id}">${esc(U.sim.routeName(r.stops, r.circuit))}</button>`;

  function render() {
    const body = $("#panel-body");
    if (!selection) { body.innerHTML = ""; return; }
    const s = U.state;
    const views = { research: researchPanel, city: cityPanel, ship: shipPanel, route: routePanel, shipyard: shipyardPanel, fleet: fleetPanel, routes: routesPanel,
      finances: financesPanel, company: companyPanel, telegrams: telegramsPanel, contracts: contractsPanel };
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

  // Improvements a ship carries, and the refits the player can choose for its next overhaul.
  function improvementsBlock(state, ship) {
    const fitted = (ship.fitted || []).map(id => U.research.techById[id].name);
    const options = U.research.refitOptions(state, ship);
    const plan = ship.refitPlan || [];
    const total = options.filter(o => plan.includes(o.id)).reduce((a, o) => a + o.cost, 0);
    if (!fitted.length && !options.length) return "";
    return `<h3>Improvements</h3>
      ${fitted.length ? `<p class="small">Fitted: ${fitted.join(", ")}.</p>` : ""}
      ${options.length ? `<p class="small">Available as refits, fitted during the ship's next overhaul:</p>
        <ul class="refits">${options.map(o => `<li><label><input type="checkbox" data-refit="${o.id}" ${plan.includes(o.id) ? "checked" : ""}>
          <span><b>${o.name}</b> ${money(o.cost)}<small>${o.effect}</small></span></label></li>`).join("")}</ul>
        ${total ? `<p class="small">Planned: ${money(total)} at the next overhaul. Use "Overhaul at next chance" to fit them sooner.</p>` : ""}` : ""}`;
  }

  function shipPanel(state, id) {
    const ship = state.ships.find(s => s.id === id);
    if (!ship) return null;
    const cls = U.SHIP_CLASSES[ship.classId], rs = U.research.stats(state, ship);
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
      ${U.shipArt.illustration(cls.art || cls.kind, cls.liner ? 290 : 250)}
      <p class="status" id="live-status">${shipStatus(state, ship, U.progress || 0)}</p>
      ${routeBlock}
      ${leg && !leg.ferry ? `<dl class="spaced">
        ${rs.passengers ? row("Passengers aboard", `${leg.pax} of ${rs.passengers}`) : ""}
        ${row("Cargo aboard", `${leg.tons} of ${rs.cargoTons} ${rs.cargoTons === 1 ? "ton" : "tons"}`)}
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
        ${row("Passengers", rs.passengers || "None")}
        ${row("Cargo", rs.cargoTons + (rs.cargoTons === 1 ? " ton" : " tons"))}
        ${row("Cruising speed", rs.speedKmh + " km/h")}
        ${row("Range", km(rs.rangeKm))}
        ${row("Crew", cls.crew)}
        ${row("Running cost", money(rs.dailyCost * U.ECONOMY.costFactor) + " a day, plus fuel")}
      </dl>
      ${improvementsBlock(state, ship)}
      <dl>
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

  function lockedClassCards(state) {
    const open = new Set(U.sim.catalog(state));
    return (U.RESEARCH_CATALOG[state.company.nation] || []).filter(id => !open.has(id)).map(id => {
      const c = U.SHIP_CLASSES[id];
      const needs = c.requires.map(t => `${U.research.techById[t].name}${U.research.has(state, t) ? " ✓" : ""}`).join(", ");
      return `<section class="card is-locked">
        <h4>${c.name}</h4>
        <p class="card-role">${c.role}. ${c.passengers ? c.passengers + " passengers, " : ""}${c.cargoTons} tons, ${km(c.rangeKm)} range, ${money(c.price)}.</p>
        <p class="note">Needs research: ${needs}.</p></section>`;
    }).join("");
  }

  function shipyardPanel(state) {
    const home = city(state.company.home), nation = U.NATIONS[state.company.nation];
    return `
      <h2>Shipyard</h2>
      <p class="sub">${nation.name}'s builders. New ships are delivered at ${home.name}${home.works ? ", where your works build them faster and cheaper" : ""}.</p>
      ${state.buildGrant ? `<p class="status">Government construction grant: ${Math.round(state.buildGrant.share * 100)}% off your next national-built ship, until ${shortDate(U.sim.dateAtHour(state.buildGrant.until))}.</p>` : ""}
      ${U.sim.catalog(state).map(id => {
        const c = U.SHIP_CLASSES[id], t = Object.assign({}, U.sim.orderTerms(state, id));
        const grant = U.contracts.buildGrantFor(state, id, t.price);
        t.price -= grant;
        const weeks = t.days < 45 ? `${Math.round(t.days / 7)} weeks` : `${Math.round(t.days / 30 * 2) / 2} months`;
        const surplus = c.kind === "surplus", left = state.surplusLeft[id] || 0;
        const blocked = state.money < t.price || (surplus && !left);
        return `<section class="card">
          <h4>${c.name}</h4>
          ${U.shipArt.illustration(c.art || c.kind, c.liner ? 290 : 270)}
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
          <div class="card-foot"><span class="price">${money(t.price)}${grant ? ` <small class="was">${money(t.price + grant)}</small>` : ""}</span>
            <button class="btn" data-order="${id}" ${blocked ? "disabled" : ""}>Order</button></div>
          ${surplus && !left ? `<p class="note">Every surplus hull has been sold.</p>` : state.money < t.price ? `<p class="note">Not enough funds.</p>` : ""}
        </section>`;
      }).join("")}
      ${U.research.builtWith(state).length ? `<p class="note">New ships are built with: ${U.research.builtWith(state).map(id => U.research.techById[id].name).join(", ")}.</p>` : ""}
      ${lockedClassCards(state)}`;
  }

  // Research ---------------------------------------------------------------------------
  function wrapLabel(text) {
    const words = text.split(" ");
    if (words.length === 1) return [text];
    let best = 1, bestDiff = 1e9;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
      if (d < bestDiff) { bestDiff = d; best = i; }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }
  function researchDiagram(state) {
    const R = U.research, r = state.research, cols = { engines: 52, structures: 150, operations: 248 };
    const W = 96, Hn = 34, y = tier => 30 + (tier - 1) * 46;
    const unlocks = (U.RESEARCH_CATALOG[state.company.nation] || []).map((id, i) => ({ id, x: 52 + i * 98, y: 262 }));
    let lines = "", nodes = "";
    for (const u of unlocks) for (const t of U.SHIP_CLASSES[u.id].requires) {
      const tech = R.techById[t], x1 = cols[tech.branch], y1 = y(tech.tier) + Hn / 2;
      lines += `<path d="M${x1},${y1} C${x1},${y1 + 40} ${u.x},${u.y - 60} ${u.x},${u.y - 16}" class="rd-line${R.has(state, t) ? " is-done" : ""}"/>`;
    }
    for (const t of R.TECHS) {
      const x = cols[t.branch] - W / 2, yy = y(t.tier);
      const st = R.has(state, t.id) ? "done" : r.current === t.id ? "current" : R.available(state, t.id) ? "open" : "locked";
      const lab = wrapLabel(t.name);
      nodes += `<g class="rd-node is-${st}" ${st === "open" ? `data-research="${t.id}" role="button" tabindex="0"` : ""}>
        <rect x="${x}" y="${yy}" width="${W}" height="${Hn}" rx="3"/>
        ${lab.map((l, i) => `<text x="${cols[t.branch]}" y="${yy + (lab.length === 1 ? 21 : 14 + i * 12)}">${esc(l)}</text>`).join("")}
        ${st === "current" ? `<rect class="rd-progress" x="${x}" y="${yy + Hn - 3}" width="${W * (r.progress[t.id] || 0)}" height="3"/>` : ""}</g>`;
    }
    for (const u of unlocks) {
      const c = U.SHIP_CLASSES[u.id], open = c.requires.every(t => R.has(state, t));
      const lab = wrapLabel(c.name);
      nodes += `<g class="rd-unlock${open ? " is-done" : ""}"><rect x="${u.x - 46}" y="${u.y - 16}" width="92" height="34" rx="17"/>
        ${lab.map((l, i) => `<text x="${u.x}" y="${u.y + (lab.length === 1 ? 5 : -2 + i * 12)}">${esc(l)}</text>`).join("")}</g>`;
    }
    const heads = U.research.BRANCHES.map(b => `<text class="rd-head" x="${cols[b.id]}" y="16">${b.name}</text>`).join("");
    return `<svg class="research-diagram" viewBox="0 0 300 286" role="img" aria-label="Research tree">${heads}${lines}${nodes}</svg>`;
  }

  function researchPanel(state) {
    const R = U.research, r = state.research;
    const cur = r.current ? R.projectInfo(state, r.current) : null;
    const pctDone = cur ? Math.round((r.progress[r.current] || 0) * 100) : 0;
    const days = cur ? R.daysLeft(state) : 0;
    const funding = Object.entries(R.FUNDING).map(([k, f]) => `<button class="${r.funding === k ? "btn" : "btn-quiet"}" data-funding="${k}">${f.name}</button>`).join("");
    const row2 = (t, status) => `<li class="rt-${status}"><div><b>${t.name}</b><small>${t.effect}</small></div>
      ${status === "open" ? `<button class="btn-quiet" data-research="${t.id}">Research</button>` : `<span class="rt-status">${{ done: "Done", current: "In progress", locked: "Locked" }[status]}</span>`}</li>`;
    const branches = R.BRANCHES.map(b => {
      const techs = R.TECHS.filter(t => t.branch === b.id).map(t => row2(t, R.has(state, t.id) ? "done" : r.current === t.id ? "current" : R.available(state, t.id) ? "open" : "locked")).join("");
      const refId = "refine-" + b.id, ref = R.projectInfo(state, refId), refOpen = R.available(state, refId);
      const refRow = `<li class="rt-${r.current === refId ? "current" : refOpen ? "open" : "locked"}"><div><b>${ref.name}</b><small>${ref.effect}. Repeatable, ${money(ref.cost)}.</small></div>
        ${r.current === refId ? `<span class="rt-status">In progress</span>` : refOpen ? `<button class="btn-quiet" data-research="${refId}">Research</button>` : `<span class="rt-status">After all four</span>`}</li>`;
      return `<h3>${b.name}</h3><ul class="research-list">${techs}${refRow}</ul>`;
    }).join("");
    return `
      <h2>Research</h2>
      <p class="sub">One project at a time. Progress on a project is kept if you switch away from it.</p>
      ${researchDiagram(state)}
      ${cur ? `<div class="status"><b>${cur.name}</b>: ${cur.effect}.
        <div class="meter"><span style="width:${pctDone}%"></span></div>
        ${pctDone}% done, about ${days < 60 ? days + " days" : Math.round(days / 30) + " months"} left at this funding. Costs ${money(R.monthlyCost(state))} a month.</div>
        <p class="field-label">Funding</p><div class="btn-row">${funding}</div>`
        : `<p class="status">No project under way. Choose one from the diagram or the lists below.</p>
        <p class="field-label">Funding for the next project</p><div class="btn-row">${funding}</div>`}
      ${branches}`;
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

  function offerText(o) {
    const a = city(o.a || o.b || "berlin"), b = o.b ? city(o.b) : null;
    if (o.kind === "mail") return `<h4>Mail contract: ${a.name} to ${b.name}</h4>
      <p>${o.perWeek === 7 ? "One flight a day" : o.perWeek + " flights a week"} each way, ${km(U.sim.distanceKm(o.a, o.b))} apart. ${money(o.monthly)} a month for ${o.years} year${o.years > 1 ? "s" : ""}. Offered by ${o.authority === U.NATIONS[U.state.company.nation].name ? "your government's postal ministry" : "the postal authority of " + esc(o.authority)}.</p>`;
    if (o.kind === "route") return `<h4>Route grant: ${a.name} to ${b.name}</h4>
      <p>Open a service between them within ${U.ECONOMY.grantOpenMonths} months and fly it at least ${U.ECONOMY.grantMinPerMonth} times each way every month for ${o.years} years. ${money(o.upfront)} when the service opens, then ${money(o.monthly)} a month. Stopping early means repaying part of the opening grant.</p>`;
    return `<h4>Construction grant</h4><p>The government pays ${Math.round(o.share * 100)}% of your next national-built ship (not war-surplus) ordered within ${U.ECONOMY.buildGrantMonths} months, in exchange for keeping it registered at home.</p>`;
  }

  function contractsPanel(state) {
    const now = U.sim.H(state.tick);
    const offers = state.offers.map(o => `<section class="card offer">${offerText(o)}
      <p class="note">Open until ${shortDate(U.sim.dateAtHour(o.expiresHour))}.</p>
      <div class="btn-row"><button class="btn-quiet" data-decline="${o.id}">Decline</button><button class="btn" data-accept="${o.id}">Accept</button></div></section>`).join("");
    const mail = state.contracts.map(k => {
      const rel = k.required ? Math.round(k.made / k.required * 100) + "%" : "New";
      const has = state.routes.some(r => U.sim.routeLegs(r).some(([x, y]) => (x === k.a && y === k.b) || (x === k.b && y === k.a)));
      return `<section class="card"><h4>Mail: ${city(k.a).name} to ${city(k.b).name}</h4>
        <dl>
          ${row("Required", `${k.perWeek === 7 ? "Daily" : k.perWeek + " a week"} each way`)}
          ${row("This week", `${city(k.a).name} to ${city(k.b).name} ${k.week.ab} of ${k.perWeek}; back ${k.week.ba} of ${k.perWeek}`)}
          ${row("Pay", money(k.monthly) + " a month")}
          ${row("Reliability", rel)}
          ${row("Penalties so far", money(k.penalties))}
          ${row("Ends", shortDate(U.sim.dateAtHour(k.endHour)))}
        </dl>
        ${has ? "" : `<p class="note">No route of yours flies between these cities yet. Any ship with half a ton of cargo space flying directly between them carries the mail.</p>
          <button class="btn" data-draw="${k.a}:${k.b}">Draw this route</button>`}</section>`;
    }).join("");
    const grants = state.grants.map(g => `<section class="card"><h4>Grant: ${city(g.a).name} to ${city(g.b).name}</h4>
      <dl>
        ${g.opened ? row("This month", `${g.month.ab} and ${g.month.ba} of ${U.ECONOMY.grantMinPerMonth} each way`) + row("Received", money(g.received)) + row("Ends", shortDate(U.sim.dateAtHour(g.endHour)))
          : row("Open by", shortDate(U.sim.dateAtHour(g.openBy))) + row("On opening", money(g.upfront))}
        ${row("Monthly", money(g.monthly))}
      </dl>
      ${g.opened || state.routes.some(r => U.sim.routeLegs(r).some(([x, y]) => (x === g.a && y === g.b) || (x === g.b && y === g.a))) ? "" : `<button class="btn" data-draw="${g.a}:${g.b}">Draw this route</button>`}</section>`).join("");
    return `
      <h2>Contracts</h2>
      <p class="sub">Mail contracts and government grants</p>
      <h3>Offers</h3>${offers || `<p class="note">No offers open. New ones arrive by telegram every month or two.</p>`}
      <h3>Mail contracts</h3>${mail || `<p class="note">None yet.</p>`}
      <h3>Grants</h3>${grants || `<p class="note">None yet.</p>`}
      ${state.buildGrant ? `<p class="status">Construction grant: ${Math.round(state.buildGrant.share * 100)}% off your next national-built ship until ${shortDate(U.sim.dateAtHour(state.buildGrant.until))}.</p>` : ""}`;
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
    const limit = U.contracts.loanLimit(state), step = U.ECONOMY.loanStep;
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
      <h3>Income sources, ${y.year}</h3>
      <dl>
        ${row("Mail contracts", money(y.mail || 0))}
        ${row("Government grants", money(y.grants || 0))}
        ${row("Loan interest paid", money(y.interest || 0))}
      </dl>
      <h3>Bank loan</h3>
      <dl>
        ${row("Owed", money(state.loan))}
        ${row("Credit limit", money(limit))}
        ${row("Interest", `${Math.round(U.ECONOMY.loanRate * 100)}% a year, ${money(state.loan * U.ECONOMY.loanRate / 12)} a month`)}
      </dl>
      <div class="btn-row">
        <button class="btn" data-loan="borrow" ${state.loan + step > limit ? "disabled" : ""}>Borrow ${money(step)}</button>
      </div>
      ${state.loan ? `<form class="loan-form" data-loan-form="repay">
        <label for="repay-amount" class="field-label">Repay an amount</label>
        <div class="field"><span class="pound">£</span><input id="repay-amount" name="amount" type="number" min="0" step="any"
          max="${Math.floor(Math.min(state.loan, Math.max(0, state.money)))}" placeholder="${Math.min(5000, state.loan)}" inputmode="numeric">
          <button type="submit" class="btn-quiet">Repay</button></div>
        <div class="btn-row">
          <button type="button" class="btn-quiet" data-loan="repay-step" ${state.money < 1 ? "disabled" : ""}>Repay ${money(Math.min(step, state.loan))}</button>
          <button type="button" class="btn-quiet" data-loan="repay-all" ${state.money < state.loan ? "disabled" : ""}>Repay all</button>
        </div>
      </form>
      <form class="loan-form" data-loan-form="installment">
        <label for="installment-amount" class="field-label">Monthly installment ${state.installment ? `(now ${money(state.installment)} a month)` : "(off)"}</label>
        <div class="field"><span class="pound">£</span><input id="installment-amount" name="amount" type="number" min="0" step="any" placeholder="${state.installment || 2000}" inputmode="numeric">
          <button type="submit" class="btn-quiet">Set</button>
          ${state.installment ? `<button type="button" class="btn-quiet" data-loan="stop-installment">Stop</button>` : ""}</div>
        <p class="note">Paid at the end of each month, skipped in any month it would overdraw the account.</p>
      </form>` : ""}
      <p class="note">The credit limit is based on what your ships would sell for. Overdrawn funds with no credit left for three months running means bankruptcy.</p>
      <h3>Routes, last 30 days</h3>
      <dl>${state.routes.map(r => { const s = U.sim.routeSummary(state, r.id);
        return row(routeLink(r), s.days ? `<span class="${s.profit < 0 ? "neg" : "pos"}">${money(s.profit)}</span>` : "New"); }).join("") || `<p class="note">No routes.</p>`}</dl>
      <h3>Ships, ${y.year}</h3>
      <dl>${state.ships.map(s => { const p = s.stats.revenue - s.stats.costs;
        return row(shipLink(s), s.deliveryTick > state.tick ? "Being built" : `<span class="${p < 0 ? "neg" : "pos"}">${money(p)}</span>`); }).join("")}</dl>`;
  }

  // Panel actions -------------------------------------------------------------------
  function onPanelClick(e) {
    const b = e.target.closest("button, [data-research]");
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
    if (b.dataset.accept) { U.contracts.accept(s, b.dataset.accept); h.changed(); render(); return; }
    if (b.dataset.decline) { U.contracts.decline(s, b.dataset.decline); h.changed(); render(); return; }
    if (b.dataset.draw) { startDraft(b.dataset.draw.split(":")); return; }
    if (b.dataset.loan) {
      const act = b.dataset.loan;
      if (act === "borrow") U.contracts.borrow(s);
      else if (act === "repay-step") U.contracts.repay(s, U.ECONOMY.loanStep);
      else if (act === "repay-all") U.contracts.repay(s, s.loan);
      else if (act === "stop-installment") U.contracts.setInstallment(s, 0);
      h.changed(); render(); return;
    }
    if (b.dataset.research) { U.research.choose(s, b.dataset.research); h.changed(); render(); return; }
    if (b.dataset.funding) { U.research.setFunding(s, b.dataset.funding); h.changed(); render(); return; }
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
    if (f.dataset.loanForm) {
      const amount = +f.elements.amount.value;
      if (!(amount > 0) && f.dataset.loanForm === "repay") return;
      if (f.dataset.loanForm === "repay") {
        const paid = U.contracts.repay(U.state, amount);
        if (paid) notify(`Repaid ${money(paid)}. ${U.state.loan ? money(U.state.loan) + " still owed." : "The loan is paid off."}`);
      } else U.contracts.setInstallment(U.state, amount);
      h.changed(); render();
    }
  }
  // Refit checkboxes in a ship's panel.
  function onPanelChange(e) {
    const box = e.target.closest("[data-refit]");
    if (!box || !selection || selection.type !== "ship") return;
    const ship = U.state.ships.find(x => x.id === selection.id);
    const plan = new Set(ship.refitPlan || []);
    if (box.checked) plan.add(box.dataset.refit); else plan.delete(box.dataset.refit);
    ship.refitPlan = [...plan];
    h.changed(); render();
  }

  // Drawing a route ---------------------------------------------------------------------
  function startDraft(stops) {
    draft = Array.isArray(stops) ? stops.slice() : [];
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
    const only = U.tutorial.draftCities && U.tutorial.draftCities();
    if (only && !only.includes(id)) return;
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

  // Bankruptcy ends the game.
  function showBankrupt(state) {
    const T = state.totals;
    $("#panel").hidden = false;
    $("#panel-body").innerHTML = `<h2>Bankrupt</h2>
      <p class="sub">${esc(state.company.name)} could not pay its debts, and its creditors have taken control.</p>
      <dl>${row("Founded", "1 January 1919")}${row("Closed", shortDate(U.sim.dateOf(state.tick)))}
        ${row("Flights", T.flights.toLocaleString("en-GB"))}${row("Passengers flown", T.passengers.toLocaleString("en-GB"))}</dl>
      <button class="btn" data-act="bankrupt-new">Start a new company</button>`;
    $("#panel-body").querySelector("[data-act=bankrupt-new]").addEventListener("click", () => { U.sim.clearSave(); location.reload(); });
  }

  U.ui = { init, showCompany, showTelegram, showBankrupt, dismissAll, openTelegramCount, openMajorCount,
    onTelegramClosed: fn => { onTelegramClosed = fn; }, updateBar, select, render, notify, isDrawing: () => !!draft, rerenderIf: types => { if (selection && types.includes(selection.type) && !editing) render(); } };
})(window.UpShip);
