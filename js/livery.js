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
      decorations: [{ type: "cheat", color: e.c1, y: 0.2, t: 0.05, flag: false }],
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
    let seams = "";
    for (let b = 0; b <= d.bays; b++) { const x = f.ln + b * 15; seams += `<line x1="${X(x)}" y1="${Y(-r(x))}" x2="${X(x)}" y2="${Y(r(x))}"/>`; }
    const shade = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></linearGradient>`;
    // The name and the emblems, placed where they were dragged.
    const nm = lv.name, font = FONTS[nm.font] || FONTS.deco;
    const nameSize = R * 0.34 * nm.size, nx = L * nm.x, ny = nm.y * r(nx);
    const flipped = X(1) < X(0);
    const nameSvg = nm.text ? `<text x="${X(nx)}" y="${Y(ny)}" class="lv-name"${flipped ? ' text-anchor="end"' : ""} data-drag="name" fill="${nm.color}" font-family="${font.css}" font-weight="${font.weight}"
      font-size="${(Y(nameSize) - Y(0)).toFixed(1)}" letter-spacing="${((Y(nameSize) - Y(0)) * font.spacing).toFixed(1)}" dominant-baseline="middle">${esc(nm.text.toUpperCase())}</text>` : "";
    const em = (U.state && U.state.company.emblem) || null;
    const emblems = em ? lv.emblems.map((e, i) => {
      const x = L * e.x, y = emblemY(e, r(x), R), sz = (Y(R * 0.55 * e.size) - Y(0));
      return `<g data-drag="emblem:${i}" class="lv-emblem">${U.emblem.svg(em, sz, `x="${(X(x) - sz / 2).toFixed(1)}" y="${(Y(y) - sz / 2).toFixed(1)}" style="width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px"`)}</g>`;
    }).join("") : "";
    // Gondolas in their colors.
    const car = carShape(d, f, X, Y, r, d.systems && d.systems.gondola ? (lv.gondolas || lv.car) : lv.car);
    // Windows along the hull wherever there are passenger decks: one row for each deck, low on the hull.
    let hullWins = "";
    for (const [b0, m] of Object.entries((d.systems || {}).modules || {})) {
      if (m !== "passenger" || +b0 > d.bays) continue;
      const a = f.ln + (+b0 - 1) * 15, rows = ((d.systems.deckCount || {})[b0] || 1) > 1 && d.D >= P().TWO_DECKS ? [0.62, 0.44] : [0.62];
      for (const fy of rows) for (let x = a + 1.2; x < a + 14; x += 2.5) hullWins += `<rect x="${Math.min(X(x), X(x + 1.4))}" y="${Y(r(x) * fy)}" width="${Math.abs(X(1.4) - X(0))}" height="${Math.max(1, Y(D * 0.035) - Y(0))}" class="lv-hullwin"/>`;
    }
    const engines = d.systems.engines.map(e => engineShape(P().bayCentre(d, f.ln, e.bay), e.mount, r, X, Y, D, lv.engines)).join("");
    return `<defs><clipPath id="${id}c"><path d="${outline}"/></clipPath>${shade}</defs>
      ${fins}${finDeco}
      <g clip-path="url(#${id}c)">${body}${hullWins}<path d="${outline}" fill="url(#${id}s)"/><g class="lv-seams">${seams}</g></g>
      <path d="${outline}" class="lv-outline"/>${car}${engines}${nameSvg}${emblems}`;
  }
  // The fins as shapes, shared by the side and top views.
  function finShapes(d, f) {
    const L = f.L, D = d.D, r = x => P().radius(d, x);
    const len = f.lt * (d.fins === "large" ? 0.72 : 0.6), xe = L - f.lt * (d.tail === "cruciform" ? -0.04 : 0.1), xs = xe - len;
    const proj = D * (d.fins === "large" ? 0.3 : d.fins === "twin" ? 0.17 : 0.22);
    return { x0: xs, x1: xe, proj, side(s) {
      const tip = s * (r(xs) * 0.92 + proj), xr = xe - len * 0.28;
      const out = { x0: xs, x1: xe, root: s * r(xs), span: proj + r(xs) * 0.2,
        fin: [[xs, s * r(xs)], [xs + len * 0.42, tip], [xe, tip], [xe, s * r(Math.min(xe, L))]],
        rud: [[xr, s * r(xr)], [xr, tip], [xe, tip], [xe, s * r(Math.min(xe, L))]] };
      if (d.fins === "twin") { const a = xs - len * 0.55, b = xs - len * 0.05, t2 = s * (r(a) * 0.92 + proj * 0.9); out.twin = [[a, s * r(a)], [a + (b - a) * 0.42, t2], [b, t2], [b, s * r(b)]]; }
      return out;
    } };
  }
  function carShape(d, f, X, Y, r, color) {
    // With a gondola, the control car runs on aft beneath the gondola's bays: one long car, control room forward.
    const g = d.systems && d.systems.gondola;
    const D = d.D, a = f.ln + 1, b = g ? f.ln + g.len * 15 - 1 : f.ln + Math.min(14, f.mid - 1), h = g ? Math.max(3, D * 0.15) : Math.max(2.4, D * 0.11), yb = r(a + 3);
    const top = d.car === "recessed" ? yb - h * 0.5 : yb, bottom = top + h;
    const wins = Array.from({ length: Math.max(3, Math.floor((b - a) / 2.2)) }, (_, i) => `<rect x="${Math.min(X(a + 1.5 + i * 2.2), X(a + 2.7 + i * 2.2))}" y="${Y(top + h * 0.25)}" width="${Math.max(1.5, Math.abs(X(1.2) - X(0)))}" height="${Math.max(1.5, Y(h * 0.3) - Y(0))}" class="lv-win"/>`).join("");
    if (d.car === "streamlined" && !g) return `<path d="M${X(a)},${Y(top)} C${X(a - 2)},${Y(bottom)} ${X(a + 4)},${Y(bottom + 1)} ${X(a + 8)},${Y(bottom)} L${X(b)},${Y(top + h * 0.45)} L${X(b)},${Y(top)} Z" fill="${color}" class="lv-edge"/>`;
    return `<rect ${span(X(a), X(b))} y="${Y(top)}" height="${Y(h) - Y(0)}" rx="${Math.min(6, (Y(h) - Y(0)) * 0.35)}" fill="${color}" class="lv-edge"/>${wins}`;
  }
  function engineShape(x, mount, r, X, Y, D, color) {
    const len = Math.max(5, D * 0.26), h = Math.max(1.8, D * 0.08), yb = mount === "sides" ? r(x) * 0.5 : r(x) + D * 0.1;
    const s0 = mount === "sides" ? r(x) * 0.3 : r(x) * 0.98;
    return `<line x1="${X(x - len * 0.2)}" y1="${Y(s0)}" x2="${X(x - len * 0.2)}" y2="${Y(yb)}" class="lv-strut"/><line x1="${X(x + len * 0.25)}" y1="${Y(s0)}" x2="${X(x + len * 0.25)}" y2="${Y(yb)}" class="lv-strut"/>
      <path d="M${X(x - len / 2)},${Y(yb + h / 2)} C${X(x - len / 2)},${Y(yb - h * 0.2)} ${X(x + len * 0.3)},${Y(yb - h * 0.1)} ${X(x + len / 2)},${Y(yb + h / 2)} C${X(x + len * 0.3)},${Y(yb + h * 1.1)} ${X(x - len / 2)},${Y(yb + h * 1.2)} ${X(x - len / 2)},${Y(yb + h / 2)} Z" fill="${color}" class="lv-edge"/>
      <ellipse cx="${X(x - len / 2 - 0.6)}" cy="${Y(yb + h / 2)}" rx="${Math.max(0.8, Math.abs(X(0.35) - X(0)))}" ry="${Y(h * 1.4) - Y(0)}" class="lv-prop"/>`;
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
    const g = fin.side(-1), hf = [[g.fin[0][0], -r(g.fin[0][0])], [g.fin[1][0], g.fin[1][1]], [g.fin[2][0], g.fin[2][1]], [g.fin[3][0], g.fin[3][1]]];
    const finPath = s => `M${hf.map(p => `${X(p[0])},${Y(s * Math.abs(p[1]))}`).join(" L")} Z`;
    const rud = s => `M${g.rud.map(p => `${X(p[0])},${Y(s * Math.abs(p[1]))}`).join(" L")} Z`;
    let fins = `<path d="${finPath(-1)}" fill="${lv.fins}" class="lv-edge"/><path d="${finPath(1)}" fill="${lv.fins}" class="lv-edge"/>
      <path d="${rud(-1)}" fill="${lv.rudders || lv.fins}" class="lv-edge"/><path d="${rud(1)}" fill="${lv.rudders || lv.fins}" class="lv-edge"/>`;
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
    const shade = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.3"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.65" stop-color="#fff" stop-opacity="0.18"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>`;
    return `<defs><clipPath id="${id}c"><path d="${outline}"/></clipPath>${shade}</defs>${fins}
      ${(d.systems && d.systems.engines || []).map(e => { const x = P().bayCentre(d, f.ln, e.bay), w = Math.max(3, d.D * 0.24), ry = Math.max(1.2, d.D * 0.05);
        // Engine cars seen from above: out on struts either side of the hull.
        return [1, -1].map(sd => `<line x1="${X(x)}" y1="${Y(sd * r(x) * 0.9)}" x2="${X(x)}" y2="${Y(sd * (r(x) + d.D * 0.1))}" stroke="#5a5650" stroke-width="0.8"/><ellipse cx="${X(x)}" cy="${Y(sd * (r(x) + d.D * 0.12))}" rx="${Math.abs(X(w / 2) - X(0))}" ry="${Math.abs(Y(ry) - Y(0))}" fill="${lv.engines || "#b9bcbd"}" class="lv-edge"/>`).join(""); }).join("")}
      <g clip-path="url(#${id}c)">${body}${hullEmblems}<path d="${outline}" fill="url(#${id}s)"/></g><path d="${outline}" class="lv-outline"/>${spineFin}${emblems}`;
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
  U.livery = { builders, emblemY, PALETTE, FONTS, DECOR, fresh, presets, applyPreset, side, top, finShapes };
})(window.UpShip);
