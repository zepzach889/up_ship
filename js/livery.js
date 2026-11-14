// Liveries: colored zones and period decorations, drawn on any design's real hull shape,
// from the side (Paint tab, mast) and from above (map). Positions are in hull terms: x as a share
// of the length from the bow, y as a share of the radius (-1 the top of the hull, +1 the bottom;
// beyond that, the fins).
window.UpShip = window.UpShip || {};
(function (U) {
  const P = () => U.physics;
  // The period palette: doped silver, creams, and the lacquers of the day.
  const PALETTE = ["#c9cbc8", "#e9e4d6", "#f5f2ea", "#8b8f92", "#4c5156", "#1c1d20", "#1f2f55", "#2f4f8f", "#7fa3bf",
    "#2f5a3e", "#5f7a4a", "#9b2a24", "#6a2231", "#b5572e", "#c9a65b", "#d9b56a"];
  const FONTS = { deco: { name: "Deco", css: "'Poiret One', 'Josefin Sans', sans-serif", weight: 400, spacing: 0.08 },
    grotesque: { name: "Grotesque", css: "'Josefin Sans', 'Futura', sans-serif", weight: 700, spacing: 0.12 },
    roman: { name: "Roman", css: "Georgia, 'Times New Roman', serif", weight: 400, spacing: 0.18 } };
  const DECOR = {
    cheat:  { name: "Cheat line",   max: 1, params: [["y", "Height", -0.85, 0.85, 0.2], ["t", "Thickness", 0.02, 0.14, 0.05]], flag: "Double" },
    bow:    { name: "Bow bands",    params: [["n", "Bands", 1, 3, 2, 1], ["x", "Position", 0.02, 0.3, 0.08], ["w", "Width", 0.004, 0.04, 0.012]] },
    stern:  { name: "Stern bands",  params: [["n", "Bands", 1, 3, 2, 1], ["x", "Position", 0.6, 0.9, 0.78], ["w", "Width", 0.004, 0.04, 0.012]] },
    chevron:{ name: "Nose chevrons", params: [["n", "Chevrons", 1, 3, 2, 1], ["x", "Depth", 0.04, 0.22, 0.1], ["w", "Width", 0.004, 0.03, 0.012]] },
    sun:    { name: "Sunburst",     params: [["n", "Rays", 6, 16, 10, 1], ["x", "Size", 0.02, 0.12, 0.045]] },
    finstripe: { name: "Fin stripes", params: [["n", "Stripes", 1, 3, 2, 1], ["w", "Width", 0.05, 0.3, 0.12]], flag: "Along the fin" },
    flash:  { name: "Tail flash",   params: [["x", "Position", 0.55, 0.9, 0.72], ["w", "Width", 0.02, 0.12, 0.05]] },
    spine:  { name: "Spine stripe", params: [["w", "Width", 0.05, 0.4, 0.18]] },
    speed:  { name: "Speed lines",  params: [["n", "Lines", 2, 4, 3, 1], ["y", "Height", -0.6, 0.6, -0.1], ["x", "Length", 0.1, 0.45, 0.25]] }
  };

  // A new design starts in company colors: silver hull, fins and a cheat line in the company color, the emblem on the fins.
  function fresh(state) {
    const e = state.company.emblem || { c1: "#9b2a24", c2: "#f0e7d1" };
    return { preset: "company", hull: "#c9cbc8", twoTone: false, lower: "#e9e4d6", split: 0.35, nose: null, tail: null,
      fins: e.c1, rudders: e.c1, car: "#b9bcbd", engines: "#b9bcbd", gondolas: "#b9bcbd",
      decorations: [{ type: "cheat", color: e.c1, y: 0, t: 0.05, flag: false }],
      name: { text: "", font: "deco", size: 1, color: e.c1, x: 0.16, y: 0.05 },
      emblems: [{ x: 0.9, y: -1.3, size: 0.9 }] };
  }
  // The look of the builders' ships, as their pictures show it: hull in the company colour, fins and rudders darker, emblem on the fins.
  function builders(state) {
    const e = state.company.emblem || { c1: "#9b2a24", c2: "#f0e7d1" }, dark = shade(e.c1, -0.35);
    return { ...fresh(state), preset: null, hull: e.c1, fins: dark, rudders: dark, car: "#b9bcbd", engines: "#b9bcbd", decorations: [] };
  }
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.round(v * (1 + amt))).toString(16).padStart(2, "0")).join(""); }
  // Livery presets: combinations to start from; the ship's name and emblems are kept.
  function presets(state) {
    const e = state.company.emblem || { c1: "#9b2a24", c2: "#f0e7d1" };
    return {
      company: { ...fresh(state), label: "Company colors" },
      imperial: { label: "Imperial liner", hull: "#c9cbc8", fins: "#1f2f55", rudders: "#1f2f55", twoTone: false, nose: "#1f2f55",
        decorations: [{ type: "cheat", color: "#1f2f55", y: 0.28, t: 0.045, flag: false }, { type: "bow", color: "#c9a65b", n: 2, x: 0.07, w: 0.01 }, { type: "finstripe", color: "#f5f2ea", n: 2, w: 0.1 }] },
      civic: { label: "Civic fleet", hull: "#e9e4d6", fins: "#e9e4d6", rudders: "#9b2a24", twoTone: false, nose: null,
        decorations: [{ type: "cheat", color: "#9b2a24", y: 0.1, t: 0.08, flag: false }, { type: "flash", color: "#9b2a24", x: 0.74, w: 0.06 }] },
      northern: { label: "Northern star", hull: "#c9cbc8", twoTone: true, lower: "#1f2f55", split: 0.3, fins: "#1f2f55", rudders: "#c9a65b",
        decorations: [{ type: "spine", color: "#1f2f55", w: 0.16 }, { type: "chevron", color: "#c9a65b", n: 2, x: 0.1, w: 0.012 }] },
      midnight: { label: "Midnight", hull: "#1f2f55", fins: "#1f2f55", rudders: "#c9a65b", twoTone: false, nose: "#c9a65b",
        decorations: [{ type: "cheat", color: "#c9a65b", y: 0.15, t: 0.03, flag: true }, { type: "sun", color: "#c9a65b", n: 12, x: 0.045 }] },
      heritage: { label: "Heritage", hull: "#e9e4d6", fins: "#6a2231", rudders: "#6a2231", twoTone: false, nose: null,
        decorations: [{ type: "bow", color: "#6a2231", n: 3, x: 0.06, w: 0.008 }, { type: "stern", color: "#6a2231", n: 3, x: 0.78, w: 0.008 }, { type: "speed", color: "#6a2231", n: 3, y: -0.05, x: 0.25 }] },
      plain: { label: "Plain works", hull: "#c9cbc8", fins: "#c9cbc8", rudders: "#8b8f92", twoTone: false, nose: null, decorations: [] }
    };
  }
  function applyPreset(state, lv, key) {
    const p = JSON.parse(JSON.stringify(presets(state)[key]));
    delete p.label; delete p.name; delete p.emblems;
    Object.assign(lv, { twoTone: false, nose: null, tail: null }, p, { preset: key });
    return lv;
  }

  let uid = 0;
  const span = (a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b); return `x="${lo.toFixed(1)}" width="${Math.max(0.5, hi - lo).toFixed(1)}"`; };
  // The side view. Returns SVG elements drawn with X(metres) and Y(metres) supplied by the caller.
  function side(d, f, X, Y, opts = {}) {
    const lv = d.livery, L = f.L, D = d.D, R = D / 2, r = x => P().radius(d, x), id = "lv" + (++uid);
    const N = 140, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = L * i / N; top.push(`${X(x).toFixed(1)},${Y(-r(x)).toFixed(1)}`); bot.push(`${X(x).toFixed(1)},${Y(r(x)).toFixed(1)}`); }
    const outline = `M${top.join(" L")} L${bot.slice().reverse().join(" L")} Z`;
    const band = (fy0, fy1) => {                  // a band between two heights (shares of the radius), following the taper
      const a = [], b = [];
      for (let i = 0; i <= N; i++) { const x = L * i / N; a.push(`${X(x).toFixed(1)},${Y(r(x) * fy0).toFixed(1)}`); b.push(`${X(x).toFixed(1)},${Y(r(x) * fy1).toFixed(1)}`); }
      return `M${a.join(" L")} L${b.reverse().join(" L")} Z`;
    };
    const vband = (x0, x1, c) => `<rect ${span(X(x0), X(x1))} y="${Y(-R * 1.05)}" height="${Y(R * 1.05) - Y(-R * 1.05)}" fill="${c}"/>`;
    // Fins first, so the hull overlaps their roots.
    const fin = finShapes(d, f), finC = lv.fins, rudC = lv.rudders || lv.fins;
    let fins = "";
    for (const s of [-1, 1]) {
      const g = fin.side(s);
      fins += `<path d="M${g.fin.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z" fill="${finC}" class="lv-edge"/>
        <path d="M${g.rud.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z" fill="${rudC}" class="lv-edge"/>`;
      if (g.twin) fins += `<path d="M${g.twin.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z" fill="${finC}" class="lv-edge"/>`;
    }
    // Fin structure: ribs running out from the hull, and the shading of a surface seen at a slant.
    let finRibs = "";
    for (const s of [-1, 1]) {
      const g = fin.side(s), cf = `${id}r${s}`;
      finRibs += `<clipPath id="${cf}"><path d="M${g.fin.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z M${g.rud.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z"/></clipPath><g clip-path="url(#${cf})" class="lv-ribs">`;
      const n = Math.max(4, Math.round((g.x1 - g.x0) / 5));
      for (let i = 1; i < n; i++) { const x = g.x0 + (g.x1 - g.x0) * i / n; finRibs += `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(g.tip * 1.05)}"/>`; }
      finRibs += `<line x1="${X(g.x0)}" y1="${Y(s * (Math.abs(g.tip) - g.span * 0.42))}" x2="${X(g.x1)}" y2="${Y(s * (Math.abs(g.tip) - g.span * 0.42))}"/>
        <rect ${span(X(g.x0), X(g.x1))} y="${Math.min(Y(g.tip), Y(g.tip - s * g.span * 0.3))}" height="${Math.abs(Y(g.span * 0.3) - Y(0))}" fill="${s < 0 ? "#fff" : "#000"}" opacity="${s < 0 ? 0.1 : 0.14}"/></g>`;
    }
    // Fin decorations: stripes across or along the fins.
    let finDeco = "";
    for (const dc of lv.decorations.filter(x => x.type === "finstripe")) for (const s of [-1, 1]) {
      const g = fin.side(s), clip = `${id}f${s}`;
      finDeco += `<clipPath id="${clip}"><path d="M${g.fin.map(p => `${X(p[0])},${Y(p[1])}`).join(" L")} Z"/></clipPath><g clip-path="url(#${clip})">`;
      for (let i = 0; i < dc.n; i++) {
        if (dc.flag) { const yy = g.root + s * (g.span * (0.35 + i * 0.22)); finDeco += `<rect ${span(X(g.x0 - 5), X(g.x1 + 5))} y="${Math.min(Y(yy), Y(yy + s * g.span * dc.w))}" height="${Math.abs(Y(g.span * dc.w) - Y(0))}" fill="${dc.color}"/>`; }
        else { const xx = g.x0 + (g.x1 - g.x0) * (0.3 + i * 0.18); finDeco += `<rect ${span(X(xx), X(xx + (g.x1 - g.x0) * dc.w))} y="${Y(-R * 2)}" height="${Y(R * 2) - Y(-R * 2)}" fill="${dc.color}"/>`; }
      }
      finDeco += `</g>`;
    }
    // The hull body: base color, a two-tone lower half, nose cap and tail cone, then decorations, all clipped to the hull.
    let body = `<rect ${span(X(-2), X(L + 2))} y="${Y(-R * 1.1)}" height="${Y(R * 1.1) - Y(-R * 1.1)}" fill="${lv.hull}"/>`;
    if (lv.twoTone) body += `<path d="${band(lv.split, 1.05)}" fill="${lv.lower}"/>`;
    if (lv.nose) body += vband(-2, f.ln * 0.42, lv.nose);
    if (lv.tail) body += vband(L - f.lt * 0.3, L + 2, lv.tail);
    for (const dc of lv.decorations) {
      if (dc.type === "cheat") {
        body += `<path d="${band(dc.y - dc.t / 2, dc.y + dc.t / 2)}" fill="${dc.color}"/>`;
        if (dc.flag) body += `<path d="${band(dc.y + dc.t * 1.2, dc.y + dc.t * 1.2 + dc.t * 0.5)}" fill="${dc.color}"/>`;
      }
      if (dc.type === "bow") for (let i = 0; i < dc.n; i++) { const x = L * (dc.x + i * dc.w * 2.2); body += vband(x, x + L * dc.w, dc.color); }
      if (dc.type === "stern") for (let i = 0; i < dc.n; i++) { const x = L * (dc.x + i * dc.w * 2.2); body += vband(x, x + L * dc.w, dc.color); }
      if (dc.type === "chevron") for (let i = 0; i < dc.n; i++) {
        const x0 = L * (0.015 + i * dc.w * 2.4), depth = L * dc.x, w = L * dc.w;
        body += `<path d="M${X(x0)},${Y(0)} L${X(x0 + depth)},${Y(-R * 1.1)} L${X(x0 + depth + w)},${Y(-R * 1.1)} L${X(x0 + w)},${Y(0)} L${X(x0 + depth + w)},${Y(R * 1.1)} L${X(x0 + depth)},${Y(R * 1.1)} Z" fill="${dc.color}"/>`;
      }
      if (dc.type === "sun") {
        const len = L * dc.x;
        for (let i = 0; i < dc.n; i++) { const a0 = -Math.PI / 2 + Math.PI * i / dc.n, a1 = a0 + Math.PI / dc.n / 2;
          body += `<path d="M${X(0)},${Y(0)} L${X(len * Math.cos(a0) + len)},${Y(R * 1.2 * Math.sin(a0))} L${X(len * Math.cos(a1) + len)},${Y(R * 1.2 * Math.sin(a1))} Z" fill="${dc.color}"/>`; }
      }
      if (dc.type === "flash") { const x = L * dc.x, w = L * dc.w;
        body += `<path d="M${X(x)},${Y(R * 1.1)} L${X(x + w)},${Y(R * 1.1)} L${X(x + w + R * 1.2)},${Y(-R * 1.1)} L${X(x + R * 1.2)},${Y(-R * 1.1)} Z" fill="${dc.color}"/>`; }
      if (dc.type === "spine") body += `<path d="${band(-1.05, -1 + dc.w * 0.5)}" fill="${dc.color}"/>`;
      if (dc.type === "speed") for (let i = 0; i < dc.n; i++) {
        const y = dc.y + (i - (dc.n - 1) / 2) * 0.12, x0 = L * 0.1, x1 = x0 + L * dc.x * (1 - i * 0.12);
        body += `<path d="M${X(x0)},${Y(r(x0) * y)} L${X(x1)},${Y(r(x1) * y)}" stroke="${dc.color}" stroke-width="${Math.max(1, (Y(R * 0.03) - Y(0)))}" stroke-linecap="round" fill="none"/>`;
      }
    }
    // Shading, so the hull reads as round: light from above, darker below; and faint panel seams at each ring.
    // Main rings every bay, carried on into the nose and tail, with a fainter intermediate ring between each pair.
    let seams = "";
    const ring = (x, faint) => { if (x > 2.5 && x < L - 2.5) seams += `<line x1="${X(x)}" y1="${Y(-r(x))}" x2="${X(x)}" y2="${Y(r(x))}"${faint ? ' class="faint"' : ""}/>`; };
    for (let x = f.ln % 15; x < L; x += 15) { ring(x, false); ring(x + 7.5, true); }
    // Longitudinal girders showing faintly through the fabric, following the hull's taper, closer together toward the edges as on a round body.
    let girders = "";
    for (const a of [-72, -52, -34, -17, 0, 17, 34, 52, 72]) { const fy = Math.sin(a * Math.PI / 180), pts = [];
      for (let i = 2; i <= N - 2; i++) { const x = L * i / N; pts.push(`${X(x).toFixed(1)},${Y(r(x) * fy).toFixed(1)}`); }
      girders += `<polyline points="${pts.join(" ")}"/>`; }
    // Light from above and a little forward: a highlight high on the flank, falling to shadow beneath, with light thrown back along the keel.
    const shade = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.2"/><stop offset="0.05" stop-color="#000" stop-opacity="0.04"/><stop offset="0.1" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.17" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.24" stop-color="#fff" stop-opacity="0.34"/><stop offset="0.31" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.14"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.03"/><stop offset="0.6" stop-color="#000" stop-opacity="0.07"/><stop offset="0.7" stop-color="#000" stop-opacity="0.2"/><stop offset="0.8" stop-color="#000" stop-opacity="0.33"/><stop offset="0.9" stop-color="#000" stop-opacity="0.42"/><stop offset="0.96" stop-color="#000" stop-opacity="0.38"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.26"/><stop offset="0.14" stop-color="#000" stop-opacity="0"/><stop offset="0.86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.26"/></linearGradient>`;
    // The horizontal fins, seen edge-on: a slim blade along the centreline at the tail, with the elevator behind its hinge.
    let hfin = "";
    { const g = fin.side(1), len = g.x1 - g.x0, t = Math.max(0.8, D * 0.042), fx = g.x0 - len * 0.12, gp = Math.min(0.45, len * 0.02);
      const pt = (x, y) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
      hfin = `<path d="M${pt(fx, 0)} L${pt(fx + len * 0.4, -t)} L${pt(g.xr - gp, -t * 0.85)} L${pt(g.xr - gp, t * 0.85)} L${pt(fx + len * 0.4, t)} Z" fill="${finC}" class="lv-edge"/>
        <path d="M${pt(g.xr + gp, -t * 0.8)} L${pt(g.x1, -t * 0.3)} L${pt(g.x1, t * 0.3)} L${pt(g.xr + gp, t * 0.8)} Z" fill="${lv.rudders || finC}" class="lv-edge"/>
        <path d="M${pt(fx, 0)} L${pt(fx + len * 0.4, -t)} L${pt(g.xr - gp, -t * 0.85)} L${pt(g.xr - gp, 0)} Z" fill="#fff" opacity="0.16"/>`; }
    // The name and the emblems, placed where they were dragged.
    const nm = lv.name, font = FONTS[nm.font] || FONTS.deco;
    const nameSize = R * 0.34 * nm.size, nx = L * nm.x, ny = nm.y * r(nx);
    const flipped = X(1) < X(0);
    const nameSvg = nm.text ? `<text x="${X(nx)}" y="${Y(ny)}" class="lv-name"${flipped ? ' text-anchor="end"' : ""} data-drag="name" fill="${nm.color}" font-family="${font.css}" font-weight="${font.weight}"
      font-size="${(Y(nameSize) - Y(0)).toFixed(1)}" letter-spacing="${((Y(nameSize) - Y(0)) * font.spacing).toFixed(1)}" dominant-baseline="middle">${esc(nm.text.toUpperCase())}</text>` : "";
    const em = (U.state && U.state.company.emblem) || null;
    const emblems = em ? lv.emblems.map((e, i) => {
      const { x, y, m } = emblemPlace(d, f, e);
      const sz = Y(m) - Y(0);
      return `<g data-drag="emblem:${i}" class="lv-emblem">${U.emblem.svg(em, sz, `x="${(X(x) - sz / 2).toFixed(1)}" y="${(Y(y) - sz / 2).toFixed(1)}" style="width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px"`)}</g>`;
    }).join("") : "";
    // Gondolas in their colors.
    const car = carShape(d, f, X, Y, r, d.systems && d.systems.gondola ? (lv.gondolas || lv.car) : lv.car);
    // Windows along the hull wherever there are passenger decks: one row for each deck, low on the hull.
    let hullWins = "";
    for (const [b0, m] of Object.entries((d.systems || {}).modules || {})) {
      if (m !== "passenger" || +b0 > d.bays) continue;
      const a = f.ln + (+b0 - 1) * 15, rows = ((d.systems.deckCount || {})[b0] || 1) > 1 && d.D >= P().TWO_DECKS ? [0.62, 0.44] : [0.62];
      for (const fy of rows) for (let x = a + 0.9; x < a + 13.4; x += 2.1) hullWins += `<rect x="${Math.min(X(x), X(x + 1.6))}" y="${Y(r(x) * fy)}" width="${Math.abs(X(1.6) - X(0))}" height="${Math.max(1, Y(D * 0.05) - Y(0))}" class="lv-hullwin"/>`;
    }
    const engines = d.systems.engines.map(e => engineShape(P().bayCentre(d, f.ln, e.bay), e.mount, r, X, Y, D, lv.engines)).join("");
    return `<defs><clipPath id="${id}c"><path d="${outline}"/></clipPath>${shade}</defs>
      ${fins}${finDeco}${finRibs}
      <g clip-path="url(#${id}c)">${body}<path d="${outline}" fill="url(#${id}s)"/><path d="${outline}" fill="url(#${id}h)"/><g class="lv-girders">${girders}</g><g class="lv-seams">${seams}</g>${hullWins}</g>
      <path d="${outline}" class="lv-outline"/>${hfin}${car}${engines}${nameSvg}${emblems}`;
  }
  // The fins as shapes, shared by the side and top views.
  // Where an emblem is drawn in the side view, and how large (metres). On the hull it lies where it was dragged; off the
  // hull means on a fin, where it is held within the fixed part of the upper or lower fin and made to fit.
  function emblemPlace(d, f, e) {
    const L = f.L, R = d.D / 2, r = x => P().radius(d, x);
    let x = L * e.x, y = emblemY(e, r(x), R), m = R * 0.55 * e.size;
    if (Math.abs(e.y) > 1) {
      const s0 = Math.sign(e.y), g = finShapes(d, f).side(s0), len = g.x1 - g.x0, a = g.apex, b = g.xr - 0.4;
      m = Math.min(m, (b - a) * 0.86);
      x = Math.max(a + m / 2, Math.min(b - m / 2, x));
      const hull = Math.max(r(Math.min(x - m / 2, L - 0.01)), r(Math.min(x + m / 2, L - 0.01))), room = Math.abs(g.tip) - hull;
      m = Math.min(m, room * 0.84); x = Math.max(a + m / 2, Math.min(b - m / 2, x));
      y = s0 * (hull + room / 2);
    }
    return { x, y, m };
  }
  function finShapes(d, f) {
    const L = f.L, D = d.D, r = x => P().radius(d, x);
    const len = f.lt * (d.fins === "large" ? 0.72 : 0.6), xe = L - f.lt * (d.tail === "cruciform" ? -0.04 : 0.1), xs = xe - len;
    const proj = D * (d.fins === "large" ? 0.3 : d.fins === "twin" ? 0.17 : 0.22);
    const apex = 0.46, rf = 0.3;
    return { x0: xs, x1: xe, proj, side(s) {
      // A fixed fin swept back from the hull to its tip, and behind it, across a narrow gap at the hinge, the moving surface.
      const rr = x => r(Math.max(0, Math.min(x, L - 0.01)));
      const tip = s * (r(xs) * 0.92 + proj), xr = xe - len * rf, gap = Math.min(0.45, len * 0.02);
      const out = { x0: xs, x1: xe, xr, tip, apex: xs + len * apex, root: s * r(xs), span: proj + r(xs) * 0.2,
        fin: [[xs, s * r(xs) * 0.96], [xs + len * apex, tip], [xr - gap, tip], [xr - gap, s * rr(xr - gap) * 0.9]],
        rud: [[xr + gap, s * rr(xr + gap) * 0.9], [xr + gap, tip], [xe - len * 0.06, tip], [xe, s * (Math.abs(tip) - proj * 0.24)], [xe, s * rr(xe) * 0.9]] };
      if (d.fins === "twin") { const a = xs - len * 0.55, b = xs - len * 0.05, t2 = s * (r(a) * 0.92 + proj * 0.9); out.twin = [[a, s * r(a)], [a + (b - a) * 0.42, t2], [b, t2], [b, s * r(b)]]; }
      return out;
    } };
  }
  function carShape(d, f, X, Y, r, color) {
    // With a gondola, the control car runs on aft beneath the gondola's bays: one long car, control room forward.
    const g = d.systems && d.systems.gondola;
    const D = d.D, a = f.ln + 1, b = g ? f.ln + g.len * 15 - 1 : f.ln + Math.min(14, f.mid - 1), h = g ? Math.max(3, D * 0.15) : Math.max(2.4, D * 0.11), yb = r(a + 3);
    const top = d.car === "recessed" ? yb - h * 0.5 : yb, bottom = top + h;
    // A shaped car: an upright bow rounded under like a boat's, a flat keel, and a long fairing up into the hull aft; a row of separate panes.
    const px = Y(1) - Y(0), pt = (x, y) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
    const w0 = a + 0.55, w1 = b - h * 1.25, wh = Math.min(h * 0.32, 1), pw = Math.max(1.3, wh * 1.45), step = pw + 0.42, n = Math.max(2, Math.floor((w1 - w0 + (step - pw)) / step)), wy = top + h * 0.2;
    const inset = 0;
    let wins = "";
    for (let i = 0; i < n; i++) { const x = w0 + inset + i * step; wins += `<rect ${span(X(x), X(x + pw))} y="${Y(wy).toFixed(1)}" height="${Math.max(1.2, wh * px).toFixed(1)}" rx="${(0.12 * px).toFixed(2)}" class="lv-glass"/>`; }
    const belly = `<path d="M${pt(a, top + h * 0.72)} L${pt(b, top + h * 0.72)} L${pt(b, bottom + 1)} L${pt(a, bottom + 1)} Z" fill="#000" opacity="0.14"/><line x1="${X(a)}" y1="${Y(top + h * 0.72)}" x2="${X(b - h * 0.5)}" y2="${Y(top + h * 0.72)}" class="lv-wire"/>`;
    const shape = d.car === "streamlined" && !g
      ? `M${X(a)},${Y(top)} C${X(a - 2)},${Y(bottom)} ${X(a + 4)},${Y(bottom + 1)} ${X(a + 8)},${Y(bottom)} L${X(b)},${Y(top + h * 0.45)} L${X(b)},${Y(top)} Z`
      : `M${pt(a, top)} L${pt(a, top + h * 0.6)} Q${pt(a, bottom)} ${pt(a + h * 0.8, bottom)} L${pt(b - h * 1.5, bottom)} Q${pt(b - h * 0.5, bottom)} ${pt(b, top)} Z`;
    const cid = "lvc" + (++uid);
    // A bumper under the bow, for landing.
    const bump = `<path d="M${pt(a + h * 0.7, bottom)} Q${pt(a + h * 1.1, bottom + h * 0.28)} ${pt(a + h * 1.5, bottom)} Z" fill="#4a3f33" class="lv-edge"/>`;
    return `${bump}<clipPath id="${cid}"><path d="${shape}"/></clipPath><path d="${shape}" fill="${color}"/><g clip-path="url(#${cid})">${belly}${d.car === "streamlined" && !g ? "" : wins}</g><path d="${shape}" fill="none" class="lv-edge"/>`;
  }
  function engineShape(x, mount, r, X, Y, D, color) {
    // An engine car: an egg-shaped gondola, radiator in its nose, hung beneath the hull on struts braced with wires, a ladder up
    // into the ship, and a two-bladed wooden propeller behind.
    const h = Math.max(2.8, D * 0.13), len = h * 2.7, yb = mount === "sides" ? r(x) * 0.5 : r(x) + D * 0.1, yc = yb + h / 2, y0 = yb, y1 = yb + h;
    const s0 = mount === "sides" ? r(x) * 0.3 : r(x) * 0.985, px = Y(1) - Y(0), xf = x - len / 2, xt = x + len * 0.42, xp = xt + len * 0.07;
    const pt = (px0, py0) => `${X(px0).toFixed(1)},${Y(py0).toFixed(1)}`, ln = (x1, yy1, x2, y2, c) => `<line x1="${X(x1).toFixed(1)}" y1="${Y(yy1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(y2).toFixed(1)}" class="${c}"/>`;
    const pod = `M${pt(xf, yc - h * 0.05)} C${pt(xf, y0 + h * 0.12)} ${pt(xf + len * 0.1, y0)} ${pt(xf + len * 0.28, y0)} L${pt(xf + len * 0.56, y0)} C${pt(xf + len * 0.78, y0)} ${pt(xt, yc - h * 0.3)} ${pt(xt, yc - h * 0.17)} L${pt(xt, yc + h * 0.17)} C${pt(xt, yc + h * 0.34)} ${pt(xf + len * 0.74, y1)} ${pt(xf + len * 0.48, y1)} L${pt(xf + len * 0.26, y1)} C${pt(xf + len * 0.08, y1)} ${pt(xf, y1 - h * 0.18)} ${pt(xf, yc - h * 0.05)} Z`;
    const cid = "lve" + (++uid), R = Math.max(1.7, h * 0.82), bw = 0.26;
    const blade = sg => `<path d="M${pt(xp, yc)} Q${pt(xp - bw, yc + sg * R * 0.55)} ${pt(xp, yc + sg * R)} Q${pt(xp + bw * 1.3, yc + sg * R * 0.5)} ${pt(xp, yc)} Z" class="lv-blade"/>`;
    let ladder = ln(xf + len * 0.4, s0, xf + len * 0.4, y0, "lv-wire") + ln(xf + len * 0.4 + 0.4, s0, xf + len * 0.4 + 0.4, y0, "lv-wire");
    for (let y = s0 + 0.35; y < y0 - 0.1; y += 0.4) ladder += ln(xf + len * 0.4, y, xf + len * 0.4 + 0.4, y, "lv-wire");
    return `${ln(xf + len * 0.16, s0, xf + len * 0.26, y0, "lv-strut")}${ln(xf + len * 0.7, s0, xf + len * 0.58, y0, "lv-strut")}
      ${ln(xf + len * 0.16, s0, xf + len * 0.58, y0, "lv-wire")}${ln(xf + len * 0.7, s0, xf + len * 0.26, y0, "lv-wire")}${ln(xf - len * 0.12, s0, xf + len * 0.08, y0 + h * 0.1, "lv-wire")}${ladder}
      <clipPath id="${cid}"><path d="${pod}"/></clipPath><path d="${pod}" fill="${color}"/>
      <g clip-path="url(#${cid})"><rect ${span(X(xf), X(xt))} y="${Y(yc + h * 0.14)}" height="${(h * px).toFixed(1)}" fill="#000" opacity="0.2"/><rect ${span(X(xf), X(xt))} y="${Y(y0)}" height="${(h * 0.16 * px).toFixed(1)}" fill="#fff" opacity="0.28"/>
        ${[0.035, 0.065, 0.095].map(k => ln(xf + len * k, y0, xf + len * k, y1, "lv-wire")).join("")}${ln(xf, yc + h * 0.14, xt, yc + h * 0.14, "lv-wire")}</g>
      <rect ${span(X(xf + len * 0.2), X(xf + len * 0.2 + 0.8))} y="${Y(yc - h * 0.26)}" height="${(h * 0.26 * px).toFixed(1)}" rx="${(0.1 * px).toFixed(2)}" class="lv-glass"/><rect ${span(X(xf + len * 0.2 + 1.1), X(xf + len * 0.2 + 1.9))} y="${Y(yc - h * 0.26)}" height="${(h * 0.26 * px).toFixed(1)}" rx="${(0.1 * px).toFixed(2)}" class="lv-glass"/>
      <path d="${pod}" fill="none" class="lv-edge"/>
      ${blade(-1)}${blade(1)}<path d="M${pt(xt, yc - h * 0.17)} L${pt(xp + len * 0.07, yc)} L${pt(xt, yc + h * 0.17)} Z" class="lv-hub"/>`;
  }

  // The top view, as seen on the map: only what shows from above.
  function top(d, f, X, Y) {
    const lv = d.livery, L = f.L, R = d.D / 2, r = x => P().radius(d, x), id = "lt" + (++uid), N = 120;
    const a = [], b = [];
    for (let i = 0; i <= N; i++) { const x = L * i / N; a.push(`${X(x).toFixed(1)},${Y(-r(x)).toFixed(1)}`); b.push(`${X(x).toFixed(1)},${Y(r(x)).toFixed(1)}`); }
    const outline = `M${a.join(" L")} L${b.slice().reverse().join(" L")} Z`;
    const vband = (x0, x1, c) => `<rect ${span(X(x0), X(x1))} y="${Y(-R * 1.05)}" height="${Y(R * 1.05) - Y(-R * 1.05)}" fill="${c}"/>`;
    // Seen from above, a line at height y on the flank sits at +/- sqrt(1 - y^2) across the hull, if it is on the upper half.
    const lateral = y => Math.sqrt(Math.max(0, 1 - y * y));
    const pair = (y, t, c) => {
      if (y > 0.05) return "";
      const w = lateral(y), band = (s) => { const p = [], q = []; for (let i = 0; i <= N; i++) { const x = L * i / N; p.push(`${X(x).toFixed(1)},${Y(s * r(x) * (w - t * 0.6)).toFixed(1)}`); q.push(`${X(x).toFixed(1)},${Y(s * r(x) * Math.min(1, w + t * 0.6)).toFixed(1)}`); } return `<path d="M${p.join(" L")} L${q.reverse().join(" L")} Z" fill="${c}"/>`; };
      return band(-1) + band(1);
    };
    const fin = finShapes(d, f);
    const g = fin.side(-1), hf = g.fin;
    const finPath = s => `M${hf.map(p => `${X(p[0])},${Y(s * Math.abs(p[1]))}`).join(" L")} Z`;
    const rud = s => `M${g.rud.map(p => `${X(p[0])},${Y(s * Math.abs(p[1]))}`).join(" L")} Z`;
    let fins = `<path d="${finPath(-1)}" fill="${lv.fins}" class="lv-edge"/><path d="${finPath(1)}" fill="${lv.fins}" class="lv-edge"/>
      <path d="${rud(-1)}" fill="${lv.rudders || lv.fins}" class="lv-edge"/><path d="${rud(1)}" fill="${lv.rudders || lv.fins}" class="lv-edge"/>`;
    // Ribs across the horizontal fins.
    { const n = Math.max(4, Math.round((g.x1 - g.x0) / 5)); fins += `<clipPath id="${id}r"><path d="${finPath(-1)} ${finPath(1)} ${rud(-1)} ${rud(1)}"/></clipPath><g clip-path="url(#${id}r)" class="lv-ribs">`;
      for (let i = 1; i < n; i++) { const x = g.x0 + (g.x1 - g.x0) * i / n; fins += `<line x1="${X(x)}" y1="${Y(-Math.abs(g.tip) * 1.05)}" x2="${X(x)}" y2="${Y(Math.abs(g.tip) * 1.05)}"/>`; }
      fins += `</g>`; }
    // Rings and girders seen from above.
    let seams = "", girders = "";
    for (let x = f.ln % 15; x < L; x += 15) if (x > 2.5 && x < L - 2.5) seams += `<line x1="${X(x)}" y1="${Y(-r(x))}" x2="${X(x)}" y2="${Y(r(x))}"/>`;
    for (const a of [-60, -36, -17, 17, 36, 60]) { const fy = Math.sin(a * Math.PI / 180), pts = []; for (let i = 2; i <= N - 2; i++) { const x = L * i / N; pts.push(`${X(x).toFixed(1)},${Y(r(x) * fy).toFixed(1)}`); } girders += `<polyline points="${pts.join(" ")}"/>`; }
    let body = `<rect ${span(X(-2), X(L + 2))} y="${Y(-R * 1.1)}" height="${Y(R * 1.1) - Y(-R * 1.1)}" fill="${lv.hull}"/>`;
    if (lv.twoTone && lv.split < 0) body += pair(lv.split, 2, lv.lower);
    if (lv.nose) body += vband(-2, f.ln * 0.42, lv.nose);
    if (lv.tail) body += vband(L - f.lt * 0.3, L + 2, lv.tail);
    for (const dc of lv.decorations) {
      if (dc.type === "cheat") body += pair(dc.y, dc.t, dc.color);
      if (dc.type === "bow" || dc.type === "stern") for (let i = 0; i < dc.n; i++) { const x = L * (dc.x + i * dc.w * 2.2); body += vband(x, x + L * dc.w, dc.color); }
      if (dc.type === "chevron") for (let i = 0; i < dc.n; i++) { const x0 = L * (0.015 + i * dc.w * 2.4), depth = L * dc.x, w = L * dc.w;
        body += `<path d="M${X(x0)},${Y(0)} L${X(x0 + depth)},${Y(-R * 1.1)} L${X(x0 + depth + w)},${Y(-R * 1.1)} L${X(x0 + w)},${Y(0)} L${X(x0 + depth + w)},${Y(R * 1.1)} L${X(x0 + depth)},${Y(R * 1.1)} Z" fill="${dc.color}"/>`; }
      if (dc.type === "sun") { const len = L * dc.x; for (let i = 0; i < dc.n; i++) { const a0 = -Math.PI / 2 + Math.PI * i / dc.n, a1 = a0 + Math.PI / dc.n / 2;
        body += `<path d="M${X(0)},${Y(0)} L${X(len * Math.cos(a0) + len)},${Y(R * 1.2 * Math.sin(a0))} L${X(len * Math.cos(a1) + len)},${Y(R * 1.2 * Math.sin(a1))} Z" fill="${dc.color}"/>`; } }
      if (dc.type === "flash") { const x = L * dc.x, w = L * dc.w; body += vband(x, x + w, dc.color); }
      if (dc.type === "spine") { const p = [], q = []; for (let i = 0; i <= N; i++) { const x = L * i / N; p.push(`${X(x).toFixed(1)},${Y(-r(x) * dc.w).toFixed(1)}`); q.push(`${X(x).toFixed(1)},${Y(r(x) * dc.w).toFixed(1)}`); } body += `<path d="M${p.join(" L")} L${q.reverse().join(" L")} Z" fill="${dc.color}"/>`; }
      if (dc.type === "speed" && dc.y < 0) for (let i = 0; i < dc.n; i++) { const y = dc.y + (i - (dc.n - 1) / 2) * 0.12, w = lateral(y), x0 = L * 0.1, x1 = x0 + L * dc.x * (1 - i * 0.12);
        for (const s of [-1, 1]) body += `<path d="M${X(x0)},${Y(s * r(x0) * w)} L${X(x1)},${Y(s * r(x1) * w)}" stroke="${dc.color}" stroke-width="${Math.max(0.6, Y(R * 0.03) - Y(0))}" fill="none"/>`; }
    }
    // The upper fin, seen edge-on, as a line along the spine.
    const spineFin = `<path d="M${X(fin.x0)},${Y(0)} L${X(fin.x1)},${Y(0)}" stroke="${lv.fins}" stroke-width="${Math.max(1, Y(R * 0.06) - Y(0))}"/>`;
    // Emblems as seen from above. One painted high on the flank is seen at a slant: squeezed across the hull
    // (the steeper the flank, the more), with its top toward the spine, so the one on the far side appears turned around.
    // Fin emblems sit flat on the horizontal fins, top outward, and are sized to fit.
    // Bow on the left: the port side is at the bottom of the view, the starboard side at the top.
    const em = (U.state && U.state.company.emblem) || null;
    let emblems = "", hullEmblems = "";
    const placed = (cx, cy, sz, rot, squash) => `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot}) scale(1 ${squash.toFixed(3)})">${U.emblem.svg(em, sz, `x="${(-sz / 2).toFixed(1)}" y="${(-sz / 2).toFixed(1)}" style="width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px"`)}</g>`;
    if (em) for (const e of lv.emblems) {
      const sz = Y(R * 0.55 * e.size) - Y(0);
      if (Math.abs(e.y) > 1) {
        // The horizontal fin's middle, and room enough for the emblem to lie within it.
        const fx = fin.x0 + (fin.x1 - fin.x0) * 0.58, root = r(fx), span = fin.proj;
        const fs = Math.min(sz, (Y(span * 0.8) - Y(0)), (X(fin.x1) - X(fin.x0)) * 0.45);
        for (const side of [1, -1]) emblems += placed(X(fx), Y(side * (root + span * 0.5)), fs, side > 0 ? 180 : 0, 1);
      } else if (e.y < -0.3) {
        const x = L * e.x, up = -e.y, w = lateral(e.y) * r(x);                  // up: how near the top of the hull it sits
        for (const side of [1, -1]) hullEmblems += placed(X(x), Y(side * w), sz, side > 0 ? 0 : 180, Math.max(0.15, up));
      }
    }
    const shade = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.4"/><stop offset="0.16" stop-color="#000" stop-opacity="0.12"/><stop offset="0.36" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.34"/><stop offset="0.64" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.84" stop-color="#000" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.24"/><stop offset="0.14" stop-color="#000" stop-opacity="0"/><stop offset="0.86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.24"/></linearGradient>`;
    return `<defs><clipPath id="${id}c"><path d="${outline}"/></clipPath>${shade}</defs>${fins}
      ${(d.systems && d.systems.engines || []).map(e => { const x = P().bayCentre(d, f.ln, e.bay), w = Math.max(3, d.D * 0.24), ry = Math.max(1.2, d.D * 0.05);
        // Engine cars seen from above: out on struts either side of the hull.
        const h = Math.max(2.8, d.D * 0.13), len = h * 2.7, hw = h * 0.36, xf = x - len / 2, xt = x + len * 0.42, xp = xt + len * 0.07, pr = Math.max(1.7, h * 0.82);
        return [1, -1].map(sd => { const yc = sd * (r(x) + d.D * 0.1 + hw);
          return `<line x1="${X(xf + len * 0.26)}" y1="${Y(sd * r(x) * 0.9)}" x2="${X(xf + len * 0.26)}" y2="${Y(yc)}" class="lv-strut"/><line x1="${X(xf + len * 0.58)}" y1="${Y(sd * r(x) * 0.9)}" x2="${X(xf + len * 0.58)}" y2="${Y(yc)}" class="lv-strut"/>
            <path d="M${X(xf)},${Y(yc)} C${X(xf)},${Y(yc - hw)} ${X(xf + len * 0.1)},${Y(yc - hw)} ${X(xf + len * 0.28)},${Y(yc - hw)} L${X(xf + len * 0.56)},${Y(yc - hw)} C${X(xf + len * 0.8)},${Y(yc - hw)} ${X(xt)},${Y(yc - hw * 0.6)} ${X(xt)},${Y(yc - hw * 0.4)} L${X(xp + len * 0.07)},${Y(yc)} L${X(xt)},${Y(yc + hw * 0.4)} C${X(xt)},${Y(yc + hw * 0.6)} ${X(xf + len * 0.8)},${Y(yc + hw)} ${X(xf + len * 0.56)},${Y(yc + hw)} L${X(xf + len * 0.28)},${Y(yc + hw)} C${X(xf + len * 0.1)},${Y(yc + hw)} ${X(xf)},${Y(yc + hw)} ${X(xf)},${Y(yc)} Z" fill="${lv.engines || "#b9bcbd"}" class="lv-edge"/>
            <line x1="${X(xp)}" y1="${Y(yc - pr)}" x2="${X(xp)}" y2="${Y(yc + pr)}" class="lv-prop-top"/>`; }).join(""); }).join("")}
      <g clip-path="url(#${id}c)">${body}${hullEmblems}<path d="${outline}" fill="url(#${id}s)"/><path d="${outline}" fill="url(#${id}h)"/><g class="lv-girders">${girders}</g><g class="lv-seams">${seams}</g></g><path d="${outline}" class="lv-outline"/>${spineFin}${emblems}`;
  }
  // On the hull, y is a share of the local radius; beyond +/-1 it is on a fin, measured out from the hull's surface in radii.
  const emblemY = (e, rx, R) => Math.abs(e.y) <= 1 ? e.y * rx : Math.sign(e.y) * (rx + (Math.abs(e.y) - 1) * R);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function gondolaShape(d, f, X, Y, r, col) {
    const g = d.systems && d.systems.gondola; if (!g) return "";
    const a = f.ln + (g.bay - 1) * 15 + 1, b = f.ln + (g.bay - 1 + g.len) * 15 - 1, top = r((a + b) / 2) * 0.96, h = Math.max(3, d.D * 0.16);
    let wins = ""; for (let x = a + 2.5; x < b - 2; x += 3) wins += `<rect x="${Math.min(X(x), X(x + 1.6))}" y="${Y(top + h * 0.3)}" width="${Math.abs(X(1.6) - X(0))}" height="${Y(h * 0.32) - Y(0)}" fill="#cfe1ea"/>`;
    return `<g class="lv-gondola"><rect x="${Math.min(X(a), X(b))}" y="${Y(top)}" width="${Math.abs(X(b) - X(a))}" height="${Y(h) - Y(0)}" rx="${Math.min(8, (Y(h) - Y(0)) * 0.45)}" fill="${col}" class="lv-edge"/>${wins}</g>`;
  }
  U.livery = { builders, emblemY, emblemPlace, PALETTE, FONTS, DECOR, fresh, presets, applyPreset, side, top, finShapes };
})(window.UpShip);
