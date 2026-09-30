// Deck plans: painted rooms that furnish themselves, laid out inside the ship's passenger bays.
// Each paint stroke is one room; starting a stroke inside a room extends it. Public spaces flow into one another.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = 24, K = 1.7, BAY_SQ = 6, GAP = 16;       // a square is 2.5 m: six to a 15 m bay
  const TYPES = {
    cabin:     { name: "Cabin",       sw: "#7b3a3a", floor: "url(#dp-carpetRed)" },
    suite:     { name: "Suite",       sw: "#3f4f78", floor: "url(#dp-carpetBlue)" },
    dining:    { name: "Dining room", sw: "#9a6a3a", floor: "url(#dp-parquet)" },
    lounge:    { name: "Lounge",      sw: "#2f6358", floor: "url(#dp-carpetGreen)" },
    promenade: { name: "Promenade",   sw: "#c9a86c", floor: "url(#dp-deckPlanks)" },
    galley:    { name: "Galley",      sw: "#8c8f8a", floor: "url(#dp-tiles)" },
    wash:      { name: "Washroom",    sw: "#dfe3e0", floor: "url(#dp-whiteTiles)" },
    corridor:  { name: "Corridor",    sw: "#2d3f66", floor: "url(#dp-runner)" }
  };
  // How many squares wide a deck is: a little over half the hull's diameter.
  // The decks sit in the lower hull, where it is still nearly full width: about 72% of the diameter.
  const DECK_SHARE = 0.72;
  const widthSq = D => Math.max(3, Math.floor(DECK_SHARE * D / 2.5));
const OPP = { n: "s", s: "n", e: "w", w: "e" };
const OPEN = new Set(["dining", "lounge", "promenade", "corridor"]);
function frame(rect, back) {
  const x = rect.c * S, y = rect.r * S, cw = rect.w * S, ch = rect.h * S;
  if (back === "n") return { t: `translate(${x} ${y})`, W: cw, D: ch };
  if (back === "s") return { t: `translate(${x + cw} ${y + ch}) rotate(180)`, W: cw, D: ch };
  if (back === "w") return { t: `translate(${x} ${y + ch}) rotate(-90)`, W: ch, D: cw };
  return { t: `translate(${x + cw} ${y}) rotate(90)`, W: ch, D: cw };
}
const F = {
  bed(x, y, w, d, blanket) {
    return `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="${w}" height="${d}" rx="1.5" fill="#f4efe4" stroke="#6d5a43" stroke-width="0.5"/>
      <rect x="${x}" y="${y}" width="${w}" height="2.2" fill="#5a3a24"/>
      ${w > 12 ? `<rect x="${x + 1.5}" y="${y + 3}" width="${w / 2 - 2.5}" height="3.4" rx="1.2" fill="#fffdf6" stroke="#cfc6b4" stroke-width="0.4"/><rect x="${x + w / 2 + 1}" y="${y + 3}" width="${w / 2 - 2.5}" height="3.4" rx="1.2" fill="#fffdf6" stroke="#cfc6b4" stroke-width="0.4"/>`
        : `<rect x="${x + 1.5}" y="${y + 3}" width="${w - 3}" height="3.4" rx="1.2" fill="#fffdf6" stroke="#cfc6b4" stroke-width="0.4"/>`}
      <rect x="${x + 0.6}" y="${y + d * 0.42}" width="${w - 1.2}" height="${d * 0.56}" rx="1" fill="${blanket}"/>
      <line x1="${x + 0.6}" y1="${y + d * 0.42}" x2="${x + w - 0.6}" y2="${y + d * 0.42}" stroke="#f4efe4" stroke-width="1"/></g>`;
  },
  wardrobe: (x, y, w, d) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="${w}" height="${d}" fill="#5c3b25"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + d}" stroke="#3b2516" stroke-width="0.5"/><rect x="${x}" y="${y}" width="${w}" height="1" fill="#7a5134"/></g>`,
  nightstand: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="3.6" height="3.6" fill="#6b4529"/><circle cx="${x + 1.8}" cy="${y + 1.8}" r="1.1" fill="#f6dc9a"/></g><circle cx="${x + 1.8}" cy="${y + 1.8}" r="5" fill="url(#dp-lampGlow)"/>`,
  wash: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="5" height="3.6" rx="0.6" fill="#e9e4da" stroke="#8a8278" stroke-width="0.4"/><ellipse cx="${x + 2.5}" cy="${y + 1.9}" rx="1.6" ry="1.1" fill="#b9c6c8"/></g>`,
  armchair: (x, y, col, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#dp-lift)"><rect x="-3.2" y="-3" width="6.4" height="6" rx="1.6" fill="${col}"/><rect x="-3.2" y="-3" width="6.4" height="2" rx="1" fill="${shade(col, -0.25)}"/><rect x="-3.2" y="-3" width="1.4" height="6" rx="0.7" fill="${shade(col, -0.2)}"/><rect x="1.8" y="-3" width="1.4" height="6" rx="0.7" fill="${shade(col, -0.2)}"/></g>`,
  desk: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="8" height="3.6" fill="#6b4529"/><rect x="${x + 0.8}" y="${y + 0.6}" width="3" height="2" fill="#efe6cf"/></g><circle cx="${x + 4}" cy="${y + 6}" r="1.9" fill="#4a3222" filter="url(#dp-lift)"/>`,
  table(x, y, r, seats, col = "#f5efe0") {
    let s = `<g filter="url(#dp-lift)">`;
    for (let i = 0; i < seats; i++) { const a = i / seats * Math.PI * 2 + 0.4; s += `<rect x="${x + Math.cos(a) * (r + 2.3) - 1.6}" y="${y + Math.sin(a) * (r + 2.3) - 1.6}" width="3.2" height="3.2" rx="0.8" fill="#7a2e2a" transform="rotate(${a * 57.3} ${x + Math.cos(a) * (r + 2.3)} ${y + Math.sin(a) * (r + 2.3)})"/>`; }
    return s + `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#b8ad96" stroke-width="0.4"/><circle cx="${x}" cy="${y}" r="${r * 0.35}" fill="#e7d9b0"/><circle cx="${x}" cy="${y}" r="0.9" fill="#b74a3e"/></g>`;
  },
  palm: (x, y, k = 1) => { let s = `<g transform="translate(${x} ${y}) scale(${k})"><circle r="2.6" fill="#8a5a36"/>`; for (let i = 0; i < 7; i++) { const a = i * 0.9; s += `<path d="M0,0 Q${Math.cos(a) * 3},${Math.sin(a) * 3 - 1} ${Math.cos(a) * 6.5},${Math.sin(a) * 6.5}" stroke="#3f6b3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; } return s + `</g>`; },
  rug: (x, y, w, d, col) => `<rect x="${x}" y="${y}" width="${w}" height="${d}" rx="1" fill="${col}" stroke="#e6cf9a" stroke-width="0.6"/><rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${d - 3}" fill="none" stroke="#e6cf9a" stroke-width="0.4" stroke-dasharray="1.2 1"/>`,
  sofa: (x, y, w, col) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="${w}" height="6" rx="1.6" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="2.2" rx="1" fill="${shade(col, -0.25)}"/></g>`,
  deckchair: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x - 2.2}" y="${y - 4}" width="4.4" height="8" rx="1" fill="#f1e6c8" stroke="#8a6a3c" stroke-width="0.5"/><line x1="${x - 2.2}" y1="${y - 1}" x2="${x + 2.2}" y2="${y - 1}" stroke="#8a6a3c" stroke-width="0.5"/><line x1="${x - 1.4}" y1="${y + 1}" x2="${x + 1.4}" y2="${y + 1}" stroke="#c7a36b" stroke-width="0.4"/></g>`,
  planter: (x, y) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" rx="1" fill="#6b4529"/>` + F.palm(x, y, 0.7),
  stove: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="10" height="6" fill="#2f2f33"/><circle cx="${x + 2.6}" cy="${y + 3}" r="1.6" fill="none" stroke="#8a8f93" stroke-width="0.6"/><circle cx="${x + 7.4}" cy="${y + 3}" r="1.6" fill="none" stroke="#8a8f93" stroke-width="0.6"/></g>`,
  counter: (x, y, w, d) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="${w}" height="${d}" fill="#b9b3a6"/><rect x="${x}" y="${y}" width="${w}" height="1" fill="#d4cfc3"/></g>`,
  sink: (x, y) => `<rect x="${x}" y="${y}" width="6" height="4" fill="#d9dedd" stroke="#8a8f93" stroke-width="0.4"/><rect x="${x + 1}" y="${y + 0.8}" width="4" height="2.4" rx="0.6" fill="#a8b8ba"/>`,
  tub: (x, y) => `<g filter="url(#dp-lift)"><rect x="${x}" y="${y}" width="7" height="14" rx="3" fill="#f7f5ef" stroke="#8a8278" stroke-width="0.5"/><rect x="${x + 1.2}" y="${y + 1.4}" width="4.6" height="11.2" rx="2.2" fill="#c9d8da"/></g>`,
  stall: (x, y) => `<rect x="${x}" y="${y}" width="7" height="8" fill="none" stroke="#8a8278" stroke-width="0.5"/><ellipse cx="${x + 3.5}" cy="${y + 2.8}" rx="1.8" ry="2.2" fill="#f7f5ef" stroke="#8a8278" stroke-width="0.4"/>`
};
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join("");
}

