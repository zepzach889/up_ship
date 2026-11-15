// The front elevation of a terminal building, composed the way an architect would draw it: a centre block, wings and
// end pavilions laid out on a rhythm of bays, each style with its own vocabulary of windows, cornices, roofs and towers,
// set on its ground under a sky, with trees, lamps and people for scale.
window.UpShip = window.UpShip || {};
(function (U) {
  const INK = "#3a2f22";
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const shade = (c, f) => "#" + hex(c).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const B = hex(b); return "#" + hex(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const f1 = n => (Math.round(n * 10) / 10).toString();
  const unkey = k => k.split(",").map(Number);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let uid = 0;

  // What each style brings beyond its choices: the width of its bays, its plinth, whether it has end pavilions, and its
  // particular details.
  const FLAV = {
    beaux: { bay: 4.4, plinth: 1.3, pav: true, rustic: true, attic: true, columns: 2, dormer: "oeil", pavRoof: "mansard" },
    secondempire: { bay: 4.2, plinth: 1.1, pav: true, rustic: true, attic: true, columns: 1, dormer: "pediment", pavRoof: "mansard", cap: "mansard" },
    edwardian: { bay: 4.0, plinth: 1.0, pav: true, quoins: true, dressing: "#e8dfca", cap: "cupola", chimneys: true, pavGable: true },
    novecento: { bay: 4.0, plinth: 1.2, piers: true, cap: "flat" },
    deco: { bay: 4.0, plinth: 0.9, centreUp: 1 },
    modern: { bay: 4.0, plinth: 0.6 },
    germanbrick: { bay: 3.4, plinth: 0.9, pav: true, pointedPiers: true },
    mission: { bay: 4.2, plinth: 0.5, curvParapet: true, cap: "mission" },
    imperialcrown: { bay: 3.6, plinth: 1.1, roofCol: "#4d5457", centreUp: 1, vertical: true, crown: true },
    northern: { bay: 3.8, plinth: 0.8, pav: true, stepGable: true, chimneys: true },
    mediterranean: { bay: 4.2, plinth: 0.5, cap: "pyramid" },
    islamic: { bay: 4.0, plinth: 0.8, pav: true, merlons: "stepped", ablaq: true, horseshoe: true },
    indo: { bay: 4.2, plinth: 1.0, pav: true, merlons: "round", chhajja: true, chhatri: true, band: "#efe4cf", jharokha: true },
    chinese: { bay: 4.6, plinth: 1.9, platform: true, roofCol: "#3e7a60", brackets: true, plaque: true, chinese: true },
    spanish: { bay: 4.2, plinth: 0.6, curvParapet: true, cap: "dome" },
    russian: { bay: 3.8, plinth: 1.0, pav: true, kokoshnik: true, nalichnik: true, tent: true },
    tropical: { bay: 4.4, plinth: 0.9 },
    utility: { bay: 6, plinth: 0.4 }
  };

  function elevation(b, nation, companyName, companyColour, cityName) {
    const A = U.grandArt, d = A.design(b, nation), K = A.KIND[b.k] || A.KIND.hall, F = FLAV[d.style] || {};
    const wall = A.WALLS[d.walls].c, cc = companyColour && /^#[0-9a-f]{6}$/i.test(companyColour) ? companyColour : "#9b2a24", id = "fz" + (++uid);
    const roofC = d.roof === "flat" ? null : (d.roof === "curved" && F.roofCol) || A.ROOFS[d.roof].c;
    const cls = d.ornament === "classical", stone = F.dressing || shade(wall, 1.1);
    const cs = b.cells.map(unkey), i0 = Math.min(...cs.map(c => c[0])), i1 = Math.max(...cs.map(c => c[0])) + 1;
    const frontJ = {}, backJ = {}; for (const [i, j] of cs) { frontJ[i] = Math.min(frontJ[i] ?? 1e9, j); backJ[i] = Math.max(backJ[i] ?? -1e9, j); }
    const minJ = Math.min(...Object.values(frontJ));
    const n = d.storeys, h = K.h, P = F.plinth ?? 0.8, frz = F.brackets ? 1.7 : d.sign && !F.plaque ? 2.3 : 1.0, cor = cls ? 1.0 : 0.6;
    // Masses: runs of columns sharing a front line. The longest at the front is composed; the rest stand back.
    const masses = []; for (let i = i0; i < i1; i++) { if (frontJ[i] == null) continue; const m = masses[masses.length - 1]; if (m && m.i1 === i && m.j === frontJ[i]) { m.i1 = i + 1; m.depth = Math.max(m.depth, (backJ[i] - frontJ[i] + 1) * 10); } else masses.push({ i0: i, i1: i + 1, j: frontJ[i], depth: (backJ[i] - frontJ[i] + 1) * 10 }); }
    const main = masses.filter(m => m.j === minJ).reduce((a, m) => (m.i1 - m.i0 > a.i1 - a.i0 ? m : a));
    const rx0 = main.i0 * 10, rx1 = main.i1 * 10, RL = rx1 - rx0, depth = Math.min(40, main.depth), BAY = F.bay || 4.2;
    const tw = d.tower !== "none" && K.tower ? A.towerCells(b) : [];
    const tx0 = tw.length ? Math.min(...tw.map(c => c[0])) * 10 : 0, tx1 = tw.length ? (Math.max(...tw.map(c => c[0])) + 1) * 10 : 0;
    const tc = tw.length ? (tx0 + tx1) / 2 : (rx0 + rx1) / 2, twid = tx1 - tx0;
    // The composition along the main run: end pavilions, wings, and a centre block for the tower and entrance.
    const secs = [];
    let cw = K.tower ? Math.max(tw.length ? twid + BAY : 3 * BAY, 3 * BAY) : 0; if (RL - cw < 4 * BAY) cw = K.tower ? RL : 0;
    let cx0 = clamp(tc - cw / 2, rx0, rx1 - cw), cx1 = cx0 + cw;
    const pw = F.pav && cw && cx0 - rx0 >= 5 * BAY && rx1 - cx1 >= 5 * BAY ? 2 * BAY : 0;
    const up = F.centreUp ?? (F.attic ? 0.55 : 0.5);
    if (pw) secs.push({ x0: rx0, x1: rx0 + pw, role: "pav", proj: 1.2 });
    if (cx0 - rx0 - pw > 0.5) secs.push({ x0: rx0 + pw, x1: cx0, role: "wing", proj: 0 });
    if (cw) secs.push({ x0: cx0, x1: cx1, role: "centre", proj: 2.2 });
    if (rx1 - pw - cx1 > 0.5) secs.push({ x0: cx1, x1: rx1 - pw, role: "wing", proj: 0 });
    if (pw) secs.push({ x0: rx1 - pw, x1: rx1, role: "pav", proj: 1.2 });
    if (!secs.length) secs.push({ x0: rx0, x1: rx1, role: "wing", proj: 0 });
    for (const s of secs) {
      const nb = Math.max(1, Math.round((s.x1 - s.x0) / BAY)), bw = (s.x1 - s.x0) / nb; s.bays = Array.from({ length: nb }, (_, k) => [s.x0 + k * bw, s.x0 + (k + 1) * bw]);
      s.storeys = n + (s.role === "centre" && up >= 1 ? Math.round(up) : 0); s.attic = (s.role === "centre" && up < 1) || (s.role === "pav" && F.attic) ? h * 0.55 : 0;
      s.wt = P + s.storeys * h + s.attic; s.top = s.wt + frz + cor;
    }
    const back = masses.filter(m => m !== main).map(m => { const s = { x0: m.i0 * 10, x1: m.i1 * 10, role: "back", proj: -(m.j - minJ) * 10, depth: Math.min(40, m.depth) }; const nb = Math.max(1, Math.round((s.x1 - s.x0) / BAY)), bw = (s.x1 - s.x0) / nb; s.bays = Array.from({ length: nb }, (_, k) => [s.x0 + k * bw, s.x0 + (k + 1) * bw]); s.storeys = n; s.attic = 0; s.wt = P + n * h; s.top = s.wt + frz + cor; return s; });
    const wingTop = P + n * h + frz + cor, cen = secs.find(s => s.role === "centre");
    // The entrance: its width, and how high it reaches, so windows give way to it.
    const hasEnt = !!K.tower, ent = d.entrance, ew = !hasEnt ? 0 : ent === "portico" ? Math.min(cw - 1.5, cw > 18 ? 16 : 12) : ent === "canopy" ? Math.min(cw * 0.85, 16) : ent === "arch" ? 7 : 4;
    const entH = ent === "portico" ? P + Math.min(2, n) * h : ent === "arch" ? P + Math.min(1.6, n) * h : P + h * 0.85;
    // How tall the whole drawing must be.
    const roofRise = !roofC ? 1.2 : d.roof === "low" ? depth * 0.16 + 1 : d.roof === "hipped" ? depth * 0.3 + 1 : d.roof === "steep" ? depth * 0.55 + 1 : d.roof === "mansard" ? 6 : depth * 0.3 + 2;
    const towerRise = !tw.length ? 0 : { dome: twid * 0.95 + 10, clock: 24, stepped: 18, spire: 30, onion: 22, minaret: 24, belfry: 16, pagoda: 16 }[d.tower] || 10;
    const Ztop = Math.max(wingTop + roofRise, (cen ? cen.top : 0) + towerRise + 6, wingTop + 12) + 6;
    const xmin = Math.min(rx0, i0 * 10) - 30, xmax = Math.max(rx1, i1 * 10) + 30;
    const E = Math.min(1600 / (xmax - xmin), 680 / (Ztop + 4)), GY = Ztop * E, Wpx = (xmax - xmin) * E, Hpx = GY + 6 * E + 40;
    const X = x => (x - xmin) * E, Y = z => GY - z * E, pt = (x, z) => f1(X(x)) + "," + f1(Y(z));
    const out = [];
    const R = (x0, z0, x1, z1, fill, sw, extra) => out.push(`<rect x="${f1(X(Math.min(x0, x1)))}" y="${f1(Y(Math.max(z0, z1)))}" width="${f1(Math.abs(x1 - x0) * E)}" height="${f1(Math.abs(z1 - z0) * E)}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ""}${extra ? " " + extra : ""}/>`);
    const L = (x0, z0, x1, z1, c, sw, extra) => out.push(`<line x1="${f1(X(x0))}" y1="${f1(Y(z0))}" x2="${f1(X(x1))}" y2="${f1(Y(z1))}" stroke="${c || INK}" stroke-width="${sw || 0.8}"${extra ? " " + extra : ""}/>`);
    const PG = (pts, fill, sw, extra) => out.push(`<polygon points="${pts.map(([x, z]) => pt(x, z)).join(" ")}" fill="${fill}" stroke="${sw ? INK : "none"}" stroke-width="${sw || 0}" stroke-linejoin="round"${extra ? " " + extra : ""}/>`);
    const PATH = (dd, fill, sw, extra) => out.push(`<path d="${dd}" fill="${fill}" stroke="${sw ? INK : "none"}" stroke-width="${sw || 0}" stroke-linejoin="round"${extra ? " " + extra : ""}/>`);
    const arc = (r, x, z, sweep = 1, large = 0) => `A${f1(r * E)},${f1(r * E)} 0 ${large} ${sweep} ${pt(x, z)}`;
    const SH = "rgba(45,32,20,0.22)", SH2 = "rgba(45,32,20,0.4)";
    const lw = s => f1(Math.max(0.5, s * E / 6));            // a line weight that grows with the drawing's scale

    // Sky, distant ground and the road ---------------------------------------------------------------------------------
    out.push(`<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd8d6"/><stop offset="0.7" stop-color="#e6e4d4"/><stop offset="1" stop-color="#efe8d4"/></linearGradient>
      <linearGradient id="${id}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3a42"/><stop offset="0.55" stop-color="#4c5b65"/><stop offset="1" stop-color="#6f7f88"/></linearGradient>
      <linearGradient id="${id}cu" x1="0" x2="1"><stop offset="0" stop-color="#a9c8b8"/><stop offset="0.35" stop-color="#86ab9a"/><stop offset="1" stop-color="#557a6a"/></linearGradient>
      <filter id="${id}bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f1(E * 2.5)}"/></filter></defs>`);
    out.push(`<rect x="0" y="0" width="${f1(Wpx)}" height="${f1(GY)}" fill="url(#${id}sky)"/>`);
    for (const [cx, cz, rx, rz] of [[0.18, 0.78, 22, 3], [0.62, 0.86, 30, 3.5], [0.86, 0.7, 18, 2.5], [0.4, 0.62, 14, 2]]) out.push(`<ellipse cx="${f1(Wpx * cx)}" cy="${f1(GY * (1 - cz))}" rx="${f1(rx * E)}" ry="${f1(rz * E)}" fill="#f6f2e6" opacity="0.6" filter="url(#${id}bl)"/>`);
    // A distant line of trees on the horizon.
    { let dd = `M0,${f1(Y(0))}`; for (let x = xmin; x <= xmax; x += 3) dd += ` L${f1(X(x))},${f1(Y(3.2 + 1.6 * Math.sin(x * 0.37) + 1.1 * Math.sin(x * 0.11 + 2)))}`; dd += ` L${f1(Wpx)},${f1(Y(0))} Z`; PATH(dd, "#b9c2a8", 0, `opacity="0.7"`); }

    // Pieces ----------------------------------------------------------------------------------------------------------
    // A window, with its reveal, glazing bars, sill and surround.
    function win(kind, cx, z0, w, hh, o = {}) {
      const x0 = cx - w / 2, x1 = cx + w / 2, sur = o.sur, lat = o.lattice;
      let dd;
      if (kind === "arch" || kind === "horseshoe") { const r = w / 2, zs = z0 + hh - r; dd = `M${pt(x0, z0)} L${pt(x0, zs)} ${kind === "horseshoe" ? `A${f1(r * 1.12 * E)},${f1(r * 1.12 * E)} 0 1 1 ${pt(x1, zs)}` : arc(r, x1, zs)} L${pt(x1, z0)} Z`; }
      else if (kind === "pointed") { const zs = z0 + hh - w * 0.75; dd = `M${pt(x0, z0)} L${pt(x0, zs)} Q${pt(x0, zs + w * 0.55)} ${pt(cx, z0 + hh)} Q${pt(x1, zs + w * 0.55)} ${pt(x1, zs)} L${pt(x1, z0)} Z`; }
      else dd = `M${pt(x0, z0)} L${pt(x0, z0 + hh)} L${pt(x1, z0 + hh)} L${pt(x1, z0)} Z`;
      if (sur) { const m = w * 0.16; // a stone surround
        if (kind === "rect") R(x0 - m, z0 - 0.05, x1 + m, z0 + hh + m, sur, 0.35 * E / 6);
        else PATH(`M${pt(x0 - m, z0)} L${pt(x0 - m, z0 + hh - w / 2)} ${arc(w / 2 + m, x1 + m, z0 + hh - w / 2)} L${pt(x1 + m, z0)} Z`, sur, 0.35 * E / 6);
      }
      PATH(dd, `url(#${id}gl)`, 0.6 * E / 6);
      // glazing bars
      const bar = lat ? lat : "#ddd6c4", bw2 = lw(0.5);
      if (lat) { for (let x = x0 + 0.35; x < x1 - 0.1; x += 0.35) L(x, z0, x, z0 + hh - (kind === "rect" ? 0 : w * 0.45), bar, bw2); for (let z = z0 + 0.35; z < z0 + hh - (kind === "rect" ? 0.1 : w * 0.5); z += 0.35) L(x0, z, x1, z, bar, bw2); }
      else { L(cx, z0, cx, z0 + hh - (kind === "rect" ? 0 : 0.15), bar, bw2); const tz = kind === "rect" ? z0 + hh : z0 + hh - w * 0.55; for (let k = 1; k < 3; k++) L(x0, z0 + (tz - z0) * k / 3, x1, z0 + (tz - z0) * k / 3, bar, bw2); if (kind !== "rect") L(x0, tz, x1, tz, bar, bw2); }
      // the reveal's shadow, top and left
      PATH(`M${pt(x0, z0)} L${pt(x0, z0 + hh - (kind === "rect" ? 0 : w / 2))} L${pt(x0 + 0.18, z0 + hh - (kind === "rect" ? 0.18 : w / 2))} L${pt(x0 + 0.18, z0)} Z`, SH2);
      if (kind === "rect") R(x0, z0 + hh - 0.2, x1, z0 + hh, SH2);
      // sill
      R(x0 - 0.18, z0 - 0.22, x1 + 0.18, z0, o.sill || shade(o.wallC, 1.12), 0.3 * E / 6);
      // hoods and keystones
      if (o.hood === "tri") PG([[x0 - w * 0.25, z0 + hh + 0.25], [cx, z0 + hh + 0.25 + w * 0.32], [x1 + w * 0.25, z0 + hh + 0.25]], shade(o.wallC, 1.12), 0.35 * E / 6);
      if (o.hood === "seg") PATH(`M${pt(x0 - w * 0.25, z0 + hh + 0.25)} Q${pt(cx, z0 + hh + 0.25 + w * 0.42)} ${pt(x1 + w * 0.25, z0 + hh + 0.25)} Z`, shade(o.wallC, 1.12), 0.35 * E / 6);
      if (o.hood === "flat") R(x0 - w * 0.2, z0 + hh + 0.15, x1 + w * 0.2, z0 + hh + 0.45, shade(o.wallC, 1.12), 0.3 * E / 6);
      if (o.hood === "ogee") PATH(`M${pt(x0 - 0.3, z0 + hh + 0.1)} Q${pt(x0 - 0.1, z0 + hh + 0.8)} ${pt(cx, z0 + hh + 0.6)} Q${pt(cx, z0 + hh + 1.0)} ${pt(cx, z0 + hh + 1.4)} Q${pt(cx, z0 + hh + 1.0)} ${pt(cx, z0 + hh + 0.6)} Q${pt(x1 + 0.1, z0 + hh + 0.8)} ${pt(x1 + 0.3, z0 + hh + 0.1)} Z`, shade(o.wallC, 1.15), 0.35 * E / 6);
      if (o.key && kind !== "rect") PG([[cx - 0.22, z0 + hh + 0.12], [cx + 0.22, z0 + hh + 0.12], [cx + 0.15, z0 + hh - 0.45], [cx - 0.15, z0 + hh - 0.45]], shade(o.wallC, 1.15), 0.3 * E / 6);
      if (o.ablaq && kind !== "rect") for (let k = 0; k < 7; k++) { const a0 = Math.PI * k / 7, a1 = Math.PI * (k + 1) / 7, r0 = w / 2, r1 = w / 2 + 0.4, zs = z0 + hh - w / 2; if (k % 2) PG([[cx - Math.cos(a0) * r0, zs + Math.sin(a0) * r0], [cx - Math.cos(a1) * r0, zs + Math.sin(a1) * r0], [cx - Math.cos(a1) * r1, zs + Math.sin(a1) * r1], [cx - Math.cos(a0) * r1, zs + Math.sin(a0) * r1]], "#f1e9d8", 0); }
    }
    // A column with base and capital.
    function column(x, z0, z1, w, col, cap) {
      R(x - w / 2, z0, x + w / 2, z1, col, 0.4 * E / 6);
      R(x - w / 2 + w * 0.62, z0, x + w / 2, z1, "rgba(45,32,20,0.16)");
      R(x - w * 0.7, z0, x + w * 0.7, z0 + w * 0.45, col, 0.4 * E / 6);
      if (cap === "ionic") { R(x - w * 0.75, z1 - w * 0.35, x + w * 0.75, z1, col, 0.4 * E / 6); for (const s of [-1, 1]) out.push(`<circle cx="${f1(X(x + s * w * 0.6))}" cy="${f1(Y(z1 - w * 0.25))}" r="${f1(w * 0.2 * E)}" fill="${col}" stroke="${INK}" stroke-width="${f1(0.3 * E / 6)}"/>`); }
      else R(x - w * 0.7, z1 - w * 0.4, x + w * 0.7, z1, col, 0.4 * E / 6);
    }
    // A cornice: a projecting band with its shadow beneath, and dentils on classical buildings.
    function cornice(x0, x1, z, depthM, col, dent) {
      R(x0, z - 0.45, x1, z - 0.05, SH);
      if (dent) for (let x = x0 + 0.2; x < x1 - 0.2; x += 0.45) R(x, z - 0.3, x + 0.22, z, shade(col, 0.97), 0.25 * E / 6);
      R(x0 - depthM, z, x1 + depthM, z + 0.3, shade(col, 0.95), 0.4 * E / 6); R(x0 - depthM * 1.4, z + 0.3, x1 + depthM * 1.4, z + 0.62, shade(col, 1.08), 0.45 * E / 6);
    }
    // A Chinese or Japanese roof: hipped below, with a ridge between curled ends, and eaves that turn up at the corners.
    function eastRoof(x0, x1, z, dp, col, o = {}) {
      const ov = o.ov ?? 2.4, rise = o.rise ?? Math.max(4, dp * 0.3), rz = z + rise, ri = Math.min(dp * 0.38, (x1 - x0) * 0.3), lift = o.lift ?? 1.0;
      const dd = `M${pt(x0 - ov, z + lift)} Q${pt(x0 - ov * 0.2, z + 0.05)} ${pt(x0 + 2, z + 0.1)} L${pt(x1 - 2, z + 0.1)} Q${pt(x1 + ov * 0.2, z + 0.05)} ${pt(x1 + ov, z + lift)} Q${pt(x1 - ri * 0.25, z + rise * 0.3)} ${pt(x1 - ri, rz)} L${pt(x0 + ri, rz)} Q${pt(x0 + ri * 0.25, z + rise * 0.3)} ${pt(x0 - ov, z + lift)} Z`;
      const cid = id + "c" + (++uid);
      out.push(`<clipPath id="${cid}"><path d="${dd}"/></clipPath>`);
      PATH(dd, col, 0.9 * E / 6);
      out.push(`<g clip-path="url(#${cid})">`);
      for (let x = x0 - ov; x < x1 + ov; x += 0.55) L(x, z - 1, x, rz + 1, shade(col, 0.8), lw(0.6));
      PATH(`M${pt(x0 - ov, z + lift)} Q${pt(x0 - ov * 0.2, z + 0.05)} ${pt(x0 + 2, z + 0.1)} L${pt(x1 - 2, z + 0.1)} Q${pt(x1 + ov * 0.2, z + 0.05)} ${pt(x1 + ov, z + lift)} L${pt(x1 + ov, z + lift + 0.9)} Q${pt(x1 + ov * 0.2, z + 0.95)} ${pt(x1 - 2, z + 1.0)} L${pt(x0 + 2, z + 1.0)} Q${pt(x0 - ov * 0.2, z + 0.95)} ${pt(x0 - ov, z + lift + 0.9)} Z`, "rgba(255,255,255,0.12)");
      out.push(`</g>`);
      // the fascia and the round tile ends along the eave
      PATH(`M${pt(x0 - ov, z + lift)} Q${pt(x0 - ov * 0.2, z + 0.05)} ${pt(x0 + 2, z + 0.1)} L${pt(x1 - 2, z + 0.1)} Q${pt(x1 + ov * 0.2, z + 0.05)} ${pt(x1 + ov, z + lift)}`, "none", 0, `stroke="${shade(col, 0.55)}" stroke-width="${f1(0.35 * E)}" stroke-linecap="round"`);
      // the ridge and its curled ends
      R(x0 + ri - 0.4, rz - 0.1, x1 - ri + 0.4, rz + 0.75, shade(col, 0.72), 0.6 * E / 6);
      for (const [ex, s] of [[x0 + ri - 0.2, 1], [x1 - ri + 0.2, -1]]) PATH(`M${pt(ex, rz + 0.6)} Q${pt(ex - s * 0.2, rz + 2.4)} ${pt(ex + s * 1.0, rz + 2.2)} Q${pt(ex + s * 0.5, rz + 1.6)} ${pt(ex + s * 0.9, rz + 0.75)} Z`, shade(col, 0.6), 0.5 * E / 6);
      if (o.finial) { L((x0 + x1) / 2, rz + 0.75, (x0 + x1) / 2, rz + 2.6, INK, lw(1.2)); out.push(`<circle cx="${f1(X((x0 + x1) / 2))}" cy="${f1(Y(rz + 1.6))}" r="${f1(0.45 * E)}" fill="#c9a45a" stroke="${INK}" stroke-width="${f1(0.4 * E / 6)}"/>`); }
      // the shadow the deep eaves throw on the wall
      R(x0, z - 1.6, x1, z + 0.1, SH);
      return rz;
    }
    // A hipped roof seen from the front: a slope rising to a ridge, its hipped ends lit and shaded.
    function hipRoof(x0, x1, z, dp, col, pitch, ov) {
      const r = Math.min(dp / 2, (x1 - x0) / 2), rz = z + r * pitch;
      PG([[x0 - ov, z - 0.1], [x0 + r, rz], [x1 - r, rz], [x1 + ov, z - 0.1]], col, 0.9 * E / 6);
      PG([[x0 - ov, z - 0.1], [x0 + r, rz], [x0 + r * 0.55, z - 0.1]], shade(col, 1.12));
      PG([[x1 + ov, z - 0.1], [x1 - r, rz], [x1 - r * 0.55, z - 0.1]], shade(col, 0.8));
      const cid = id + "c" + (++uid);
      out.push(`<clipPath id="${cid}"><polygon points="${[[x0 - ov, z - 0.1], [x0 + r, rz], [x1 - r, rz], [x1 + ov, z - 0.1]].map(([x, zz]) => pt(x, zz)).join(" ")}"/></clipPath><g clip-path="url(#${cid})">`);
      for (let zz = z + 0.4; zz < rz; zz += d.roof === "low" ? 0.45 : 0.32) L(x0 - ov, zz, x1 + ov, zz, shade(col, 0.86), lw(0.5));
      if (d.roof === "low") for (let x = x0 - ov; x < x1 + ov; x += 0.5) L(x, z - 0.1, x, rz, shade(col, 0.9), lw(0.35));
      out.push(`</g>`);
      L(x0 - ov, z - 0.1, x1 + ov, z - 0.1, INK, lw(1.1)); R(x0, z - 0.7, x1, z - 0.1, SH);
      return rz;
    }
    // A mansard: a steep lower slope with dormers, a shallow upper slope, and iron cresting along the top.
    function mansard(x0, x1, z, bays, col, tall) {
      const lo = tall ? 5.2 : 3.6, inset = tall ? 1.6 : 1.0, hi = tall ? 1.2 : 1.4;
      PG([[x0 - 0.3, z], [x0 + inset, z + lo], [x1 - inset, z + lo], [x1 + 0.3, z]], col, 0.9 * E / 6);
      PG([[x0 + inset, z + lo], [x0 + inset + 2.5, z + lo + hi], [x1 - inset - 2.5, z + lo + hi], [x1 - inset, z + lo]], shade(col, 1.12), 0.8 * E / 6);
      const cid = id + "c" + (++uid); out.push(`<clipPath id="${cid}"><polygon points="${[[x0 - 0.3, z], [x0 + inset, z + lo], [x1 - inset, z + lo], [x1 + 0.3, z]].map(([x, zz]) => pt(x, zz)).join(" ")}"/></clipPath><g clip-path="url(#${cid})">`);
      for (let zz = z + 0.35; zz < z + lo; zz += 0.35) for (let x = x0 + ((zz * 3) % 1) * 0.5; x < x1; x += 0.5) PATH(`M${pt(x, zz)} ${arc(0.25, x + 0.5, zz, 0)}`, "none", 0, `stroke="${shade(col, 0.82)}" stroke-width="${lw(0.4)}"`);
      out.push(`</g>`);
      // cresting
      L(x0 + inset + 2.5, z + lo + hi, x1 - inset - 2.5, z + lo + hi, INK, lw(0.8)); for (let x = x0 + inset + 2.7; x < x1 - inset - 2.5; x += 0.6) L(x, z + lo + hi, x, z + lo + hi + 0.55, INK, lw(0.5));
      // dormers, one to a bay
      for (const [b0, b1] of bays) {
        const cx = (b0 + b1) / 2;
        if (cx - x0 < inset + 0.8 || x1 - cx < inset + 0.8) continue;
        if (F.dormer === "oeil") { R(cx - 0.9, z + 0.3, cx + 0.9, z + 1.4, wall, 0.4 * E / 6); out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(z + 2.0))}" r="${f1(1.0 * E)}" fill="${shade(wall, 1.08)}" stroke="${INK}" stroke-width="${f1(0.5 * E / 6)}"/><circle cx="${f1(X(cx))}" cy="${f1(Y(z + 2.0))}" r="${f1(0.62 * E)}" fill="url(#${id}gl)" stroke="${INK}" stroke-width="${f1(0.3 * E / 6)}"/>`); }
        else { R(cx - 0.85, z + 0.2, cx + 0.85, z + 2.6, shade(wall, 1.05), 0.4 * E / 6); R(cx - 0.55, z + 0.4, cx + 0.55, z + 2.3, `url(#${id}gl)`, 0.3 * E / 6); PG([[cx - 1.05, z + 2.6], [cx, z + 3.4], [cx + 1.05, z + 2.6]], shade(wall, 1.1), 0.4 * E / 6); }
      }
      R(x0, z - 0.5, x1, z, SH);
      return z + lo + hi;
    }
    // A small domed kiosk on four posts, the chhatri of Indian building.
    function chhatri(cx, z, w) {
      R(cx - w * 0.55, z, cx + w * 0.55, z + 0.4, shade(F.band || wall, 1), 0.4 * E / 6);
      for (const s of [-1, 1]) R(cx + s * w * 0.4 - 0.12, z + 0.4, cx + s * w * 0.4 + 0.12, z + 0.4 + w * 0.8, F.band || wall, 0.3 * E / 6);
      PATH(`M${pt(cx - w * 0.4, z + 0.4)} L${pt(cx - w * 0.4, z + 0.4 + w * 0.55)} Q${pt(cx, z + 0.4 + w * 0.9)} ${pt(cx + w * 0.4, z + 0.4 + w * 0.55)} L${pt(cx + w * 0.4, z + 0.4)} Z`, "rgba(45,32,20,0.45)");
      const zb = z + 0.4 + w * 0.8; R(cx - w * 0.62, zb, cx + w * 0.62, zb + 0.22, shade(F.band || wall, 0.95), 0.35 * E / 6);
      PATH(`M${pt(cx - w * 0.45, zb + 0.22)} Q${pt(cx - w * 0.55, zb + w * 0.55)} ${pt(cx, zb + w * 0.78)} Q${pt(cx + w * 0.55, zb + w * 0.55)} ${pt(cx + w * 0.45, zb + 0.22)} Z`, F.band || wall, 0.45 * E / 6);
      L(cx, zb + w * 0.78, cx, zb + w * 0.78 + 0.6, INK, lw(0.8));
    }
    // A Chinese bracket frieze: a painted beam and the stacked brackets that carry the eaves.
    function brackets(x0, x1, z, bays) {
      R(x0, z, x1, z + 0.75, "#3b6b73", 0.5 * E / 6);
      for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.2) R(x, z + 0.28, x + 0.6, z + 0.47, "#c9a45a");
      R(x0, z + 0.75, x1, z + 0.95, "#9b2a24", 0.3 * E / 6);
      for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.15) { PG([[x - 0.35, z + 0.95], [x + 0.35, z + 0.95], [x + 0.5, z + 1.3], [x - 0.5, z + 1.3]], "#4c7f6a", 0.3 * E / 6); R(x - 0.6, z + 1.3, x + 0.6, z + 1.55, "#9b2a24", 0.3 * E / 6); }
      R(x0 - 0.2, z + 1.55, x1 + 0.2, z + 1.7, "#3b6b73", 0.3 * E / 6);
    }
    // A parapet for a flat roof, in the style's manner.
    function parapet(x0, x1, z, role) {
      const pc = shade(wall, 1.06);
      if (F.merlons === "round") { R(x0, z, x1, z + 0.5, pc, 0.4 * E / 6); for (let x = x0 + 0.3; x < x1 - 0.5; x += 1.1) PATH(`M${pt(x, z + 0.5)} L${pt(x, z + 1.2)} Q${pt(x + 0.35, z + 1.75)} ${pt(x + 0.7, z + 1.2)} L${pt(x + 0.7, z + 0.5)} Z`, pc, 0.35 * E / 6); return z + 1.7; }
      if (F.merlons === "stepped") { R(x0, z, x1, z + 0.5, pc, 0.4 * E / 6); for (let x = x0 + 0.2; x < x1 - 0.8; x += 1.4) PG([[x, z + 0.5], [x, z + 1.1], [x + 0.25, z + 1.1], [x + 0.25, z + 1.5], [x + 0.75, z + 1.5], [x + 0.75, z + 1.1], [x + 1.0, z + 1.1], [x + 1.0, z + 0.5]], pc, 0.35 * E / 6); return z + 1.5; }
      if (cls) { R(x0, z, x1, z + 0.3, pc, 0.4 * E / 6); for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.36) PATH(`M${pt(x - 0.1, z + 0.3)} Q${pt(x - 0.17, z + 0.65)} ${pt(x - 0.06, z + 0.9)} L${pt(x + 0.06, z + 0.9)} Q${pt(x + 0.17, z + 0.65)} ${pt(x + 0.1, z + 0.3)} Z`, pc, 0.25 * E / 6); R(x0, z + 0.9, x1, z + 1.15, pc, 0.4 * E / 6); return z + 1.15; }
      if (F.curvParapet && role === "centre") { PATH(`M${pt(x0, z)} L${pt(x0, z + 0.6)} Q${pt(x0 + (x1 - x0) * 0.2, z + 0.7)} ${pt(x0 + (x1 - x0) * 0.3, z + 1.6)} Q${pt((x0 + x1) / 2, z + 3.2)} ${pt(x1 - (x1 - x0) * 0.3, z + 1.6)} Q${pt(x1 - (x1 - x0) * 0.2, z + 0.7)} ${pt(x1, z + 0.6)} L${pt(x1, z)} Z`, pc, 0.6 * E / 6); return z + 3; }
      R(x0 - 0.1, z, x1 + 0.1, z + 0.8, pc, 0.5 * E / 6); R(x0 - 0.2, z + 0.8, x1 + 0.2, z + 1.0, shade(wall, 1.12), 0.4 * E / 6);
      return z + 1.0;
    }

    // A whole block: walls, floors of windows, ornament, frieze and cornice. Returns where its roof begins.
    function block(s) {
      const tone = s.role === "back" ? clamp(1 + s.proj * 0.008, 0.82, 1) : 1 + s.proj * 0.015, wc = shade(wall, tone), { x0, x1 } = s;
      R(x0, 0, x1, s.wt + frz, wc);
      // plinth, and rusticated ground floor on grand classical buildings
      R(x0, 0, x1, P, shade(wall, tone * (F.platform ? 1.08 : 0.86)), 0.4 * E / 6); L(x0, P, x1, P, INK, lw(0.6));
      if (F.rustic) for (let z = P + 0.55; z < P + h; z += 0.55) L(x0, z, x1, z, shade(wc, 0.86), lw(0.7));
      if (F.quoins) for (const ex of [x0, x1]) for (let z = P, k = 0; z < s.wt; z += 0.6, k++) R(ex === x0 ? x0 : x1 - (k % 2 ? 0.8 : 1.3), z + 0.04, ex === x0 ? x0 + (k % 2 ? 0.8 : 1.3) : x1, z + 0.56, stone, 0.25 * E / 6);
      for (let k = 0; k < s.storeys; k++) {
        const z0 = P + k * h, top = k === s.storeys - 1, ground = k === 0;
        // string courses and chhajjas between floors
        if (k > 0 && (cls || d.ornament === "brick" || F.band)) R(x0, z0 - 0.12, x1, z0 + 0.18, F.band || shade(wc, d.ornament === "brick" ? 0.78 : 1.1), 0.3 * E / 6);
        if (k > 0 && F.chhajja) { R(x0 - 0.3, z0 + 0.1, x1 + 0.3, z0 + 0.32, F.band, 0.35 * E / 6); R(x0, z0 - 0.35, x1, z0 + 0.1, SH); }
        let wk = d.windows === "punched" ? "rect" : d.windows === "arched" ? "arch" : d.windows === "pointed" ? (F.horseshoe ? "horseshoe" : "pointed") : d.windows;
        if (F.chinese && wk === "rect") wk = "rect";
        const piano = cls && k === 1 && s.storeys >= 3, attic = cls && top && s.storeys >= 3 && !ground;
        if (d.windows === "bands") { if (!(ground && s.role === "centre" && hasEnt)) { R(x0 + 0.5, z0 + h * 0.3, x1 - 0.5, z0 + h * 0.3 + Math.min(1.9, h * 0.4), `url(#${id}gl)`, 0.5 * E / 6); for (let x = x0 + 1.1; x < x1 - 0.5; x += 1.2) L(x, z0 + h * 0.3, x, z0 + h * 0.3 + Math.min(1.9, h * 0.4), "#ddd6c4", lw(0.7)); R(x0 + 0.5, z0 + h * 0.3 + Math.min(1.9, h * 0.4) - 0.2, x1 - 0.5, z0 + h * 0.3 + Math.min(1.9, h * 0.4), SH2); R(x0 + 0.3, z0 + h * 0.3 - 0.2, x1 - 0.3, z0 + h * 0.3, shade(wc, 1.08), 0.3 * E / 6); } continue; }
        if (d.windows === "strips") { if (k === 0) for (const [b0, b1] of s.bays) { const cx = (b0 + b1) / 2, w = Math.min(1.8, (b1 - b0) * 0.42); if (hasEnt && s.role === "centre" && Math.abs(cx - tc) < ew / 2 + w) continue; R(cx - w / 2, P + h * 0.25, cx + w / 2, P + s.storeys * h - h * 0.15, `url(#${id}gl)`, 0.5 * E / 6); for (let kk = 1; kk < s.storeys; kk++) R(cx - w / 2, P + kk * h - 0.3, cx + w / 2, P + kk * h + 0.35, shade(wc, 0.82), 0.3 * E / 6); for (let z = P + h * 0.25 + 0.6; z < P + s.storeys * h - h * 0.15; z += 0.6) L(cx - w / 2, z, cx + w / 2, z, "#ddd6c4", lw(0.4)); L(cx, P + h * 0.25, cx, P + s.storeys * h - h * 0.15, "#ddd6c4", lw(0.5)); } continue; }
        // arcade along the ground floor
        if (ground && d.ornament === "arcade" && s.role !== "back") {
          for (const [b0, b1] of s.bays) { const cx = (b0 + b1) / 2, w = (b1 - b0) * 0.72; if (hasEnt && s.role === "centre" && Math.abs(cx - tc) < ew / 2) continue;
            const r = w / 2, zs = P + h * 0.88 - r, kind = F.horseshoe ? "horseshoe" : d.windows === "pointed" ? "pointed" : "arch";
            const dd = kind === "pointed" ? `M${pt(cx - r, P)} L${pt(cx - r, zs)} Q${pt(cx - r, zs + r * 1.1)} ${pt(cx, zs + r * 1.5)} Q${pt(cx + r, zs + r * 1.1)} ${pt(cx + r, zs)} L${pt(cx + r, P)} Z` : `M${pt(cx - r, P)} L${pt(cx - r, zs)} ${kind === "horseshoe" ? `A${f1(r * 1.1 * E)},${f1(r * 1.1 * E)} 0 1 1 ${pt(cx + r, zs)}` : arc(r, cx + r, zs)} L${pt(cx + r, P)} Z`;
            PATH(dd, "#5b5142", 0.6 * E / 6); PATH(dd, "url(#" + id + "gl)", 0, `opacity="0.35"`); R(cx - r, P, cx - r + 0.35, zs, "rgba(0,0,0,0.25)");
            win("rect", cx, P + 0.4, w * 0.5, h * 0.42, { wallC: wc, sill: "#5b5142" });
            if (F.ablaq) win(kind, cx, P, w, h * 0.88, { wallC: wc, ablaq: true, sill: "none" });
          }
          continue;
        }
        for (const [b0, b1] of s.bays) {
          const cx = (b0 + b1) / 2, bw = b1 - b0;
          if (hasEnt && s.role === "centre" && z0 < entH && Math.abs(cx - tc) < ew / 2 + 0.5) continue;
          if (F.jharokha && s.role === "pav" && k === 1 && Math.abs(cx - (x0 + x1) / 2) < bw) {      // a projecting balcony window
            const w = bw * 0.7, zz = z0 + h * 0.18;
            R(cx - w / 2 - 0.2, zz - 0.4, cx + w / 2 + 0.2, zz, F.band, 0.35 * E / 6); for (let x = cx - w / 2; x < cx + w / 2; x += 0.5) PG([[x, zz - 0.4], [x + 0.5, zz - 0.4], [x + 0.25, zz - 1.1]], shade(F.band, 0.9), 0.25 * E / 6);
            R(cx - w / 2, zz, cx + w / 2, zz + h * 0.6, shade(F.band, 0.98), 0.4 * E / 6);
            for (const o of [-1, 0, 1]) win("pointed", cx + o * w / 3, zz + 0.3, w / 3 - 0.35, h * 0.5 - 0.3, { wallC: F.band, sill: F.band });
            PATH(`M${pt(cx - w / 2 - 0.4, zz + h * 0.6)} Q${pt(cx, zz + h * 0.6 + w * 0.45)} ${pt(cx + w / 2 + 0.4, zz + h * 0.6)} Z`, F.band, 0.45 * E / 6);
            continue;
          }
          let w = clamp(bw * (F.vertical ? 0.36 : 0.42), 1.1, 2.3), hh = h * (ground ? 0.56 : piano ? 0.62 : attic ? 0.42 : 0.52);
          if (d.windows === "goods") { if (ground) { if (Math.round((cx - x0) / bw) % 2 === 0) { R(cx - bw * 0.38, P, cx + bw * 0.38, P + Math.min(5.5, h * 0.72), "#7d6a55", 0.6 * E / 6); for (let x = cx - bw * 0.38 + 0.6; x < cx + bw * 0.38; x += 0.6) L(x, P, x, P + Math.min(5.5, h * 0.72), "#5d4c3c", lw(0.6)); } else win("rect", cx, P + h * 0.3, w, h * 0.4, { wallC: wc }); continue; } wk = "rect"; hh = h * 0.42; }
          const zb = z0 + (h - hh) * (ground ? 0.42 : 0.48), kind = attic ? "rect" : piano && wk === "rect" ? "rect" : wk;
          const hood = piano ? (Math.round((cx - x0) / bw) % 2 ? "seg" : "tri") : F.nalichnik && !ground ? "ogee" : cls && kind === "rect" && !attic ? "flat" : null;
          win(kind, cx, zb, w, hh, { wallC: wc, hood, key: cls || F.rustic, ablaq: F.ablaq, lattice: F.chinese ? "#9b2a24" : null, sur: F.chinese ? "#9b2a24" : F.dressing && !ground ? F.dressing : F.vertical ? shade(wc, 1.07) : null });
        }
        // attic windows above the top storey
      }
      if (s.attic) for (const [b0, b1] of s.bays) { const cx = (b0 + b1) / 2; win("rect", cx, P + s.storeys * h + s.attic * 0.25, Math.min(1.4, (b1 - b0) * 0.32), s.attic * 0.5, { wallC: wc }); }
      // vertical ornament: pilasters and columns, piers, red columns
      const lines = [x0, ...s.bays.map(bb => bb[1])];
      if (cls && (s.role === "centre" || s.role === "pav")) for (const x of lines) { const zA = F.rustic ? P + h : P, zB = P + s.storeys * h; const cw2 = 0.75; if (F.columns === 2 && s.role === "centre" && x !== x0 && x !== x1) { column(x - 0.5, zA, zB, cw2, shade(wc, 1.06), "ionic"); column(x + 0.5, zA, zB, cw2, shade(wc, 1.06), "ionic"); } else column(x === x0 ? x + 0.45 : x === x1 ? x - 0.45 : x, zA, zB, cw2, shade(wc, 1.06), "ionic"); }
      if (cls && s.role === "wing") for (const x of [x0, x1]) R(x - 0.01, P, x + 0.01, s.wt, INK);
      if (d.ornament === "deco" || F.piers) for (const x of lines) { const top = s.wt + frz + (d.roof === "flat" && !F.piers ? 1.4 : 0); R(x - 0.4, P, x + 0.4, top, shade(wc, 1.08), 0.4 * E / 6); R(x + 0.15, P, x + 0.4, top, "rgba(45,32,20,0.12)"); if (d.ornament === "deco" && d.roof === "flat") PG([[x - 0.4, top], [x, top + 0.8], [x + 0.4, top]], shade(wc, 1.08), 0.4 * E / 6); }
      if (F.pointedPiers) for (const x of lines) { R(x - 0.35, P, x + 0.35, s.wt + frz + 1.8, shade(wc, 0.9), 0.4 * E / 6); PG([[x - 0.35, s.wt + frz + 1.8], [x, s.wt + frz + 3.0], [x + 0.35, s.wt + frz + 1.8]], shade(wc, 0.9), 0.4 * E / 6); }
      if (d.ornament === "oriental") for (const x of lines) { R(x - 0.32, P, x + 0.32, s.wt, "#9b2a24", 0.45 * E / 6); R(x + 0.1, P, x + 0.32, s.wt, "rgba(0,0,0,0.18)"); R(x - 0.45, P, x + 0.45, P + 0.35, "#d8d0bd", 0.3 * E / 6); }
      if (d.ornament === "verandah") for (let k = 0; k < s.storeys; k++) { const z0 = P + k * h; R(x0, z0 + h - 0.45, x1, z0 + h - 0.1, "#f3eee0", 0.35 * E / 6); for (let x = x0 + 0.2; x <= x1; x += 2.2) R(x - 0.1, z0, x + 0.1, z0 + h - 0.45, "#f3eee0", 0.25 * E / 6); R(x0, z0 + 0.9, x1, z0 + 1.0, "#f3eee0"); for (let x = x0 + 0.3; x < x1; x += 0.3) L(x, z0, x, z0 + 0.9, "#f3eee0", lw(0.4)); R(x0, z0 + h - 1.6, x1, z0 + h - 0.45, "rgba(45,32,20,0.18)"); }
      // frieze and cornice
      const zf = s.wt;
      if (F.brackets) brackets(x0, x1, zf, s.bays);
      else {
        R(x0, zf, x1, zf + frz, shade(wc, d.ornament === "brick" ? 0.95 : 1.03));
        if (d.ornament === "brick") for (let x = x0 + 0.2; x < x1 - 0.4; x += 0.8) { R(x, zf + frz - 0.5, x + 0.5, zf + frz, shade(wc, 0.8), 0.25 * E / 6); R(x + 0.1, zf + frz - 0.9, x + 0.4, zf + frz - 0.5, shade(wc, 0.8)); }
        if (d.ornament === "deco") for (let x = x0 + 0.8; x < x1 - 1.6; x += 1.6) PATH(`M${pt(x, zf + 0.3)} L${pt(x + 0.8, zf + frz * 0.45)} L${pt(x + 1.6, zf + 0.3)}`, "none", 0, `stroke="${cc}" stroke-width="${lw(1.3)}"`);
        if (F.chhajja) { R(x0 - 0.6, zf + frz, x1 + 0.6, zf + frz + 0.3, F.band, 0.4 * E / 6); for (let x = x0 + 0.5; x < x1; x += 1.5) PG([[x, zf + frz], [x + 0.4, zf + frz], [x + 0.4, zf + frz - 0.7]], shade(F.band, 0.9), 0.25 * E / 6); R(x0, zf + frz - 0.9, x1, zf + frz, SH); }
        else cornice(x0, x1, zf + frz, cls ? 0.35 : 0.2, cls ? shade(wc, 1.03) : wc, cls);
      }
      if (F.kokoshnik && s.role !== "back") for (const [b0, b1] of s.bays) { const cx = (b0 + b1) / 2, r = (b1 - b0) * 0.42, z = zf + frz + cor; PATH(`M${pt(cx - r, z)} L${pt(cx - r, z + 0.3)} ${arc(r, cx + r, z + 0.3)} L${pt(cx + r, z)} Z`, shade(wc, 1.04), 0.45 * E / 6); PATH(`M${pt(cx - r * 0.6, z + 0.1)} ${arc(r * 0.6, cx + r * 0.6, z + 0.1)} Z`, shade(wc, 0.85), 0.3 * E / 6); }
      s.roofZ = zf + frz + (F.brackets ? 0 : cor);
      // a projecting block throws a shadow on the wall to its right
      if (s.proj > 0.5) R(x1, 0, x1 + Math.min(1.6, s.proj * 0.7), s.wt + frz, SH);
    }

    // Draw: the parts set back first -----------------------------------------------------------------------------------
    const roofOf = (s, dp, role) => {
      const z = s.roofZ;
      if (!roofC) return parapet(s.x0, s.x1, z, role);
      if (d.roof === "curved") return eastRoof(s.x0, s.x1, z, dp, roofC, { finial: role === "centre" });
      if (d.roof === "mansard") return mansard(s.x0, s.x1, z, s.bays, roofC, role === "pav" || role === "centre");
      const pitch = d.roof === "low" ? 0.32 : d.roof === "hipped" ? 0.6 : 0.85, ov = d.roof === "low" ? 1.0 : 0.6;
      return hipRoof(s.x0, s.x1, z, dp, roofC, pitch, ov);
    };
    for (const s of back.sort((a, b2) => a.proj - b2.proj)) { block(s); roofOf(s, s.depth, "back"); }
    // The main run: one long roof over the wings, then the pavilions and the centre in front of it.
    const wings = secs.filter(s => s.role === "wing");
    for (const s of wings) block(s);
    if (wings.length) {
      const all = { x0: rx0, x1: rx1, roofZ: wings[0].roofZ, bays: wings.flatMap(s => s.bays) };
      if (!roofC) for (const s of wings) roofOf(s, depth, "wing");
      else if (d.roof === "curved") eastRoof(rx0, rx1, all.roofZ, depth, roofC);
      else roofOf(all, depth, "wing");
      if (F.chimneys && roofC) for (const x of [rx0 + RL * 0.18, rx1 - RL * 0.18]) { R(x - 0.7, all.roofZ + 2, x + 0.7, all.roofZ + Math.min(depth / 2, RL / 2) * (d.roof === "steep" ? 1.1 : 0.6) + 1.8, shade(wall, 0.92), 0.45 * E / 6); R(x - 0.85, all.roofZ + Math.min(depth / 2, RL / 2) * (d.roof === "steep" ? 1.1 : 0.6) + 1.8, x + 0.85, all.roofZ + Math.min(depth / 2, RL / 2) * (d.roof === "steep" ? 1.1 : 0.6) + 2.2, shade(wall, 0.85), 0.4 * E / 6); }
    }
    for (const s of secs.filter(s => s.role === "pav")) {
      block(s);
      if (F.stepGable || F.pavGable) { const z = s.roofZ, w = s.x1 - s.x0, g = F.stepGable ? 5 : 0; if (roofC) hipRoof(s.x0, s.x1, z, depth, roofC, d.roof === "steep" ? 1.1 : 0.6, 0.5); if (F.stepGable) { const pts = [[s.x0, z]]; for (let k = 0; k < g; k++) { const zz = z + (k + 1) * w * 0.16, xx = s.x0 + k * w * 0.1; pts.push([xx, zz], [xx + w * 0.1, zz]); } pts.push([s.x1 - (g - 1) * w * 0.1 - w * 0.1, z + g * w * 0.16]); for (let k = g - 1; k >= 0; k--) { const zz = z + (k + 1) * w * 0.16, xx = s.x1 - k * w * 0.1; pts.push([xx - w * 0.1, zz], [xx, zz]); } pts.push([s.x1, z]); PG(pts, shade(wall, 1.02), 0.8 * E / 6); win("arch", (s.x0 + s.x1) / 2, z + 1, 1.4, 2.6, { wallC: wall }); } else { PG([[s.x0 - 0.4, z], [(s.x0 + s.x1) / 2, z + w * 0.32], [s.x1 + 0.4, z]], shade(wall, 1.0), 0.8 * E / 6); out.push(`<circle cx="${f1(X((s.x0 + s.x1) / 2))}" cy="${f1(Y(z + w * 0.13))}" r="${f1(0.9 * E)}" fill="url(#${id}gl)" stroke="${stone}" stroke-width="${f1(0.3 * E)}"/>`); } }
      else if (F.tent) {            // a tall tent roof over a band of kokoshnik gables, with a little onion on top
        const z = s.roofZ, w = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2;
        R(s.x0 + 0.6, z, s.x1 - 0.6, z + 2.2, shade(wall, 1.0), 0.5 * E / 6);
        for (const o of [-0.25, 0, 0.25]) { const r = w * 0.11; PATH(`M${pt(cx + o * w - r, z + 2.2)} L${pt(cx + o * w - r, z + 2.4)} ${arc(r, cx + o * w + r, z + 2.4)} L${pt(cx + o * w + r, z + 2.2)} Z`, shade(wall, 1.05), 0.4 * E / 6); }
        PG([[s.x0 + 0.4, z + 2.2], [cx, z + 2.2 + w * 1.1], [s.x1 - 0.4, z + 2.2]], "#4f8a6e", 0.8 * E / 6); PG([[cx, z + 2.2 + w * 1.1], [s.x1 - 0.4, z + 2.2], [cx, z + 2.2]], "rgba(0,0,0,0.15)");
        for (let k = 1; k < 5; k++) { const zz = z + 2.2 + k * w * 0.2, half = (w / 2 - 0.4) * (1 - k * 0.2 / 1.1); L(cx - half, zz, cx + half, zz, "#b48a3c", lw(0.6)); }
        const tz = z + 2.2 + w * 1.1, r = 0.9; PATH(`M${pt(cx - r * 0.4, tz - 0.4)} C${pt(cx - r * 1.3, tz + r * 0.6)} ${pt(cx - r * 0.8, tz + r * 1.3)} ${pt(cx, tz + r * 2)} C${pt(cx + r * 0.8, tz + r * 1.3)} ${pt(cx + r * 1.3, tz + r * 0.6)} ${pt(cx + r * 0.4, tz - 0.4)} Z`, "#c9a45a", 0.5 * E / 6);
        s.flagZ = null;
      }
      else if (F.pavRoof === "mansard") s.flagZ = mansard(s.x0, s.x1, s.roofZ, s.bays, roofC || "#5d636b", true);
      else { const zt = roofOf(s, depth, "pav"); s.flagZ = F.chhatri ? null : zt; if (F.chhatri) for (const x of [s.x0 + 1.2, s.x1 - 1.2]) chhatri(x, zt, 2.2); }
    }
    let crownZ = 0, cenRoof = [];
    const rising = tw.length && (d.tower !== "minaret") && !(d.tower === "pagoda" && F.chinese);
    if (cen) {
      block(cen); const mark = out.length;
      const towerHere = tw.length;
      if (F.chinese && d.roof === "curved") { const z = cen.roofZ, lowR = eastRoof(cen.x0 - 1, cen.x1 + 1, z, depth * 0.5, roofC, { rise: 2.2, ov: 2.6 }); R(cen.x0 + 1.5, lowR - 0.2, cen.x1 - 1.5, lowR + 2.0, shade(wall, 0.98), 0.5 * E / 6); brackets(cen.x0 + 1.5, cen.x1 - 1.5, lowR + 0.5, cen.bays); crownZ = eastRoof(cen.x0 + 0.5, cen.x1 - 0.5, lowR + 2.2, depth * 0.7, roofC, { finial: !towerHere, ov: 2.8 }); }
      else if (!(towerHere && ["dome", "stepped", "pagoda"].includes(d.tower) && !roofC)) crownZ = roofOf(cen, Math.min(depth, cen.x1 - cen.x0), "centre");
      else crownZ = parapet(cen.x0, cen.x1, cen.roofZ, "centre");
      if (rising) cenRoof = out.splice(mark);
    }

    // The tower --------------------------------------------------------------------------------------------------------
    let flagAt = null;
    if (tw.length && cen) {
      const zb = Math.max(cen.roofZ, F.chinese ? crownZ : cen.roofZ), cx = tc;
      const shaft = (w, z0, z1, col) => { R(cx - w / 2, z0, cx + w / 2, z1, col || shade(wall, 1.03), 0.7 * E / 6); R(cx + w / 2 - w * 0.12, z0, cx + w / 2, z1, "rgba(45,32,20,0.12)"); };
      if (d.tower === "dome") {
        const dw = Math.min(twid * 0.82, 18), dz = Math.max(crownZ, cen.roofZ + 1) + 0.4;
        shaft(dw, cen.roofZ, dz + 4.6); for (let x = cx - dw / 2 + dw / 8; x < cx + dw / 2 - 0.1; x += dw / 4) { R(x - 0.25, cen.roofZ, x + 0.25, dz + 4.6, shade(wall, 1.08), 0.3 * E / 6); }
        for (let x = cx - dw / 2 + dw / 4; x < cx + dw / 2 - 0.1; x += dw / 4) win("arch", x, dz, Math.min(1.3, dw / 9), 3.2, { wallC: wall, sill: shade(wall, 1.1) });
        cornice(cx - dw / 2, cx + dw / 2, dz + 4.6, 0.3, wall, false);
        const r = dw * 0.47, z0 = dz + 5.2;
        if (F.chhatri) { // a bulbous Indian dome with a lotus finial
          PATH(`M${pt(cx - r, z0)} Q${pt(cx - r * 1.12, z0 + r * 0.75)} ${pt(cx - r * 0.55, z0 + r * 1.05)} Q${pt(cx - r * 0.1, z0 + r * 1.25)} ${pt(cx, z0 + r * 1.42)} Q${pt(cx + r * 0.1, z0 + r * 1.25)} ${pt(cx + r * 0.55, z0 + r * 1.05)} Q${pt(cx + r * 1.12, z0 + r * 0.75)} ${pt(cx + r, z0)} Z`, "#f0e7d4", 1 * E / 6);
          PATH(`M${pt(cx + r * 0.2, z0)} Q${pt(cx + r * 0.85, z0 + r * 0.7)} ${pt(cx + r * 0.1, z0 + r * 1.3)} Q${pt(cx + r * 0.6, z0 + r * 1.05)} ${pt(cx + r, z0 + r * 0.3)} L${pt(cx + r, z0)} Z`, "rgba(45,32,20,0.14)");
          for (const k of [-0.5, 0, 0.5]) PATH(`M${pt(cx + k * r * 1.6, z0)} Q${pt(cx + k * r * 1.5, z0 + r * 0.9)} ${pt(cx, z0 + r * 1.4)}`, "none", 0, `stroke="${shade("#f0e7d4", 0.8)}" stroke-width="${lw(0.6)}"`);
          L(cx, z0 + r * 1.42, cx, z0 + r * 1.42 + 2.4, INK, lw(1)); for (const zz of [0.6, 1.3]) out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(z0 + r * 1.42 + zz))}" r="${f1(0.32 * E)}" fill="#c9a45a" stroke="${INK}" stroke-width="${f1(0.3 * E / 6)}"/>`);
          for (const x of [cen.x0 + 1.4, cen.x1 - 1.4]) chhatri(x, crownZ, 2.6);
          flagAt = null; crownZ = z0 + r * 1.42 + 2.4;
        } else {        // a classical dome, ribbed, with a lantern
          const rh = r * 0.95;
          PATH(`M${pt(cx - r, z0)} C${pt(cx - r, z0 + rh * 0.62)} ${pt(cx - r * 0.55, z0 + rh)} ${pt(cx, z0 + rh)} C${pt(cx + r * 0.55, z0 + rh)} ${pt(cx + r, z0 + rh * 0.62)} ${pt(cx + r, z0)} Z`, `url(#${id}cu)`, 1 * E / 6);
          for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) PATH(`M${pt(cx + k * r, z0)} C${pt(cx + k * r * 1.02, z0 + rh * 0.6)} ${pt(cx + k * r * 0.45, z0 + rh * 0.97)} ${pt(cx, z0 + rh)}`, "none", 0, `stroke="#557a6a" stroke-width="${lw(0.8)}"`);
          R(cx - r * 1.04, z0 - 0.1, cx + r * 1.04, z0 + 0.5, shade(wall, 1.05), 0.5 * E / 6);
          const lz = z0 + rh - 0.2, lw2 = Math.max(2, r * 0.28); shaft(lw2, lz, lz + 2.4); for (const o of [-0.25, 0.25]) win("arch", cx + o * lw2, lz + 0.4, lw2 * 0.22, 1.5, { wallC: wall, sill: wall });
          PATH(`M${pt(cx - lw2 * 0.6, lz + 2.4)} Q${pt(cx - lw2 * 0.55, lz + 3.6)} ${pt(cx, lz + 3.8)} Q${pt(cx + lw2 * 0.55, lz + 3.6)} ${pt(cx + lw2 * 0.6, lz + 2.4)} Z`, `url(#${id}cu)`, 0.6 * E / 6);
          L(cx, lz + 3.8, cx, lz + 5.6, INK, lw(1)); out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(lz + 4.4))}" r="${f1(0.3 * E)}" fill="#c9a45a"/>`);
          crownZ = lz + 5.6; flagAt = null;
        }
      }
      if (d.tower === "clock" || d.tower === "spire" || d.tower === "belfry" || d.tower === "onion") {
        const w = Math.min(twid, d.tower === "clock" ? 9 : 8), z0 = cen.roofZ, vis = Math.max(z0, crownZ), s1 = Math.max(z0 + (d.tower === "clock" ? 7 : 5.5), vis + 5);
        shaft(w, z0, s1); if (F.quoins) for (let z = z0, k = 0; z < s1; z += 0.6, k++) for (const sgn of [-1, 1]) R(cx + sgn * w / 2 - (sgn > 0 ? (k % 2 ? 0.7 : 1.1) : 0), z + 0.04, cx + sgn * w / 2 + (sgn < 0 ? (k % 2 ? 0.7 : 1.1) : 0), z + 0.56, stone, 0.25 * E / 6);
        win(F.horseshoe ? "horseshoe" : "arch", cx, vis + 0.8, w * 0.22, Math.max(2.2, s1 - vis - 2.2), { wallC: wall, key: cls });
        cornice(cx - w / 2, cx + w / 2, s1, 0.3, wall, cls);
        let z = s1 + 0.6;
        if (d.tower === "clock") { shaft(w * 0.92, z, z + 5); const r = Math.min(w * 0.28, 1.8); out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(z + 2.5))}" r="${f1((r + 0.3) * E)}" fill="${stone}" stroke="${INK}" stroke-width="${f1(0.6 * E / 6)}"/><circle cx="${f1(X(cx))}" cy="${f1(Y(z + 2.5))}" r="${f1(r * E)}" fill="#f6f1e2" stroke="${INK}" stroke-width="${f1(0.5 * E / 6)}"/>`); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; L(cx + Math.cos(a) * r * 0.82, z + 2.5 + Math.sin(a) * r * 0.82, cx + Math.cos(a) * r * 0.95, z + 2.5 + Math.sin(a) * r * 0.95, INK, lw(0.6)); } L(cx, z + 2.5, cx, z + 2.5 + r * 0.7, INK, lw(1.2)); L(cx, z + 2.5, cx + r * 0.45, z + 2.5 + r * 0.2, INK, lw(1.2)); cornice(cx - w * 0.46, cx + w * 0.46, z + 5, 0.3, wall, false); z += 5.6;
          // the cap
          if (F.cap === "cupola") { shaft(w * 0.55, z, z + 3); for (const o of [-1, 0, 1]) win("arch", cx + o * w * 0.16, z + 0.4, w * 0.09, 2.1, { wallC: wall, sill: wall }); cornice(cx - w * 0.28, cx + w * 0.28, z + 3, 0.2, wall, false); const r2 = w * 0.3; PATH(`M${pt(cx - r2, z + 3.6)} C${pt(cx - r2, z + 3.6 + r2 * 0.8)} ${pt(cx - r2 * 0.3, z + 3.6 + r2 * 1.2)} ${pt(cx, z + 3.6 + r2 * 1.4)} C${pt(cx + r2 * 0.3, z + 3.6 + r2 * 1.2)} ${pt(cx + r2, z + 3.6 + r2 * 0.8)} ${pt(cx + r2, z + 3.6)} Z`, "#6d737a", 0.6 * E / 6); z += 3.6 + r2 * 1.4; flagAt = [cx, z]; }
          else if (F.cap === "mansard") { PATH(`M${pt(cx - w * 0.5, z)} C${pt(cx - w * 0.5, z + 3)} ${pt(cx - w * 0.3, z + 4.5)} ${pt(cx - w * 0.2, z + 5)} L${pt(cx + w * 0.2, z + 5)} C${pt(cx + w * 0.3, z + 4.5)} ${pt(cx + w * 0.5, z + 3)} ${pt(cx + w * 0.5, z)} Z`, "#5d636b", 0.7 * E / 6); for (let x = cx - w * 0.2; x <= cx + w * 0.2; x += 0.5) L(x, z + 5, x, z + 5.6, INK, lw(0.5)); z += 5.6; flagAt = [cx, z]; }
          else if (F.cap === "flat") { R(cx - w * 0.5, z, cx + w * 0.5, z + 0.8, shade(wall, 1.06), 0.5 * E / 6); z += 0.8; flagAt = [cx, z]; }
          else { PG([[cx - w * 0.5, z], [cx, z + w * 0.7], [cx + w * 0.5, z]], roofC || "#6d737a", 0.7 * E / 6); z += w * 0.7; flagAt = [cx, z]; }
        }
        if (d.tower === "spire") { shaft(w * 0.92, z, z + 4.5); for (const o of [-1, 1]) win("pointed", cx + o * w * 0.18, z + 0.6, w * 0.16, 3.2, { wallC: wall, sill: wall }); z += 4.5; const sw2 = w * 0.78; PG([[cx - sw2 / 2, z], [cx, z + w * 2.4], [cx + sw2 / 2, z]], "#5d636b", 0.8 * E / 6); PG([[cx, z], [cx, z + w * 2.4], [cx + sw2 / 2, z]], "rgba(0,0,0,0.15)"); for (const o of [-1, 1]) PG([[cx + o * w * 0.5 - 0.5, z], [cx + o * w * 0.5, z + 2.4], [cx + o * w * 0.5 + 0.5, z]], "#5d636b", 0.5 * E / 6); L(cx, z + w * 2.4, cx, z + w * 2.4 + 1.6, INK, lw(1)); crownZ = z + w * 2.4 + 1.6; }
        if (d.tower === "belfry") { shaft(w * 0.92, z, z + 5); for (const o of (w > 7 ? [-1, 1] : [0])) { win("arch", cx + o * w * 0.2, z + 1, w * 0.26, 3.4, { wallC: wall, sill: wall }); PATH(`M${pt(cx + o * w * 0.2 - 0.5, z + 2.6)} Q${pt(cx + o * w * 0.2, z + 3.6)} ${pt(cx + o * w * 0.2 + 0.5, z + 2.6)} Z`, "#b48a3c", 0.4 * E / 6); } z += 5;
          if (F.cap === "mission") { PATH(`M${pt(cx - w * 0.46, z)} L${pt(cx - w * 0.46, z + 0.8)} Q${pt(cx - w * 0.3, z + 0.9)} ${pt(cx - w * 0.22, z + 2)} Q${pt(cx, z + 3.6)} ${pt(cx + w * 0.22, z + 2)} Q${pt(cx + w * 0.3, z + 0.9)} ${pt(cx + w * 0.46, z + 0.8)} L${pt(cx + w * 0.46, z)} Z`, shade(wall, 1.04), 0.6 * E / 6); z += 3.4; }
          else if (F.cap === "dome") { const r2 = w * 0.36; R(cx - w * 0.46, z, cx + w * 0.46, z + 0.6, shade(wall, 1.05), 0.5 * E / 6); PATH(`M${pt(cx - r2, z + 0.6)} ${arc(r2, cx + r2, z + 0.6)} Z`, "#c87a4a", 0.6 * E / 6); z += 0.6 + r2; }
          else { PG([[cx - w * 0.55, z], [cx, z + w * 0.45], [cx + w * 0.55, z]], ROOFS_LOW, 0.6 * E / 6); z += w * 0.45; }
          L(cx, z, cx, z + 1.6, INK, lw(1)); L(cx - 0.6, z + 1.1, cx + 0.6, z + 1.1, INK, lw(0.9)); crownZ = z + 1.6; }
        if (d.tower === "onion") { const dr = w * 0.55; shaft(dr, z, z + 4); for (let x = cx - dr / 2 + dr / 6; x < cx + dr / 2; x += dr / 3) win("arch", x, z + 0.8, dr * 0.14, 2.4, { wallC: wall, sill: wall }); z += 4; for (const [b0, b1] of [[cx - dr / 2, cx], [cx, cx + dr / 2]]) { const c2 = (b0 + b1) / 2, r2 = (b1 - b0) / 2; PATH(`M${pt(b0, z)} Q${pt(b0, z + r2 * 1.3)} ${pt(c2, z + r2 * 1.6)} Q${pt(b1, z + r2 * 1.3)} ${pt(b1, z)} Z`, shade(wall, 1.05), 0.4 * E / 6); }
          const r = w * 0.42; z += 0.4; PATH(`M${pt(cx - r * 0.45, z)} C${pt(cx - r * 1.35, z + r * 0.6)} ${pt(cx - r * 0.9, z + r * 1.4)} ${pt(cx, z + r * 2.2)} C${pt(cx + r * 0.9, z + r * 1.4)} ${pt(cx + r * 1.35, z + r * 0.6)} ${pt(cx + r * 0.45, z)} Z`, "#4f8a6e", 0.8 * E / 6); PATH(`M${pt(cx + r * 0.1, z)} C${pt(cx + r * 1.0, z + r * 0.6)} ${pt(cx + r * 0.7, z + r * 1.4)} ${pt(cx, z + r * 2.2)} C${pt(cx + r * 1.2, z + r * 1.3)} ${pt(cx + r * 1.3, z + r * 0.6)} ${pt(cx + r * 0.45, z)} Z`, "rgba(0,0,0,0.15)");
          z += r * 2.2; L(cx, z, cx, z + 2.2, "#b48a3c", lw(1.4)); L(cx - 0.7, z + 1.5, cx + 0.7, z + 1.5, "#b48a3c", lw(1.2)); L(cx - 0.5, z + 0.8, cx + 0.5, z + 1.0, "#b48a3c", lw(1)); crownZ = z + 2.2; }
      }
      if (d.tower === "stepped") {
        const w = Math.min(twid + 2, 16), z0 = cen.roofZ, vis = Math.max(z0, crownZ), s1 = Math.max(z0 + 10, vis + 9);
        shaft(w, z0, s1); for (const o of [-0.3, -0.1, 0.1, 0.3]) R(cx + o * w - 0.5, vis + 0.8, cx + o * w + 0.5, s1 - 4.4, `url(#${id}gl)`, 0.4 * E / 6);
        for (const o of [-0.4, -0.2, 0, 0.2, 0.4]) { R(cx + o * w - 0.3, z0, cx + o * w + 0.3, s1 + 0.6, shade(wall, 1.07), 0.35 * E / 6); PG([[cx + o * w - 0.3, s1 + 0.6], [cx + o * w, s1 + 1.4], [cx + o * w + 0.3, s1 + 0.6]], shade(wall, 1.07), 0.35 * E / 6); }
        const r = Math.min(w * 0.1, 1.4); out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(s1 - 2.2))}" r="${f1(r * E)}" fill="#f6f1e2" stroke="${INK}" stroke-width="${f1(0.5 * E / 6)}"/>`); L(cx, s1 - 2.2, cx, s1 - 2.2 + r * 0.7, INK, lw(1)); L(cx, s1 - 2.2, cx + r * 0.5, s1 - 2.2, INK, lw(1));
        R(cx - w * 0.42, s1, cx + w * 0.42, s1 + 3, shade(wall, 1.02), 0.6 * E / 6); for (let x = cx - w * 0.38; x < cx + w * 0.38 - 1; x += 1) PATH(`M${pt(x, s1 + 1)} L${pt(x + 0.5, s1 + 2)} L${pt(x + 1, s1 + 1)}`, "none", 0, `stroke="${cc}" stroke-width="${lw(1.2)}"`);
        R(cx - w * 0.3, s1 + 3, cx + w * 0.3, s1 + 5.6, shade(wall, 1.04), 0.6 * E / 6); for (const o of [-0.2, -0.1, 0, 0.1, 0.2]) R(cx + o * w - 0.25, s1 + 3.8, cx + o * w + 0.25, s1 + 4.9, `url(#${id}gl)`);
        R(cx - w * 0.18, s1 + 5.6, cx + w * 0.18, s1 + 7, shade(wall, 1.06), 0.6 * E / 6); flagAt = [cx, s1 + 7];
      }
      if (d.tower === "minaret") {
        for (const x of [cen.x0 + 1.6, cen.x1 - 1.6]) { const w = 2.6, z0 = cen.roofZ - 2, z1 = cen.roofZ + 16; R(x - w / 2, z0, x + w / 2, z1, shade(wall, 1.04), 0.6 * E / 6); for (const zz of [z0 + 7, z1]) { R(x - w * 0.85, zz, x + w * 0.85, zz + 0.4, shade(wall, 1.08), 0.45 * E / 6); for (let k = -2; k <= 2; k++) PG([[x + k * 0.35 - 0.15, zz], [x + k * 0.35 + 0.15, zz], [x + k * 0.35, zz - 0.6]], shade(wall, 0.95), 0.2 * E / 6); for (let xx = x - w * 0.8; xx < x + w * 0.8; xx += 0.35) L(xx, zz + 0.4, xx, zz + 1.1, INK, lw(0.4)); L(x - w * 0.85, zz + 1.1, x + w * 0.85, zz + 1.1, INK, lw(0.6)); }
          win("pointed", x, z0 + 2, 0.7, 2.6, { wallC: wall, sill: wall }); win("pointed", x, z0 + 9, 0.7, 2.6, { wallC: wall, sill: wall });
          R(x - w * 0.36, z1 + 0.4, x + w * 0.36, z1 + 3, shade(wall, 1.02), 0.5 * E / 6); PATH(`M${pt(x - w * 0.45, z1 + 3)} Q${pt(x - w * 0.5, z1 + 4.4)} ${pt(x, z1 + 5.4)} Q${pt(x + w * 0.5, z1 + 4.4)} ${pt(x + w * 0.45, z1 + 3)} Z`, `url(#${id}cu)`, 0.5 * E / 6); L(x, z1 + 5.4, x, z1 + 6.6, INK, lw(0.9)); crownZ = z1 + 6.6; }
        // and a dome over the centre between them
        const r = (cen.x1 - cen.x0) * 0.28, z0 = cen.roofZ + 1.2; R(cx - r * 1.05, cen.roofZ, cx + r * 1.05, z0 + 0.8, shade(wall, 1.03), 0.5 * E / 6); PATH(`M${pt(cx - r, z0 + 0.8)} Q${pt(cx - r * 1.05, z0 + 0.8 + r * 0.9)} ${pt(cx, z0 + 0.8 + r * 1.15)} Q${pt(cx + r * 1.05, z0 + 0.8 + r * 0.9)} ${pt(cx + r, z0 + 0.8)} Z`, `url(#${id}cu)`, 0.7 * E / 6); L(cx, z0 + 0.8 + r * 1.15, cx, z0 + 0.8 + r * 1.15 + 1.6, INK, lw(1));
      }
      if (d.tower === "pagoda") {
        if (F.chinese) flagAt = null;
        else {          // a Western tower crowned with a Japanese roof
          const w = Math.min(twid + 1, 14), z0 = cen.roofZ, vis = Math.max(z0, crownZ), s1 = Math.max(z0 + h * 1.6, vis + h * 1.2);
          shaft(w, z0, s1); for (const o of [-0.3, -0.1, 0.1, 0.3]) win("rect", cx + o * w, vis + 0.6, 1.0, s1 - vis - 1.8, { wallC: wall, sur: shade(wall, 1.06) });
          R(cx - w / 2 - 0.3, s1, cx + w / 2 + 0.3, s1 + 0.5, shade(wall, 1.05), 0.5 * E / 6);
          const lowR = eastRoof(cx - w / 2, cx + w / 2, s1 + 0.5, w * 0.9, roofC || "#4d5457", { rise: 2.4, ov: 2.4, lift: 1.1 });
          R(cx - w * 0.32, lowR - 0.3, cx + w * 0.32, lowR + 1.6, shade(wall, 1.0), 0.5 * E / 6); for (let x = cx - w * 0.28; x < cx + w * 0.28; x += 0.7) L(x, lowR, x, lowR + 1.4, shade(wall, 0.7), lw(0.6));
          crownZ = eastRoof(cx - w * 0.34, cx + w * 0.34, lowR + 1.6, w * 0.7, roofC || "#4d5457", { rise: 3.6, ov: 2.0, lift: 1.0, finial: true });
        }
      }
      if (flagAt === null && d.tower !== "stepped") flagAt = null;
    }

    out.push(...cenRoof);
    // The entrance -----------------------------------------------------------------------------------------------------
    if (hasEnt) {
      const ex = tc, doorH = Math.min(3.6, h * 0.7);
      const doors = (w, z = P) => { const k = Math.max(1, Math.round(w / 2.4)), dw = w / k; for (let q = 0; q < k; q++) { const x = ex - w / 2 + q * dw; R(x + 0.2, z, x + dw - 0.2, z + doorH, "#5d4630", 0.6 * E / 6); R(x + 0.45, z + 0.3, x + dw / 2 - 0.08, z + doorH - 0.3, `url(#${id}gl)`); R(x + dw / 2 + 0.08, z + 0.3, x + dw - 0.45, z + doorH - 0.3, `url(#${id}gl)`); R(x + 0.2, z + doorH + 0.15, x + dw - 0.2, z + doorH + 0.9, `url(#${id}gl)`, 0.4 * E / 6); for (let xx = x + 0.6; xx < x + dw - 0.3; xx += 0.4) L(xx, z + doorH + 0.15, xx, z + doorH + 0.9, "#c7a46a", lw(0.4)); } };
      const steps = (w) => { for (let k = 0; k < 3; k++) R(ex - w / 2 - (3 - k) * 0.4, k * P / 3, ex + w / 2 + (3 - k) * 0.4, (k + 1) * P / 3, shade("#d9d1bd", 1 - k * 0.03), 0.4 * E / 6); };
      if (F.platform) { // the platform's balustrade and the great stair
        for (const [a, b2] of [[Math.min(rx0, i0 * 10), ex - ew / 2 - 1.5], [ex + ew / 2 + 1.5, Math.max(rx1, i1 * 10)]]) { R(a, P, b2, P + 0.25, "#ece6d6", 0.4 * E / 6); R(a, P + 0.9, b2, P + 1.1, "#ece6d6", 0.4 * E / 6); for (let x = a + 0.1; x < b2; x += 1.6) R(x, P, x + 0.3, P + 1.3, "#ece6d6", 0.35 * E / 6); for (let x = a + 0.5; x < b2 - 0.5; x += 1.6) R(x, P + 0.3, x + 1.1, P + 0.85, "rgba(45,32,20,0.18)"); }
        for (let k = 0; k < 6; k++) R(ex - ew / 2 - 1.5 + k * 0.15, k * P / 6, ex + ew / 2 + 1.5 - k * 0.15, (k + 1) * P / 6, shade("#e6dfcd", 1 - k * 0.02), 0.35 * E / 6);
      }
      if (ent === "portico" && F.chinese) {          // a porch of red columns under its own curved roof
        const pw2 = Math.min(ew, 12), ph = P + h * 1.05;
        R(ex - pw2 / 2, P, ex + pw2 / 2, ph, "rgba(45,32,20,0.3)"); doors(pw2 * 0.55);
        for (let k = 0; k < 4; k++) { const x = ex - pw2 / 2 + 0.5 + k * (pw2 - 1) / 3; R(x - 0.35, P, x + 0.35, ph, "#9b2a24", 0.5 * E / 6); R(x + 0.12, P, x + 0.35, ph, "rgba(0,0,0,0.18)"); R(x - 0.5, P, x + 0.5, P + 0.4, "#e6dfcd", 0.35 * E / 6); }
        brackets(ex - pw2 / 2 - 0.3, ex + pw2 / 2 + 0.3, ph, []);
        eastRoof(ex - pw2 / 2 - 0.3, ex + pw2 / 2 + 0.3, ph + 1.7, 6, roofC || "#3e7a60", { rise: 2.6, ov: 1.8, lift: 0.9 });
      } else if (ent === "portico" && (F.crown || F.piers)) {   // a carriage porch on heavy square piers
        const pw2 = Math.min(ew, 14), ph = P + h * 0.95;
        R(ex - pw2 / 2, P, ex + pw2 / 2, ph, "rgba(45,32,20,0.28)"); doors(pw2 * 0.55); steps(pw2);
        for (const x of [ex - pw2 / 2 + 0.7, ex - pw2 / 6, ex + pw2 / 6, ex + pw2 / 2 - 0.7]) { R(x - 0.7, 0, x + 0.7, ph, shade(wall, 1.06), 0.6 * E / 6); R(x + 0.25, 0, x + 0.7, ph, "rgba(45,32,20,0.14)"); }
        R(ex - pw2 / 2 - 0.4, ph, ex + pw2 / 2 + 0.4, ph + 1.2, shade(wall, 1.08), 0.6 * E / 6); R(ex - pw2 / 2 - 0.6, ph + 1.2, ex + pw2 / 2 + 0.6, ph + 1.5, shade(wall, 1.12), 0.5 * E / 6); R(ex - pw2 / 2 - 0.4, ph - 0.5, ex + pw2 / 2 + 0.4, ph, SH);
      } else if (ent === "portico") {
        const cols = ew > 13 ? 6 : 4, ph = entH, z0 = P;
        R(ex - ew / 2, 0, ex + ew / 2, ph + 1.6, "rgba(45,32,20,0.28)");
        doors(ew * 0.5); steps(ew);
        for (let k = 0; k < cols; k++) column(ex - ew / 2 + 0.6 + k * (ew - 1.2) / (cols - 1), z0, ph, 0.95, "#f3eee0", "ionic");
        R(ex - ew / 2 - 0.3, ph, ex + ew / 2 + 0.3, ph + 1.3, "#efe9da", 0.6 * E / 6); L(ex - ew / 2 - 0.3, ph + 0.5, ex + ew / 2 + 0.3, ph + 0.5, INK, lw(0.5));
        if (d.sign) out.push(`<text x="${f1(X(ex))}" y="${f1(Y(ph + 0.75))}" font-family="Josefin Sans, sans-serif" font-size="${f1(0.55 * E)}" letter-spacing="${f1(0.18 * E)}" text-anchor="middle" fill="${INK}">${esc((cityName || "").toUpperCase())}</text>`);
        PG([[ex - ew / 2 - 0.6, ph + 1.3], [ex, ph + 1.3 + ew * 0.2], [ex + ew / 2 + 0.6, ph + 1.3]], "#efe9da", 0.7 * E / 6); PG([[ex - ew / 2 + 0.6, ph + 1.6], [ex, ph + 1.45 + ew * 0.2 - 0.6], [ex + ew / 2 - 0.6, ph + 1.6]], shade("#efe9da", 0.93), 0.4 * E / 6);
      }
      if (ent === "canopy") {
        doors(ew * 0.8); steps(ew * 0.8);
        const z = P + doorH + 1.2; R(ex - ew / 2, z, ex + ew / 2, z + 0.9, cc, 0.7 * E / 6); R(ex - ew / 2, z - 0.25, ex + ew / 2, z, "#f1ead9", 0.4 * E / 6); R(ex - ew / 2, z - 1.0, ex + ew / 2, z - 0.25, SH);
        for (const x of [ex - ew / 2 + 0.4, ex + ew / 2 - 0.4]) L(x, z + 0.9, x - (x - ex) * 0.15, z + 3.2, INK, lw(0.7));
        out.push(`<text x="${f1(X(ex))}" y="${f1(Y(z + 0.22))}" font-family="Josefin Sans, sans-serif" font-weight="700" font-size="${f1(0.62 * E)}" letter-spacing="${f1(0.4 * E)}" text-anchor="middle" fill="#f4efe1">${esc(((d.text || companyName || "").split(" ")[0] || "").toUpperCase())}</text>`);
      }
      if (ent === "arch") {
        const w = 6.2, zs = entH - w / 2, wc = shade(wall, 1.03);
        PATH(`M${pt(ex - w / 2 - 1.2, P)} L${pt(ex - w / 2 - 1.2, zs)} ${arc(w / 2 + 1.2, ex + w / 2 + 1.2, zs)} L${pt(ex + w / 2 + 1.2, P)} Z`, shade(wc, 1.05), 0.6 * E / 6);
        PATH(`M${pt(ex - w / 2, P)} L${pt(ex - w / 2, zs)} ${arc(w / 2, ex + w / 2, zs)} L${pt(ex + w / 2, P)} Z`, "#4a4236", 0.8 * E / 6);
        for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; L(ex - Math.cos(a) * w / 2, zs + Math.sin(a) * w / 2, ex - Math.cos(a) * (w / 2 + 1.2), zs + Math.sin(a) * (w / 2 + 1.2), F.ablaq && k % 2 ? "#f1e9d8" : shade(wc, 0.8), F.ablaq ? f1(E * 0.55) : lw(0.6)); }
        doors(w - 1.4); PATH(`M${pt(ex - w / 2 + 0.7, P + doorH + 1.0)} L${pt(ex - w / 2 + 0.7, zs)} ${arc(w / 2 - 0.7, ex + w / 2 - 0.7, zs)} L${pt(ex + w / 2 - 0.7, P + doorH + 1.0)} Z`, `url(#${id}gl)`, 0.5 * E / 6);
        for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; L(ex, zs, ex - Math.cos(a) * (w / 2 - 0.7), zs + Math.sin(a) * (w / 2 - 0.7), "#c7a46a", lw(0.5)); }
        PG([[ex - 0.5, zs + w / 2 + 1.3], [ex + 0.5, zs + w / 2 + 1.3], [ex + 0.35, zs + w / 2 - 0.2], [ex - 0.35, zs + w / 2 - 0.2]], shade(wc, 1.12), 0.4 * E / 6);
        if (!F.platform) steps(w + 2);
      }
      if (ent === "plain") { R(ex - 2.4, P, ex + 2.4, P + doorH + 1.3, shade(wall, 1.08), 0.5 * E / 6); doors(4); if (!F.platform) steps(4.5); }
    }

    // Lettering --------------------------------------------------------------------------------------------------------
    const textOf = d.text || ({ hotel: `Hotel ${cityName || ""}`.trim(), freight: "Goods and Mail", works: "Workshops", station: "Station", restaurant: "Restaurant" }[b.k] || companyName || "");
    if (d.sign && textOf) {
      const T = textOf.toUpperCase();
      if (F.plaque && cen) { const pw2 = Math.min(cen.x1 - cen.x0 - 3, T.length * 0.85 + 2), z = F.chinese && ent === "portico" ? P + h * 1.05 + 5.2 : entH + 1.2; R(tc - pw2 / 2 - 0.3, z - 0.3, tc + pw2 / 2 + 0.3, z + 2.1, "#c9a45a", 0.5 * E / 6); R(tc - pw2 / 2, z, tc + pw2 / 2, z + 1.8, "#2d3f4a"); const fs = Math.min(1.1, (pw2 - 1) / (T.length * 0.72)); out.push(`<text x="${f1(X(tc))}" y="${f1(Y(z + 0.9 - fs * 0.36))}" font-family="Josefin Sans, sans-serif" font-weight="700" font-size="${f1(fs * E)}" letter-spacing="${f1(fs * 0.15 * E)}" text-anchor="middle" fill="#e6c77a">${esc(T)}</text>`); }
      else {
        const ws = secs.filter(s => s.role === "wing"), runs = ws.length === 2 ? ws : ws.length ? [ws[0]] : [secs[0]];
        let parts = [T]; if (runs.length === 2) { const words = T.split(" "); let best = null; for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(" "), b2 = words.slice(k).join(" "), df = Math.abs(a.length - b2.length); if (!best || df < best.df) best = { a, b2, df }; } parts = best ? [best.a, best.b2] : [T, ""]; }
        runs.forEach((s, k) => { const t = parts[k] || ""; if (!t) return; const len = s.x1 - s.x0 - 1.5, fs = Math.min(frz * 0.62, len / Math.max(4, t.length * 0.8)); out.push(`<text x="${f1(X((s.x0 + s.x1) / 2))}" y="${f1(Y(s.wt + frz / 2 - fs * 0.36))}" font-family="Poiret One, Josefin Sans, sans-serif" font-size="${f1(fs * E)}" letter-spacing="${f1(fs * 0.22 * E)}" text-anchor="middle" fill="${shade(wall, 0.38)}">${esc(t)}</text>`); });
      }
    }
    // Flags.
    if (d.flags) {
      const flag = (x, z, big) => { const fh = big ? 8 : 6, fw = big ? 5 : 4; L(x, z, x, z + fh, INK, lw(1.1)); out.push(`<circle cx="${f1(X(x))}" cy="${f1(Y(z + fh))}" r="${f1(0.18 * E)}" fill="#c9a45a"/>`); PATH(`M${pt(x, z + fh - 0.2)} C${pt(x + fw * 0.35, z + fh + 0.3)} ${pt(x + fw * 0.65, z + fh - 0.6)} ${pt(x + fw, z + fh - 0.3)} L${pt(x + fw, z + fh - 2.6)} C${pt(x + fw * 0.65, z + fh - 2.9)} ${pt(x + fw * 0.35, z + fh - 2.1)} ${pt(x, z + fh - 2.5)} Z`, cc, 0.5 * E / 6); };
      if (flagAt) flag(flagAt[0], flagAt[1], true);
      else for (const s of secs.filter(s => s.role === "pav" && !F.tent && !F.chhatri)) flag((s.x0 + s.x1) / 2, s.flagZ != null ? s.flagZ : (s.roofZ || s.top) + 1.5, false);
      if (!flagAt && !secs.some(s => s.role === "pav") && secs.some(s => s.role === "wing")) for (const x of [rx0 + 1.5, rx1 - 1.5]) flag(x, wingTop + (roofC ? 0 : 1), false);
    }

    // Ground, trees, lamps and people ----------------------------------------------------------------------------------
    R(xmin, -6, xmax, 0, "#d8ceb4"); R(xmin, -0.6, xmax, 0, "#cfc4a8"); L(xmin, 0, xmax, 0, INK, lw(1.4)); L(xmin, -2.2, xmax, -2.2, "#b9ad91", lw(0.6));
    const tree = (x, s) => { L(x, 0, x, s * 0.45, "#5a4632", f1(s * 0.07 * E)); for (const [dx, dz, r, c] of [[-0.25, 0.55, 0.32, "#7f9a62"], [0.25, 0.6, 0.3, "#728f58"], [0, 0.8, 0.34, "#8aa56c"], [-0.12, 0.98, 0.24, "#93ad74"], [0.18, 0.92, 0.22, "#7d9860"]]) out.push(`<circle cx="${f1(X(x + dx * s))}" cy="${f1(Y(dz * s))}" r="${f1(r * s * E)}" fill="${c}" stroke="${shade(c, 0.75)}" stroke-width="${f1(0.4 * E / 6)}"/>`); };
    const lx0 = Math.min(rx0, i0 * 10), lx1 = Math.max(rx1, i1 * 10);
    tree(lx0 - 9, 12); tree(lx0 - 20, 14); tree(lx1 + 9, 12); tree(lx1 + 21, 13);
    const lamp = x => { L(x, 0, x, 4.2, "#3d3a35", lw(1)); R(x - 0.3, 4.2, x + 0.3, 4.9, "#f3ead0", 0.4 * E / 6); R(x - 0.4, 4.9, x + 0.4, 5.05, "#3d3a35"); };
    for (let x = lx0 + 6; x < lx1 - 4; x += 16) if (!hasEnt || Math.abs(x - tc) > ew / 2 + 4) lamp(x);
    const person = (x, c) => { PATH(`M${pt(x - 0.22, 0.05)} L${pt(x - 0.26, 0.9)} L${pt(x - 0.3, 1.35)} Q${pt(x, 1.5)} ${pt(x + 0.3, 1.35)} L${pt(x + 0.26, 0.9)} L${pt(x + 0.22, 0.05)} Z`, c, 0); out.push(`<circle cx="${f1(X(x))}" cy="${f1(Y(1.6))}" r="${f1(0.13 * E)}" fill="${c}"/>`); R(x - 0.22, 1.7, x + 0.22, 1.76, c); };
    for (const [x, c] of [[lx0 - 3, "#3f4a52"], [(lx0 + tc) / 2 - 2, "#5a3e33"], [tc + Math.max(ew, 6) / 2 + 2.5, "#2f3a44"], [tc + Math.max(ew, 6) / 2 + 3.3, "#6b4a3a"], [lx1 + 3.5, "#3f4a52"], [(tc + lx1) / 2 + 1, "#4c4a3c"]]) person(x, c);
    // A scale bar.
    for (let k = 0; k < 4; k++) R(lx0 + k * 5, -4.4, lx0 + k * 5 + 5, -3.8, k % 2 ? "#f3ecda" : INK, 0.4 * E / 6);
    out.push(`<text x="${f1(X(lx0 + 21))}" y="${f1(Y(-4.3))}" font-family="Josefin Sans, sans-serif" font-size="${f1(Math.max(10, 0.9 * E))}" fill="${INK}">20 metres</text>`);
    return { svg: out.join(""), w: Wpx, h: Hpx };
  }
  const ROOFS_LOW = "#b8704a";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));


  // The bird's-eye drawing of a building: the same composition as its elevation, in masses of whole cells. A centre
  // block and end pavilions stand apart from the wings with roofs of their own, windows keep the bays' rhythm, and the
  // tower rises from the centre's roof.
  function birdseye(b, H, objs, shadows, hilite, nation, companyName, cityName) {
    const A = U.grandArt, { P, poly, line, facef, visible, depth, wallText, shadowOf } = H;
    const d = A.design(b, nation), K = A.KIND[b.k] || A.KIND.hall, F = FLAV[d.style] || {}, wall = A.WALLS[d.walls].c, cls = d.ornament === "classical";
    const RED = "#9b2a24", GL = "#4f5b63", cc = H.company && /^#[0-9a-f]{6}$/i.test(H.company) ? H.company : RED;
    const rcBase = d.roof === "flat" ? shade(wall, 0.93) : (d.roof === "curved" && F.roofCol) || A.ROOFS[d.roof].c, rc = hilite ? shade(rcBase, 1.15) : rcBase;
    const set = new Set(b.cells), cs = b.cells.map(unkey), key = (i, j) => i + "," + j;
    const n = d.storeys, h = K.h, Pl = F.plinth ?? 0.8, frz = F.brackets ? 1.7 : d.sign && !F.plaque ? 2.3 : 1.0, cor = cls ? 1.0 : 0.6, E0 = Pl + n * h + frz + cor, BAY = F.bay || 4.2;
    // The composition, in whole cells: the tower's columns make the centre; end columns make pavilions on long fronts.
    const frontJ = {}; for (const [i, j] of cs) frontJ[i] = Math.min(frontJ[i] ?? 1e9, j);
    const minJ = Math.min(...Object.values(frontJ)), cols = Object.keys(frontJ).map(Number).sort((a, c) => a - c);
    const runs = []; for (const i of cols) { if (frontJ[i] !== minJ) continue; const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); }
    const main = runs.reduce((a, r) => (r[1] - r[0] > a[1] - a[0] ? r : a), runs[0]), RL = main[1] - main[0] + 1;
    const tw = d.tower !== "none" && K.tower ? A.towerCells(b) : [];
    const twI = tw.length ? [Math.min(...tw.map(c => c[0])), Math.max(...tw.map(c => c[0]))] : null;
    const cen = K.tower && RL >= 3 ? (twI || [main[0] + Math.floor((RL - 1) / 2), main[0] + Math.floor((RL - 1) / 2)]) : null;
    const pav = F.pav && cen && cen[0] - main[0] >= 3 && main[1] - cen[1] >= 3;
    const up = F.centreUp ?? (F.attic ? 0.55 : 0.5), cenUp = up >= 1 ? Math.round(up) * h : h * 0.55, pavUp = F.attic ? h * 0.55 : 0;
    const roleOf = (i, j) => { if (i < main[0] || i > main[1]) return "back"; if (cen && i >= cen[0] && i <= cen[1]) return "centre"; if (pav && (i === main[0] || i === main[1])) return "pav" + i; return "wing"; };
    const eaveOfRole = r => r === "centre" ? E0 + cenUp : r.startsWith("pav") ? E0 + pavUp : E0;
    const groups = new Map(); for (const k of b.cells) { const [i, j] = unkey(k), r = roleOf(i, j); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(k); }
    const hms = new Map([...groups].map(([r, ks]) => [r, A.heightMap({ cells: ks }, d.roof)]));
    const cellRole = k => roleOf(...unkey(k)), cellEave = k => eaveOfRole(cellRole(k));
    const exm = cen ? (cen[0] + cen[1] + 1) * 5 : (main[0] + main[1] + 1) * 5, fy = minJ * 10;
    const hasEnt = K.tower && d.entrance !== "plain" || K.tower, ew = d.entrance === "portico" ? 12 : d.entrance === "canopy" ? 13 : d.entrance === "arch" ? 7 : 4;
    const wp = (p0, p1, t, z) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, z];
    const glassF = f => shade(GL, 0.8 + 0.35 * (f - 0.74));

    // A wall face: plinth, floors of windows, ornament, frieze and cornice, from z0 (where a lower neighbour's roof
    // meets it) up to the eave.
    function face(p0, p1, f, z0, eave, role, front) {
      const out = [], tone = role === "centre" || role.startsWith("pav") ? 1.03 : 1, wc = shade(wall, f * tone), g2 = glassF(f), storeys = n + (role === "centre" && up >= 1 ? Math.round(up) : 0);
      const wt = Pl + storeys * h, fr0 = eave - frz - cor;
      out.push(poly([[...p0, z0], [...p1, z0], [...p1, eave], [...p0, eave]], wc, wc, 0.5));
      if (z0 < 0.1) out.push(poly([[...p0, 0], [...p1, 0], [...p1, Pl], [...p0, Pl]], shade(wc, F.platform ? 1.08 : 0.86)));
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), nb = Math.max(1, Math.round(L / BAY)), bw = 1 / nb;
      const midx = (p0[0] + p1[0]) / 2;
      for (let s = 0; s < storeys; s++) {
        const zf = Pl + s * h; if (zf < z0 - 0.1) continue;
        const ground = s === 0, piano = cls && s === 1 && storeys >= 3, top = s === storeys - 1 && cls && storeys >= 3;
        if (s > 0 && (cls || F.band || d.ornament === "brick")) out.push(line(wp(p0, p1, 0, zf), wp(p0, p1, 1, zf), F.band || shade(wc, d.ornament === "brick" ? 0.75 : 1.12), F.chhajja ? 1.6 : 1));
        if (d.windows === "bands") { if (!(ground && front && role === "centre")) { const zb = zf + h * 0.3, wh = Math.min(1.9, h * 0.4); out.push(poly([wp(p0, p1, 0.03, zb), wp(p0, p1, 0.97, zb), wp(p0, p1, 0.97, zb + wh), wp(p0, p1, 0.03, zb + wh)], g2), line(wp(p0, p1, 0.03, zb), wp(p0, p1, 0.97, zb), shade(wc, 1.12), 0.8)); for (let t = 0.15; t < 0.95; t += 0.12) out.push(line(wp(p0, p1, t, zb), wp(p0, p1, t, zb + wh), "#e2dbca", 0.35)); } continue; }
        if (d.windows === "strips") { if (s === 0) for (let k = 0; k < nb; k++) { const t = (k + 0.5) * bw, w2 = Math.min(0.18, bw * 0.4); if (front && role === "centre" && Math.abs(wp(p0, p1, t, 0)[0] - exm) < ew / 2 + 1) continue; out.push(poly([wp(p0, p1, t - w2 / 2, Pl + h * 0.25), wp(p0, p1, t + w2 / 2, Pl + h * 0.25), wp(p0, p1, t + w2 / 2, wt - h * 0.15), wp(p0, p1, t - w2 / 2, wt - h * 0.15)], g2)); for (let q = 1; q < storeys; q++) out.push(line(wp(p0, p1, t - w2 / 2, Pl + q * h), wp(p0, p1, t + w2 / 2, Pl + q * h), shade(wc, 0.85), 1.4)); } continue; }
        for (let k = 0; k < nb; k++) {
          const t = (k + 0.5) * bw, at = wp(p0, p1, t, 0);
          if (ground && front && hasEnt && role === "centre" && Math.abs(at[0] - exm) < ew / 2 + 0.5) continue;
          if (ground && d.ornament === "arcade") { const w2 = bw * 0.36, zt = zf + h * 0.86; out.push(poly([wp(p0, p1, t - w2, 0.2), wp(p0, p1, t + w2, 0.2), wp(p0, p1, t + w2, zt - w2 * L * 0.9), wp(p0, p1, t + w2 * 0.6, zt - w2 * L * 0.25), wp(p0, p1, t, zt), wp(p0, p1, t - w2 * 0.6, zt - w2 * L * 0.25), wp(p0, p1, t - w2, zt - w2 * L * 0.9)], shade(g2, 0.6), shade(wc, 1.12), 0.6)); continue; }
          if (d.windows === "goods") { if (ground) { if (k % 2 === 0) out.push(poly([wp(p0, p1, t - bw * 0.38, 0.1), wp(p0, p1, t + bw * 0.38, 0.1), wp(p0, p1, t + bw * 0.38, Math.min(5.5, h * 0.7)), wp(p0, p1, t - bw * 0.38, Math.min(5.5, h * 0.7))], "#7d6a55", INK, 0.4)); continue; } }
          const w2 = Math.min(bw * (F.vertical ? 0.18 : 0.21), 1.15 / L), wh = h * (ground ? 0.5 : piano ? 0.58 : top ? 0.38 : 0.48), zb = zf + (h - wh) * 0.45;
          const kind = d.windows === "goods" || top || piano && d.windows === "punched" ? "rect" : d.windows;
          const apex = kind === "arched" ? [wp(p0, p1, t + w2 * 0.7, zb + wh + w2 * L * 0.25), wp(p0, p1, t, zb + wh + w2 * L * 0.45), wp(p0, p1, t - w2 * 0.7, zb + wh + w2 * L * 0.25)] : kind === "pointed" ? [wp(p0, p1, t, zb + wh + w2 * L * 0.8)] : [];
          out.push(poly([wp(p0, p1, t - w2, zb), wp(p0, p1, t + w2, zb), wp(p0, p1, t + w2, zb + wh), ...apex, wp(p0, p1, t - w2, zb + wh)], g2, F.chinese ? RED : null, F.chinese ? 0.7 : 0));
          out.push(line(wp(p0, p1, t - w2 * 1.3, zb - 0.1), wp(p0, p1, t + w2 * 1.3, zb - 0.1), shade(wc, 1.16), 0.7));
          if (piano || (cls && kind === "rect" && !top)) out.push(line(wp(p0, p1, t - w2 * 1.4, zb + wh + 0.45 + (kind === "rect" ? 0 : w2 * L * 0.5)), wp(p0, p1, t + w2 * 1.4, zb + wh + 0.45 + (kind === "rect" ? 0 : w2 * L * 0.5)), shade(wc, 1.16), 1.1));
        }
      }
      // bay lines: red columns, deco piers, pilasters on the grand blocks
      for (let k = 0; k <= nb; k++) { const t = k * bw;
        if (d.ornament === "oriental") out.push(line(wp(p0, p1, t, Math.max(z0, 0.1)), wp(p0, p1, t, wt), RED, 1.5));
        if (d.ornament === "deco" || F.piers) out.push(line(wp(p0, p1, t, Math.max(z0, Pl)), wp(p0, p1, t, eave + (d.roof === "flat" && d.ornament === "deco" ? 1.3 : 0)), shade(wc, 1.12), 1.7));
        if (F.pointedPiers) out.push(line(wp(p0, p1, t, Math.max(z0, Pl)), wp(p0, p1, t, eave + 2.2), shade(wc, 0.86), 1.5));
        if (cls && role !== "wing" && role !== "back") out.push(line(wp(p0, p1, t, Math.max(z0, F.rustic ? Pl + h : Pl)), wp(p0, p1, t, wt), shade(wc, 1.12), 1.5));
      }
      if (d.ornament === "verandah") for (let s = 0; s < storeys; s++) { const zf = Pl + s * h; if (zf < z0) continue; out.push(line(wp(p0, p1, 0, zf + h - 0.3), wp(p0, p1, 1, zf + h - 0.3), "#f6f1e3", 1.3), line(wp(p0, p1, 0, zf + 0.9), wp(p0, p1, 1, zf + 0.9), "#f6f1e3", 0.7)); for (let t = 0; t <= 1.001; t += 0.2) out.push(line(wp(p0, p1, t, zf), wp(p0, p1, t, zf + h - 0.3), "#f6f1e3", 0.9)); }
      // frieze, brackets, cornice
      if (fr0 >= z0) {
        if (F.brackets) out.push(poly([wp(p0, p1, 0, fr0), wp(p0, p1, 1, fr0), wp(p0, p1, 1, fr0 + 0.8), wp(p0, p1, 0, fr0 + 0.8)], "#3b6b73"), poly([wp(p0, p1, 0, fr0 + 0.8), wp(p0, p1, 1, fr0 + 0.8), wp(p0, p1, 1, eave), wp(p0, p1, 0, eave)], "#8a3a2c"));
        else out.push(poly([wp(p0, p1, 0, fr0), wp(p0, p1, 1, fr0), wp(p0, p1, 1, eave - cor), wp(p0, p1, 0, eave - cor)], shade(wc, 1.04)), poly([wp(p0, p1, 0, eave - cor), wp(p0, p1, 1, eave - cor), wp(p0, p1, 1, eave), wp(p0, p1, 0, eave)], shade(wc, 1.12)), line(wp(p0, p1, 0, eave - cor), wp(p0, p1, 1, eave - cor), "rgba(45,32,20,0.45)", 0.9));
      }
      out.push(line([...p0, eave], [...p1, eave], INK, 0.8), line([...p0, z0], [...p1, z0], INK, 0.5));
      return out.join("");
    }
    // Everything a flat roof carries along its edge: merlons, balustrades, parapets.
    function parapetEdge(p0, p1, eave) {
      const out = [];
      if (F.merlons) { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); for (let t = 0.04; t < 1; t += 1.3 / L) out.push(poly([wp(p0, p1, t, eave), wp(p0, p1, t + 0.7 / L, eave), wp(p0, p1, t + 0.7 / L, eave + 1.1), wp(p0, p1, t, eave + 1.1)], shade(wall, 1.04), INK, 0.3)); }
      else if (cls) { out.push(poly([[...p0, eave], [...p1, eave], [...p1, eave + 1.1], [...p0, eave + 1.1]], shade(wall, 1.02), INK, 0.4)); const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); for (let t = 0.05; t < 1; t += 0.8 / L) out.push(line(wp(p0, p1, t, eave + 0.2), wp(p0, p1, t, eave + 0.9), shade(wall, 0.8), 0.45)); }
      else out.push(poly([[...p0, eave], [...p1, eave], [...p1, eave + 0.8], [...p0, eave + 0.8]], shade(wall, 1.06), INK, 0.4));
      return out.join("");
    }
    // The cells: walls, then the roof in triangles on its five-metre grid.
    for (const k of b.cells) {
      const [i, j] = unkey(k), x = i * 10, y = j * 10, svg = [], role = cellRole(k), eave = cellEave(k), hm = hms.get(role);
      const edges = [[[x, y], [x + 10, y], [0, -1], key(i, j - 1)], [[x + 10, y], [x + 10, y + 10], [1, 0], key(i + 1, j)], [[x + 10, y + 10], [x, y + 10], [0, 1], key(i, j + 1)], [[x, y + 10], [x, y], [-1, 0], key(i - 1, j)]];
      for (const [p0, p1, nn, nb] of edges) {
        if (!visible(...nn)) continue;
        let z0 = 0; if (set.has(nb)) { const ne = cellEave(nb); if (ne >= eave - 0.01) continue; z0 = ne; }
        svg.push(face(p0, p1, facef(...nn), z0, eave, role, nn[1] === -1 && j === minJ));
      }
      if (d.roof === "flat") { svg.push(poly([[x, y, eave], [x + 10, y, eave], [x + 10, y + 10, eave], [x, y + 10, eave]], rc, rc, 0.6)); for (const [p0, p1, , nb] of edges) if (!set.has(nb) || cellEave(nb) < eave - 0.01) svg.push(parapetEdge(p0, p1, eave)); }
      else {
        const tris = [];
        for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) {
          const xa = x + a * 5, ya = y + c * 5, q = [[xa, ya], [xa + 5, ya], [xa + 5, ya + 5], [xa, ya + 5]].map(p => [p[0], p[1], eave + hm(p[0], p[1])]);
          const along02 = q[0][2] + q[2][2] >= q[1][2] + q[3][2];
          for (const tri of along02 ? [[q[0], q[1], q[2]], [q[0], q[2], q[3]]] : [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]) {
            const u = tri[1].map((v, m) => v - tri[0][m]), v2 = tri[2].map((v, m) => v - tri[0][m]);
            let nx = u[1] * v2[2] - u[2] * v2[1], ny = u[2] * v2[0] - u[0] * v2[2], nz = u[0] * v2[1] - u[1] * v2[0]; const m = Math.hypot(nx, ny, nz) || 1; nx /= m; ny /= m; nz /= m; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
            const lit = 0.8 + 0.32 * (nx * -0.42 + ny * -0.78 + nz * 0.47) - 0.1;
            tris.push([depth((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3), poly(tri, shade(rc, lit), shade(rc, lit), 0.5)]);
          }
        }
        tris.sort((p, q) => q[0] - p[0]); svg.push(...tris.map(t => t[1]));
      }
      for (const [p0, p1, , nb] of edges) if (!set.has(nb)) svg.push(line([...p0, eave], [...p1, eave], hilite ? "#c9a65b" : INK, hilite ? 2 : 0.8));
      objs.push([depth(x + 5, y + 5), svg.join("")]);
      shadows.push(shadowOf(x, y, x + 10, y + 10, eave + hm(x + 5, y + 5)));
    }

    // Small solids for towers and porches ------------------------------------------------------------------------------
    const sv = [];
    const box = (x0, y0, x1, y1, z0, z1, col, top) => {
      for (const [p0, p1, nn] of [[[x0, y0], [x1, y0], [0, -1]], [[x1, y0], [x1, y1], [1, 0]], [[x0, y1], [x0, y0], [-1, 0]]]) if (visible(...nn)) sv.push(poly([[...p0, z0], [...p1, z0], [...p1, z1], [...p0, z1]], shade(col, facef(...nn)), INK, 0.6));
      if (top !== false) sv.push(poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top || shade(col, 0.95), INK, 0.6));
    };
    // A hipped roof over a rectangle, with eaves that turn up at the corners when the roof is East Asian.
    const hipBox = (x0, y0, x1, y1, z, rise, col, ov, lift) => {
      const X0 = x0 - ov, Y0 = y0 - ov, X1 = x1 + ov, Y1 = y1 + ov, r = Math.min(x1 - x0, y1 - y0) / 2, L = lift || 0;
      const c = [[X0, Y0, z + L], [X1, Y0, z + L], [X1, Y1, z + L], [X0, Y1, z + L]], m = [(x0 + x1) / 2, (y0 + y1) / 2], rx = Math.max(0, (x1 - x0) / 2 - r);
      const ra = [m[0] - rx, m[1], z + rise], rb = [m[0] + rx, m[1], z + rise], mid = [[X0 + (X1 - X0) / 2, Y0, z + L * 0.2], [X1, Y0 + (Y1 - Y0) / 2, z + L * 0.2], [X0 + (X1 - X0) / 2, Y1, z + L * 0.2], [X0, Y0 + (Y1 - Y0) / 2, z + L * 0.2]];
      const faces = [[[c[3], mid[2], c[2], rb, ra], 0.82], [[c[0], c[3], ra], 1.12], [[c[1], c[2], rb], 0.78], [[c[0], mid[0], c[1], rb, ra], 1.0]];
      for (const [pp, f] of faces) sv.push(poly(pp, shade(col, f), INK, 0.6));
      if (L) { sv.push(line(ra, rb, shade(col, 0.6), 2.2)); for (const e of [ra, rb]) sv.push(line(e, [e[0], e[1], e[2] + 1.8], shade(col, 0.55), 1.6)); }
    };
    const dome = (cx, cy, zc, r, col, kind) => {
      const nS = 16, prof = Array.from({ length: nS + 1 }, (_, k) => { const t = k / nS; return kind === "onion" ? [r * Math.sin(Math.PI * t) * (1 + 0.35 * Math.sin(Math.PI * t * 0.9)) * (t < 0.95 ? 1 : 0.3), zc + r * 2.3 * t] : kind === "bulb" ? [r * (1 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * Math.pow(Math.max(0, 1 - t), 0.62), zc + r * 1.35 * t] : [r * Math.cos(t * Math.PI / 2), zc + r * 0.95 * Math.sin(t * Math.PI / 2)]; });
      const left = prof.map(([rr, z]) => { const c = P(cx, cy, z); return [c[0] - rr, c[1]]; }), right = prof.map(([rr, z]) => { const c = P(cx, cy, z); return [c[0] + rr, c[1]]; }).reverse(), gid = "bd" + b.id + "_" + Math.round(cx) + "_" + Math.round(zc);
      const c0 = P(cx, cy, zc), rr0 = prof[0][0]; sv.push(`<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${shade(col, 1.15)}"/><stop offset="0.4" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, 0.68)}"/></linearGradient></defs><ellipse cx="${c0[0].toFixed(1)}" cy="${c0[1].toFixed(1)}" rx="${rr0.toFixed(1)}" ry="${(rr0 * 0.55).toFixed(1)}" fill="url(#${gid})" stroke="${INK}" stroke-width="0.7"/><polygon points="${left.concat(right).map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="url(#${gid})" stroke="none"/><path d="M${(c0[0] - rr0).toFixed(1)},${c0[1].toFixed(1)} ${left.slice(1).map(p => "L" + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")} ${right.slice(0, -1).map(p => "L" + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="${INK}" stroke-width="0.7"/>`);
      const ztop = kind === "onion" ? zc + r * 2.3 : kind === "bulb" ? zc + r * 1.35 : zc + r * 0.95; return ztop;
    };
    const cyl = (cx, cy, r, z0, z1, col, wins) => {
      const a = P(cx, cy, z0), t = P(cx, cy, z1), ry = r * 0.55, gid = "cy" + b.id + "_" + Math.round(cx) + "_" + Math.round(z0);
      sv.push(`<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${shade(col, 1.1)}"/><stop offset="0.45" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, 0.72)}"/></linearGradient></defs><path d="M${(t[0] - r).toFixed(1)},${t[1].toFixed(1)} L${(a[0] - r).toFixed(1)},${a[1].toFixed(1)} A${r.toFixed(1)},${ry.toFixed(1)} 0 0 0 ${(a[0] + r).toFixed(1)},${a[1].toFixed(1)} L${(t[0] + r).toFixed(1)},${t[1].toFixed(1)} Z" fill="url(#${gid})" stroke="${INK}" stroke-width="0.6"/>`);
      if (wins) for (const th of [-0.95, -0.45, 0.05, 0.55, 1.0]) { const c = Math.cos(th), sx = a[0] + r * Math.sin(th), ww = r * 0.13 * c, y0 = P(cx, cy, z0 + (z1 - z0) * 0.22)[1] + ry * c, y1 = P(cx, cy, z0 + (z1 - z0) * 0.78)[1] + ry * c; if (ww > 0.2) sv.push(`<path d="M${(sx - ww).toFixed(1)},${y0.toFixed(1)} L${(sx - ww).toFixed(1)},${y1.toFixed(1)} Q${sx.toFixed(1)},${(y1 - ww * 1.6).toFixed(1)} ${(sx + ww).toFixed(1)},${y1.toFixed(1)} L${(sx + ww).toFixed(1)},${y0.toFixed(1)} Z" fill="${shade(GL, 0.85 + 0.2 * (1 - Math.abs(th - 0.2)))}"/>`); }
      sv.push(`<ellipse cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" rx="${r.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${shade(col, 1.04)}" stroke="${INK}" stroke-width="0.6"/>`);
    };
    const mast = (x, y, z, hgt, col) => sv.push(line([x, y, z], [x, y, z + hgt], col || INK, 0.9));
    const kiosk = (x, y, z, w) => { for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1]]) sv.push(line([x + dx * w * 0.35, y + dy * w * 0.35, z], [x + dx * w * 0.35, y + dy * w * 0.35, z + w * 0.8], shade(F.band || wall, 0.9), 1.1)); box(x - w * 0.5, y - w * 0.5, x + w * 0.5, y + w * 0.5, z + w * 0.8, z + w * 0.95, F.band || wall); dome(x, y, z + w * 0.95, w * 0.42, F.band || wall); };

    // The tower, standing on the centre's roof ---------------------------------------------------------------------------
    let flagAt = null;
    const cE = E0 + (cen ? cenUp : 0);
    if (tw.length) {
      const x0 = Math.min(...tw.map(c => c[0])) * 10, y0 = Math.min(...tw.map(c => c[1])) * 10, w = (Math.max(...tw.map(c => c[0])) + 1) * 10 - x0, cx = x0 + w / 2, cy = y0 + w / 2;
      const roofRise = d.roof === "flat" ? 0 : Math.min(w / 2, 8) * (d.roof === "low" ? 0.3 : d.roof === "steep" ? 1 : 0.5);
      const sq = (s2, z0, z1, col, top) => box(cx - s2 / 2, cy - s2 / 2, cx + s2 / 2, cy + s2 / 2, z0, z1, col || shade(wall, 1.03), top);
      const winsOn = (s2, z0, hh, k2, kind) => { for (let q = 0; q < k2; q++) { const t = (q + 0.5) / k2 - 0.5, wx = s2 * 0.12; const pts = [[cx + t * s2 - wx, cy - s2 / 2 - 0.05, z0], [cx + t * s2 + wx, cy - s2 / 2 - 0.05, z0], [cx + t * s2 + wx, cy - s2 / 2 - 0.05, z0 + hh], ...(kind === "rect" ? [] : [[cx + t * s2, cy - s2 / 2 - 0.05, z0 + hh + wx * 0.6]]), [cx + t * s2 - wx, cy - s2 / 2 - 0.05, z0 + hh]]; sv.push(poly(pts, shade(GL, 1.05))); const pr = [[cx + s2 / 2 + 0.05, cy + t * s2 - wx, z0], [cx + s2 / 2 + 0.05, cy + t * s2 + wx, z0], [cx + s2 / 2 + 0.05, cy + t * s2 + wx, z0 + hh], ...(kind === "rect" ? [] : [[cx + s2 / 2 + 0.05, cy + t * s2, z0 + hh + wx * 0.6]]), [cx + s2 / 2 + 0.05, cy + t * s2 - wx, z0 + hh]]; sv.push(poly(pr, shade(GL, 0.9))); } };
      const base = cE + roofRise * 0.5;
      if (d.tower === "dome") {
        const dw = Math.min(w * 0.75, 16); cyl(cx, cy, dw / 2, cE, cE + roofRise + 4.5, shade(wall, 1.03), true);
        const z0 = cE + roofRise + 4.5;
        if (F.chhatri) { const zt = dome(cx, cy, z0, dw * 0.5, "#efe6d2", "bulb"); mast(cx, cy, zt, 2.4, "#b48a3c"); flagAt = null; if (cen) for (const [kx, ky] of [[cen[0] * 10 + 2, fy + 2], [(cen[1] + 1) * 10 - 2, fy + 2]]) kiosk(kx, ky, cE + (d.roof === "flat" ? 1 : roofRise * 0.3), 2.6); }
        else { const zt = dome(cx, cy, z0, dw * 0.48, "#86ab9a"); cyl(cx, cy, dw * 0.09, zt - 0.4, zt + 2.2, wall); const z2 = dome(cx, cy, zt + 2.2, dw * 0.1, "#86ab9a"); mast(cx, cy, z2, 1.6); }
      }
      if (d.tower === "clock" || d.tower === "spire" || d.tower === "belfry" || d.tower === "onion") {
        const s2 = Math.min(w, d.tower === "clock" ? 9 : 8); let z = base + 7;
        sq(s2, cE, z); winsOn(s2, base + 1.5, 4, 1, "arch");
        if (d.tower === "clock") { sq(s2 * 0.94, z, z + 5); const ring = fn => Array.from({ length: 24 }, (_, q) => fn(Math.cos(q * Math.PI / 12), Math.sin(q * Math.PI / 12))), cr2 = Math.min(s2 * 0.27, 1.9); sv.push(poly(ring((c2, s3) => [cx + c2 * cr2, cy - s2 * 0.47 - 0.08, z + 2.5 + s3 * cr2]), "#f4efe1", INK, 0.6), poly(ring((c2, s3) => [cx + s2 * 0.47 + 0.08, cy + c2 * cr2, z + 2.5 + s3 * cr2]), "#e2dccb", INK, 0.5), line([cx, cy - s2 * 0.47 - 0.1, z + 2.5], [cx, cy - s2 * 0.47 - 0.1, z + 2.5 + cr2 * 0.75], INK, 0.8), line([cx, cy - s2 * 0.47 - 0.1, z + 2.5], [cx + cr2 * 0.5, cy - s2 * 0.47 - 0.1, z + 2.5], INK, 0.8)); z += 5;
          if (F.cap === "cupola") { sq(s2 * 0.55, z, z + 3, wall); const zt = dome(cx, cy, z + 3, s2 * 0.3, "#6d737a"); mast(cx, cy, zt, 1.2); flagAt = [cx, cy, zt + 1]; }
          else if (F.cap === "mansard") { hipBox(cx - s2 / 2, cy - s2 / 2, cx + s2 / 2, cy + s2 / 2, z, 5, "#5d636b", 0.2); flagAt = [cx, cy, z + 5]; }
          else if (F.cap === "flat") { sq(s2 * 1.02, z, z + 0.8, shade(wall, 1.06)); flagAt = [cx, cy, z + 0.8]; }
          else { hipBox(cx - s2 / 2, cy - s2 / 2, cx + s2 / 2, cy + s2 / 2, z, s2 * 0.7, rcBase === shade(wall, 0.93) ? "#6d737a" : rcBase, 0.3); flagAt = [cx, cy, z + s2 * 0.7]; } }
        if (d.tower === "spire") { sq(s2 * 0.92, z, z + 4.5); winsOn(s2 * 0.92, z + 0.8, 2.6, 2, "pointed"); z += 4.5; hipBox(cx - s2 * 0.42, cy - s2 * 0.42, cx + s2 * 0.42, cy + s2 * 0.42, z, s2 * 2.5, "#5d636b", 0); mast(cx, cy, z + s2 * 2.5, 1.6); }
        if (d.tower === "belfry") { sq(s2 * 0.92, z, z + 5); winsOn(s2 * 0.92, z + 1, 3, s2 > 7 ? 2 : 1, "arch"); z += 5; if (F.cap === "dome") { const zt = dome(cx, cy, z, s2 * 0.4, "#c87a4a"); mast(cx, cy, zt, 1.4); } else hipBox(cx - s2 * 0.46, cy - s2 * 0.46, cx + s2 * 0.46, cy + s2 * 0.46, z, s2 * 0.45, "#b8704a", 0.5); }
        if (d.tower === "onion") { sq(s2 * 0.7, z, z + 4); winsOn(s2 * 0.7, z + 0.8, 2.2, 2, "arch"); const zt = dome(cx, cy, z + 4, s2 * 0.42, "#4f8a6e", "onion"); mast(cx, cy, zt, 2.2, "#b48a3c"); }
      }
      if (d.tower === "stepped") { const s2 = Math.min(w + 2, 16); sq(s2, cE, base + 10); for (const t of [-0.3, -0.1, 0.1, 0.3]) { sv.push(line([cx + t * s2, cy - s2 / 2 - 0.05, base + 1], [cx + t * s2, cy - s2 / 2 - 0.05, base + 7.5], GL, 1.8)); sv.push(line([cx + s2 / 2 + 0.05, cy + t * s2, base + 1], [cx + s2 / 2 + 0.05, cy + t * s2, base + 7.5], shade(GL, 0.9), 1.6)); }
        { const cr2 = s2 * 0.1; sv.push(poly(Array.from({ length: 24 }, (_, q) => [cx + Math.cos(q * Math.PI / 12) * cr2, cy - s2 / 2 - 0.08, base + 8.6 + Math.sin(q * Math.PI / 12) * cr2]), "#f4efe1", INK, 0.5)); }
        sq(s2 * 0.82, base + 10, base + 13); sq(s2 * 0.58, base + 13, base + 15.6); sq(s2 * 0.34, base + 15.6, base + 17); flagAt = [cx, cy, base + 17]; }
      if (d.tower === "minaret" && cen) {
        const zt = dome(cx, cy, cE + 1.5, Math.min(w * 0.4, 8), "#86ab9a"); mast(cx, cy, zt, 1.6);
        for (const mx of [cen[0] * 10 + 1.6, (cen[1] + 1) * 10 - 1.6]) { const my = fy + 1.6; cyl(mx, my, 1.3, cE - 2, cE + 7, shade(wall, 1.04)); cyl(mx, my, 1.9, cE + 7, cE + 7.5, shade(wall, 1.08)); cyl(mx, my, 1.15, cE + 7.5, cE + 15, shade(wall, 1.04)); cyl(mx, my, 1.8, cE + 15, cE + 15.5, shade(wall, 1.08)); cyl(mx, my, 0.9, cE + 15.5, cE + 17.5, wall); const zt = dome(mx, my, cE + 17.5, 1.1, "#86ab9a"); mast(mx, my, zt, 1); } }
      if (d.tower === "pagoda") {
        if (!F.chinese) { const s2 = Math.min(w + 1, 14); sq(s2, cE, base + h * 1.6, wall, false); winsOn(s2, base + 1, h * 1.6 - 2.5, 4, "rect"); const z = base + h * 1.6; hipBox(cx - s2 / 2, cy - s2 / 2, cx + s2 / 2, cy + s2 / 2, z, 2.4, rcBase, 2.2, 1.0); sq(s2 * 0.62, z + 1.8, z + 3.6, wall, false); hipBox(cx - s2 * 0.32, cy - s2 * 0.32, cx + s2 * 0.32, cy + s2 * 0.32, z + 3.6, 3.4, rcBase, 1.8, 0.9); }
      }
      objs.push([Math.min(...tw.map(c => depth(c[0] * 10 + 5, c[1] * 10 + 5))) - 0.5, sv.splice(0).join("")]);
      shadows.push(shadowOf(x0, y0, x0 + w, y0 + w, cE + 14));
    }
    // A Chinese centre block wears a second, higher roof.
    if (F.chinese && cen && d.roof === "curved") {
      const x0 = cen[0] * 10 + 2.5, x1 = (cen[1] + 1) * 10 - 2.5, ys = cs.filter(c => c[0] >= cen[0] && c[0] <= cen[1]).map(c => c[1]), y0 = Math.min(...ys) * 10 + 4, y1 = Math.min((Math.max(...ys) + 1) * 10 - 4, y0 + 14);
      const z = cE + 5.5; box(x0, y0, x1, y1, cE + 0.5, z - 0.8, shade(wall, 1.02), false); for (let x = x0 + 1.5; x < x1; x += 3) sv.push(line([x, y0 - 0.05, cE + 0.6], [x, y0 - 0.05, z - 0.8], RED, 1.4)); box(x0, y0, x1, y1, z - 0.8, z, "#3b6b73", false); hipBox(x0, y0, x1, y1, z, Math.min(x1 - x0, y1 - y0) * 0.4 + 2, rcBase, 2.6, 1.3);
      objs.push([depth((x0 + x1) / 2, fy) - 1, sv.splice(0).join("")]);
    }

    // The entrance ---------------------------------------------------------------------------------------------------
    if (K.tower) {
      const ex = exm, y = fy;
      if (d.entrance === "portico" && F.chinese) { for (const dx of [-5, -1.7, 1.7, 5]) sv.push(line([ex + dx, y - 4, 0], [ex + dx, y - 4, Pl + h], RED, 2)); box(ex - 6, y - 4.6, ex + 6, y, Pl + h, Pl + h + 0.9, "#3b6b73", false); hipBox(ex - 6, y - 4.6, ex + 6, y, Pl + h + 0.9, 2.6, rcBase, 1.6, 0.8); }
      else if (d.entrance === "portico" && (F.crown || F.piers)) { for (const dx of [-6, -2, 2, 6]) box(ex + dx - 0.7, y - 5, ex + dx + 0.7, y - 3.6, 0, Pl + h * 0.95, shade(wall, 1.05), false); box(ex - 7, y - 5.2, ex + 7, y, Pl + h * 0.95, Pl + h * 0.95 + 1.3, shade(wall, 1.08)); }
      else if (d.entrance === "portico") { const ph = Pl + Math.min(2, n) * h; box(ex - 7.2, y - 5.6, ex + 7.2, y, 0, 0.35, "#e2dbc9"); box(ex - 6.6, y - 5, ex + 6.6, y, 0.35, 0.7, "#e8e1cf"); for (const dx of [-5.4, -1.8, 1.8, 5.4]) sv.push(line([ex + dx, y - 4, 0.3], [ex + dx, y - 4, ph], "#f4efe1", 2.4), line([ex + dx + 0.5, y - 4, 0.3], [ex + dx + 0.5, y - 4, ph], "rgba(45,32,20,0.25)", 0.8)); box(ex - 6.5, y - 4.6, ex + 6.5, y, ph, ph + 1.3, shade(wall, 1.06)); sv.push(poly([[ex - 6.5, y - 4.6, ph + 1.3], [ex - 6.5, y, ph + 1.3], [ex, y, ph + 4], [ex, y - 4.6, ph + 4]], shade(rcBase, 1.05), INK, 0.5), poly([[ex + 6.5, y - 4.6, ph + 1.3], [ex + 6.5, y, ph + 1.3], [ex, y, ph + 4], [ex, y - 4.6, ph + 4]], shade(rcBase, 0.85), INK, 0.5), poly([[ex - 6.5, y - 4.6, ph + 1.3], [ex + 6.5, y - 4.6, ph + 1.3], [ex, y - 4.6, ph + 4]], shade(wall, 1.1), INK, 0.6)); }
      else if (d.entrance === "canopy") { sv.push(poly([[ex - 7, y - 4, 4.4], [ex + 7, y - 4, 4.4], [ex + 7, y, 4.4], [ex - 7, y, 4.4]], "#f1ead9", INK, 0.5), poly([[ex - 7, y - 4, 3.7], [ex + 7, y - 4, 3.7], [ex + 7, y - 4, 4.4], [ex - 7, y - 4, 4.4]], cc, INK, 0.4)); for (let q = -1; q <= 1; q++) sv.push(poly([[ex + q * 3 - 1, y - 0.05, 0.3], [ex + q * 3 + 1, y - 0.05, 0.3], [ex + q * 3 + 1, y - 0.05, 3.3], [ex + q * 3 - 1, y - 0.05, 3.3]], "#5d4630")); }
      else if (d.entrance === "arch") { const ah = Pl + Math.min(1.6, n) * h; sv.push(poly([[ex - 4.4, y - 0.05, 0], [ex + 4.4, y - 0.05, 0], [ex + 4.4, y - 0.05, ah - 3], [ex + 3, y - 0.05, ah - 0.6], [ex, y - 0.05, ah + 0.6], [ex - 3, y - 0.05, ah - 0.6], [ex - 4.4, y - 0.05, ah - 3]], shade(wall, 1.1), INK, 0.6), poly([[ex - 3.1, y - 0.1, 0], [ex + 3.1, y - 0.1, 0], [ex + 3.1, y - 0.1, ah - 3.6], [ex + 2.1, y - 0.1, ah - 1.6], [ex, y - 0.1, ah - 0.9], [ex - 2.1, y - 0.1, ah - 1.6], [ex - 3.1, y - 0.1, ah - 3.6]], shade(GL, 0.75), INK, 0.5)); }
      else sv.push(poly([[ex - 2, y - 0.05, 0.3], [ex + 2, y - 0.05, 0.3], [ex + 2, y - 0.05, 3.6], [ex - 2, y - 0.05, 3.6]], "#5d4630", INK, 0.5));
      if (F.platform) sv.push(poly([[ex - 7, y - 6, 0], [ex + 7, y - 6, 0], [ex + 7, y, Pl], [ex - 7, y, Pl]], "#e6dfcd", INK, 0.4));
      if (sv.length) objs.push([depth(ex, y) - 2, sv.splice(0).join("")]);
    }
    // Lettering on the wings' frieze, or on a plaque.
    const text = d.sign ? A.signText(b, d, companyName, cityName) : "";
    if (text) {
      if (F.plaque && cen) { const T = text.toUpperCase(), pw = Math.min((cen[1] - cen[0] + 1) * 10 - 3, T.length * 0.8 + 2), z = Pl + h * 1.05 + 4.2; objs.push([depth(exm, fy) - 3, poly([[exm - pw / 2, fy - 0.15, z], [exm + pw / 2, fy - 0.15, z], [exm + pw / 2, fy - 0.15, z + 1.8], [exm - pw / 2, fy - 0.15, z + 1.8]], "#2d3f4a", "#c9a45a", 0.8) + wallText(T, exm, fy - 0.2, z + 0.55, Math.min(1.1, (pw - 1) / (T.length * 0.75)), "#e6c77a")]); }
      else for (const [r, t] of A.signParts(main, cen && K.tower ? cen : null, text)) {
        const len = (r[1] - r[0] + 1) * 10 - (pav ? 0 : 0), size = Math.min(frz * 0.7, len / Math.max(5, t.length * 0.92));
        objs.push([depth((r[0] + r[1] + 1) * 5, fy) - 3, wallText(t, (r[0] + r[1] + 1) * 5, fy - 0.1, Pl + n * h + frz * 0.5 + size * 0.35, size, shade(wall, 0.4))]);
      }
    }
    // Flags.
    if (d.flags) {
      const at = flagAt ? [flagAt] : pav ? [main[0], main[1]].map(i => [i * 10 + 5, fy + 5, E0 + pavUp + (d.roof === "flat" ? 1 : hms.get("pav" + i)(i * 10 + 5, fy + 5))]) : [[main[0] * 10 + 2, fy + 2, E0 + 1], [(main[1] + 1) * 10 - 2, fy + 2, E0 + 1]];
      objs.push([depth(exm, fy) - 4, at.map(([fx, fy2, fz]) => line([fx, fy2, fz], [fx, fy2, fz + 7], INK, 0.9) + poly([[fx, fy2, fz + 7], [fx + 4.5, fy2, fz + 6.6], [fx + 4.5, fy2, fz + 4.6], [fx, fy2, fz + 5]], cc, INK, 0.3)).join("")]);
    }
  }

  U.facade = { FLAV, elevation, birdseye };
})(window.UpShip);
