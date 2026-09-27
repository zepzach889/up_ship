// Competition from rail, sea, and air. It reshapes airship demand without shrinking it overall:
// multipliers are normalized so the demand-weighted average across all city pairs stays at 1.
window.UpShip = window.UpShip || {};
(function (U) {
  const S = () => U.sim;
  // Railways, boat trains, and steamer lanes come from the transport data, with waypoints that follow the geography.
  const hav = (p, q) => { const R = 6371, r = Math.PI / 180, dLat = (q[0] - p[0]) * r, dLon = (q[1] - p[1]) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * r) * Math.cos(q[0] * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const pt = x => Array.isArray(x) ? x : U.cityById[x] ? [U.cityById[x].lat, U.cityById[x].lon] : U.TRANSPORT.POINTS[x];
  const LINKS = U.TRANSPORT.ROUTES.map(rt => {
    const segs = rt.segs.map(sg => { const pts = sg.pts.map(pt); let km = 0; for (let i = 1; i < pts.length; i++) km += hav(pts[i - 1], pts[i]); return { type: sg.type, pts, km }; });
    return { a: rt.a, b: rt.b, express: rt.express, type: rt.sea ? "sea" : rt.boat ? "boat" : "rail", segs };
  });
  // Air services, loosely following history: [a, b, year, month, operator].
  const AIR = [["london", "paris", 1919, 8, "Aircraft Transport and Travel"], ["london", "amsterdam", 1920, 5, "KLM"], ["paris", "brussels", 1920, 7, "a Belgian air company"],
    ["amsterdam", "hamburg", 1921, 4, "KLM"], ["paris", "london", 1924, 4, "Imperial Airways"], ["berlin", "munich", 1926, 4, "Lufthansa"], ["berlin", "hamburg", 1926, 5, "Lufthansa"],
    ["berlin", "vienna", 1927, 6, "Lufthansa"], ["vienna", "budapest", 1928, 4, "a Hungarian air company"], ["paris", "marseille", 1929, 3, "Air Union"],
    ["milan", "rome", 1929, 9, "an Italian air company"], ["london", "cologne", 1930, 4, "Imperial Airways"], ["marseille", "algiers", 1932, 5, "Air France"],
    ["zurich", "milan", 1932, 6, "Swissair"], ["copenhagen", "stockholm", 1933, 5, "an air company"]];
  const EVENTS = [
    { year: 1919, month: 11, text: "the nord express resumes berlin to warsaw after the war stop rail competition on eastern routes stop" },
    { year: 1929, month: 9, text: "golden arrow luxury boat train opens london to paris stop rail competition on the channel route stop" },
    { year: 1931, month: 6, text: "new larger airliners enter service stop airplanes compete harder on short routes stop" }
  ];
  const SPEED = { express: 65, rail: 42, sea: 24 };                   // average km/h, 1920s
  const km = (a, b) => S().distanceKm(a, b);
  // Journey time along the actual route: rail at express or ordinary speed, steamers slower, and time lost changing at the ports.
  const linkHours = l => l.segs.reduce((h, sg) => h + sg.km / (sg.type === "sea" ? SPEED.sea : l.express || l.type === "boat" ? SPEED.express : SPEED.rail), 0)
    + (l.type === "boat" ? 2 : l.type === "sea" ? 3 : 0);

  // Fastest surface journey between two cities, and whether it crosses water.
  let graph = null;
  function surface(a, b) {
    if (!graph) { graph = {}; for (const l of LINKS) { (graph[l.a] = graph[l.a] || []).push({ to: l.b, h: linkHours(l), water: l.type !== "rail", l }); (graph[l.b] = graph[l.b] || []).push({ to: l.a, h: linkHours(l), water: l.type !== "rail", l }); } }
    const dist = { [a]: 0 }, water = { [a]: false }, done = new Set();
    for (;;) {
      let u = null; for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || u === b) break;
      done.add(u);
      for (const e of graph[u] || []) { const d = dist[u] + e.h + 0.5; if (dist[e.to] == null || d < dist[e.to]) { dist[e.to] = d; water[e.to] = water[u] || e.water; } }
    }
    return dist[b] == null ? { hours: Infinity, water: true } : { hours: dist[b], water: water[b] };
  }
  const monthIndex = state => { const d = S().dateAtHour(S().H(state.tick)); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  // The most recent air service on the pair, if any has opened.
  const airActive = (state, a, b) => AIR.filter(s => ((s[0] === a && s[1] === b) || (s[0] === b && s[1] === a)) && monthIndex(state) >= s[2] * 12 + s[3] - 1).pop();
  function airshipSpeed(state) { return 110 * (U.research.has(state, "engines1") ? 1.08 : 1) * (U.research.has(state, "structures4") ? 1.1 : 1); }

  // The raw multiplier for one pair, before normalizing.
  function raw(state, a, b) {
    const d = km(a, b), air = d / airshipSpeed(state) + 3;
    const sHours = surface(a, b);
    // Long journeys by train lose far more time to stops, changes, and borders than express speeds suggest.
    if (sHours.hours !== Infinity) sHours.hours += Math.max(0, d - 500) / 400 * 3;
    const r = Math.min(6, sHours.hours / air);
    let m = r <= 0.8 ? 0.7 : r <= 2 ? 0.7 + 0.3 * (r - 0.8) / 1.2 : r <= 4 ? 1 + 0.2 * (r - 2) / 2 : 1.2;
    if (sHours.water) m += 0.1;
    if (d > 1000) m += 0.1 * Math.min(1, (d - 1000) / 1000);          // trains take days
    const plane = airActive(state, a, b);
    if (plane && d < 600) { const y = monthIndex(state) / 12 - 1919; m *= 1 - 0.25 * Math.max(0, Math.min(1, y / 16)); }
    return { m: Math.max(0.5, Math.min(1.3, m)), rail: sHours, plane, r };
  }
  // Cached for the year and the company's research, normalized so the map-wide average stays at 1.
  let cache = null;
  function table(state) {
    const key = Math.floor(monthIndex(state) / 12) + ":" + airshipSpeed(state).toFixed(1);
    if (cache && cache.key === key) return cache;
    const t = {}; let sum = 0, wsum = 0;
    for (const A of U.CITIES) for (const B of U.CITIES) {
      if (A.id >= B.id) continue;
      const x = raw(state, A.id, B.id), w = S().dailyPassengers(A.id, B.id);
      t[A.id + ">" + B.id] = x; sum += x.m * w; wsum += w;
    }
    const norm = wsum ? Math.sqrt(wsum / sum) : 1;           // halfway: overall demand within a few percent, long routes keep their edge
    for (const k in t) t[k].final = Math.max(0.5, Math.min(1.3, t[k].m * norm));
    cache = { key, t };
    return cache;
  }
  function info(state, a, b) { const t = table(state).t; return t[a < b ? a + ">" + b : b + ">" + a]; }
  const mult = (state, a, b) => { const x = info(state, a, b); return x ? x.final : 1; };

  // Plain words for panels.
  function describe(state, a, b) {
    const x = info(state, a, b); if (!x) return "";
    const h = x.rail.hours, hrs = h === Infinity ? null : Math.round(h);
    const surface = hrs == null ? "no through surface route" : `${x.rail.water ? "by rail and steamer" : "by rail"} about ${hrs} hours`;
    const plane = x.plane ? `; ${x.plane[4]} flies it` : "";
    const pct = Math.round((x.final - 1) * 100);
    const verdict = pct >= 10 ? `airships have the edge (+${pct}% travelers)` : pct <= -10 ? `airships at a disadvantage (${pct}% travelers)` : "an even contest";
    return `${U.cityById[a].name}–${U.cityById[b].name}: ${surface}${plane}; ${verdict}.`;
  }

  // Monthly: announce new air services and other arrivals.
  function monthly(state) {
    const m = monthIndex(state), seen = state.compSeen = state.compSeen || {};
    for (const s of AIR) { const k = "air:" + s[0] + s[1]; if (!seen[k] && m >= s[2] * 12 + s[3] - 1) { seen[k] = 1;
      if (m - (s[2] * 12 + s[3] - 1) < 2) S().telegram(state, S().H(state.tick), `${s[4].toLowerCase()} opens air service ${U.cityById[s[0]].name} to ${U.cityById[s[1]].name} stop competition on the route stop`, false, { type: "city", id: s[0] }); } }
    for (const e of EVENTS) { const k = "ev:" + e.year + e.month; if (!seen[k] && m >= e.year * 12 + e.month - 1) { seen[k] = 1; if (m - (e.year * 12 + e.month - 1) < 2) S().telegram(state, S().H(state.tick), e.text, false, { type: "routes" }); } }
  }

  U.competition = { LINKS, AIR, mult, info, describe, monthly, airActive, monthIndex };
})(window.UpShip);