// Furnishing rules, by room type and size. Each returns the furniture for one rectangle of the room.
const Q = S / K;   // one square, in the furnishing frame
// Fitting: each piece has a footprint and a list of places it would like to go. It is placed at the first place
// where it lies wholly inside the room, clear of everything already placed and of the path in from the door.
function layout(W, D, doorU) {
  const placed = [], out = [], GAP = 0.6;
  if (doorU != null) placed.push({ x: doorU - 5, y: D - 6, w: 10, d: 6 });          // keep the doorway clear
  const fits = (x, y, w, d) => x >= 0.4 && y >= 0.4 && x + w <= W - 0.4 && y + d <= D - 0.4 &&
    placed.every(p => x + w + GAP <= p.x || p.x + p.w + GAP <= x || y + d + GAP <= p.y || p.y + p.d + GAP <= y);
  return {
    // Try each [x, y]; returns the spot used, or null if it fits nowhere.
    put(w, d, spots, draw) {
      for (const [x, y] of spots) if (fits(x, y, w, d)) { placed.push({ x, y, w, d }); out.push(draw(x, y)); return { x, y }; }
      return null;
    },
    svg: () => out.join("")
  };
}
const cornerSpots = (W, D, w, d) => [[1, 1], [W - w - 1, 1], [1, D - d - 1], [W - w - 1, D - d - 1]];
const wallSpots = (W, D, w, d, step = 3) => {        // along the back wall, then the side walls, then the front
  const s = [];
  for (let x = 1; x + w <= W - 1; x += step) s.push([x, 1]);
  for (let y = 1; y + d <= D - 1; y += step) { s.push([1, y]); s.push([W - w - 1, y]); }
  for (let x = 1; x + w <= W - 1; x += step) s.push([x, D - d - 1]);
  return s;
};
const gridSpots = (W, D, w, d, step) => { const s = []; for (let y = 1; y + d <= D - 1; y += step) for (let x = 1; x + w <= W - 1; x += step) s.push([x, y]); return s; };
// A bed turned to lie along a side wall, for rooms too shallow to take it end-on.
const bedTurned = (x, y, w, d, col) => `<g transform="translate(${x + d} ${y}) rotate(90)">${F.bed(0, 0, w, d, col)}</g>`;
// The best bed that fits: a double end-on, a double turned along a wall, a single, and at last a ship's bunk.
function placeBed(L, W, D, col, allowDouble) {
  const tries = (allowDouble ? [[15, 17]] : []).concat([[9, 15], [7, 12]]);
  for (const [bw, bd] of tries) {
    const end = L.put(bw, bd, [[W / 2 - bw / 2, 0.5], [0.5, 0.5], [W - bw - 0.5, 0.5]], (x, y) => F.bed(x, y, bw, bd, col));
    if (end) return { ...end, w: bw, d: bd, double: bw > 12 };
    const turned = L.put(bd, bw, [[W / 2 - bd / 2, 0.5], [0.5, 0.5], [W - bd - 0.5, 0.5], [0.5, D - bw - 0.5]], (x, y) => bedTurned(x, y, bw, bd, col));
    if (turned) return { ...turned, w: bd, d: bw, double: bw > 12, turned: true };
  }
  return null;
}

