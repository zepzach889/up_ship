// The map: period-atlas drawing, cities, routes, ships, zoom and pan.
window.UpShip = window.UpShip || {};
(function (U) {
  const NS = "http://www.w3.org/2000/svg";
  const M = window.UPSHIP_MAP_EUROPE;
  const P = M.projection;
  const rad = Math.PI / 180;

  // Lambert azimuthal equal-area, matching tools/build_map.py.
  function project(lon, lat) {
    const l = (lon - P.lon0) * rad, p = lat * rad, p1 = P.lat0 * rad;
    const k = Math.sqrt(2 / (1 + Math.sin(p1) * Math.sin(p) + Math.cos(p1) * Math.cos(p) * Math.cos(l)));
    const x = k * Math.cos(p) * Math.sin(l);
    const y = k * (Math.cos(p1) * Math.sin(p) - Math.sin(p1) * Math.cos(p) * Math.cos(l));
    return [(x - P.x0) * P.scale, (P.y1 - y) * P.scale];
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Country labels are placed by hand. Countries not listed here are not labeled.
  const LABELS = {
    "United Kingdom": { lon: -1.9, lat: 54.45, size: 12 },
    "Irish Free State": { lon: -8.3, lat: 52.5, size: 9.5, lines: ["Irish Free", "State"] },
    "France": { lon: 2.3, lat: 46.4 },
    "Spain": { lon: -3.8, lat: 39.1 },
    "Portugal": { lon: -7.85, lat: 40.7, size: 11, rotate: -80 },
    "Germany": { lon: 9.2, lat: 51.6 },
    "Poland": { lon: 19.8, lat: 51.0 },
    "Czechoslovakia": { lon: 17.2, lat: 49.25, size: 12 },
    "Austria": { lon: 15.3, lat: 47.0, size: 12 },
    "Hungary": { lon: 19.1, lat: 46.65, size: 12 },
    "Italy": { lon: 12.4, lat: 43.1 },
    "Yugoslavia": { lon: 19.6, lat: 43.7 },
    "Romania": { lon: 24.8, lat: 46.1 },
    "Bulgaria": { lon: 25.3, lat: 42.75, size: 13 },
    "Greece": { lon: 21.6, lat: 39.75, size: 11 },
    "Turkey": { lon: 32.5, lat: 39.4 },
    "Soviet Union": { lon: 33, lat: 53.2 },
    "Lithuania": { lon: 23.9, lat: 55.35, size: 10 },
    "Latvia": { lon: 25.6, lat: 56.9, size: 10 },
    "Estonia": { lon: 25.9, lat: 58.75, size: 10 },
    "Finland": { lon: 27.0, lat: 62.4, size: 12 },
    "Sweden": { lon: 14.6, lat: 57.4, size: 12 },
    "Norway": { lon: 8.4, lat: 61.0, size: 12 },
    "Morocco": { lon: -5.5, lat: 33.0, size: 12 },
    "Algeria": { lon: 3.0, lat: 34.5, size: 12 },
    "Tunisia": { lon: 9.4, lat: 34.6, size: 11 },
    "Libya": { lon: 17.0, lat: 29.8, size: 12 },
    "Egypt": { lon: 29.5, lat: 28.5, size: 12 }
  };

  let svg, world, layers = {}, view = { x: 0, y: 0, w: M.width, h: M.height }, zoom = 1, zoom0 = null;
  // Symbols, ships, and city dots grow partway as you zoom in: at half the map's rate, up to a ceiling.
  const grow = () => 1.15 * Math.min(2.4, Math.sqrt(zoom / (zoom0 || zoom)));
  const cityNodes = {}, shipNodes = {}, routeNodes = {}, countryNodes = {};
  let setupMode = null;
  let onSelect = () => {};

  function init(container, handlers) {
    onSelect = handlers.onSelect;
    svg = el("svg", { class: "map", viewBox: `0 0 ${M.width} ${M.height}`, role: "img", "aria-label": "Map of Europe" }, container);
    const defs = el("defs", {}, svg);
    // All countries together form the land; used for the water lining and the coastline.
    const landShape = el("g", { id: "land-shape" }, defs);
    for (const c of M.countries) el("path", { d: c.path }, landShape);
    defs.insertAdjacentHTML("beforeend", U.shipArt.DEFS + U.facArt.DEFS + WEATHER_DEFS + TRAFFIC_DEFS);

    world = el("g", {}, svg);
    el("rect", { x: -M.width, y: -M.height, width: M.width * 3, height: M.height * 3, class: "sea" }, world);
    layers.graticule = el("g", { class: "graticule" }, world);
    layers.waterlines = el("g", { class: "waterlines" }, world);
    layers.land = el("g", {}, world);
    layers.countries = el("g", { class: "countries" }, world);
    layers.countryLabels = el("g", { class: "country-labels" }, world);
    layers.overlay = el("g", { class: "overlay" }, world);
    layers.routes = el("g", { class: "routes" }, world);
    layers.fac = el("g", { class: "fac-layer" }, world);      // under the cities, so labels stay readable
    layers.weather = el("g", { class: "weather-layer" }, world);
    layers.transport = el("g", { class: "transport-layer" }, world);
    layers.traffic = el("g", { class: "traffic-layer" }, world);
    layers.cities = el("g", { class: "cities" }, world);
    layers.ships = el("g", { class: "ships" }, world);

    drawGraticule();
    // Water lining: alternating strokes of the coast, as on period atlases.
    [[15, "wl-line"], [13, "wl-sea"], [9.5, "wl-line"], [7.5, "wl-sea"], [4.5, "wl-line"], [3, "wl-sea"]]
      .forEach(([w, cls]) => el("use", { href: "#land-shape", class: cls, "stroke-width": w }, layers.waterlines));
    // Coast: a wide stroke under the country fills, so only its outer half shows along the sea.
    el("use", { href: "#land-shape", class: "coast" }, layers.land);

    for (const c of M.countries) {
      const cp = el("path", { d: c.path, class: `country tint-${c.tint}` }, layers.countries);
      countryNodes[c.name] = cp;
      cp.addEventListener("click", e => {
        if (!setupMode) return;
        e.stopPropagation();
        onSelect({ type: "country", id: c.name });
      });
      const o = LABELS[c.name];
      if (!o) continue;
      const [x, y] = project(o.lon, o.lat);
      const t = el("text", { x, y, class: "country-label" }, layers.countryLabels);
      if (o.rotate) t.setAttribute("transform", `rotate(${o.rotate} ${x} ${y})`);
      t.dataset.size = o.size || 15;
      if (o.lines) {
        o.lines.forEach((line, i) => {
          const ts = el("tspan", { x, dy: i ? "1.15em" : `${-(o.lines.length - 1) * 0.575}em` }, t);
          ts.textContent = line;
        });
      } else t.textContent = c.name;
    }
    const lines = el("g", {}, null);
    world.insertBefore(lines, layers.countryLabels);
    el("path", { d: M.borders, class: "borders" }, lines);

    for (const city of U.CITIES) drawCity(city);
    setupZoomPan();
    applyView();
  }

  function drawGraticule() {
    let d = "";
    for (let lon = -30; lon <= 50; lon += 5) {
      let seg = [];
      for (let lat = 28; lat <= 72; lat += 1) seg.push(project(lon, lat));
      d += "M" + seg.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
    }
    for (let lat = 30; lat <= 70; lat += 5) {
      let seg = [];
      for (let lon = -35; lon <= 55; lon += 1) seg.push(project(lon, lat));
      d += "M" + seg.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
    }
    el("path", { d }, layers.graticule);
  }

  function drawCity(city) {
    const [x, y] = project(city.lon, city.lat);
    city.x = x; city.y = y;
    const g = el("g", { class: `city tier-${city.tier}${city.id === U.homeCity ? " is-home" : ""}`, tabindex: 0, role: "button", "aria-label": city.name }, layers.cities);
    const hit = el("circle", { cx: x, cy: y, class: "city-hit" }, g);
    const dot = el("circle", { cx: x, cy: y, class: "city-dot" }, g);
    let ring = null;
    if (city.tier === "major") ring = el("circle", { cx: x, cy: y, class: "city-ring" }, g);
    const label = el("text", { class: "city-label" }, g);
    label.textContent = city.name;
    g.addEventListener("click", e => { e.stopPropagation(); onSelect({ type: "city", id: city.id }); });
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect({ type: "city", id: city.id }); } });
    cityNodes[city.id] = { g, hit, dot, ring, label, city };
  }

  function layoutCities() {
    const z = zoom;
    for (const id in cityNodes) {
      const n = cityNodes[id], c = n.city, r = U.TIERS[c.tier].r * grow() / z * (layerMode === "passengers" || layerMode === "freight" ? 0.45 : 1);
      n.dot.setAttribute("r", r);
      n.hit.setAttribute("r", Math.max(r * 2.2, 11 / z));
      if (n.ring) n.ring.setAttribute("r", r + 2.6 / z);
      const fs = (c.tier === "major" ? 15 : c.tier === "large" ? 13.5 : c.tier === "medium" ? 12.5 : 11.5) / z;
      n.label.setAttribute("font-size", fs);
      const gap = r + 4 / z;
      let x = c.x, y = c.y, anchor = "start", base = "middle";
      if (c.label === "r") { x += gap; }
      else if (c.label === "l") { x -= gap; anchor = "end"; }
      else if (c.label === "t") { y -= gap; anchor = "middle"; base = "auto"; }
      else { y += gap + fs * 0.75; anchor = "middle"; base = "auto"; }
      n.label.setAttribute("x", x); n.label.setAttribute("y", y);
      n.label.setAttribute("text-anchor", anchor);
      n.label.setAttribute("dominant-baseline", base === "middle" ? "central" : "auto");
    }
    for (const t of layers.countryLabels.children) t.setAttribute("font-size", (+t.dataset.size || 15) / z);
    svg.style.setProperty("--z", z);
  }

  // Routes and ships -------------------------------------------------------
  function routePathD(stops, circuit) {
    return "M" + stops.map(id => U.cityById[id]).map(c => c.x.toFixed(1) + "," + c.y.toFixed(1)).join("L") + (circuit && stops.length > 2 ? "Z" : "");
  }

  function syncRoutes(state) {
    syncExtras(state);
    const live = new Set(state.routes.map(r => r.id));
    for (const id in routeNodes) if (!live.has(id)) { routeNodes[id].g.remove(); delete routeNodes[id]; }
    for (const route of state.routes) {
      let n = routeNodes[route.id];
      const d = routePathD(route.stops, route.circuit);
      if (!n) {
        const g = el("g", { class: "route", tabindex: 0, role: "button" }, layers.routes);
        const hit = el("path", { class: "route-hit" }, g);
        const line = el("path", { class: "route-line" }, g);
        g.addEventListener("click", e => { e.stopPropagation(); onSelect({ type: "route", id: route.id }); });
        g.addEventListener("keydown", e => { if (e.key === "Enter") onSelect({ type: "route", id: route.id }); });
        n = routeNodes[route.id] = { g, hit, line };
      }
      n.hit.setAttribute("d", d); n.line.setAttribute("d", d);
      n.g.setAttribute("aria-label", "Route " + U.sim.routeName(route.stops, route.circuit));
      const sum = U.sim.routeSummary(state, route.id);
      n.g.classList.toggle("is-profit", sum.days > 0 && sum.profit >= 0);
      n.g.classList.toggle("is-loss", sum.days > 0 && sum.profit < 0);
      n.g.classList.toggle("is-empty", !state.ships.some(sh => sh.routeId === route.id));
    }
  }

  // The route being drawn, before it is confirmed.
  let draftNode = null;
  function drawDraft(stops, circuit) {
    draftDemand(stops);
    if (!draftNode) draftNode = el("path", { class: "route-draft" }, layers.routes);
    draftNode.setAttribute("d", stops && stops.length > 1 ? routePathD(stops, circuit) : "");
    const only = stops && U.tutorial && U.tutorial.draftCities ? U.tutorial.draftCities() : null;
    for (const id in cityNodes) {
      const i = stops ? stops.indexOf(id) : -1;
      cityNodes[id].g.classList.toggle("in-draft", i >= 0);
      cityNodes[id].g.classList.toggle("draft-dimmed", !!only && !only.includes(id));
    }
    svg.classList.toggle("is-drawing", !!stops);
  }

  function shipPosition(ship, progress) {
    const state = U.state;
    const hour = U.sim.H(state.tick) + (U.turnActive ? progress : 0) * U.TIME.tickHours;
    const p = U.sim.positionAt(ship, hour);
    if (p.flying) {
      const a = U.cityById[p.leg.from], b = U.cityById[p.leg.to], f = p.fraction;
      if (p.leg.via) {
        // A diversion: follow the curve, facing along it.
        const q = U.weather.bez(a, p.leg.via, b, f), v = p.leg.via;
        const dx = 2 * (1 - f) * (v.x - a.x) + 2 * f * (b.x - v.x), dy = 2 * (1 - f) * (v.y - a.y) + 2 * f * (b.y - v.y);
        return { x: q.x, y: q.y, angle: Math.atan2(dy, dx) * 180 / Math.PI, flying: true, fraction: f, leg: p.leg, hour };
      }
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
        flying: true, fraction: f, leg: p.leg, hour };
    }
    const c = U.cityById[p.at];
    return { x: c.x, y: c.y, angle: 0, flying: false, at: p.at, leg: p.leg || null, upcoming: p.upcoming || null, hour };
  }

  function drawShips(state, progress) {
    if (!state) return;
    const live = new Set();
    const moored = {};
    for (const ship of state.ships) {
      if (ship.deliveryTick > state.tick) continue;
      live.add(ship.id);
      let n = shipNodes[ship.id];
      if (!n) {
        const g = el("g", { class: "ship", tabindex: 0, role: "button" }, layers.ships);
        el("ellipse", { rx: 58, ry: 22, class: "ship-hit" }, g);
        const c0 = U.SHIP_CLASSES[ship.classId], SH = U.shipArt.SHADOW;
        // A designed ship's drawing may not exist for a moment while the game starts; a stock ship stands in until it does.
        const art = [ship.art, c0.art, c0.kind, "passenger"].find(k => k && SH[k]), [srx, sry] = SH[art];
        // In flight: a shadow on the ground and the top view. At a mast: the side view.
        const shadow = el("ellipse", { rx: srx, ry: sry, class: "ship-shadow" }, g);
        const top = el("use", { href: "#art-top-" + art, class: "ship-top" }, g);
        const body = el("use", { href: "#art-" + art, class: "ship-side" }, g);
        g.addEventListener("click", e => { e.stopPropagation(); onSelect({ type: "ship", id: ship.id }); });
        g.addEventListener("keydown", e => { if (e.key === "Enter") onSelect({ type: "ship", id: ship.id }); });
        n = shipNodes[ship.id] = { g, body, top, shadow, art };
      }
      // A repaint at overhaul, or a designed drawing arriving after the stand-in, switches the drawing in place.
      {
        const c0 = U.SHIP_CLASSES[ship.classId], SH = U.shipArt.SHADOW;
        const art = [ship.art, c0.art, c0.kind, "passenger"].find(k => k && SH[k]);
        if (art !== n.art) {
          n.art = art; n.top.setAttribute("href", "#art-top-" + art); n.body.setAttribute("href", "#art-" + art);
          n.shadow.setAttribute("rx", SH[art][0]); n.shadow.setAttribute("ry", SH[art][1]);
        }
      }
      n.g.setAttribute("aria-label", "Ship " + ship.name);
      const p = shipPosition(ship, progress);
      const s = 0.36 * grow() / zoom;
      let dx = 0, dy = 0, angle = p.flying ? p.angle : 0;
      if (!p.flying) {
        // Moored ships stack above their city so the city stays clickable.
        const k = moored[p.at] = (moored[p.at] || 0) + 1;
        dy = -(4 + 11 * k) * grow() / zoom;
      }
      if (p.flying) {
        // The shadow falls the same way whatever the heading: undo the ship's rotation for its offset.
        const off = 7 / (s * zoom), a = -angle * Math.PI / 180;
        const ox = off * (Math.cos(a) * 0.8 - Math.sin(a) * 1), oy = off * (Math.sin(a) * 0.8 + Math.cos(a) * 1);
        n.shadow.setAttribute("cx", ox.toFixed(2)); n.shadow.setAttribute("cy", oy.toFixed(2));
      }
      n.g.setAttribute("transform", `translate(${p.x + dx},${p.y + dy}) rotate(${angle}) scale(${s})`);
      n.g.classList.toggle("is-moored", !p.flying);
      n.g.classList.toggle("is-idle", !ship.routeId);
      const out = !p.flying && ((ship.overhaulUntil && p.hour < ship.overhaulUntil) || (ship.readyHour > p.hour + 12 && ship.routeId));
      n.g.classList.toggle("is-out", !!out);
      if (out && !n.badge) { n.badge = el("g", { class: "out-badge" }, n.g); n.badge.innerHTML = '<circle cx="0" cy="-26" r="9"/><path d="M-4,-22 L3,-29 M1,-31 C5,-33 7,-29 5,-27 C3,-25 0,-27 1,-31 Z"/>'; }
    }
    for (const id in shipNodes) if (!live.has(id)) { shipNodes[id].g.remove(); delete shipNodes[id]; }
  }

  // Zoom and pan ------------------------------------------------------------
  function applyView() {
    setTimeout(() => syncExtras(U.state), 0);
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
    // zoom = screen pixels per map unit, so labels and icons keep a fixed on-screen size.
    const r = svg.getBoundingClientRect();
    zoom = (r.width || M.width) / view.w;
    if (!zoom0 || view.w >= M.width * 0.98) zoom0 = zoom0 ? Math.min(zoom0, zoom) : zoom;
    layoutCities();
    if (U.state) drawShips(U.state, U.progress || 0);
  }

  function clampView() {
    const r = svg.getBoundingClientRect();
    const aspectW = r.width && r.height ? r.width / r.height : M.width / M.height;
    const minW = M.width / 5, maxW = M.height * aspectW * 1.001;
    const aspect = view.h / view.w;
    view.w = Math.min(maxW, Math.max(minW, view.w)); view.h = view.w * aspect;
    view.x = Math.min(M.width + M.width * 0.25 - view.w, Math.max(-M.width * 0.25, view.x));
    if (view.w > M.width * 1.5) view.x = (M.width - view.w) / 2;
    view.y = Math.min(M.height + M.height * 0.12 - view.h, Math.max(-M.height * 0.12, view.y));
    if (view.h > M.height) view.y = (M.height - view.h) / 2;
  }

  // Match the view to the window's shape. On first load, show the whole map.
  function fitAspect(whole) {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const aspect = r.height / r.width;
    if (whole) {
      // Show the full height of the map; narrow screens crop the sides.
      view.h = M.height; view.w = view.h / aspect;
      view.x = (M.width - view.w) / 2; view.y = 0;
      return;
    }
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    view.h = view.w * aspect;
    view.x = cx - view.w / 2; view.y = cy - view.h / 2;
  }

  function zoomBy(factor, clientX, clientY) {
    const r = svg.getBoundingClientRect();
    const fx = clientX == null ? 0.5 : (clientX - r.left) / r.width;
    const fy = clientY == null ? 0.5 : (clientY - r.top) / r.height;
    const px = view.x + view.w * fx, py = view.y + view.h * fy;
    view.w /= factor; view.h /= factor;
    clampView();
    view.x = px - view.w * fx; view.y = py - view.h * fy;
    clampView();
    applyView();
  }

  function setupZoomPan() {
    svg.addEventListener("wheel", e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY); }, { passive: false });
    let drag = null;
    svg.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    });
    window.addEventListener("pointermove", e => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - drag.x) * view.w / r.width, dy = (e.clientY - drag.y) * view.h / r.height;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      if (drag.moved) { svg.classList.add("is-dragging"); view.x = drag.vx - dx; view.y = drag.vy - dy; clampView(); applyView(); }
    });
    window.addEventListener("pointerup", () => {
      if (drag && drag.moved) {
        // Swallow the click that follows a drag.
        window.addEventListener("click", ev => ev.stopPropagation(), { capture: true, once: true });
      }
      drag = null; svg.classList.remove("is-dragging");
    });
    svg.addEventListener("click", () => onSelect(null));
    window.addEventListener("resize", () => { fitAspect(); clampView(); applyView(); });
    fitAspect(true);
  }

  function highlight(sel) {
    for (const id in cityNodes) cityNodes[id].g.classList.toggle("is-selected", !!sel && sel.type === "city" && sel.id === id);
    for (const id in shipNodes) shipNodes[id].g.classList.toggle("is-selected", !!sel && sel.type === "ship" && sel.id === id);
    for (const id in routeNodes) routeNodes[id].g.classList.toggle("is-selected", !!sel && sel.type === "route" && sel.id === id);
  }

  // New-game setup: highlight the playable countries, then the home cities.
  const PLAYABLE = ["Germany", "United Kingdom", "France", "Italy"];
  function setSetup(mode, data = {}) {
    setupMode = mode;
    svg.classList.toggle("is-setup", !!mode);
    for (const m of ["country", "city", "identity"]) svg.classList.toggle("setup-" + m, mode === m);
    for (const name in countryNodes) {
      countryNodes[name].classList.toggle("playable", mode === "country" && PLAYABLE.includes(name));
      countryNodes[name].classList.toggle("chosen", !!mode && mode !== "country" && name === data.country);
    }
    for (const id in cityNodes) {
      cityNodes[id].g.classList.toggle("choosable", (mode === "city" && (data.cities || []).includes(id)) || (mode === "country" && U.cityById[id].home));
      cityNodes[id].g.classList.toggle("chosen-home", !!mode && id === data.chosen);
      cityNodes[id].g.classList.toggle("dimmed", mode === "city" && !(data.cities || []).includes(id));
    }
  }

  function setHome(id) {
    for (const cid in cityNodes) cityNodes[cid].g.classList.toggle("is-home", cid === id);
  }

  // Weather ----------------------------------------------------------------------------
  // Clouds seen from above: generated forms lit from the north-west, shadows to the south-east.
  const cloudFilter = (id, freq, octaves, blur, cells, relief, lift, shadow, shOpacity, seed = 11) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" result="n"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blob"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${cells}" result="cells"/>
    <feComposite in="cells" in2="blob" operator="in" result="dens"/>
    <feGaussianBlur in="dens" stdDeviation="1.1" result="densS"/>
    <feDiffuseLighting in="densS" surfaceScale="${relief}" diffuseConstant="1.25" lighting-color="#ffffff" result="lit"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
    <feComponentTransfer in="lit" result="litW"><feFuncR type="linear" slope="0.62" intercept="${lift}"/><feFuncG type="linear" slope="0.62" intercept="${lift}"/><feFuncB type="linear" slope="0.58" intercept="${lift + 0.04}"/></feComponentTransfer>
    <feComposite in="litW" in2="dens" operator="in" result="body"/>
    <feOffset in="dens" dx="${shadow}" dy="${shadow * 1.2}" result="sh"/><feGaussianBlur in="sh" stdDeviation="${shadow * 0.4}" result="shb"/>
    <feColorMatrix in="shb" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.18  0 0 0 ${shOpacity} 0" result="shadow"/>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="body"/></feMerge></filter>`;
  const WEATHER_DEFS = cloudFilter("wx-storm", 0.02, 6, 13, "2.6 0 0 0 -0.78", 7, 0.42, 20, 0.55)
    + cloudFilter("wx-storm2", 0.024, 6, 12, "2.6 0 0 0 -0.82", 7, 0.42, 0, 0, 29)
    + cloudFilter("wx-storm3", 0.03, 5, 10, "2.8 0 0 0 -1.0", 8, 0.45, 0, 0, 47)
    + cloudFilter("wx-fair2", 0.035, 5, 11, "2.6 0 0 0 -1.0", 3, 0.44, 0, 0, 23)
    + cloudFilter("wx-fair", 0.04, 5, 12, "2.4 0 0 0 -0.95", 3, 0.42, 9, 0.3)
    + `<filter id="wx-fog" x="-60%" y="-90%" width="220%" height="280%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.03" numOctaves="4" seed="21" result="n"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="13" result="blob"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.97  0 0 0 0 0.975  0 0 0 0 0.97  2.4 0 0 0 -0.5" result="veil"/>
      <feComposite in="veil" in2="blob" operator="in" result="f"/><feGaussianBlur in="f" stdDeviation="1.8"/></filter>
    <filter id="wx-wind" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.07" numOctaves="4" seed="8" result="n"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blob"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.2" result="st"/>
      <feComposite in="st" in2="blob" operator="in" result="w"/><feGaussianBlur in="w" stdDeviation="0.5" result="ws"/>
      <feOffset in="ws" dx="6" dy="7" result="sh"/><feGaussianBlur in="sh" stdDeviation="2.5" result="shb"/>
      <feColorMatrix in="shb" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0.25 0" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="ws"/></feMerge></filter>
    <filter id="wx-rain" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.03 0.1" numOctaves="3" seed="9" result="n"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blob"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.27  0 0 0 0 0.33  1.4 0 0 0 -0.25" result="rv"/>
      <feComposite in="rv" in2="blob" operator="in"/></filter>
    <radialGradient id="wx-flash"><stop offset="0" stop-color="#fff5d6" stop-opacity="0.9"/><stop offset="0.45" stop-color="#fff5d6" stop-opacity="0.3"/><stop offset="1" stop-color="#fff5d6" stop-opacity="0"/></radialGradient>`;
  const wxNodes = {};
  let wxLast = 0;
  // Each system is rendered once, when it forms, into a self-contained SVG picture; after that it only
  // slides and fades, which costs almost nothing (the cloud filters are too heavy to rerun as clouds move).
  // The layers a system is drawn in: each becomes its own picture, so they can churn against each other.
  function wxLayers(s) {
    const E = (rx, ry, f, extra = "") => `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#fff" filter="url(#${f})"${extra}/>`;
    if (s.kind === "storm") return [
      `<ellipse cx="24" cy="26" rx="${s.rx * 1.02}" ry="${s.ry * 0.8}" fill="#fff" filter="url(#wx-rain)" opacity="0.5"/>`,
      `<g filter="url(#wx-storm)">${s.parts.map(p => `<ellipse cx="${p.dx}" cy="${p.dy}" rx="${p.rx}" ry="${p.ry}" fill="#fff"/>`).join("")}</g>`,
      `<g filter="url(#wx-storm2)"><ellipse cx="${s.rx * 0.06}" cy="0" rx="${s.rx * 0.85}" ry="${s.ry * 0.85}" fill="#fff"/><ellipse cx="${-s.rx * 0.36}" cy="${s.ry * 0.05}" rx="${s.rx * 0.34}" ry="${s.ry * 0.8}" fill="#fff"/></g>`,
      `<g filter="url(#wx-storm3)"><ellipse cx="${-s.rx * 0.03}" cy="${-s.ry * 0.1}" rx="${s.rx * 0.6}" ry="${s.ry * 0.68}" fill="#fff"/><ellipse cx="${s.rx * 0.34}" cy="${s.ry * 0.2}" rx="${s.rx * 0.29}" ry="${s.ry * 0.58}" fill="#fff"/></g>`];
    if (s.kind === "fair") return [E(s.rx, s.ry, "wx-fair"), E(s.rx * 0.8, s.ry * 0.8, "wx-fair2")];
    if (s.kind === "fog") return [E(s.rx, s.ry, "wx-fog"), E(s.rx * 0.75, s.ry * 0.8, "wx-fog", ' transform="translate(12 3)"')];
    return [E(s.rx, s.ry, "wx-wind")];
  }
  function wxPicture(s, body) {
    const pad = 1.7, w = s.rx * 2 * pad + 60, hgt = Math.max(s.rx, s.ry) * 2 * pad + 60;
    const scale = Math.min(2, 900 / Math.max(w, hgt));        // bitmap resolution: sharp enough when zoomed in, capped for memory
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-w / 2} ${-hgt / 2} ${w} ${hgt}" width="${Math.round(w * scale)}" height="${Math.round(hgt * scale)}"><defs>${WEATHER_DEFS}</defs>${body}</svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
    const pic = { url: null, w, h: hgt, ready: null };
    // Rasterize once into a plain bitmap, so moving it never reruns the cloud filters.
    pic.ready = new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = Math.round(w * scale); cv.height = Math.round(hgt * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(svgUrl);
        cv.toBlob(blob => { pic.url = URL.createObjectURL(blob); resolve(pic.url); }, "image/png");
      };
      img.onerror = () => { pic.url = svgUrl; resolve(svgUrl); };
      img.src = svgUrl;
    });
    return pic;
  }
  // How each layer of a system churns: its own slow loop of drift, swelling, and fading, out of step with the others.
  const CHURN = {
    storm: [{ ax: 0, ay: 0, s: 0, p: 10, o: [0.5, 0.5] }, { ax: 0.06, ay: 0.12, s: 0.05, p: 7.5, o: [0.75, 1] },
      { ax: 0.08, ay: 0.16, s: 0.07, p: 9.5, o: [0.2, 0.95] }, { ax: 0.07, ay: 0.18, s: 0.08, p: 6.5, o: [0.15, 0.9] }],
    fair: [{ ax: 0.05, ay: 0.08, s: 0.05, p: 8, o: [0.75, 1] }, { ax: 0.08, ay: 0.1, s: 0.07, p: 6, o: [0.2, 0.8] }],
    fog: [{ ax: 0.06, ay: 0.06, s: 0.03, p: 12, o: [0.7, 1] }, { ax: 0.09, ay: 0.08, s: 0.04, p: 9, o: [0.2, 0.7] }],
    wind: [{ ax: 0.04, ay: 0.05, s: 0.04, p: 7, o: [0.7, 1] }]
  };
  function drawWeather(state, progress, force) {
    if (!state || !state.weather || !layers.weather) return;
    const nowMs = performance.now();
    if (!force && nowMs - wxLast < 40) return;             // smooth on a desktop: about 25 updates a second
    wxLast = nowMs;
    const dt = (U.turnActive ? progress : 0) * U.TIME.tickHours, live = new Set(), sec = nowMs / 1000;
    for (const s of state.weather.systems) {
      live.add(s.id);
      let n = wxNodes[s.id];
      if (!n) {
        const g = el("g", { class: "wx wx-" + s.kind }, layers.weather);
        n = { g, layers: [], pics: [], phase: (s.id * 1.7) % 6.28 };
        wxLayers(s).forEach((body, i) => {
          const pic = wxPicture(s, body), lg = el("g", {}, g);
          const image = el("image", { x: -pic.w / 2, y: -pic.h / 2, width: pic.w, height: pic.h, preserveAspectRatio: "none" }, lg);
          pic.ready.then(url => image.setAttribute("href", url));
          n.layers.push(lg); n.pics.push(pic);
        });
        if (s.kind === "storm") { n.flash = el("ellipse", { rx: 1, ry: 1, fill: "url(#wx-flash)", opacity: 0 }, g); n.nextFlash = sec + 0.5 + Math.random() * 2; }
        el("title", {}, g).textContent = s.name;
        wxNodes[s.id] = n;
      }
      const hour = U.sim.H(state.tick) + dt, age = hour - s.born, left = s.dies - hour;
      const fade = Math.max(0, Math.min(1, age / 6, left / 6));
      n.g.setAttribute("transform", `translate(${(s.x + s.vx * dt).toFixed(1)} ${(s.y + s.vy * dt).toFixed(1)}) rotate(${s.rot.toFixed(1)})`);
      n.g.setAttribute("opacity", fade.toFixed(2));
      const churn = CHURN[s.kind] || CHURN.fair;
      n.layers.forEach((lg, i) => {
        const c = churn[Math.min(i, churn.length - 1)], a = (sec / c.p) * Math.PI * 2 + n.phase + i * 2.1;
        const dx = Math.cos(a) * c.ax * s.rx, dy = Math.sin(a * 1.3) * c.ay * s.ry, k = 1 + Math.sin(a * 0.8) * c.s;
        const op = c.o[0] + (c.o[1] - c.o[0]) * (0.5 + 0.5 * Math.sin(a * 1.1));
        lg.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(3)})`);
        lg.setAttribute("opacity", op.toFixed(2));
      });
      // Lightning: a new random place inside the storm each time; mostly small, sometimes a wide sheet, sometimes a double flicker.
      if (n.flash) {
        if (sec >= n.nextFlash) {
          let u, v; do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; } while (u * u + v * v > 0.8);
          const wide = Math.random() < 0.2;
          n.flash.setAttribute("cx", (u * s.rx * 0.85).toFixed(1)); n.flash.setAttribute("cy", (v * s.ry * 0.8).toFixed(1));
          n.flash.setAttribute("rx", (wide ? s.rx * (0.35 + Math.random() * 0.2) : s.rx * (0.1 + Math.random() * 0.12)).toFixed(1));
          n.flash.setAttribute("ry", (wide ? s.ry * (0.5 + Math.random() * 0.2) : s.ry * (0.2 + Math.random() * 0.15)).toFixed(1));
          n.flashOn = sec; n.flashDouble = Math.random() < 0.4;
          n.nextFlash = sec + 0.4 + Math.random() * 1.8;
        }
        const t = sec - (n.flashOn ?? -9);
        n.flash.setAttribute("opacity", t < 0.11 ? "1" : n.flashDouble && t > 0.2 && t < 0.27 ? "0.85" : "0");
      }
    }
    for (const id in wxNodes) if (!live.has(+id)) { const n = wxNodes[id]; n.g.remove(); n.pics.forEach(p => p.ready.then(u => URL.revokeObjectURL(u))); delete wxNodes[id]; }
  }


  // Competition: railways, steamer lanes, air services, and generic traffic moving along them.
  const TRAFFIC_DEFS = "";
  // A smooth path through waypoints (Catmull-Rom), sampled into a polyline in map units.
  function smooth(points, perSpan = 10) {
    const P = points, out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let k = 0; k < perSpan; k++) {
        const t = k / perSpan, t2 = t * t, t3 = t2 * t;
        out.push({ x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                   y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) });
      }
    }
    out.push(P[P.length - 1]);
    const len = [0]; for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y));
    return { pts: out, len, total: len[len.length - 1] };
  }
  function along(poly, d) {
    d = Math.max(0, Math.min(poly.total, d));
    let lo = 0, hi = poly.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (poly.len[m] <= d) lo = m; else hi = m; }
    const a = poly.pts[lo], b = poly.pts[hi], seg = poly.len[hi] - poly.len[lo] || 1, f = (d - poly.len[lo]) / seg;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  const toMap = ll => { const [x, y] = project(ll[1], ll[0]); return { x, y }; };
  const polyD = poly => "M" + poly.pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" L");
  let vehicles = [], transportKey = "", polys = null;
  function buildPolys() {
    if (polys) return polys;
    polys = [];
    for (const l of U.competition.LINKS) for (const sg of l.segs) polys.push({ link: l, type: sg.type, express: l.express || l.type === "boat", poly: smooth(sg.pts.map(toMap)) });
    return polys;
  }
  function syncTransport(state) {
    if (!state || !layers.transport) return;
    const C = U.competition, month = C.monthIndex(state);
    const air = C.AIR.filter(s => month >= s[2] * 12 + s[3] - 1);
    const key = layerMode + ":" + air.length + ":" + ((state.settings || {}).traffic !== false);
    if (key === transportKey) return;
    transportKey = key;
    layers.transport.innerHTML = ""; vehicles = [];
    if (layerMode !== "normal" && layerMode !== "competition") return;
    const full = layerMode === "competition";
    layers.transport.setAttribute("class", "transport-layer" + (full ? "" : " muted"));
    const P = buildPolys();
    for (const p of P) {
      const d = polyD(p.poly);
      if (p.type === "rail") { el("path", { d, class: "tr-rail" + (p.express ? " express" : "") }, layers.transport); el("path", { d, class: "tr-ties" + (p.express ? " express" : "") }, layers.transport); }
      else el("path", { d, class: "tr-lane" }, layers.transport);
    }
    const airPolys = air.map(s => ({ type: "air", poly: smooth([toMap(pt(s[0])), toMap(pt(s[1]))], 2) }));
    for (const a of airPolys) el("path", { d: polyD(a.poly), class: "tr-air" }, layers.transport);
    if ((state.settings || {}).traffic === false) return;
    // Traffic: two trains on express lines, one on others; a steamer per crossing; a plane per air service.
    for (const p of P.concat(airPolys)) {
      const n = p.type === "rail" ? (p.express ? 2 : 1) : 1;
      for (let j = 0; j < n; j++) {
        const rev = Math.random() < 0.5, pts = rev ? p.poly.pts.slice().reverse() : p.poly.pts;
        const poly = rev ? smooth(pts, 1) : p.poly;
        const speed = p.type === "air" ? 22 : p.type === "rail" ? 12 : 6;              // map units a second
        vehicles.push({ kind: p.type === "air" ? "plane" : p.type === "rail" ? "train" : "ship", poly, speed, d: Math.random() * poly.total, puffT: Math.random() });
      }
    }
  }
  const pt = id => { const c = U.cityById[id]; return [c.lat, c.lon]; };

  // Traffic and smoke are painted on a transparent canvas over the map, so their movement never repaints the map itself.
  let trafficLast = 0, tcv = null, puffs = [], sprite = null, shadowSprite = null;
  function trafficCanvas() {
    if (tcv) return tcv;
    tcv = document.createElement("canvas"); tcv.className = "traffic-canvas";
    svg.parentNode.insertBefore(tcv, svg.nextSibling);
    // Soft sprites for smoke and its shadow, drawn once.
    const mk = (r, stops) => { const c = document.createElement("canvas"); c.width = c.height = r * 2; const g = c.getContext("2d"), gr = g.createRadialGradient(r, r, 0, r, r, r);
      for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c; };
    sprite = mk(32, [[0, "rgba(255,255,255,0.95)"], [0.55, "rgba(241,238,232,0.7)"], [1, "rgba(230,226,218,0)"]]);
    shadowSprite = mk(32, [[0, "rgba(45,36,24,0.22)"], [1, "rgba(45,36,24,0)"]]);
    return tcv;
  }
  const CAR_GAPS = [0, 16, 30, 45];                      // locomotive, tender, two carriages (in drawing units)
  function paintCar(ctx, i) {
    if (i === 0) {                                          // locomotive seen from above: boiler, smokebox, chimney, cab
      ctx.fillStyle = "#1f1a15"; ctx.beginPath(); ctx.roundRect(-4, -3, 14, 6, 2.6); ctx.fill();
      ctx.fillStyle = "#2d2622"; ctx.beginPath(); ctx.roundRect(7, -2.6, 3.6, 5.2, 1.8); ctx.fill();
      ctx.fillStyle = "#0d0b09"; ctx.beginPath(); ctx.arc(8.2, 0, 1.1, 0, 7); ctx.fill();
      ctx.fillStyle = "#6b2a22"; ctx.fillRect(-8.6, -3.6, 5.2, 7.2); ctx.fillStyle = "#8a3a2e"; ctx.fillRect(-8.6, -3.6, 5.2, 1.4);
    } else if (i === 1) {                                   // tender heaped with coal
      ctx.fillStyle = "#1f1a15"; ctx.fillRect(-4.6, -3.3, 9.2, 6.6); ctx.fillStyle = "#3a3530"; ctx.fillRect(-3.6, -2.4, 7.2, 4.8);
    } else {                                                // a maroon carriage
      ctx.fillStyle = "#6a2a1e"; ctx.beginPath(); ctx.roundRect(-6.6, -3.3, 13.2, 6.6, 1.2); ctx.fill();
      ctx.fillStyle = "#8a4230"; ctx.fillRect(-6.4, -3.3, 12.8, 2); ctx.fillStyle = "#4a1c14"; ctx.fillRect(-6.6, 2.2, 13.2, 1.1);
    }
  }
  function paintShip(ctx) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-7, -1.6); ctx.moveTo(-14, 0); ctx.lineTo(-7, 1.6); ctx.stroke();
    ctx.fillStyle = "#1f1a15"; ctx.beginPath(); ctx.moveTo(-6, -2.6); ctx.lineTo(6, -2.6); ctx.lineTo(9, 0); ctx.lineTo(6, 2.6); ctx.lineTo(-6, 2.6); ctx.fill();
    ctx.fillStyle = "#e9dcc0"; ctx.fillRect(-4, -1.6, 6.5, 3.2); ctx.fillStyle = "#9b2a24"; ctx.beginPath(); ctx.arc(-0.5, 0, 1.4, 0, 7); ctx.fill();
  }
  function paintPlane(ctx) {
    ctx.fillStyle = "rgba(45,36,24,0.18)"; ctx.beginPath(); ctx.ellipse(3, 4, 4, 1.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#f0e7d1"; ctx.strokeStyle = "#5a4a36"; ctx.lineWidth = 0.4;
    ctx.fillRect(-4, -0.7, 8, 1.4); ctx.strokeRect(-4, -0.7, 8, 1.4);
    ctx.fillStyle = "#e2d5b4"; ctx.fillRect(-0.8, -5.5, 2.2, 11); ctx.strokeRect(-0.8, -5.5, 2.2, 11); ctx.fillRect(-3.8, -2, 1, 4);
  }
  function drawTraffic() {
    const cv = trafficCanvas();
    const now = performance.now(), dt = Math.min(0.1, (now - (trafficLast || now)) / 1000);
    if (now - trafficLast < 33) return; trafficLast = now;
    const w = svg.clientWidth, h = svg.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + "px"; cv.style.height = h + "px"; }
    const pb = svg.parentNode.getBoundingClientRect(), sb = svg.getBoundingClientRect();
    cv.style.left = (sb.left - pb.left) + "px"; cv.style.top = (sb.top - pb.top) + "px";
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!vehicles.length && !puffs.length) return;
    const r = svg.getScreenCTM(), unit = r.a;                 // screen pixels per map unit
    const S = 0.5 * grow();                                    // screen pixels per drawing unit
    const toScr = p => ({ x: (r.a * p.x + r.c * p.y + r.e - sb.left), y: (r.b * p.x + r.d * p.y + r.f - sb.top) });
    const onScreen = q => q.x > -60 && q.y > -60 && q.x < w + 60 && q.y < h + 60;
    const alpha = layerMode === "competition" ? 1 : 0.8;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Smoke shadows first, then vehicles, then smoke on top.
    for (const p of puffs) { p.age += dt; }
    puffs = puffs.filter(p => p.age < p.life);
    for (const p of puffs) {
      const k = p.age / p.life, fade = (1 - k) * (1 - k);
      p.x += (p.vx + Math.sin(p.age * 3 + p.seed) * 2.5) * dt / unit * S * 0.45; p.y += (p.vy + Math.cos(p.age * 2.4 + p.seed) * 1.5) * dt / unit * S * 0.45;
      p.vx *= 0.985; p.vy *= 0.985;
      const q = toScr(p); if (!onScreen(q)) continue;
      const rad = (2.4 + 11 * Math.sqrt(k)) * S / 2 * p.strength, lift = (2 + 10 * k) * S * 0.45;
      ctx.globalAlpha = fade * 0.9 * alpha; ctx.drawImage(shadowSprite, q.x + lift - rad * 1.1, q.y + lift * 1.2 - rad * 1.1, rad * 2.2, rad * 2.2);
    }
    for (const v of vehicles) {
      v.d += v.speed * dt;
      const gapMap = v.kind === "train" ? CAR_GAPS[CAR_GAPS.length - 1] * S / unit : 0;
      if (v.d - gapMap > v.poly.total) v.d = -Math.random() * 20;
      const cars = v.kind === "train" ? CAR_GAPS : [0];
      let head = null;
      for (let i = 0; i < cars.length; i++) {
        const d = v.d - cars[i] * S / unit;
        if (d < 0 || d > v.poly.total) continue;
        const a = along(v.poly, d), q = toScr(a);
        if (!onScreen(q)) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(q.x, q.y); ctx.rotate(a.ang); ctx.scale(S, S);
        ctx.globalAlpha = alpha;
        if (v.kind === "train") paintCar(ctx, i); else if (v.kind === "ship") paintShip(ctx); else paintPlane(ctx);
        if (i === 0) head = a;
      }
      // Smoke from the locomotive's chimney, and more lazily from a steamer's funnel.
      if (head && v.kind !== "plane") {
        v.puffT += dt;
        const every = v.kind === "train" ? 0.18 : 0.45;
        if (v.puffT > every) {
          v.puffT = 0;
          const off = (v.kind === "train" ? 8.2 : -0.5) * S / unit;
          puffs.push({ x: head.x + Math.cos(head.ang) * off, y: head.y + Math.sin(head.ang) * off, age: 0, life: 2.4 + Math.random() * 0.8,
            vx: -Math.cos(head.ang) * 5 + 12, vy: -Math.sin(head.ang) * 5 - 9, seed: Math.random() * 6, strength: v.kind === "train" ? 1 : 0.8 });
        }
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of puffs) {
      const q = toScr(p); if (!onScreen(q)) continue;
      const k = p.age / p.life, fade = (1 - k) * (1 - k), rad = (2.4 + 11 * Math.sqrt(k)) * S / 2 * p.strength;
      ctx.globalAlpha = fade * alpha; ctx.drawImage(sprite, q.x - rad, q.y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
  }

  // Map layers ------------------------------------------------------------------------
  let layerMode = "normal", draftStops = null;
  function setLayer(mode) { layerMode = mode; svg.classList.toggle("layer-dim", mode !== "normal" && mode !== "competition"); layoutCities(); syncExtras(U.state); syncTransport(U.state); }

  // Facility symbols beside each city: own in the company color, public in slate.
  const GLYPH_UNUSED = {
    mast: '<path d="M0,-4.5 L0,3.5 M-2.2,3.5 L2.2,3.5"/><path class="fill" d="M0,-5 L2.4,-2.6 L0,-1.8 Z"/>',
    terminal: '<rect class="fill" x="-2.8" y="-2.4" width="5.6" height="5"/><path d="M-3.4,-2.4 L0,-4.6 L3.4,-2.4"/>',
    shed: '<path class="fill" d="M-3.4,3 L-3.4,-0.6 C-3.4,-4.4 3.4,-4.4 3.4,-0.6 L3.4,3 Z"/>',
    public: '<path class="fill" d="M-3,3 L-3,-1 L0,-3.4 L3,-1 L3,3 Z"/><path d="M-1.2,3 L-1.2,0.6 L1.2,0.6 L1.2,3"/>'
  };
  function syncExtras(state) {
    if (!svg || !state || !state.facilities) return;
    layers.fac.innerHTML = ""; layers.overlay.innerHTML = "";
    const z = zoom, F = U.facilities, hour = U.sim.H(state.tick);
    svg.classList.toggle("layer-facilities", layerMode === "facilities");
    // Demand circles: by city in the Passengers and Freight layers, or relative to the last stop while drawing.
    const origin = draftStops && draftStops.length ? draftStops[draftStops.length - 1] : null;
    if (origin || layerMode === "passengers" || layerMode === "freight") {
      for (const c of U.CITIES) {
        let pax, tons;
        if (origin) {
          if (c.id === origin) continue;
          const only = U.tutorial && U.tutorial.draftCities ? U.tutorial.draftCities() : null;
          if (only && !only.includes(c.id)) continue;
          pax = U.sim.dailyPassengers(origin, c.id); tons = U.sim.dailyFreight(origin, c.id);
          if (pax < 2 && tons < 1) continue;
        }
        else { pax = U.TIERS[c.tier].demand * U.SPECIALTIES[c.specialty].passengerBoost; tons = U.TIERS[c.tier].demand / 6 * U.SPECIALTIES[c.specialty].freightBoost; }
        if (origin || layerMode === "passengers") {
          const r = Math.sqrt(pax) * 2.2 / z;
          const circ = el("circle", { cx: c.x, cy: c.y, r, class: "demand-pax" }, layers.overlay);
          el("title", {}, circ).textContent = origin ? `${c.name}: about ${Math.round(pax)} passengers and ${Math.round(tons)} tons a day each way with ${U.cityById[origin].name}` : `${c.name}: passenger demand`;
        }
        if (origin || layerMode === "freight") {
          const r = Math.sqrt(tons) * (origin ? 3.2 : 4.6) / z;
          el("rect", { x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r, class: origin ? "demand-freight ring" : "demand-freight" }, layers.overlay);
        }
      }
    }
    // Facility symbols. Normal layer: your own, stacked in a pyramid above the city (never top-heavy),
    // with a slate ring round the dot where public facilities stand. Facilities layer: public ones too.
    if (layerMode === "passengers" || layerMode === "freight") return;
    const full = layerMode === "facilities";
    const sc = 0.62 * grow() * (full ? 1.35 : 1) / z;
    for (const c of U.CITIES) {
      const own = state.facilities[c.id] || {}, pub = F.hasPublic(c.id), dotR = U.TIERS[c.tier].r * grow() / z;
      const items = [];
      for (const t of ["mast", "terminal", "shed", "gasplant", "hestore", "school", "refinery"]) {
        if (own[t]) items.push({ t, own: true, level: own[t] });
        else if (full && (t === "gasplant" ? F.publicGas(c.id) : t !== "hestore" && t !== "school" && t !== "refinery" && pub)) items.push({ t, own: false, level: t === "gasplant" ? 1 : 2 });
      }
      const warn = F.congested(state, c.id, hour);
      if (pub && !full) el("circle", { cx: c.x, cy: c.y, r: dotR + 2.6 / z * grow(), class: "pub-ring" }, layers.fac);
      if (warn) el("use", { href: "#fac-warn", transform: `translate(${c.x - dotR - 6 * sc},${c.y}) scale(${sc})` }, layers.fac);
      if (!items.length) continue;
      // Rows of at most three, the lower rows holding more.
      // Up to two sit side by side; three or more split into rows, e.g. 1 over 2, 2 over 2, 2 over 3.
      const n = items.length, rowCount = n <= 2 ? 1 : Math.max(2, Math.ceil(n / 3)), rows = [];
      let left = n;
      for (let r = 0; r < rowCount; r++) { const take = Math.ceil(left / (rowCount - r)); rows.push(take); left -= take; }
      rows.sort((a, b) => a - b);                           // top to bottom, fullest row at the bottom
      const below = c.label === "t";                        // label above the dot: stack below it instead
      const g = el("g", { class: "fac", transform: `translate(${c.x},${below ? c.y + dotR + 1 / z : c.y - dotR - 1 / z}) scale(${sc})` }, layers.fac);
      const rowH = 23, gap = 1.5;
      let k = 0;
      rows.forEach((count, ri) => {
        const row = items.slice(k, k + count); k += count;
        const width = row.reduce((a, it) => a + 2 * U.facArt.WIDTH[it.t][it.level], 0) + gap * (count - 1);
        let x = -width / 2;
        const y = below ? 12 + ri * rowH : -11.5 - (rows.length - 1 - ri) * rowH;
        for (const it of row) {
          const half = U.facArt.WIDTH[it.t][it.level];
          el("use", { href: `#fac-${it.t}-${it.level}`, x: x + half, y, class: it.own ? "fac-own" : "fac-pub" }, g);
          x += 2 * half + gap;
        }
      });
    }
  }
  function draftDemand(stops) { draftStops = stops && stops.length ? stops : null; syncExtras(U.state); }

  U.map = { buildPolys, drawTraffic, syncTransport, drawWeather, init, syncRoutes, drawShips, drawDraft, zoomBy, highlight, shipPosition, project, setSetup, setHome, setLayer, syncExtras, draftDemand };
})(window.UpShip);
