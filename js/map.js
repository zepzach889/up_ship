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

  // Hand-placed country labels where the automatic spot collides with cities.
  const LABELS = {
    "Irish Free State": { lon: -8.1, lat: 52.2, size: 9.5 },
    "United Kingdom": { lon: -1.6, lat: 54.75, size: 13 },
    "Poland": { lon: 18.6, lat: 51.2 },
    "Hungary": { lon: 19.6, lat: 46.75, size: 13 },
    "Spain": { lon: -3.6, lat: 39.3 },
    "Portugal": { lon: -7.85, lat: 40.7, size: 11, rotate: -80 },
    "Austria": { lon: 15.3, lat: 47.3, size: 13 },
    "Czechoslovakia": { lon: 17.2, lat: 49.2, size: 13 },
    "Switzerland": null, "Denmark": null, "Netherlands": null, "Belgium": null, "Albania": null,
    "Norway": { lon: 8.4, lat: 60.9 },
    "Soviet Union": { lon: 31, lat: 54.5 },
    "Greece": { lon: 21.9, lat: 39.4, size: 13 },
    "Lithuania": null, "Latvia": null, "Estonia": null, "Finland": null
  };

  let svg, world, layers = {}, view = { x: 0, y: 0, w: M.width, h: M.height }, zoom = 1;
  const cityNodes = {}, shipNodes = {}, routeNodes = {};
  let onSelect = () => {};

  function init(container, handlers) {
    onSelect = handlers.onSelect;
    svg = el("svg", { class: "map", viewBox: `0 0 ${M.width} ${M.height}`, role: "img", "aria-label": "Map of Europe" }, container);
    const defs = el("defs", {}, svg);
    el("path", { id: "land-shape", d: M.land }, defs);
    const hull = el("g", { id: "ship-shape" }, defs);
    el("path", { d: "M-11,0 C-8,-3.6 7,-3.6 11,0 C7,3.6 -8,3.6 -11,0 Z", class: "ship-hull" }, hull);
    el("path", { d: "M-11,0 L-14,-3.2 L-12.2,0 L-14,3.2 Z", class: "ship-fin" }, hull);
    el("rect", { x: -2.5, y: 2.6, width: 5, height: 1.8, rx: 0.6, class: "ship-car" }, hull);

    world = el("g", {}, svg);
    el("rect", { x: -M.width, y: -M.height, width: M.width * 3, height: M.height * 3, class: "sea" }, world);
    layers.graticule = el("g", { class: "graticule" }, world);
    layers.waterlines = el("g", { class: "waterlines" }, world);
    layers.land = el("g", {}, world);
    layers.countries = el("g", { class: "countries" }, world);
    layers.countryLabels = el("g", { class: "country-labels" }, world);
    layers.routes = el("g", { class: "routes" }, world);
    layers.cities = el("g", { class: "cities" }, world);
    layers.ships = el("g", { class: "ships" }, world);

    drawGraticule();
    // Water lining: alternating strokes of the coast, as on period atlases.
    [[15, "wl-line"], [13, "wl-sea"], [9.5, "wl-line"], [7.5, "wl-sea"], [4.5, "wl-line"], [3, "wl-sea"]]
      .forEach(([w, cls]) => el("use", { href: "#land-shape", class: cls, "stroke-width": w }, layers.waterlines));
    el("use", { href: "#land-shape", class: "land" }, layers.land);

    for (const c of M.countries) {
      el("path", { d: c.path, class: `country tint-${c.tint}` }, layers.countries);
      const o = LABELS[c.name];
      if (o === null || (c.area < 9000 && !o)) continue;
      const [x, y] = o ? project(o.lon, o.lat) : c.label;
      const t = el("text", { x, y, class: "country-label" }, layers.countryLabels);
      if (o && o.rotate) t.setAttribute("transform", `rotate(${o.rotate} ${x} ${y})`);
      t.dataset.size = (o && o.size) || 15;
      t.textContent = c.name;
    }
    el("use", { href: "#land-shape", class: "coast" }, layers.land.parentNode.insertBefore(el("g", {}), layers.countryLabels));

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
      const n = cityNodes[id], c = n.city, r = U.TIERS[c.tier].r / z;
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
  function syncRoutes(state) {
    for (const route of state.routes) {
      let n = routeNodes[route.id];
      const pts = route.stops.map(id => U.cityById[id]).map(c => [c.x, c.y]);
      const d = "M" + pts.map(p => p.join(",")).join("L");
      if (!n) {
        const g = el("g", { class: "route", tabindex: 0, role: "button", "aria-label": "Route " + route.stops.map(s => U.cityById[s].name).join(" to ") }, layers.routes);
        const hit = el("path", { d, class: "route-hit" }, g);
        const line = el("path", { d, class: "route-line" }, g);
        g.addEventListener("click", e => { e.stopPropagation(); onSelect({ type: "route", id: route.id }); });
        g.addEventListener("keydown", e => { if (e.key === "Enter") onSelect({ type: "route", id: route.id }); });
        n = routeNodes[route.id] = { g, hit, line };
      }
      const sum = U.sim.routeSummary(state, route.id);
      n.g.classList.toggle("is-profit", sum.days > 0 && sum.profit >= 0);
      n.g.classList.toggle("is-loss", sum.days > 0 && sum.profit < 0);
    }
  }

  function shipPosition(ship, progress) {
    // progress: 0..1 through the current half-day tick
    if (!ship.leg) {
      const c = U.cityById[U.sim.routeOf(U.state, ship).stops[ship.at]];
      return { x: c.x, y: c.y, angle: 0, flying: false };
    }
    const a = U.cityById[ship.leg.from], b = U.cityById[ship.leg.to];
    const f = Math.min(1, progress / (ship.leg.hours / U.TIME.tickHours));
    const e = f < 1 ? f : 1;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, angle: ang, flying: f < 1, fraction: f };
  }

  function drawShips(state, progress) {
    for (const ship of state.ships) {
      let n = shipNodes[ship.id];
      if (!n) {
        const g = el("g", { class: "ship", tabindex: 0, role: "button", "aria-label": "Ship " + ship.name }, layers.ships);
        el("circle", { r: 14, class: "ship-hit" }, g);
        const body = el("use", { href: "#ship-shape" }, g);
        g.addEventListener("click", e => { e.stopPropagation(); onSelect({ type: "ship", id: ship.id }); });
        g.addEventListener("keydown", e => { if (e.key === "Enter") onSelect({ type: "ship", id: ship.id }); });
        n = shipNodes[ship.id] = { g, body };
      }
      const p = shipPosition(ship, progress);
      const s = 1.6 / zoom;
      // When moored, sit just above the mast so the city stays clickable.
      const dx = 0, dy = p.flying ? 0 : -15 / zoom;
      let angle = p.flying ? p.angle : 0;
      if (angle > 90 || angle < -90) { n.body.setAttribute("transform", `scale(1,-1)`); } else { n.body.removeAttribute("transform"); }
      n.g.setAttribute("transform", `translate(${p.x + dx},${p.y + dy}) rotate(${angle}) scale(${s})`);
      n.g.classList.toggle("is-moored", !p.flying);
    }
  }

  // Zoom and pan ------------------------------------------------------------
  function applyView() {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
    // zoom = screen pixels per map unit, so labels and icons keep a fixed on-screen size.
    const r = svg.getBoundingClientRect();
    zoom = (r.width || M.width) / view.w;
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

  U.map = { init, syncRoutes, drawShips, zoomBy, highlight, shipPosition, project };
})(window.UpShip);
