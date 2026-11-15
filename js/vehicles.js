// Vehicles on and around a grand terminal, drawn as small solids in the bird's-eye view: buses, goods vans, gas carts,
// trams on the road, trains on the railway, and the stern carriages on stub-mast tracks. Each changes with the decade:
// the early 1920s, the late 1920s and early 1930s, and the streamlined later 1930s.
window.UpShip = window.UpShip || {};
(function (U) {
  const INK = "#3a2f22", CREAM = "#efe6d0", GLASS = "#4c5a62", TYRE = "#2b2722", IRON = "#3f3d39";
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const shade = (c, f) => "#" + hex(c).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("");
  const eraOf = year => year < 1925 ? 0 : year < 1935 ? 1 : 2;

  // A vehicle's own frame: u runs along it (forward is +u), v across, z up; x, y and the heading place it on the site.
  function frame(H, x, y, ang) {
    const { poly, line, facef, visible, depth } = H, c = Math.cos(ang), s = Math.sin(ang);
    const W = (u, v, z) => [x + c * u - s * v, y + s * u + c * v, z];
    const N = { "+u": [c, s], "-u": [-c, -s], "+v": [-s, c], "-v": [s, -c] }, vis = k => visible(...N[k]);
    const sv = vis("+v") ? 1 : -1, fu = vis("+u") ? 1 : vis("-u") ? -1 : 0;
    const parts = [], foot = [];
    const F = {
      W, sv, fu, poly, line,
      // A box, with whatever is painted on its visible faces.
      box(u0, u1, v0, v1, z0, z1, col, o = {}) {
        const out = [], q = { "+u": [[u1, v0], [u1, v1]], "-u": [[u0, v1], [u0, v0]], "+v": [[u1, v1], [u0, v1]], "-v": [[u0, v0], [u1, v0]] };
        for (const k of ["-u", "+u", "-v", "+v"]) if (vis(k)) { const [[a, b], [c2, d2]] = q[k]; out.push(poly([W(a, b, z0), W(c2, d2, z0), W(c2, d2, z1), W(a, b, z1)], shade(col, facef(...N[k])), INK, 0.35)); }
        if (o.top !== false) out.push(poly([W(u0, v0, z1), W(u1, v0, z1), W(u1, v1, z1), W(u0, v1, z1)], o.top || shade(col, 1.08), INK, 0.35));
        if (o.paint) out.push(o.paint);
        parts.push([depth(...W((u0 + u1) / 2, (v0 + v1) / 2, 0).slice(0, 2)) - (o.lift || 0), out.join("")]);
        if (z0 < 1.5) foot.push([u0, u1, v0, v1, z1]);
      },
      // Panes along the side we can see, and on the front or back when it faces us.
      side(u0, u1, z0, z1, hw, col) { return poly([W(u0, sv * (hw + 0.02), z0), W(u1, sv * (hw + 0.02), z0), W(u1, sv * (hw + 0.02), z1), W(u0, sv * (hw + 0.02), z1)], col || GLASS); },
      panes(u0, u1, z0, z1, hw, n, gap) { const out = [], w = (u1 - u0) / n; for (let k = 0; k < n; k++) out.push(F.side(u0 + k * w + (gap || 0.12), u0 + (k + 1) * w - (gap || 0.12), z0, z1, hw)); return out.join(""); },
      endPane(u, v0, v1, z0, z1, col) { if (!fu || Math.sign(u) !== fu) return ""; return poly([W(u + fu * 0.02, v0, z0), W(u + fu * 0.02, v1, z0), W(u + fu * 0.02, v1, z1), W(u + fu * 0.02, v0, z1)], col || GLASS); },
      band(u0, u1, z0, z1, hw, col) { return F.side(u0, u1, z0, z1, hw, col); },
      wheel(u, hw, r, hub) { const pts = Array.from({ length: 14 }, (_, k) => W(u + Math.cos(k * Math.PI / 7) * r, sv * (hw + 0.04), r + Math.sin(k * Math.PI / 7) * r)); const hp = Array.from({ length: 8 }, (_, k) => W(u + Math.cos(k * Math.PI / 4) * r * 0.42, sv * (hw + 0.06), r + Math.sin(k * Math.PI / 4) * r * 0.42)); return poly(pts, TYRE, INK, 0.3) + poly(hp, hub || "#b9b2a2"); },
      finish(objs, shadows, H2, h) {
        parts.sort((a, b) => b[0] - a[0]);
        objs.push([depth(x, y) - 0.2, parts.map(p => p[1]).join("")]);
        const SD = [0.62, 0.42];
        for (const [u0, u1, v0, v1] of foot.length ? [foot.reduce((a, f) => [Math.min(a[0], f[0]), Math.max(a[1], f[1]), Math.min(a[2], f[2]), Math.max(a[3], f[3])])] : []) {
          const q = [W(u0, v0, 0), W(u1, v0, 0), W(u1, v1, 0), W(u0, v1, 0)].map(p => [p[0], p[1]]);
          shadows.push(poly(q.map(p => [p[0] + SD[0] * h, p[1] + SD[1] * h]).concat(q.slice().reverse()), "#2a2216"));
        }
      }
    };
    return F;
  }

  // A motor bus in the company's colours.
  function bus(H, x, y, ang, colour, year, objs, shadows) {
    const F = frame(H, x, y, ang), e = eraOf(year), hw = 1.25, cc = colour || "#9b2a24";
    if (e === 0) {          // a bonneted bus with a separate cab, the body high over its wheels
      F.box(-4.8, 2.5, -hw, hw, 0.8, 3.05, cc, { top: CREAM, paint: F.band(-4.8, 2.5, 1.7, 2.75, hw, CREAM) + F.panes(-4.6, 2.3, 1.85, 2.6, hw, 6) + F.wheel(-3.2, hw, 0.55) + F.endPane(-4.8, -0.9, 0.9, 1.9, 2.6) });
      F.box(2.5, 3.5, -hw, hw, 0.8, 2.5, shade(cc, 0.85), { top: shade(CREAM, 0.95), paint: F.side(2.65, 3.35, 1.55, 2.3, hw) + F.endPane(3.5, -1.0, 1.0, 1.55, 2.3) + F.wheel(3.9, hw, 0.55) });
      F.box(3.5, 4.8, -0.75, 0.75, 0.8, 1.8, "#3d3a35", { top: "#4a4640", paint: F.endPane(4.8, -0.6, 0.6, 0.95, 1.65, "#7b766c") });
    } else if (e === 1) {   // the cab brought into the body, a short bonnet
      F.box(-4.8, 3.9, -hw, hw, 0.6, 3.1, cc, { top: CREAM, paint: F.band(-4.8, 3.9, 1.6, 2.8, hw, CREAM) + F.panes(-4.6, 3.7, 1.75, 2.65, hw, 7) + F.wheel(-3.3, hw, 0.5) + F.wheel(3.3, hw, 0.5) + F.endPane(3.9, -1.05, 1.05, 1.75, 2.65) + F.endPane(-4.8, -1.0, 1.0, 1.75, 2.65) });
      F.box(3.9, 4.8, -0.85, 0.85, 0.6, 1.6, shade(cc, 0.8), { top: shade(cc, 0.9), paint: F.endPane(4.8, -0.7, 0.7, 0.75, 1.45, "#8a857a") });
    } else {                // a streamlined coach: one body, a long window band, skirts over the wheels
      F.box(-4.9, 4.9, -hw, hw, 0.45, 3.0, cc, { top: false, paint: F.band(-4.9, 4.9, 1.55, 2.75, hw, CREAM) + F.panes(-4.5, 4.5, 1.7, 2.6, hw, 8, 0.08) + F.band(-4.9, 4.9, 0.45, 0.75, hw, shade(cc, 0.7)) + F.endPane(4.9, -1.05, 1.05, 1.6, 2.65) + F.endPane(-4.9, -1.0, 1.0, 1.7, 2.6) });
      F.box(-4.6, 4.6, -hw + 0.18, hw - 0.18, 3.0, 3.3, CREAM, { top: shade(CREAM, 1.03) });
    }
    F.finish(objs, shadows, H, 3);
  }
  // A goods and mail van.
  function van(H, x, y, ang, colour, year, objs, shadows) {
    const F = frame(H, x, y, ang), e = eraOf(year), hw = 1.05, cc = colour || "#4c5a3c";
    F.box(-2.8, 0.8, -hw, hw, 0.75, 2.9, cc, { top: shade(cc, 1.15), paint: F.band(-2.6, 0.6, 2.2, 2.45, hw, CREAM) + F.wheel(-1.9, hw, 0.45) + F.endPane(-2.8, -0.85, 0.85, 0.9, 2.7, shade(cc, 0.8)) });
    if (e < 2) {
      F.box(0.8, 1.9, -hw, hw, 0.75, 2.35, shade(cc, 0.82), { top: shade(cc, 0.95), paint: F.side(1.0, 1.75, 1.45, 2.15, hw) + F.endPane(1.9, -0.85, 0.85, 1.45, 2.15) + F.wheel(2.1, hw, 0.45) });
      F.box(1.9, 2.8, -0.7, 0.7, 0.75, 1.6, e ? shade(cc, 0.75) : "#3d3a35", { top: e ? shade(cc, 0.85) : "#4a4640" });
    } else F.box(0.8, 2.8, -hw, hw, 0.6, 2.4, shade(cc, 0.85), { top: shade(cc, 0.95), paint: F.side(1.0, 2.0, 1.5, 2.2, hw) + F.endPane(2.8, -0.85, 0.85, 1.5, 2.2) + F.wheel(2.0, hw, 0.45) + F.band(0.8, 2.8, 0.6, 0.85, hw, shade(cc, 0.7)) });
    F.finish(objs, shadows, H, 2.9);
  }
  // A gas cart: a tank of hydrogen or helium on a flatbed, for berths with no gas main.
  function gasCart(H, x, y, ang, year, objs, shadows) {
    const F = frame(H, x, y, ang), e = eraOf(year), hw = 1.05;
    F.box(-2.9, 1.0, -hw, hw, 0.7, 0.95, IRON, { paint: F.wheel(-2.0, hw, 0.45) + F.wheel(-0.9, hw, 0.45) });
    F.box(-2.7, 0.8, -0.85, 0.85, 0.95, 2.05, "#b9bcbd", { top: false, lift: 0.1 });
    F.box(-2.7, 0.8, -0.55, 0.55, 2.05, 2.35, "#c9cccd", { top: "#d6d8d8", lift: 0.1, paint: F.band(-2.4, 0.5, 1.3, 1.6, 0.85, "#9b2a24") });
    F.box(1.0, 2.0, -hw, hw, 0.7, 2.3, e === 2 ? "#5a2e26" : "#8b3a2a", { top: "#6b3a30", paint: F.side(1.15, 1.85, 1.45, 2.1, hw) + F.endPane(2.0, -0.85, 0.85, 1.45, 2.1) + F.wheel(2.2, hw, 0.45) });
    if (e < 2) F.box(2.0, 2.8, -0.7, 0.7, 0.7, 1.5, "#3d3a35", { top: "#4a4640" });
    F.finish(objs, shadows, H, 2.3);
  }
  // A tram on the road outside, its trolley pole up to the wire.
  function tram(H, x, y, ang, year, objs, shadows) {
    const F = frame(H, x, y, ang), e = eraOf(year), hw = 1.15, lower = e === 2 ? "#2f4f6b" : "#7a2a26";
    F.box(-5.3, 5.3, -hw, hw, 0.45, 3.0, CREAM, { top: shade(CREAM, 0.92), paint: F.band(-5.3, 5.3, 0.45, 1.6, hw, lower) + F.panes(-4.0, 4.0, 1.8, 2.7, hw, 7, 0.1) + F.panes(-5.2, -4.2, 1.8, 2.7, hw, 1, 0.1) + F.panes(4.2, 5.2, 1.8, 2.7, hw, 1, 0.1) + F.wheel(-3.3, hw, 0.38) + F.wheel(3.3, hw, 0.38) + F.endPane(5.3, -0.9, 0.9, 1.8, 2.7) + F.endPane(-5.3, -0.9, 0.9, 1.8, 2.7) });
    F.box(-3.6, 3.6, -0.55, 0.55, 3.0, 3.4, shade(CREAM, 0.97), { top: e === 2 ? "#8a8e8f" : "#7b766c", lift: 0.2, paint: F.panes(-3.4, 3.4, 3.07, 3.33, 0.55, 8, 0.08) });
    F.finish(objs, shadows, H, 3);
    const a = F.W(0, 0, 3.4), b = F.W(-4.2, 0, 6.3);
    objs.push([H.depth(x, y) - 0.3, F.line(a, b, INK, 0.9)]);
  }
  // A train on the railway: engine and tender, then coaches.
  function train(H, x, y, ang, year, coaches, objs, shadows) {
    const e = eraOf(year), c = Math.cos(ang), s = Math.sin(ang), at = u => [x + c * u, y + s * u];
    const ec = e === 2 ? "#2d4a3a" : "#24302a", cc = e === 0 ? "#6b2a24" : e === 1 ? "#5a2a22" : "#3f5f48";
    { const [px, py] = at(0), F = frame(H, px, py, ang), hw = 1.35;      // the engine
      F.box(-0.4, 11.2, -1.4, 1.4, 0.95, 1.2, IRON, { top: "#4a4640", paint: F.wheel(3.0, 1.4, 0.85, "#9b2a24") + F.wheel(5.0, 1.4, 0.85, "#9b2a24") + F.wheel(7.0, 1.4, 0.85, "#9b2a24") + F.wheel(9.7, 1.4, 0.5, "#9b2a24") });
      F.box(2.5, 10.4, -0.95, 0.95, 1.2, 3.3, ec, { top: shade(ec, 1.25), lift: 0.1, paint: e === 2 ? F.band(2.5, 10.4, 2.0, 2.25, 0.95, "#c9a45a") : "" });
      F.box(10.4, 11.0, -0.95, 0.95, 1.2, 3.3, "#1f1d1b", { top: "#2a2826" });
      F.box(9.2, 9.9, -0.35, 0.35, 3.3, 4.6, "#1f1d1b", { top: "#111", lift: 0.3 });
      F.box(6.0, 6.9, -0.45, 0.45, 3.3, 4.0, "#b48a3c", { top: "#c9a45a", lift: 0.3 });
      F.box(-0.4, 2.5, -hw, hw, 1.2, 4.2, ec, { top: "#1f1d1b", paint: F.side(0.1, 1.2, 2.6, 3.6, hw) });
      F.finish(objs, shadows, H, 4.2); }
    { const [px, py] = at(-4.6), F = frame(H, px, py, ang);              // the tender
      F.box(-3.6, 3.6, -1.35, 1.35, 0.95, 3.2, ec, { top: "#1d1b19", paint: F.wheel(-2.2, 1.35, 0.5) + F.wheel(0, 1.35, 0.5) + F.wheel(2.2, 1.35, 0.5) });
      F.finish(objs, shadows, H, 3.2); }
    for (let k = 0; k < coaches; k++) {
      const [px, py] = at(-9.2 - 9 - k * 18.4), F = frame(H, px, py, ang), hw = 1.4;
      F.box(-9, 9, -hw, hw, 1.0, 3.9, cc, { top: false, paint: F.band(-9, 9, 2.3, 3.5, hw, e === 1 ? CREAM : shade(cc, 1.25)) + F.panes(-8.4, 8.4, 2.4, 3.35, hw, 9, 0.18) + F.wheel(-7.2, hw, 0.45) + F.wheel(-6.0, hw, 0.45) + F.wheel(6.0, hw, 0.45) + F.wheel(7.2, hw, 0.45) });
      F.box(-9, 9, -hw + 0.15, hw - 0.15, 3.9, 4.25, "#8a8e8f", { top: "#9da1a2", lift: 0.1 });
      F.finish(objs, shadows, H, 4.2);
    }
  }
  // The stern carriage of a stub mast: a wheeled iron frame on the circular track, with a post the ship's tail is fast to.
  function sternCarriage(H, x, y, ang, objs, shadows) {
    const F = frame(H, x, y, ang), hw = 2.8;
    F.box(-3.2, 3.2, -hw, hw, 0.35, 1.0, "#5d5a52", { top: "#6d6a62", paint: F.wheel(-2.4, hw, 0.35) + F.wheel(2.4, hw, 0.35) });
    F.box(-2.9, -1.2, -2.4, -0.6, 1.0, 3.2, "#8a8478", { top: "#6d6a62", paint: F.side(-2.6, -1.6, 2.0, 2.8, 2.4) });
    F.box(-0.35, 0.35, -0.35, 0.35, 1.0, 6.2, "#4a4741", { top: "#5d5a52", lift: 0.2 });
    F.box(-0.6, 0.6, -1.8, 1.8, 5.8, 6.3, "#5d5a52", { top: "#6d6a62", lift: 0.3 });
    F.finish(objs, shadows, H, 6.2);
  }

  U.vehicles = { eraOf, bus, van, gasCart, tram, train, sternCarriage };
})(window.UpShip);
