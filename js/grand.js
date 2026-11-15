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
    station: { name: "Railway halt", cost: 1500, h: 7, wall: "#cfae86", roof: "#a7957c", win: "punched", storey: 3.5, about: "Passengers by train: 8% more demand. It must stand beside the line." },
    tram: { name: "Tram stop", cost: 2500, h: 3.5, wall: "#e7dcc0", roof: "#9b2a24", win: "none", storey: 3.5, about: "Passengers by tram: 4% more demand. It must stand on the road." }
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
  function linkProblem(g, pts) {
    if (pts.length < 2) return "Draw at least two points.";
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
    const places = { hall: [], freight: [], gas: [], shed: [], berth: g.berths.map(() => []) };
    nodes.forEach((n, ix) => {
      for (const b of g.blds) if (b.k === "hall" || b.k === "freight") if (b.cells.some(k => { const [i, j] = unkey(k); return near(n.p, cellRect(i, j), 9); })) places[b.k].push(ix);
      for (const q of g.gas) if (dist(n.p, [q.x, q.y]) <= 26) places.gas.push(ix);
      for (const s of g.sheds) if (dist(n.p, doorPoint(s)) <= 26) places.shed.push(ix);
      g.berths.forEach((b, bi) => { if (dist(n.p, boardPoint(b)) <= Math.max(40, BERTH[b.size].r * 0.4)) places.berth[bi].push(ix); });
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
    const best = (d, list) => list.reduce((m, ix) => Math.min(m, d[ix]), Infinity);
    const covered = bi => { const ws = places.berth[bi].filter(ix => nodes[ix].k === "walkway" && dp[ix] < Infinity); return ws.length > 0; };
    return g.berths.map((b, bi) => ({ pax: best(dp, places.berth[bi]), cargo: best(dc, places.berth[bi]), gas: best(dg, places.berth[bi]) < Infinity, haul: best(dh, places.berth[bi]) < Infinity, covered: covered(bi) }));
  }
  // The extra hours a ship spends at a berth beyond her usual turnaround, and why.
  function handling(n) {
    const pax = n.pax < Infinity ? 0.15 + n.pax : 1.5, cargo = n.cargo < Infinity ? 0.2 + n.cargo : 1.0;
    return Math.max(pax, cargo) + (n.gas ? 0 : 1.0);
  }

  // What the site provides -------------------------------------------------------------------------------------------
  const cache = new Map();
  function effects(state, id) {
    const g = get(state, id); if (!g) return null;
    const stamp = g.rev || 0, c = cache.get(id);
    if (c && c.g === g && c.rev === stamp) return c.e;
    const cells = k => g.blds.filter(b => b.k === k).reduce((a, b) => a + b.cells.length, 0);
    const net = network(g), set = setting(id), maxI = Math.floor(site(g).w / CELL) - 1;
    const station = g.blds.some(b => b.k === "station" && b.cells.some(k => { const [i] = unkey(k); return set.side === "left" ? i === 0 : i === maxI; }));
    const tram = g.blds.some(b => b.k === "tram" && b.cells.some(k => unkey(k)[1] === 0));
    const shedOn = g.sheds.filter((s, si) => g.berths.some((b, bi) => net[bi].haul));
    const hall = cells("hall"), covered = g.berths.length ? net.filter(n => n.covered).length / g.berths.length : 0;
    const show = Object.values(g.grounds).reduce((a, k) => a + ({ lawn: 0.01, trees: 0.015, pool: 0.05 }[k] || 0), 0) + hall * 0.01;
    const e = { masts: g.berths.length, berths: g.berths.map((b, i) => ({ size: b.size, ...net[i], extra: handling(net[i]) })),
      shed: Math.max(0, ...shedOn.map(s => s.size)), sheds: g.sheds.length, gasplant: g.gas.some(q => q.k === "gasplant") ? 1 : 0, hestore: g.gas.some(q => q.k === "hestore") ? 1 : 0,
      hall, pax: Math.max(40, hall * 18), tons: 15 + cells("freight") * 5 + hall,
      demand: 1 + Math.min(0.2, hall * 0.0025) + (station ? 0.08 : 0) + (tram ? 0.04 : 0) + covered * 0.03, station, tram,
      perPax: cells("restaurant") * 0.012 + Math.min(0.6, cells("hotel") * 0.02), works: cells("works") >= 4 && shedOn.length > 0, show };
    cache.set(id, { g, rev: stamp, e }); return e;
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
        if (n === 0) g.links.push({ id: g.next++, k: "walkway", pts: [back, [back[0], Math.max(back[1] + 10, b.y - BERTH[b.size].r * 0.2)], [b.x, Math.max(back[1] + 10, b.y - BERTH[b.size].r * 0.2)]].filter((p, i, a) => !i || dist(p, a[i - 1]) > 1) });
        else g.links.push({ id: g.next++, k: "busroad", pts: [east, [east[0] + 20, lane], [b.x, lane], [b.x, b.y - BERTH[b.size].r * 0.2]] });
      });
      if (g.berths[0]) g.links.push({ id: g.next++, k: "service", pts: [west, [west[0] - 20, lane], [g.berths[0].x - 20, lane], [g.berths[0].x - 20, g.berths[0].y - BERTH[g.berths[0].size].r * 0.2]] });
      for (const q of g.gas) for (const b of g.berths) g.links.push({ id: g.next++, k: "gasmain", pts: [[q.x, q.y], [q.x, b.y], [b.x, b.y]] });
      for (const s of g.sheds) for (const b of g.berths) { const d0 = doorPoint(s); g.links.push({ id: g.next++, k: "haul", pts: [d0, [d0[0] + 30, d0[1]], [b.x, b.y]] }); }
      g.links = g.links.filter(l => !linkProblem(g, l.pts) || l.k === "gasmain");
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
    const g = layout(state, id, wantFrom(state, id, { count: n("mast"), shed, terminal: hall >= 2 ? 3 : 2, gasplant: n("gasplant"), hestore: n("hestore"), earned: old.earned }));
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
    const g = layout(state, id, wantFrom(state, id, m)); if (!g) return "There is no room to lay it out.";
    const why = pay(state, id, FOUND, "the grand terminal", ask); if (why) return why;
    all(state)[id] = g; sync(state, id); return "";
  }

  // Changing the site ------------------------------------------------------------------------------------------------
  function priceOf(thing) {
    if (thing.type === "berth") return BERTH[thing.size].cost;
    if (thing.type === "shed") return SHED[thing.size].cost;
    if (thing.type === "gas") return GASK[thing.k].cost;
    if (thing.type === "link") return Math.round(linkLen(thing.pts) * LINK[thing.k].cost);
    return 0;
  }
  function placeBerth(state, id, b, ask) { const g = get(state, id), why = berthProblem(g, b); if (why) return why; const p = pay(state, id, BERTH[b.size].cost, "the mooring circle", ask); if (p) return p; g.berths.push({ id: g.next++, x: b.x, y: b.y, size: b.size }); sync(state, id); return ""; }
  function placeShed(state, id, s, ask) { const g = get(state, id); if (g.sheds.length >= 3) return "Three sheds is the most a site can work."; const why = shedProblem(g, s); if (why) return why; const p = pay(state, id, SHED[s.size].cost, "the shed", ask); if (p) return p; g.sheds.push({ id: g.next++, x: s.x, y: s.y, size: s.size, r: s.r }); sync(state, id); return ""; }
  function placeGas(state, id, q, ask) { const g = get(state, id); if (g.gas.some(x => x.k === q.k)) return "One is enough."; const why = gasProblem(g, q); if (why) return why; const p = pay(state, id, GASK[q.k].cost, GASK[q.k].name.toLowerCase(), ask); if (p) return p; g.gas.push({ id: g.next++, x: q.x, y: q.y, k: q.k }); sync(state, id); return ""; }
  function moveThing(state, id, thing, x, y, r) {
    const g = get(state, id), to = { ...thing, x, y, r: r == null ? thing.r : r };
    const why = thing.type === "berth" ? berthProblem(g, to, thing.ref) : thing.type === "shed" ? shedProblem(g, to, thing.ref) : gasProblem(g, to, thing.ref);
    if (why) return why;
    thing.ref.x = x; thing.ref.y = y; if (r != null) thing.ref.r = r; sync(state, id); return "";
  }
  // Painting: cells are added to a building of the same kind they touch, or start a new one.
  function paint(state, id, kind, list, ask) {
    const g = get(state, id), isB = !!BLD[kind], ok = list.filter(([i, j]) => !cellProblem(g, i, j) && (isB || true));
    if (!ok.length) return "Nothing can be built there.";
    const cost = ok.length * (isB ? BLD[kind] : GROUND[kind]).cost, p = pay(state, id, cost, `${ok.length} cell${ok.length > 1 ? "s" : ""} of ${(isB ? BLD[kind] : GROUND[kind]).name.toLowerCase()}`, ask);
    if (p) return p;
    if (!isB) { for (const [i, j] of ok) g.grounds[key(i, j)] = kind; sync(state, id); return ""; }
    for (const [i, j] of ok) {
      const k = key(i, j), touching = g.blds.filter(b => b.k === kind && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => b.cells.includes(key(i + a, j + c))));
      delete g.grounds[k];
      if (!touching.length) { g.blds.push({ id: g.next++, k: kind, cells: [k] }); continue; }
      const keep = touching[0]; keep.cells.push(k);
      for (const o of touching.slice(1)) { keep.cells.push(...o.cells); g.blds = g.blds.filter(b => b !== o); }
    }
    sync(state, id); return "";
  }
  function erase(state, id, list) {
    const g = get(state, id); let back = 0;
    for (const [i, j] of list) {
      const k = key(i, j), b = cellOwner(g, i, j);
      if (b) { b.cells = b.cells.filter(c => c !== k); back += BLD[b.k].cost; if (!b.cells.length) g.blds = g.blds.filter(x => x !== b); }
      else if (g.grounds[k]) { back += GROUND[g.grounds[k]].cost; delete g.grounds[k]; }
    }
    refund(state, id, back); sync(state, id); return back;
  }
  // Drawing a connection: an end that comes near another connection's line is joined to it there.
  function addLink(state, id, k, pts, ask) {
    const g = get(state, id); pts = pts.map(p => p.slice());
    for (const end of [0, pts.length - 1]) {
      let best = null;
      for (const l of g.links) { if (!LINK[l.k].fam.some(f => LINK[k].fam.includes(f))) continue;
        for (let s = 1; s < l.pts.length; s++) { const q = nearestOn(l.pts[s - 1], l.pts[s], pts[end]); const d = dist(q, pts[end]); if (d <= 12 && (!best || d < best.d)) best = { d, q, l, s }; } }
      if (best) { pts[end] = best.q; if (dist(best.q, best.l.pts[best.s - 1]) > 1 && dist(best.q, best.l.pts[best.s]) > 1) best.l.pts.splice(best.s, 0, best.q.slice()); }
    }
    const why = linkProblem(g, pts); if (why) return why;
    const p = pay(state, id, Math.round(linkLen(pts) * LINK[k].cost), LINK[k].name.toLowerCase(), ask); if (p) return p;
    g.links.push({ id: g.next++, k, pts }); sync(state, id); return "";
  }
  function nearestOn(a, b, p) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return [a[0] + dx * t, a[1] + dy * t]; }
  function removeThing(state, id, sel) {
    const g = get(state, id);
    if (sel.type === "berth") { if (g.berths.length <= 1) return "A port needs one mooring circle at least."; g.berths = g.berths.filter(x => x !== sel.ref); refund(state, id, BERTH[sel.ref.size].cost); }
    if (sel.type === "shed") { g.sheds = g.sheds.filter(x => x !== sel.ref); refund(state, id, SHED[sel.ref.size].cost); }
    if (sel.type === "gas") { g.gas = g.gas.filter(x => x !== sel.ref); refund(state, id, GASK[sel.ref.k].cost); }
    if (sel.type === "link") { g.links = g.links.filter(x => x !== sel.ref); refund(state, id, linkLen(sel.ref.pts) * LINK[sel.ref.k].cost); }
    if (sel.type === "bld") { if (sel.ref.k === "hall" && g.blds.filter(b => b.k === "hall").length <= 1) return "The port needs its terminal building. Paint over or erase parts of it to reshape it."; g.blds = g.blds.filter(x => x !== sel.ref); refund(state, id, sel.ref.cells.length * BLD[sel.ref.k].cost); }
    sync(state, id); return "";
  }
  function buyLand(state, id, ask) { const g = get(state, id), n = SITES[g.site + 1]; if (!n) return "The site is as large as it can be."; const p = pay(state, id, n.cost, "more land", ask); if (p) return p; g.site++; sync(state, id); return ""; }

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
    list.push({ from: best.t, to: best.t + stay + best.b.extra + pen, b: best.b.i });
    return { delay: best.t - arrive + best.b.extra + pen, fee: 0 };
  }
  function summary(state, id) {
    const g = get(state, id), e = effects(state, id), built = (state.facilityCost[id] || 0);
    const access = e.berths.map(b => b.pax < Infinity).filter(Boolean).length;
    return { e, built, upkeep: built * F().UPKEEP, rows: [
      ["Mooring circles", g.berths.length ? g.berths.map(b => ["", "S", "M", "L"][b.size]).join(" ") : "None"],
      ["Reached by passengers", `${access} of ${g.berths.length}`],
      ["Shed", e.shed ? F().SIZE_NAMES[e.shed] : g.sheds.length ? "Not joined to a berth" : "None"],
      ["Gas", [e.gasplant ? "Hydrogen" : "", e.hestore ? (e.gasplant ? "helium" : "Helium") : ""].filter(Boolean).join(" and ") || "None of your own"],
      ["Passengers a day", e.pax], ["Cargo a day", e.tons + " tons"],
      ["Passenger demand", e.demand > 1.001 ? `${Math.round((e.demand - 1) * 100)}% more` : "As the city's"],
      ["Concessions", e.perPax ? `${gbp(e.perPax * 100)} per 100 passengers` : "None"],
      ["Overhauls", e.works ? "A quarter cheaper" : e.shed ? "At the usual price" : "None here"]] };
  }

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
      const ridge = y1 - d / 2, sv = [];
      for (const [p0, p1, n] of [[[x0, y1], [x0 + w, y1], [0, -1]], [[x0 + w, y1], [x0 + w, y1 - d], [1, 0]]]) {
        sv.push(poly([[...p0, 0], [...p1, 0], [...p1, h], [...p0, h]], shade(wall, facef(...n)), INK, 0.5));
        for (const t0 of [0.2, 0.55]) for (let zz = 2; zz < h - 2; zz += 4) sv.push(poly([[p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, zz], [p0[0] + (p1[0] - p0[0]) * (t0 + 0.14), p0[1] + (p1[1] - p0[1]) * (t0 + 0.14), zz], [p0[0] + (p1[0] - p0[0]) * (t0 + 0.14), p0[1] + (p1[1] - p0[1]) * (t0 + 0.14), zz + 1.8], [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, zz + 1.8]], "#5b5550"));
      }
      sv.push(poly([[x0, y1, h], [x0 + w, y1, h], [x0 + w, ridge, h + 5], [x0, ridge, h + 5]], shade("#a98f74", 1.08), INK, 0.5));
      sv.push(poly([[x0 + w, y1, h], [x0 + w, y1 - d, h], [x0 + w, ridge, h + 5]], shade("#a98f74", 0.8), INK, 0.5));
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
    const T = BLD[b.k], set = new Set(b.cells), z1 = T.h;
    for (const k of b.cells) {
      const [i, j] = unkey(k), x = i * CELL, y = j * CELL, g2 = CELL, svg = [];
      const edges = [[[x, y], [x + g2, y], [0, -1], key(i, j - 1)], [[x + g2, y], [x + g2, y + g2], [1, 0], key(i + 1, j)], [[x + g2, y + g2], [x, y + g2], [0, 1], key(i, j + 1)], [[x, y + g2], [x, y], [-1, 0], key(i - 1, j)]];
      for (const [p0, p1, n, nb] of edges) {
        if (set.has(nb) || !visible(...n)) continue;
        const f = facef(...n), c = shade(T.wall, f);
        svg.push(poly([[...p0, 0], [...p1, 0], [...p1, z1], [...p0, z1]], c, c, 0.6), windows(p0, p1, 0, z1, T, f), line([...p0, 0], [...p1, 0], INK, 0.5), line([...p0, z1], [...p1, z1], INK, 0.8));
      }
      svg.push(poly([[x, y, z1], [x + g2, y, z1], [x + g2, y + g2, z1], [x, y + g2, z1]], hilite ? shade(T.roof, 1.12) : T.roof, hilite ? shade(T.roof, 1.12) : T.roof, 0.6));
      for (const [p0, p1, , nb] of edges) if (!set.has(nb)) svg.push(line([...p0, z1], [...p1, z1], hilite ? "#c9a65b" : INK, hilite ? 2 : 0.8));
      objs.push([depth(x + 5, y + 5), svg.join("")]);
      shadows.push(shadowOf(x, y, x + g2, y + g2, z1));
    }
    // The name on the roof of the larger buildings.
    if (b.cells.length >= 6) {
      const cs = b.cells.map(unkey), cx = cs.reduce((a, c) => a + c[0], 0) / cs.length * CELL + 5, cy = cs.reduce((a, c) => a + c[1], 0) / cs.length * CELL + 5, p = P(cx, cy, T.h);
      objs.push([depth(cx, cy) - 200, `<text x="${f1(p[0])}" y="${f1(p[1] + 2)}" class="gt-roofname">${T.name}</text>`]);
    }
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
  const LINKSTYLE = {
    walkway: { c: "#e8e0cc", w: 6 }, busroad: { c: "#cfc2a2", w: 8 }, service: { c: "#d6cbb0", w: 7 }, gasmain: { c: "#8b3a2a" }, haul: { c: "#3f362c" }
  };
  function linkGround(l, hilite) {
    const st = LINKSTYLE[l.k];
    if (l.k === "gasmain") return pline(l.pts, hilite ? "#c9a65b" : st.c, hilite ? 2.4 : 1.1, 'stroke-dasharray="7 4" opacity="0.85"');
    if (l.k === "haul") { const b2 = band(l.pts, 4.4), n = l.pts.length; return pline(b2.slice(0, n), hilite ? "#c9a65b" : st.c, hilite ? 1.6 : 0.8) + pline(b2.slice(n), hilite ? "#c9a65b" : st.c, hilite ? 1.6 : 0.8); }
    if (l.k === "walkway") return poly(band(l.pts, 7), "#b9ae94", "none");
    return poly(band(l.pts, st.w), hilite ? "#e6d39a" : st.c, "#8c7f68", 0.6);
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
  function drawSite(state, id, opts) {
    const g = get(state, id), W = site(g).w, D = site(g).d, sur = surroundings(id, g), sel = opts.sel || {};
    const ground = [sur.ground], objs = sur.objs.slice(), shadows = [sur.shadows];
    ground.push(poly([[0, 0], [W, 0], [W, D], [0, D]], "#c7ca97"));
    for (let y0 = LAND + 10; y0 < D; y0 += 20) ground.push(poly([[0, y0], [W, y0], [W, Math.min(D, y0 + 10)], [0, Math.min(D, y0 + 10)]], "#ccd09d", "none", 0, 'opacity="0.85"'));
    for (const [k, kind] of Object.entries(g.grounds)) {
      const [i, j] = unkey(k), x = i * CELL, y = j * CELL, T = GROUND[kind];
      if (kind === "pool") { ground.push(poly([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], "#b6c289"), poly(circ(x + 5, y + 5, 4.2, 0, 24), "#a6bfbc", INK, 0.6)); continue; }
      ground.push(poly([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], T.c, T.c, 0.5));
      if (kind === "carpark") ground.push(line([x + 5, y + 1], [x + 5, y + 9], "#8c7f68", 0.5));
      if (kind === "trees") tree(x + 5, y + 5, 4.6, 10, ["#7f9460", "#869a64", "#76895a"][(i + j) % 3], objs, shadows);
    }
    for (const b of g.berths) {
      const R = BERTH[b.size].r, hl = sel.ref === b;
      ground.push(poly(circ(b.x, b.y, R), "#d3d6a6", hl ? "#c9a65b" : "#8d8a62", hl ? 2.4 : 0.8, hl ? "" : 'stroke-dasharray="6 4"'), poly(circ(b.x, b.y, 14, 0, 32), "#d9cfb3", INK, 0.6));
      mastSvg(b, objs, shadows);
    }
    for (const s of g.sheds) { const A = apronRect(s); ground.push(poly([[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]], "#e3dcb7", "#8d8a62", 0.6, 'stroke-dasharray="5 4"')); }
    for (const l of g.links) { ground.push(linkGround(l, sel.ref === l)); if (l.k === "walkway") walkwaySvg(l, objs, shadows, sel.ref === l); }
    ground.push(poly([[0, 0], [W, 0], [W, D], [0, D]], "none", "#5d4e38", 1.2, 'stroke-dasharray="10 5"'));
    for (const s of g.sheds) shedSvg(s, objs, shadows, sel.ref === s);
    for (const q of g.gas) gasSvg(q, objs, shadows, sel.ref === q);
    for (const b of g.blds) buildingSvg(b, objs, shadows, sel.ref === b);
    objs.sort((a, b) => b[0] - a[0]);
    return `<g>${ground.join("")}</g><g opacity="0.24">${shadows.join("")}</g><g>${objs.map(o => o[1]).join("")}</g>`;
  }

  // ===================================================================================================================
  // The screen.
  let root = null, cityId = null, tool = null, sel = null, msg = "", view = null, stroke = null, drawing = null, ghost = null, panning = null;
  const TOOLS = [
    ["Look", [["select", "Select and move", "Click anything to see it, move it, or take it down. Drag to look around; the wheel zooms."]]],
    ["Flying field", [["berth:1", BERTH[1].name, "", BERTH[1].cost], ["berth:2", BERTH[2].name, "", BERTH[2].cost], ["berth:3", BERTH[3].name, "", BERTH[3].cost],
      ["shed:1", SHED[1].name, "", SHED[1].cost], ["shed:2", SHED[2].name, "", SHED[2].cost], ["shed:3", SHED[3].name, "", SHED[3].cost], ["gas:gasplant", GASK.gasplant.name, GASK.gasplant.about, GASK.gasplant.cost], ["gas:hestore", GASK.hestore.name, GASK.hestore.about, GASK.hestore.cost]]],
    ["Buildings, painted", Object.entries(BLD).map(([k, T]) => ["bld:" + k, T.name, T.about, T.cost, "a cell"])],
    ["Grounds, painted", Object.entries(GROUND).map(([k, T]) => ["gnd:" + k, T.name, T.about, T.cost, "a cell"]).concat([["erase", "Clear ground", "Takes down building cells and grounds, for half their price back."]])],
    ["Connections, drawn", Object.entries(LINK).map(([k, T]) => ["link:" + k, T.name, T.about, T.cost, "a metre"])]
  ];
  BERTH[1].about = "For small ships. A ship swings round her mast with the wind, so the circle stays clear.";
  BERTH[2].about = "For medium ships, or small."; BERTH[3].about = "For any ship.";
  for (const n of [1, 2, 3]) SHED[n].about = `Overhauls ${["", "small", "medium", "all"][n]} ships. Doors face the clear apron; R turns it.`;
  TOOLS[1][1].forEach(t => { if (!t[2]) { const [kind, n] = t[0].split(":"); t[2] = (kind === "berth" ? BERTH : SHED)[n].about; } });

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function open(id) {
    if (!U.state || !get(U.state, id)) return;
    cityId = id; tool = "select"; sel = null; msg = ""; stroke = null; drawing = null; ghost = null;
    if (!root) {
      root = document.createElement("div"); root.className = "grand-office"; document.body.appendChild(root);
      root.addEventListener("click", onClick);
      root.addEventListener("mousedown", onDown); window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
      root.addEventListener("wheel", onWheel, { passive: false }); root.addEventListener("dblclick", onDbl); root.addEventListener("contextmenu", e => { if (e.target.closest(".gt-view")) e.preventDefault(); });
      document.addEventListener("keydown", onKey);
    }
    const g = get(U.state, id), W = site(g).w, D = site(g).d, c = [P(0, 0), P(W, 0), P(W, D), P(0, D)];
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    view = { x: Math.min(...xs) - 60, y: Math.min(...ys) - 80, w: Math.max(...xs) - Math.min(...xs) + 120, h: Math.max(...ys) - Math.min(...ys) + 140 };
    root.hidden = false; document.body.classList.add("office-open"); render();
  }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove("office-open"); S().save(U.state); if (U.ui && U.ui.render) U.ui.render(); }
  const ask = q => confirm(q);
  function render() {
    const st = U.state, g = get(st, cityId), c = U.cityById[cityId], sm = summary(st, cityId), next = SITES[g.site + 1];
    const palette = TOOLS.map(([group, items]) => `<h3>${group}</h3>${items.map(([k, name, about, cost, per]) => `<button class="g-item${tool === k ? " on" : ""}" data-gtool="${k}" title="${esc(about)}"><b>${name}</b>${cost != null ? `<span>${gbp(cost)}${per ? ` <i>${per}</i>` : ""}</span>` : "<span></span>"}<small>${esc(about)}</small></button>`).join("")}`).join("");
    root.innerHTML = `<header class="g-bar"><div><h1>${esc(c.name)} Grand Terminal</h1><span class="g-sub">Bird's-eye view</span></div><span class="g-money">Funds ${gbp(st.money)}${st.loan ? ` · owed to the bank ${gbp(st.loan)}` : ""}</span><button data-g="fit">See the whole site</button><button data-g="close">Close</button></header>
      <div class="g-body"><aside class="g-palette">${palette}</aside>
      <main class="g-field"><svg class="gt-view" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><rect class="gt-paper" x="-5000" y="-5000" width="10000" height="10000" fill="#efe7d3"/><g class="gt-site"></g><g class="gt-ghost"></g></svg><p class="g-msg"></p></main>
      <aside class="g-summary">${selPanel(st, g)}<h3>What this port provides</h3><dl>${sm.rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>
        ${berthTable(st, g)}
        <h3>Money</h3><dl><dt>Spent on this port</dt><dd>${gbp(sm.built)}</dd><dt>Upkeep</dt><dd>${gbp(sm.upkeep)} a year</dd><dt>Concessions earned</dt><dd>${gbp(g.earned || 0)}</dd></dl>
        <h3>Land</h3><p>The site is ${site(g).w} by ${site(g).d} metres.</p>${next ? `<button data-g="land">Buy land to ${next.w} by ${next.d}, ${gbp(next.cost)}</button>` : "<p>It is as large as it can be.</p>"}</aside></div>`;
    root.querySelector(".gt-site").innerHTML = drawSite(st, cityId, { sel });
    setView(); hint(); drawGhost();
  }
  function selPanel(st, g) {
    if (!sel) return `<p class="g-hint">${toolHint()}</p>`;
    let title = "", about = "", acts = "";
    if (sel.type === "berth") { title = BERTH[sel.ref.size].name; about = BERTH[sel.ref.size].about; acts = `<button data-g="move">Move</button><button data-g="remove">Take down, ${gbp(BERTH[sel.ref.size].cost * REFUND)} back</button>`;
      const n = effects(st, cityId).berths[g.berths.indexOf(sel.ref)]; about += `<br><br>${accessText(n)}`; }
    if (sel.type === "shed") { title = SHED[sel.ref.size].name; about = SHED[sel.ref.size].about; acts = `<button data-g="move">Move</button><button data-g="turn">Turn</button><button data-g="remove">Take down, ${gbp(SHED[sel.ref.size].cost * REFUND)} back</button>`; }
    if (sel.type === "gas") { title = GASK[sel.ref.k].name; about = GASK[sel.ref.k].about; acts = `<button data-g="move">Move</button><button data-g="remove">Take down, ${gbp(GASK[sel.ref.k].cost * REFUND)} back</button>`; }
    if (sel.type === "link") { const L = linkLen(sel.ref.pts); title = LINK[sel.ref.k].name; about = `${LINK[sel.ref.k].about}<br><br>${Math.round(L)} metres.`; acts = `<button data-g="remove">Take up, ${gbp(L * LINK[sel.ref.k].cost * REFUND)} back</button>`; }
    if (sel.type === "bld") { const T = BLD[sel.ref.k], n = sel.ref.cells.length; title = T.name; about = `${T.about}<br><br>${n} cell${n > 1 ? "s" : ""}, ${n * 100} square metres.`;
      if (sel.ref.k === "station" && !effects(st, cityId).station) about += " <b>It is not beside the railway, so no trains call.</b>";
      if (sel.ref.k === "tram" && !effects(st, cityId).tram) about += " <b>It is not on the road, so no trams call.</b>";
      acts = `<button data-g="remove">Take down, ${gbp(n * T.cost * REFUND)} back</button>`; }
    return `<div class="g-chosen"><h3>${title}</h3><p>${about}</p>${acts}</div>`;
  }
  function accessText(n) {
    const pax = n.pax < Infinity ? (n.covered ? "Passengers walk out under cover." : "Passengers come out by bus or on foot.") : "<b>No way for passengers to reach it from the terminal.</b>";
    const cargo = n.cargo < Infinity ? "Goods and mail come by road." : "<b>No road for goods and mail.</b>";
    const gas = n.gas ? "Gas is piped to it." : "<b>No gas main: carts top ships up slowly.</b>";
    return `${pax} ${cargo} ${gas} A ship here spends ${n.extra < 0.05 ? "no time" : `${n.extra.toFixed(1)} hours`} beyond her usual turnaround.`;
  }
  function berthTable(st, g) {
    const e = effects(st, cityId); if (!e.berths.length) return "";
    return `<h3>Berths</h3><table class="gt-berths"><tr><th></th><th>Size</th><th>Passengers</th><th>Cargo</th><th>Gas</th><th>Extra time</th></tr>${e.berths.map((b, i) => `<tr><td>${i + 1}</td><td>${["", "Small", "Medium", "Large"][b.size]}</td><td>${b.pax < Infinity ? (b.covered ? "Covered" : "Yes") : "<b>None</b>"}</td><td>${b.cargo < Infinity ? "Yes" : "<b>None</b>"}</td><td>${b.gas ? "Piped" : "<b>Carts</b>"}</td><td>${b.extra.toFixed(1)} h</td></tr>`).join("")}</table>`;
  }
  function toolHint() {
    if (!tool || tool === "select") return "Click anything on the site to see it, move it, or take it down. Drag to look around; the mouse wheel zooms.";
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas")) return "Click on the site to build it. R turns a shed. Esc puts it away.";
    if (tool.startsWith("bld") || tool.startsWith("gnd")) return "Hold the mouse button and paint cells. Painting next to a building of the same kind enlarges it. Esc puts it away.";
    if (tool === "erase") return "Hold the mouse button and paint over what you want cleared.";
    if (tool.startsWith("link")) return "Click to set points along the way; double-click (or press Enter) to finish. End it at a building, a shed's doors, gasholders, or the middle of a mooring circle to join them. Esc cancels.";
    return "";
  }
  function hint(t) { const m = root.querySelector(".g-msg"); if (m) m.innerHTML = esc(t != null ? t : msg) || `<span class="g-hint">${esc(toolHint())}</span>`; }
  function setView() { const svg = root && root.querySelector(".gt-view"); if (svg) svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); }
  function svgPoint(e) {
    const svg = root.querySelector(".gt-view"); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y];
  }
  const planAt = e => unP(...svgPoint(e));
  const snap = (v, s) => Math.round(v / s) * s;
  // Whatever is under a point on the ground, most specific first.
  function hitTest(g, p) {
    const i = Math.floor(p[0] / CELL), j = Math.floor(p[1] / CELL), b = cellOwner(g, i, j); if (b) return { type: "bld", ref: b };
    for (const q of g.gas) if (near(p, gasRect(q), 2)) return { type: "gas", ref: q, x: q.x, y: q.y, k: q.k };
    for (const s of g.sheds) { const R = shedRect(s); if (near(p, R, 2)) return { type: "shed", ref: s, x: s.x, y: s.y, size: s.size, r: s.r }; }
    let best = null;
    for (const l of g.links) for (let s = 1; s < l.pts.length; s++) { const d = dist(nearestOn(l.pts[s - 1], l.pts[s], p), p); if (d < 7 && (!best || d < best.d)) best = { d, l }; }
    if (best) return { type: "link", ref: best.l };
    for (const bb of g.berths) if (dist(p, [bb.x, bb.y]) < BERTH[bb.size].r) return { type: "berth", ref: bb, x: bb.x, y: bb.y, size: bb.size };
    return null;
  }
  function placingThing(p) {
    const [kind, v] = tool.split(":");
    if (kind === "berth") return { type: "berth", x: snap(p[0], 10), y: snap(p[1], 10), size: +v };
    if (kind === "shed") return { type: "shed", x: snap(p[0], 10), y: snap(p[1], 10), size: +v, r: ghost && ghost.r || 0 };
    if (kind === "gas") return { type: "gas", x: snap(p[0], 10), y: snap(p[1], 10), k: v, id: 0 };
    if (kind === "move") return { ...sel, x: snap(p[0], 10), y: snap(p[1], 10), r: ghost && ghost.r != null ? ghost.r : sel.r };
    return null;
  }
  function problemOf(g, t) {
    if (t.type === "berth") return berthProblem(g, t, t.ref);
    if (t.type === "shed") return shedProblem(g, t, t.ref);
    if (t.type === "gas") return gasProblem(g, t, t.ref);
    return "";
  }
  function drawGhost() {
    const layer = root && root.querySelector(".gt-ghost"); if (!layer) return;
    const g = get(U.state, cityId); let out = "";
    if (ghost && ghost.thing) {
      const t = ghost.thing, bad = problemOf(g, t), col = bad ? "#a3372c" : "#2e6b47";
      if (t.type === "berth") out = poly(circ(t.x, t.y, BERTH[t.size].r), col, col, 2, 'fill-opacity="0.18"') + poly(circ(t.x, t.y, 14, 0, 32), col, col, 1, 'fill-opacity="0.4"');
      if (t.type === "shed") { const R = shedRect(t), A = apronRect(t); out = poly([[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]], col, col, 2, 'fill-opacity="0.3"') + poly([[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]], col, col, 1, 'fill-opacity="0.12" stroke-dasharray="5 4"'); }
      if (t.type === "gas") { const R = gasRect(t); out = poly([[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]], col, col, 2, 'fill-opacity="0.3"'); }
      hint(bad || `${{ berth: () => BERTH[t.size].name, shed: () => SHED[t.size].name, gas: () => GASK[t.k].name }[t.type]()}: click to ${tool === "move" ? "set it down here" : "build it here"}.`);
    }
    if (stroke) {
      for (const k of stroke.cells) { const [i, j] = unkey(k), x = i * CELL, y = j * CELL, bad = tool !== "erase" && cellProblem(g, i, j); out += poly([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], bad ? "#a3372c" : tool === "erase" ? "#7a4a2a" : "#2e6b47", "none", 0, 'fill-opacity="0.45"'); }
      if (tool !== "erase") { const n = [...stroke.cells].filter(k => !cellProblem(g, ...unkey(k))).length, T = tool.startsWith("bld") ? BLD[tool.slice(4)] : GROUND[tool.slice(4)]; hint(`${n} cell${n === 1 ? "" : "s"}, ${gbp(n * T.cost)}`); }
    }
    if (ghost && ghost.cell && !stroke) { const [i, j] = ghost.cell, x = i * CELL, y = j * CELL; out += poly([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], "#2e6b47", "#2e6b47", 1, 'fill-opacity="0.25"'); }
    if (drawing) {
      const all2 = drawing.pts.concat(ghost && ghost.pt ? [ghost.pt] : []), bad = all2.length > 1 && linkProblem(g, all2), L = linkLen(all2);
      out += pline(all2, bad ? "#a3372c" : "#2e6b47", 2.4, 'stroke-dasharray="6 4"') + all2.map(p => { const q = P(...p); return `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="3" fill="#f4efe1" stroke="${INK}" stroke-width="1"/>`; }).join("");
      hint(bad && all2.length > 1 ? bad : `${LINK[drawing.k].name}: ${Math.round(L)} metres, ${gbp(L * LINK[drawing.k].cost)}. Double-click to finish.`);
    }
    layer.innerHTML = out;
  }
  // Snapping for connections: to the places they join, else to the ten-metre grid.
  function snapLink(g, p) {
    const targets = [];
    for (const b of g.berths) targets.push([b.x, b.y]);
    for (const s of g.sheds) targets.push(doorPoint(s));
    for (const q of g.gas) targets.push([q.x, q.y]);
    for (const l of g.links) for (const q of l.pts) targets.push(q);
    let best = null; for (const t of targets) { const d = dist(t, p); if (d < 14 && (!best || d < best.d)) best = { d, t }; }
    return best ? best.t.slice() : [snap(p[0], 10), snap(p[1], 10)];
  }
  function cellsBetween(a, b) {
    const out = [], n = Math.max(1, Math.ceil(dist(a, b) / 4));
    for (let k = 0; k <= n; k++) out.push(key(Math.floor((a[0] + (b[0] - a[0]) * k / n) / CELL), Math.floor((a[1] + (b[1] - a[1]) * k / n) / CELL)));
    return out;
  }
  function onDown(e) {
    if (!e.target.closest(".gt-view")) return;
    const g = get(U.state, cityId), p = planAt(e);
    if (e.button === 2 || e.button === 1 || (tool === "select" && e.button === 0 && !hitTest(g, p))) { panning = { at: [e.clientX, e.clientY], v: { ...view }, moved: false }; e.preventDefault(); return; }
    if ((tool.startsWith("bld") || tool.startsWith("gnd") || tool === "erase") && e.button === 0) { stroke = { cells: new Set([key(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL))]), last: p }; drawGhost(); e.preventDefault(); }
  }
  function onMove(e) {
    if (!root || root.hidden) return;
    if (panning) {
      const svg = root.querySelector(".gt-view"), sc = view.w / svg.clientWidth, sc2 = view.h / svg.clientHeight, s2 = Math.max(sc, sc2);
      const dx = e.clientX - panning.at[0], dy = e.clientY - panning.at[1]; if (Math.abs(dx) + Math.abs(dy) > 3) panning.moved = true;
      view.x = panning.v.x - dx * s2; view.y = panning.v.y - dy * s2; setView(); return;
    }
    if (!e.target.closest || !e.target.closest(".gt-view")) return;
    const g = get(U.state, cityId), p = planAt(e);
    if (stroke) { for (const k of cellsBetween(stroke.last, p)) stroke.cells.add(k); stroke.last = p; drawGhost(); return; }
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas") || tool === "move") { ghost = { ...(ghost || {}), thing: null }; ghost.thing = placingThing(p); drawGhost(); return; }
    if (tool.startsWith("link")) { ghost = { pt: snapLink(g, p) }; drawGhost(); return; }
    if (tool.startsWith("bld") || tool.startsWith("gnd") || tool === "erase") { ghost = { cell: [Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)] }; drawGhost(); }
  }
  function onUp(e) {
    if (panning) { const was = panning; panning = null; if (was.moved) { root.dataset.dragged = "1"; setTimeout(() => delete root.dataset.dragged, 0); } return; }
    if (!stroke) return;
    const st = U.state, list = [...stroke.cells].map(unkey); stroke = null;
    if (tool === "erase") { const back = erase(st, cityId, list); msg = back ? `Cleared: ${gbp(back * REFUND)} back.` : ""; }
    else { const r = paint(st, cityId, tool.slice(4), list, ask); msg = r === "cancelled" ? "" : r; }
    render();
  }
  function onWheel(e) {
    if (!e.target.closest(".gt-view")) return; e.preventDefault();
    const q = svgPoint(e), f = Math.exp(e.deltaY * 0.0015), nw = Math.min(4000, Math.max(120, view.w * f)), k = nw / view.w;
    view.x = q[0] - (q[0] - view.x) * k; view.y = q[1] - (q[1] - view.y) * k; view.w = nw; view.h *= k; setView();
  }
  function finishLink() {
    if (!drawing) return;
    const pts2 = drawing.pts.filter((p, i, a) => !i || dist(p, a[i - 1]) > 0.5), k = drawing.k; drawing = null; ghost = null;
    if (pts2.length < 2) { render(); return; }
    const r = addLink(U.state, cityId, k, pts2, ask); msg = r === "cancelled" ? "" : r; render();
  }
  function onDbl(e) { if (drawing && e.target.closest(".gt-view")) { e.preventDefault(); finishLink(); } }
  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === "Escape") { if (drawing) { drawing = null; render(); return; } if (tool !== "select") { tool = "select"; ghost = null; render(); return; } if (sel) { sel = null; render(); return; } close(); }
    if (e.key === "Enter" && drawing) finishLink();
    if ((e.key === "r" || e.key === "R") && ghost && ghost.thing && ghost.thing.type === "shed") { ghost.r = ((ghost.thing.r || 0) + 1) % 4; ghost.thing.r = ghost.r; drawGhost(); }
  }
  function onClick(e) {
    const st = U.state, g = get(st, cityId), b = e.target.closest("button");
    if (b) {
      if (b.dataset.gtool) { tool = b.dataset.gtool; sel = null; ghost = null; drawing = null; msg = ""; render(); return; }
      const a = b.dataset.g;
      if (a === "close") { close(); return; }
      if (a === "fit") { open(cityId); return; }
      if (a === "land") { const r = buyLand(st, cityId, ask); msg = r === "cancelled" ? "" : r; around.clear(); open(cityId); hint(); return; }
      if (a === "remove") { msg = removeThing(st, cityId, sel); if (!msg) sel = null; render(); return; }
      if (a === "turn") { const r = moveThing(st, cityId, sel, sel.ref.x, sel.ref.y, (sel.ref.r + 1) % 4); msg = r; if (!r) sel.r = sel.ref.r; render(); return; }
      if (a === "move") { tool = "move"; ghost = { r: sel.r }; msg = ""; render(); return; }
      return;
    }
    if (!e.target.closest(".gt-view") || (root.dataset.dragged)) return;
    const p = planAt(e);
    if (tool === "select") { sel = hitTest(g, p); msg = ""; render(); return; }
    if (tool === "move") { const t = placingThing(p), r = moveThing(st, cityId, sel, t.x, t.y, t.r); msg = r; if (!r) { tool = "select"; sel = hitTest(g, [t.x, t.y]) || null; ghost = null; } render(); return; }
    if (tool.startsWith("berth") || tool.startsWith("shed") || tool.startsWith("gas")) {
      const t = placingThing(p), r = t.type === "berth" ? placeBerth(st, cityId, t, ask) : t.type === "shed" ? placeShed(st, cityId, t, ask) : placeGas(st, cityId, t, ask);
      msg = r === "cancelled" ? "" : r; render(); return;
    }
    if (tool.startsWith("link")) {
      const q = snapLink(g, p);
      const now = Date.now();
      if (drawing && drawing.last && now - drawing.last < 450 && dist(drawing.pts[drawing.pts.length - 1], q) < 1) { finishLink(); return; }   // a double click ends it
      if (drawing) drawing.last = now;
      if (!drawing) drawing = { k: tool.slice(5), pts: [q], last: now };
      else if (!drawing.pts.length || dist(drawing.pts[drawing.pts.length - 1], q) > 0.5) drawing.pts.push(q);
      drawGhost(); return;
    }
  }

  U.grand = { FOUND, SITES, BERTH, SHED, BLD, GROUND, LINK, MANAGED, get, effects, summary, canFound, found, sync, boarded, monthly, dock, open, close,
    placeBerth, placeShed, placeGas, paint, erase, addLink, removeThing, buyLand, layout, network, drawSite, P, unP };
})(window.UpShip);
