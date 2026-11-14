// Grand terminals: a signature port laid out on its own site plan. Founding one at a city replaces that port's mast,
// terminal, shed, and gas supply with pieces placed on a field; what stands on the field decides what the port can do.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim, F = () => U.facilities;
  const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
  const FOUND = 150000;                                 // the land, the first plot, and the starting set
  const REFUND = 0.5;                                   // of a piece's price, when it is taken down
  // The field, in cells of about forty metres. Each larger plot is bought in turn.
  const PLOTS = [{ w: 14, h: 9, cost: 0 }, { w: 18, h: 11, cost: 25000 }, { w: 22, h: 13, cost: 40000 }, { w: 26, h: 15, cost: 60000 }];
  // Pieces: footprint w by h cells, price, and what each does. `apron` is the clear strip a shed needs before its doors.
  const PIECES = {
    mast: { name: "Mooring mast", w: 2, h: 2, cost: 6000, group: "Flying side", about: "One berth. A ship swings round it, so its circle stays clear." },
    shed1: { name: "Small shed", w: 4, h: 2, apron: 2, cost: 15000, shed: 1, group: "Flying side", about: "Overhauls and builds small ships. Needs clear field before its doors." },
    shed2: { name: "Medium shed", w: 5, h: 2, apron: 2, cost: 39000, shed: 2, group: "Flying side", about: "Overhauls and builds medium ships." },
    shed3: { name: "Great shed", w: 7, h: 3, apron: 3, cost: 87000, shed: 3, group: "Flying side", about: "Overhauls and builds every ship." },
    gasplant: { name: "Gas plant", w: 2, h: 2, cost: 4000, one: true, group: "Flying side", about: "Hydrogen for your ships here." },
    hestore: { name: "Helium store", w: 2, h: 2, cost: 6000, one: true, group: "Flying side", about: "Helium by the trainload: much cheaper here inland." },
    works: { name: "Workshops", w: 3, h: 2, cost: 20000, one: true, group: "Flying side", about: "Overhauls here cost a quarter less. Needs a shed." },
    hall1: { name: "Terminal building, modest", w: 4, h: 2, cost: 17000, hall: 1, group: "Passenger side", about: "300 passengers and 100 tons a day." },
    hall2: { name: "Terminal building, large", w: 6, h: 2, cost: 62000, hall: 2, group: "Passenger side", about: "No limit on passengers or cargo, and 10% more demand." },
    hall3: { name: "Terminal building, grand", w: 8, h: 3, cost: 172000, hall: 3, group: "Passenger side", about: "No limit, 18% more demand, and concessions earn half as much again." },
    restaurant: { name: "Restaurant", w: 2, h: 2, cost: 20000, one: true, perPax: 0.12, group: "Passenger side", about: "Earns about 2s 5d from each passenger boarding here." },
    hotel: { name: "Hotel", w: 3, h: 2, cost: 60000, one: true, perPax: 0.3, group: "Passenger side", about: "Earns about 6s from each passenger boarding here." },
    freight: { name: "Freight and mail shed", w: 3, h: 2, cost: 12000, tons: 150, group: "Goods side", about: "150 tons a day more through a modest terminal building." },
    halt: { name: "Railway halt", w: 4, h: 1, cost: 30000, one: true, edge: true, demand: 0.08, group: "Connections", about: "8% more demand. Stands at the edge of the field, where the line comes in." },
    tram: { name: "Tram stop", w: 2, h: 1, cost: 10000, one: true, edge: true, demand: 0.04, group: "Connections", about: "4% more demand. Stands at the edge of the field." },
    terrace: { name: "Viewing terrace", w: 3, h: 1, cost: 8000, one: true, show: 1, group: "Show", about: "For the crowds who come to watch. Adds to the company's standing." },
    gardens: { name: "Gardens", w: 2, h: 2, cost: 5000, max: 3, show: 1, group: "Show", about: "Adds to the company's standing." },
    clock: { name: "Clock tower", w: 1, h: 1, cost: 12000, one: true, show: 2, group: "Show", about: "A landmark. Adds to the company's standing." }
  };
  const HALLS = ["hall1", "hall2", "hall3"], MANAGED = ["mast", "terminal", "shed", "gasplant", "hestore"];
  const all = state => (state.grand = state.grand || {});
  const get = (state, id) => all(state)[id] || null;
  const plot = g => PLOTS[g.plot];
  const count = (g, k) => g.pieces.filter(p => p.k === k).length;
  const hallOf = g => g.pieces.find(p => PIECES[p.k].hall);

  // Geometry -------------------------------------------------------------------------------------------------------
  // A piece's cells. Sheds turn four ways (their doors face right, down, left, up); everything else two.
  function box(p) { const T = PIECES[p.k], odd = p.r % 2 === 1; return { x: p.x, y: p.y, w: odd ? T.h : T.w, h: odd ? T.w : T.h }; }
  function apron(p) {
    const T = PIECES[p.k]; if (!T.apron) return null;
    const b = box(p), a = T.apron;
    return [{ x: b.x + b.w, y: b.y, w: a, h: b.h }, { x: b.x, y: b.y + b.h, w: b.w, h: a }, { x: b.x - a, y: b.y, w: a, h: b.h }, { x: b.x, y: b.y - a, w: b.w, h: a }][p.r % 4];
  }
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inside = (b, P) => b.x >= 0 && b.y >= 0 && b.x + b.w <= P.w && b.y + b.h <= P.h;
  // Why a piece cannot stand where it is put, or "" if it can. `skip` is a piece being moved or replaced.
  function problem(g, p, skip) {
    const T = PIECES[p.k], P = plot(g), b = box(p), ap = apron(p);
    if (!inside(b, P)) return "It would stand outside the field.";
    if (ap && !inside(ap, P)) return "A shed needs clear field before its doors.";
    if (T.edge && !(b.x === 0 || b.y === 0 || b.x + b.w === P.w || b.y + b.h === P.h)) return "It must stand at the edge of the field.";
    for (const q of g.pieces) {
      if (q === skip || q.id === (skip && skip.id)) continue;
      const qb = box(q), qa = apron(q);
      if (hit(b, qb)) return "Something already stands there.";
      if (ap && hit(ap, qb)) return "A shed needs clear field before its doors.";
      if (qa && hit(b, qa)) return "That would block a shed's doors.";
    }
    return "";
  }
  // Whether one more of a kind may be built at all (apart from where).
  function allowed(g, k) {
    const T = PIECES[k];
    if (T.hall) return "The terminal building is enlarged, not built twice.";
    if (T.one && count(g, k)) return "One is enough.";
    if (T.max && count(g, k) >= T.max) return "No more of these.";
    if (k === "mast" && count(g, k) >= 8) return "Eight masts is the most a field can work.";
    if (T.shed && g.pieces.some(p => PIECES[p.k].shed)) return "One shed to a field: take the old one down first, or enlarge it.";
    if (k === "works" && !g.pieces.some(p => PIECES[p.k].shed)) return "Workshops need a shed.";
    return "";
  }
  // The first place a piece fits, scanning the field in the order given.
  function fit(g, k, order) {
    const P = plot(g), T = PIECES[k], turns = T.apron ? [0, 1, 2, 3] : T.w === T.h ? [0] : [0, 1];
    for (const [x, y] of order(P)) for (const r of turns) { const p = { k, x, y, r }; if (!problem(g, p)) return p; }
    return null;
  }
  const scan = { top: P => cells(P, (a, b) => a[1] - b[1] || Math.abs(a[0] - P.w / 2 + 2) - Math.abs(b[0] - P.w / 2 + 2)), bottom: P => cells(P, (a, b) => b[1] - a[1] || a[0] - b[0]),
    left: P => cells(P, (a, b) => a[0] - b[0] || b[1] - a[1]), right: P => cells(P, (a, b) => b[0] - a[0] || a[1] - b[1]) };
  function cells(P, sort) { const out = []; for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) out.push([x, y]); return out.sort(sort); }

  // What the field provides ------------------------------------------------------------------------------------------
  function effects(state, id) {
    const g = get(state, id); if (!g) return null;
    const hall = hallOf(g), hl = hall ? PIECES[hall.k].hall : 0, shed = Math.max(0, ...g.pieces.map(p => PIECES[p.k].shed || 0));
    const sum = f => g.pieces.reduce((a, p) => a + (PIECES[p.k][f] || 0), 0);
    return { masts: count(g, "mast"), shed, gasplant: count(g, "gasplant"), hestore: count(g, "hestore"), hall: hl, works: count(g, "works") > 0,
      pax: hl >= 2 ? Infinity : hl === 1 ? 300 : 40, tons: hl >= 2 ? Infinity : (hl === 1 ? 100 : 15) + sum("tons"),
      demand: 1 + [0, 0, 0.1, 0.18][hl] + sum("demand"), perPax: sum("perPax") * (hl === 3 ? 1.5 : 1), show: sum("show") + [0, 0, 1, 3][hl] };
  }
  // The ordinary facility levels the rest of the game reads, kept in step with the field.
  function sync(state, id) {
    const e = effects(state, id); if (!e) return;
    const f = state.facilities[id] = state.facilities[id] || { mast: 0, terminal: 0, shed: 0 };
    f.mast = e.masts >= 6 ? 3 : e.masts >= 3 ? 2 : e.masts ? 1 : 0;
    f.terminal = e.hall >= 2 ? 3 : e.hall ? 2 : 0; f.shed = e.shed; f.gasplant = e.gasplant ? 1 : 0; f.hestore = e.hestore ? 1 : 0;
  }
  const spend = (state, id, cost) => { state.money -= cost; state.facilityCost[id] = (state.facilityCost[id] || 0) + cost; state.year.facilities = (state.year.facilities || 0) + cost; };

  // Founding ----------------------------------------------------------------------------------------------------------
  function canFound(state, id) {
    if (get(state, id)) return "There is a grand terminal here already.";
    if (!S().hasRights(state, id)) return "You need landing rights here first.";
    if (!F().ownLevel(state, id, "mast")) return "You need your own mast here first.";
    if (state.money < FOUND) return `It costs ${gbp(FOUND)} to found one.`;
    return "";
  }
  // The port's present mast, terminal, shed, and gas supply are carried onto the field at their present size, with the
  // starting set (a mast, a modest terminal building, a gas supply) made up where anything is missing.
  function found(state, id) {
    if (canFound(state, id)) return false;
    const own = k => F().ownLevel(state, id, k), want = [];
    want.push([own("terminal") >= 3 ? "hall2" : "hall1", scan.top]);
    if (own("shed")) want.push(["shed" + own("shed"), scan.left]);
    const gas = [];
    if (own("gasplant")) gas.push("gasplant"); if (own("hestore")) gas.push("hestore");
    if (!gas.length) gas.push(state.company.nation === "usa" ? "hestore" : "gasplant");
    for (const k of gas) want.push([k, scan.right]);
    for (let i = 0; i < Math.max(1, [0, 1, 3, 6][own("mast")]); i++) want.push(["mast", scan.bottom]);
    let g = null;
    for (let size = 0; size < PLOTS.length && !g; size++) {                // the smallest field that holds it all
      const t = { plot: size, pieces: [], next: 1, founded: state.tick, earned: 0 }; let ok = true;
      for (const [k, order] of want) { const p = fit(t, k, order); if (!p) { ok = false; break; } p.id = t.next++; t.pieces.push(p); }
      if (ok) g = t;
    }
    if (!g) return false;
    all(state)[id] = g; spend(state, id, FOUND); sync(state, id);
    return true;
  }

  // Changing the field ------------------------------------------------------------------------------------------------
  function place(state, id, p) {
    const g = get(state, id), T = PIECES[p.k];
    const why = allowed(g, p.k) || problem(g, p) || (state.money < T.cost ? "Not enough funds." : "");
    if (why) return why;
    g.pieces.push({ k: p.k, x: p.x, y: p.y, r: p.r || 0, id: g.next++ }); spend(state, id, T.cost); sync(state, id);
    return "";
  }
  function move(state, id, pid, x, y, r) {
    const g = get(state, id), p = g.pieces.find(q => q.id === pid), to = { k: p.k, x, y, r, id: p.id }, why = problem(g, to, p);
    if (why) return why;
    p.x = x; p.y = y; p.r = r; return "";
  }
  function canRemove(g, p) {
    const T = PIECES[p.k];
    if (T.hall) return "The terminal building stays: it can be enlarged or moved.";
    if (p.k === "mast" && count(g, "mast") <= 1) return "A port needs one mast at least.";
    if (T.shed && count(g, "works")) return "Take the workshops down first: they need a shed.";
    return "";
  }
  function remove(state, id, pid) {
    const g = get(state, id), p = g.pieces.find(q => q.id === pid), why = canRemove(g, p);
    if (why) return why;
    g.pieces = g.pieces.filter(q => q !== p);
    const back = PIECES[p.k].cost * REFUND; state.money += back; state.facilityCost[id] = Math.max(0, (state.facilityCost[id] || 0) - PIECES[p.k].cost); sync(state, id);
    return "";
  }
  // Enlarging: the terminal building or the shed gives way to the next size, for the difference in price.
  function nextSize(g, p) {
    const T = PIECES[p.k], k = T.hall ? HALLS[T.hall] : T.shed ? (T.shed < 3 ? "shed" + (T.shed + 1) : null) : null;
    return k ? { k, cost: PIECES[k].cost - T.cost } : null;
  }
  function enlarge(state, id, pid) {
    const g = get(state, id), p = g.pieces.find(q => q.id === pid), n = nextSize(g, p);
    if (!n) return "It is as large as it can be.";
    if (state.money < n.cost) return "Not enough funds.";
    const to = { k: n.k, x: p.x, y: p.y, r: p.r, id: p.id };
    let why = problem(g, to, p);
    if (why) {                                                           // no room where it stands: anywhere it fits will do
      const rest = { plot: g.plot, pieces: g.pieces.filter(q => q !== p) }, f = fit(rest, n.k, PIECES[n.k].hall ? scan.top : scan.left);
      if (!f) return "There is no room for it on this field: clear some ground or buy more land.";
      to.x = f.x; to.y = f.y; to.r = f.r;
    }
    Object.assign(p, to); spend(state, id, n.cost); sync(state, id);
    return "";
  }
  function buyLand(state, id) {
    const g = get(state, id), n = PLOTS[g.plot + 1];
    if (!n) return "The field is as large as it can be.";
    if (state.money < n.cost) return "Not enough funds.";
    g.plot++; spend(state, id, n.cost);
    return "";
  }

  // Running -----------------------------------------------------------------------------------------------------------
  // Concessions: the restaurant and hotel earn from every passenger who boards here.
  function boarded(state, id, pax) {
    const e = effects(state, id); if (!e || !e.perPax || !pax) return;
    const amount = pax * e.perPax; S().addIncome(state, amount, "concessions"); get(state, id).earned = (get(state, id).earned || 0) + amount;
  }
  // Show: terraces, gardens, clock towers, and fine terminal buildings add a little to the company's standing each month.
  function monthly(state) {
    const pts = Object.keys(all(state)).reduce((a, id) => a + effects(state, id).show, 0);
    if (pts && state.rep && typeof state.rep === "object") state.rep.standing = Math.max(0, Math.min(100, (+state.rep.standing || 50) + Math.min(0.5, pts * 0.04)));
  }
  function summary(state, id) {
    const g = get(state, id), e = effects(state, id), size = F().SIZE_NAMES[e.shed];
    return { e, built: g.pieces.reduce((a, p) => a + PIECES[p.k].cost, 0), upkeep: (state.facilityCost[id] || 0) * F().UPKEEP,
      rows: [["Berths", e.masts], ["Shed", e.shed ? size : "None"], ["Gas", [e.gasplant ? "Hydrogen" : "", e.hestore ? (e.gasplant ? "helium" : "Helium") : ""].filter(Boolean).join(" and ") || "None of your own"],
        ["Passengers a day", e.pax === Infinity ? "No limit" : e.pax], ["Cargo a day", e.tons === Infinity ? "No limit" : e.tons + " tons"],
        ["Passenger demand", e.demand > 1 ? `${Math.round((e.demand - 1) * 100)}% more` : "As the city's"], ["Concessions", e.perPax ? `${gbp(e.perPax * 100)} per 100 passengers` : "None"],
        ["Overhauls", e.works ? "A quarter cheaper" : e.shed ? "At the usual price" : "No shed"], ["Standing", e.show ? `Rises a little each month` : "No effect"]] };
  }

  // The site plan screen ------------------------------------------------------------------------------------------------
  let root = null, cityId = null, tool = null, sel = null, ghost = null, msg = "";
  const C = 40;                                                  // drawing units to a cell
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function open(id) {
    if (!U.state || !get(U.state, id)) return;
    cityId = id; tool = null; sel = null; ghost = null; msg = "";
    if (!root) {
      root = document.createElement("div"); root.className = "grand-office"; document.body.appendChild(root);
      root.addEventListener("click", click); root.addEventListener("mousemove", hover);
      document.addEventListener("keydown", e => { if (!root || root.hidden) return; if (e.key === "Escape") { if (tool) { tool = null; ghost = null; render(); } else close(); } if ((e.key === "r" || e.key === "R") && tool) { turn(); } });
    }
    root.hidden = false; document.body.classList.add("office-open"); render();
  }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove("office-open"); S().save(U.state); if (U.ui && U.ui.render) U.ui.render(); }
  function turn() { const T = PIECES[tool.k]; tool.r = ((tool.r || 0) + 1) % (T.apron ? 4 : T.w === T.h ? 1 : 2); if (ghost) ghost.r = tool.r; drawGhost(); }

  function pieceSvg(p, cls) {
    const T = PIECES[p.k], b = box(p), x = b.x * C, y = b.y * C, w = b.w * C, h = b.h * C, ap = apron(p);
    let art = "";
    if (p.k === "mast") art = `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2 - 3}" class="g-circle"/><path d="M${x + w / 2 - 5},${y + h / 2 + 5} L${x + w / 2},${y + h / 2 - 7} L${x + w / 2 + 5},${y + h / 2 + 5} Z" class="g-steel"/><circle cx="${x + w / 2}" cy="${y + h / 2 - 7}" r="2.2" class="g-steel"/>`;
    else if (T.shed) {
      const along = p.r % 2 === 0; let ribs = "";
      for (let i = 1; i < (along ? b.w : b.h) * 2; i++) ribs += along ? `<line x1="${x + i * C / 2}" y1="${y + 3}" x2="${x + i * C / 2}" y2="${y + h - 3}"/>` : `<line x1="${x + 3}" y1="${y + i * C / 2}" x2="${x + w - 3}" y2="${y + i * C / 2}"/>`;
      const door = [[x + w, y + 4, x + w, y + h - 4], [x + 4, y + h, x + w - 4, y + h], [x, y + 4, x, y + h - 4], [x + 4, y, x + w - 4, y]][p.r % 4];
      art = `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="6" class="g-roof g-shed"/><g class="g-ribs">${ribs}</g>${along ? `<line x1="${x + 4}" y1="${y + h / 2}" x2="${x + w - 4}" y2="${y + h / 2}" class="g-ridge"/>` : `<line x1="${x + w / 2}" y1="${y + 4}" x2="${x + w / 2}" y2="${y + h - 4}" class="g-ridge"/>`}
        <line x1="${door[0]}" y1="${door[1]}" x2="${door[2]}" y2="${door[3]}" class="g-door"/>`;
    } else if (p.k === "gardens") art = `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="8" class="g-green"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 5}" class="g-pond"/><path d="M${x + 6},${y + h / 2} H${x + w - 6} M${x + w / 2},${y + 6} V${y + h - 6}" class="g-path"/>`;
    else if (p.k === "clock") art = `<rect x="${x + 9}" y="${y + 9}" width="${w - 18}" height="${h - 18}" class="g-roof g-hall"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="6" class="g-face"/><path d="M${x + w / 2},${y + h / 2} v-4 M${x + w / 2},${y + h / 2} h3" class="g-path"/>`;
    else if (p.k === "halt" || p.k === "tram") {
      const along = b.w >= b.h;
      art = `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" class="g-platform"/>${along ? `<path d="M${x},${y + h * 0.3} H${x + w} M${x},${y + h * 0.45} H${x + w}" class="g-rail"/><rect x="${x + w * 0.25}" y="${y + h * 0.58}" width="${w * 0.5}" height="${h * 0.3}" class="g-roof g-hall"/>`
        : `<path d="M${x + w * 0.3},${y} V${y + h} M${x + w * 0.45},${y} V${y + h}" class="g-rail"/><rect x="${x + w * 0.58}" y="${y + h * 0.25}" width="${w * 0.3}" height="${h * 0.5}" class="g-roof g-hall"/>`}`;
    } else if (p.k === "terrace") art = `<rect x="${x + 2}" y="${y + 6}" width="${w - 4}" height="${h - 12}" class="g-platform"/><path d="M${x + 4},${y + 8} H${x + w - 4} M${x + 4},${y + h - 8} H${x + w - 4}" class="g-path"/>`;
    else {
      const kind = T.hall || p.k === "hotel" || p.k === "restaurant" ? "g-hall" : "g-plain", inset = T.hall ? 5 : 4;
      art = `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" class="g-roof ${kind}"/><rect x="${x + 2 + inset}" y="${y + 2 + inset}" width="${w - 4 - inset * 2}" height="${h - 4 - inset * 2}" class="g-inner"/>
        ${T.hall ? `<rect x="${x + w / 2 - C * 0.6}" y="${y + h - 9}" width="${C * 1.2}" height="7" class="g-porch"/>${T.hall >= 3 ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${C * 0.45}" class="g-dome"/>` : ""}` : ""}
        ${p.k === "gasplant" || p.k === "hestore" ? `<circle cx="${x + w * 0.33}" cy="${y + h * 0.4}" r="${w * 0.17}" class="g-tank"/><circle cx="${x + w * 0.67}" cy="${y + h * 0.6}" r="${w * 0.17}" class="g-tank"/>` : ""}`;
    }
    const short = { mast: "", shed1: "Shed", shed2: "Shed", shed3: "Great shed", gasplant: "Gas", hestore: "Helium", works: "Works", hall1: "Terminal", hall2: "Terminal", hall3: "Grand terminal", restaurant: "Restaurant", hotel: "Hotel",
      freight: "Freight", halt: "Railway halt", tram: "Tram", terrace: "Terrace", gardens: "", clock: "" }[p.k];
    return `<g class="g-piece ${cls || ""}" data-pid="${p.id || ""}">${ap ? `<rect x="${ap.x * C + 3}" y="${ap.y * C + 3}" width="${ap.w * C - 6}" height="${ap.h * C - 6}" class="g-apron"/>` : ""}
      ${art}${short ? (b.w < b.h && b.w <= 3 ? `<text transform="translate(${x + w / 2 + 4},${y + h / 2 + (T.hall >= 3 ? C * 1.6 : 0)}) rotate(-90)" class="g-label">${short}</text>` : `<text x="${x + w / 2}" y="${y + h / 2 + (T.hall >= 3 ? C * 0.95 : 4)}" class="g-label${b.w <= 2 ? " small" : ""}">${short}</text>`) : ""}<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" class="g-hit"/></g>`;
  }
  function fieldSvg(g) {
    const P = plot(g), W = P.w * C, H = P.h * C; let grid = "";
    for (let x = 1; x < P.w; x++) grid += `<line x1="${x * C}" y1="0" x2="${x * C}" y2="${H}"/>`;
    for (let y = 1; y < P.h; y++) grid += `<line x1="0" y1="${y * C}" x2="${W}" y2="${y * C}"/>`;
    return `<svg class="g-svg" viewBox="${-C / 2} ${-C / 2} ${W + C} ${H + C}" preserveAspectRatio="xMidYMid meet">
      <rect x="${-C / 2}" y="${-C / 2}" width="${W + C}" height="${H + C}" class="g-beyond"/><rect x="0" y="0" width="${W}" height="${H}" class="g-grass"/><g class="g-grid">${grid}</g><rect x="0" y="0" width="${W}" height="${H}" class="g-fence"/>
      ${g.pieces.map(p => pieceSvg(p, p.id === sel ? "sel" : "")).join("")}<g class="g-ghost"></g></svg>`;
  }
  function render() {
    const st = U.state, g = get(st, cityId), c = U.cityById[cityId], s = summary(st, cityId), next = PLOTS[g.plot + 1];
    const groups = {}; for (const [k, T] of Object.entries(PIECES)) if (!T.hall) (groups[T.group] = groups[T.group] || []).push(k);
    const palette = Object.entries(groups).map(([name, ks]) => `<h3>${name}</h3>${ks.map(k => { const T = PIECES[k], no = allowed(g, k) || (st.money < T.cost ? "Not enough funds." : "");
      return `<button class="g-item${tool && tool.k === k ? " on" : ""}" data-gpiece="${k}" ${no ? "disabled" : ""} title="${esc(no || T.about)}"><b>${T.name}</b><span>${gbp(T.cost)}</span><small>${esc(no && no !== "Not enough funds." ? no : T.about)}</small></button>`; }).join("")}`).join("");
    const p = sel && g.pieces.find(q => q.id === sel), T = p && PIECES[p.k], n = p && nextSize(g, p);
    const chosen = p ? `<div class="g-chosen"><h3>${T.name}</h3><p>${esc(T.about)}</p>
      <button data-g="move">Move</button>${n ? `<button data-g="enlarge" ${st.money < n.cost ? "disabled" : ""}>Enlarge to ${PIECES[n.k].name.toLowerCase().replace("terminal building, ", "")}, ${gbp(n.cost)}</button>` : ""}
      ${canRemove(g, p) ? "" : `<button data-g="remove">Take down, ${gbp(T.cost * REFUND)} back</button>`}</div>` : `<p class="g-hint">${tool ? `Click the field to ${tool.moving ? "set it down" : "build"}. R turns it; Esc puts it away.` : "Choose a piece to build, or click one on the field to move, enlarge, or take it down."}</p>`;
    root.innerHTML = `<header class="g-bar"><div><h1>${esc(c.name)} Grand Terminal</h1><span class="g-sub">Site plan</span></div><span class="g-money">Funds ${gbp(st.money)}</span><button data-g="close">Close</button></header>
      <div class="g-body"><aside class="g-palette">${palette}</aside>
      <main class="g-field">${fieldSvg(g)}<p class="g-msg">${esc(msg)}</p></main>
      <aside class="g-summary">${chosen}<h3>What this port provides</h3><dl>${s.rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>
        <h3>Money</h3><dl><dt>Buildings standing</dt><dd>${gbp(s.built)}</dd><dt>Upkeep</dt><dd>${gbp(s.upkeep)} a year</dd><dt>Concessions earned</dt><dd>${gbp(g.earned || 0)}</dd></dl>
        <h3>Land</h3><p>The field is ${plot(g).w} by ${plot(g).h}.</p>${next ? `<button data-g="land" ${st.money < next.cost ? "disabled" : ""}>Buy land to ${next.w} by ${next.h}, ${gbp(next.cost)}</button>` : "<p>It is as large as it can be.</p>"}</aside></div>`;
    drawGhost();
  }
  function drawGhost() {
    const layer = root && root.querySelector(".g-ghost"); if (!layer) return;
    if (!tool || !ghost) { layer.innerHTML = ""; return; }
    const g = get(U.state, cityId), skip = tool.moving ? g.pieces.find(q => q.id === tool.moving) : null, why = problem(g, ghost, skip);
    layer.innerHTML = pieceSvg(ghost, why ? "bad" : "good");
  }
  function cellAt(e) {
    const svg = root.querySelector(".g-svg"); if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: q.x / C, y: q.y / C };
  }
  function hover(e) {
    if (!tool) return; const at = cellAt(e); if (!at) return;
    const T = PIECES[tool.k], odd = (tool.r || 0) % 2 === 1, w = odd ? T.h : T.w, h = odd ? T.w : T.h;
    const x = Math.round(at.x - w / 2), y = Math.round(at.y - h / 2);
    if (ghost && ghost.x === x && ghost.y === y && ghost.r === (tool.r || 0)) return;
    ghost = { k: tool.k, x, y, r: tool.r || 0 }; drawGhost();
  }
  function click(e) {
    const st = U.state, g = get(st, cityId), b = e.target.closest("button");
    if (b) {
      if (b.dataset.gpiece) { tool = tool && tool.k === b.dataset.gpiece && !tool.moving ? null : { k: b.dataset.gpiece, r: 0 }; ghost = null; sel = null; msg = ""; render(); return; }
      const a = b.dataset.g;
      if (a === "close") { close(); return; }
      if (a === "land") msg = buyLand(st, cityId);
      if (a === "enlarge") msg = enlarge(st, cityId, sel);
      if (a === "remove") { msg = remove(st, cityId, sel); if (!msg) sel = null; }
      if (a === "move") { const p = g.pieces.find(q => q.id === sel); tool = { k: p.k, r: p.r, moving: p.id }; ghost = null; msg = ""; }
      render(); return;
    }
    if (!e.target.closest(".g-svg")) return;
    if (tool) {
      hover(e); if (!ghost) return;
      msg = tool.moving ? move(st, cityId, tool.moving, ghost.x, ghost.y, ghost.r) : place(st, cityId, ghost);
      if (!msg) { if (tool.moving || allowed(g, tool.k)) { sel = tool.moving || null; tool = null; ghost = null; } }
      render(); return;
    }
    const hitP = e.target.closest(".g-piece"); sel = hitP && hitP.dataset.pid ? +hitP.dataset.pid : null; msg = ""; render();
  }

  U.grand = { FOUND, PLOTS, PIECES, MANAGED, get, effects, summary, canFound, found, place, move, remove, enlarge, buyLand, problem, allowed, boarded, monthly, sync, open, close };
})(window.UpShip);
