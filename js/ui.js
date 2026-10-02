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

  let selection = null, h = null, draft = null, editing = null, picking = null, fleetFilter = "all";
  const yardConfig = {};      // layout chosen on each Shipyard card
  const yardGas = {};         // gas chosen on each Shipyard card

  function init(handlers) {
    h = handlers;
    document.querySelectorAll("[data-auto]").forEach(b => b.addEventListener("click", () => h.setAuto(+b.dataset.auto)));
    $("#next-turn").addEventListener("click", h.nextTurn);
    document.querySelectorAll("[data-layer]").forEach(b => b.addEventListener("click", () => {
      document.querySelectorAll("[data-layer]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      U.map.setLayer(b.dataset.layer);
      renderLegend(b.dataset.layer);
    }));
    $("#legend").addEventListener("click", e => {
      if (e.target.closest("[data-legend-toggle]")) { legendCollapsed = !legendCollapsed; renderLegend(currentLayer); }
    });
    renderLegend("normal");
    $("#zoom-in").addEventListener("click", () => U.map.zoomBy(1.4));
    $("#zoom-out").addEventListener("click", () => U.map.zoomBy(1 / 1.4));
    $("#panel-close").addEventListener("click", () => select(null));
    $("#new-game").addEventListener("click", h.newGame);
    $("#company").addEventListener("click", () => select({ type: "company" }));
    $("#telegrams .tg-all").addEventListener("click", dismissAll);
    document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => select({ type: b.dataset.open })));
    document.querySelectorAll("[data-office]").forEach(b => b.addEventListener("click", () => U.designer.open()));
    $("#panel-body").addEventListener("change", async e => {
      if (e.target.id === "game-file" && e.target.files[0]) {
        if (!confirm("Load this game? It replaces the game you are playing now.")) { e.target.value = ""; return; }
        const err = U.sim.importGame(await e.target.files[0].text());
        if (err) { notify(err); e.target.value = ""; return; }
        location.reload(); return;
      }
      const sel = e.target.closest && e.target.closest("[data-move-captain]");
      if (!sel || !sel.value) return;
      const s = U.state, c = s.captains.find(x => x.id === sel.dataset.moveCaptain);
      if (sel.value === "__spare") { U.crew.standDown(s, c.id); notify(`Captain ${c.name} stands down and becomes a spare captain.`); }
      else { const from = s.ships.find(x => x.id === c.shipId), to = s.ships.find(x => x.id === sel.value), other = U.crew.move(s, c.id, to.id);
        notify(other ? `Captain ${c.name} takes ${to.name}; Captain ${other.name} ${from ? `takes ${from.name}` : "becomes a spare captain"}.` : `Captain ${c.name} takes command of ${to.name}.`); }
      h.changed(); render();
    });
    $("#panel-body").addEventListener("input", e => {
      if (e.target.id === "reserve-pct") { U.state.crew.reserve = +e.target.value; const rd = $("#reserve-read"); if (rd) rd.textContent = `${e.target.value}% above what the fleet needs`; h.changed(); return; }
      if (e.target.id === "fund-pct") { U.research.setFunding(U.state, +e.target.value); const rd = $("#fund-read"); if (rd) rd.textContent = fundingText(U.state); h.changed(); }
    });
    $("#draft-undo").addEventListener("click", () => { draft.pop(); updateDraft(); });
    $("#draft-cancel").addEventListener("click", () => endDraft());
    $("#draft-circuit").addEventListener("change", () => updateDraft());
    $("#draft-create").addEventListener("click", () => {
      const st = U.state, circuit = $("#draft-circuit").checked;
      // Build any masts the route needs first.
      const need = U.facilities.mastsNeeded(st, draft), cost = need.length * U.facilities.TYPES.mast.costs[0];
      if (st.money < cost) { notify(`Not enough funds for the masts this route needs (${money(cost)}).`); return; }
      for (const id of need) U.facilities.build(st, id, "mast");
      const route = draftRoute ? U.sim.editRoute(st, draftRoute, draft, circuit) : U.sim.createRoute(st, draft, circuit);
      if (need.length) notify(`Built ${need.length === 1 ? "a mast" : need.length + " masts"} at ${need.map(id => city(id).name).join(" and ")} for ${money(cost)}.`);
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
    // Master hotkeys. Caught before buttons see them, so Space never re-presses a focused button.
    window.addEventListener("keydown", e => {
      if (e.target.closest("input[type=text], input:not([type]), input[type=number], textarea, select")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const onControl = e.target.closest("button, [role=button], input[type=checkbox]");
      if (e.key === " ") { e.preventDefault(); e.stopPropagation(); h.toggleAuto(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); h.nextTurn(); }
      else if (e.key === "Enter" && !onControl) h.nextTurn();
      else if (["0", "1", "2", "3"].includes(e.key)) { e.preventDefault(); h.setAuto(+e.key); }
      else if (e.key === "Escape") { if (draft) endDraft(); else select(null); }
    }, true);
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
      if (ship) (live.firstElementChild || live).textContent = shipStatus(state, ship, progress);
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
  // Going from a list (fleet, routes, and so on) into a ship, route, or city remembers the way back.
  const LISTS = new Set(["fleet", "routes", "crew", "shipyard", "finances", "contracts", "telegrams", "research", "company"]);
  const DETAIL = new Set(["ship", "route", "city"]);
  let navStack = [];
  function select(sel, back) {
    if (!back) {
      const same = sel && selection && sel.type === selection.type && sel.id === selection.id;
      if (sel && selection && !same && DETAIL.has(sel.type) && (LISTS.has(selection.type) || DETAIL.has(selection.type))) navStack.push(selection);
      else if (!sel || LISTS.has(sel.type) || !DETAIL.has(sel.type)) navStack = [];
    }
    if (U.setup && U.setup.handleSelect(sel)) return;
    if (sel && sel.type === "country") return;
    if (draft && sel && sel.type === "city") { addDraftStop(sel.id); return; }
    selection = sel; editing = null; picking = null;
    U.map.highlight(sel);
    if (U.tutorial) U.tutorial.check(sel);
    $("#panel").hidden = !sel;
    $("#panel").classList.toggle("panel-wide", !!sel && sel.type === "fleet");
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
    const views = { aetherdecision: aetherDecisionPanel, crew: crewPanel, settings: settingsPanel, gasdecision: gasDecisionPanel, research: researchPanel, city: cityPanel, ship: shipPanel, route: routePanel, shipyard: shipyardPanel, fleet: fleetPanel, routes: routesPanel,
      finances: financesPanel, company: companyPanel, telegrams: telegramsPanel, contracts: contractsPanel };
    let html = views[selection.type](s, selection.id);
    if (html == null) { select(null); return; }
    const prev = navStack[navStack.length - 1];
    if (prev && DETAIL.has(selection.type)) html = `<button class="btn-quiet panel-back" data-back>← Back to ${esc(backLabel(prev))}</button>` + html;
    // The panel is rebuilt as the game moves on; whatever is being typed survives it, with focus and cursor.
    const openDetails = [...body.querySelectorAll("details")].map(d => d.open);
    const a = document.activeElement, typing = a && body.contains(a) && a.id && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== "checkbox" && a.type !== "range"
      ? { id: a.id, value: a.value, start: safe(() => a.selectionStart), end: safe(() => a.selectionEnd) } : null;
    body.innerHTML = html;
    body.querySelectorAll("details").forEach((d, i) => { if (openDetails[i]) d.open = true; });
    if (typing) {
      const el = document.getElementById(typing.id);
      if (el) { el.value = typing.value; el.focus(); if (typing.start != null) safe(() => el.setSelectionRange(typing.start, typing.end)); }
      return;
    }
    const input = body.querySelector("input[autofocus]");
    if (input) { input.focus(); input.select(); }
  }
  const safe = f => { try { return f(); } catch (e) { return null; } };
  // The whole game to a file, and back.
  function saveToFile(state) {
    U.sim.save(state);
    const d = U.sim.dateOf(state.tick), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const data = { format: "upship-save", version: state.version, savedAt: new Date().toISOString(), state };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    a.download = `${state.company.name.replace(/[^\w\- ]+/g, "").trim() || "Up Ship"} ${stamp}.upship-save.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    notify("A copy of this game is saved in your downloads.");
  }
  async function loadFromFile(file) {
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { notify("That file could not be read as a saved game."); return; }
    if (!data || data.format !== "upship-save" || !data.state || !data.state.company) { notify("That file is not an Up, Ship! saved game."); return; }
    if (data.state.version !== U.state?.version && data.state.version !== 11) { notify("That game was saved by a different version of Up, Ship! and cannot be loaded."); return; }
    if (!confirm(`Load ${data.state.company.name}, saved at ${U.sim.dateOf(data.state.tick).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}? It replaces the game you are playing now.`)) return;
    try { localStorage.setItem("upship.save.v11", JSON.stringify(data.state)); } catch (e) { notify("There was not room to load that game."); return; }
    location.reload();
  }
  function backLabel(sel) {
    if (sel.type === "ship") { const s = U.state.ships.find(x => x.id === sel.id); return s ? s.name : "the ship"; }
    if (sel.type === "route") { const r = U.state.routes.find(x => x.id === sel.id); return r ? r.name || "the route" : "the route"; }
    if (sel.type === "city") return city(sel.id).name;
    return { fleet: "the fleet", routes: "routes", crew: "crew", shipyard: "the Shipyard", finances: "finances", contracts: "contracts", telegrams: "telegrams", research: "research", company: "the company" }[sel.type] || "the list";
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
        ${row("First-class travelers", Math.round(U.passengers.FIRST_SHARE[c.specialty] * 100) + "%")}
        ${row("Your routes", routes.length ? routes.map(routeLink).join("<br>") : "None")}
        ${row("Moored here now", here.length ? here.map(shipLink).join(", ") : "None")}
      </dl>
      ${facilitiesBlock(state, c.id)}`;
  }

  function facilitiesBlock(state, id) {
    const F = U.facilities, pub = F.hasPublic(id), hasMast = F.canLand(state, id);
    const lim = F.terminalLimits(state, id), used = state.cityDay[id] || { pax: 0, tons: 0 };
    const rows = ["mast", "terminal", "shed", "school", "gasplant", "hestore"].concat(U.aether.discovered(state) ? ["refinery"] : []).map(type => {
      const T = F.TYPES[type], lvl = F.ownLevel(state, id, type), cost = F.nextCost(state, id, type), single = T.costs.length === 1;
      if (single) {
        const needsMast = !hasMast;
        return `<li><div class="fac-head">${lvl ? U.facArt.icon(type, 1, true, 40) : type === "gasplant" && F.publicGas(id) ? U.facArt.icon(type, 1, false, 40) : ""}<b>${T.name}</b>
          <span>${lvl ? "Built" : type === "gasplant" && F.publicGas(id) ? "Public supply here" : "None"}</span></div>
          ${lvl ? "" : `<div class="fac-buy">${U.facArt.icon(type, 1, true, 46)}<div><button class="btn-quiet" data-build="${id}:${type}" ${state.money < cost || needsMast ? "disabled" : ""}>Build, ${money(cost)}</button>
          <small class="fac-next">${T.about[0]}${needsMast ? ". Needs a mast here first." : ""}</small></div></div>`}</li>`;
      }
      const needsMast = type !== "mast" && type !== "school" && type !== "refinery" && !hasMast;
      const fee = { mast: `£${F.FEES.mast} a landing`, terminal: "1s a passenger, 2s a ton", shed: `overhauls cost ${Math.round(F.FEES.shed * 100)}% more` }[type];
      const yours = lvl ? `${F.SIZE_NAMES[lvl]}: ${T.about[lvl - 1]}` : pub && fee ? `Public: ${fee}` : pub ? "Using the public one" : "None";
      const now = lvl ? U.facArt.icon(type, lvl, true, 40) : pub ? U.facArt.icon(type, 2, false, 40) : "";
      const button = cost == null ? "" : `<div class="fac-buy">${U.facArt.icon(type, lvl + 1, true, 46)}<div>
        <button class="btn-quiet" data-build="${id}:${type}" ${state.money < cost || needsMast ? "disabled" : ""}>
        ${lvl ? "Enlarge" : "Build"} to ${F.SIZE_NAMES[lvl + 1].toLowerCase()}, ${money(cost)}</button>
        <small class="fac-next">${T.about[lvl]}${needsMast ? ". Needs a mast here first." : ""}</small></div></div>`;
      return `<li><div class="fac-head">${now}<b>${T.name}</b><span>${yours}</span></div>${button}</li>`;
    }).join("");
    return `<h3>Facilities</h3>
      <p class="small">${pub ? `A public mast, terminal, and shed (medium size) are open to any company here; their fees are shown beside each. Your own charge no fees, only upkeep of ${Math.round(F.UPKEEP * 100)}% of their building price a year.` : "No public facilities here. You need your own mast to land."}</p>
      <ul class="facilities">${rows}</ul>

      <dl>${row("Gas supply", F.publicGas(id) ? "Public hydrogen and helium" : F.canTopUp(state, id, "hydrogen") ? "Your own" : "None")}
        ${row("Helium price", `${Math.round(F.heliumPrice(state, id) * 100)}% of the port price`)}
        ${U.aether.discovered(state) ? row("Aetherium", F.ownLevel(state, id, "refinery") ? "From your refinery" : state.aether.publicOpen != null && id === U.aether.capital(state) ? "From the government works, for a fee" : "None here") : ""}
        ${row("Boarded today", `${Math.round(used.pax)} of ${lim.pax === Infinity ? "any number of" : lim.pax} passengers, ${Math.round(used.tons)} of ${lim.tons === Infinity ? "any" : lim.tons} tons`)}</dl>
      ${F.ownLevel(state, id, "mast") && !F.ownLevel(state, id, "terminal") ? `<p class="note">Your mast's waiting room handles about ${F.BASIC_ROOM.pax} passengers and ${F.BASIC_ROOM.tons} tons a day${pub ? " (the public terminal is used when it is larger)" : ""}.</p>` : ""}`;
  }

  function shipStatus(state, ship, progress) {
    if (ship.deliveryTick > state.tick) return `Under construction, delivery ${shortDate(U.sim.dateOf(ship.deliveryTick))}`;
    const pos = U.map.shipPosition(ship, progress), c = n => city(n).name;
    if (pos.flying) {
      const arrive = U.sim.dateAtHour(pos.leg.start + pos.leg.hours);
      const sameDay = arrive.getUTCDate() === U.sim.dateAtHour(pos.hour).getUTCDate();
      return `${pos.leg.ferry ? "Positioning flight" : "Flying"} to ${c(pos.leg.to)}${pos.leg.note ? `, ${pos.leg.note}` : ""}, arriving about ${clock(arrive)}${sameDay ? "" : " " + shortDate(arrive)}`;
    }
    if (ship.overhaulUntil && pos.hour < ship.overhaulUntil) return `In overhaul at ${c(pos.at)} until ${shortDate(U.sim.dateAtHour(ship.overhaulUntil))}`;
    if (pos.upcoming) return `Moored at ${c(pos.at)}, departing ${clock(U.sim.dateAtHour(pos.upcoming.start))} for ${c(pos.upcoming.to)}`;
    if (ship.readyHour > pos.hour + 12 && ship.routeId) return `Grounded for repairs at ${c(pos.at)} until ${shortDate(U.sim.dateAtHour(ship.readyHour))}`;
    if (!ship.routeId) return `Waiting at ${c(pos.at)} with no route`;
    if (!ship.captainId) return `Waiting at ${c(pos.at)} for a captain`;
    if (ship.waitNote && ship.readyHour > pos.hour) return `${ship.waitNote} at ${c(pos.at)}`;
    return `Moored at ${c(pos.at)}`;
  }

  // The ship's captain and staffing level.
  function captainRows(state, ship) {
    const C = U.crew, c = C.captainOf(state, ship), eff = C.effectiveStaffing(state, ship), want = ship.staffing || "full";
    const spare = state.captains.filter(x => !x.shipId);
    return `${row("Captain", c ? `${esc(c.name)}, ${C.grade(c).name}` : `<span class="neg">None: cannot fly</span>`)}
      ${c ? row("Traits", traitChips(c)) : ""}
      ${row("Crew", `${C.STAFFING[eff].name}, ${C.needFor(state, ship)} hands${eff !== want ? " (pool short-handed)" : ""}`)}
      </dl><div class="reconfig"><div class="btn-row">${Object.entries(C.STAFFING).map(([k, v]) => `<button class="${want === k ? "btn" : "btn-quiet"}" data-staffing="${ship.id}:${k}">${v.name}</button>`).join("")}</div>
      ${spare.length ? `<p class="small">${c ? "Replace with" : "Appoint"}:</p><div class="btn-row">${spare.map(x => `<button class="btn-quiet" data-appoint="${x.id}:${ship.id}">${esc(x.name)}</button>`).join("")}</div>` : !c ? `<p class="small">Hire a captain in the Crew panel.</p>` : ""}</div><dl>`;
  }

  // Lifting gas, range left, and switching at the next overhaul.
  function gasRows(state, ship) {
    const G = U.facilities.GAS[ship.gas];
    const others = ["hydrogen", "helium"].concat(U.aether.discovered(state) ? ["aetherium"] : []).filter(g => g !== ship.gas);
    const forced = U.sim.policyGas(state, ship.classId);
    return `${row("Lifting gas", G.name)}
      ${row("Gas range left", ship.gasLeft > 0 ? `${km(Math.round(ship.gasLeft))} of ${km(G.range)}` : "Out: flying light, less payload")}
      </dl><div class="reconfig">${forced && forced !== ship.gas ? `<p class="small">Switching to ${forced} at the next overhaul, under your gas policy.</p>`
        : forced ? "" : ship.gasTo ? `<button class="btn" data-gas-switch="${ship.id}:">Switching to ${ship.gasTo} at the next overhaul (undo)</button>`
        : `<div class="btn-row">${others.map(g => `<button class="btn-quiet" data-gas-switch="${ship.id}:${g}">Switch to ${g}</button>`).join("")}</div><p class="small">Refilled at the next overhaul.</p>`}
        ${ship.gas === "aetherium" && !U.aether.supplied(state, ship) ? `<p class="small neg">Beyond your refineries' capacity: this ship can only top up at the public works.</p>` : ""}</div><dl>`;
  }

  // Cabin layout, comfort, and changing the layout at the next overhaul.
  function cabinRows(state, ship) {
    const P = U.passengers, b = P.berths(state, ship), now = P.comfort(ship), fresh = P.comfortNew(ship);
    if (U.SHIP_CLASSES[ship.classId].designed) return `${row("Layout", "From the deck plan")}
      ${row("Berths", b.first && b.second ? `${b.total}: ${b.first} first, ${b.second} second` : `${b.total}`)}
      ${row("Comfort", `${now} of 100${now < fresh ? ` (${fresh} when overhauled)` : ""}`)}`;
    const cost = Math.round(U.SHIP_CLASSES[ship.classId].price * P.RECONFIG_SHARE / 100) * 100;
    return `${row("Layout", P.configOf(ship).name)}
      ${row("Berths", b.first && b.second ? `${b.total}: ${b.first} first, ${b.second} second` : `${b.total}`)}
      ${row("Comfort", `${now} of 100${now < fresh ? ` (${fresh} when overhauled)` : ""}`)}
      </dl><div class="reconfig"><p class="small">Change the layout at the next overhaul, ${money(cost)}:</p><div class="btn-row">${P.CONFIG_ORDER.map(k => {
        const on = (ship.reconfigTo || ship.config) === k;
        return `<button class="${on ? "btn" : "btn-quiet"}" data-reconfig="${ship.id}:${k}">${P.CONFIGS[k].name}</button>`;
      }).join("")}</div>${ship.reconfigTo ? `<p class="small">Planned: ${P.CONFIGS[ship.reconfigTo].name.toLowerCase()} at the next overhaul.</p>` : ""}</div><dl>`;
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
      <p class="status" id="live-status"><span>${shipStatus(state, ship, U.progress || 0)}</span></p>
      ${routeBlock}
      ${leg && !leg.ferry ? `<dl class="spaced">
        ${rs.passengers ? row("Passengers aboard", `${leg.pax} of ${leg.seats || U.passengers.berths(state, ship).total}${leg.p1 ? ` (${leg.p1} first)` : ""}`) : ""}
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
        ${rs.passengers ? cabinRows(state, ship) : row("Passengers", "None")}
        ${gasRows(state, ship)}
        ${captainRows(state, ship)}
        </dl><div class="reconfig"><p class="small">Weather: ${ship.weatherPolicy ? `this ship flies ${ship.weatherPolicy}` : `company policy (${state.weatherPolicy || "cautious"})`}</p><div class="btn-row">
          ${[["", "Company policy"], ["cautious", "Cautious"], ["bold", "Bold"]].map(([k, n]) => `<button class="${(ship.weatherPolicy || "") === k ? "btn" : "btn-quiet"}" data-wxpolicy="${ship.id}:${k}">${n}</button>`).join("")}</div></div><dl>
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

  function competitionBlock(state, route) {
    const st = route.stops, pairs = [];
    for (let i = 0; i < st.length - 1; i++) pairs.push([st[i], st[i + 1]]);
    if (st.length > 2 && !route.circuit) pairs.push([st[0], st[st.length - 1]]);
    if (route.circuit) pairs.push([st[st.length - 1], st[0]]);
    return `<h3>Competition</h3><ul class="comp-list">${pairs.map(([a, b]) => `<li>${esc(U.competition.describe(state, a, b))}</li>`).join("")}</ul>
      <p class="small">See the Competition map layer for railways, steamers, and air services.</p>`;
  }

  function faresBlock(state, route) {
    const P = U.passengers, first = route.stops[0], last = route.stops[route.stops.length - 1];
    const fr = P.fares(state, route, U.sim.distanceKm(first, last), 1);
    const levels = Object.entries(P.FARE_LEVELS).map(([k, l]) => `<button class="${!route.custom && (route.fare || "standard") === k ? "btn" : "btn-quiet"}" data-fare="${k}">${l.name}</button>`).join("");
    const cu = route.custom || { first: 100, second: 100 };
    return `<h3>Fares</h3>
      <div class="btn-row">${levels}</div>
      <p class="small">${route.custom ? "Your own fares are set." : { cheap: "25% below standard: fills seats and leans your name toward affordable.", standard: "The usual fares for the distance.", premium: "25% above standard: fewer second-class travelers, and leans your name toward luxury." }[route.fare || "standard"]}</p>
      <dl>${route.circuit ? "" : row(`${city(first).name} to ${city(last).name}`, `first ${lsd(fr.first)}, second ${lsd(fr.second)}`)}</dl>
      <details class="own-fares" ${route.custom ? "open" : ""}><summary>Set fares yourself</summary>
        <form data-own-fares="${route.id}">
          <label>First class, % of standard <input name="first" type="number" min="40" max="250" step="5" value="${cu.first}"></label>
          <label>Second class, % of standard <input name="second" type="number" min="40" max="250" step="5" value="${cu.second}"></label>
          <div class="btn-row"><button class="btn-quiet" type="submit">Use these fares</button>${route.custom ? `<button class="btn-quiet" type="button" data-fare="standard">Back to standard</button>` : ""}</div>
        </form></details>`;
  }

  function routePanel(state, id) { return routePanelBase(state, id); }
  // Each stretch of the route: its length, and how many travellers and how much freight a day would go by airship.
  function demandTable(state, legs) {
    const C = U.competition;
    const rows = legs.map(([a, b]) => {
      const m = C ? C.mult(state, a, b) : 1, pax = U.sim.dailyPassengers(a, b) * m, tons = U.sim.dailyFreight(a, b) * m;
      const comp = Math.abs(m - 1) < 0.005 ? "none" : `${m > 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%`;
      return `<tr><th scope="row">${city(a).name} to ${city(b).name}</th><td>${km(U.sim.distanceKm(a, b))}</td><td>${Math.round(pax)}</td><td>${Math.round(tons * 10) / 10}</td><td>${comp}</td></tr>`;
    }).join("");
    return `<p class="small demand-intro">Demand is how many people and how many tons a day would go by airship between two stops; it grows with the cities' size and importance, and competing trains, steamers, and airplanes take a share or add to it.</p>
      <table class="demand-table"><thead><tr><th scope="col">Stretch</th><th scope="col">Distance</th><th scope="col">Passengers a day</th><th scope="col">Tons a day</th><th scope="col">Competition</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function demandNote(state, id) {
    const r = state.routes.find(x => x.id === id); if (!r) return "";
    const stops = r.stops, C = U.competition, rows = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1], m = C ? C.mult(state, a, b) : 1;
      const pax = U.sim.dailyPassengers(a, b) * m, tons = U.sim.dailyFreight(a, b) * m;
      rows.push(`<li><b>${city(a).name}–${city(b).name}</b>: about ${Math.round(pax)} passengers and ${Math.round(tons * 10) / 10} tons a day${m !== 1 ? ` <span class="small">(competition ${m > 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%)</span>` : ""}</li>`);
    }
    return `<details class="demand-note"><summary>Demand along this route</summary>
      <p class="small">Demand is how many travellers and how much freight a day would go by airship between two cities. It grows with the size and importance of both cities, and competing trains, steamers, and airplanes take a share or add to it. Each ship carries what fits; the rest wait for the next flight. Stops further apart along the route have demand of their own too.</p>
      <ul class="plain-list">${rows.join("")}</ul></details>`;
  }
  function routePanelBase(state, id) {
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
      ${demandTable(state, legs)}
      ${faresBlock(state, route)}
      ${competitionBlock(state, route)}
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
      <div class="btn-row"><button class="btn-quiet" data-act="edit-route">Edit stops</button>
      <button class="btn-danger" data-act="delete-route">Delete route</button></div>`;
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

  // The three cabin layouts for a class, with berths and comfort for each.
  function layoutPicker(state, id) {
    const P = U.passengers, cfg = yardConfig[id] || "two", c = U.SHIP_CLASSES[id];
    const probe = cf => ({ classId: id, config: cf, condition: 1 });
    return `<div class="layouts" role="group" aria-label="Cabin layout">${P.CONFIG_ORDER.map(k => {
      const b = Math.max(1, Math.floor(c.passengers * P.CONFIGS[k].berths)), f = Math.round(b * P.CONFIGS[k].firstShare);
      return `<button class="layout" data-config="${id}:${k}" aria-pressed="${cfg === k}"><b>${P.CONFIGS[k].name}</b>
        <span>${b} berths${f && f < b ? `, ${f} first` : ""}</span><span>Comfort ${P.comfortNew(probe(k))}</span></button>`;
    }).join("")}</div>`;
  }

  const GAS_NAMES = { hydrogen: "Hydrogen", helium: "Helium", aetherium: "Aetherium" };
  function gasPicker(state, id) {
    const forced = U.sim.policyGas(state, id), g = forced || yardGas[id] || "hydrogen";
    if (forced) return `<p class="small">${GAS_NAMES[forced]}, under your gas policy.</p>`;
    const gases = ["hydrogen", "helium"].concat(U.aether.discovered(state) ? ["aetherium"] : []);
    const about = { hydrogen: "Full payload, cheap to top up", helium: `Safe; 8% less cargo; +${money(U.sim.heliumFill(state, id, "helium"))}`,
      aetherium: `Cannot burn; a fifth more cargo; +${money(U.sim.heliumFill(state, id, "aetherium"))}` };
    return `<div class="gas-pick${gases.length > 2 ? " three" : ""}" role="group" aria-label="Lifting gas">${gases.map(k => `<button data-gas="${id}:${k}" aria-pressed="${g === k}">
      <b>${GAS_NAMES[k]}</b><span>${about[k]}</span></button>`).join("")}</div>`;
  }

  // Your own designs, from the Drawing Office: ordered like the builders' ships. The first ship names the class.
  function designCards(state) {
    const list = (state.designs || []).filter(e => !(e.classId && U.SHIP_CLASSES[e.classId] && U.SHIP_CLASSES[e.classId].retired));
    const head = `<h3 class="yard-head">Your designs</h3>`;
    if (!list.length) return `${head}<p class="note">Designs from the Drawing Office appear here. <button class="btn-quiet" data-office-open>Open the Drawing Office</button></p>`;
    return head + list.map(e => {
      const cls = e.classId ? U.SHIP_CLASSES[e.classId] : null, f = U.physics.figures(state, e.d), need = U.designer.needsResearch(state, e.d);
      const price = cls ? U.sim.orderTerms(state, cls.id).price : f.price, days = cls ? U.sim.orderTerms(state, cls.id).days : f.buildDays;
      const shedOk = cls ? !!U.facilities.deliveryCity(state, cls.id) : !!f.shed && hasShed(state, f.shed.n);
      const short = Math.max(0, Math.ceil(price - state.money)), room = U.contracts.loanLimit(state) - state.loan;
      const blocked = need.length || f.status === "sink" || (state.money < price && short > room) || !shedOk;
      const sketch = designSketch(state, e, f);
      return `<section class="card${need.length ? " needs" : ""}">
        <h4>${esc(e.name)}${cls ? ` <small>class</small>` : ""}</h4>${sketch}
        <p class="card-role">${cls ? `${cls.basis}.` : "Not yet built. Ordering locks the design; its first ship names the class."}</p>
        <dl>${row("Passengers", f.planned ? `${f.berths} (${f.firstBerths} first class)` : f.berths ? `about ${f.berths}` : "None")}${row("Cargo", `${Math.round(f.cargoCap * 10) / 10} tons`)}
          ${row("Speed", `${Math.round(cls ? cls.speedKmh : f.speed)} km/h`)}${row("Range", km(cls ? cls.rangeKm : Math.round(f.range / 100) * 100))}
          ${row("Running cost", money((cls ? cls.dailyCost : f.daily) * U.ECONOMY.costFactor) + " a day")}${row("Delivery", `${Math.round(days / 30 * 2) / 2} months`)}</dl>
        <div class="card-foot"><span class="price">${money(price)}</span><button class="btn" data-order-design="${e.id}" ${blocked ? "disabled" : ""}>Order</button></div>
        ${need.length ? `<p class="note">Needs research: ${need.map(esc).join("; ")}.</p>` : f.status === "sink" ? `<p class="note">It cannot fly as drawn.</p>`
          : !shedOk ? `<p class="note">Needs a ${f.shed ? f.shed.name.toLowerCase() : "larger"} shed.</p>` : state.money < price ? `<p class="note">Not enough funds.</p>` : ""}
      </section>`;
    }).join("");
  }
  const hasShed = (state, n) => U.CITIES.some(c => (U.facilities.ownLevel(state, c.id, "shed") || 0) >= n) || (n <= 2 && U.facilities.hasPublic(state.company.home));
  function designSketch(state, e, f) {
    const L = f.L, k = 250 / L, X = x => 8 + x * k, Y = y => 26 + y * k, h = Math.max(52, e.d.D * k * 2.2);
    return `<svg class="ship-art" viewBox="0 ${-h / 2 + 26} 266 ${h}" width="266" height="${Math.round(h)}" aria-hidden="true">${U.livery.side(e.d, f, X, Y)}</svg>`;
  }
  function orderDesign(s, id) {
    const e = s.designs.find(x => x.id === id);
    const first = !e.classId, suggestion = first ? (e.d.livery.name.text || "") : U.sim.suggestName(s, e.classId);
    const name = (prompt(first ? "Name the first ship of this design. The class will take its name:" : "Name the new ship:", suggestion) || "").trim();
    if (!name) return;
    if (first) { e.name = name; }
    // Short of funds but within credit: borrow the difference first.
    const price = e.classId ? U.sim.orderTerms(s, e.classId).price : U.physics.figures(s, e.d).price, short = Math.ceil(price - s.money);
    if (short > 0) { if (!confirm(`Borrow ${money(short)} to pay for her? It adds ${money(short * U.ECONOMY.loanRate / 12)} a month in interest.`)) return; U.contracts.borrow(s, short); }
    const c = U.designClass.ensure(s, e);
    if (first) { c.name = name; c.names = [name]; }
    const ship = U.sim.order(s, c.id, name, null, c.gas);
    if (!ship) { notify("The order could not be placed."); return; }
    h.changed(); render();
    notify(`${ship.name} ordered${first ? `: the first of the ${name} class` : ""}.`);
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
        t.price += U.sim.heliumFill(state, id, U.sim.policyGas(state, id) || yardGas[id] || "hydrogen");
        const weeks = t.days < 45 ? `${Math.round(t.days / 7)} weeks` : `${Math.round(t.days / 30 * 2) / 2} months`;
        const surplus = c.kind === "surplus", left = state.surplusLeft[id] || 0;
        const deliverAt = U.facilities.deliveryCity(state, id);
        const short = Math.max(0, Math.ceil(t.price - state.money)), room = U.contracts.loanLimit(state) - state.loan;
        const otherwiseOk = !(surplus && !left) && !!deliverAt, canBorrow = short > 0 && short <= room && otherwiseOk;
        const blocked = state.money < t.price || (surplus && !left) || !deliverAt;
        return `<section class="card">
          <h4>${c.name}</h4>
          ${U.shipArt.illustration(c.art || c.kind, c.liner ? 290 : 270)}
          <p class="card-role">${c.role}. ${c.basis}.</p>
          ${c.passengers ? layoutPicker(state, id) : ""}
          ${gasPicker(state, id)}
          <dl>
            ${c.passengers ? "" : row("Passengers", "None")}
            ${row("Cargo", c.cargoTons + (c.cargoTons === 1 ? " ton" : " tons"))}
            ${row("Speed", c.speedKmh + " km/h")}
            ${row("Range", km(c.rangeKm))}
            ${row("Running cost", money(c.dailyCost * U.ECONOMY.costFactor) + " a day")}
            ${row("Delivery", weeks)}
            ${row("Service life", (surplus ? U.ECONOMY.lifeYears.surplus : U.ECONOMY.lifeYears.built) + " years")}
            ${surplus ? row("Hulls left", left ? `${left} of ${U.ECONOMY.surplusStock}` : "None") : ""}
          </dl>
          <div class="card-foot"><span class="price">${money(t.price)}${grant ? ` <small class="was">${money(t.price + grant)}</small>` : ""}</span>
            ${canBorrow ? `<button class="btn" data-borrow-order="${id}:${short}" title="Adds ${money(short * U.ECONOMY.loanRate / 12)} a month in interest">Borrow ${money(short)} and order</button>`
              : `<button class="btn" data-order="${id}" ${blocked ? "disabled" : ""}>Order</button>`}</div>
          ${!deliverAt ? `<p class="note">Needs a ${U.facilities.SIZE_NAMES[U.facilities.shipSize(id)].toLowerCase()} shed or larger to be built in: build or enlarge your own shed${U.facilities.hasPublic(state.company.home) ? " (public sheds are medium)" : ""}.</p>`
            : surplus && !left ? `<p class="note">Every surplus hull has been sold.</p>`
            : canBorrow ? `<p class="note">Borrowing the difference adds ${money(short * U.ECONOMY.loanRate / 12)} a month in interest.</p>`
            : state.money < t.price ? `<p class="note">Not enough funds${short > room ? `, and your credit falls ${money(short - room)} short` : ""}.</p>`
            : deliverAt !== state.company.home ? `<p class="note">Delivered at ${city(deliverAt).name}, where your shed is big enough.</p>` : ""}
        </section>`;
      }).join("")}
      ${designCards(state)}
      ${U.research.builtWith(state).length ? `<p class="note">New ships are built with: ${U.research.builtWith(state).map(id => U.research.techById[id].name).join(", ")}.</p>` : ""}
      ${lockedClassCards(state)}`;
  }

  // Company standing and character, shown in the Company panel.
  function reputationBlock(state) {
    const P = U.passengers, r = state.rep, co = state.company;
    const pos = (r.character + 100) / 2;
    const hist = r.history.length > 1 ? `<svg class="rep-hist" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${r.history.map((h, i) => `${i / (r.history.length - 1) * 200},${40 - h.standing * 0.4}`).join(" ")}" fill="none" stroke="var(--brass)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>` : "";
    return `
      <h3>Standing</h3>
      <div class="rep-bar"><span style="width:${r.standing}%"></span></div>
      <p class="rep-word">${P.standingWord(r.standing)}, ${Math.round(r.standing)} of 100</p>
      <p class="small">How good travelers think you are: comfort, reliability, and safety. Higher standing brings more travelers everywhere. It rises slowly and falls fast.</p>
      ${hist}
      <ul class="rep-notes">${(r.notes.standing.length ? r.notes.standing : ["Updated at the end of each month."]).map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      <h3>Character</h3>
      <div class="char-scale"><span>Affordable</span><div class="char-track"><i style="left:${pos}%"></i></div><span>Luxury</span></div>
      <p class="rep-word">${P.characterWord(r.character)}</p>
      <p class="small">What you are known for, set by your cabin layouts and fares. A luxury name draws more first-class travelers and fewer second-class; an affordable name the reverse. It changes over years, not months.</p>
      <ul class="rep-notes">${(r.notes.character.length ? r.notes.character : ["Updated at the end of each month."]).map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  }

  // Crew: captains, the hiring board, and the pool of hands.
  function traitChips(c) {
    return c.traits.map(t => { const T = U.crew.TRAITS[t]; return `<span class="trait" title="${T.good}. ${T.bad}.">${T.name}</span>`; }).join(" ");
  }
  function captainCard(state, c, hiring) {
    const C = U.crew, g = C.grade(c), ship = state.ships.find(x => x.id === c.shipId);
    const idle = state.ships.filter(x => !x.captainId && x.deliveryTick <= state.tick);
    const lines = c.traits.map(t => `<small>${C.TRAITS[t].name}: ${C.TRAITS[t].good.toLowerCase()}; ${C.TRAITS[t].bad.toLowerCase()}.</small>`).join("");
    return `<li class="cap-card"><div class="cap-head"><b>Captain ${esc(c.name)}</b><span>${g.name}, ${money(C.wage(c))} a month</span></div>
      <p class="small">${C.BACKGROUNDS[c.background].name}. ${Math.round(c.hours).toLocaleString("en-GB")} hours in command${c.blamed ? `. <span class="neg">Blamed by an inquiry${c.blamed > 1 ? ` ${c.blamed} times` : ""}</span>` : ""}${c.cleared ? `. Cleared by ${c.cleared > 1 ? c.cleared + " inquiries" : "an inquiry"}` : ""}.</p>
      <div class="traits">${traitChips(c)}</div>${lines}
      ${hiring ? `<div class="btn-row"><button class="btn" data-hire="${c.id}" ${state.money < C.wage(c) * 2 ? "disabled" : ""}>Hire, ${money(C.wage(c) * 2)} to sign</button></div>`
        : `<p class="small">${ship ? `Commands ${shipLink(ship)}.` : "Spare: without a ship."}</p><div class="btn-row">
          <select data-move-captain="${c.id}" aria-label="Move Captain ${esc(c.name)} to another ship"><option value="">${ship ? "Move to…" : "Appoint to…"}</option>
            ${state.ships.filter(x => x.id !== c.shipId && x.deliveryTick <= state.tick).map(x => { const o = state.captains.find(k => k.shipId === x.id); return `<option value="${x.id}">${esc(x.name)}${o ? ` (swap with ${esc(o.name.split(" ").slice(-1)[0])})` : " (no captain)"}</option>`; }).join("")}
            ${ship ? `<option value="__spare">Stand down to spare</option>` : ""}</select>
          <button class="btn-danger" data-dismiss="${c.id}">Dismiss</button></div>`}</li>`;
  }
  let crewTab = "crew";
  function crewPanel(state) {
    const C = U.crew, need = C.needed(state), cr = state.crew, reserve = C.reservePct(state), tgt = C.target(state);
    const idleShips = state.ships.filter(x => !x.captainId && x.deliveryTick <= state.tick);
    const tabs = `<div class="seg tabs-seg" role="group" aria-label="Crew office"><button data-crew-tab="crew" aria-pressed="${crewTab === "crew"}">Your crew</button><button data-crew-tab="board" aria-pressed="${crewTab === "board"}">Hiring board (${state.board.length})</button></div>`;
    if (crewTab === "board") return `<h2>Crew office</h2>${tabs}
      <h3>Candidates this month</h3><p class="small">A new board is posted each month; most candidates take other posts if you wait.</p>
      <ul class="cap-list">${state.board.map(c => captainCard(state, c, true)).join("") || `<li class="note">No candidates at the moment.</li>`}</ul>`;
    const commanding = state.captains.filter(c => c.shipId), spare = state.captains.filter(c => !c.shipId);
    const schools = Object.entries(state.facilities).filter(([, f]) => f.school).map(([id, f]) => `${city(id).name} (up to ${C.SCHOOL_OUTPUT[f.school]} a month)`);
    const short = tgt - cr.hands;
    return `<h2>Crew office</h2>${tabs}
      ${idleShips.length ? `<p class="status">${idleShips.map(x => esc(x.name)).join(", ")} ${idleShips.length === 1 ? "has" : "have"} no captain and cannot fly.</p>` : ""}
      <h3>Captains · ${commanding.length} commanding</h3>
      <ul class="cap-list">${commanding.map(c => captainCard(state, c, false)).join("") || `<li class="note">None.</li>`}</ul>
      <h3>Spare captains · ${spare.length}</h3>
      <ul class="cap-list">${spare.map(c => captainCard(state, c, false)).join("") || `<li class="note">None. Hire from the Hiring board.</li>`}</ul>
      <h3>Trained hands</h3>
      <dl>${row("In the pool", cr.hands)}${row("Needed by the fleet", need)}
        ${row("Your reserve", `${reserve}% spare: ${tgt} hands`)}
        ${row(short > 0 ? "Short of the reserve" : "Above the reserve", `<span class="${short > 0 ? "neg" : "pos"}">${Math.abs(short)}</span>`)}
        ${row("Skill", C.skillWord(cr.skill))}${row("Wages", `${money(cr.hands * C.HAND_WAGE)} a month`)}
        ${row("Training schools", schools.length ? schools.join(", ") : "None: build one in a city's panel")}</dl>
      <label class="field-label" for="reserve-pct">Reserve of spare hands</label>
      <div class="fund"><input type="range" id="reserve-pct" min="0" max="50" step="5" value="${reserve}"><span class="fund-read" id="reserve-read">${reserve}% above what the fleet needs</span></div>
      <div class="btn-row">${short > 0 ? `<button class="btn" data-hands-reserve>Hire to reserve: ${short} hands, ${money(short * C.HAND_FEE)}</button>` : ""}
        <button class="btn-quiet" data-hands="5">Hire 5</button><button class="btn-quiet" data-hands="-5">Let 5 go</button></div>
      <p class="small">Training schools train only while you are below your reserve, and their graduates arrive trained. Hands hired off the street are green and raise the risk of incidents until they have flown a while.</p>`;
  }

  // Settings: the accident level, changeable at any time.
  function settingsPanel(state) {
    const cur = (state.settings || {}).accidents || "golden";
    const opts = [["sheltered", "Sheltered", "Accidents damage and wreck ships, but everyone aboard always survives."],
      ["golden", "Golden age", "Mostly wrecks with everyone rescued; rarely, especially with hydrogen fire, a disaster with loss of life."],
      ["unforgiving", "Unforgiving", "Accidents more frequent and more often fatal, closer to the record of the 1920s."]];
    return `<h2>Settings</h2>
      <h3>Accidents</h3>
      <p class="small">Changes apply from now on.</p>
      <ul class="choice-list">${opts.map(([k, n, d]) => `<li><button class="${cur === k ? "btn" : "btn-quiet"}" data-accidents="${k}">${n}</button><small>${d}</small></li>`).join("")}</ul>
      <h3>Map</h3>
      <div class="btn-row"><button class="${(state.settings || {}).traffic !== false ? "btn" : "btn-quiet"}" data-traffic="on">Show traffic</button><button class="${(state.settings || {}).traffic === false ? "btn" : "btn-quiet"}" data-traffic="off">Hide traffic</button></div>
      <p class="small">Trains, steamers, and airplanes moving along the railways and steamer lanes, on the Normal and Competition layers.</p>
      <h3>Saved game</h3>
      <p class="small">The game saves itself in this browser. Save a copy to a file to keep a backup, move the game to another computer, or send it to someone.</p>
      <div class="btn-row"><button class="btn" data-save-file>Save a copy to a file</button><button class="btn-quiet" data-load-file>Load a game from a file</button></div>
      <input type="file" accept=".json,application/json" hidden id="load-game-file">
      <h3>This game</h3>
      <p class="small">Save a copy of this game to a file, to keep as a backup or move to another computer. Loading a game from a file replaces the one you are playing.</p>
      <div class="btn-row"><button class="btn-quiet" data-game-export>Save a copy to a file</button><button class="btn-quiet" data-game-import>Load a game from a file</button></div>
      <input type="file" accept=".json,application/json" hidden id="game-file">`;
  }
  // Aetherium discovered: convert now, or wait for refining to bring the price down.
  function aetherDecisionPanel(state) {
    const pass = state.ships.filter(s => U.passengers.berths(state, s).total), cap = U.aether.capacity(state);
    const fillAll = state.ships.reduce((a, s) => a + U.sim.heliumFill(state, s.classId, "aetherium"), 0);
    return `<h2>Aetherium</h2>
      <p class="sub">A gas that lifts a fifth more than hydrogen and cannot burn. Today it is costly, and only refineries can supply it; refining research will bring the price down quickly.</p>
      <p class="small">Your refineries can supply ${cap} ship${cap === 1 ? "" : "s"}${cap ? "" : ": build one in a city's panel"}. A government works opens at ${city(U.aether.capital(state)).name} in about a year. Filling the whole fleet now would cost about ${money(fillAll)}.</p>
      <ul class="choice-list">
        <li><button class="btn" data-aedecide="passenger">Convert the passenger ships</button><small>${pass.length} ship${pass.length === 1 ? "" : "s"}, each at its next overhaul.</small></li>
        <li><button class="btn" data-aedecide="all">Convert the whole fleet</button><small>Every ship at its next overhaul, and Aetherium for new orders.</small></li>
        <li><button class="btn-quiet" data-aedecide="none">Wait for the price to fall</button><small>Carry on as you are. You can convert ships one by one from their panels at any time.</small></li>
      </ul>`;
  }

  // After a disaster on hydrogen: whether to switch gas.
  function gasDecisionPanel(state) {
    const h = state.ships.filter(s => s.gas !== "helium"), hp = h.filter(s => U.passengers.berths(state, s).total);
    return `<h2>After the disaster</h2>
      <p class="sub">The inquiry will ask why the ship carried hydrogen. You have ${h.length} hydrogen ship${h.length === 1 ? "" : "s"} still flying.</p>
      <ul class="choice-list">
        <li><button class="btn" data-gasdecide="passenger">Convert the passenger ships to helium</button><small>${hp.length} ship${hp.length === 1 ? "" : "s"}, each at its next overhaul. Freighters stay on hydrogen.</small></li>
        <li><button class="btn" data-gasdecide="all">Convert the whole fleet to helium</button><small>Every ship at its next overhaul, and helium for all new orders.</small></li>
        <li><button class="btn-quiet" data-gasdecide="none">Stay the course</button><small>Keep flying hydrogen. Standing will take longer to recover.</small></li>
      </ul>`;
  }
  function insuranceBlock(state) {
    const I = state.insurance, prem = U.weather.premium(state) * 12;
    const names = { none: "None", hull: "Hull", full: "Full" };
    const about = { none: "You bear every loss yourself.", hull: "Pays a wrecked or damaged ship's value.", full: "Also covers passenger and cargo claims after an accident." };
    return `<h3>Insurance</h3>
      <div class="btn-row">${Object.keys(names).map(k => `<button class="${I.cover === k ? "btn" : "btn-quiet"}" data-cover="${k}">${names[k]}</button>`).join("")}</div>
      <p class="small">${about[I.cover]} ${I.cover !== "none" ? `About ${money(prem)} a year at present${I.factor > 1.05 ? ", raised after recent claims" : ""}.` : ""}</p>`;
  }
  function weatherPolicyBlock(state) {
    const cur = state.weatherPolicy || "cautious";
    return `<h3>Weather</h3>
      <div class="btn-row"><button class="${cur === "cautious" ? "btn" : "btn-quiet"}" data-wxpolicy="all:cautious">Cautious</button>
        <button class="${cur === "bold" ? "btn" : "btn-quiet"}" data-wxpolicy="all:bold">Bold</button></div>
      <p class="small">${cur === "cautious" ? "Ships divert round storms they know of, and wait out fog." : "Ships fly straight through: faster, but at more risk, and insurance costs a little more."} ${U.research.has(state, "operations1") ? "Your weather service shows new systems as they form." : "Without a weather service, storms less than half a day old are surprises."}</p>`;
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
    // Four columns (the Gas branch begins in Era II), Era I above the line and Era II below, then the classes they unlock.
    const R = U.research, r = state.research, cols = { engines: 40, structures: 113, operations: 186, gas: 259 };
    const W = 68, Hn = 30, y = tier => tier <= 4 ? 28 + (tier - 1) * 38 : 200 + (tier - 5) * 38;
    const cat = U.RESEARCH_CATALOG[state.company.nation] || [];
    const unlocks = cat.map((id, i) => ({ id, x: 58 + (i % 3) * 92, y: i < 3 ? 368 : 410 }));
    let lines = "", nodes = "";
    for (const u of unlocks) for (const t of U.SHIP_CLASSES[u.id].requires) {
      const tech = R.techById[t], x1 = cols[tech.branch], y1 = y(tech.tier) + Hn / 2;
      lines += `<path d="M${x1},${y1} C${x1},${y1 + 40} ${u.x},${u.y - 60} ${u.x},${u.y - 15}" class="rd-line${R.has(state, t) ? " is-done" : ""}"/>`;
    }
    for (const t of R.TECHS) {
      const x = cols[t.branch] - W / 2, yy = y(t.tier);
      const st = R.has(state, t.id) ? "done" : r.current === t.id ? "current" : R.available(state, t.id) ? "open" : "locked";
      const lab = wrapLabel(t.name);
      nodes += `<g class="rd-node is-${st}" ${st === "open" ? `data-research="${t.id}" role="button" tabindex="0"` : ""}>
        <rect x="${x}" y="${yy}" width="${W}" height="${Hn}" rx="3"/>
        ${lab.map((l, i) => `<text x="${cols[t.branch]}" y="${yy + (lab.length === 1 ? 18.5 : 12.5 + i * 10.5)}">${esc(l)}</text>`).join("")}
        ${st === "current" ? `<rect class="rd-progress" x="${x}" y="${yy + Hn - 3}" width="${W * (r.progress[t.id] || 0)}" height="3"/>` : ""}</g>`;
    }
    for (const u of unlocks) {
      const c = U.SHIP_CLASSES[u.id], open = c.requires.every(t => R.has(state, t)), lab = wrapLabel(c.name);
      nodes += `<g class="rd-unlock${open ? " is-done" : ""}"><rect x="${u.x - 43}" y="${u.y - 15}" width="86" height="30" rx="15"/>
        ${lab.map((l, i) => `<text x="${u.x}" y="${u.y + (lab.length === 1 ? 4 : -2 + i * 10.5)}">${esc(l)}</text>`).join("")}</g>`;
    }
    const heads = R.BRANCHES.map(b => `<text class="rd-head" x="${cols[b.id]}" y="16">${b.name}</text>`).join("");
    const eras = `<text class="rd-era" x="4" y="190">Era II</text><line x1="4" x2="296" y1="182" y2="182" class="rd-divider"/>
      <text class="rd-gasnote" x="${cols.gas}" y="100">Opens in Era II</text>`;
    return `<svg class="research-diagram" viewBox="0 0 300 432" role="img" aria-label="Research tree">${heads}${eras}${lines}${nodes}</svg>`;
  }

  // The funding slider's reading: the level, what it costs, and when the current project would finish.
  function fundingText(state) {
    const R = U.research, r = state.research, pct = R.fundingPct(r);
    if (!pct) return "0%: research paused";
    if (!r.current) return `${pct}% of normal${pct > 100 ? ": faster, but each step costs more" : pct < 100 ? ": slower, and cheaper" : ""}`;
    const days = R.daysLeft(state), d = U.sim.dateOf(state.tick);
    const end = new Date(d.getTime() + days * 86400000).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `${pct}% · ${money(R.monthlyCost(state))} a month · finishes about ${end}`;
  }
  function researchPanel(state) {
    const R = U.research, r = state.research;
    const cur = r.current ? R.projectInfo(state, r.current) : null;
    const pctDone = cur ? Math.round((r.progress[r.current] || 0) * 100) : 0;
    const days = cur ? R.daysLeft(state) : 0;
    const funding = `<div class="fund"><input type="range" id="fund-pct" min="0" max="200" step="10" value="${R.fundingPct(r)}" aria-label="Research funding, percent of normal">
      <span class="fund-read" id="fund-read">${fundingText(state)}</span></div>`;
    const row2 = (t, status) => `<li class="rt-${status}"><div><b>${t.name}</b><small>${t.effect}</small></div>
      ${status === "open" ? `<button class="btn-quiet" data-research="${t.id}">Research</button>` : `<span class="rt-status">${{ done: "Done", current: "In progress", locked: "Locked" }[status]}</span>`}</li>`;
    const branches = R.BRANCHES.map(b => {
      const techs = R.TECHS.filter(t => t.branch === b.id).map((t, i, arr) => (t.era === 2 && (i === 0 || !arr[i - 1].era) ? `<li class="rt-era">Era II</li>` : "")
        + row2(t, R.has(state, t.id) ? "done" : r.current === t.id ? "current" : R.available(state, t.id) ? "open" : "locked")).join("");
      const refId = "refine-" + b.id, ref = R.projectInfo(state, refId), refOpen = R.available(state, refId);
      const refRow = `<li class="rt-${r.current === refId ? "current" : refOpen ? "open" : "locked"}"><div><b>${ref.name}</b><small>${ref.effect}. Repeatable, ${money(ref.cost)}.</small></div>
        ${r.current === refId ? `<span class="rt-status">In progress</span>` : refOpen ? `<button class="btn-quiet" data-research="${refId}">Research</button>` : `<span class="rt-status">${b.id === "gas" ? "After Aetherium refining" : "After the first four"}</span>`}</li>`;
      return `<h3>${b.name}</h3><ul class="research-list">${techs}${refRow}</ul>`;
    }).join("");
    return `
      <h2>Research</h2>
      <p class="sub">One project at a time. Progress on a project is kept if you switch away from it.</p>
      ${researchDiagram(state)}
      ${cur ? `<div class="status"><b>${cur.name}</b>: ${cur.effect}.
        <div class="meter"><span style="width:${pctDone}%"></span></div>
        ${pctDone}% done, about ${days < 60 ? days + " days" : Math.round(days / 30) + " months"} left at this funding. Costs ${money(R.monthlyCost(state))} a month.</div>
        <p class="field-label">Funding</p>${funding}`
        : `<p class="status">No project under way. Choose one from the diagram or the lists below.</p>
        <p class="field-label">Funding for the next project</p>${funding}`}
      ${branches}`;
  }

  function gasPolicyBlock(state) {
    const P = state.gasPolicy || { all: null, byClass: {} };
    const opts = ["none", "hydrogen", "helium"].concat(U.aether.discovered(state) ? ["aetherium"] : []);
    const btns = (scope, cur) => opts.map(g => `<button class="${(cur || "none") === g ? "btn" : "btn-quiet"}" data-policy="${scope}:${g}">${{ none: "Ship by ship", hydrogen: "Hydrogen", helium: "Helium", aetherium: "Aetherium" }[g]}</button>`).join("");
    const classes = [...new Set(state.ships.map(s => s.classId))];
    const gasCount = g => state.ships.filter(s => s.gas === g).length;
    const ae = U.aether.discovered(state) ? ` ${gasCount("aetherium")} on Aetherium; refineries supply ${U.aether.capacity(state)}.` : "";
    return `<h3>Gas policy</h3>
      <p class="small">${gasCount("hydrogen")} on hydrogen, ${gasCount("helium")} on helium.${ae} A policy applies to new orders, and switches other ships at their next overhaul.</p>
      <p class="field-label">Whole company</p><div class="btn-row">${btns("all", P.all)}</div>
      ${classes.length > 1 || classes.length === 1 ? `<details class="own-fares"><summary>By ship class</summary>${classes.map(id => `<p class="field-label">${U.SHIP_CLASSES[id].name}</p><div class="btn-row">${btns(id, P.byClass[id])}</div>`).join("")}</details>` : ""}`;
  }

  // Which group a ship falls in for the Fleet panel's filters.
  function shipGroup(state, s) {
    if (s.deliveryTick > state.tick) return "building";
    const pos = U.map.shipPosition(s, U.progress || 0);
    if (pos.flying) return "flying";
    if ((s.overhaulUntil && pos.hour < s.overhaulUntil) || (s.readyHour > pos.hour + 12 && s.routeId)) return "out";
    return "moored";
  }

  // The fleet list: each ship's picture, name, class, route, condition, and what it is doing; sorted or grouped by class.
  let fleetSort = "class";
  function fleetRows(state, shown) {
    if (!shown.length) return `<p class="note">No ships in this group.</p>`;
    const routeOf = s => { const r = U.sim.routeOf(state, s); return r ? U.sim.routeName(r.stops, r.circuit) : "No route"; };
    const row = ({ s, g }) => {
      const c = U.SHIP_CLASSES[s.classId], SH = U.shipArt.SHADOW, art = [s.art, c.art, c.kind, "passenger"].find(k => k && SH[k] && U.shipArt.VIEW[k]);
      const muted = g === "building" || (s.overhaulUntil && s.overhaulUntil > U.sim.H(state.tick));
      return `<button class="fleet-row${muted ? " muted" : ""}" data-go="ship:${s.id}">
        <span class="fleet-art">${U.shipArt.illustration(art, 96)}</span>
        <span class="fleet-info"><b>${esc(s.name)}</b><small><i>${esc(c.name)}${c.designed ? " (own design)" : ""}</i> · ${esc(routeOf(s))}</small></span>
        <span class="fleet-right">${conditionDots(s.condition)}<small>${esc(shipStatus(state, s, U.progress || 0))}</small></span></button>`;
    };
    if (fleetSort === "class") {
      const byClass = {};
      for (const x of shown) (byClass[x.s.classId] = byClass[x.s.classId] || []).push(x);
      return Object.entries(byClass).map(([id, list]) => `<p class="fleet-group">${esc(U.SHIP_CLASSES[id].name)} · ${list.length}</p>${list.map(row).join("")}`).join("");
    }
    const sorted = [...shown].sort(fleetSort === "name" ? (a, b) => a.s.name.localeCompare(b.s.name)
      : fleetSort === "route" ? (a, b) => routeOf(a.s).localeCompare(routeOf(b.s)) : (a, b) => a.s.condition - b.s.condition);
    return sorted.map(row).join("");
  }
  // Five dots, one for each fifth of condition: green, amber from three, red at one; the exact figure on hover.
  function conditionDots(cond) {
    const n = Math.max(cond > 0 ? 1 : 0, Math.round(cond * 5)), col = n >= 4 ? "ok" : n >= 2 ? "warn" : "bad";
    return `<span class="cdots ${col}" title="Condition ${Math.round(cond * 100)}%" aria-label="Condition ${Math.round(cond * 100)} percent">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
  }
  function fleetPanel(state) {
    const counts = {}, groups = { all: 0, flying: 0, moored: 0, out: 0, building: 0 };
    const list = state.ships.map(s => ({ s, g: shipGroup(state, s) }));
    for (const { s, g } of list) { counts[s.classId] = (counts[s.classId] || 0) + 1; groups[g]++; groups.all++; }
    const names = { all: "All", flying: "Flying", moored: "Moored", out: "Out of service", building: "Being built" };
    const shown = list.filter(x => fleetFilter === "all" || x.g === fleetFilter);
    // Refits across the fleet, one row per researched improvement.
    const refitRows = U.research.TECHS.filter(t => t.fit === "ship" && U.research.has(state, t.id)).map(t => {
      const lacking = state.ships.filter(sh => U.research.refitOptions(state, sh).some(o => o.id === t.id));
      if (!lacking.length) return "";
      const cost = sh => U.research.refitOptions(state, sh).find(o => o.id === t.id).cost;
      const planned = lacking.filter(sh => (sh.refitPlan || []).includes(t.id));
      const total = lacking.reduce((a, sh) => a + cost(sh), 0);
      return `<li><details><summary><label><input type="checkbox" data-refit-all="${t.id}" ${planned.length === lacking.length ? "checked" : ""}>
          <span><b>${t.name}</b> for all ${lacking.length} ship${lacking.length > 1 ? "s" : ""} lacking it, ${money(total)}</span></label>
          <small>${planned.length} of ${lacking.length} planned. ${t.effect}.</small></summary>
        <ul class="refits">${lacking.map(sh => `<li><label><input type="checkbox" data-refit-ship="${sh.id}:${t.id}" ${(sh.refitPlan || []).includes(t.id) ? "checked" : ""}>
          <span>${esc(sh.name)}, ${money(cost(sh))}</span></label></li>`).join("")}</ul></details></li>`;
    }).join("");
    const committed = state.ships.reduce((a, sh) => a + U.research.refitOptions(state, sh).filter(o => (sh.refitPlan || []).includes(o.id)).reduce((x, o) => x + o.cost, 0), 0);
    return `
      <h2>Fleet</h2>
      <p class="sub">${state.ships.length} ship${state.ships.length === 1 ? "" : "s"}</p>
      <div class="filters">${Object.keys(names).map(k => `<button class="${fleetFilter === k ? "btn" : "btn-quiet"}" data-filter="${k}">${names[k]} ${groups[k]}</button>`).join("")}</div>
      <div class="seg fleet-sort" role="group" aria-label="Sort the fleet">${[["class", "By class"], ["name", "Name"], ["route", "Route"], ["cond", "Condition"]].map(([k, n]) => `<button data-fleet-sort="${k}" aria-pressed="${fleetSort === k}">${n}</button>`).join("")}</div>
      ${fleetRows(state, shown)}
      <button class="btn" data-open-panel="shipyard">Order a ship</button>
      ${weatherPolicyBlock(state)}
      ${gasPolicyBlock(state)}
      ${refitRows ? `<h3>Refits</h3>
        <p class="small">Tick improvements to fit at each ship's next overhaul. ${committed ? `Planned so far: ${money(committed)}.` : ""}</p>
        <ul class="fleet-refits">${refitRows}</ul>` : ""}`;
  }

  function companyPanel(state) {
    const c = state.company, T = state.totals;
    const served = new Set(state.routes.flatMap(r => r.stops));
    const counts = {};
    for (const sh of state.ships) counts[sh.classId] = (counts[sh.classId] || 0) + 1;
    return `
      <div class="company-head">${U.emblem.svg(c.emblem, 64)}<div><h2>${esc(c.name)}</h2>
        <p class="sub">${U.NATIONS[c.nation].name}, based at ${city(c.home).name}. Director ${esc(c.director)}.</p></div></div>
      ${reputationBlock(state)}
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
      const has = state.routes.some(r => r.stops.includes(k.a) && r.stops.includes(k.b));
      return `<section class="card"><h4>Mail: ${city(k.a).name} to ${city(k.b).name}</h4>
        <dl>
          ${row("Required", `${k.perWeek === 7 ? "Daily" : k.perWeek + " a week"} each way`)}
          ${row("This week", `${city(k.a).name} to ${city(k.b).name} ${k.week.ab} of ${k.perWeek}; back ${k.week.ba} of ${k.perWeek}`)}
          ${row("Pay", money(k.monthly) + " a month")}
          ${row("Reliability", rel)}
          ${row("Penalties so far", money(k.penalties))}
          ${row("Ends", shortDate(U.sim.dateAtHour(k.endHour)))}
        </dl>
        ${has ? "" : `<p class="note">No route of yours carries between these cities yet. Any route with both cities as stops counts, including through stops in between.</p>
          <button class="btn" data-draw="${k.a}:${k.b}">Draw this route</button>`}
        ${k.tutorial && state.tutorial ? "" : `<button class="btn-danger" data-drop="${k.id}">Drop contract (${money(k.monthly)} penalty)</button>`}</section>`;
    }).join("");
    const grants = state.grants.map(g => `<section class="card"><h4>Grant: ${city(g.a).name} to ${city(g.b).name}</h4>
      <dl>
        ${g.opened ? row("This month", `${g.month.ab} and ${g.month.ba} of ${U.ECONOMY.grantMinPerMonth} each way`) + row("Received", money(g.received)) + row("Ends", shortDate(U.sim.dateAtHour(g.endHour)))
          : row("Open by", shortDate(U.sim.dateAtHour(g.openBy))) + row("On opening", money(g.upfront))}
        ${row("Monthly", money(g.monthly))}
      </dl>
      ${g.opened || state.routes.some(r => r.stops.includes(g.a) && r.stops.includes(g.b)) ? "" : `<button class="btn" data-draw="${g.a}:${g.b}">Draw this route</button>`}</section>`).join("");
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

  function financesPanel(state) { return debtNote(state) + financesPanelBase(state); }
  function debtNote(state) {
    if (state.money >= 0) return "";
    const C = U.contracts, room = C.loanLimit(state) - state.loan, step = U.ECONOMY.loanStep, months = U.ECONOMY.bankruptMonths;
    const d = U.sim.dateOf(state.tick), end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const when = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    if (room >= step) return `<div class="debt-note"><b>Overdrawn by ${money(-state.money)}.</b> You can still borrow up to ${money(Math.floor(room / step) * step)}. Borrow, or earn your way back above zero, before the month ends on ${when}.</div>`;
    const strikes = state.bankruptStrikes || 0, left = months - strikes;
    return `<div class="debt-note bad"><b>Overdrawn by ${money(-state.money)}, and the banks will lend no more.</b>
      If you are still overdrawn when the month ends on ${when}, that is strike ${strikes + 1} of ${months}. ${left <= 1 ? "The next strike bankrupts the company." : `At the ${months === 3 ? "third" : months + "th"} strike in a row, the company is declared bankrupt.`}
      Getting back above zero at any month's end clears the strikes.</div>`;
  }
  function financesPanelBase(state) {
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
      ${limit - state.loan > 0 ? `<form class="loan-form" data-loan-form="borrow">
        <label for="borrow-amount" class="field-label">Borrow an amount</label>
        <div class="field"><span class="pound">£</span><input id="borrow-amount" name="amount" type="number" min="0" step="any" max="${Math.floor(limit - state.loan)}" placeholder="${Math.min(step, Math.floor(limit - state.loan))}" inputmode="numeric">
          <button type="submit" class="btn">Borrow</button></div>
        <p class="small">Up to ${money(limit - state.loan)}. Each £1,000 borrowed adds ${money(1000 * U.ECONOMY.loanRate / 12)} a month in interest.</p></form>`
        : `<p class="note">You have borrowed all the banks will lend.</p>`}
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
        return row(shipLink(s), s.deliveryTick > state.tick ? "Being built" : `<span class="${p < 0 ? "neg" : "pos"}">${money(p)}</span>`); }).join("")}</dl>
      ${insuranceBlock(state)}`;
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
    if (b.dataset.saveFile != null) { saveToFile(s); return; }
    if (b.dataset.loadFile != null) { const inp = $("#load-game-file"); inp.onchange = () => loadFromFile(inp.files[0]); inp.click(); return; }
    if (b.dataset.gameExport != null) {
      const a = document.createElement("a"), d = U.sim.dateOf(s.tick);
      a.href = URL.createObjectURL(new Blob([U.sim.exportGame(s)], { type: "application/json" }));
      a.download = `${s.company.name.replace(/[^\w\- ]+/g, "").trim() || "Up Ship"} ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}.upship-game.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      notify("Saved a copy of this game to a file."); return;
    }
    if (b.dataset.gameImport != null) { $("#game-file").click(); return; }
    if (b.dataset.fleetSort) { fleetSort = b.dataset.fleetSort; render(); return; }
    if (b.dataset.crewTab) { crewTab = b.dataset.crewTab; render(); return; }
    if (b.dataset.handsReserve != null) { const n = U.crew.hireToReserve(s); if (n) notify(`Hired ${n} hands.`); h.changed(); render(); return; }
    if (b.dataset.back != null) { const prev = navStack.pop(); if (prev) select(prev, true); return; }
    if (b.dataset.officeOpen != null) { U.designer.open(); return; }
    if (b.dataset.orderDesign) { orderDesign(s, +b.dataset.orderDesign); return; }
    if (b.dataset.borrowOrder) {
      const [id, amt] = b.dataset.borrowOrder.split(":");
      if (!U.contracts.borrow(s, +amt)) return;
      const ship = U.sim.order(s, id, undefined, yardConfig[id] || "two", yardGas[id] || "hydrogen");
      if (ship) notify(`Borrowed ${money(+amt)} and ordered ${ship.name}, ${U.SHIP_CLASSES[ship.classId].name}. Delivery ${shortDate(U.sim.dateOf(ship.deliveryTick))}.`);
      h.changed(); render(); return;
    }
    if (b.dataset.order) {
      const ship = U.sim.order(s, b.dataset.order, undefined, yardConfig[b.dataset.order] || "two", yardGas[b.dataset.order] || "hydrogen");
      if (ship) { notify(`Ordered ${ship.name}, ${U.SHIP_CLASSES[ship.classId].name}. Delivery ${shortDate(U.sim.dateOf(ship.deliveryTick))}.`); h.changed(); render(); }
      return;
    }
    if (b.dataset.appoint) { const [cid, sid] = b.dataset.appoint.split(":"); U.crew.assign(s, cid, sid); h.changed(); render(); return; }
    if (b.dataset.assign) {
      const [shipId, routeId] = b.dataset.assign.split(":");
      U.sim.assign(s, shipId, routeId || null);
      picking = null; h.changed(); render(); return;
    }
    if (b.dataset.accept) { U.contracts.accept(s, b.dataset.accept); h.changed(); render(); return; }
    if (b.dataset.drop) {
      const k = s.contracts.find(x => x.id === b.dataset.drop);
      if (k && confirm(`Drop the ${city(k.a).name}–${city(k.b).name} mail contract? The penalty is ${money(k.monthly)}, and ${k.authority === U.NATIONS[s.company.nation].name ? "your postal ministry" : "the " + k.authority + " postal authority"} will make no new offers for about six months.`)) {
        U.contracts.dropContract(s, k.id); notify("Contract dropped."); h.changed(); render();
      }
      return;
    }
    if (b.dataset.build) {
      const [cid, type] = b.dataset.build.split(":");
      if (U.facilities.build(s, cid, type)) { notify(U.facilities.TYPES[type].costs.length === 1 ? `${U.facilities.TYPES[type].name} built at ${city(cid).name}.` : `${U.facilities.TYPES[type].name} at ${city(cid).name} is now ${U.facilities.SIZE_NAMES[U.facilities.ownLevel(s, cid, type)].toLowerCase()}.`); h.changed(); render(); U.tutorial.check(selection); }
      return;
    }
    if (b.dataset.filter) { fleetFilter = b.dataset.filter; render(); return; }
    if (b.dataset.gas) { const [cid, g] = b.dataset.gas.split(":"); yardGas[cid] = g; render(); return; }
    if (b.dataset.gasSwitch) { const [sid, g] = b.dataset.gasSwitch.split(":"); const sh = s.ships.find(x => x.id === sid); sh.gasTo = g || null; h.changed(); render(); return; }
    if (b.dataset.policy) {
      const [scope, g] = b.dataset.policy.split(":"), P = s.gasPolicy = s.gasPolicy || { all: null, byClass: {} };
      const val = g === "none" ? null : g;
      if (scope === "all") P.all = val; else P.byClass[scope] = val;
      // Ships that don't match switch at their next overhaul.
      for (const sh of s.ships) { const want = U.sim.policyGas(s, sh.classId); sh.gasTo = want && want !== sh.gas ? want : (want ? null : sh.gasTo); }
      h.changed(); render(); return;
    }
    if (b.dataset.hire) { if (U.crew.hire(s, b.dataset.hire)) notify("Captain hired."); h.changed(); render(); return; }
    if (b.dataset.dismiss) { const c = s.captains.find(x => x.id === b.dataset.dismiss); if (c && confirm(`Dismiss Captain ${c.name}?`)) { U.crew.dismiss(s, c.id); h.changed(); render(); } return; }
    if (b.dataset.hands) { const n = +b.dataset.hands; if (n > 0) U.crew.hireHands(s, n); else U.crew.releaseHands(s, -n); h.changed(); render(); return; }
    if (b.dataset.staffing) { const [sid, k] = b.dataset.staffing.split(":"); s.ships.find(x => x.id === sid).staffing = k; h.changed(); render(); return; }
    if (b.dataset.traffic) { s.settings.traffic = b.dataset.traffic === "on"; h.changed(); render(); U.map.syncTransport(s); return; }
    if (b.dataset.accidents) { s.settings.accidents = b.dataset.accidents; h.changed(); render(); return; }
    if (b.dataset.cover) { s.insurance.cover = b.dataset.cover; h.changed(); render(); return; }
    if (b.dataset.wxpolicy) {
      const [who, k] = b.dataset.wxpolicy.split(":");
      if (who === "all") s.weatherPolicy = k; else s.ships.find(x => x.id === who).weatherPolicy = k || null;
      h.changed(); render(); return;
    }
    if (b.dataset.aedecide) {
      const d = b.dataset.aedecide, P = s.gasPolicy = s.gasPolicy || { all: null, byClass: {} };
      if (d === "all") { P.all = "aetherium"; for (const sh of s.ships) if (sh.gas !== "aetherium") sh.gasTo = "aetherium"; }
      if (d === "passenger") for (const sh of s.ships) if (U.passengers.berths(s, sh).total) { P.byClass[sh.classId] = "aetherium"; if (sh.gas !== "aetherium") sh.gasTo = "aetherium"; }
      notify(d === "none" ? "No conversions for now." : "Ships will be filled with Aetherium at their next overhauls. Make sure your refineries can supply them.");
      h.changed(); select(null); return;
    }
    if (b.dataset.gasdecide) {
      const d = b.dataset.gasdecide, P = s.gasPolicy = s.gasPolicy || { all: null, byClass: {} };
      if (d === "all") { P.all = "helium"; for (const sh of s.ships) if (sh.gas !== "helium") sh.gasTo = "helium"; }
      if (d === "passenger") for (const sh of s.ships) if (U.passengers.berths(s, sh).total) { P.byClass[sh.classId] = "helium"; if (sh.gas !== "helium") sh.gasTo = "helium"; }
      notify(d === "none" ? "The fleet stays on hydrogen." : "Ships will be refilled with helium at their next overhauls.");
      h.changed(); select(null); return;
    }
    if (b.dataset.config) { const [cid, cfg] = b.dataset.config.split(":"); yardConfig[cid] = cfg; render(); return; }
    if (b.dataset.fare) { const r = s.routes.find(x => x.id === selection.id); r.fare = b.dataset.fare; r.custom = null; h.changed(); render(); return; }
    if (b.dataset.reconfig) { const [sid, cfg] = b.dataset.reconfig.split(":"); const sh = s.ships.find(x => x.id === sid); sh.reconfigTo = cfg === sh.config ? null : cfg; h.changed(); render(); return; }
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
    if (b.dataset.research) { U.research.choose(s, b.dataset.research); h.changed(); render(); U.tutorial.check(selection); return; }
    if (b.dataset.funding) { U.research.setFunding(s, b.dataset.funding); h.changed(); render(); return; }
    if (b.dataset.unassign) { U.sim.assign(s, b.dataset.unassign, null); h.changed(); render(); return; }
    switch (b.dataset.act) {
      case "rename": editing = selection.id; render(); break;
      case "cancel-rename": editing = null; render(); break;
      case "pick": picking = selection.id; render(); break;
      case "cancel-pick": picking = null; render(); break;
      case "new-route": startDraft(); break;
      case "edit-route": { const r = s.routes.find(x => x.id === selection.id); startDraft(r.stops, r.id, r.circuit); break; }
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
    if (f.dataset.ownFares) {
      const r = U.state.routes.find(x => x.id === f.dataset.ownFares);
      const clamp = v => Math.max(40, Math.min(250, Math.round(+v || 100)));
      r.custom = { first: clamp(f.elements.first.value), second: clamp(f.elements.second.value) };
      h.changed(); render(); return;
    }
    if (f.dataset.loanForm) {
      const amount = +f.elements.amount.value;
      if (!(amount > 0) && (f.dataset.loanForm === "repay" || f.dataset.loanForm === "borrow")) return;
      if (f.dataset.loanForm === "borrow") {
        const got = U.contracts.borrow(U.state, amount);
        if (got) notify(`Borrowed ${money(got)}. ${money(U.state.loan)} now owed, at ${money(U.state.loan * U.ECONOMY.loanRate / 12)} a month in interest.`);
      } else if (f.dataset.loanForm === "repay") {
        const paid = U.contracts.repay(U.state, amount);
        if (paid) notify(`Repaid ${money(paid)}. ${U.state.loan ? money(U.state.loan) + " still owed." : "The loan is paid off."}`);
      } else U.contracts.setInstallment(U.state, amount);
      h.changed(); render();
    }
  }
  // Refit checkboxes in a ship's panel.
  function onPanelChange(e) {
    const all = e.target.closest("[data-refit-all]");
    if (all) {
      const tech = all.dataset.refitAll;
      for (const sh of U.state.ships) {
        if (!U.research.refitOptions(U.state, sh).some(o => o.id === tech)) continue;
        const plan = new Set(sh.refitPlan || []);
        if (all.checked) plan.add(tech); else plan.delete(tech);
        sh.refitPlan = [...plan];
      }
      h.changed(); render(); return;
    }
    const one = e.target.closest("[data-refit-ship]");
    if (one) {
      const [shipId, tech] = one.dataset.refitShip.split(":");
      const sh = U.state.ships.find(x => x.id === shipId), plan = new Set(sh.refitPlan || []);
      if (one.checked) plan.add(tech); else plan.delete(tech);
      sh.refitPlan = [...plan];
      h.changed(); render(); return;
    }
    const box = e.target.closest("[data-refit]");
    if (!box || !selection || selection.type !== "ship") return;
    const ship = U.state.ships.find(x => x.id === selection.id);
    const plan = new Set(ship.refitPlan || []);
    if (box.checked) plan.add(box.dataset.refit); else plan.delete(box.dataset.refit);
    ship.refitPlan = [...plan];
    h.changed(); render();
  }

  // Drawing a route ---------------------------------------------------------------------
  let draftRoute = null;     // the route being edited, or null for a new one
  function startDraft(stops, routeId, circuit) {
    draft = Array.isArray(stops) ? stops.slice() : [];
    draftRoute = routeId || null;
    $("#draft-circuit").checked = !!circuit;
    $("#draft .draft-title").textContent = draftRoute ? "Edit route" : "New route";
    $("#draft-create").textContent = draftRoute ? "Save route" : "Create route";
    select(null);
    $("#draft").hidden = false;
    updateDraft();
  }
  function endDraft() {
    draft = null; draftRoute = null;
    $("#draft").hidden = true;
    U.map.drawDraft(null);
  }
  function addDraftStop(id) {
    const only = U.tutorial.draftCities && U.tutorial.draftCities();
    if (only && !only.includes(id)) return;
    // Clicking a city already on the route takes it off.
    if (draft.includes(id)) { draft = draft.filter(x => x !== id); updateDraft(); return; }
    if (draft.length >= U.ECONOMY.maxStops) return;
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
    if (n) {
      const need = U.facilities.mastsNeeded(U.state, draft);
      if (n > 1) for (const g of ["hydrogen", "helium"]) {
        const gap = U.facilities.gasGap(U.state, draft, $("#draft-circuit").checked, g), G = U.facilities.GAS[g];
        if (gap.km > G.range) text += ` A ${g} ship could not top up between ${city(gap.from).name} and ${city(gap.to).name} (${km(Math.round(gap.km))}).`;
      }
      if (need.length) text += ` Needs ${need.length === 1 ? "a mast" : need.length + " masts"} at ${need.map(id => city(id).name).join(", ")}: ${money(need.length * U.facilities.TYPES.mast.costs[0])}, built when you save.`;
      if (n === 1 || n > 1) text += " Click a stop again to remove it.";
    }
    $("#draft-text").textContent = text;
    $("#draft-undo").disabled = !n;
    $("#draft-create").disabled = n < 2;
    $("#draft-circuit").disabled = n < 3;
  }

  // The map key: shows only what the current layer draws.
  let legendCollapsed = false, currentLayer = "normal";
  function renderLegend(layer) {
    currentLayer = layer;
    const A = U.facArt, it = (sw, text) => `<li><span class="sw">${sw}</span><span>${text}</span></li>`;
    const warn = `<svg viewBox="-9 -9 18 18" width="16" height="16" aria-hidden="true"><use href="#fac-warn"/></svg>`;
    const circle = cls => `<svg viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true"><circle r="6.5" class="${cls}"/></svg>`;
    const square = cls => `<svg viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true"><rect x="-6" y="-6" width="12" height="12" class="${cls}"/></svg>`;
    const ring = `<svg viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true"><circle r="6" fill="none" stroke="#5b7a80" stroke-width="1.6"/><circle r="3.5" fill="#2d2418"/></svg>`;
    const facItems = [
      it(A.icon("mast", 2, true, 24), "Your mast"), it(A.icon("terminal", 2, true, 24), "Your terminal"), it(A.icon("shed", 2, true, 24), "Your shed"),
      it(A.icon("gasplant", 1, true, 24), "Your gas plant"), it(A.icon("hestore", 1, true, 24), "Your helium store"),
      it(ring, "Public facilities here"), it(warn, "Mast or terminal running full")];
    const rows = {
      normal: facItems,
      passengers: [it(circle("demand-pax"), "Passenger demand: bigger circle, more travelers")],
      freight: [it(square("demand-freight"), "Freight demand: bigger square, more cargo")],
      facilities: [it(`${A.icon("mast", 1, true, 20)}`, "Small"), it(`${A.icon("mast", 2, true, 24)}`, "Medium"), it(`${A.icon("mast", 3, true, 28)}`, "Large"),
        it(A.icon("terminal", 2, false, 24), "Public facilities, in slate"), it(A.icon("gasplant", 1, false, 24), "Public gas supply"), it(warn, "Running full")]
    ,
      competition: [it(`<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1,5 L21,5" stroke="#3a3228" stroke-width="2.2"/><path d="M1,5 L21,5" stroke="#3a3228" stroke-width="6" stroke-dasharray="1 4"/></svg>`, "Express railway"),
        it(`<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1,5 L21,5" stroke="#3a3228" stroke-width="1.4"/><path d="M1,5 L21,5" stroke="#3a3228" stroke-width="4.5" stroke-dasharray="0.8 4"/></svg>`, "Railway"),
        it(`<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1,5 L21,5" stroke="#3f6f86" stroke-width="1.4" stroke-dasharray="5 3"/></svg>`, "Steamer or boat train"),
        it(`<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1,5 L21,5" stroke="#8a6a1c" stroke-width="1.4" stroke-dasharray="1.5 3" stroke-linecap="round"/></svg>`, "Air service")]
    }[layer];
    const title = { normal: "Key", passengers: "Key: passengers", freight: "Key: freight", facilities: "Key: facility sizes", competition: "Key: competition" }[layer];
    $("#legend").innerHTML = `<p class="legend-head"><span>${title}</span><button data-legend-toggle>${legendCollapsed ? "Show" : "Hide"}</button></p><ul>${rows.join("")}</ul>`;
    $("#legend").classList.toggle("is-collapsed", legendCollapsed);
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
    card.querySelector("[data-tg-close]").addEventListener("click", () => { closeTelegram(card, t); resumeIfClear(); });
    const open = card.querySelector("[data-tg-open]");
    if (open) open.addEventListener("click", () => U.game && U.game.keepPaused());
    if (open) open.addEventListener("click", () => { select({ type: t.target.type, id: t.target.id }); closeTelegram(card, t); });
    stack.insertBefore(card, stack.querySelector(".tg-all"));
    updateStack();
  }
  // Once no urgent telegram is left on screen, play resumes if a telegram paused it.
  function resumeIfClear() {
    if ($("#telegrams").querySelector(".telegram.is-major")) return;
    if (U.game) U.game.resumeFromTelegram();
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
