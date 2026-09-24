// New-game setup: home country, then home city, then company identity, all on the map.
window.UpShip = window.UpShip || {};
(function (U) {
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const money = n => "£" + Math.round(n).toLocaleString("en-GB");

  let step = null, nation = null, home = null, identity = null, onDone = null;

  function companyName(nationId, homeId) {
    const N = U.NATIONS[nationId].companyNames, c = U.cityById[homeId];
    let pattern = pick(N.patterns);
    if (pattern.includes("{cityer}") && !U.CITY_ADJ[homeId]) pattern = N.patterns.find(p => !p.includes("{cityer}"));
    return pattern.replace("{cityer}", U.CITY_ADJ[homeId] || "").replace("{city}", c.name)
      .replace("{adj}", N.adj ? pick(N.adj) : "").replace("{adjpl}", N.adjpl ? pick(N.adjpl) : "").replace("{of}", N.of ? pick(N.of) : "");
  }
  function directorName(nationId) { const D = U.NATIONS[nationId].directors; return pick(D.first) + " " + pick(D.last); }
  function randomEmblem() {
    const E = U.EMBLEM;
    const c1 = pick(E.mainColors);
    return { symbol: pick(E.symbols), frame: pick(E.frames), c1, c2: pick(E.trimColors.filter(c => c !== c1)) };
  }

  function start(done) {
    onDone = done;
    document.body.classList.add("is-setup");
    $("#panel").hidden = false;
    goCountry();
  }

  function goCountry() {
    step = "country"; nation = null; home = null;
    U.map.setSetup("country");
    render();
  }
  function chooseNation(id) {
    nation = id; home = null; step = "city";
    U.map.setSetup("city", { country: U.NATIONS[id].mapName, cities: homeCities(id) });
    render();
  }
  function chooseCity(id) {
    home = id;
    U.map.setSetup("city", { country: U.NATIONS[nation].mapName, cities: homeCities(nation), chosen: id });
    render();
  }
  function goIdentity() {
    step = "identity";
    identity = identity && identity.nation === nation && identity.home === home ? identity
      : { nation, home, name: companyName(nation, home), director: directorName(nation), emblem: randomEmblem() };
    U.map.setSetup("identity", { chosen: home });
    render();
  }
  const homeCities = id => U.CITIES.filter(c => c.home && U.nationOfCountry[c.country] === id).map(c => c.id);

  // Map clicks during setup.
  function handleSelect(sel) {
    if (!step) return false;
    if (!sel) return true;
    if (sel.type === "country") {
      const id = U.nationOfCountry[sel.id];
      if (id && step !== "identity") chooseNation(id);
    } else if (sel.type === "city" && step === "city") {
      const c = U.cityById[sel.id];
      if (c.home && U.nationOfCountry[c.country] === nation) chooseCity(sel.id);
      else if (c.home) { chooseNation(U.nationOfCountry[c.country]); chooseCity(sel.id); }
    } else if (sel.type === "city" && step === "country") {
      const c = U.cityById[sel.id];
      if (c.home) { chooseNation(U.nationOfCountry[c.country]); chooseCity(sel.id); }
    }
    return true;
  }

  // Panel ---------------------------------------------------------------------
  function render() {
    const body = $("#panel-body");
    body.innerHTML = step === "country" ? countryView() : step === "city" ? cityView() : identityView();
  }

  const stepLine = n => `<p class="setup-step">Step ${n} of 3</p>`;

  function countryView() {
    return `${stepLine(1)}
      <h2>Choose your country</h2>
      <p class="sub">Click a highlighted country on the map, or choose below. Your country decides which builders you order ships from.</p>
      <ul class="ledger">${U.NATION_ORDER.map(id => { const n = U.NATIONS[id];
        return `<li><button class="ledger-item" data-nation="${id}"><span>${n.name}</span><small>${n.strength}. ${n.description}</small></button></li>`; }).join("")}</ul>`;
  }

  function cityView() {
    const n = U.NATIONS[nation], E = U.ECONOMY;
    const cities = homeCities(nation).map(id => U.cityById[id]);
    const detail = home ? (() => { const c = U.cityById[home];
      return `<section class="card">
        <h4>${c.name}</h4>
        <dl>
          <div class="row"><dt>For</dt><dd>${esc(c.pro)}</dd></div>
          <div class="row"><dt>Against</dt><dd>${esc(c.con)}</dd></div>
          <div class="row"><dt>Starting effect</dt><dd>${c.works
            ? `Ships built ${Math.round((1 - E.worksBuildFactor) * 100)}% faster and ${Math.round((1 - E.worksPriceFactor) * 100)}% cheaper`
            : `${money(E.noWorksBonus)} extra starting funds`}</dd></div>
        </dl></section>`; })() : "";
    return `${stepLine(2)}
      <h2>Choose your home city</h2>
      <p class="sub">${n.name}: ${n.strength.toLowerCase()}. Click a highlighted city on the map, or choose below.</p>
      <ul class="ledger">${cities.map(c => `<li><button class="ledger-item${c.id === home ? " is-chosen" : ""}" data-home="${c.id}">
        <span>${c.name}</span><small>${c.works ? "Airship works" : "No works, extra funds"}</small></button></li>`).join("")}</ul>
      ${detail}
      <div class="setup-actions">
        <button class="btn-quiet" data-setup="back-country">Back</button>
        <button class="btn" data-setup="to-identity" ${home ? "" : "disabled"}>Next</button>
      </div>`;
  }

  function identityView() {
    const E = U.EMBLEM, e = identity.emblem;
    const swatch = (list, key) => list.map(c => `<button class="swatch${e[key] === c ? " is-chosen" : ""}" style="background:${c}" data-color="${key}:${c}" aria-label="Color ${c}"></button>`).join("");
    return `${stepLine(3)}
      <h2>Found your company</h2>
      <p class="sub">Based in ${U.cityById[home].name}. Change anything you like.</p>
      <label class="field-label" for="co-name">Company name</label>
      <div class="field"><input id="co-name" value="${esc(identity.name)}" maxlength="48" autocomplete="off">
        <button class="btn-quiet" data-setup="random-name">Randomize</button></div>
      <label class="field-label" for="co-director">Director</label>
      <div class="field"><input id="co-director" value="${esc(identity.director)}" maxlength="36" autocomplete="off">
        <button class="btn-quiet" data-setup="random-director">Randomize</button></div>
      <div class="emblem-preview">${U.emblem.svg(e, 96)}<button class="btn-quiet" data-setup="random-emblem">Randomize emblem</button></div>
      <p class="field-label">Symbol</p>
      <div class="choices">${E.symbols.map(s => `<button class="choice${e.symbol === s ? " is-chosen" : ""}" data-symbol="${s}" title="${E.symbolNames[s]}" aria-label="${E.symbolNames[s]}">${U.emblem.symbolIcon(s, "currentColor")}</button>`).join("")}</div>
      <p class="field-label">Frame</p>
      <div class="choices">${E.frames.map(f => `<button class="choice${e.frame === f ? " is-chosen" : ""}" data-frame="${f}" title="${E.frameNames[f]}" aria-label="${E.frameNames[f]}">${U.emblem.frameIcon(f, "currentColor")}</button>`).join("")}</div>
      <p class="field-label">Main color, used for your ships and routes</p>
      <div class="choices">${swatch(E.mainColors, "c1")}</div>
      <p class="field-label">Trim color</p>
      <div class="choices">${swatch(E.trimColors, "c2")}</div>
      <label class="tutorial-check"><input type="checkbox" id="co-tutorial" ${identity.tutorial === false ? "" : "checked"}> Play the tutorial (recommended for your first company)</label>
      <div class="setup-actions">
        <button class="btn-quiet" data-setup="back-city">Back</button>
        <button class="btn" data-setup="found">Found the company</button>
      </div>`;
  }

  function readFields() {
    const n = $("#co-name"), d = $("#co-director"), t = $("#co-tutorial");
    if (t) identity.tutorial = t.checked;
    if (n) identity.name = n.value;
    if (d) identity.director = d.value;
  }

  function onClick(e) {
    if (!step) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.nation) { chooseNation(b.dataset.nation); return; }
    if (b.dataset.home) { chooseCity(b.dataset.home); return; }
    if (step === "identity") readFields();
    if (b.dataset.symbol) { identity.emblem.symbol = b.dataset.symbol; render(); return; }
    if (b.dataset.frame) { identity.emblem.frame = b.dataset.frame; render(); return; }
    if (b.dataset.color) { const [k, c] = b.dataset.color.split(":"); identity.emblem[k] = c; render(); return; }
    switch (b.dataset.setup) {
      case "back-country": goCountry(); break;
      case "to-identity": goIdentity(); break;
      case "back-city": step = "city"; chooseCity(home); break;
      case "random-name": identity.name = companyName(nation, home); render(); break;
      case "random-director": identity.director = directorName(nation); render(); break;
      case "random-emblem": identity.emblem = randomEmblem(); render(); break;
      case "found": {
        const name = identity.name.trim(), director = identity.director.trim();
        if (!name) { $("#co-name").focus(); return; }
        step = null;
        document.body.classList.remove("is-setup");
        U.map.setSetup(null);
        onDone({ nation, home, name, director: director || directorName(nation), emblem: identity.emblem, tutorial: identity.tutorial !== false });
      }
    }
  }

  function init() { $("#panel-body").addEventListener("click", onClick); }

  U.setup = { init, start, handleSelect, active: () => !!step };
})(window.UpShip);
