// The globe: an orthographic world the player turns and zooms, drawn on a canvas beneath the map's SVG layers.
// Europe is the game's own 1920s map; the rest of the world is Natural Earth regrouped into 1920s territories.
// Positions everywhere are latitude and longitude; this module turns them into screen points for the frame being drawn.
window.UpShip = window.UpShip || {};
(function (U) {
  const W0 = window.UPSHIP_WORLD;
  const TINTS = ["#e6cdbd", "#d5dab5", "#e9d7a6", "#d4cbdc", "#c8d6d9", "#e3cfaa"];
  const TINTS_HI = ["#f0d6c5", "#e0e5bf", "#f3e1b0", "#ded5e6", "#d3e1e4", "#eddab4"];
  let canvas, ctx, W = 1, H = 1, fit = 1;
  const view = { lon: 12, lat: 46, k: 3.2 };                 // the point at the centre, and the zoom (1 = the whole globe fits)
  const proj = d3.geoOrthographic().clipAngle(90).precision(0.35);
  const path = d3.geoPath(proj), cpath = d3.geoPath(proj, null);
  const grat = d3.geoGraticule().step([10, 10])();
  let moving = false, settle = null, onRedraw = () => {};
  const highlight = { playable: new Set(), chosen: null };

  // On the sphere a shape traced the wrong way round covers everything but itself; any claiming more than half
  // the globe is turned the right way round.
  function rightWay(geom) {
    if (!geom) return null;
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    return { type: "MultiPolygon", coordinates: polys.map(r => d3.geoArea({ type: "Polygon", coordinates: r }) > 2 * Math.PI ? r.map(x => [...x].reverse()) : r) };
  }
  const EUROPE = W0.europe.map(e => ({ n: e.n, tint: e.tint, a: e.a, l: e.l, F: rightWay(e.f), C: rightWay(e.c), europe: true }));
  const WORLD = W0.world.map(t => ({ n: t.n, tint: t.tint, a: t.a, l: t.l, F: rightWay(t.f), C: rightWay(t.c) }));
  const ALL = [...WORLD, ...EUROPE];
  const LAKES = W0.lakes.map(rightWay);
  const STATES = (W0.states || []).map(s0 => ({ n: s0.n, a: s0.a, l: s0.l, G: rightWay(s0.g) }));

  function init(container, redraw) {
    canvas = document.createElement("canvas"); canvas.className = "globe-base"; canvas.setAttribute("aria-hidden", "true");
    container.insertBefore(canvas, container.firstChild);
    ctx = canvas.getContext("2d"); path.context(ctx);
    onRedraw = redraw || onRedraw;
    resize();
    addEventListener("resize", () => { resize(); onRedraw(); });
  }
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fit = Math.min(W, H) * 0.44; setProjection(); draw();
  }
  function setProjection() { proj.translate([W / 2, H / 2]).scale(fit * view.k).rotate([-view.lon, -view.lat, 0]); }
  const size = () => ({ W, H });
  // A point's place on screen, and whether it faces the viewer.
  function screen(lon, lat) { return proj([lon, lat]); }
  function facing(lon, lat) { return d3.geoDistance([lon, lat], [view.lon, view.lat]) < Math.PI / 2 - 0.01; }
  function invert(x, y) { const p = proj.invert([x, y]); return p && facing(p[0], p[1]) ? p : null; }
  // An SVG path for a line on the globe (a route): great circles, clipped to the visible side.
  function linePath(coords) { return cpath({ type: "LineString", coordinates: coords }) || ""; }

  function draw() {
    if (!ctx) return;
    setProjection();
    ctx.clearRect(0, 0, W, H);
    const R = fit * view.k, cx = W / 2, cy = H / 2, fine = !moving, k = view.k;
    // The atmosphere, the shaded sea, the graticule.
    if (R < Math.max(W, H) * 1.2) {
      const halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.1);
      halo.addColorStop(0, "rgba(173,196,193,0.35)"); halo.addColorStop(1, "rgba(173,196,193,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, 2 * Math.PI); ctx.fill();
    }
    const sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    sea.addColorStop(0, "#bcd0cd"); sea.addColorStop(1, "#9db6b3");
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = sea; ctx.fill();
    ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 0.6; ctx.stroke();
    // Coastline under the land: a wide stroke whose outer half shows along the sea.
    ctx.lineJoin = "round";
    ctx.beginPath(); for (const t of ALL) { const g = fine ? t.F || t.C : t.C || t.F; if (g) path(g); }
    ctx.strokeStyle = "rgba(122,111,85,0.55)"; ctx.lineWidth = Math.min(3, 1 + k * 0.12); ctx.stroke();
    // Land, in the map's tints; the playable or chosen countries brighter during setup.
    for (const t of ALL) {
      const g = fine ? t.F || t.C : t.C || t.F; if (!g) continue;
      const hi = highlight.playable.has(t.n) || highlight.chosen === t.n;
      ctx.beginPath(); path(g); ctx.fillStyle = (hi ? TINTS_HI : TINTS)[t.tint % 6]; ctx.fill();
    }
    // States and provinces: faint dotted lines once zoomed in a little (drawn first, so coasts stay solid under the borders).
    if (k > 2.4) {
      ctx.save(); ctx.setLineDash([2, 3]); ctx.lineWidth = 0.7; ctx.strokeStyle = "rgba(138,125,99,0.6)";
      for (const st of STATES) if (st.G) { ctx.beginPath(); path(st.G); ctx.stroke(); }
      ctx.restore();
    }
    // Borders.
    ctx.lineWidth = Math.min(1.1, 0.35 + k * 0.05); ctx.strokeStyle = "rgba(138,125,99,0.85)";
    for (const t of ALL) { const g = fine ? t.F || t.C : t.C || t.F; if (!g) continue; ctx.beginPath(); path(g); ctx.stroke(); }
    if (highlight.chosen || highlight.playable.size) {
      ctx.lineWidth = 2; ctx.strokeStyle = "#8a6a2a";
      for (const t of EUROPE) if (highlight.playable.has(t.n) || highlight.chosen === t.n) { ctx.beginPath(); path(fine ? t.F : t.C); ctx.stroke(); }
    }
    // The great lakes are water, as the inland seas are.
    ctx.lineWidth = 0.6; ctx.strokeStyle = "rgba(138,125,99,0.85)";
    for (const l of LAKES) { ctx.beginPath(); path(l); ctx.fillStyle = "#a9c1be"; ctx.fill(); ctx.stroke(); }
    // Shading toward the rim, so it reads as a sphere.
    const shade = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R * 1.02);
    shade.addColorStop(0, "rgba(255,255,255,0.06)"); shade.addColorStop(0.72, "rgba(0,0,0,0)"); shade.addColorStop(1, "rgba(10,20,40,0.26)");
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = shade; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(20,35,58,0.55)"; ctx.stroke();
    // State and province names, close in: small italic capitals.
    if (k > 5.5) for (const st of STATES) {
      if (!st.l || !facing(st.l[0], st.l[1]) || Math.sqrt(st.a) * k < 9) continue;
      const [x, y] = proj(st.l);
      ctx.font = `italic ${Math.min(11, 7 + k * 0.25)}px "Josefin Sans", "Futura", sans-serif`; ctx.fillStyle = "rgba(107,90,67,0.5)";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(st.n.toUpperCase(), x, y);
    }
    // Country names, sized to the country and the zoom.
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const t of ALL) {
      const span = Math.sqrt(t.a) * k * fit / 260; if (span < 3 || span > 60 || !t.l || !facing(t.l[0], t.l[1])) continue;
      const [x, y] = proj(t.l), fs = Math.max(7.5, Math.min(13, span * 1.7));
      ctx.font = `${fs}px "Josefin Sans", "Futura", sans-serif`; ctx.fillStyle = "rgba(107,90,67,0.55)";
      ctx.fillText(t.n.toUpperCase().split("").join(String.fromCharCode(8202, 8202)), x, y);
    }
  }
  // Turning and zooming. While the globe moves it draws simpler outlines; full detail returns once it rests.
  function nudge() { moving = true; clearTimeout(settle); settle = setTimeout(() => { moving = false; draw(); onRedraw(); }, 180); }
  function turnBy(dx, dy) {
    const s = 57.3 / (fit * view.k);
    view.lon -= dx * s; view.lat = Math.max(-80, Math.min(80, view.lat + dy * s));
    view.lon = ((view.lon + 540) % 360) - 180;
    nudge(); draw(); onRedraw();
  }
  function zoomBy(f) { view.k = Math.max(0.85, Math.min(40, view.k * f)); nudge(); draw(); onRedraw(); }
  // A smooth glide to a place and zoom.
  function glide(lon, lat, k, ms = 1200, done) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r0 = [view.lon, view.lat], ir = d3.geoInterpolate(r0, [lon, lat]), k0 = view.k, t0 = performance.now(), dur = reduce ? 0 : ms;
    const step = now => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = d3.easeCubicInOut(t), p = ir(e);
      view.lon = p[0]; view.lat = p[1]; view.k = k0 * Math.pow(k / k0, e); moving = t < 1; draw(); onRedraw();
      if (t < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }
  // Which country lies at a screen point (Europe's countries first, as the game knows them by name).
  function countryAt(x, y) {
    const p = invert(x, y); if (!p) return null;
    const hit = EUROPE.find(t => t.F && d3.geoContains(t.F, p)) || WORLD.find(t => t.F && d3.geoContains(t.F, p));
    return hit ? hit.n : null;
  }
  function setHighlight(playable, chosen) { highlight.playable = new Set(playable || []); highlight.chosen = chosen || null; draw(); }
  U.globe = { init, draw, screen, facing, invert, linePath, turnBy, zoomBy, glide, countryAt, setHighlight, view, size, isMoving: () => moving };
})(window.UpShip);
