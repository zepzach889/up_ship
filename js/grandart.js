// The buildings of a grand terminal: their design (style, walls, roof, windows, tower, entrance, ornament, lettering),
// drawn both in the bird's-eye view of the site and as a front elevation, the face the building shows the road.
window.UpShip = window.UpShip || {};
(function (U) {
  const INK = "#3a2f22", RED = "#9b2a24", GLASS = "#4f5b63";
  const WALLS = {
    render: { name: "White render", c: "#ece4d2" }, stone: { name: "Cream stone", c: "#e2d6bb" }, buff: { name: "Buff brick", c: "#d6bd96" },
    redbrick: { name: "Red brick", c: "#b5704f" }, darkbrick: { name: "Dark clinker brick", c: "#7f4a3a" }, ochre: { name: "Ochre stucco", c: "#dcb26e" },
    sandstone: { name: "Red sandstone", c: "#bf7d5c" }, granite: { name: "Grey stone", c: "#b9b4aa" }, timber: { name: "White timber and plaster", c: "#efe9dc" }
  };
  const ROOFS = { flat: { name: "Flat, with a parapet", c: null }, low: { name: "Low-pitched, in pantiles", c: "#b8704a" }, hipped: { name: "Hipped, in slate", c: "#6d737a" },
    steep: { name: "Steep, in tiles", c: "#9a5a40" }, mansard: { name: "Mansard, in slate", c: "#5d636b" }, curved: { name: "Curved eaves, glazed tiles", c: "#56786a" } };
  const WINDOWS = { bands: "Continuous bands", strips: "Tall glazed strips", punched: "Plain windows, in rows", arched: "Round-arched", pointed: "Pointed arches", goods: "Great goods doors" };
  const ORNAMENT = { plain: "None", classical: "Classical cornice and pilasters", deco: "Piers and chevrons", brick: "Brick bands and a stepped cornice", arcade: "Arcade along the ground floor", oriental: "Red columns and bracketed eaves", verandah: "Verandahs on every floor" };
  const TOWERS = { none: { name: "None", cost: 0 }, clock: { name: "Clock tower", cost: 15000 }, stepped: { name: "Stepped tower", cost: 18000 }, dome: { name: "Dome", cost: 25000 },
    spire: { name: "Spire", cost: 14000 }, onion: { name: "Onion dome", cost: 20000 }, minaret: { name: "Minaret", cost: 16000 }, belfry: { name: "Belfry", cost: 12000 }, pagoda: { name: "Tiered pagoda roof", cost: 22000 } };
  const ENTRANCES = { plain: { name: "Plain doors", cost: 0 }, canopy: { name: "Canopy over the doors", cost: 3000 }, portico: { name: "Portico with columns", cost: 9000 }, arch: { name: "Great arched doorway", cost: 5000 } };
  // Styles: a starting point for every choice, each of which can then be changed.
  const STYLES = {
    beaux: { name: "Beaux-Arts", walls: "stone", roof: "mansard", windows: "arched", ornament: "classical", tower: "dome", entrance: "portico" },
    deco: { name: "Art Deco", walls: "render", roof: "flat", windows: "bands", ornament: "deco", tower: "stepped", entrance: "canopy" },
    modern: { name: "Stripped Modern", walls: "render", roof: "flat", windows: "bands", ornament: "plain", tower: "none", entrance: "canopy" },
    germanbrick: { name: "German brick expressionism", walls: "darkbrick", roof: "flat", windows: "strips", ornament: "brick", tower: "stepped", entrance: "arch", nation: "germany" },
    edwardian: { name: "Edwardian baroque", walls: "redbrick", roof: "hipped", windows: "punched", ornament: "classical", tower: "clock", entrance: "portico", nation: "britain" },
    secondempire: { name: "Second Empire", walls: "stone", roof: "mansard", windows: "arched", ornament: "classical", tower: "clock", entrance: "arch", nation: "france" },
    novecento: { name: "Novecento", walls: "stone", roof: "flat", windows: "punched", ornament: "classical", tower: "clock", entrance: "portico", nation: "italy" },
    mission: { name: "Mission Revival", walls: "render", roof: "low", windows: "arched", ornament: "arcade", tower: "belfry", entrance: "arch", nation: "usa" },
    imperialcrown: { name: "Imperial Crown", walls: "granite", roof: "curved", windows: "punched", ornament: "plain", tower: "pagoda", entrance: "portico", nation: "japan" },
    northern: { name: "Northern gabled brick", walls: "redbrick", roof: "steep", windows: "punched", ornament: "brick", tower: "spire", entrance: "arch", region: "northern" },
    mediterranean: { name: "Mediterranean", walls: "render", roof: "low", windows: "arched", ornament: "arcade", tower: "belfry", entrance: "arch", region: "mediterranean" },
    islamic: { name: "Islamic revival", walls: "stone", roof: "flat", windows: "pointed", ornament: "arcade", tower: "minaret", entrance: "arch", region: "islamic" },
    indo: { name: "Indo-Saracenic", walls: "sandstone", roof: "flat", windows: "pointed", ornament: "arcade", tower: "dome", entrance: "arch", region: "indo" },
    chinese: { name: "Chinese palace", walls: "render", roof: "curved", windows: "punched", ornament: "oriental", tower: "pagoda", entrance: "portico", region: "chinese" },
    spanish: { name: "Spanish colonial", walls: "ochre", roof: "low", windows: "arched", ornament: "arcade", tower: "belfry", entrance: "arch", region: "spanish" },
    russian: { name: "Russian revival", walls: "redbrick", roof: "steep", windows: "arched", ornament: "brick", tower: "onion", entrance: "arch", region: "russian" },
    tropical: { name: "Tropical colonial", walls: "timber", roof: "hipped", windows: "punched", ornament: "verandah", tower: "none", entrance: "canopy", region: "tropical" },
    utility: { name: "Plain industrial", walls: "buff", roof: "low", windows: "goods", ornament: "plain", tower: "none", entrance: "plain" }
  };
  const PERIOD = ["beaux", "deco", "modern", "utility"];
  // The local style of a city, from its country (and, in Africa, how far south it lies).
  const MED = ["Spain", "Portugal", "Italy", "Greece"], NORTH = ["Germany", "United Kingdom", "Netherlands", "Belgium", "Denmark", "Sweden", "Norway", "Poland", "Irish Free State", "Switzerland", "Austria", "Czechoslovakia", "Hungary", "Romania", "France", "Newfoundland", "Canada"];
  const ISLAM = ["Egypt", "Libya", "Tunisia", "Algeria", "Morocco", "Turkey", "Syria", "Lebanon", "Palestine", "Iraq", "Persia", "Afghanistan", "Aden", "Sudan"];
  function regionalStyle(id) {
    const c = U.cityById[id]; if (!c) return null; const k = c.country;
    if (k === "Soviet Union") return "russian";
    if (MED.includes(k)) return "mediterranean";
    if (NORTH.includes(k)) return "northern";
    if (ISLAM.includes(k)) return "islamic";
    if (k === "British India" || k === "Ceylon" || k === "Burma") return "indo";
    if (k === "China" || k === "Hong Kong" || k === "Formosa" || k === "Korea") return "chinese";
    if (k === "Japan") return "imperialcrown";
    if (k === "United States" || k === "Territory of Hawaii") return "mission";
    if (c.region === "sa" || ["Mexico", "Cuba", "Panama Canal Zone", "Trinidad", "Philippine Islands"].includes(k)) return "spanish";
    return "tropical";
  }
  // The styles open to a company at a city: the period styles, its own nation's, and the local one.
  function styleChoices(state, id) {
    const nat = Object.keys(STYLES).find(k => STYLES[k].nation === state.company.nation), reg = regionalStyle(id);
    const out = [["Period", PERIOD]]; if (nat) out.push([`Your nation's`, [nat]]); if (reg && reg !== nat) out.push(["This part of the world", [reg]]);
    return out;
  }
  // Each kind of building: storeys it may have, storey height, the default, and whether a tower or entrance suits it.
  const KIND = {
    hall: { min: 1, max: 5, def: 3, h: 4.8, tower: true }, hotel: { min: 2, max: 8, def: 5, h: 3.8, tower: true }, restaurant: { min: 1, max: 2, def: 1, h: 6.5 },
    freight: { min: 1, max: 2, def: 1, h: 9 }, works: { min: 1, max: 2, def: 1, h: 8.5 }, station: { min: 1, max: 3, def: 2, h: 4.2, tower: true }, tram: { min: 1, max: 1, def: 1, h: 3.5 }
  };
  function defaultDesign(k, nation) {
    const st = k === "freight" || k === "works" ? "utility" : nation === "usa" ? "deco" : (Object.keys(STYLES).find(s => STYLES[s].nation === nation) || "deco");
    const S0 = STYLES[st], K = KIND[k] || KIND.hall;
    return { style: st, walls: S0.walls, roof: S0.roof, windows: k === "freight" || k === "works" ? "goods" : S0.windows, ornament: k === "hall" || k === "hotel" ? S0.ornament : "plain",
      tower: k === "hall" ? S0.tower : "none", entrance: k === "hall" || k === "hotel" || k === "station" ? S0.entrance : "plain", storeys: K.def, sign: k === "hall" || k === "hotel" || k === "freight", text: "", flags: k === "hall" };
  }
  const design = (b, nation) => b.design || defaultDesign(b.k, nation);
  function applyStyle(d, st, k) {
    const S0 = STYLES[st]; Object.assign(d, { style: st, walls: S0.walls, roof: S0.roof, windows: S0.windows, ornament: S0.ornament });
    if (KIND[k] && KIND[k].tower) { d.tower = k === "hall" ? S0.tower : d.tower; d.entrance = S0.entrance; }
  }
  // What the design adds to a building's price beyond its plain cells: more storeys, the facade work, tower, entrance.
  function extraCost(b, base, nation) {
    if (!b.design) return 0;
    const d = b.design, K = KIND[b.k] || KIND.hall, n = b.cells.length;
    return Math.round(n * base * Math.max(0, d.storeys - K.def) / K.def + n * base * 0.12 + (d.ornament !== "plain" ? n * base * 0.08 : 0) + (TOWERS[d.tower] || TOWERS.none).cost + (ENTRANCES[d.entrance] || ENTRANCES.plain).cost);
  }
  const eaveOf = (d, K) => 0.6 + d.storeys * K.h + (d.sign ? 2.8 : 1);
  const roofColour = d => d.roof === "flat" ? shade(WALLS[d.walls].c, 0.93) : ROOFS[d.roof].c;

  // Helpers --------------------------------------------------------------------------------------------------------
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const shade = (c, f) => "#" + hex(c).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("");
  const f1 = n => n.toFixed(1);
  const key = (i, j) => i + "," + j, unkey = k => k.split(",").map(Number);
  // The roof's height over the building, at every point of a five-metre grid: hips rise from every outside wall.
  const hmCache = new Map();
  function heightMap(b, roof) {
    const id = roof + "|" + b.cells.slice().sort().join(";"); if (hmCache.has(id)) return hmCache.get(id);
    const set = new Set(b.cells), edges = [];
    for (const k of b.cells) { const [i, j] = unkey(k);
      if (!set.has(key(i, j - 1))) edges.push([i * 10, j * 10, i * 10 + 10, j * 10]); if (!set.has(key(i, j + 1))) edges.push([i * 10, j * 10 + 10, i * 10 + 10, j * 10 + 10]);
      if (!set.has(key(i - 1, j))) edges.push([i * 10, j * 10, i * 10, j * 10 + 10]); if (!set.has(key(i + 1, j))) edges.push([i * 10 + 10, j * 10, i * 10 + 10, j * 10 + 10]); }
    const distTo = (x, y) => { let m = Infinity; for (const [x0, y0, x1, y1] of edges) { const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - x0 - dx * t, y - y0 - dy * t)); } return m; };
    const prof = d => roof === "flat" ? 0 : roof === "low" ? Math.min(d * 0.3, 5) : roof === "hipped" ? Math.min(d * 0.5, 9) : roof === "steep" ? Math.min(d * 1.0, 15)
      : roof === "mansard" ? (d < 3 ? d * 1.9 : 5.7 + Math.min(d - 3, 6) * 0.22) : roof === "curved" ? 10 * Math.pow(Math.min(1, d / 14), 1.7) : 0;
    const pts = new Map();
    for (const k of b.cells) { const [i, j] = unkey(k); for (let a = 0; a <= 2; a++) for (let c = 0; c <= 2; c++) { const x = i * 10 + a * 5, y = j * 10 + c * 5, kk = x + "," + y; if (!pts.has(kk)) pts.set(kk, prof(distTo(x, y))); } }
    const out = (x, y) => pts.get(x + "," + y) || 0; hmCache.set(id, out); return out;
  }
  // The tower's cell(s): the middle of the front, two cells square on a large building.
  function towerCells(b) {
    const cs = b.cells.map(unkey), minJ = Math.min(...cs.map(c => c[1])), front = cs.filter(c => c[1] === minJ).map(c => c[0]).sort((a, b2) => a - b2);
    const mid = front[Math.floor(front.length / 2)], set = new Set(b.cells);
    if (b.cells.length >= 24 && set.has(key(mid - 1, minJ)) && set.has(key(mid - 1, minJ + 1)) && set.has(key(mid, minJ + 1))) return [[mid - 1, minJ], [mid, minJ], [mid - 1, minJ + 1], [mid, minJ + 1]];
    return [[mid, minJ]];
  }
  // Where the lettering goes: across the front, or split in two either side of a central tower.
  const signText = (b, d, company, city) => d.text || ({ hotel: `Hotel ${city || ""}`.trim(), freight: "Goods and Mail", works: "Workshops", station: "Station", restaurant: "Restaurant" }[b.k] || company);
  function signParts(run, twI, text) {
    text = (text || "").toUpperCase(); if (!run || !text) return [];
    if (!twI) return [[run, text]];
    const l = [run[0], twI[0] - 1], r = [twI[1] + 1, run[1]], ok = x => x[1] >= x[0];
    if (ok(l) && ok(r)) {
      const words = text.split(" "); let best = null;
      for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(" "), b = words.slice(k).join(" "), diff = Math.abs(a.length - b.length); if (!best || diff < best.diff) best = { a, b, diff }; }
      return best ? [[l, best.a], [r, best.b]] : [[l, text]];
    }
    return ok(l) ? [[l, text]] : ok(r) ? [[r, text]] : [];
  }
  const towerTop = (d, eave) => eave + ({ clock: 16, stepped: 18, dome: 10, spire: 10, onion: 10, minaret: 22, belfry: 10, pagoda: 6 }[d.tower] || 0);

  // The bird's-eye drawing of a building ------------------------------------------------------------------------------
  function birdseye(b, H, objs, shadows, hilite, nation, companyName, cityName) {
    if (U.facade && U.facade.birdseye) return U.facade.birdseye(b, H, objs, shadows, hilite, nation, companyName, cityName);
    const { P, poly, line, facef, visible, depth, wallText, shadowOf } = H;
    const d = design(b, nation), K = KIND[b.k] || KIND.hall, set = new Set(b.cells), eave = eaveOf(d, K), wall = WALLS[d.walls].c, rc = roofColour(d);
    const hm = heightMap(b, d.roof), tw = d.tower !== "none" && K.tower ? towerCells(b) : [], twSet = new Set(tw.map(c => key(...c)));
    const wp = (p0, p1, t, z) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, z];
    const glassF = f => shade(GLASS, 0.8 + 0.35 * (f - 0.74));
    function windowsOn(p0, p1, f) {
      const out = [], g2 = glassF(f);
      for (let s = 0; s < d.storeys; s++) {
        const z0 = 0.6 + s * K.h, zb = z0 + K.h * 0.28, wh = Math.min(2.2, K.h * 0.45);
        if (s === 0 && d.ornament === "arcade") { for (const t0 of [0.1, 0.55]) out.push(poly([wp(p0, p1, t0, 0.2), wp(p0, p1, t0 + 0.35, 0.2), wp(p0, p1, t0 + 0.35, z0 + K.h * 0.62), wp(p0, p1, t0 + 0.175, z0 + K.h * 0.82), wp(p0, p1, t0, z0 + K.h * 0.62)], shade(g2, 0.7))); continue; }
        if (d.windows === "bands") { out.push(poly([wp(p0, p1, 0, zb), wp(p0, p1, 1, zb), wp(p0, p1, 1, zb + 1.7), wp(p0, p1, 0, zb + 1.7)], g2)); out.push(line(wp(p0, p1, 0.5, zb), wp(p0, p1, 0.5, zb + 1.7), "#e9e2d1", 0.6)); }
        else if (d.windows === "strips") { if (s === 1 || d.storeys === 1) for (const t0 of [0.2, 0.62]) out.push(poly([wp(p0, p1, t0, z0 + 0.6), wp(p0, p1, t0 + 0.16, z0 + 0.6), wp(p0, p1, t0 + 0.16, (0.6 + d.storeys * K.h - 0.5)), wp(p0, p1, t0, (0.6 + d.storeys * K.h - 0.5))], g2)); }
        else if (d.windows === "goods") { if (s === 0) out.push(poly([wp(p0, p1, 0.18, 0.2), wp(p0, p1, 0.82, 0.2), wp(p0, p1, 0.82, Math.min(5.5, K.h * 0.7)), wp(p0, p1, 0.18, Math.min(5.5, K.h * 0.7))], "#7d6a55", INK, 0.4)); else for (const t0 of [0.2, 0.6]) out.push(poly([wp(p0, p1, t0, zb), wp(p0, p1, t0 + 0.2, zb), wp(p0, p1, t0 + 0.2, zb + 1.6), wp(p0, p1, t0, zb + 1.6)], g2)); }
        else for (const t0 of [0.18, 0.6]) {
          const top = d.windows === "arched" || d.windows === "pointed" ? [wp(p0, p1, t0 + 0.11, zb + wh + (d.windows === "pointed" ? 1.1 : 0.8))] : [];
          out.push(poly([wp(p0, p1, t0, zb), wp(p0, p1, t0 + 0.22, zb), wp(p0, p1, t0 + 0.22, zb + wh), ...top, wp(p0, p1, t0, zb + wh)], g2));
        }
        if (d.ornament === "verandah") out.push(line(wp(p0, p1, 0, z0 + K.h - 0.2), wp(p0, p1, 1, z0 + K.h - 0.2), "#f6f1e3", 1.2), line(wp(p0, p1, 0.02, z0), wp(p0, p1, 0.02, z0 + K.h), "#f6f1e3", 1), line(wp(p0, p1, 0.5, z0), wp(p0, p1, 0.5, z0 + K.h), "#f6f1e3", 1));
        if (d.ornament === "brick" && s > 0) out.push(line(wp(p0, p1, 0, z0), wp(p0, p1, 1, z0), shade(wall, 0.72), 1.2));
      }
      if (d.ornament === "classical") out.push(poly([wp(p0, p1, 0, eave - 1), wp(p0, p1, 1, eave - 1), wp(p0, p1, 1, eave), wp(p0, p1, 0, eave)], shade(wall, 1.12)), line(wp(p0, p1, 0.02, 0.6), wp(p0, p1, 0.02, eave - 1), shade(wall, 1.1), 1.6));
      if (d.ornament === "deco") for (const t0 of [0.02, 0.5]) out.push(line(wp(p0, p1, t0, 0.6), wp(p0, p1, t0, eave), shade(wall, 1.12), 1.8));
      if (d.ornament === "oriental") for (const t0 of [0.05, 0.5]) out.push(line(wp(p0, p1, t0, 0), wp(p0, p1, t0, K.h * 0.9), RED, 1.6));
      return out.join("");
    }
    for (const k of b.cells) {
      const [i, j] = unkey(k), x = i * 10, y = j * 10, svg = [];
      const edges = [[[x, y], [x + 10, y], [0, -1], key(i, j - 1)], [[x + 10, y], [x + 10, y + 10], [1, 0], key(i + 1, j)], [[x + 10, y + 10], [x, y + 10], [0, 1], key(i, j + 1)], [[x, y + 10], [x, y], [-1, 0], key(i - 1, j)]];
      for (const [p0, p1, n, nb] of edges) {
        if (set.has(nb) || !visible(...n)) continue;
        const f = facef(...n), c = shade(wall, f);
        svg.push(poly([[...p0, 0], [...p1, 0], [...p1, eave], [...p0, eave]], c, c, 0.6), windowsOn(p0, p1, f), line([...p0, 0], [...p1, 0], INK, 0.5), line([...p0, eave], [...p1, eave], INK, 0.8));
      }
      // The roof over this cell, in eight triangles on the five-metre grid, shaded by the way each faces.
      const tris = [];
      for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) {
        const xa = x + a * 5, ya = y + c * 5, q = [[xa, ya], [xa + 5, ya], [xa + 5, ya + 5], [xa, ya + 5]].map(p => [p[0], p[1], eave + hm(p[0], p[1])]);
        for (const tri of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
          const u = tri[1].map((v, m) => v - tri[0][m]), v2 = tri[2].map((v, m) => v - tri[0][m]);
          let nx = u[1] * v2[2] - u[2] * v2[1], ny = u[2] * v2[0] - u[0] * v2[2], nz = u[0] * v2[1] - u[1] * v2[0]; const m = Math.hypot(nx, ny, nz) || 1; nx /= m; ny /= m; nz /= m; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const lit = 0.8 + 0.32 * (nx * -0.42 + ny * -0.78 + nz * 0.47) - 0.1;
          tris.push([depth((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3), poly(tri, shade(hilite ? shade(rc, 1.15) : rc, lit), shade(rc, lit), 0.4)]);
        }
      }
      if (!twSet.has(k)) { if (d.roof === "flat") svg.push(poly([[x, y, eave], [x + 10, y, eave], [x + 10, y + 10, eave], [x, y + 10, eave]], hilite ? shade(rc, 1.12) : rc, hilite ? shade(rc, 1.12) : rc, 0.6)); else { tris.sort((p, q) => q[0] - p[0]); svg.push(...tris.map(t => t[1])); } }
      for (const [p0, p1, , nb] of edges) if (!set.has(nb)) svg.push(line([...p0, eave], [...p1, eave], hilite ? "#c9a65b" : INK, hilite ? 2 : 0.8));
      if (d.ornament === "deco" && d.roof === "flat") for (const [p0, p1, n, nb] of edges) if (!set.has(nb) && visible(...n)) svg.push(line([...p0, eave], [...p0, eave + 1.4], shade(wall, 1.1), 1.8));
      objs.push([depth(x + 5, y + 5), svg.join("")]);
      shadows.push(shadowOf(x, y, x + 10, y + 10, eave + hm(x + 5, y + 5)));
    }
    // The tower.
    if (tw.length) {
      const x0 = Math.min(...tw.map(c => c[0])) * 10, y0 = Math.min(...tw.map(c => c[1])) * 10, w = (Math.max(...tw.map(c => c[0])) + 1) * 10 - x0, top = towerTop(d, eave), cx = x0 + w / 2, cy = y0 + w / 2;
      const svg = [], boxT = (bx0, by0, bw, z0, z1, col, rf) => {
        for (const [p0, p1, n] of [[[bx0, by0], [bx0 + bw, by0], [0, -1]], [[bx0 + bw, by0], [bx0 + bw, by0 + bw], [1, 0]]]) { const c = shade(col, facef(...n)); svg.push(poly([[...p0, z0], [...p1, z0], [...p1, z1], [...p0, z1]], c, INK, 0.6)); }
        svg.push(poly([[bx0, by0, z1], [bx0 + bw, by0, z1], [bx0 + bw, by0 + bw, z1], [bx0, by0 + bw, z1]], rf || shade(col, 0.95), INK, 0.6));
      };
      const pyramid = (bx0, by0, bw, z0, h, col) => { const ap = [bx0 + bw / 2, by0 + bw / 2, z0 + h]; svg.push(poly([[bx0, by0, z0], [bx0 + bw, by0, z0], ap], shade(col, 1.08), INK, 0.6), poly([[bx0 + bw, by0, z0], [bx0 + bw, by0 + bw, z0], ap], shade(col, 0.78), INK, 0.6)); };
      const domeAt = (zc, r, col, onion) => { const n = 14, prof = Array.from({ length: n + 1 }, (_, k2) => { const t = k2 / n; return onion ? [r * Math.sin(Math.PI * t) * (1 + 0.35 * Math.sin(Math.PI * t * 0.9)) * (t < 0.95 ? 1 : 0.3), zc + r * 1.5 * t] : [r * Math.cos(t * Math.PI / 2), zc + r * Math.sin(t * Math.PI / 2)]; });
        const left = prof.map(([rr, z]) => P(cx - rr, cy, z)), right = prof.map(([rr, z]) => P(cx + rr, cy, z)).reverse(), gid = "dm" + b.id + Math.round(zc);
        svg.push(`<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${shade(col, 1.12)}"/><stop offset="0.45" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, 0.7)}"/></linearGradient></defs><polygon points="${left.concat(right).map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="url(#${gid})" stroke="${INK}" stroke-width="0.7"/>`);
        const tp = P(cx, cy, onion ? zc + r * 1.5 : zc + r); svg.push(`<line x1="${f1(tp[0])}" y1="${f1(tp[1])}" x2="${f1(tp[0])}" y2="${f1(tp[1] - 4)}" stroke="${INK}" stroke-width="0.8"/>`); };
      const cop = "#7fa392";
      if (d.tower === "clock") { boxT(x0, y0, w, 0, top - 4, wall); pyramid(x0, y0, w, top - 4, 6, ROOFS[d.roof].c || "#6d737a"); const cf = P(cx, y0, top - 7); svg.push(`<ellipse cx="${f1(cf[0])}" cy="${f1(cf[1])}" rx="${f1(w * 0.22)}" ry="${f1(w * 0.2)}" fill="#f4efe1" stroke="${INK}" stroke-width="0.6"/>`); }
      if (d.tower === "stepped") { boxT(x0, y0, w, 0, top - 6, wall); boxT(x0 + w * 0.15, y0 + w * 0.15, w * 0.7, top - 6, top - 3, wall); boxT(x0 + w * 0.3, y0 + w * 0.3, w * 0.4, top - 3, top, wall);
        for (const t0 of [0.25, 0.5, 0.75]) svg.push(line([x0 + w * t0, y0, 6], [x0 + w * t0, y0, top - 7], GLASS, 1.6)); }
      if (d.tower === "dome") { boxT(x0, y0, w, eave, eave + 4, wall); domeAt(eave + 4, w * 0.45, cop); }
      if (d.tower === "spire") { boxT(x0, y0, w, 0, top - 2, wall); pyramid(x0, y0, w, top - 2, 16, "#5d636b"); }
      if (d.tower === "onion") { boxT(x0 + w * 0.1, y0 + w * 0.1, w * 0.8, eave, eave + 6, wall); domeAt(eave + 6, w * 0.35, "#4f8a6e", true); }
      if (d.tower === "minaret") { const mw = w * 0.4; boxT(cx - mw / 2, cy - mw / 2, mw, eave, top - 5, wall); boxT(cx - mw * 0.75, cy - mw * 0.75, mw * 1.5, top - 6, top - 5.4, wall); domeAt(top - 5, mw * 0.5, cop); }
      if (d.tower === "belfry") { boxT(x0 + w * 0.15, y0, w * 0.7, 0, top - 3, wall); const a0 = P(cx, y0, top - 6); svg.push(`<ellipse cx="${f1(a0[0])}" cy="${f1(a0[1])}" rx="${f1(w * 0.12)}" ry="${f1(w * 0.18)}" fill="${shade(GLASS, 0.7)}"/>`); pyramid(x0 + w * 0.1, y0 + w * 0.1, w * 0.8, top - 3, 4, ROOFS.low.c); }
      if (d.tower === "pagoda") { for (let t2 = 0; t2 < 3; t2++) { const s2 = w * (1.1 - t2 * 0.25), z = eave + 1 + t2 * 3.4; boxT(cx - s2 * 0.35, cy - s2 * 0.35, s2 * 0.7, z, z + 2.2, wall); pyramid(cx - s2 / 2, cy - s2 / 2, s2, z + 2.2, 1.6, ROOFS.curved.c); } }
      objs.push([Math.min(...tw.map(c => depth(c[0] * 10 + 5, c[1] * 10 + 5))) - 0.5, svg.join("")]);
      shadows.push(shadowOf(x0, y0, x0 + w, y0 + w, top));
    }
    // The front: entrance, lettering, flags.
    const cs = b.cells.map(unkey), minJ = Math.min(...cs.map(c => c[1])), front = cs.filter(c => c[1] === minJ).map(c => c[0]).sort((a, b2) => a - b2), y = minJ * 10;
    const runs = []; for (const i of front) { const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); }
    const twI = tw.length ? [Math.min(...tw.map(c => c[0])), Math.max(...tw.map(c => c[0]))] : null;
    const mainRun = runs.reduce((a, r) => (r[1] - r[0] > a[1] - a[0] ? r : a), runs[0]);
    const ex = twI ? (twI[0] + twI[1] + 1) * 5 : (mainRun[0] + mainRun[1] + 1) * 5;
    if (KIND[b.k] && KIND[b.k].tower && d.entrance !== "plain") {
      const sv = [];
      if (d.entrance === "canopy") sv.push(poly([[ex - 7, y - 4, 4.2], [ex + 7, y - 4, 4.2], [ex + 7, y, 4.2], [ex - 7, y, 4.2]], "#f1ead9", INK, 0.5), poly([[ex - 7, y - 4, 3.6], [ex + 7, y - 4, 3.6], [ex + 7, y - 4, 4.2], [ex - 7, y - 4, 4.2]], RED, INK, 0.4));
      if (d.entrance === "portico") { for (const dx of [-6, -2, 2, 6]) sv.push(line([ex + dx, y - 4, 0], [ex + dx, y - 4, 7], "#f4efe1", 2.2)); sv.push(poly([[ex - 7.5, y - 4.5, 7], [ex + 7.5, y - 4.5, 7], [ex + 7.5, y, 7], [ex - 7.5, y, 7]], shade(wall, 1.05), INK, 0.5), poly([[ex - 7.5, y - 4.5, 7], [ex + 7.5, y - 4.5, 7], [ex, y - 4.5, 10]], shade(wall, 1.08), INK, 0.6)); }
      if (d.entrance === "arch") sv.push(poly([[ex - 3, y - 0.05, 0], [ex + 3, y - 0.05, 0], [ex + 3, y - 0.05, 6], [ex + 2, y - 0.05, 7.6], [ex, y - 0.05, 8.3], [ex - 2, y - 0.05, 7.6], [ex - 3, y - 0.05, 6]], shade(GLASS, 0.75), INK, 0.5));
      objs.push([depth(ex, y) - 2, sv.join("")]);
    }
    if (d.sign) for (const [r, text] of signParts(mainRun, twI, signText(b, d, companyName, cityName))) {
      const len = (r[1] - r[0] + 1) * 10, size = Math.min(1.9, len / Math.max(5, text.length * 0.92));
      objs.push([depth((r[0] + r[1] + 1) * 5, y) - 3, wallText(text, (r[0] + r[1] + 1) * 5, y, eave - 0.55, size, shade(wall, 0.45))]);
    }
    if (d.flags) {
      const at = tw.length ? [[ex, y + 5, towerTop(d, eave) + (["dome", "onion", "minaret"].includes(d.tower) ? 2 : 0)]] : [[mainRun[0] * 10 + 2, y + 2, eave + hm(mainRun[0] * 10 + 2, y + 2)], [(mainRun[1] + 1) * 10 - 2, y + 2, eave + hm((mainRun[1] + 1) * 10 - 2, y + 2)]];
      objs.push([depth(ex, y) - 4, at.map(([fx, fy, fz]) => line([fx, fy, fz], [fx, fy, fz + 7], INK, 0.9) + poly([[fx, fy, fz + 7], [fx + 4.5, fy, fz + 6.6], [fx + 4.5, fy, fz + 4.6], [fx, fy, fz + 5]], H.company || RED, INK, 0.3)).join("")]);
    }
  }

  // The front elevation -------------------------------------------------------------------------------------------------
  function elevation(b, nation, companyName, companyColour, cityName) {
    if (U.facade) return U.facade.elevation(b, nation, companyName, companyColour, cityName);
    const d = design(b, nation), K = KIND[b.k] || KIND.hall, eave = eaveOf(d, K), wall = WALLS[d.walls].c, rc = roofColour(d), hm = heightMap(b, d.roof);
    const cs = b.cells.map(unkey), i0 = Math.min(...cs.map(c => c[0])), i1 = Math.max(...cs.map(c => c[0])) + 1, minJ = Math.min(...cs.map(c => c[1]));
    const tw = d.tower !== "none" && K.tower ? towerCells(b) : [], top = tw.length ? towerTop(d, eave) : eave;
    const peak = Math.max(...b.cells.map(k => { const [i, j] = unkey(k); return Math.max(hm(i * 10 + 5, j * 10 + 5), hm(i * 10, j * 10)); }));
    const Wm = (i1 - i0) * 10 + 40, Hm = Math.max(top + (["dome", "onion", "minaret", "spire"].includes(d.tower) ? 18 : 10), eave + peak + 10, 24), E = Math.min(1500 / Wm, 640 / Hm), GY = Hm * E + 30;
    const X = m => (m - i0 * 10 + 20) * E, Y = z => GY - z * E, out = [];
    const rect = (x0, z0, x1, z1, fill, sw, extra) => `<rect x="${f1(X(Math.min(x0, x1)))}" y="${f1(Y(Math.max(z0, z1)))}" width="${f1(Math.abs(x1 - x0) * E)}" height="${f1(Math.abs(z1 - z0) * E)}" fill="${fill}" stroke="${sw ? INK : "none"}" stroke-width="${sw || 0}" ${extra || ""}/>`;
    const ln = (x0, z0, x1, z1, c, sw) => `<line x1="${f1(X(x0))}" y1="${f1(Y(z0))}" x2="${f1(X(x1))}" y2="${f1(Y(z1))}" stroke="${c || INK}" stroke-width="${sw || 0.8}"/>`;
    const pg = (pts, fill, sw) => `<polygon points="${pts.map(([x, z]) => f1(X(x)) + "," + f1(Y(z))).join(" ")}" fill="${fill}" stroke="${INK}" stroke-width="${sw == null ? 0.8 : sw}" stroke-linejoin="round"/>`;
    // The roof's outline seen from the front: the highest point of the roof at each place along the building.
    const sil = []; for (let x = i0 * 10; x <= i1 * 10; x += 5) { let h = -1; for (const k of b.cells) { const [i, j] = unkey(k); if (x < i * 10 || x > i * 10 + 10) continue; for (const yy of [j * 10, j * 10 + 5, j * 10 + 10]) h = Math.max(h, hm(x, yy)); } sil.push([x, h]); }
    if (d.roof !== "flat") out.push(pg([[i0 * 10, eave], ...sil.map(([x, h]) => [x, eave + Math.max(0, h)]), [i1 * 10, eave]], rc, 1));
    if (d.roof === "mansard") for (let x = i0 * 10 + 5; x < i1 * 10; x += 10) out.push(pg([[x - 1.6, eave + 1], [x + 1.6, eave + 1], [x + 1.6, eave + 3.4], [x, eave + 4.4], [x - 1.6, eave + 3.4]], shade(wall, 1.05), 0.6), rect(x - 1, eave + 1.3, x + 1, eave + 3.2, GLASS));
    if (d.roof === "curved") out.push(`<path d="M${f1(X(i0 * 10 - 3))},${f1(Y(eave + 1.2))} Q${f1(X(i0 * 10 + 4))},${f1(Y(eave))} ${f1(X(i0 * 10 + 10))},${f1(Y(eave + 0.4))} L${f1(X(i1 * 10 - 10))},${f1(Y(eave + 0.4))} Q${f1(X(i1 * 10 - 4))},${f1(Y(eave))} ${f1(X(i1 * 10 + 3))},${f1(Y(eave + 1.2))}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
    // Walls, column by column: those set further back drawn a shade darker.
    for (let i = i0; i < i1; i++) {
      const js = cs.filter(c => c[0] === i).map(c => c[1]); if (!js.length) continue;
      const back = Math.min(...js) - minJ, c = shade(wall, 1 - Math.min(0.12, back * 0.03)), x0 = i * 10, x1 = x0 + 10;
      out.push(rect(x0, 0, x1, eave, c, 0), rect(x0, 0, x1, 0.6, shade(wall, 0.7)));
      for (let s = 0; s < d.storeys; s++) {
        const z0 = 0.6 + s * K.h, zb = z0 + K.h * 0.28, wh = Math.min(2.2, K.h * 0.45);
        if (s === 0 && d.ornament === "arcade") { for (const a of [x0 + 1, x0 + 5.5]) out.push(`<path d="M${f1(X(a))},${f1(Y(0.6))} L${f1(X(a))},${f1(Y(z0 + K.h * 0.6))} A${f1(1.75 * E)},${f1(1.75 * E)} 0 0 1 ${f1(X(a + 3.5))},${f1(Y(z0 + K.h * 0.6))} L${f1(X(a + 3.5))},${f1(Y(0.6))} Z" fill="${shade(GLASS, 0.75)}" stroke="${INK}" stroke-width="0.6"/>`); continue; }
        if (d.windows === "bands") { out.push(rect(x0, zb, x1, zb + 1.7, GLASS, 0.5)); for (let x = x0 + 1.25; x < x1; x += 1.25) out.push(ln(x, zb, x, zb + 1.7, "#e9e2d1", 0.7)); }
        else if (d.windows === "strips") { if (s === 1 || d.storeys === 1) for (const a of [x0 + 2, x0 + 6.4]) { out.push(rect(a, z0 + 0.6, a + 1.6, (0.6 + d.storeys * K.h - 0.5), GLASS, 0.5)); for (let z = z0 + 0.6 + K.h; z < (0.6 + d.storeys * K.h - 0.5); z += K.h) out.push(rect(a, z - 0.5, a + 1.6, z, shade(wall, 0.85), 0.4)); } }
        else if (d.windows === "goods") { if (s === 0) { out.push(rect(x0 + 1.8, 0.6, x1 - 1.8, Math.min(5.5, K.h * 0.7), "#7d6a55", 0.6)); for (let x = x0 + 3; x < x1 - 2; x += 1.6) out.push(ln(x, 0.6, x, Math.min(5.5, K.h * 0.7), "#5d4c3c", 0.6)); } else for (const a of [x0 + 2, x0 + 6]) out.push(rect(a, zb, a + 2, zb + 1.6, GLASS, 0.5)); }
        else for (const a of [x0 + 1.8, x0 + 6]) {
          if (d.windows === "punched") out.push(rect(a, zb, a + 2.2, zb + wh, GLASS, 0.5), ln(a + 1.1, zb, a + 1.1, zb + wh, "#e9e2d1", 0.6), rect(a - 0.2, zb - 0.25, a + 2.4, zb, shade(wall, 1.08), 0.4));
          else if (d.windows === "arched") out.push(`<path d="M${f1(X(a))},${f1(Y(zb))} L${f1(X(a))},${f1(Y(zb + wh))} A${f1(1.1 * E)},${f1(1.1 * E)} 0 0 1 ${f1(X(a + 2.2))},${f1(Y(zb + wh))} L${f1(X(a + 2.2))},${f1(Y(zb))} Z" fill="${GLASS}" stroke="${INK}" stroke-width="0.5"/>`);
          else out.push(pg([[a, zb], [a + 2.2, zb], [a + 2.2, zb + wh], [a + 1.1, zb + wh + 1.3], [a, zb + wh]], GLASS, 0.5));
        }
        if (d.ornament === "brick" && s > 0) out.push(rect(x0, z0 - 0.25, x1, z0 + 0.15, shade(wall, 0.75)));
        if (d.ornament === "verandah") out.push(rect(x0, z0 + K.h - 0.35, x1, z0 + K.h, "#f6f1e3", 0.4), ln(x0 + 0.3, z0, x0 + 0.3, z0 + K.h, "#f6f1e3", 2.2), ln(x0 + 5, z0, x0 + 5, z0 + K.h, "#f6f1e3", 2.2), ln(x0, z0 + 1.1, x1, z0 + 1.1, "#f6f1e3", 0.9));
      }
      if (d.ornament === "classical") out.push(rect(x0, eave - 1, x1, eave, shade(wall, 1.1), 0.5), rect(x0, 0.6, x0 + 0.7, eave - 1, shade(wall, 1.06), 0.4));
      if (d.ornament === "deco") { out.push(rect(x0, 0.6, x0 + 0.8, eave + 1.2, shade(wall, 1.08), 0.4), rect(x0 + 5, 0.6, x0 + 5.8, eave + 1.2, shade(wall, 1.08), 0.4)); for (let x = x0 + 1; x < x1 - 1; x += 2) out.push(`<polyline points="${f1(X(x))},${f1(Y(eave - 0.8))} ${f1(X(x + 1))},${f1(Y(eave - 0.2))} ${f1(X(x + 2))},${f1(Y(eave - 0.8))}" fill="none" stroke="${companyColour || RED}" stroke-width="1.2"/>`); }
      if (d.ornament === "oriental") for (const a of [x0 + 0.3, x0 + 5]) out.push(rect(a, 0, a + 0.6, K.h * 0.9, RED, 0.4));
    }
    out.push(ln(i0 * 10, eave, i1 * 10, eave, INK, 1.2));
    if (d.roof === "flat") out.push(rect(i0 * 10 - 0.3, eave, i1 * 10 + 0.3, eave + 0.7, shade(wall, 1.08), 0.6));
    if (d.ornament === "brick" && d.roof === "flat") for (let x = i0 * 10; x < i1 * 10; x += 5) out.push(rect(x + 1, eave + 0.7, x + 4, eave + 1.5, shade(wall, 0.9), 0.4));
    // The tower.
    if (tw.length) {
      const tx0 = Math.min(...tw.map(c => c[0])) * 10, tw2 = (Math.max(...tw.map(c => c[0])) + 1) * 10 - tx0, cx = tx0 + tw2 / 2;
      const body = (a, z0, z1, wdt) => { out.push(rect(a, z0, a + wdt, z1, shade(wall, 1.04), 0.8)); };
      const pyr = (a, z0, wdt, h, col) => out.push(pg([[a, z0], [a + wdt / 2, z0 + h], [a + wdt, z0]], col, 0.8));
      const dome = (z0, r, col, onion) => out.push(onion ? `<path d="M${f1(X(cx - r))},${f1(Y(z0))} C${f1(X(cx - r * 1.5))},${f1(Y(z0 + r * 1.1))} ${f1(X(cx - r * 0.2))},${f1(Y(z0 + r * 1.3))} ${f1(X(cx))},${f1(Y(z0 + r * 2.1))} C${f1(X(cx + r * 0.2))},${f1(Y(z0 + r * 1.3))} ${f1(X(cx + r * 1.5))},${f1(Y(z0 + r * 1.1))} ${f1(X(cx + r))},${f1(Y(z0))} Z" fill="${col}" stroke="${INK}" stroke-width="0.9"/>`
        : `<path d="M${f1(X(cx - r))},${f1(Y(z0))} A${f1(r * E)},${f1(r * E)} 0 0 1 ${f1(X(cx + r))},${f1(Y(z0))} Z" fill="${col}" stroke="${INK}" stroke-width="0.9"/>`, ln(cx, z0 + (onion ? r * 2.1 : r), cx, z0 + (onion ? r * 2.1 : r) + 2.5, INK, 1));
      const cop = "#7fa392";
      if (d.tower === "clock") { body(tx0, 0, top - 4, tw2); pyr(tx0 - 0.5, top - 4, tw2 + 1, 6, ROOFS[d.roof].c || "#6d737a"); out.push(`<circle cx="${f1(X(cx))}" cy="${f1(Y(top - 7.5))}" r="${f1(tw2 * 0.2 * E)}" fill="#f4efe1" stroke="${INK}" stroke-width="1"/>`, ln(cx, top - 7.5, cx, top - 7.5 + tw2 * 0.13, INK, 1.4), ln(cx, top - 7.5, cx + tw2 * 0.1, top - 7.5, INK, 1.2)); for (let z = eave + 2; z < top - 11; z += 4) out.push(rect(cx - 1, z, cx + 1, z + 2, GLASS, 0.4)); }
      if (d.tower === "stepped") { body(tx0, 0, top - 6, tw2); body(tx0 + tw2 * 0.15, top - 6, top - 3, tw2 * 0.7); body(tx0 + tw2 * 0.3, top - 3, top, tw2 * 0.4); for (const t0 of [0.22, 0.42, 0.58, 0.78]) out.push(rect(tx0 + tw2 * t0 - 0.6, eave - 2, tx0 + tw2 * t0 + 0.6, top - 7.5, GLASS, 0.4)); for (let x = tx0 + tw2 * 0.18; x < tx0 + tw2 * 0.82; x += 2) out.push(`<polyline points="${f1(X(x))},${f1(Y(top - 4.6))} ${f1(X(x + 1))},${f1(Y(top - 3.8))} ${f1(X(x + 2))},${f1(Y(top - 4.6))}" fill="none" stroke="${companyColour || RED}" stroke-width="1.2"/>`); }
      if (d.tower === "dome") { body(tx0 + tw2 * 0.05, eave, eave + 4, tw2 * 0.9); for (let x = tx0 + tw2 * 0.15; x < tx0 + tw2 * 0.85; x += tw2 * 0.14) out.push(rect(x, eave + 1, x + tw2 * 0.06, eave + 3, GLASS, 0.3)); dome(eave + 4, tw2 * 0.45, cop); }
      if (d.tower === "spire") { body(tx0, 0, top - 2, tw2); pyr(tx0, top - 2, tw2, 16, "#5d636b"); for (let z = eave + 1; z < top - 4; z += 3.5) out.push(rect(cx - 0.8, z, cx + 0.8, z + 2, GLASS, 0.4)); }
      if (d.tower === "onion") { body(tx0 + tw2 * 0.1, eave, eave + 6, tw2 * 0.8); dome(eave + 6, tw2 * 0.3, "#4f8a6e", true); }
      if (d.tower === "minaret") { body(cx - tw2 * 0.2, 0, top - 5, tw2 * 0.4); out.push(rect(cx - tw2 * 0.3, top - 6, cx + tw2 * 0.3, top - 5.4, shade(wall, 1.1), 0.6)); dome(top - 5, tw2 * 0.2, cop); }
      if (d.tower === "belfry") { body(tx0 + tw2 * 0.15, 0, top - 3, tw2 * 0.7); out.push(`<path d="M${f1(X(cx - 1.4))},${f1(Y(top - 8))} L${f1(X(cx - 1.4))},${f1(Y(top - 5.6))} A${f1(1.4 * E)},${f1(1.4 * E)} 0 0 1 ${f1(X(cx + 1.4))},${f1(Y(top - 5.6))} L${f1(X(cx + 1.4))},${f1(Y(top - 8))} Z" fill="${shade(GLASS, 0.7)}"/>`); pyr(tx0 + tw2 * 0.1, top - 3, tw2 * 0.8, 4, ROOFS.low.c); }
      if (d.tower === "pagoda") for (let t2 = 0; t2 < 3; t2++) { const s2 = tw2 * (1.1 - t2 * 0.25), z = eave + 1 + t2 * 3.4; body(cx - s2 * 0.35, z, z + 2.2, s2 * 0.7); out.push(`<path d="M${f1(X(cx - s2 / 2 - 1))},${f1(Y(z + 2.6))} Q${f1(X(cx - s2 / 4))},${f1(Y(z + 2.2))} ${f1(X(cx))},${f1(Y(z + 3.8))} Q${f1(X(cx + s2 / 4))},${f1(Y(z + 2.2))} ${f1(X(cx + s2 / 2 + 1))},${f1(Y(z + 2.6))} Z" fill="${ROOFS.curved.c}" stroke="${INK}" stroke-width="0.8"/>`); }
    }
    // Entrance, lettering, flags.
    const front = cs.filter(c => c[1] === minJ).map(c => c[0]).sort((a, b2) => a - b2), runs = [];
    for (const i of front) { const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); }
    const mainRun = runs.reduce((a, r) => (r[1] - r[0] > a[1] - a[0] ? r : a), runs[0]), twI = tw.length ? [Math.min(...tw.map(c => c[0])), Math.max(...tw.map(c => c[0]))] : null;
    const ex = twI ? (twI[0] + twI[1] + 1) * 5 : (mainRun[0] + mainRun[1] + 1) * 5;
    const doors = (w) => { out.push(rect(ex - w / 2, 0.6, ex + w / 2, Math.min(4, K.h * 0.75), "#6b5136", 0.8), rect(ex - w / 2 + 0.4, 0.6, ex + w / 2 - 0.4, Math.min(3.6, K.h * 0.7), GLASS, 0.5)); for (let x = ex - w / 2 + 1.5; x < ex + w / 2 - 0.5; x += 1.5) out.push(ln(x, 0.6, x, Math.min(3.6, K.h * 0.7), "#c7a46a", 0.8)); };
    if (KIND[b.k] && KIND[b.k].tower) {
      if (d.entrance === "plain") doors(3);
      if (d.entrance === "canopy") { doors(6); out.push(rect(ex - 7, 4.2, ex + 7, 5.2, companyColour || RED, 0.9), rect(ex - 7, 3.9, ex + 7, 4.2, "#f1ead9", 0.5)); for (const x of [ex - 6.6, ex + 6.6]) out.push(ln(x, 0, x, 3.9, "#6b5136", 1.4)); out.push(`<text x="${f1(X(ex))}" y="${f1(Y(4.42))}" font-family="Josefin Sans, sans-serif" font-weight="700" font-size="${f1(0.72 * E)}" letter-spacing="${f1(0.3 * E)}" text-anchor="middle" fill="#f4efe1">${((d.text || companyName || "").split(" ")[0] || "").toUpperCase()}</text>`); }
      if (d.entrance === "portico") { doors(4); out.push(pg([[ex - 7.5, 7], [ex + 7.5, 7], [ex, 10]], shade(wall, 1.08)), rect(ex - 7.5, 6.3, ex + 7.5, 7, shade(wall, 1.1), 0.7)); for (const dx of [-6.5, -2.5, 2.5, 6.5]) out.push(rect(ex + dx - 0.45, 0.6, ex + dx + 0.45, 6.3, "#f6f1e3", 0.6)); out.push(rect(ex - 8, 0, ex + 8, 0.6, shade(wall, 0.85), 0.5)); }
      if (d.entrance === "arch") out.push(`<path d="M${f1(X(ex - 3))},${f1(Y(0.6))} L${f1(X(ex - 3))},${f1(Y(5.6))} A${f1(3 * E)},${f1(3 * E)} 0 0 1 ${f1(X(ex + 3))},${f1(Y(5.6))} L${f1(X(ex + 3))},${f1(Y(0.6))} Z" fill="${shade(GLASS, 0.85)}" stroke="${INK}" stroke-width="1"/>`, `<path d="M${f1(X(ex - 3.6))},${f1(Y(5.6))} A${f1(3.6 * E)},${f1(3.6 * E)} 0 0 1 ${f1(X(ex + 3.6))},${f1(Y(5.6))}" fill="none" stroke="${shade(wall, 0.75)}" stroke-width="${f1(0.5 * E)}"/>`);
    } else doors(b.k === "freight" || b.k === "works" ? 0 : 2.4);
    if (d.sign) for (const [r, text] of signParts(mainRun, twI, signText(b, d, companyName, cityName))) {
      const len = (r[1] - r[0] + 1) * 10, size = Math.min(1.9, len / Math.max(5, text.length * 0.9));
      out.push(`<text x="${f1(X((r[0] + r[1] + 1) * 5))}" y="${f1(Y(eave - 0.55 - size * 0.8 - (2.8 - 0.55 - size * 0.8 - 0.4) / 2 + 0.2))}" font-family="Poiret One, Josefin Sans, sans-serif" font-size="${f1(size * E)}" letter-spacing="${f1(size * 0.18 * E)}" text-anchor="middle" fill="${shade(wall, 0.4)}">${text}</text>`);
    }
    if (d.flags) {
      const flag = (x, z) => out.push(ln(x, z, x, z + 7, INK, 1.2), `<path d="M${f1(X(x))},${f1(Y(z + 7))} C${f1(X(x + 1.5))},${f1(Y(z + 7.4))} ${f1(X(x + 3))},${f1(Y(z + 6.6))} ${f1(X(x + 4.5))},${f1(Y(z + 7))} L${f1(X(x + 4.5))},${f1(Y(z + 5))} C${f1(X(x + 3))},${f1(Y(z + 4.6))} ${f1(X(x + 1.5))},${f1(Y(z + 5.4))} ${f1(X(x))},${f1(Y(z + 5))} Z" fill="${companyColour || RED}" stroke="${INK}" stroke-width="0.6"/>`);
      if (tw.length && !["dome", "onion", "minaret", "spire"].includes(d.tower)) flag(ex, top); else { flag(i0 * 10 + 1, eave + (d.roof === "flat" ? 0.7 : 0)); flag(i1 * 10 - 1, eave + (d.roof === "flat" ? 0.7 : 0)); }
    }
    // Ground, people for scale, and a scale bar.
    out.push(`<line x1="0" y1="${f1(GY)}" x2="${f1(X(i1 * 10 + 20))}" y2="${f1(GY)}" stroke="${INK}" stroke-width="1.6"/>`);
    for (const x of [i0 * 10 - 8, (i0 + i1) * 5 - 9, ex + 9, i1 * 10 + 6]) out.push(`<line x1="${f1(X(x))}" y1="${f1(Y(0))}" x2="${f1(X(x))}" y2="${f1(Y(1.45))}" stroke="${INK}" stroke-width="${f1(0.36 * E)}" stroke-linecap="round"/><circle cx="${f1(X(x))}" cy="${f1(Y(1.62))}" r="${f1(0.14 * E)}" fill="${INK}"/>`);
    for (let k = 0; k < 4; k++) out.push(`<rect x="${f1(X(i0 * 10 - 15) + k * 10 * E)}" y="${f1(GY + 14)}" width="${f1(10 * E)}" height="5" fill="${k % 2 ? "#f3ecda" : INK}" stroke="${INK}" stroke-width="0.6"/>`);
    out.push(`<text x="${f1(X(i0 * 10 - 15) + 40 * E + 8)}" y="${f1(GY + 20)}" font-family="Josefin Sans, sans-serif" font-size="12" fill="${INK}">40 metres</text>`);
    return { svg: out.join(""), w: X(i1 * 10 + 20), h: GY + 30 };
  }

  U.grandArt = { WALLS, ROOFS, WINDOWS, ORNAMENT, TOWERS, ENTRANCES, STYLES, KIND, regionalStyle, styleChoices, defaultDesign, design, applyStyle, extraCost, birdseye, elevation, towerCells, heightMap, signParts, signText, eaveOf };
})(window.UpShip);
