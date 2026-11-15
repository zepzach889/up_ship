// Grand terminals: a signature port the company lays out itself, seen from the air as an architect's bird's-eye drawing.
// The site has the city's road along its front and the railway down one side. Behind the buildings on the road lies the
// landing field, with mooring circles, sheds, and gasholders; the company draws the walkways, roads, and mains that join
// them. What stands on the site, and how it is joined up, decides what the port can do.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim, F = () => U.facilities;
  const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
  const FOUND = 150000, REFUND = 0.5, CELL = 10, LAND = 170, APRON = 60;
  const SITES = [{ w: 700, d: 600, cost: 0 }, { w: 900, d: 720, cost: 25000 }, { w: 1100, d: 840, cost: 40000 }, { w: 1300, d: 960, cost: 60000 }];
  const BERTH = { 1: { name: "Small mooring circle", r: 100, cost: 4000, mast: 14 }, 2: { name: "Medium mooring circle", r: 140, cost: 7000, mast: 18 }, 3: { name: "Large mooring circle", r: 180, cost: 12000, mast: 24 } };
  const SHED = { 1: { name: "Small shed", l: 160, w: 40, h: 26, cost: 15000 }, 2: { name: "Medium shed", l: 210, w: 52, h: 32, cost: 39000 }, 3: { name: "Great shed", l: 260, w: 70, h: 40, cost: 87000 } };
  const GASK = { gasplant: { name: "Gas plant", cost: 4000, about: "Hydrogen, piped to the berths." }, hestore: { name: "Helium store", cost: 6000, about: "Helium by the trainload, piped to the berths: much cheaper here inland." } };
  // Buildings are painted a cell (ten metres square) at a time; price is per cell.
  const BLD = {
    hall: { name: "Terminal building", cost: 1500, h: 15, wall: "#ece4d2", roof: "#ddd5c3", win: "band", storey: 4.6, about: "Booking hall and waiting rooms. Its size sets how many passengers a day the port can handle, and it draws more custom the larger it is." },
    hotel: { name: "Hotel", cost: 1600, h: 21, wall: "#d9c19c", roof: "#c2b59c", win: "punched", storey: 4, about: "Earns from every passenger boarding here; the larger, the more." },
    restaurant: { name: "Restaurant", cost: 1200, h: 7.5, wall: "#efe6d4", roof: "#9fb3a9", win: "arcade", storey: 7.5, about: "Earns from every passenger boarding here." },
    freight: { name: "Goods and mail shed", cost: 600, h: 10, wall: "#bd8f6e", roof: "#9c9b94", win: "goods", storey: 10, about: "Cargo and mail handled a day. Join it to the berths by road." },
    works: { name: "Workshops", cost: 900, h: 9, wall: "#a99a86", roof: "#8f8e88", win: "goods", storey: 9, about: "With four cells or more and a working shed, overhauls here cost a quarter less." },
    station: { name: "Railway station", cost: 1500, h: 7, wall: "#cfae86", roof: "#a7957c", win: "punched", storey: 3.5, about: "Passengers by train: 8% more demand. Build it against the fence on the railway side (shown in green while you build) and a platform joins it to the line." },
    tram: { name: "Tram stop", cost: 2500, h: 3.5, wall: "#e7dcc0", roof: "#9b2a24", win: "none", storey: 3.5, about: "Passengers by tram: 4% more demand. Build it against the fence on the road (shown in green while you build) and the trams stop outside." }
  };
  const GROUND = {
    lawn: { name: "Lawn and flower beds", cost: 50, c: "#b6c289", about: "Adds a little to the company's standing." },
    trees: { name: "Trees", cost: 150, c: "#aebd84", about: "Adds a little to the company's standing." },
    paving: { name: "Paving", cost: 100, c: "#ddd3bd", about: "Forecourts and yards." },
    carpark: { name: "Car park", cost: 120, c: "#d0c6ae", about: "Room for motor-cars." },
    pool: { name: "Ornamental water", cost: 400, c: "#a6bfbc", about: "Adds to the company's standing." }
  };
  // Connections, drawn point to point; price is per metre. Hours are per metre travelled, on top of the fixed times below.
  const LINK = {
    walkway: { name: "Covered walkway", cost: 25, fam: ["pax"], per: 1 / 3000, about: "Passengers walk to the ship under cover: slow over long distances, but they like it." },
    busroad: { name: "Bus road", cost: 8, fam: ["pax", "cargo"], per: 1 / 12000, about: "Passengers by bus, and goods vans too. Quick over any distance." },
    service: { name: "Service road", cost: 6, fam: ["cargo"], per: 1 / 10000, about: "Goods and mail vans between the sheds and the berths." },
    gasmain: { name: "Gas and water main", cost: 5, fam: ["gas"], per: 0, about: "Gas and ballast water piped to a berth. Without it, carts top ships up slowly." },
    haul: { name: "Hauling track", cost: 10, fam: ["haul"], per: 0, about: "Ships are towed between the shed and the berths along it. A shed with none serves no berth." }
  };
  const MANAGED = ["mast", "terminal", "shed", "gasplant", "hestore"];

  const all = state => (state.grand = state.grand || {});
  function get(state, id) { const g = all(state)[id] || null; if (g && g.pieces) migrate(state, id, g); return all(state)[id] || null; }
  const site = g => SITES[g.site];
  const key = (i, j) => i + "," + j, unkey = k => k.split(",").map(Number);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Where the railway runs: down the side of the site facing its first line out of the city.
  function setting(id) {
    const c = U.cityById[id], routes = ((U.TRANSPORT || {}).ROUTES || []).filter(r => (r.a === id || r.b === id) && r.segs && r.segs[0].type === "rail");
    let side = "left", to = null;
    if (routes.length) {
      const r = routes[0], other = r.a === id ? r.b : r.a, oc = U.cityById[other];
      to = oc ? oc.name : null;
      const seg = r.segs[r.a === id ? 0 : r.segs.length - 1], pts = r.a === id ? seg.pts : seg.pts.slice().reverse(), nxt = pts[1];
      const ll = typeof nxt === "string" ? (U.TRANSPORT.POINTS[nxt] || (U.cityById[nxt] ? [U.cityById[nxt].lat, U.cityById[nxt].lon] : null)) : nxt;
      if (ll && c) side = ll[1] >= c.lon ? "right" : "left";
    }
    return { side, to };
  }

  // Geometry ------------------------------------------------------------------------------------------------------------
  function shedRect(s) {
    const T = SHED[s.size], even = s.r % 2 === 0, hw = (even ? T.l : T.w) / 2, hh = (even ? T.w : T.l) / 2;
    return { x0: s.x - hw, y0: s.y - hh, x1: s.x + hw, y1: s.y + hh };
  }
  function apronRect(s) {
    const R = shedRect(s);
    return [{ x0: R.x1, y0: R.y0, x1: R.x1 + APRON, y1: R.y1 }, { x0: R.x0, y0: R.y1, x1: R.x1, y1: R.y1 + APRON }, { x0: R.x0 - APRON, y0: R.y0, x1: R.x0, y1: R.y1 }, { x0: R.x0, y0: R.y0 - APRON, x1: R.x1, y1: R.y0 }][s.r];
  }
  function doorPoint(s) { const R = shedRect(s); return [[R.x1, s.y], [s.x, R.y1], [R.x0, s.y], [s.x, R.y0]][s.r]; }
  const gasRect = q => ({ x0: q.x - 16, y0: q.y - 16, x1: q.x + 16, y1: q.y + 16 });
  const cellRect = (i, j) => ({ x0: i * CELL, y0: j * CELL, x1: i * CELL + CELL, y1: j * CELL + CELL });
  const rr = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const rc = (R, cx, cy, r) => { const dx = Math.max(R.x0 - cx, 0, cx - R.x1), dy = Math.max(R.y0 - cy, 0, cy - R.y1); return dx * dx + dy * dy < r * r; };
  const inSite = (g, R) => R.x0 >= 0 && R.y0 >= 0 && R.x1 <= site(g).w && R.y1 <= site(g).d;
  function cellOwner(g, i, j) { const k = key(i, j); return g.blds.find(b => b.cells.includes(k)) || null; }

  // What stops something standing where it is put ("" if nothing). `skip` is the thing being moved.
  function blocks(g, R, circle, skip) {
    for (const b of g.berths) if (b !== skip) { const r = BERTH[b.size].r; if (circle ? dist([b.x, b.y], [circle.x, circle.y]) < r + circle.r : rc(R, b.x, b.y, r)) return "It would stand in a mooring circle."; }
    for (const s of g.sheds) if (s !== skip) { for (const Q of [shedRect(s), apronRect(s)]) if (circle ? rc(Q, circle.x, circle.y, circle.r) : rr(R, Q)) return Q === shedRect(s) ? "A shed stands there." : "That would block a shed's doors."; }
    for (const q of g.gas) if (q !== skip) { if (circle ? rc(gasRect(q), circle.x, circle.y, circle.r) : rr(R, gasRect(q))) return "Gasholders stand there."; }
    for (const b of g.blds) if (b !== skip) for (const k of b.cells) { const [i, j] = unkey(k), C = cellRect(i, j); if (circle ? rc(C, circle.x, circle.y, circle.r) : rr(R, C)) return "A building stands there."; }
    return "";
  }
  function berthProblem(g, b, skip) {
    const r = BERTH[b.size].r;
    if (b.x - r < 0 || b.x + r > site(g).w || b.y + r > site(g).d) return "The circle would run outside the site.";
    if (b.y - r < LAND - 40) return "Mooring circles belong out on the field, behind the buildings.";
    return blocks(g, null, { x: b.x, y: b.y, r }, skip);
  }
  function shedProblem(g, s, skip) {
    const R = shedRect(s), A = apronRect(s);
    if (!inSite(g, R) || !inSite(g, A)) return "It would run outside the site, doors and all.";
    return blocks(g, R, null, skip) || blocks(g, A, null, skip).replace("block a shed's doors", "block a shed's doors");
  }
  function gasProblem(g, q, skip) { const R = gasRect(q); if (!inSite(g, R)) return "It would stand outside the site."; return blocks(g, R, null, skip); }
  function cellProblem(g, i, j, skipBld) {
    const R = cellRect(i, j);
    if (!inSite(g, R)) return "Outside the site.";
    for (const b of g.berths) if (rc(R, b.x, b.y, BERTH[b.size].r)) return "In a mooring circle.";
    for (const s of g.sheds) if (rr(R, shedRect(s)) || rr(R, apronRect(s))) return "A shed or its doors.";
    for (const q of g.gas) if (rr(R, gasRect(q))) return "Gasholders.";
    const o = cellOwner(g, i, j); if (o && o !== skipBld) return "A building stands there.";
    return "";
  }
  // A connection may not run through a building or a shed (it may end at one).
  function linkProblem(g, pts, k) {
    if (pts.length < 2) return "Draw at least two points.";
    if (k === "walkway") for (let s = 1; s < pts.length; s++) {
      const a = pts[s - 1], b = pts[s], n = Math.ceil(dist(a, b) / 4);
      for (let q = 0; q <= n; q++) { const p = [a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n];
        for (const c of g.berths) if (dist(p, [c.x, c.y]) < BERTH[c.size].r - 4) return "A covered walkway can't run inside a mooring circle: the ship swings over it. End it at the circle's edge."; }
    }
    for (let s = 1; s < pts.length; s++) {
      const a = pts[s - 1], b = pts[s], L = dist(a, b), n = Math.ceil(L / 4);
      for (let k = 0; k <= n; k++) {
        const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n];
        if (p[0] < 0 || p[1] < 0 || p[0] > site(g).w || p[1] > site(g).d) return "It would run outside the site.";
        const fromEnd = Math.min(dist(p, pts[0]), dist(p, pts[pts.length - 1])); if (fromEnd < 14) continue;
        const i = Math.floor(p[0] / CELL), j = Math.floor(p[1] / CELL); if (cellOwner(g, i, j)) return "It would run through a building.";
        for (const sh of g.sheds) { const R = shedRect(sh); if (p[0] > R.x0 && p[0] < R.x1 && p[1] > R.y0 && p[1] < R.y1) return "It would run through a shed."; }
      }
    }
    return "";
  }
  const linkLen = pts => pts.reduce((a, p, i) => a + (i ? dist(pts[i - 1], p) : 0), 0);

  // Who is joined to whom ---------------------------------------------------------------------------------------------
  // The graph of connections of a family, with the places they reach. Returns, for each berth, the hours its
  // passengers, cargo, and gas take to arrive (Infinity when not joined at all).
  function boardPoint(b) { return [b.x, b.y]; }
  function near(p, R, m) { return p[0] > R.x0 - m && p[0] < R.x1 + m && p[1] > R.y0 - m && p[1] < R.y1 + m; }
  function network(g) {
    const nodes = [], edges = [], add = (p, fam, k) => { nodes.push({ p, fam, k }); return nodes.length - 1; };
    for (const l of g.links) {
      const T = LINK[l.k]; let prev = -1;
      for (const p of l.pts) { const n = add(p, T.fam, l.k); if (prev >= 0) edges.push([prev, n, dist(nodes[prev].p, p) * T.per]); prev = n; }
    }
    // Joins: points of connections that meet, and places a connection ends at.
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++)
      if (dist(nodes[a].p, nodes[b].p) <= 10 && nodes[a].fam.some(f => nodes[b].fam.includes(f))) edges.push([a, b, 0]);
    const places = { hall: [], freight: [], gas: [], shed: [], berth: g.berths.map(() => []) }, walk = new Map();
    nodes.forEach((n, ix) => {
      for (const b of g.blds) if (b.k === "hall" || b.k === "freight") if (b.cells.some(k => { const [i, j] = unkey(k); return near(n.p, cellRect(i, j), 9); })) places[b.k].push(ix);
      for (const q of g.gas) if (dist(n.p, [q.x, q.y]) <= 26) places.gas.push(ix);
      for (const s of g.sheds) if (dist(n.p, doorPoint(s)) <= 26) places.shed.push(ix);
      g.berths.forEach((b, bi) => {
        const d = dist(n.p, boardPoint(b)), r = BERTH[b.size].r;
        if (n.k === "walkway" ? Math.abs(d - r) <= 16 : d <= Math.max(40, r * 0.4)) places.berth[bi].push(ix);
        if (n.k === "walkway" && Math.abs(d - r) <= 16) walk.set(ix + ":" + bi, r / 4000);       // the last steps out to the ship, in the open
      });
    });
    const adj = nodes.map(() => []); for (const [a, b, w] of edges) { adj[a].push([b, w]); adj[b].push([a, w]); }
    function hours(from, fam) {                                           // shortest time from any of `from` along links of `fam`
      const d = nodes.map(() => Infinity), q = [];
      for (const s of from) if (nodes[s].fam.includes(fam)) { d[s] = 0; q.push(s); }
      while (q.length) { q.sort((a, b) => d[a] - d[b]); const u = q.shift();
        for (const [v, w] of adj[u]) if (nodes[v].fam.includes(fam) && d[u] + w < d[v]) { d[v] = d[u] + w; q.push(v); } }
      return d;
    }
    const dp = hours(places.hall, "pax"), dc = hours(places.freight.concat(places.hall), "cargo"), dg = hours(places.gas, "gas"), dh = hours(places.shed, "haul");
    const best = (d, list, bi) => list.reduce((m, ix) => Math.min(m, d[ix] + (walk.get(ix + ":" + bi) || 0)), Infinity);
    const covered = bi => { const ws = places.berth[bi].filter(ix => nodes[ix].k === "walkway" && dp[ix] < Infinity); return ws.length > 0; };
    return g.berths.map((b, bi) => ({ pax: best(dp, places.berth[bi], bi), cargo: best(dc, places.berth[bi], bi), gas: best(dg, places.berth[bi], bi) < Infinity, haul: best(dh, places.berth[bi], bi) < Infinity, covered: covered(bi) }));
  }
  // The extra hours a ship spends at a berth beyond her usual turnaround, and why.
  function handling(n) {
    const pax = n.pax < Infinity ? 0.15 + n.pax : 1.5, cargo = n.cargo < Infinity ? 0.2 + n.cargo : 1.0;
    return Math.max(pax, cargo) + (n.gas ? 0 : 1.0);
  }

  // What the site provides -------------------------------------------------------------------------------------------
  const cache = new WeakMap();
  function effects(state, id) { const g = get(state, id); return g ? effectsOf(g, id) : null; }
  function effectsOf(g, id) {
    const stamp = g.rev || 0, c = cache.get(g);
    if (c && c.rev === stamp) return c.e;
    const cells = k => g.blds.filter(b => b.k === k).reduce((a, b) => a + b.cells.length * (b.design ? b.design.storeys / U.grandArt.KIND[k].def : 1), 0);
    const showD = g.blds.reduce((a, b) => { const d = b.design; return a + (d ? (d.tower !== "none" ? 0.3 : 0) + (d.ornament !== "plain" ? 0.05 * b.cells.length / 10 : 0) + (d.entrance === "portico" ? 0.05 : 0) : 0); }, 0);
    const net = network(g), set = setting(id), maxI = Math.floor(site(g).w / CELL) - 1;
    const station = g.blds.some(b => b.k === "station" && b.cells.some(k => { const [i] = unkey(k); return set.side === "left" ? i === 0 : i === maxI; }));
    const tram = g.blds.some(b => b.k === "tram" && b.cells.some(k => unkey(k)[1] === 0));
    const shedOn = g.sheds.filter((s, si) => g.berths.some((b, bi) => net[bi].haul));
    const hall = cells("hall"), covered = g.berths.length ? net.filter(n => n.covered).length / g.berths.length : 0;
    const show = Object.values(g.grounds).reduce((a, k) => a + ({ lawn: 0.01, trees: 0.015, pool: 0.05 }[k] || 0), 0) + hall * 0.01 + showD;
    const e = { masts: g.berths.length, berths: g.berths.map((b, i) => ({ size: b.size, ...net[i], extra: handling(net[i]) })),
      shed: Math.max(0, ...shedOn.map(s => s.size)), sheds: g.sheds.length, gasplant: g.gas.some(q => q.k === "gasplant") ? 1 : 0, hestore: g.gas.some(q => q.k === "hestore") ? 1 : 0,
      hall, pax: Math.max(40, hall * 18), tons: 15 + cells("freight") * 5 + hall,
      demand: 1 + Math.min(0.2, hall * 0.0025) + (station ? 0.08 : 0) + (tram ? 0.04 : 0) + covered * 0.03, station, tram,
      perPax: cells("restaurant") * 0.012 + Math.min(0.6, cells("hotel") * 0.02), works: cells("works") >= 4 && shedOn.length > 0, show };
    cache.set(g, { rev: stamp, e }); return e;
  }
  // The ordinary facility levels the rest of the game reads, kept in step with the site.
  function sync(state, id) {
    const g = get(state, id); g.rev = (g.rev || 0) + 1;
    const e = effects(state, id), f = state.facilities[id] = state.facilities[id] || { mast: 0, terminal: 0, shed: 0 };
    f.mast = e.masts >= 6 ? 3 : e.masts >= 3 ? 2 : e.masts ? 1 : 0;
    f.terminal = e.hall >= 30 ? 3 : e.hall ? 2 : 0; f.shed = e.shed; f.gasplant = e.gasplant; f.hestore = e.hestore;
  }
  function spend(state, id, cost) { state.money -= cost; state.facilityCost[id] = (state.facilityCost[id] || 0) + cost; state.year.facilities = (state.year.facilities || 0) + cost; }
  function refund(state, id, cost) { state.money += cost * REFUND; state.facilityCost[id] = Math.max(0, (state.facilityCost[id] || 0) - cost); }
  // Paying: from funds, or by borrowing the difference, as for a ship.
  function pay(state, id, cost, what, ask) {
    if (state.money >= cost) { spend(state, id, cost); return ""; }
    const short = Math.ceil(cost - state.money), room = U.contracts.loanLimit(state) - state.loan;
    if (room < short) return `Not enough funds, and the bank will lend only ${gbp(Math.max(0, room))} more.`;
    if (ask && !ask(`Borrow ${gbp(short)} to pay for ${what}? It adds ${gbp(short * U.ECONOMY.loanRate / 12)} a month in interest.`)) return "cancelled";
    U.contracts.borrow(state, short); spend(state, id, cost); return "";
  }

  // Laying out a port: used when one is founded, and for terminals founded before the site was drawn this way. -----------
  function layout(state, id, want) {
    for (let si = 0; si < SITES.length; si++) {
      const g = { site: si, berths: [], sheds: [], gas: [], blds: [], grounds: {}, links: [], next: 1, founded: state.tick, earned: want.earned || 0, rev: 0 };
      const W = SITES[si].w, nI = Math.floor(W / CELL), hw = want.hallBig ? 12 : 8, i0 = Math.floor((nI - hw) / 2);
      const hall = []; for (let i = i0; i < i0 + hw; i++) for (let j = 4; j < 8; j++) hall.push(key(i, j));
      g.blds.push({ id: g.next++, k: "hall", cells: hall });
      for (let i = i0 - 2; i < i0 + hw + 2; i++) for (let j = 0; j < 4; j++) g.grounds[key(i, j)] = "paving";
      for (let i = i0 - 9; i < i0 - 2; i++) for (let j = 0; j < 6; j++) if (i >= 0) g.grounds[key(i, j)] = (i + j) % 3 ? "lawn" : "trees";
      for (let i = i0 + hw + 2; i < i0 + hw + 9; i++) for (let j = 0; j < 6; j++) if (i < nI) g.grounds[key(i, j)] = (i + j) % 3 ? "lawn" : "trees";
      let ok = true;
      // Berths: as near the terminal as they will go.
      const hc = [(i0 + hw / 2) * CELL, 8 * CELL];
      for (let n = 0; n < want.berths && ok; n++) {
        const r = BERTH[want.size].r, cands = [];
        for (let x = r; x <= W - r; x += 10) for (let y = LAND - 40 + r; y <= SITES[si].d - r; y += 10) cands.push([x, y]);
        cands.sort((a, b) => dist(a, hc) - dist(b, hc));
        const c = cands.find(c => !berthProblem(g, { x: c[0], y: c[1], size: want.size }));
        if (!c) ok = false; else g.berths.push({ id: g.next++, x: c[0], y: c[1], size: want.size });
      }
      if (!ok) continue;
      if (want.shed) {
        const T = SHED[want.shed], tries = [];
        for (let y = SITES[si].d - T.w / 2 - 10; y > LAND; y -= 10) for (const x of [T.l / 2 + 10, W - T.l / 2 - APRON - 10]) tries.push({ x, y, size: want.shed, r: x < W / 2 ? 0 : 0 });
        const s = tries.find(s => !shedProblem(g, s));
        if (!s) continue; s.id = g.next++; g.sheds.push(s);
      }
      for (const k of want.gas) {
        const base = g.sheds[0] ? [shedRect(g.sheds[0]).x0 + 20, shedRect(g.sheds[0]).y0 - 30] : [30, LAND + 30], tries = [];
        for (let dx = 0; dx < 300; dx += 10) for (let dy = 0; dy > -200; dy -= 10) tries.push({ x: base[0] + dx, y: base[1] + dy, k });
        const q = tries.find(q => !gasProblem(g, q)); if (q) { q.id = g.next++; g.gas.push(q); }
      }
      // Connections: a covered walkway to the nearest berth, a bus road to the others, mains and tracks to all.
      const back = [hc[0], 8 * CELL], east = [(i0 + hw) * CELL, 6 * CELL], west = [i0 * CELL, 6 * CELL], lane = LAND - 20;
      g.berths.forEach((b, n) => {
        if (n === 0) { const r = BERTH[b.size].r, d = dist(back, [b.x, b.y]), edge = [b.x + (back[0] - b.x) * r / d, b.y + (back[1] - b.y) * r / d];
          g.links.push({ id: g.next++, k: "walkway", pts: [back, edge] }); }
        else g.links.push({ id: g.next++, k: "busroad", pts: [east, [east[0] + 20, lane], [b.x, lane], [b.x, b.y - BERTH[b.size].r * 0.2]] });
      });
      if (g.berths[0]) g.links.push({ id: g.next++, k: "service", pts: [west, [west[0] - 20, lane], [g.berths[0].x - 20, lane], [g.berths[0].x - 20, g.berths[0].y - BERTH[g.berths[0].size].r * 0.2]] });
      for (const q of g.gas) for (const b of g.berths) g.links.push({ id: g.next++, k: "gasmain", pts: [[q.x, q.y], [q.x, b.y], [b.x, b.y]] });
      for (const s of g.sheds) for (const b of g.berths) { const d0 = doorPoint(s); g.links.push({ id: g.next++, k: "haul", pts: [d0, [d0[0] + 30, d0[1]], [b.x, b.y]] }); }
      g.links = g.links.filter(l => !linkProblem(g, l.pts, l.k) || l.k === "gasmain");
      return g;
    }
    return null;
  }
  function wantFrom(state, id, m) {
    const sizes = state.ships.filter(s => !s.lost).map(s => F().shipSize(s.classId));
    return { berths: Math.max(1, m.count || [0, 1, 3, 6][m.mast] || 1), size: Math.min(3, Math.max(2, ...sizes)), shed: m.shed || 0, hallBig: m.terminal >= 3,
      gas: [m.gasplant ? "gasplant" : "", m.hestore ? "hestore" : ""].filter(Boolean).concat(!m.gasplant && !m.hestore ? [state.company.nation === "usa" ? "hestore" : "gasplant"] : []), earned: m.earned || 0 };
  }
  // Terminals founded under the earlier, flat site plan are laid out afresh with what they had.
  function migrate(state, id, old) {
    const n = k => old.pieces.filter(p => p.k === k).length, shed = Math.max(0, ...old.pieces.map(p => +((p.k.match(/^shed(\d)/) || [])[1] || 0)));
    const hall = Math.max(0, ...old.pieces.map(p => +((p.k.match(/^hall(\d)/) || [])[1] || 0)));
    const w = wantFrom(state, id, { count: n("mast"), shed, terminal: hall >= 2 ? 3 : 2, gasplant: n("gasplant"), hestore: n("hestore"), earned: old.earned });
    let g = layout(state, id, w); while (!g && (w.size > 1 || w.berths > 1)) { if (w.size > 2) w.size--; else if (w.berths > 1) w.berths--; else w.size--; g = layout(state, id, w); }
    const add = (k, cells) => { if (g) g.blds.push({ id: g.next++, k, cells }); };
    if (g && n("hotel")) add("hotel", [key(1, 9), key(2, 9), key(1, 10), key(2, 10)].filter(k => !cellProblem(g, ...unkey(k))));
    all(state)[id] = g || { site: 0, berths: [], sheds: [], gas: [], blds: [], grounds: {}, links: [], next: 1, founded: old.founded, earned: old.earned };
    sync(state, id);
  }

  // Founding --------------------------------------------------------------------------------------------------------
  function canFound(state, id) {
    if (get(state, id)) return "There is a grand terminal here already.";
    if (!S().hasRights(state, id)) return "You need landing rights here first.";
    if (!F().ownLevel(state, id, "mast")) return "You need your own mast here first.";
    if (state.money + U.contracts.loanLimit(state) - state.loan < FOUND) return `It costs ${gbp(FOUND)}, more than your funds and credit together.`;
    return "";
  }
  function found(state, id, ask) {
    if (canFound(state, id)) return canFound(state, id);
    const m = {}; for (const k of MANAGED) m[k] = F().ownLevel(state, id, k);
    // If everything will not fit at once, start with smaller circles, then with fewer: more can be added afterwards.
    const w = wantFrom(state, id, m); let g = layout(state, id, w);
    while (!g && (w.size > 1 || w.berths > 1)) { if (w.size > 2) w.size--; else if (w.berths > 1) w.berths--; else w.size--; g = layout(state, id, w); }
    if (!g) return "There is no room to lay it out.";
    const why = pay(state, id, FOUND, "the grand terminal", ask); if (why) return why;
    all(state)[id] = g; sync(state, id); return "";
  }

  // Plans ------------------------------------------------------------------------------------------------------------
  // Changes to a site are a plan, drawn freely and paid for only when the plan is built: new things at their price, and
  // things taken down for half their price back. Moving something is free.
  const nearestOn = (a, b, p) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return [a[0] + dx * t, a[1] + dy * t]; };
  function itemsOf(g) {
    const m = new Map();
    for (const b of g.berths) m.set("b" + b.id + ":" + b.size, BERTH[b.size].cost);
    for (const s of g.sheds) m.set("s" + s.id + ":" + s.size, SHED[s.size].cost);
    for (const q of g.gas) m.set("q" + q.id, GASK[q.k].cost);
    for (const l of g.links) m.set("l" + l.id + ":" + Math.round(linkLen(l.pts)), Math.round(linkLen(l.pts) * LINK[l.k].cost));
    for (const b of g.blds) { for (const k of b.cells) m.set("c" + k + ":" + b.k, BLD[b.k].cost); if (b.design) m.set("d" + b.id + ":" + b.cells.length + ":" + JSON.stringify(b.design), U.grandArt.extraCost(b, BLD[b.k].cost)); }
    for (const [k, v] of Object.entries(g.grounds)) m.set("g" + k + ":" + v, GROUND[v].cost);
    for (let i = 1; i <= g.site; i++) m.set("site" + i, SITES[i].cost);
    return m;
  }
  function planCost(orig, draft) {
    const a = itemsOf(orig), b = itemsOf(draft); let add = 0, remove = 0, n = 0;
    for (const [k, v] of b) if (!a.has(k)) { add += v; n++; }
    for (const [k, v] of a) if (!b.has(k)) { remove += k.startsWith("site") ? 0 : v; n++; }
    const moved = JSON.stringify([orig.berths, orig.sheds, orig.gas, orig.links]) !== JSON.stringify([draft.berths, draft.sheds, draft.gas, draft.links]);
    return { add, remove, net: add - remove * REFUND, changed: n > 0 || moved };
  }
  // Building the plan: paying for it (borrowing if need be), and making it the port.
  function commit(state, id, draft, ask) {
    const orig = get(state, id), c = planCost(orig, draft);
    if (c.net > 0) {
      if (state.money < c.net) {
        const short = Math.ceil(c.net - state.money), room = U.contracts.loanLimit(state) - state.loan;
        if (room < short) return `The plans cost ${gbp(c.net)}: more than your funds, and the bank will lend only ${gbp(Math.max(0, room))} more.`;
        if (ask && !ask(`Borrow ${gbp(short)} to build the plans? It adds ${gbp(short * U.ECONOMY.loanRate / 12)} a month in interest.`)) return "cancelled";
        U.contracts.borrow(state, short);
      }
      state.year.facilities = (state.year.facilities || 0) + c.net;
    }
    state.money -= c.net;
    state.facilityCost[id] = Math.max(0, (state.facilityCost[id] || 0) + c.add - c.remove);
    const g = JSON.parse(JSON.stringify(draft)); g.earned = orig.earned; all(state)[id] = g; sync(state, id);
    return "";
  }
  const bump = g => { g.rev = (g.rev || 0) + 1; };
  function placeBerth(g, b) { const why = berthProblem(g, b); if (why) return why; g.berths.push({ id: g.next++, x: b.x, y: b.y, size: b.size }); bump(g); return ""; }
  function placeShed(g, s) { if (g.sheds.length >= 3) return "Three sheds is the most a site can work."; const why = shedProblem(g, s); if (why) return why; g.sheds.push({ id: g.next++, x: s.x, y: s.y, size: s.size, r: s.r || 0 }); bump(g); return ""; }
  function placeGas(g, q) { if (g.gas.some(x => x.k === q.k)) return "One is enough."; const why = gasProblem(g, q); if (why) return why; g.gas.push({ id: g.next++, x: q.x, y: q.y, k: q.k }); bump(g); return ""; }
  function moveThing(g, sel, x, y, r) {
    const to = { ...sel.ref, x, y, r: r == null ? sel.ref.r : r };
    const why = sel.type === "berth" ? berthProblem(g, to, sel.ref) : sel.type === "shed" ? shedProblem(g, to, sel.ref) : gasProblem(g, to, sel.ref);
    if (why) return why;
    sel.ref.x = x; sel.ref.y = y; if (r != null) sel.ref.r = r; bump(g); return "";
  }
  // Painting: cells join a building of the same kind they touch, or start a new one. Returns how many were painted.
  function paint(g, kind, list) {
    const isB = !!BLD[kind], ok = list.filter(([i, j]) => !cellProblem(g, i, j) && !(!isB && cellOwner(g, i, j)));
    if (!isB) { for (const [i, j] of ok) g.grounds[key(i, j)] = kind; bump(g); return ok.length; }
    for (const [i, j] of ok) {
      const k = key(i, j), touching = g.blds.filter(b => b.k === kind && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => b.cells.includes(key(i + a, j + c))));
      delete g.grounds[k];
      if (!touching.length) { g.blds.push({ id: g.next++, k: kind, cells: [k] }); continue; }
      const keep = touching[0]; keep.cells.push(k);
      for (const o of touching.slice(1)) { keep.cells.push(...o.cells); g.blds = g.blds.filter(b => b !== o); }
    }
    bump(g); return ok.length;
  }
  function erase(g, list) {
    let n = 0;
    for (const [i, j] of list) {
      const k = key(i, j), b = cellOwner(g, i, j);
      if (b) { if (b.k === "hall" && b.cells.length <= 1 && g.blds.filter(x => x.k === "hall").length <= 1) continue; b.cells = b.cells.filter(c => c !== k); n++; if (!b.cells.length) g.blds = g.blds.filter(x => x !== b); }
      else if (g.grounds[k]) { delete g.grounds[k]; n++; }
    }
    bump(g); return n;
  }
  // Drawing a connection: an end that comes near another connection's line is joined to it there.
  function addLink(g, k, pts) {
    pts = pts.map(p => p.slice());
    const joins = [];
    for (const end of [0, pts.length - 1]) {
      let best = null;
      for (const l of g.links) { if (!LINK[l.k].fam.some(f => LINK[k].fam.includes(f))) continue;
        for (let s = 1; s < l.pts.length; s++) { const q = nearestOn(l.pts[s - 1], l.pts[s], pts[end]), d = dist(q, pts[end]); if (d <= 12 && (!best || d < best.d)) best = { d, q, l, s }; } }
      if (best) { pts[end] = best.q; joins.push(best); }
    }
    const why = linkProblem(g, pts, k); if (why) return why;
    for (const b of joins) if (dist(b.q, b.l.pts[b.s - 1]) > 1 && dist(b.q, b.l.pts[b.s]) > 1) { const at = b.l.pts.findIndex((p, i) => i && dist(nearestOn(b.l.pts[i - 1], p, b.q), b.q) < 0.5); if (at > 0) b.l.pts.splice(at, 0, b.q.slice()); }
    g.links.push({ id: g.next++, k, pts }); bump(g); return "";
  }
  function removeThing(g, sel) {
    if (sel.type === "berth") { if (g.berths.length <= 1) return "A port needs one mooring circle at least."; g.berths = g.berths.filter(x => x !== sel.ref); }
    if (sel.type === "shed") g.sheds = g.sheds.filter(x => x !== sel.ref);
    if (sel.type === "gas") g.gas = g.gas.filter(x => x !== sel.ref);
    if (sel.type === "link") g.links = g.links.filter(x => x !== sel.ref);
    if (sel.type === "bld") { if (sel.ref.k === "hall" && g.blds.filter(b => b.k === "hall").length <= 1) return "The port needs a terminal building. Clear cells to reshape it, or build another first."; g.blds = g.blds.filter(x => x !== sel.ref); }
    bump(g); return "";
  }
  function buyLand(g) { if (!SITES[g.site + 1]) return "The site is as large as it can be."; g.site++; bump(g); return ""; }

  // Running -------------------------------------------------------------------------------------------------------------
  function boarded(state, id, pax) {
    const e = effects(state, id); if (!e || !e.perPax || !pax) return;
    const amount = pax * e.perPax; S().addIncome(state, amount, "concessions"); get(state, id).earned = (get(state, id).earned || 0) + amount;
  }
  function monthly(state) {
    const pts = Object.keys(all(state)).reduce((a, id) => a + ((effects(state, id) || {}).show || 0), 0);
    if (pts && state.rep && typeof state.rep === "object") state.rep.standing = Math.max(0, Math.min(100, (+state.rep.standing || 50) + Math.min(0.5, pts * 0.04)));
  }
  // Mooring: a ship takes the free berth that fits her and turns her round quickest. A ship too big for every berth here
  // moors at the largest, awkwardly, and loses two hours over it.
  function dock(state, id, arrive, stay, ship) {
    const e = effects(state, id), size = ship ? F().shipSize(ship.classId) : 1;
    let fits = e.berths.map((b, i) => ({ ...b, i })).filter(b => b.size >= size), pen = 0;
    if (!fits.length) { const big = Math.max(...e.berths.map(b => b.size)); fits = e.berths.map((b, i) => ({ ...b, i })).filter(b => b.size === big); pen = 2; }
    const list = (state.docking[id] = (state.docking[id] || []).filter(x => x.to > arrive - 48));
    let best = null;
    for (const b of fits) {
      let t = arrive;
      for (let guard = 0; guard < 30; guard++) { const busy = list.filter(x => x.b === b.i && x.from < t + stay + b.extra && x.to > t); if (!busy.length) break; t = Math.max(...busy.map(x => x.to)); }
      const done = t + b.extra + pen;
      if (!best || done < best.done) best = { b, t, done };
    }
    if (!best) return { delay: 0, fee: 0 };
    list.push({ from: best.t, to: best.t + stay + best.b.extra + pen, b: best.b.i, bid: get(state, id).berths[best.b.i].id, ship: ship ? ship.id : null });
    return { delay: best.t - arrive + best.b.extra + pen, fee: 0 };
  }
  function summaryOf(g, id, built) {
    const e = effectsOf(g, id), access = e.berths.filter(b => b.pax < Infinity).length;
    return { e, built, upkeep: built * F().UPKEEP, rows: [
      ["Mooring circles", g.berths.length ? g.berths.map(b => ["", "S", "M", "L"][b.size]).join(" ") : "None"],
      ["Reached by passengers", `${access} of ${g.berths.length}`],
      ["Shed", e.shed ? F().SIZE_NAMES[e.shed] : g.sheds.length ? "Not joined to a berth" : "None"],
      ["Gas", [e.gasplant ? "Hydrogen" : "", e.hestore ? (e.gasplant ? "helium" : "Helium") : ""].filter(Boolean).join(" and ") || "None of your own"],
      ["Passengers a day", Math.round(e.pax)], ["Cargo a day", Math.round(e.tons) + " tons"],
      ["Railway station", e.station ? "Joined to the line" : g.blds.some(b => b.k === "station") ? "Not by the line" : "None"],
      ["Tram stop", e.tram ? "On the road" : g.blds.some(b => b.k === "tram") ? "Not on the road" : "None"],
      ["Passenger demand", e.demand > 1.001 ? `${Math.round((e.demand - 1) * 100)}% more` : "As the city's"],
      ["Concessions", e.perPax ? `${gbp(e.perPax * 100)} per 100 passengers` : "None"],
      ["Overhauls", e.works ? "A quarter cheaper" : e.shed ? "At the usual price" : "None here"]] };
  }
  const summary = (state, id) => summaryOf(get(state, id), id, state.facilityCost[id] || 0);

  // ===================================================================================================================
  // The bird's-eye drawing. Plan coordinates are metres: x along the road, y away from it; z is height.
  const AN = 25 * Math.PI / 180, CA = Math.cos(AN), SA = Math.sin(AN), KK = 0.55, HH = 0.84;
  const P = (x, y, z) => [x * CA + y * SA, -((-x * SA + y * CA) * KK + (z || 0) * HH)];
  const unP = (sx, sy) => { const v = -sy / KK; return [sx * CA - v * SA, sx * SA + v * CA]; };
  const depth = (x, y) => -x * SA + y * CA;
  const INK = "#3a2f22", RED = "#9b2a24";
  const f1 = n => n.toFixed(1);
  const pts = l => l.map(p => { const q = P(p[0], p[1], p[2]); return f1(q[0]) + "," + f1(q[1]); }).join(" ");
  const poly = (l, fill, stroke, sw, extra) => `<polygon points="${pts(l)}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw || 0}" stroke-linejoin="round" ${extra || ""}/>`;
  const line = (a, b, stroke, sw, extra) => { const p = P(...a), q = P(...b); return `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="${stroke || INK}" stroke-width="${sw || 0.8}" ${extra || ""}/>`; };
  const pline = (l, stroke, sw, extra) => `<polyline points="${pts(l)}" fill="none" stroke="${stroke || INK}" stroke-width="${sw || 0.8}" stroke-linejoin="round" stroke-linecap="round" ${extra || ""}/>`;
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const shade = (c, f) => "#" + hex(c).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("");
  const LIGHT = [-0.45, -0.89], SD = [0.62, 0.42];
  const facef = (nx, ny) => 0.74 + 0.3 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1]);
  const visible = (nx, ny) => -nx * SA + ny * CA < 0;
  const circ = (cx, cy, r, z, n) => Array.from({ length: n || 64 }, (_, t) => [cx + r * Math.cos(t * 2 * Math.PI / (n || 64)), cy + r * Math.sin(t * 2 * Math.PI / (n || 64)), z || 0]);
  const shadowOf = (x0, y0, x1, y1, h) => poly([[x0, y0], [x1, y0], [x1 + SD[0] * h, y0 + SD[1] * h], [x1 + SD[0] * h, y1 + SD[1] * h], [x0 + SD[0] * h, y1 + SD[1] * h], [x0, y1]], "#2a2216");
  function band(path, w) {
    const L = [], R = [];
    path.forEach((p, i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, nx = -dy / m * w / 2, ny = dx / m * w / 2;
      L.push([p[0] + nx, p[1] + ny]); R.push([p[0] - nx, p[1] - ny]); });
    return L.concat(R.reverse());
  }
  function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function groundText(text, x, y, size, color, along) {
    const a = P(x, y), b = along === "y" ? P(x, y + 1) : P(x + 1, y), c = along === "y" ? P(x + 1, y) : P(x, y - 1);
    return `<text transform="matrix(${(b[0] - a[0]).toFixed(4)},${(b[1] - a[1]).toFixed(4)},${(c[0] - a[0]).toFixed(4)},${(c[1] - a[1]).toFixed(4)},${f1(a[0])},${f1(a[1])})" font-family="Josefin Sans, sans-serif" font-size="${size}" letter-spacing="${size * 0.25}" text-anchor="middle" fill="${color}">${text}</text>`;
  }
  function wallText(text, x, y, z, size, color) {
    const a = P(x, y, z), b = P(x + 1, y, z), c = P(x, y, z - 1);
    return `<text transform="matrix(${(b[0] - a[0]).toFixed(4)},${(b[1] - a[1]).toFixed(4)},${(c[0] - a[0]).toFixed(4)},${(c[1] - a[1]).toFixed(4)},${f1(a[0])},${f1(a[1])})" font-family="Poiret One, Josefin Sans, sans-serif" font-size="${size}" letter-spacing="${size * 0.18}" text-anchor="middle" fill="${color}">${text}</text>`;
  }
  function tree(x, y, r, h, col, objs, shadows) {
    const p = P(x, y, h * 0.75), t0 = P(x, y, 0);
    objs.push([depth(x, y), `<line x1="${f1(t0[0])}" y1="${f1(t0[1])}" x2="${f1(p[0])}" y2="${f1(p[1] + r * 0.6)}" stroke="#5a4a36" stroke-width="1.2"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}" fill="${col}" stroke="#4d5c38" stroke-width="0.6"/><circle cx="${f1(p[0] - r * 0.28)}" cy="${f1(p[1] - r * 0.3)}" r="${f1(r * 0.55)}" fill="${shade(col, 1.22)}" opacity="0.8"/>`]);
    const sp = P(x + SD[0] * h * 0.75, y + SD[1] * h * 0.75); shadows.push(`<ellipse cx="${f1(sp[0])}" cy="${f1(sp[1])}" rx="${f1(r)}" ry="${f1(r * KK)}" fill="#2a2216"/>`);
  }
  // The surroundings: drawn once per city and size of site.
  const around = new Map();
  function surroundings(id, g) {
    const k = id + ":" + g.site; if (around.has(k)) return around.get(k);
    const W = site(g).w, D = site(g).d, r = rng(id), set = setting(id), c = U.cityById[id];
    const ground = [poly([[-2500, -2500], [W + 2500, -2500], [W + 2500, D + 2500], [-2500, D + 2500]], "#ccc79c")], objs = [], shadows = [];
    for (let i = -8; i < W / 90 + 8; i++) for (let j = -7; j < D / 70 + 8; j++) {
      const x0 = i * 90 + (r() - 0.5) * 24, y0 = j * 70 + (r() - 0.5) * 18;
      if (x0 > -100 && x0 < W + 10 && y0 > -100 && y0 < D + 10) continue;
      ground.push(poly([[x0, y0], [x0 + 92, y0 + (r() - 0.5) * 10], [x0 + 92, y0 + 72], [x0 + (r() - 0.5) * 8, y0 + 72]], pick(r, ["#cfcb9d", "#c6c592", "#d6cc9c", "#bfbf8c", "#cdb98f", "#c3c798", "#d9d0a6", "#b9be8a"]), "#a99d78", 0.5));
      if (r() < 0.16) for (let f = 1; f < 9; f++) ground.push(line([x0 + 4, y0 + f * 8], [x0 + 88, y0 + f * 8], "#a3906a", 0.4, 'opacity="0.6"'));
    }
    for (let n = 0; n < 220; n++) { const x = -500 + r() * (W + 1000), y = -300 + r() * (D + 800); if ((x > -90 && x < W + 90 && y > -90 && y < D + 90) || (y < -40 && y > -130)) continue; tree(x, y, 5 + r() * 3, 10 + r() * 6, pick(r, ["#7f9460", "#869a64", "#76895a", "#8a9b66"]), objs, shadows); }
    // The road along the front, with its tram rails, and the town beyond it.
    ground.push(poly([[-400, -30], [W + 400, -30], [W + 400, 0], [-400, 0]], "#d4cab3"));
    ground.push(poly([[-400, -26], [W + 400, -26], [W + 400, -4], [-400, -4]], "#bdb39d", INK, 0.6));
    for (const yy of [-17, -16, -13, -12]) ground.push(line([-400, yy], [W + 400, yy], "#6f6352", 0.5));
    ground.push(groundText(`ROAD TO ${(c ? c.name : "THE CITY").toUpperCase()}`, W * 0.18, -8.5, 7, "#5d5040"));
    for (let i = -8; i < W / 42 + 8; i++) {
      if (r() < 0.3) continue;
      const x0 = i * 42 + (r() - 0.5) * 6, y1 = -64, w = 26 + r() * 10, d = 18 + r() * 8, h = 9 + r() * 7, wall = pick(r, ["#d9c7a6", "#cdb592", "#e1d3b8", "#c9a986", "#d4c3a5"]);
      const yf = y1 - d, ridge = y1 - d / 2, sv = [];
      for (const [p0, p1, n] of [[[x0, yf], [x0 + w, yf], [0, -1]], [[x0 + w, yf], [x0 + w, y1], [1, 0]]]) {
        sv.push(poly([[...p0, 0], [...p1, 0], [...p1, h], [...p0, h]], shade(wall, facef(...n)), INK, 0.5));
        for (const t0 of [0.2, 0.55]) for (let zz = 2; zz < h - 2; zz += 4) sv.push(poly([[p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, zz], [p0[0] + (p1[0] - p0[0]) * (t0 + 0.14), p0[1] + (p1[1] - p0[1]) * (t0 + 0.14), zz], [p0[0] + (p1[0] - p0[0]) * (t0 + 0.14), p0[1] + (p1[1] - p0[1]) * (t0 + 0.14), zz + 1.8], [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, zz + 1.8]], "#5b5550"));
      }
      sv.push(poly([[x0, y1, h], [x0 + w, y1, h], [x0 + w, ridge, h + 5], [x0, ridge, h + 5]], shade("#a98f74", 0.86), INK, 0.5));     // the back slope
      sv.push(poly([[x0 + w, yf, h], [x0 + w, y1, h], [x0 + w, ridge, h + 5]], shade(wall, 0.8), INK, 0.5));                        // the gable end
      sv.push(poly([[x0, yf, h], [x0 + w, yf, h], [x0 + w, ridge, h + 5], [x0, ridge, h + 5]], shade("#a98f74", 1.1), INK, 0.5));     // the front slope
      objs.push([depth(x0 + w / 2, y1 - d / 2), sv.join("")]); shadows.push(shadowOf(x0, y1 - d, x0 + w, y1, h));
    }
    // The railway down one side.
    const rx = set.side === "left" ? -34 : W + 34;
    ground.push(poly([[rx - 12, -400], [rx + 12, -400], [rx + 12, D + 400], [rx - 12, D + 400]], "#ada392", INK, 0.5));
    for (let k2 = -400; k2 < D + 400; k2 += 3) ground.push(line([rx - 10, k2], [rx + 10, k2], "#6b5e4c", 0.6, 'opacity="0.5"'));
    for (const dx of [-7, -4.5, 4.5, 7]) ground.push(line([rx + dx, -400], [rx + dx, D + 400], "#40372c", 0.7));
    ground.push(groundText(set.to ? `RAILWAY TO ${set.to.toUpperCase()}` : "RAILWAY", rx + (set.side === "left" ? -22 : 22), D * 0.55, 7, "#5d5040", "y"));
    const out = { ground: ground.join(""), objs, shadows: shadows.join(""), rx };
    around.set(k, out); return out;
  }
  // A building cell as a block: its walls facing the viewer, windows by kind, and the roof.
  function wallpt(p0, p1, t, z) { return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, z]; }
  function windows(p0, p1, z0, z1, T, f) {
    const out = [], glass = shade("#4f5b63", 0.8 + 0.35 * (f - 0.74)), n = Math.floor((z1 - z0 - 1) / T.storey);
    if (T.win === "none") return "";
    for (let s = 0; s < Math.max(1, n); s++) {
      const zb = z0 + 1.2 + s * T.storey;
      if (T.win === "band") { out.push(poly([wallpt(p0, p1, 0, zb), wallpt(p0, p1, 1, zb), wallpt(p0, p1, 1, zb + 1.7), wallpt(p0, p1, 0, zb + 1.7)], glass)); out.push(line(wallpt(p0, p1, 0.5, zb), wallpt(p0, p1, 0.5, zb + 1.7), "#e9e2d1", 0.6)); }
      else if (T.win === "arcade") { for (const t0 of [0.12, 0.56]) out.push(poly([wallpt(p0, p1, t0, z0), wallpt(p0, p1, t0 + 0.32, z0), wallpt(p0, p1, t0 + 0.32, z0 + 4.8), wallpt(p0, p1, t0, z0 + 4.8)], glass)); }
      else if (T.win === "goods") { out.push(poly([wallpt(p0, p1, 0.2, z0), wallpt(p0, p1, 0.8, z0), wallpt(p0, p1, 0.8, z0 + 5), wallpt(p0, p1, 0.2, z0 + 5)], "#7d6a55", INK, 0.4)); }
      else for (const t0 of [0.18, 0.6]) out.push(poly([wallpt(p0, p1, t0, zb), wallpt(p0, p1, t0 + 0.22, zb), wallpt(p0, p1, t0 + 0.22, zb + 1.9), wallpt(p0, p1, t0, zb + 1.9)], glass));
      if (T.win === "arcade" || T.win === "goods") break;
    }
    return out.join("");
  }
  function buildingSvg(b, objs, shadows, hilite) {
    const c = U.state && U.state.company || {}, H = { P, poly, line, facef, visible, depth, wallText, shadowOf, company: (c.emblem || {}).c1 };
    U.grandArt.birdseye(b, H, objs, shadows, hilite, c.nation, c.name, cityId && U.cityById[cityId] ? U.cityById[cityId].name : "");
  }
  function shedSvg(s, objs, shadows, hilite) {
    const T = SHED[s.size], R = shedRect(s), even = s.r % 2 === 0, hw = T.h * 0.78, hr = T.h - hw, svg = [];
    // Draw in the shed's own frame: u along its length (towards the doors), v across.
    const ux = [[1, 0], [0, 1], [-1, 0], [0, -1]][s.r], vx = [-ux[1], ux[0]], L = T.l, Wd = T.w;
    const at = (u, v, z) => [s.x + ux[0] * u + vx[0] * v, s.y + ux[1] * u + vx[1] * v, z];
    const sides = [[[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [0, -1]], [[L / 2, Wd / 2], [-L / 2, Wd / 2], [0, 1]]];
    for (const [a, b, n] of sides) {
      const nx = ux[0] * n[0] + vx[0] * n[1], ny = ux[1] * n[0] + vx[1] * n[1]; if (!visible(nx, ny)) continue;
      const c = shade("#b7b9b4", facef(nx, ny)); svg.push(poly([at(a[0], a[1], 0), at(b[0], b[1], 0), at(b[0], b[1], hw), at(a[0], a[1], hw)], c, INK, 0.8));
      for (let k = 0; k <= L / 13; k++) { const u = -L / 2 + k * 13; svg.push(line(at(u, a[1], 0), at(u, a[1], hw), "#6d6e69", 0.5)); }
      for (let k = 0; k < L / 6.5 - 1; k++) { const u = -L / 2 + 2 + k * 6.5; svg.push(poly([at(u, a[1], hw - 6), at(u + 4, a[1], hw - 6), at(u + 4, a[1], hw - 3), at(u, a[1], hw - 3)], "#5b666b")); }
    }
    for (const end of [1, -1]) {                                           // the two ends: doors at +u
      const nx = ux[0] * end, ny = ux[1] * end; if (!visible(nx, ny)) continue;
      const arch = Array.from({ length: 25 }, (_, i) => { const t = i * Math.PI / 24; return at(end * L / 2, Wd / 2 * Math.cos(t), hw + hr * Math.sin(t)); });
      const c = shade("#b7b9b4", facef(nx, ny)); svg.push(poly([at(end * L / 2, -Wd / 2, 0), at(end * L / 2, Wd / 2, 0), at(end * L / 2, Wd / 2, hw), ...arch, at(end * L / 2, -Wd / 2, hw)], c, INK, 0.8));
      if (end === 1) { for (let k = 0; k <= 8; k++) { const v = -Wd / 2 + 4 + k * (Wd - 8) / 8; svg.push(line(at(L / 2, v, 0), at(L / 2, v, hw - 2), "#5d5e59", 0.7)); }
        svg.push(poly([at(L / 2, -Wd / 2 + 4, 0), at(L / 2, Wd / 2 - 4, 0), at(L / 2, Wd / 2 - 4, 1.5), at(L / 2, -Wd / 2 + 4, 1.5)], RED)); }
    }
    // The barrel roof, in strips drawn from the far side to the near.
    const strips = [];
    for (let i = 0; i < 18; i++) { const t0 = i * Math.PI / 18, t1 = (i + 1) * Math.PI / 18, tm = (t0 + t1) / 2, mid = at(0, Wd / 2 * Math.cos(tm), 0);
      strips.push([depth(mid[0], mid[1]), poly([at(-L / 2, Wd / 2 * Math.cos(t0), hw + hr * Math.sin(t0)), at(L / 2, Wd / 2 * Math.cos(t0), hw + hr * Math.sin(t0)), at(L / 2, Wd / 2 * Math.cos(t1), hw + hr * Math.sin(t1)), at(-L / 2, Wd / 2 * Math.cos(t1), hw + hr * Math.sin(t1))],
        shade(hilite ? "#c4c6c0" : "#a9aca7", 0.84 + 0.24 * Math.sin(tm) + 0.1 * (-Math.cos(tm) * (vx[1] > 0 ? 1 : -1))), "none", 0)]); }
    strips.sort((a, b) => b[0] - a[0]); svg.push(...strips.map(s2 => s2[1]));
    for (let k = 0; k <= L / 13; k++) { const u = -L / 2 + k * 13; svg.push(pline(Array.from({ length: 19 }, (_, i) => at(u, Wd / 2 * Math.cos(i * Math.PI / 18), hw + hr * Math.sin(i * Math.PI / 18))), "#5d5e59", 0.5, 'opacity="0.6"')); }
    if (hilite) svg.push(poly([[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]].map(p => [...p, 0]), "none", "#c9a65b", 2));
    objs.push([depth(s.x, s.y), svg.join("")]);
    shadows.push(shadowOf(R.x0, R.y0, R.x1, R.y1, T.h));
  }
  function gasSvg(q, objs, shadows, hilite) {
    const parts = [[q.x - 6, q.y + 4, 13, 22], [q.x + 9, q.y - 7, 9, 16]], svg = [];
    parts.sort((a, b) => depth(b[0], b[1]) - depth(a[0], a[1]));
    for (const [cx, cy, r, h] of parts) {
      const a = P(cx, cy, h), b = P(cx, cy, 0), rx = r, ry = r * KK, gid = "gh" + q.id + "_" + Math.round(cx);
      svg.push(`<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${q.k === "hestore" ? "#a7a9b8" : "#9aa391"}"/><stop offset="0.35" stop-color="${q.k === "hestore" ? "#c2c4d0" : "#b3bba8"}"/><stop offset="1" stop-color="${q.k === "hestore" ? "#71738a" : "#6c7466"}"/></linearGradient></defs>`,
        `<path d="M${f1(b[0] - rx)},${f1(b[1])} A${f1(rx)},${f1(ry)} 0 0 0 ${f1(b[0] + rx)},${f1(b[1])} L${f1(a[0] + rx)},${f1(a[1])} L${f1(a[0] - rx)},${f1(a[1])} Z" fill="url(#${gid})" stroke="${hilite ? "#c9a65b" : INK}" stroke-width="${hilite ? 2 : 0.8}"/>`,
        `<ellipse cx="${f1(a[0])}" cy="${f1(a[1])}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#aab09f" stroke="${INK}" stroke-width="0.8"/>`);
      for (let k = -3; k <= 3; k++) { const xx = a[0] + rx * k / 3.4, e = ry * Math.sqrt(Math.max(0, 1 - (k / 3.4) ** 2)); svg.push(`<line x1="${f1(xx)}" y1="${f1(a[1] + e)}" x2="${f1(xx)}" y2="${f1(b[1] + e)}" stroke="${INK}" stroke-width="0.5" opacity="0.6"/>`); }
      shadows.push(poly(circ(cx + SD[0] * h, cy + SD[1] * h, r), "#2a2216"), poly(band([[cx, cy], [cx + SD[0] * h, cy + SD[1] * h]], 2 * r), "#2a2216"));
    }
    objs.push([depth(q.x, q.y), svg.join("")]);
  }
  function mastSvg(b, objs, shadows) {
    const h = BERTH[b.size].mast, bw = h * 0.25, tw = h * 0.08, svg = [], cx = b.x, cy = b.y;
    for (const [sx0, sy0, sx1, sy1] of [[-1, -1, 1, -1], [1, -1, 1, 1]]) {
      const q0b = [cx + sx0 * bw, cy + sy0 * bw, 0], q1b = [cx + sx1 * bw, cy + sy1 * bw, 0], q0t = [cx + sx0 * tw, cy + sy0 * tw, h], q1t = [cx + sx1 * tw, cy + sy1 * tw, h];
      svg.push(poly([q0b, q1b, q1t, q0t], "#5a5650", "none", 0, 'opacity="0.12"'));
      const lv = Math.max(3, Math.floor(h / 5));
      for (let i = 0; i <= lv; i++) {
        const f0 = i / lv, pa = q0b.map((v, k) => v + (q0t[k] - v) * f0), pb = q1b.map((v, k) => v + (q1t[k] - v) * f0); svg.push(line(pa, pb, "#3f3a33", 0.6));
        if (i < lv) { const f2 = (i + 1) / lv, pc = q0b.map((v, k) => v + (q0t[k] - v) * f2), pd = q1b.map((v, k) => v + (q1t[k] - v) * f2); svg.push(line(pa, pd, "#3f3a33", 0.4), line(pb, pc, "#3f3a33", 0.4)); }
      }
      svg.push(line(q0b, q0t, "#2f2a24", 1.1), line(q1b, q1t, "#2f2a24", 1.1));
    }
    const top = P(cx, cy, h + 2.5); svg.push(line([cx, cy, h], [cx, cy, h + 2.5], "#2f2a24", 1.6), `<circle cx="${f1(top[0])}" cy="${f1(top[1])}" r="1.4" fill="#2f2a24"/>`);
    objs.push([depth(cx, cy), svg.join("")]);
    shadows.push(poly([[cx - bw, cy], [cx + bw, cy], [cx + SD[0] * h + tw, cy + SD[1] * h], [cx + SD[0] * h - tw, cy + SD[1] * h]], "#2a2216", "none", 0, 'opacity="0.7"'));
  }
  function walkwaySvg(l, objs, shadows, hilite) {
    for (let s = 1; s < l.pts.length; s++) {
      const a = l.pts[s - 1], b = l.pts[s], L = dist(a, b), n = Math.max(1, Math.round(L / 20));
      for (let k = 0; k < n; k++) {
        const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
        const roof = band([p, q], 6).map(v => [...v, 3.4]), c = hilite ? "#f2e3b5" : "#e8e0cc";
        objs.push([depth((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) - 1, line([...q, 0], [...q, 3.2], INK, 0.7) + poly(roof, c, INK, 0.5)]);
        shadows.push(poly(band([[p[0] + SD[0] * 3.4, p[1] + SD[1] * 3.4], [q[0] + SD[0] * 3.4, q[1] + SD[1] * 3.4]], 6), "#2a2216"));
      }
    }
  }
  const PLANM = `matrix(${CA.toFixed(5)},${(SA * KK).toFixed(5)},${SA.toFixed(5)},${(-CA * KK).toFixed(5)},0,0)`;
  const ppts = l => l.map(p => f1(p[0]) + "," + f1(p[1])).join(" ");
  // Two rails a gauge apart along a path, mitred properly at each bend.
  function offsetLine(path, d) {
    return path.map((p, i) => {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      const n1 = i > 0 ? norm(path[i - 1], p) : norm(p, b), n2 = i < path.length - 1 ? norm(p, path[i + 1]) : n1;
      let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const m = Math.hypot(mx, my) || 1; mx /= m; my /= m;
      const k = d / Math.max(0.3, mx * n1[0] + my * n1[1]); return [p[0] + mx * k, p[1] + my * k];
    });
  }
  function norm(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [-dy / m, dx / m]; }
  // Life on the field ------------------------------------------------------------------------------------------------
  // Visiting airships: navy and government ships, and other lines', calling at a free berth now and then for a fee.
  const VISITORS = {
    usa: [["USS Shenandoah", 1923, 1925, "navy"], ["USS Los Angeles", 1924, 1939, "navy"], ["USS Akron", 1931, 1933, "navy"], ["USS Macon", 1933, 1935, "navy"]],
    britain: [["R33", 1919, 1928, "government"], ["R36", 1921, 1926, "government"], ["R80", 1920, 1925, "government"], ["R100", 1929, 1931, "government"]],
    germany: [["Graf Zeppelin", 1928, 1940, "line"], ["Hindenburg", 1936, 1937, "line"], ["Graf Zeppelin II", 1938, 1940, "line"]],
    italy: [["Norge", 1926, 1926, "expedition"], ["Italia", 1928, 1928, "expedition"]],
    france: [["Dixmude", 1923, 1923, "navy"], ["Méditerranée", 1921, 1926, "navy"]],
    japan: [["Navy Airship No. 6", 1924, 1932, "navy"]]
  };
  const GENERIC = [["a naval airship", "navy"], ["a government survey ship", "government"], ["a foreign line's ship", "line"]];
  const VISIT_LOOK = { navy: { hull: "#a9aba6", fins: "#8b8e8a", stripe: null }, government: { hull: "#c9cbc8", fins: "#56606a", stripe: "#56606a" }, line: { hull: "#cfd0cb", fins: "#2d2418", stripe: "#2d2418" }, expedition: { hull: "#d8d4c6", fins: "#2f4f3e", stripe: "#2f4f3e" } };
  const nowHour = state => state.tick;
  // Each day: a visitor leaves when her time is up, and now and then another comes in to a free berth.
  function daily(state) {
    const year = S().dateOf(state.tick).getUTCFullYear();
    for (const [id, g] of Object.entries(all(state))) {
      if (!g || g.pieces) continue;
      if (g.visit && (nowHour(state) > g.visit.until || !g.berths.some(b => b.id === g.visit.bid))) g.visit = null;
      if (g.visit || !g.berths.length) continue;
      const busy = new Set(((state.docking || {})[id] || []).filter(x => x.from <= nowHour(state) + 48 && x.to > nowHour(state)).map(x => x.bid));
      const free = g.berths.filter(b => !busy.has(b.id)); if (!free.length) continue;
      const c = U.cityById[id], p = Math.min(0.35, 0.05 * free.length * (c.tier === "major" ? 1.5 : c.tier === "large" ? 1.2 : 1));
      if (Math.random() > p) continue;
      const nat = (U.nationOfCountry || {})[c.country], named = (VISITORS[nat] || []).filter(v => year >= v[1] && year <= v[2]);
      const pickNamed = named.length && Math.random() < 0.5, v = pickNamed ? named[Math.floor(Math.random() * named.length)] : null, gen = GENERIC[Math.floor(Math.random() * GENERIC.length)];
      const b = free.sort((a, b2) => b2.size - a.size)[0], days = 1 + Math.floor(Math.random() * 3), fee = (60 + 60 * b.size) * days;
      g.visit = { name: v ? v[0] : gen[0], kind: v ? v[3] : gen[1], named: !!v, bid: b.id, until: nowHour(state) + days * 24, fee };
      S().addIncome(state, fee, "visitors"); g.earnedVisits = (g.earnedVisits || 0) + fee;
      if (v) S().telegram(state, nowHour(state), `${v[0]} moored at our ${c.name} terminal stop ${days} day${days > 1 ? "s" : ""} stop mooring fees ${gbp(fee)} stop`, false, { type: "city", id });
    }
  }
  // Who is moored where at this moment: the company's ships at their berths (or in the shed), and any visitor.
  function presentAt(state, id, g) {
    const now = nowHour(state), built = get(state, id), out = [], taken = new Set(), shed = [];
    const entries = ((state.docking || {})[id] || []).filter(x => x.ship != null && x.from <= now + 1 && x.to >= now - 1);
    const here = state.ships.filter(s => !s.lost && s.deliveryTick <= now && !s.leg && s.location === id);
    for (const s of here) {
      if (s.overhaulUntil && s.overhaulUntil > now) { shed.push(s); continue; }
      const e = entries.find(x => x.ship === s.id); let b = e && g.berths.find(bb => bb.id === e.bid && !taken.has(bb.id));
      if (!b) b = g.berths.filter(bb => !taken.has(bb.id)).sort((a, c) => c.size - a.size)[0];
      if (!b) continue; taken.add(b.id); out.push({ ship: s, berth: b });
    }
    if (built && built.visit) { const b = g.berths.find(bb => bb.id === built.visit.bid && !taken.has(bb.id)); if (b) out.push({ visit: built.visit, berth: b }); }
    return { moored: out, shed };
  }
  // An airship moored at her mast, nose to the mast head, lying downwind; drawn from her own dimensions and livery.
  function shipLook(state, s) {
    const c = U.SHIP_CLASSES[s.classId] || {}, d = c.design, lv = (d && d.livery) || (U.livery && U.livery.builders ? U.livery.builders(state) : {});
    let L = 150, D = 28; try { if (d) { const f = U.physics.figures(state, d); L = f.L || L; D = d.D || D; } else { const sz = F().shipSize(s.classId); L = [0, 110, 160, 230][sz]; D = [0, 20, 28, 38][sz]; } } catch (e) { /* keep the defaults */ }
    const cheat = (lv.decorations || []).find(x => x.type === "cheat");
    return { L, R: D / 2, hull: lv.hull || "#c9cbc8", lower: lv.twoTone ? lv.lower : null, fins: lv.fins || "#9b2a24", rudders: lv.rudders || lv.fins || "#9b2a24", stripe: cheat ? cheat.color : null, car: lv.car || "#b9bcbd", name: s.name, nameColour: (lv.name && lv.name.color) || "#2d2418" };
  }
  function ship3d(look, nose, heading, objs, shadows, uid) {
    const L = look.L, R = look.R, tail = [nose[0] + Math.cos(heading) * L, nose[1] + Math.sin(heading) * L, nose[2]];
    const a = P(...nose), b = P(...tail), Ls = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / Ls, uy = (b[1] - a[1]) / Ls;
    let vx = uy, vy = -ux; if (vy > 0) { vx = -vx; vy = -vy; }
    const r = R * 0.96 * HH + R * 0.04, prof = t => t < 0.16 ? Math.pow(Math.max(0, 1 - ((0.16 - t) / 0.16) ** 2), 0.45) : t > 0.58 ? 1 - 0.86 * ((t - 0.58) / 0.42) ** 1.7 : 1;
    const at = (t, k) => [a[0] + ux * Ls * t + vx * r * k, a[1] + uy * Ls * t + vy * r * k];
    const ts = Array.from({ length: 61 }, (_, i) => i / 60), pts2 = l => l.map(p => f1(p[0]) + "," + f1(p[1])).join(" ");
    const hull = ts.map(t => at(t, prof(t))).concat(ts.slice().reverse().map(t => at(t, -prof(t))));
    const cx = a[0] + ux * Ls * 0.4, cy = a[1] + uy * Ls * 0.4, gid = "sh" + uid;
    const svg = [`<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f1(cx + vx * r)}" y1="${f1(cy + vy * r)}" x2="${f1(cx - vx * r)}" y2="${f1(cy - vy * r)}"><stop offset="0" stop-color="#000" stop-opacity="0.15"/><stop offset="0.12" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.4"/><stop offset="0.55" stop-color="#000" stop-opacity="0.02"/><stop offset="0.85" stop-color="#000" stop-opacity="0.32"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient></defs>`];
    const fin = (sign, col) => { const t0 = 0.8, t2 = 0.99, e = r * 0.75, b0 = at(t0, sign * prof(t0)), b1 = at(t2, sign * prof(t2));
      const t0p = [b0[0] + vx * sign * e + ux * Ls * 0.05, b0[1] + vy * sign * e + uy * Ls * 0.05], t1p = [b1[0] + vx * sign * e * 0.8, b1[1] + vy * sign * e * 0.8];
      return `<polygon points="${pts2([b0, t0p, t1p, b1])}" fill="${col}" stroke="${INK}" stroke-width="0.7"/>`; };
    const px = -Math.sin(heading), py = Math.cos(heading);
    const hfin = sgn => { const q = [0.8, 0.99].map(t => [nose[0] + (tail[0] - nose[0]) * t, nose[1] + (tail[1] - nose[1]) * t, nose[2]]), rr = [R * prof(0.8), R * prof(0.99)], e = R * 0.75;
      return poly([[q[0][0] + px * sgn * rr[0], q[0][1] + py * sgn * rr[0], q[0][2]], [q[0][0] + px * sgn * (rr[0] + e) + Math.cos(heading) * L * 0.05, q[0][1] + py * sgn * (rr[0] + e) + Math.sin(heading) * L * 0.05, q[0][2]], [q[1][0] + px * sgn * (rr[1] + e * 0.8), q[1][1] + py * sgn * (rr[1] + e * 0.8), q[1][2]], [q[1][0] + px * sgn * rr[1], q[1][1] + py * sgn * rr[1], q[1][2]]], look.fins, INK, 0.7); };
    const near = depth(nose[0] + px, nose[1] + py) < depth(nose[0], nose[1]) ? 1 : -1;
    svg.push(hfin(-near), fin(1, look.fins));
    svg.push(`<polygon points="${pts2(hull)}" fill="${look.hull}" stroke="${INK}" stroke-width="1"/>`);
    if (look.lower) svg.push(`<polygon points="${pts2(ts.map(t => at(t, -0.15 * prof(t))).concat(ts.slice().reverse().map(t => at(t, -prof(t)))))}" fill="${look.lower}"/>`);
    svg.push(`<polygon points="${pts2(hull)}" fill="url(#${gid})"/>`);
    for (let k = 1; k < 13; k++) { const t = k / 13, p1 = at(t, prof(t)), p2 = at(t, -prof(t)); svg.push(`<line x1="${f1(p1[0])}" y1="${f1(p1[1])}" x2="${f1(p2[0])}" y2="${f1(p2[1])}" stroke="#000" stroke-width="0.4" opacity="0.13"/>`); }
    if (look.stripe) svg.push(`<polygon points="${pts2(ts.slice(6, -10).map(t => at(t, -0.06 * prof(t))).concat(ts.slice(6, -10).reverse().map(t => at(t, -0.16 * prof(t)))))}" fill="${look.stripe}"/>`);
    if (look.name) { const ang = Math.atan2(uy, ux) * 180 / Math.PI, mp = at(0.36, 0.28), flip = Math.abs(ang) > 90; svg.push(`<text transform="translate(${f1(mp[0])},${f1(mp[1])}) rotate(${(flip ? ang + 180 : ang).toFixed(1)})" font-family="Josefin Sans, sans-serif" font-weight="600" font-size="${f1(r * 0.36)}" letter-spacing="${f1(r * 0.05)}" fill="${look.nameColour}" text-anchor="middle">${String(look.name).toUpperCase()}</text>`); }
    svg.push(fin(-1, look.rudders), hfin(near));
    const g0 = at(0.1, -prof(0.1) * 0.98), g1 = at(0.19, -prof(0.19) * 0.98), down = [-vx * r * 0.3, -vy * r * 0.3];
    svg.push(`<polygon points="${pts2([g0, g1, [g1[0] + down[0], g1[1] + down[1]], [g0[0] + down[0], g0[1] + down[1]]])}" fill="${look.car}" stroke="${INK}" stroke-width="0.6"/>`);
    for (const t of [0.42, 0.6]) { const e0 = at(t, -prof(t) * 0.92), e1 = [e0[0] - vx * r * 0.4, e0[1] - vy * r * 0.4]; svg.push(`<line x1="${f1(e0[0])}" y1="${f1(e0[1])}" x2="${f1(e1[0])}" y2="${f1(e1[1])}" stroke="${INK}" stroke-width="0.7"/><ellipse cx="${f1(e1[0])}" cy="${f1(e1[1])}" rx="${f1(r * 0.3)}" ry="${f1(r * 0.13)}" transform="rotate(${(Math.atan2(uy, ux) * 180 / Math.PI).toFixed(1)},${f1(e1[0])},${f1(e1[1])})" fill="${look.car}" stroke="${INK}" stroke-width="0.6"/>`); }
    const mid = [(nose[0] + tail[0]) / 2, (nose[1] + tail[1]) / 2];
    objs.push([depth(mid[0], mid[1]) - L * 0.15, svg.join("")]);
    const sh = []; for (const t of ts) { const c3 = [nose[0] + (tail[0] - nose[0]) * t, nose[1] + (tail[1] - nose[1]) * t], gx = c3[0] + SD[0] * nose[2], gy = c3[1] + SD[1] * nose[2], rr = R * prof(t) * 0.9; sh.push([[gx + px * rr, gy + py * rr], [gx - px * rr, gy - py * rr]]); }
    shadows.push(poly(sh.map(x => x[0]).concat(sh.map(x => x[1]).reverse()), "#2a2216"));
  }
  // A ship drawn exactly as the game draws her elsewhere (hull, fins, cars, engines, livery, name, emblems), her side view
  // set upright in the vertical plane through her keel, nose at the mast head, lying downwind.
  function designOf(state, s) {
    const c = U.SHIP_CLASSES[s.classId]; if (!c || !c.design) return null;
    let lv = c.design.livery;
    if (c.revs && s.art) for (const r of Object.keys(c.revs)) if (U.designClass && U.designClass.artKey(c.id, r) === s.art) lv = c.revs[r];
    if (!lv && U.livery && U.livery.builders) lv = U.livery.builders(state);
    return { ...c.design, livery: lv };
  }
  function sideShip(d, nose, heading, objs, shadows) {
    const f = { ...U.physics.hullLengths(d) }, L = f.L, R = d.D / 2;
    const dir = [Math.cos(heading), Math.sin(heading)], o = P(...nose), lin = P(dir[0], dir[1], 0);
    const art = U.livery.side(d, f, x => x, y => y);
    objs.push([depth(nose[0] + dir[0] * L / 2, nose[1] + dir[1] * L / 2) - L * 0.15, `<g transform="matrix(${lin[0].toFixed(5)},${lin[1].toFixed(5)},0,${HH},${f1(o[0])},${f1(o[1])})" class="gt-ship">${art}</g>`]);
    const px = -dir[1], py = dir[0], sh = [], n = 40;
    for (let k = 0; k <= n; k++) { const x = L * k / n, rr = Math.max(0.2, U.physics.radius(d, x)) * 0.9, gx = nose[0] + dir[0] * x + SD[0] * nose[2], gy = nose[1] + dir[1] * x + SD[1] * nose[2]; sh.push([[gx + px * rr, gy + py * rr], [gx - px * rr, gy - py * rr]]); }
    shadows.push(poly(sh.map(q => q[0]).concat(sh.map(q => q[1]).reverse()), "#2a2216"));
    return { L, R };
  }
  // A ship drawn in the round from her design: the hull as a body of revolution from the same profile the physics uses,
  // painted from her livery (hull colour, two-tone, nose and tail, cheat lines, bands, chevrons, flashes, spine), with her
  // fins, control car, engine cars, name and emblems placed where the design puts them.
  const VIEW = (() => { const z = KK / HH, m = Math.hypot(SA, CA, z); return [SA / m, -CA / m, z / m]; })();    // towards the viewer
  const SUN = (() => { const v = [-0.45, -0.75, 0.55], m = Math.hypot(...v); return v.map(c => c / m); })();
  function paintAt(lv, f, R, x, fy, r) {                     // the livery's colour at a point: x along the hull, fy down the side (-1 top, 1 keel)
    const L = f.L; let c = lv.hull;
    if (lv.twoTone && fy > lv.split) c = lv.lower;
    if (lv.nose && x < f.ln * 0.42) c = lv.nose;
    if (lv.tail && x > L - f.lt * 0.3) c = lv.tail;
    const y = fy * r;                                          // metres below the centreline, as the side view measures it
    for (const dc of lv.decorations || []) {
      if (dc.type === "cheat" && (Math.abs(fy - dc.y) <= dc.t / 2 || (dc.flag && fy >= dc.y + dc.t * 1.2 && fy <= dc.y + dc.t * 1.7))) c = dc.color;
      if ((dc.type === "bow" || dc.type === "stern") && Array.from({ length: dc.n }, (_, i) => L * (dc.x + i * dc.w * 2.2)).some(x0 => x >= x0 && x <= x0 + L * dc.w)) c = dc.color;
      if (dc.type === "chevron") for (let i = 0; i < dc.n; i++) { const x0 = L * (0.015 + i * dc.w * 2.4) + L * dc.x * Math.min(1, Math.abs(y) / (R * 1.1)); if (x >= x0 && x <= x0 + L * dc.w) c = dc.color; }
      if (dc.type === "flash") { const u = (R * 1.1 - y) / (R * 2.2), x0 = L * dc.x + R * 1.2 * u; if (x >= x0 && x <= x0 + L * dc.w) c = dc.color; }
      if (dc.type === "spine" && fy <= -1 + dc.w * 0.5) c = dc.color;
      if (dc.type === "sun") { const len = L * dc.x; if (x < len * 2) { const a = Math.atan2(y / 1.2, (x - len) * R / len); const k = Math.floor((a + Math.PI / 2) / (Math.PI / dc.n)); if (k >= 0 && k < dc.n && (a + Math.PI / 2) - k * Math.PI / dc.n < Math.PI / dc.n / 2 && Math.hypot((x - len) / len, y / (R * 1.2)) <= 1) c = dc.color; } }
      if (dc.type === "speed") for (let i = 0; i < dc.n; i++) { const yy = dc.y + (i - (dc.n - 1) / 2) * 0.12, x0 = L * 0.1, x1 = x0 + L * dc.x * (1 - i * 0.12); if (x >= x0 && x <= x1 && Math.abs(fy - yy) < 0.035) c = dc.color; }
    }
    return c;
  }
  function solidShip(d, nose, heading, objs, shadows, uid) {
    const f = { ...U.physics.hullLengths(d) }, L = f.L, R = d.D / 2, lv = d.livery, rad = x => Math.max(0.05, U.physics.radius(d, Math.max(0, Math.min(L, x))));
    const dir = [Math.cos(heading), Math.sin(heading), 0], side = [-dir[1], dir[0], 0], up = [0, 0, 1];
    const near = side[0] * VIEW[0] + side[1] * VIEW[1] > 0 ? side : side.map(v => -v), far = near.map(v => -v);
    const C = x => [nose[0] + dir[0] * x, nose[1] + dir[1] * x, nose[2]];
    const at = (x, th) => { const c = C(x), r = rad(x); return [c[0] + r * (Math.sin(th) * near[0]), c[1] + r * (Math.sin(th) * near[1]), c[2] + r * Math.cos(th)]; };   // th: 0 at the top, pi/2 towards the viewer
    const pr = p => P(p[0], p[1], p[2]), pstr = l => l.map(p => { const q = pr(p); return f1(q[0]) + "," + f1(q[1]); }).join(" ");
    const planeMatrix = (o, ax) => { const a = P(ax[0], ax[1], ax[2]), q = pr(o); return `matrix(${a[0].toFixed(5)},${a[1].toFixed(5)},0,${HH},${f1(q[0])},${f1(q[1])})`; };
    const back = [], hull = [], front = [];
    // Fins: upper and lower in the vertical plane, the side fins flat; drawn behind or in front of the hull as they lie.
    const fs = U.livery.finShapes(d, f);
    const finPoly = (pts2, map) => pts2.map(([x, y]) => map(x, y));
    const shadeFin = (n, col) => shade(col, 0.66 + 0.4 * Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]));
    const fins = [
      { g: fs.side(-1), map: (x, y) => { const c = C(x); return [c[0], c[1], c[2] - y]; }, n: near, where: front },
      { g: fs.side(1), map: (x, y) => { const c = C(x); return [c[0], c[1], c[2] - y]; }, n: near, where: back },
      { g: fs.side(1), map: (x, y) => { const c = C(x); return [c[0] + far[0] * Math.abs(y), c[1] + far[1] * Math.abs(y), c[2]]; }, n: up, where: back },
      { g: fs.side(1), map: (x, y) => { const c = C(x); return [c[0] + near[0] * Math.abs(y), c[1] + near[1] * Math.abs(y), c[2]]; }, n: up, where: front }];
    for (const F2 of fins) {
      F2.where.push(`<polygon points="${pstr(finPoly(F2.g.fin, F2.map))}" fill="${shadeFin(F2.n, lv.fins)}" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/><polygon points="${pstr(finPoly(F2.g.rud, F2.map))}" fill="${shadeFin(F2.n, lv.rudders || lv.fins)}" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/>`);
      const n2 = Math.max(4, Math.round((F2.g.x1 - F2.g.x0) / 5));
      for (let i = 1; i < n2; i++) { const x = F2.g.x0 + (F2.g.x1 - F2.g.x0) * i / n2, r0 = rad(x), tip = Math.abs(F2.g.tip) * Math.sign(F2.g.root || F2.g.tip); F2.where.push(`<polyline points="${pstr([F2.map(x, Math.sign(tip) * r0), F2.map(x, tip * 0.98)])}" fill="none" stroke="#000" stroke-width="0.4" opacity="0.2"/>`); }
    }
    // The control car and engine cars, rounded: small bodies of their own, hung where the design puts them.
    function pod(x0, len, off, zc, rr, prof, col, glass) {          // off: sideways (towards the viewer), zc: height of its axis
      const ax = (x, th, k) => { const c = C(x), r = rr * prof((x - x0) / len) * (k || 1); return [c[0] + near[0] * (off + r * Math.sin(th)), c[1] + near[1] * (off + r * Math.sin(th)), zc + r * Math.cos(th)]; };
      const out = [], n = 12, m = 16, pts4 = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const xa = x0 + len * i / n, xb = x0 + len * (i + 1) / n, t0 = -Math.PI + 2 * Math.PI * j / m, t1 = t0 + 2 * Math.PI / m, tm = (t0 + t1) / 2;
        const nrm = [near[0] * Math.sin(tm), near[1] * Math.sin(tm), Math.cos(tm)];
        if (nrm[0] * VIEW[0] + nrm[1] * VIEW[1] + nrm[2] * VIEW[2] <= 0) continue;
        const lit = 0.5 + 0.6 * Math.max(0, nrm[0] * SUN[0] + nrm[1] * SUN[1] + nrm[2] * SUN[2]), c = shade(col, lit);
        out.push(`<polygon points="${pstr([ax(xa, t0), ax(xb, t0), ax(xb, t1), ax(xa, t1)])}" fill="${c}" stroke="${c}" stroke-width="0.8"/>`);
      }
      if (glass) { const xs3 = Array.from({ length: 9 }, (_, i) => x0 + len * (0.08 + 0.6 * i / 8)); out.push(`<polygon points="${pstr(xs3.map(x => ax(x, 1.15, 1.01)).concat(xs3.slice().reverse().map(x => ax(x, 1.6, 1.01))))}" fill="#2d3f4a" opacity="0.85"/>`); }
      for (let i = 0; i <= n; i++) for (let j = 0; j < 24; j++) pts4.push(pr(ax(x0 + len * i / n, 2 * Math.PI * j / 24)));
      out.push(`<polygon points="${convexHull(pts4).map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="none" stroke="${INK}" stroke-width="0.7"/>`);
      return out.join("");
    }
    const egg = t => t < 0.3 ? Math.sqrt(Math.max(0, 1 - ((0.3 - t) / 0.3) ** 2)) : 1 - 0.75 * ((t - 0.3) / 0.7) ** 2;
    const boat = t => t < 0.12 ? Math.sqrt(Math.max(0, 1 - ((0.12 - t) / 0.12) ** 2)) : t > 0.75 ? 1 - 0.6 * ((t - 0.75) / 0.25) : 1;
    {
      const g = d.systems && d.systems.gondola, a = f.ln + 1, b2 = g ? f.ln + g.len * 15 - 1 : f.ln + Math.min(14, (f.mid || 30) - 1), h = g ? Math.max(3, d.D * 0.15) : Math.max(2.4, d.D * 0.11);
      const zc = nose[2] - (rad(a + 3) + (d.car === "recessed" ? 0 : h / 2));
      back.push(pod(a, b2 - a, 0, zc, h * 0.55, boat, d.systems && d.systems.gondola ? (lv.gondolas || lv.car) : lv.car, true));
    }
    for (const e of (d.systems && d.systems.engines) || []) {
      const ex = U.physics.bayCentre(d, f.ln, e.bay), h = Math.max(2.8, d.D * 0.13), len = h * 2.7, xf = ex - len / 2;
      const sides = e.mount === "sides", rr2 = h / 2, list = sides ? [[rad(ex) * 1.05, front], [-rad(ex) * 1.05, back]] : [[0, back]];
      for (const [off, where] of list) {
        const zc = sides ? nose[2] - rad(ex) * 0.5 - h / 2 : nose[2] - (rad(ex) + d.D * 0.1 + h / 2);
        const strutTop = sides ? [C(ex)[0] + near[0] * off * 0.8, C(ex)[1] + near[1] * off * 0.8, nose[2] - rad(ex) * 0.3] : [C(ex)[0], C(ex)[1], nose[2] - rad(ex) * 0.95];
        const p0 = C(ex - len * 0.15), p1 = C(ex + len * 0.15), base = (p, k) => [p[0] + near[0] * off, p[1] + near[1] * off, zc + rr2 * 0.8];
        where.push(`<polyline points="${pstr([[strutTop[0] - dir[0] * len * 0.15, strutTop[1] - dir[1] * len * 0.15, strutTop[2]], base(p0)])}" fill="none" stroke="${INK}" stroke-width="0.8"/><polyline points="${pstr([[strutTop[0] + dir[0] * len * 0.15, strutTop[1] + dir[1] * len * 0.15, strutTop[2]], base(p1)])}" fill="none" stroke="${INK}" stroke-width="0.8"/>`);
        where.push(pod(xf, len, off, zc, rr2, egg, lv.engines || "#b9bcbd", false));
        const pc = C(xf + len * 1.02), prop = [pc[0] + near[0] * off, pc[1] + near[1] * off, zc];
        where.push(`<polyline points="${pstr([[prop[0], prop[1], prop[2] + h * 0.85], [prop[0], prop[1], prop[2] - h * 0.85]])}" fill="none" stroke="#6b4a2a" stroke-width="1.4" stroke-linecap="round"/>`);
      }
    }
    // The hull, facet by facet: only the side that faces the viewer, shaded by the way each facet faces the sun.
    const N = Math.max(60, Math.round(L / 2.5)), M = 48, xs = Array.from({ length: N + 1 }, (_, i) => L * (1 - Math.cos(Math.PI * i / N)) / 2);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const t0 = -Math.PI + 2 * Math.PI * j / M, t1 = t0 + 2 * Math.PI / M, tm = (t0 + t1) / 2, xm = (xs[i] + xs[i + 1]) / 2;
      const q = [at(xs[i], t0), at(xs[i + 1], t0), at(xs[i + 1], t1), at(xs[i], t1)];
      const u = q[2].map((v, k) => v - q[0][k]), v2 = q[3].map((v, k) => v - q[1][k]);
      let n = [u[1] * v2[2] - u[2] * v2[1], u[2] * v2[0] - u[0] * v2[2], u[0] * v2[1] - u[1] * v2[0]]; const m = Math.hypot(...n) || 1; n = n.map(c => c / m);
      const c = C(xm), mid = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2]; if ((mid[0] - c[0]) * n[0] + (mid[1] - c[1]) * n[1] + (mid[2] - c[2]) * n[2] < 0) n = n.map(v => -v);
      if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 0) continue;
      const fy = -Math.cos(tm), dl = n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2], lit = 0.46 + 0.62 * Math.max(0, dl) + 0.12 * Math.pow(Math.max(0, dl), 8) + 0.1 * Math.max(0, -n[2]);
      // Where a facet straddles the edge of a painted shape, it is cut into small pieces so the edge runs clean.
      const paint = (x, th) => paintAt(lv, f, R, x, -Math.cos(th), rad(x)), base = paint(xm, tm);
      const edge = [[xs[i], t0], [xs[i + 1], t0], [xs[i + 1], t1], [xs[i], t1], [xm, t0], [xm, t1], [xs[i], tm], [xs[i + 1], tm]].some(([x, th]) => paint(x, th) !== base);
      if (!edge) { const col = shade(base, lit); hull.push(`<polygon points="${pstr(q)}" fill="${col}" stroke="${col}" stroke-width="1.1" stroke-linejoin="round"/>`); }
      else {
        const k = 8, dx = (xs[i + 1] - xs[i]) / k, dt = (t1 - t0) / k;
        for (let a2 = 0; a2 < k; a2++) for (let b2 = 0; b2 < k; b2++) {
          const xa = xs[i] + dx * a2, ta = t0 + dt * b2, col = shade(paint(xa + dx / 2, ta + dt / 2), lit);
          hull.push(`<polygon points="${pstr([at(xa, ta), at(xa + dx, ta), at(xa + dx, ta + dt), at(xa, ta + dt)])}" fill="${col}" stroke="${col}" stroke-width="0.9" stroke-linejoin="round"/>`);
        }
      }
    }
    // Cheat lines are too fine for the facets: laid along the flank as strips of their own.
    for (const dc of lv.decorations || []) if (dc.type === "cheat") for (const [y0, y1] of [[dc.y - dc.t / 2, dc.y + dc.t / 2]].concat(dc.flag ? [[dc.y + dc.t * 1.2, dc.y + dc.t * 1.7]] : [])) {
      const ta = Math.acos(Math.max(-1, Math.min(1, -y0))), tb = Math.acos(Math.max(-1, Math.min(1, -y1))), xs2 = xs.filter(x => x > 0.5 && x < L - 0.5);
      hull.push(`<polygon points="${pstr(xs2.map(x => at(x, ta)).concat(xs2.slice().reverse().map(x => at(x, tb))))}" fill="${shade(dc.color, 0.95)}"/>`);
    }
    for (const [b0, m] of Object.entries((d.systems || {}).modules || {})) {
      if (m !== "passenger" || +b0 > d.bays) continue;
      const a0 = f.ln + (+b0 - 1) * 15, rows = ((d.systems.deckCount || {})[b0] || 1) > 1 && d.D >= U.physics.TWO_DECKS ? [0.62, 0.44] : [0.62];
      for (const fy of rows) { const th0 = Math.acos(-fy), th1 = Math.acos(-(fy + 0.1));
        for (let x = a0 + 0.9; x < a0 + 13.4; x += 2.1) hull.push(`<polygon points="${pstr([at(x, th0), at(x + 1.6, th0), at(x + 1.6, th1), at(x, th1)])}" fill="#d6e6ee" stroke="#2d2418" stroke-width="0.3"/>`); }
    }
    // Ring seams every bay, faintly.
    for (let x = f.ln % 15; x < L - 2; x += 15) if (x > 2) {                 // only the part of each ring that faces the viewer
      const c = C(x), pts3 = [];
      for (let j = 0; j <= 72; j++) { const th = -Math.PI + 2 * Math.PI * j / 72, p = at(x, th), n = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
        if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] > 0) pts3.push(p); else if (pts3.length) break; }
      if (pts3.length > 1) hull.push(`<polyline points="${pstr(pts3)}" fill="none" stroke="#000" stroke-width="0.5" opacity="0.14"/>`);
    }
    // The outline: the silhouette of the whole hull.
    const all3 = []; for (let i = 0; i <= N; i += 1) for (let j = 0; j < 48; j++) all3.push(pr(at(xs[i], 2 * Math.PI * j / 48)));
    const hullPts = convexHull(all3); hull.push(`<polygon points="${hullPts.map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="none" stroke="${INK}" stroke-width="1"/>`);
    // Name and emblems, as the design places them, on the side facing the viewer.
    const nm = lv.name || {};
    if (nm.text) { const font = (U.livery.FONTS || {})[nm.font] || { css: "Josefin Sans, sans-serif", weight: 600, spacing: 0.1 }, size = R * 0.34 * (nm.size || 1), nx = L * nm.x, fy = Math.max(-0.95, Math.min(0.95, nm.y || 0)), r0 = rad(nx), o = C(nx);
      const p = [o[0] + near[0] * r0 * Math.sqrt(1 - fy * fy) * 1.01, o[1] + near[1] * r0 * Math.sqrt(1 - fy * fy) * 1.01, o[2] - fy * r0];
      front.unshift(`<text transform="${planeMatrix(p, dir)}" fill="${nm.color}" font-family="${font.css}" font-weight="${font.weight}" font-size="${size.toFixed(2)}" letter-spacing="${(size * font.spacing).toFixed(2)}" dominant-baseline="middle">${esc(String(nm.text).toUpperCase())}</text>`); }
    const em = U.state && U.state.company.emblem;
    if (em && U.emblem) for (const e of lv.emblems || []) {
      const { x, y, m } = U.livery.emblemPlace(d, f, e), onFin = Math.abs(e.y) > 1, o = C(x);
      const p = onFin ? [o[0], o[1], o[2] - y] : [o[0] + near[0] * rad(x) * 1.01, o[1] + near[1] * rad(x) * 1.01, o[2] - y];
      if (onFin && y > 0) continue;                                               // the lower fin is hidden beneath the hull
      front.push(`<g transform="${planeMatrix(p, dir)}">${U.emblem.svg(em, m, `x="${(-m / 2).toFixed(2)}" y="${(-m / 2).toFixed(2)}" style="width:${m.toFixed(2)}px;height:${m.toFixed(2)}px"`)}</g>`);
    }
    const midp = C(L / 2);
    objs.push([depth(midp[0], midp[1]) - L * 0.15, `<g class="gt-ship">${back.join("")}${hull.join("")}${front.join("")}</g>`]);
    const sh = []; for (let k = 0; k <= 40; k++) { const x = L * k / 40, rr = rad(x) * 0.9, c = C(x), gx = c[0] + SD[0] * nose[2], gy = c[1] + SD[1] * nose[2]; sh.push([[gx + side[0] * rr, gy + side[1] * rr], [gx - side[0] * rr, gy - side[1] * rr]]); }
    shadows.push(poly(sh.map(q => q[0]).concat(sh.map(q => q[1]).reverse()), "#2a2216"));
  }
  function convexHull(p) {
    const a = p.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]), cr = (o, b, c) => (b[0] - o[0]) * (c[1] - o[1]) - (b[1] - o[1]) * (c[0] - o[0]), lo = [], hi = [];
    for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of a.reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // A visitor is drawn as a builders' ship of her size, in navy grey or plain colours, with her own name.
  function visitorDesign(state, size, visit) {
    const c = Object.values(U.SHIP_CLASSES).find(c2 => c2.design && F().shipSize(c2.id) === size) || Object.values(U.SHIP_CLASSES).find(c2 => c2.design);
    if (!c) return null;
    const look = VISIT_LOOK[visit.kind] || VISIT_LOOK.navy, base = c.design.livery || (U.livery.fresh ? U.livery.fresh(state) : {});
    return { ...c.design, livery: { ...base, hull: look.hull, twoTone: false, nose: null, tail: null, fins: look.fins, rudders: look.fins, decorations: look.stripe ? [{ type: "cheat", color: look.stripe, y: 0, t: 0.04, flag: false }] : [],
      emblems: [], name: { ...(base.name || {}), text: visit.named ? visit.name : "", color: "#2d2418" } } };
  }
  // A bus or van on its road, facing the way the road runs.
  function vehicle(x, y, ang, len, wid, h, body, roof, objs, shadows) {
    const c = Math.cos(ang), s2 = Math.sin(ang), pt = (u, v) => [x + c * u - s2 * v, y + s2 * u + c * v], q = [pt(-len / 2, -wid / 2), pt(len / 2, -wid / 2), pt(len / 2, wid / 2), pt(-len / 2, wid / 2)];
    const svg = []; for (let k = 0; k < 4; k++) { const p0 = q[k], p1 = q[(k + 1) % 4], nx = p1[1] - p0[1], ny = -(p1[0] - p0[0]); if (!visible(nx, ny)) continue; svg.push(poly([[...p0, 0.3], [...p1, 0.3], [...p1, h], [...p0, h]], shade(body, facef(nx / Math.hypot(nx, ny), ny / Math.hypot(nx, ny))), INK, 0.4)); }
    svg.push(poly(q.map(p => [...p, h]), roof, INK, 0.4)); objs.push([depth(x, y) - 0.2, svg.join("")]);
    shadows.push(poly(q.map(p => [p[0] + SD[0] * h, p[1] + SD[1] * h]).concat(q.slice().reverse()), "#2a2216"));
  }
  function along(pts, t) { const L = linkLen(pts); let d = t * L; for (let k = 1; k < pts.length; k++) { const s2 = dist(pts[k - 1], pts[k]); if (d <= s2) { const f = s2 ? d / s2 : 0; return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f, Math.atan2(pts[k][1] - pts[k - 1][1], pts[k][0] - pts[k - 1][0])]; } d -= s2; } const n = pts.length; return [pts[n - 1][0], pts[n - 1][1], 0]; }
  function lifeOnField(state, id, g, objs, shadows) {
    const { moored } = presentAt(state, id, g), day = state.tick / 24;
    for (const m of moored) {
      const b = m.berth, h = BERTH[b.size].mast + 1.5, wobble = Math.sin((day + b.id * 1.7) * 2.1) * 0.25;   // she swings a little with the wind
      let d = null; try { d = m.ship ? designOf(state, m.ship) : visitorDesign(state, b.size, m.visit); } catch (e) { d = null; }
      let drawn = false;
      if (d) { try { solidShip(d, [b.x + 2, b.y, h], wobble, objs, shadows); drawn = true; } catch (e) { try { sideShip(d, [b.x + 2, b.y, h], wobble, objs, shadows); drawn = true; } catch (e2) { /* fall back to the plain drawing */ } } }
      if (!drawn) { const look = m.ship ? shipLook(state, m.ship) : { ...VISIT_LOOK[m.visit.kind], L: [0, 110, 160, 210][b.size], R: [0, 10, 14, 18][b.size], rudders: VISIT_LOOK[m.visit.kind].fins, car: "#b9bcbd", name: m.visit.named ? m.visit.name : "", nameColour: "#2d2418" };
      ship3d({ ...look, R: Math.max(look.R, 6) }, [b.x + 3, b.y, h + look.R * 0.15], wobble, objs, shadows, (m.ship ? "s" + m.ship.id : "v") + "_" + b.id); }
      for (let k = 0; k < 6; k++) { const a2 = k * 1.1 + b.id, p0 = P(b.x + Math.cos(a2) * 9, b.y + Math.sin(a2) * 9, 0), p1 = P(b.x + Math.cos(a2) * 9, b.y + Math.sin(a2) * 9, 1.8);
        objs.push([depth(b.x + Math.cos(a2) * 9, b.y + Math.sin(a2) * 9), `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}" stroke="#2d2418" stroke-width="1.4" stroke-linecap="round"/>`]); }
    }
    for (const l of g.links) {
      if (l.k !== "busroad" && l.k !== "service") continue;
      const t = ((day * (l.k === "busroad" ? 3.1 : 2.3) + l.id * 0.37) % 2 + 2) % 2, q = along(l.pts, t > 1 ? 2 - t : t);
      if (l.k === "busroad") vehicle(q[0], q[1], q[2], 10, 2.6, 3.3, "#9b2a24", "#e8dcc4", objs, shadows); else vehicle(q[0], q[1], q[2], 6, 2.3, 2.6, "#4c5a3c", "#3d4a30", objs, shadows);
    }
  }
  function drawSite(g, id, opts) {
    const W = site(g).w, D = site(g).d, sur = surroundings(id, g), sel = opts.sel || {}, set = setting(id), e = effectsOf(g, id);
    const ground = [sur.ground], objs = sur.objs.slice(), shadows = [sur.shadows], plan = [];
    plan.push(`<rect x="0" y="0" width="${W}" height="${D}" fill="#c7ca97"/>`);
    for (let y0 = LAND + 10; y0 < D; y0 += 20) plan.push(`<rect x="0" y="${y0}" width="${W}" height="${Math.min(10, D - y0)}" fill="#ccd09d" opacity="0.85"/>`);
    for (const [k, kind] of Object.entries(g.grounds)) {
      const [i, j] = unkey(k), x = i * CELL, y = j * CELL, T = GROUND[kind];
      if (kind === "pool") { plan.push(`<rect x="${x}" y="${y}" width="10.2" height="10.2" fill="#b6c289"/><circle cx="${x + 5}" cy="${y + 5}" r="4.2" fill="#a6bfbc" stroke="${INK}" stroke-width="0.6" class="ink"/>`); continue; }
      plan.push(`<rect x="${x}" y="${y}" width="10.2" height="10.2" fill="${T.c}"/>`);
      if (kind === "carpark") plan.push(`<line x1="${x + 5}" y1="${y + 1}" x2="${x + 5}" y2="${y + 9}" stroke="#8c7f68" stroke-width="0.5" class="ink"/>`);
      if (kind === "trees") tree(x + 5, y + 5, 4.6, 10, ["#7f9460", "#869a64", "#76895a"][(i + j) % 3], objs, shadows);
    }
    for (const b of g.berths) {
      const R = BERTH[b.size].r, hl = sel.ref === b;
      plan.push(`<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="#d3d6a6" stroke="${hl ? "#c9a65b" : "#8d8a62"}" stroke-width="${hl ? 2.4 : 0.8}" ${hl ? "" : 'stroke-dasharray="6 4"'} class="ink"/><circle cx="${b.x}" cy="${b.y}" r="14" fill="#d9cfb3" stroke="${INK}" stroke-width="0.6" class="ink"/>`);
      mastSvg(b, objs, shadows);
    }
    for (const s of g.sheds) { const A = apronRect(s); plan.push(`<rect x="${A.x0}" y="${A.y0}" width="${A.x1 - A.x0}" height="${A.y1 - A.y0}" fill="#e3dcb7" stroke="#8d8a62" stroke-width="0.6" stroke-dasharray="5 4" class="ink"/>`); }
    // Connections: every road's edge first, then every road's surface, so that junctions and bends run together.
    const roads = g.links.filter(l => l.k === "busroad" || l.k === "service" || l.k === "walkway"), wid = { busroad: 8, service: 7, walkway: 7 };
    for (const l of roads) plan.push(`<polyline points="${ppts(l.pts)}" fill="none" stroke="${sel.ref === l ? "#c9a65b" : "#8c7f68"}" stroke-width="${wid[l.k] + (sel.ref === l ? 3 : 1.2)}" stroke-linejoin="round" stroke-linecap="round"/>`);
    for (const l of roads) plan.push(`<polyline points="${ppts(l.pts)}" fill="none" stroke="${{ busroad: "#cfc2a2", service: "#d6cbb0", walkway: "#b9ae94" }[l.k]}" stroke-width="${wid[l.k]}" stroke-linejoin="round" stroke-linecap="round"/>`);
    for (const l of g.links.filter(l => l.k === "haul")) {
      const hl = sel.ref === l;
      plan.push(`<polyline points="${ppts(l.pts)}" fill="none" stroke="#8a7c66" stroke-width="6.5" stroke-dasharray="0.8 1.6" stroke-linejoin="round"/>`);
      for (const d of [-2.2, 2.2]) plan.push(`<polyline points="${ppts(offsetLine(l.pts, d))}" fill="none" stroke="${hl ? "#c9a65b" : "#3f362c"}" stroke-width="${hl ? 1.2 : 0.7}" stroke-linejoin="round"/>`);
    }
    for (const l of g.links.filter(l => l.k === "gasmain")) plan.push(`<polyline points="${ppts(l.pts)}" fill="none" stroke="${sel.ref === l ? "#c9a65b" : "#8b3a2a"}" stroke-width="${sel.ref === l ? 2.4 : 1.1}" stroke-dasharray="7 4" stroke-linejoin="round" opacity="0.85"/>`);
    // The railway station's platform out to the line, and the tram shelter on the pavement.
    const maxI = Math.floor(W / CELL) - 1;
    for (const b of g.blds.filter(b => b.k === "station")) {
      const edge = b.cells.map(unkey).filter(([i]) => set.side === "left" ? i === 0 : i === maxI); if (!edge.length) continue;
      const j0 = Math.min(...edge.map(c => c[1])), j1 = Math.max(...edge.map(c => c[1])) + 1, x0 = set.side === "left" ? sur.rx + 12 : W, x1 = set.side === "left" ? 0 : sur.rx - 12;
      plan.push(`<rect x="${x0}" y="${j0 * CELL - 15}" width="${x1 - x0}" height="${(j1 - j0) * CELL + 30}" fill="#d6cbb2" stroke="${INK}" stroke-width="0.6" class="ink"/>`);
      const cx = (x0 + x1) / 2, cy = (j0 + j1) / 2 * CELL;
      objs.push([depth(cx, cy), poly([[cx - 4, j0 * CELL - 10, 3.2], [cx + 4, j0 * CELL - 10, 3.2], [cx + 4, j1 * CELL + 10, 3.2], [cx - 4, j1 * CELL + 10, 3.2]], "#9b2a24", INK, 0.5)]);
    }
    for (const b of g.blds.filter(b => b.k === "tram")) {
      const edge = b.cells.map(unkey).filter(([, j]) => j === 0); if (!edge.length) continue;
      const i0 = Math.min(...edge.map(c => c[0])), x = i0 * CELL;
      objs.push([depth(x + 8, -16) - 1, poly([[x - 6, -19, 0], [x + 14, -19, 0], [x + 14, -19, 3.4], [x - 6, -19, 3.4]], shade("#e7dcc0", 1.02), INK, 0.6) + poly([[x + 14, -19, 0], [x + 14, -14, 0], [x + 14, -14, 3.4], [x + 14, -19, 3.4]], shade("#e7dcc0", 0.8), INK, 0.6) + poly([[x - 6, -19, 3.4], [x + 14, -19, 3.4], [x + 14, -14, 3.4], [x - 6, -14, 3.4]], "#9b2a24", INK, 0.6)]);
    }
    plan.push(`<rect x="0" y="0" width="${W}" height="${D}" fill="none" stroke="#5d4e38" stroke-width="1.2" stroke-dasharray="10 5" class="ink"/>`);
    for (const l of g.links) if (l.k === "walkway") walkwaySvg(l, objs, shadows, sel.ref === l);
    for (const s of g.sheds) shedSvg(s, objs, shadows, sel.ref === s);
    for (const q of g.gas) gasSvg(q, objs, shadows, sel.ref === q);
    for (const b of g.blds) buildingSvg(b, objs, shadows, sel.ref === b);
    if (U.state) lifeOnField(U.state, id, g, objs, shadows, plan);
    objs.sort((a, b) => b[0] - a[0]);
    return `<g>${ground.join("")}</g><g transform="${PLANM}" class="gt-plan">${plan.join("")}</g><g opacity="0.24">${shadows.join("")}</g><g>${objs.map(o => o[1]).join("")}</g>`;
  }


  // ===================================================================================================================
  // The screen. Everything done here is a plan until it is built; the plan is paid for when built.
  let root = null, cityId = null, tool = "select", sel = null, msg = "", view = null, stroke = null, drawing = null, ghost = null, panning = null;
  let draft = null, undo = [], shape = "rect", modal = null, designing = null;
  const GA = () => U.grandArt;
  const TOOLS = [
    ["Look and change", [["select", "Select and move", "Click anything to see it, move it, or take it down. Drag to look around; the wheel zooms."],
      ["remove", "Remove", "Click something to take it out of the plan; drag across buildings and grounds to clear them."]]],
    ["Flying field", [["berth:1", BERTH[1].name, "", BERTH[1].cost], ["berth:2", BERTH[2].name, "", BERTH[2].cost], ["berth:3", BERTH[3].name, "", BERTH[3].cost],
      ["shed:1", SHED[1].name, "", SHED[1].cost], ["shed:2", SHED[2].name, "", SHED[2].cost], ["shed:3", SHED[3].name, "", SHED[3].cost], ["gas:gasplant", GASK.gasplant.name, GASK.gasplant.about, GASK.gasplant.cost], ["gas:hestore", GASK.hestore.name, GASK.hestore.about, GASK.hestore.cost]]],
    ["Buildings", Object.entries(BLD).map(([k, T]) => ["bld:" + k, T.name, T.about, T.cost, "a cell"])],
    ["Grounds", Object.entries(GROUND).map(([k, T]) => ["gnd:" + k, T.name, T.about, T.cost, "a cell"])],
    ["Connections", Object.entries(LINK).map(([k, T]) => ["link:" + k, T.name, T.about, T.cost, "a metre"])]
  ];
  BERTH[1].about = "For small ships. A ship swings round her mast with the wind, so the circle stays clear.";
  BERTH[2].about = "For medium ships, or small."; BERTH[3].about = "For any ship.";
  for (const n of [1, 2, 3]) SHED[n].about = `Overhauls ${["", "small", "medium", "all"][n]} ships. Doors face the clear apron; R turns it.`;
  TOOLS[1][1].forEach(t => { if (!t[2]) { const [kind, n] = t[0].split(":"); t[2] = (kind === "berth" ? BERTH : SHED)[n].about; } });

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const copy = g => JSON.parse(JSON.stringify(g));
  function open(id) {
    if (!U.state || !get(U.state, id)) return;
    cityId = id; tool = "select"; sel = null; msg = ""; stroke = null; drawing = null; ghost = null; modal = null; designing = null;
    draft = copy(get(U.state, id)); undo = [];
    if (!root) {
      root = document.createElement("div"); root.className = "grand-office"; document.body.appendChild(root);
      root.addEventListener("click", onClick); root.addEventListener("change", onChange);
      root.addEventListener("mousedown", onDown); window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
      root.addEventListener("wheel", onWheel, { passive: false }); root.addEventListener("dblclick", onDbl); root.addEventListener("contextmenu", e => { if (e.target.closest(".gt-view")) e.preventDefault(); });
      document.addEventListener("keydown", onKey);
    }
    fit(); root.hidden = false; document.body.classList.add("office-open"); render();
  }
  function fit() {
    const W = site(draft).w, D = site(draft).d, c = [P(0, -40), P(W, -40), P(W, D), P(0, D)], xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    view = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 40, w: Math.max(...xs) - Math.min(...xs) + 60, h: Math.max(...ys) - Math.min(...ys) + 70 };
  }
  // Leaving: a plan not yet built is built, thrown away, or kept on the drawing board.
  function close(force) {
    if (!root) return;
    if (!force && planCost(get(U.state, cityId), draft).changed) { modal = "leave"; render(); return; }
    root.hidden = true; document.body.classList.remove("office-open"); draft = null; S().save(U.state); if (U.ui && U.ui.render) U.ui.render();
  }
  const ask = q => confirm(q);
  function change(fn) {                                                // every change to the plan can be undone
    const before = JSON.stringify(draft), r = fn();
    if (r && typeof r === "string") { msg = r; return r; }
    undo.push(before); if (undo.length > 60) undo.shift(); msg = ""; return "";
  }
  function refOf(g, s) {                                               // a selection, found again in the plan after an undo
    if (!s) return null; const list = { berth: g.berths, shed: g.sheds, gas: g.gas, link: g.links, bld: g.blds }[s.type];
    const ref = list && list.find(x => x.id === s.ref.id); return ref ? { ...s, ref } : null;
  }
  function render() {
    const st = U.state, g = draft, c = U.cityById[cityId], built = get(st, cityId), pc = planCost(built, g), sm = summaryOf(g, cityId, (st.facilityCost[cityId] || 0) + pc.add - pc.remove), next = SITES[g.site + 1];
    const keep = {}; for (const k of [".g-palette", ".g-summary"]) { const el = root.querySelector(k); if (el) keep[k] = el.scrollTop; }
    const palette = `<div class="gt-shape">Draw buildings and grounds as <button data-gshape="rect" class="${shape === "rect" ? "on" : ""}">Rectangles</button><button data-gshape="brush" class="${shape === "brush" ? "on" : ""}">With a brush</button></div>` +
      TOOLS.map(([group, items]) => `<h3>${group}</h3>${items.map(([k, name, about, cost, per]) => `<button class="g-item${tool === k ? " on" : ""}" data-gtool="${k}" title="${esc(about)}"><b>${name}</b>${cost != null ? `<span>${gbp(cost)}${per ? ` <i>${per}</i>` : ""}</span>` : "<span></span>"}<small>${esc(about)}</small></button>`).join("")}`).join("");
    const plans = pc.changed ? `<div class="gt-plans"><span>Plans not yet built: <b>${pc.net >= 0 ? gbp(pc.net) + " to build" : gbp(-pc.net) + " back"}</b></span><button data-g="build" class="primary">Build the plans</button><button data-g="discard">Discard</button></div>` : `<div class="gt-plans quiet">No plans waiting. Anything you draw is a plan until you build it.</div>`;
    root.innerHTML = `<header class="g-bar"><div><h1>${esc(c.name)} Grand Terminal</h1><span class="g-sub">Bird's-eye view</span></div>${plans}<span class="g-money">Funds ${gbp(st.money)}${st.loan ? `<br><small>Owed to the bank ${gbp(st.loan)}</small>` : ""}</span><button data-g="undo" ${undo.length ? "" : "disabled"}>Undo</button><button data-g="fit">Whole site</button><button data-g="close">Close</button></header>
      <div class="g-body"><aside class="g-palette">${palette}</aside>
      <main class="g-field"><svg class="gt-view" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><rect x="-6000" y="-6000" width="12000" height="12000" fill="#ccc79c"/><g class="gt-site"></g><g class="gt-ghost"></g></svg><p class="g-msg"></p></main>
      <aside class="g-summary">${selPanel(g)}<h3>What this port will provide</h3><dl>${sm.rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>
        ${berthTable(g)}${presentPanel(st, g)}
        <h3>Money</h3><dl><dt>Spent on this port</dt><dd>${gbp(st.facilityCost[cityId] || 0)}</dd><dt>Upkeep, once built</dt><dd>${gbp(sm.upkeep)} a year</dd><dt>Concessions earned</dt><dd>${gbp(built.earned || 0)}</dd></dl>
        <h3>Land</h3><p>The site is ${site(g).w} by ${site(g).d} metres.</p>${next ? `<button data-g="land">Add land to ${next.w} by ${next.d}, ${gbp(next.cost)}</button>` : "<p>It is as large as it can be.</p>"}</aside></div>
      ${modal === "leave" ? `<div class="gt-modal"><div><h2>Build the plans?</h2><p>You have plans here that are not yet built: ${pc.net >= 0 ? `they cost ${gbp(pc.net)}` : `they bring ${gbp(-pc.net)} back`}.${pc.net > st.money ? ` That is more than your funds; the difference would be borrowed.` : ""}</p>
        <button data-g="leave-build" class="primary">Build them${pc.net > 0 ? `, ${gbp(pc.net)}` : ""}</button><button data-g="leave-discard">Discard them</button><button data-g="leave-stay">Keep planning</button></div></div>` : ""}`;
    if (designing) { renderDesign(st, g); for (const k in keep) { const el = root.querySelector(k); if (el) el.scrollTop = keep[k]; } return; }
    root.querySelector(".gt-site").innerHTML = drawSite(g, cityId, { sel });
    for (const k in keep) { const el = root.querySelector(k); if (el) el.scrollTop = keep[k]; }
    setView(); hint(); drawGhost();
  }
  function renderDesign(st, g) {
    const b = g.blds.find(x => x.id === designing); if (!b) { designing = null; render(); return; }
    const A = GA(), c = st.company, d = A.design(b, c.nation), K = A.KIND[b.k], el = A.elevation(b, c.nation, c.name, (c.emblem || {}).c1, U.cityById[cityId].name);
    root.querySelector(".g-field").innerHTML = `<div class="gt-elev"><svg viewBox="0 0 ${Math.ceil(el.w)} ${Math.ceil(el.h)}" preserveAspectRatio="xMidYMid meet">${el.svg}</svg></div>
      <p class="g-msg"><span class="g-hint">${esc(BLD[b.k].name)}: front elevation, the face it shows the road. Changes are part of the plan, built when the plan is.</span></p>`;
    const opt = (field, table, cur) => `<select data-gdsel="${field}">${Object.entries(table).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${typeof v === "string" ? v : v.name}${v.cost ? ` (${gbp(v.cost)})` : ""}</option>`).join("")}</select>`;
    const styles = `<select data-gdsel="style">${A.styleChoices(st, cityId).map(([grp, ks]) => `<optgroup label="${grp}">${ks.map(k => `<option value="${k}" ${k === d.style ? "selected" : ""}>${A.STYLES[k].name}</option>`).join("")}</optgroup>`).join("")}${A.styleChoices(st, cityId).some(([, ks]) => ks.includes(d.style)) ? "" : `<option value="${d.style}" selected>${A.STYLES[d.style].name}</option>`}</select>`;
    const extra = b.design ? A.extraCost(b, BLD[b.k].cost) : 0;
    root.querySelector(".g-summary").innerHTML = `<div class="gt-design-form"><h3>Designing</h3><p><b>${esc(BLD[b.k].name)}</b>, ${b.cells.length} cells.</p>
      <label>Style <small>sets every choice below; each can then be changed</small>${styles}</label>
      <label>Walls${opt("walls", A.WALLS, d.walls)}</label>
      <label>Storeys <span class="gt-step"><button data-gd="storeys:-1" ${d.storeys <= K.min ? "disabled" : ""}>−</button><b>${d.storeys}</b><button data-gd="storeys:1" ${d.storeys >= K.max ? "disabled" : ""}>+</button></span></label>
      <label>Roof${opt("roof", A.ROOFS, d.roof)}</label>
      <label>Windows${opt("windows", A.WINDOWS, d.windows)}</label>
      <label>Ornament${opt("ornament", A.ORNAMENT, d.ornament)}</label>
      ${K.tower ? `<label>Tower${opt("tower", A.TOWERS, d.tower)}</label><label>Entrance${opt("entrance", A.ENTRANCES, d.entrance)}</label>` : ""}
      <label class="gt-check"><input type="checkbox" data-gdsel="sign" ${d.sign ? "checked" : ""}> Lettering on the front</label>
      ${d.sign ? `<label><input type="text" data-gdsel="text" value="${esc(d.text || "")}" placeholder="${esc(c.name)}" maxlength="40"></label>` : ""}
      <label class="gt-check"><input type="checkbox" data-gdsel="flags" ${d.flags ? "checked" : ""}> Flags in the company colour</label>
      <p class="small">${b.design ? `This design adds ${gbp(extra)} to the building's price: the facade work${d.storeys > K.def ? ", the extra storeys" : ""}${d.tower !== "none" && K.tower ? ", the tower" : ""}${d.entrance !== "plain" && K.tower ? ", the entrance" : ""}${d.ornament !== "plain" ? ", the ornament" : ""}.` : "The builders' plain design, at no extra cost."} More storeys mean more room inside.</p>
      <button data-g="design-done" class="primary">Back to the site</button></div>`;
  }
  function designField(field, value) {
    const b = draft.blds.find(x => x.id === designing); if (!b) return;
    change(() => {
      const A = GA(), K = A.KIND[b.k], d = b.design = { ...A.design(b, U.state.company.nation) };
      if (field === "style") A.applyStyle(d, value, b.k);
      else if (field === "storeys") d.storeys = Math.max(K.min, Math.min(K.max, d.storeys + value));
      else d[field] = value;
      draft.rev = (draft.rev || 0) + 1; return "";
    });
    render();
  }
  function onChange(e) {
    const t = e.target; if (!t.dataset || !t.dataset.gdsel) return;
    designField(t.dataset.gdsel, t.type === "checkbox" ? t.checked : t.value);
  }
  function selPanel(g) {
    if (!sel) return `<p class="g-hint">${toolHint()}</p>`;
    let title = "", about = "", acts = "";
    const rm = `<button data-g="remove">Remove</button>`;
    if (sel.type === "berth") { title = BERTH[sel.ref.size].name; about = `${BERTH[sel.ref.size].about}<br><br>${accessText(effectsOf(g, cityId).berths[g.berths.indexOf(sel.ref)])}`; acts = `<button data-g="move">Move</button>${rm}`; }
    if (sel.type === "shed") { title = SHED[sel.ref.size].name; about = SHED[sel.ref.size].about; acts = `<button data-g="move">Move</button><button data-g="turn">Turn</button>${rm}`; }
    if (sel.type === "gas") { title = GASK[sel.ref.k].name; about = GASK[sel.ref.k].about; acts = `<button data-g="move">Move</button>${rm}`; }
    if (sel.type === "link") { const L = linkLen(sel.ref.pts); title = LINK[sel.ref.k].name; about = `${LINK[sel.ref.k].about}<br><br>${Math.round(L)} metres.`; acts = rm; }
    if (sel.type === "bld") { const T = BLD[sel.ref.k], n = sel.ref.cells.length, e = effectsOf(g, cityId); title = T.name; about = `${T.about}<br><br>${n} cell${n > 1 ? "s" : ""}, ${n * 100} square metres.`;
      if (sel.ref.k === "station") about += e.station ? " <b class=\"ok\">Joined to the line by its platform.</b>" : " <b>It does not reach the fence on the railway side, so no trains call.</b>";
      if (sel.ref.k === "tram") about += e.tram ? " <b class=\"ok\">On the road: the trams stop outside.</b>" : " <b>It does not reach the fence on the road, so no trams call.</b>";
      acts = (sel.ref.k !== "tram" ? `<button data-g="design" class="primary">Design this building</button>` : "") + rm; }
    return `<div class="g-chosen"><h3>${title}</h3><p>${about}</p>${acts}</div>`;
  }
  function accessText(n) {
    const pax = n.pax < Infinity ? (n.covered ? "Passengers walk out under cover." : "Passengers come out by bus or on foot.") : "<b>No way for passengers to reach it from the terminal.</b>";
    const cargo = n.cargo < Infinity ? "Goods and mail come by road." : "<b>No road for goods and mail.</b>";
    const gas = n.gas ? "Gas is piped to it." : "<b>No gas main: carts top ships up slowly.</b>";
    return `${pax} ${cargo} ${gas} A ship here spends ${n.extra < 0.05 ? "no time" : `${n.extra.toFixed(1)} hours`} beyond her usual turnaround.`;
  }
  function presentPanel(st, g) {
    const p = presentAt(st, cityId, g), built = get(st, cityId), rows = [];
    for (const m of p.moored) rows.push(`<li>${m.ship ? esc(m.ship.name) : `<i>${esc(m.visit.name[0].toUpperCase() + m.visit.name.slice(1))}</i>, visiting until ${S().dateAtHour ? esc(String(S().dateAtHour(m.visit.until).toUTCString().slice(5, 11))) : ""}`} <span>berth ${g.berths.indexOf(m.berth) + 1}</span></li>`);
    for (const s2 of p.shed) rows.push(`<li>${esc(s2.name)} <span>in the shed</span></li>`);
    return `<h3>At the port now</h3>${rows.length ? `<ul class="gt-present">${rows.join("")}</ul>` : `<p class="small">No ships here at the moment.</p>`}${built.earnedVisits ? `<p class="small">Visiting airships have paid ${gbp(built.earnedVisits)} in mooring fees.</p>` : ""}`;
  }
  function berthTable(g) {
    const e = effectsOf(g, cityId); if (!e.berths.length) return "";
    return `<h3>Berths</h3><table class="gt-berths"><tr><th></th><th>Size</th><th>Passengers</th><th>Cargo</th><th>Gas</th><th>Extra time</th></tr>${e.berths.map((b, i) => `<tr><td>${i + 1}</td><td>${["", "Small", "Medium", "Large"][b.size]}</td><td>${b.pax < Infinity ? (b.covered ? "Covered" : "Yes") : "<b>None</b>"}</td><td>${b.cargo < Infinity ? "Yes" : "<b>None</b>"}</td><td>${b.gas ? "Piped" : "<b>Carts</b>"}</td><td>${b.extra.toFixed(1)} h</td></tr>`).join("")}</table>`;
  }
  function toolHint() {
    if (tool === "select") return "Click anything on the site to see it, move it, or remove it. Drag to look around; the mouse wheel zooms.";
    if (tool === "remove") return "Click something to take it out of the plan, or drag across buildings and grounds to clear them. Ctrl+Z undoes.";
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas")) return "Click on the site to place it. R turns a shed. Esc puts it away.";
    if (tool === "bld:station") return "Draw it against the fence on the railway side, shown in green: a platform will join it to the line.";
    if (tool === "bld:tram") return "Draw it against the fence on the road, shown in green: the trams will stop outside.";
    if (tool.startsWith("bld") || tool.startsWith("gnd")) return shape === "rect" ? "Drag out a rectangle. Next to a building of the same kind, it enlarges that building." : "Hold the mouse button and paint cells. Next to a building of the same kind, it enlarges that building.";
    if (tool.startsWith("link")) return "Click to set points along the way; double-click (or press Enter) to finish. End it at a building, a shed's doors, gasholders, or a mooring mast (a covered walkway: at the circle's edge). Esc cancels.";
    return "";
  }
  function hint(t) { const m = root.querySelector(".g-msg"); if (m) m.innerHTML = esc(t != null ? t : msg) || `<span class="g-hint">${esc(toolHint())}</span>`; }
  function setView() { const svg = root && root.querySelector(".gt-view"); if (svg) svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); }
  function svgPoint(e) { const svg = root.querySelector(".gt-view"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; }
  const planAt = e => unP(...svgPoint(e));
  const snap = (v, s) => Math.round(v / s) * s;
  const cellAt = p => [Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)];
  function hitTest(g, p) {
    const [i, j] = cellAt(p), b = cellOwner(g, i, j); if (b) return { type: "bld", ref: b };
    for (const q of g.gas) if (near(p, gasRect(q), 2)) return { type: "gas", ref: q };
    for (const s of g.sheds) if (near(p, shedRect(s), 2)) return { type: "shed", ref: s };
    let best = null;
    for (const l of g.links) for (let s = 1; s < l.pts.length; s++) { const d = dist(nearestOn(l.pts[s - 1], l.pts[s], p), p); if (d < 7 && (!best || d < best.d)) best = { d, l }; }
    if (best) return { type: "link", ref: best.l };
    for (const bb of g.berths) if (dist(p, [bb.x, bb.y]) < BERTH[bb.size].r) return { type: "berth", ref: bb };
    return null;
  }
  function placingThing(p) {
    const [kind, v] = tool.split(":"), x = snap(p[0], 10), y = snap(p[1], 10);
    if (kind === "berth") return { type: "berth", x, y, size: +v };
    if (kind === "shed") return { type: "shed", x, y, size: +v, r: ghost && ghost.r || 0 };
    if (kind === "gas") return { type: "gas", x, y, k: v };
    if (kind === "move") return { type: sel.type, ...sel.ref, ref: sel.ref, x, y, r: ghost && ghost.r != null ? ghost.r : sel.ref.r };
    return null;
  }
  function problemOf(g, t) { return t.type === "berth" ? berthProblem(g, t, t.ref) : t.type === "shed" ? shedProblem(g, t, t.ref) : t.type === "gas" ? gasProblem(g, t, t.ref) : ""; }
  function cellsOf(st) {                                                // the cells a stroke or rectangle covers
    if (st.rect) { const out = [], [a, b] = st.rect; for (let i = Math.min(a[0], b[0]); i <= Math.max(a[0], b[0]); i++) for (let j = Math.min(a[1], b[1]); j <= Math.max(a[1], b[1]); j++) out.push(key(i, j)); return out; }
    return [...st.cells];
  }
  const sq = (i, j, fill, op, stroke2) => { const x = i * CELL, y = j * CELL; return poly([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], fill, stroke2 || "none", stroke2 ? 1 : 0, `fill-opacity="${op}"`); };
  function drawGhost() {
    const layer = root && root.querySelector(".gt-ghost"); if (!layer) return;
    const g = draft; let out = "";
    // Where a station or tram stop must touch the fence.
    if (tool === "bld:station" || tool === "bld:tram") {
      const maxI = Math.floor(site(g).w / CELL) - 1, maxJ = Math.floor(site(g).d / CELL) - 1, side = setting(cityId).side;
      if (tool === "bld:tram") for (let i = 0; i <= maxI; i++) out += sq(i, 0, "#2e6b47", 0.16);
      else for (let j = 0; j <= maxJ; j++) out += sq(side === "left" ? 0 : maxI, j, "#2e6b47", 0.16);
    }
    if (ghost && ghost.thing) {
      const t = ghost.thing, bad = problemOf(g, t), col = bad ? "#a3372c" : "#2e6b47";
      if (t.type === "berth") out += poly(circ(t.x, t.y, BERTH[t.size].r), col, col, 2, 'fill-opacity="0.18"') + poly(circ(t.x, t.y, 14, 0, 32), col, col, 1, 'fill-opacity="0.4"');
      if (t.type === "shed") { const R = shedRect(t), A = apronRect(t); out += poly([[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]], col, col, 2, 'fill-opacity="0.3"') + poly([[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]], col, col, 1, 'fill-opacity="0.12" stroke-dasharray="5 4"'); }
      if (t.type === "gas") { const R = gasRect(t); out += poly([[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]], col, col, 2, 'fill-opacity="0.3"'); }
      hint(bad || `Click to ${tool === "move" ? "set it down here" : "place it here"}.`);
    }
    if (stroke) {
      const cells = cellsOf(stroke); let n = 0;
      for (const k of cells) { const [i, j] = unkey(k), bad = stroke.erase ? !(cellOwner(g, i, j) || g.grounds[k]) : cellProblem(g, i, j); if (!bad) n++; out += sq(i, j, bad ? "#a3372c" : stroke.erase ? "#7a4a2a" : "#2e6b47", bad ? 0.25 : 0.45); }
      const T = stroke.erase ? null : tool.startsWith("bld") ? BLD[tool.slice(4)] : GROUND[tool.slice(4)];
      hint(stroke.erase ? `Clear ${n} cell${n === 1 ? "" : "s"}` : `${T.name}: ${n} cell${n === 1 ? "" : "s"}, ${gbp(n * T.cost)}`);
    }
    if (ghost && ghost.cell && !stroke) out += sq(...ghost.cell, "#2e6b47", 0.25, "#2e6b47");
    if (drawing) {
      const all2 = drawing.pts.concat(ghost && ghost.pt ? [ghost.pt] : []), bad = all2.length > 1 && linkProblem(g, all2, drawing.k), L = linkLen(all2);
      out += pline(all2, bad ? "#a3372c" : "#2e6b47", 2.4, 'stroke-dasharray="6 4"') + all2.map(p => { const q = P(...p); return `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="3" fill="#f4efe1" stroke="${INK}" stroke-width="1"/>`; }).join("");
      hint(bad || `${LINK[drawing.k].name}: ${Math.round(L)} metres, ${gbp(L * LINK[drawing.k].cost)}. Double-click to finish.`);
    }
    layer.innerHTML = out;
  }
  function snapLink(g, p) {
    const targets = [];
    for (const b of g.berths) { targets.push([b.x, b.y]); if (drawing && drawing.k === "walkway") { const r = BERTH[b.size].r, d = dist(p, [b.x, b.y]) || 1; targets.push([b.x + (p[0] - b.x) * r / d, b.y + (p[1] - b.y) * r / d]); } }
    for (const s of g.sheds) targets.push(doorPoint(s));
    for (const q of g.gas) targets.push([q.x, q.y]);
    for (const l of g.links) for (const q of l.pts) targets.push(q);
    let best = null; for (const t of targets) { const d = dist(t, p); if (d < 14 && (!best || d < best.d)) best = { d, t }; }
    return best ? best.t.slice() : [snap(p[0], 10), snap(p[1], 10)];
  }
  function cellsBetween(a, b) { const out = [], n = Math.max(1, Math.ceil(dist(a, b) / 4)); for (let k = 0; k <= n; k++) out.push(key(...cellAt([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]))); return out; }
  const painting = () => tool.startsWith("bld") || tool.startsWith("gnd");
  function onDown(e) {
    if (modal || !e.target.closest(".gt-view")) return;
    const g = draft, p = planAt(e);
    if (e.button === 2 || e.button === 1 || (tool === "select" && e.button === 0 && !hitTest(g, p))) { panning = { at: [e.clientX, e.clientY], v: { ...view }, moved: false }; e.preventDefault(); return; }
    if (e.button !== 0) return;
    const c = cellAt(p);
    if (painting()) { stroke = shape === "rect" ? { rect: [c, c] } : { cells: new Set([key(...c)]), last: p }; drawGhost(); e.preventDefault(); }
    if (tool === "remove") { const h = hitTest(g, p); if (h && h.type !== "bld") return; stroke = { rect: [c, c], erase: true }; drawGhost(); e.preventDefault(); }
  }
  function onMove(e) {
    if (!root || root.hidden || modal) return;
    if (panning) {
      const svg = root.querySelector(".gt-view"), s2 = Math.max(view.w / svg.clientWidth, view.h / svg.clientHeight);
      const dx = e.clientX - panning.at[0], dy = e.clientY - panning.at[1]; if (Math.abs(dx) + Math.abs(dy) > 3) panning.moved = true;
      view.x = panning.v.x - dx * s2; view.y = panning.v.y - dy * s2; setView(); return;
    }
    if (!e.target.closest || !e.target.closest(".gt-view")) return;
    const g = draft, p = planAt(e);
    if (stroke) { if (stroke.rect) stroke.rect[1] = cellAt(p); else { for (const k of cellsBetween(stroke.last, p)) stroke.cells.add(k); stroke.last = p; } drawGhost(); return; }
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas") || tool === "move") { ghost = { ...(ghost || {}) }; ghost.thing = placingThing(p); drawGhost(); return; }
    if (tool.startsWith("link")) { ghost = { pt: snapLink(g, p) }; drawGhost(); return; }
    if (painting() || tool === "remove") { ghost = { cell: cellAt(p) }; drawGhost(); }
  }
  function onUp() {
    if (panning) { const was = panning; panning = null; if (was.moved) { root.dataset.dragged = "1"; setTimeout(() => delete root.dataset.dragged, 0); } return; }
    if (!stroke) return;
    const list = cellsOf(stroke).map(unkey), was = stroke; stroke = null;
    if (was.erase) { const one = list.length === 1; change(() => { const n = erase(draft, list); return n ? "" : one ? "skip" : "Nothing to clear there."; }); if (msg === "skip") msg = ""; }
    else change(() => paint(draft, tool.slice(4), list) ? "" : "Nothing can be built there.");
    sel = refOf(draft, sel); render();
  }
  function onWheel(e) {
    if (!e.target.closest(".gt-view") || modal) return; e.preventDefault();
    const q = svgPoint(e), f = Math.exp(e.deltaY * 0.0015), nw = Math.min(4000, Math.max(100, view.w * f)), k = nw / view.w;
    view.x = q[0] - (q[0] - view.x) * k; view.y = q[1] - (q[1] - view.y) * k; view.w = nw; view.h *= k; setView();
  }
  function finishLink() {
    if (!drawing) return;
    const pts2 = drawing.pts.filter((p, i, a) => !i || dist(p, a[i - 1]) > 0.5), k = drawing.k; drawing = null; ghost = null;
    if (pts2.length >= 2) change(() => addLink(draft, k, pts2));
    render();
  }
  function onDbl(e) { if (drawing && e.target.closest(".gt-view")) { e.preventDefault(); finishLink(); } }
  function doUndo() { if (!undo.length) return; const keepRev = (draft.rev || 0) + 1; draft = JSON.parse(undo.pop()); draft.rev = keepRev; sel = refOf(draft, sel); msg = ""; render(); }
  function onKey(e) {
    if (!root || root.hidden) return;
    if (modal) { if (e.key === "Escape") { modal = null; render(); } return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); doUndo(); return; }
    if (designing && e.target && /INPUT|SELECT/.test(e.target.tagName)) return;
    if (e.key === "Escape" && designing) { designing = null; render(); return; }
    if (e.key === "Escape") { if (drawing) { drawing = null; render(); return; } if (tool !== "select") { tool = "select"; ghost = null; render(); return; } if (sel) { sel = null; render(); return; } close(); return; }
    if (e.key === "Enter" && drawing) finishLink();
    if ((e.key === "Delete" || e.key === "Backspace") && sel && tool === "select") { e.preventDefault(); const s = sel; if (!change(() => removeThing(draft, s))) sel = null; render(); }
    if ((e.key === "r" || e.key === "R") && ghost && ghost.thing && ghost.thing.type === "shed") { ghost.r = ((ghost.thing.r || 0) + 1) % 4; ghost.thing.r = ghost.r; drawGhost(); }
  }
  function onClick(e) {
    const st = U.state, g = draft, b = e.target.closest("button");
    if (b) {
      if (b.dataset.gtool) { designing = null; tool = b.dataset.gtool; sel = null; ghost = null; drawing = null; msg = ""; render(); return; }
      if (b.dataset.gshape) { shape = b.dataset.gshape; render(); return; }
      if (b.dataset.gd) { const [f, v] = b.dataset.gd.split(":"); designField(f, +v); return; }
      const a = b.dataset.g;
      if (a === "close") { if (designing) designing = null; close(); return; }
      if (a === "design") { designing = sel.ref.id; render(); return; }
      if (a === "design-done") { designing = null; render(); return; }
      if (a === "fit") { fit(); setView(); return; }
      if (a === "undo") { doUndo(); return; }
      if (a === "build" || a === "leave-build") {
        const r = commit(st, cityId, draft, ask);
        if (r && r !== "cancelled") { msg = r; modal = null; render(); return; }
        if (r === "cancelled") { modal = null; render(); return; }
        draft = copy(get(st, cityId)); undo = []; sel = refOf(draft, sel); msg = "The plans are built."; modal = null;
        if (a === "leave-build") { close(true); return; }
        render(); return;
      }
      if (a === "discard" || a === "leave-discard") { draft = copy(get(st, cityId)); undo = []; sel = null; msg = ""; modal = null; if (a === "leave-discard") { close(true); return; } render(); return; }
      if (a === "leave-stay") { modal = null; render(); return; }
      if (a === "land") { change(() => buyLand(draft)); around.clear(); render(); return; }
      if (a === "remove") { const s = sel; if (!change(() => removeThing(draft, s))) sel = null; render(); return; }
      if (a === "turn") { const s = sel; change(() => moveThing(draft, s, s.ref.x, s.ref.y, (s.ref.r + 1) % 4)); render(); return; }
      if (a === "move") { tool = "move"; ghost = { r: sel.ref.r }; msg = ""; render(); return; }
      return;
    }
    if (modal || !e.target.closest(".gt-view") || root.dataset.dragged) return;
    const p = planAt(e);
    if (tool === "select") { sel = hitTest(g, p); msg = ""; render(); return; }
    if (tool === "remove") { const h = hitTest(g, p); if (h && h.type !== "bld") { change(() => removeThing(draft, h)); render(); } return; }
    if (tool === "move") { const t = placingThing(p), s = sel; if (!change(() => moveThing(draft, s, t.x, t.y, t.r))) { tool = "select"; ghost = null; } render(); return; }
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas")) {
      const t = placingThing(p); change(() => t.type === "berth" ? placeBerth(draft, t) : t.type === "shed" ? placeShed(draft, t) : placeGas(draft, t)); ghost = null; render(); return;
    }
    if (tool.startsWith("link")) {
      const q = snapLink(g, p), now = Date.now();
      if (drawing && drawing.last && now - drawing.last < 450 && dist(drawing.pts[drawing.pts.length - 1], q) < 1) { finishLink(); return; }
      if (!drawing) drawing = { k: tool.slice(5), pts: [q], last: now };
      else { if (dist(drawing.pts[drawing.pts.length - 1], q) > 0.5) drawing.pts.push(q); drawing.last = now; }
      drawGhost(); return;
    }
  }

  U.grand = { daily, presentAt, solidShip, sideShip, designOf, FOUND, SITES, BERTH, SHED, BLD, GROUND, LINK, MANAGED, get, effects, effectsOf, summary, canFound, found, sync, boarded, monthly, dock, open, close,
    planCost, commit, placeBerth, placeShed, placeGas, paint, erase, addLink, removeThing, buyLand, layout, network, drawSite, P, unP,
    get draft() { return draft; } };
})(window.UpShip);