const FURNISH = {
  cabin(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door), single = W < 1.5 * Q || D < 1.1 * Q && W < 2.2 * Q;
    // The bed first, the best that fits; then nightstands beside a double.
    const bed = placeBed(L, W, D, single ? "#7b3a3a" : "#6f3232", !single);
    if (bed && bed.double && !bed.turned) { L.put(3.6, 3.6, [[bed.x - 4.4, 1]], (x, y) => F.nightstand(x, y)); L.put(3.6, 3.6, [[bed.x + bed.w + 0.8, 1]], (x, y) => F.nightstand(x, y)); }
    L.put(5, 3.6, cornerSpots(W, D, 5, 3.6).reverse(), (x, y) => F.wash(x, y));
    L.put(9, 4.5, wallSpots(W, D, 9, 4.5), (x, y) => F.wardrobe(x, y, 9, 4.5)) || L.put(4.5, 9, wallSpots(W, D, 4.5, 9), (x, y) => F.wardrobe(x, y, 4.5, 9));
    L.put(8, 8, wallSpots(W, D, 8, 8), (x, y) => F.desk(x, y));
    L.put(6.4, 6, cornerSpots(W, D, 6.4, 6), (x, y) => F.armchair(x + 3.2, y + 3, "#8a5a3a", 200));
    if (W >= 2.5 * Q && D >= 2 * Q) { L.put(14, 9, [[W / 2 - 7, D / 2 - 2]], (x, y) => F.rug(x, y, 14, 9, "#5a2e3a")); L.put(7, 7, cornerSpots(W, D, 7, 7), (x, y) => F.palm(x + 3.5, y + 3.5, 0.7)); }
    return L.svg();
  },
  suite(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door);
    const bed = placeBed(L, W, D, "#34436e", true);
    if (bed && !bed.turned) L.put(3.6, 3.6, [[bed.x + bed.w + 0.8, 1], [bed.x - 4.4, 1]], (x, y) => F.nightstand(x, y));
    // A sitting group on its own rug: sofa, two armchairs, and a low table, as one unit.
    L.put(22, 17, gridSpots(W, D, 22, 17, 3), (x, y) => F.rug(x, y, 22, 17, "#6b2f3a") + F.sofa(x + 3, y + 0.5, 16, "#4a5a8a")
      + F.armchair(x + 6, y + 13, "#7a3a3a", 180) + F.armchair(x + 16, y + 13, "#7a3a3a", 180) + `<circle cx="${x + 11}" cy="${y + 9}" r="2.4" fill="#5c3b25" filter="url(#dp-lift)"/>`);
    // A private bath, walled off in a front corner, only in a large suite.
    if (W >= 2 * Q && D >= 2 * Q) L.put(18, 17, [[W - 18.6, D - 17.6], [0.6, D - 17.6]], (x, y) => `<rect x="${x}" y="${y}" width="18" height="17" fill="url(#dp-whiteTiles)"/>
      <rect x="${x}" y="${y}" width="18" height="17" fill="none" stroke="#2a2320" stroke-width="1"/>` + F.tub(x + 10, y + 1.5) + F.sink(x + 1.5, y + 1.5));
    L.put(9, 4.5, wallSpots(W, D, 9, 4.5), (x, y) => F.wardrobe(x, y, 9, 4.5));
    L.put(13, 13, gridSpots(W, D, 13, 13, 3), (x, y) => F.table(x + 6.5, y + 6.5, 4, 2, "#f5efe0"));
    L.put(8, 8, wallSpots(W, D, 8, 8), (x, y) => F.desk(x, y));
    for (let i = 0; i < 4; i++) L.put(7, 7, cornerSpots(W, D, 7, 7), (x, y) => F.palm(x + 3.5, y + 3.5, 0.8));
    return L.svg();
  },
  dining(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door);
    if (W >= 2 * Q && D >= 2 * Q) L.put(W - 12, 4, [[6, 1]], (x, y) => F.counter(x, y, W - 12, 4));
    // As many tables as fit, big ones where there is room, on an even grid.
    const big = W >= 3 * Q && D >= 2 * Q, t = big ? 19 : 15;
    const nx = Math.max(1, Math.floor((W - 1) / (t + 1))), ny = Math.max(1, Math.floor((D - 6) / (t + 1)));
    const ox = (W - nx * t) / (nx + 1), oy = D >= 2 * Q && W >= 2 * Q ? 6 : 1, sy = (D - oy - ny * t) / (ny + 1);
    let placed = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = ox + i * (t + ox), y = oy + sy + j * (t + sy);
      if (L.put(t, t, [[x, y]], (x, y) => F.table(x + t / 2, y + t / 2, big ? 6 : 4.5, big ? 6 : 4))) placed++;
    }
    // Too small or too narrow for tables of four: tables for two, as many as fit.
    if (!placed) for (const [x, y] of gridSpots(W, D, 11, 11, 12)) if (L.put(11, 11, [[x, y]], (x, y) => F.table(x + 5.5, y + 5.5, 3.2, 2))) placed++;
    if (!placed) L.put(9, 9, [[W / 2 - 4.5, D / 2 - 4.5], [0.5, 0.5]], (x, y) => F.table(x + 4.5, y + 4.5, 2.6, 2));
    return L.svg();
  },
  lounge(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door);
    const nx = Math.max(1, Math.floor(W / 26)), ny = Math.max(1, Math.floor(D / 24));
    const cols = ["#7a3a3a", "#3f5a78", "#6b5a2e"];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = W / nx * (i + 0.5), cy = D / ny * (j + 0.5), col = cols[(i + j) % 3];
      L.put(22, 18, [[cx - 11, cy - 9], [cx - 11, cy - 8], [cx - 10, cy - 9]], (x, y) => F.rug(x, y, 22, 18, (i + j) % 2 ? "#5a2e3a" : "#2e4a5a")
        + F.armchair(x + 5, y + 6, col, 20) + F.armchair(x + 17, y + 6, col, -20) + F.armchair(x + 11, y + 14.5, col, 180) + `<circle cx="${x + 11}" cy="${y + 8.5}" r="2.2" fill="#5c3b25" filter="url(#dp-lift)"/>`);
    }
    // Too small or narrow for a group: pairs of armchairs with a side table between them.
    for (const [x, y] of gridSpots(W, D, 13, 7, 8)) L.put(13, 7, [[x, y]], (x, y) => F.armchair(x + 3.2, y + 3.5, cols[0], 0) + F.armchair(x + 9.8, y + 3.5, cols[1], 0) + `<circle cx="${x + 6.5}" cy="${y + 3.5}" r="1.6" fill="#5c3b25" filter="url(#dp-lift)"/>`);
    for (const [x, y] of gridSpots(W, D, 7, 13, 8)) L.put(7, 13, [[x, y]], (x, y) => F.armchair(x + 3.5, y + 3.2, cols[2], 90) + F.armchair(x + 3.5, y + 9.8, cols[0], 90) + `<circle cx="${x + 3.5}" cy="${y + 6.5}" r="1.6" fill="#5c3b25" filter="url(#dp-lift)"/>`);
    L.put(6.4, 6, gridSpots(W, D, 6.4, 6, 3), (x, y) => F.armchair(x + 3.2, y + 3, cols[0], 0));
    for (let i = 0; i < 4; i++) L.put(8, 8, cornerSpots(W, D, 8, 8), (x, y) => F.palm(x + 4, y + 4));
    return L.svg();
  },
  promenade(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, null);
    for (let x = 2, k = 0; x + 6 <= W - 1; x += 7, k++)
      if (k % 3 === 2) L.put(6, 6, [[x, 2]], (x, y) => F.planter(x + 3, y + 3)); else L.put(4.4, 8, [[x + 0.8, 1.5]], (x, y) => F.deckchair(x + 2.2, y + 4));
    return L.svg();
  },
  galley(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door);
    if (!L.put(W - 2, 5, [[1, 1]], (x, y) => F.counter(x, y, W - 2, 5) + F.stove(x + 1, y) + (W > 18 ? F.sink(x + W - 9, y + 0.5) : "")))
      L.put(5, D - 2, [[1, 1]], (x, y) => F.counter(x, y, 5, D - 2) + `<g transform="translate(${x + 5} ${y + 1}) rotate(90)">${F.stove(0, 0)}</g>`);
    if (D >= 2 * Q) L.put(5, D - 16, [[1, 7]], (x, y) => F.counter(x, y, 5, D - 16));
    L.put(14, 6, gridSpots(W, D, 14, 6, 2), (x, y) => `<rect x="${x}" y="${y}" width="14" height="6" fill="#9a7a4e" filter="url(#dp-lift)"/>`);
    return L.svg();
  },
  wash(fr, n, door) {
    const { W, D } = fr, L = layout(W, D, door);
    for (let x = 1; x + 7 <= W - 1; x += 8) L.put(7, 8, [[x, 1]], (x, y) => F.stall(x, y));
    for (let x = 1; x + 6 <= W - 1; x += 8) L.put(6, 4, [[x, D - 5]], (x, y) => F.sink(x, y));
    return L.svg();
  },
  corridor() { return ""; }
};

function doorInFrame(dr, rect, back) {
  if (!dr || OPP[dr.side] !== back) return null;
  const { r, c } = dr.cell;
  if (r < rect.r || r >= rect.r + rect.h || c < rect.c || c >= rect.c + rect.w) return null;
  const X = (c + 0.5) * S, Y = (r + 0.5) * S, x0 = rect.c * S, y0 = rect.r * S, cw = rect.w * S, ch = rect.h * S;
  const u = back === "n" ? X - x0 : back === "s" ? x0 + cw - X : back === "w" ? y0 + ch - Y : Y - y0;
  return u / K;
}
function doorMark(dr) {
  const { r, c } = dr.cell, g = 10;
  let x1, y1, x2, y2, swing;
  if (dr.side === "s" || dr.side === "n") {
    const y = (dr.side === "s" ? r + 1 : r) * S, xm = c * S + S / 2;
    x1 = xm - g / 2; x2 = xm + g / 2; y1 = y2 = y;
    const dir = dr.side === "s" ? -1 : 1;
    swing = `<path d="M${x1},${y} L${x1},${y + dir * g} A${g},${g} 0 0 ${dir > 0 ? 0 : 1} ${x2},${y}" class="swing"/>`;
  } else {
    const x = (dr.side === "e" ? c + 1 : c) * S, ym = r * S + S / 2;
    y1 = ym - g / 2; y2 = ym + g / 2; x1 = x2 = x;
    const dir = dr.side === "e" ? -1 : 1;
    swing = `<path d="M${x},${y1} L${x + dir * g},${y1} A${g},${g} 0 0 ${dir > 0 ? 1 : 0} ${x},${y2}" class="swing"/>`;
  }
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="doorgap"/>${swing}`;
}
const DEFS_STYLE = `
.dp .wall { stroke: #2a2320; stroke-width: 1.6; stroke-linecap: square; }
.dp .hullwall { stroke: #1f1a16; stroke-width: 3.2; stroke-linecap: square; }
.dp .window { fill: #cfe2e8; stroke: #5b7a80; stroke-width: 0.5; }
.dp .doorgap { stroke: #d9c9a2; stroke-width: 2.4; }
.dp .swing { fill: none; stroke: #6d5a43; stroke-width: 0.5; stroke-dasharray: 1.2 1; }
.dp .gl { stroke: rgba(45,36,24,0.18); stroke-width: 0.5; }
.dp .baytick { stroke: #6d5a43; stroke-width: 1; }
.dp .lbl { font-family: "Josefin Sans", sans-serif; font-size: 9px; fill: #6d5a43; text-anchor: middle; }
.dp .lbl.side { font-size: 10px; }
`;
const DEFS_BODY = `
<filter id="dp-lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0.8" dy="1.1" stdDeviation="0.7" flood-color="#1b140d" flood-opacity="0.45"/></filter>
<radialGradient id="dp-lampGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<pattern id="dp-bare" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4d8bb"/><path d="M0,12 L12,0" stroke="#cdbf9c" stroke-width="0.6"/></pattern>
<pattern id="dp-parquet" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#a0703f"/><rect width="6" height="6" fill="#ae7c48"/><rect x="6" y="6" width="6" height="6" fill="#ae7c48"/><path d="M0,2 H6 M0,4 H6 M8,0 V6 M10,0 V6 M6,8 H12 M6,10 H12 M2,6 V12 M4,6 V12" stroke="#8c5f33" stroke-width="0.3"/></pattern>
<pattern id="dp-deckPlanks" width="24" height="4" patternUnits="userSpaceOnUse"><rect width="24" height="4" fill="#d3b27a"/><path d="M0,4 H24 M9,0 V4" stroke="#b08e57" stroke-width="0.4"/><path d="M0,1.6 H24" stroke="#ddbd88" stroke-width="0.3"/></pattern>
<pattern id="dp-carpetRed" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#7b3a3a"/><path d="M4,1 L7,4 L4,7 L1,4 Z" fill="none" stroke="#8e4a47" stroke-width="0.5"/></pattern>
<pattern id="dp-carpetBlue" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#3f4f78"/><circle cx="4" cy="4" r="1.3" fill="none" stroke="#5a6b96" stroke-width="0.5"/></pattern>
<pattern id="dp-carpetGreen" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#2f6358"/><path d="M5,1 L9,5 L5,9 L1,5 Z" fill="none" stroke="#3f7a6c" stroke-width="0.5"/><circle cx="5" cy="5" r="0.8" fill="#c9a65b" opacity="0.5"/></pattern>
<pattern id="dp-tiles" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#9ea19c"/><rect width="3" height="3" fill="#b8bab5"/><rect x="3" y="3" width="3" height="3" fill="#b8bab5"/></pattern>
<pattern id="dp-whiteTiles" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#eceee9"/><path d="M0,5 H5 M5,0 V5" stroke="#c9ceca" stroke-width="0.4"/></pattern>
<pattern id="dp-runner" width="12" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="24" fill="#2d3f66"/><path d="M6,2 L10,12 L6,22 L2,12 Z" fill="none" stroke="#c9a65b" stroke-width="0.5" opacity="0.7"/><circle cx="6" cy="12" r="1" fill="#c9a65b" opacity="0.7"/></pattern>
`;

  // The deck's grid, built from the ship: passenger bays side by side, bow on the left; runs of neighbouring bays
  // form blocks, and a bulkhead separates blocks that are not next to each other.
  function deckBays(d, deck) {
    const sys = d.systems, f = { twoOk: d.D >= U.physics.TWO_DECKS };
    return Object.keys(sys.modules).map(Number).filter(b => sys.modules[b] === "passenger" && b <= d.bays
      && (deck === "lower" || (f.twoOk && ((sys.deckCount || {})[b] || 1) > 1))).sort((a, b) => a - b);
  }
  function context(d, deck) {
    const plan = d.plan = d.plan || { nextId: 1, cells: {}, first: {} };
    const bays = deckBays(d, deck), rows = widthSq(d.D), cols = [];
    let block = -1, prev = null;
    for (const b of bays) { if (prev === null || b !== prev + 1) block++; prev = b; for (let x = 0; x < BAY_SQ; x++) cols.push({ bay: b, x, block }); }
    const grid = Array.from({ length: rows }, () => Array(cols.length).fill(null));
    cols.forEach((c, i) => { for (let r = 0; r < rows; r++) { const g = plan.cells[`${deck}:${c.bay}:${c.x}:${r}`]; if (g) grid[r][i] = g; } });
    const colX = i => i * S + cols[i].block * GAP;
    return { d, deck, plan, bays, rows, cols, grid, colX, width: cols.length ? colX(cols.length - 1) + S : 0 };
  }
  const key = (ctx, r, c) => `${ctx.deck}:${ctx.cols[c].bay}:${ctx.cols[c].x}:${r}`;
  const inside = (ctx, r, c) => r >= 0 && r < ctx.rows && c >= 0 && c < ctx.cols.length;
  const sameBlock = (ctx, c1, c2) => inside(ctx, 0, c2) && ctx.cols[c1].block === ctx.cols[c2].block;
  function rooms(ctx) {
    const map = new Map();
    for (let r = 0; r < ctx.rows; r++) for (let c = 0; c < ctx.cols.length; c++) {
      const g = ctx.grid[r][c]; if (!g) continue;
      if (!map.has(g.id)) map.set(g.id, { id: g.id, type: g.type, cells: [] });
      map.get(g.id).cells.push({ r, c });
    }
    return [...map.values()];
  }
  function rectangles(room) {
    const left = new Set(room.cells.map(k => k.r + ":" + k.c)), out = [];
    while (left.size) {
      let best = null;
      for (const key of left) {
        const [r0, c0] = key.split(":").map(Number);
        for (let w = 1; left.has(r0 + ":" + (c0 + w - 1)); w++) {
          let h = 1;
          while ([...Array(w).keys()].every(i => left.has((r0 + h) + ":" + (c0 + i)))) h++;
          if (!best || w * h > best.w * best.h) best = { r: r0, c: c0, w, h };
        }
      }
      for (let i = 0; i < best.h; i++) for (let j = 0; j < best.w; j++) left.delete((best.r + i) + ":" + (best.c + j));
      out.push(best);
    }
    return out;
  }
  function door(ctx, room) {
    const cand = { n: [], s: [], e: [], w: [] };
    const t = (r, c, c0) => inside(ctx, r, c) && sameBlock(ctx, c0, c) && ctx.grid[r][c] ? ctx.grid[r][c] : null;
    for (const { r, c } of room.cells) for (const [dd, dr, dc] of [["n", -1, 0], ["s", 1, 0], ["w", 0, -1], ["e", 0, 1]]) {
      const n = t(r + dr, c + dc, c);
      if (n && (n.type === "corridor" || n.type === "promenade") && n.id !== room.id && !OPEN.has(room.type)) cand[dd].push({ r, c });
      if (n && room.type === "galley" && n.type === "dining") (cand[dd].service = cand[dd].service || []).push({ r, c });
    }
    // A galley beside a dining room serves it through its own door.
    if (room.type === "galley") for (const dd of Object.keys(cand)) if (cand[dd].service) { cand[dd] = cand[dd].service; return pickDoor(cand, dd); }
    const side = Object.keys(cand).sort((a, b) => cand[b].length - cand[a].length)[0];
    if (!cand[side].length) return null;
    const list = cand[side].sort((a, b) => a.r - b.r || a.c - b.c);
    return { side, cell: list[Math.floor((list.length - 1) / 2)] };
  }

  function pickDoor(cand, side) { const list = cand[side].sort((a, b) => a.r - b.r || a.c - b.c); return { side, cell: list[Math.floor((list.length - 1) / 2)] }; }
  // Drawing a deck. Coordinates: x along the ship (bow on the left), y across it (port side at the top).
  function render(ctx, opts = {}) {
    if (!ctx.cols.length) return "";
    const rs = rooms(ctx), W = ctx.width, H = ctx.rows * S;
    let floors = "", furn = "", walls = "", doors = "", marks = "";
    // Each block of bays is a floor of bare structure, with the hull's sides along the top and bottom.
    const blocks = [...new Set(ctx.cols.map(c => c.block))];
    for (const b of blocks) {
      const cs = ctx.cols.map((c, i) => i).filter(i => ctx.cols[i].block === b), x0 = ctx.colX(cs[0]), x1 = ctx.colX(cs[cs.length - 1]) + S;
      floors += `<rect x="${x0}" y="0" width="${x1 - x0}" height="${H}" fill="url(#dp-bare)"/>`;
      walls += `<rect x="${x0}" y="0" width="${x1 - x0}" height="${H}" class="dp-block"/>`;
      if (opts.grid) for (let i = cs[0]; i <= cs[cs.length - 1] + 1; i++) walls += `<line x1="${x0 + (i - cs[0]) * S}" y1="0" x2="${x0 + (i - cs[0]) * S}" y2="${H}" class="gl"/>`;
      if (opts.grid) for (let r = 0; r <= ctx.rows; r++) walls += `<line x1="${x0}" y1="${r * S}" x2="${x1}" y2="${r * S}" class="gl"/>`;
    }
    for (const room of rs) {
      const T = TYPES[room.type];
      for (const { r, c } of room.cells) floors += `<rect x="${ctx.colX(c)}" y="${r * S}" width="${S + 0.3}" height="${S + 0.3}" fill="${T.floor}"/>`;
      const dr = door(ctx, room), back = dr ? OPP[dr.side] : (room.cells.some(k => k.r === 0) ? "n" : room.cells.some(k => k.r === ctx.rows - 1) ? "s" : "n");
      for (const rect of rectangles(room)) {
        let b = back;
        if (room.type === "promenade") b = rect.r === 0 ? "n" : rect.r + rect.h === ctx.rows ? "s" : back;
        const shift = ctx.colX(rect.c) - rect.c * S;                       // blocks after the first sit a little to the right
        const fr = frame(rect, b), scaled = { W: fr.W / K, D: fr.D / K };
        furn += `<g transform="translate(${shift} 0) ${fr.t} scale(${K})">${FURNISH[room.type](scaled, rect.w * rect.h, doorInFrame(dr, rect, b))}</g>`;
      }
      if (dr) doors += `<g transform="translate(${ctx.colX(dr.cell.c) - dr.cell.c * S} 0)">${doorMark(dr)}</g>`;
      if (ctx.plan.first[room.id] && (room.type === "cabin")) {
        const c0 = room.cells[0]; marks += `<g transform="translate(${ctx.colX(c0.c) + 5} ${c0.r * S + 6})"><circle r="5" class="dp-first"/><text y="3" class="dp-firsttext">1</text></g>`;
      }
    }
    for (let r = 0; r < ctx.rows; r++) for (let c = 0; c < ctx.cols.length; c++) {
      const g = ctx.grid[r][c]; if (!g) continue;
      for (const [dr, dc, x1, y1, x2, y2] of [[-1, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 1], [0, -1, 0, 0, 0, 1], [0, 1, 1, 0, 1, 1]]) {
        const nr = r + dr, nc = c + dc, out = !inside(ctx, nr, nc) || !sameBlock(ctx, c, nc);
        const n = out ? null : ctx.grid[nr][nc];
        if (n && n.id === g.id) continue;
        if (n && OPEN.has(g.type) && OPEN.has(n.type)) continue;
        if (n && dr === 1) continue;                                       // each shared edge drawn once, from above
        if (n && dc === 1) continue;
        const hull = out && (nr < 0 || nr >= ctx.rows);
        const X1 = ctx.colX(c) + x1 * S, Y1 = (r + y1) * S, X2 = ctx.colX(c) + x2 * S, Y2 = (r + y2) * S;
        walls += `<line x1="${X1}" y1="${Y1}" x2="${X2}" y2="${Y2}" class="${hull ? "hullwall" : "wall"}"/>`;
        if (hull && g.type === "promenade") walls += `<rect x="${X1 + 3}" y="${Y1 - 1.6}" width="${S - 6}" height="3.2" class="window"/>`;
      }
    }
    // Bay labels above each block of columns.
    let labels = "";
    for (const b of ctx.bays) { const i = ctx.cols.findIndex(c => c.bay === b); labels += `<text x="${ctx.colX(i) + BAY_SQ * S / 2}" y="-8" class="lbl">Bay ${b}</text><line x1="${ctx.colX(i)}" y1="-4" x2="${ctx.colX(i)}" y2="0" class="baytick"/>`; }
    // Dimensions: each run of bays' length, the deck's width, and a scale bar.
    let dims = "";
    for (const b of blocks) {
      const cs = ctx.cols.map((c, i) => i).filter(i => ctx.cols[i].block === b), x0 = ctx.colX(cs[0]), x1 = ctx.colX(cs[cs.length - 1]) + S;
      dims += `<line x1="${x0}" y1="${H + 16}" x2="${x1}" y2="${H + 16}" class="dp-dim" marker-start="url(#dp-arrow)" marker-end="url(#dp-arrow)"/><rect x="${(x0 + x1) / 2 - 24}" y="${H + 9}" width="48" height="14" fill="#ebe0c4"/><text x="${(x0 + x1) / 2}" y="${H + 20}" class="dp-dimtext">${cs.length * 2.5} m</text>`;
    }
    const xr = W + 12;
    dims += `<line x1="${xr}" y1="0" x2="${xr}" y2="${H}" class="dp-dim" marker-start="url(#dp-arrow)" marker-end="url(#dp-arrow)"/><text x="${xr + 6}" y="${H / 2 + 4}" class="dp-dimtext start">${ctx.rows * 2.5} m</text>`;
    const sy = H + 66;
    dims += `<g transform="translate(0 ${sy})"><rect width="${S * 2}" height="5" fill="#2d2418"/><rect x="${S * 2}" width="${S * 2}" height="5" fill="none" stroke="#2d2418" stroke-width="0.8"/>
      <text x="0" y="-4" class="dp-dimtext start">0</text><text x="${S * 2}" y="-4" class="dp-dimtext">5</text><text x="${S * 4}" y="-4" class="dp-dimtext">10 m</text>
      <text x="${S * 4 + 12}" y="6" class="dp-dimtext start">Each square is 2.5 m by 2.5 m</text></g>`;
    return `<g class="dp">${floors}${furn}${walls}${doors}${marks}${labels}${dims}</g>`;
  }
  const defs = () => `<style>${DEFS_STYLE}</style>${DEFS_BODY}<marker id="dp-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9" fill="none" stroke="#2d2418" stroke-width="1.4"/></marker>`;

  // Painting: each stroke is one room; starting in a room of the same type extends it. Strokes stay within one block of bays.
  let stroke = null;
  function paintStart(ctx, r, c, tool) {
    const here = ctx.grid[r][c];
    if (tool === "first") {
      if (here && here.type === "cabin") { ctx.plan.first[here.id] = !ctx.plan.first[here.id]; }
      return;
    }
    stroke = { id: here && here.type === tool ? here.id : ctx.plan.nextId++, block: ctx.cols[c].block, tool };
    paintAt(ctx, r, c);
  }
  function paintAt(ctx, r, c) {
    if (!stroke || !inside(ctx, r, c) || ctx.cols[c].block !== stroke.block) return;
    const k = key(ctx, r, c);
    if (stroke.tool === "erase") delete ctx.plan.cells[k]; else ctx.plan.cells[k] = { type: stroke.tool, id: stroke.id };
    ctx.grid[r][c] = ctx.plan.cells[k] || null;
  }
  const paintEnd = () => { stroke = null; };
  const painting = () => !!stroke;

  // What the plan adds up to: berths by class, seats, public space, and anything missing.
  function stats(d) {
    const out = { laidOut: false, berths: 0, first: 0, second: 0, seats: 0, publicSq: 0, windowsSq: 0, washSq: 0, galley: false, noDoor: 0, empty: [], comfort: 0 };
    for (const deck of ["lower", "upper"]) {
      const ctx = context(d, deck);
      for (const b of ctx.bays) if (!ctx.cols.some((c, i) => c.bay === b && ctx.grid.some(row => row[i]))) out.empty.push(`${deck === "upper" ? "upper" : "lower"} deck of bay ${b}`);
      for (const room of rooms(ctx)) {
        out.laidOut = true;
        const n = room.cells.length;
        // Berths by size: one square takes a single berth, two or three a pair, four or more four in bunks.
        if (room.type === "cabin") { const b = cabinBerths(n); out.berths += b; if (ctx.plan.first[room.id]) out.first += b; else out.second += b; }
        if (room.type === "suite") { out.berths += 2; out.first += 2; }
        if (room.type === "dining") out.seats += seatCount(room);
        if (OPEN.has(room.type) && room.type !== "corridor") out.publicSq += n;
        if (room.type === "promenade") out.windowsSq += room.cells.filter(k => k.r === 0 || k.r === ctx.rows - 1).length;
        if (room.type === "wash") out.washSq += n;
        if (room.type === "galley") out.galley = true;
        if (!OPEN.has(room.type) && !door(ctx, room)) out.noDoor++;
      }
    }
    // Comfort, out of 100: public space per passenger, windows, the share in suites, and whether meals and washing are provided for.
    if (out.berths) {
      const space = Math.min(1, out.publicSq / out.berths / 1.2), view = Math.min(1, out.windowsSq / out.berths / 0.4);
      const suites = Math.min(1, out.first / out.berths / 0.5), fed = out.seats >= out.berths * 0.5 && out.galley ? 1 : out.seats ? 0.5 : 0;
      const wash = Math.min(1, out.washSq * 8 / out.berths);
      out.comfort = Math.round(20 + 30 * space + 15 * view + 15 * suites + 10 * fed + 10 * wash);
    }
    out.notes = [];
    if (out.noDoor) out.notes.push(`${out.noDoor} room${out.noDoor > 1 ? "s have" : " has"} no door onto a corridor or promenade.`);
    if (out.seats && !out.galley) out.notes.push("A dining room but no galley to cook for it.");
    if (out.berths && out.washSq * 8 < out.berths) out.notes.push(`Too few washrooms: one square serves about eight passengers.`);
    // Short hops need no meals; longer services do.
    if (out.berths >= 20 && out.seats < out.berths * 0.5) out.notes.push("Too few dining seats: passengers eat in two sittings at most.");
    return out;
  }
  const cabinBerths = n => n === 1 ? 1 : n <= 3 ? 2 : 4;
  function seatCount(room) {
    let n = 0;
    for (const rect of rectangles(room)) { const W = rect.w * S / K, D = rect.h * S / K, big = W >= 3 * Q && D >= 2 * Q, t = big ? 19 : 15;
      n += Math.max(1, Math.floor((W - 1) / (t + 1))) * Math.max(1, Math.floor((D - 6) / (t + 1))) * (big ? 6 : 4); }
    return n;
  }

  // A standard layout, so starting designs arrive furnished: promenades along the windows and a corridor
  // down the middle; in each run of bays, a dining room with its galley and a lounge in the first bay,
  // then cabins, two squares wide, either side of the corridor, and a washroom at the far end.
  function standardLayout(d) {
    d.plan = { nextId: 1, cells: {}, first: {} };
    for (const deck of ["lower", "upper"]) {
      const ctx = context(d, deck);
      if (!ctx.cols.length) continue;
      const R = ctx.rows, mid = Math.floor(R / 2);
      const room = (type, r0, r1, c0, c1) => { const id = ctx.plan.nextId++; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inside(ctx, r, c)) ctx.plan.cells[key(ctx, r, c)] = { type, id }; };
      const blocks = [...new Set(ctx.cols.map(c => c.block))];
      for (const b of blocks) {
        const cs = ctx.cols.map((c, i) => i).filter(i => ctx.cols[i].block === b), a = cs[0], z = cs[cs.length - 1];
        if (R >= 6) { room("promenade", 0, 0, a, z); room("promenade", R - 1, R - 1, a, z); }
        const top = R >= 6 ? 1 : 0, bot = R >= 6 ? R - 2 : R - 1;
        room("corridor", mid, mid, a, z);
        let c = a;
        if (deck === "lower") {
          if (z - a >= 7) { room("dining", top, mid - 1, a, a + 3); room("galley", mid + 1, bot, a, a + 1); room("lounge", mid + 1, bot, a + 2, a + 3); c = a + 4; }
        }
        for (; c + 1 <= z - 1; c += 2) { room("cabin", top, mid - 1, c, c + 1); room("cabin", mid + 1, bot, c, c + 1); }
        room("wash", top, mid - 1, c, z); room("wash", mid + 1, bot, c, z);
      }
    }
  }

  U.decks = { DECK_SHARE, TYPES, S, BAY_SQ, widthSq, context, render, defs, paintStart, paintAt, paintEnd, painting, stats, standardLayout, rooms };
})(window.UpShip);
