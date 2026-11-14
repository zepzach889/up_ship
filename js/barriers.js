// Mountain walls: the great ranges an airship of the period could not climb over. A leg whose straight path would cross
// one goes instead by a pass or round an end, and its distance is the distance that way. Each wall is a line along the
// crest, broken at its passes; the passes and the ends are waypoints a leg may be routed through.
window.UpShip = window.UpShip || {};
(function (U) {
  const RAD = Math.PI / 180, R = 6371;
  // Points are [lat, lon].
  const WALLS = [
    { name: "the Andes",
      lines: [
        [[6.0, -75.5], [1.0, -77.8], [-2.5, -79.0], [-5.5, -79.35]],
        [[-6.2, -79.15], [-9.5, -77.4], [-13.5, -74.5], [-16.0, -70.5], [-18.5, -69.2], [-23.0, -67.8], [-27.5, -68.6], [-32.8, -70.1], [-36.5, -70.6], [-40.3, -71.6]],
        [[-41.1, -72.0], [-46.5, -73.0], [-50.5, -73.2], [-52.2, -72.4]]
      ],
      ways: [
        { name: "the Porculla Pass", at: [-5.85, -79.25], load: 0.85, pass: true },          // 2,145 m: the lowest pass of the northern Andes, still a stiff climb
        { name: "the southern lakes passes", at: [-40.7, -71.8], pass: true },                // about 1,000 to 1,300 m
        { name: "the northern end of the Andes", at: [6.7, -75.7] },
        { name: "the coast of Peru", at: [-4.9, -81.7] },                                     // off the western bulge, so a coastal flight follows the coast
        { name: "the Strait of Magellan", at: [-53.6, -71.0] }
      ] },
    { name: "the Himalaya",
      lines: [
        [[32.5, 69.8], [33.9, 70.6], [34.0, 70.9]],                                             // the frontier ranges south of the Khyber
        [[34.4, 71.5], [36.0, 72.5], [36.5, 75.0], [35.5, 77.5], [32.5, 78.5], [30.5, 80.5], [28.5, 84.0], [27.9, 87.0], [27.8, 89.5], [28.0, 92.5], [28.8, 95.5], [28.2, 97.5], [26.0, 98.6], [24.0, 98.5]]
      ],
      ways: [
        { name: "the Khyber Pass", at: [34.1, 71.1], load: 0.85, pass: true },                 // 1,070 m, and a climb beyond to Kabul's plateau
        { name: "the southern end of the Burma ranges", at: [23.2, 98.7] }
      ] },
    { name: "the Rockies",
      lines: [
        [[58.0, -125.0], [53.0, -118.5], [51.0, -116.0], [49.2, -114.4], [48.6, -113.6]],
        [[48.0, -113.1], [47.0, -112.6], [45.5, -111.0], [44.0, -110.0], [42.5, -109.3], [40.5, -106.2], [39.0, -106.3], [37.5, -106.8], [35.8, -105.8], [34.4, -106.0]]
      ],
      ways: [
        { name: "Marias Pass", at: [48.3, -113.35], pass: true },                             // 1,590 m, in Montana
        { name: "the southern route by El Paso", at: [32.8, -105.6] }                         // the way the Shenandoah went in 1924
      ] }
  ];
  const SEGS = [];                                              // every wall segment, with its bounds
  for (const w of WALLS) for (const line of w.lines) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    SEGS.push({ w, a, b, minLat: Math.min(a[0], b[0]) - 0.01, maxLat: Math.max(a[0], b[0]) + 0.01, minLon: Math.min(a[1], b[1]) - 0.01, maxLon: Math.max(a[1], b[1]) + 0.01 });
  }
  const BOX = { minLat: Math.min(...SEGS.map(s => s.minLat)), maxLat: Math.max(...SEGS.map(s => s.maxLat)), minLon: Math.min(...SEGS.map(s => s.minLon)), maxLon: Math.max(...SEGS.map(s => s.maxLon)) };
  const WAYS = WALLS.flatMap(w => w.ways), ALL = SEGS;
  const WBOX = WALLS.map(w => { const segs = SEGS.filter(s0 => s0.w === w); return { segs, minLat: Math.min(...segs.map(s0 => s0.minLat)), maxLat: Math.max(...segs.map(s0 => s0.maxLat)), minLon: Math.min(...segs.map(s0 => s0.minLon)), maxLon: Math.max(...segs.map(s0 => s0.maxLon)) }; });

  function km(p, q) {
    const dLat = (q[0] - p[0]) * RAD, dLon = (q[1] - p[1]) * RAD, h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * RAD) * Math.cos(q[0] * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // A point a fraction of the way along the great circle from p to q.
  function along(p, q, t) {
    const d = km(p, q) / R; if (d < 1e-9) return p;
    const a = Math.sin((1 - t) * d) / Math.sin(d), b = Math.sin(t * d) / Math.sin(d);
    const x = a * Math.cos(p[0] * RAD) * Math.cos(p[1] * RAD) + b * Math.cos(q[0] * RAD) * Math.cos(q[1] * RAD);
    const y = a * Math.cos(p[0] * RAD) * Math.sin(p[1] * RAD) + b * Math.cos(q[0] * RAD) * Math.sin(q[1] * RAD);
    const z = a * Math.sin(p[0] * RAD) + b * Math.sin(q[0] * RAD);
    return [Math.atan2(z, Math.hypot(x, y)) / RAD, Math.atan2(y, x) / RAD];
  }
  const cross = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  const meets = (p, q, a, b) => { const d1 = cross(a, b, p), d2 = cross(a, b, q), d3 = cross(p, q, a), d4 = cross(p, q, b); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
  // Does the great circle from p to q cross a wall? Walked in short steps, each tested against the wall segments near it.
  function blocked(p, q) {
    // Only the walls whose surroundings the path comes near are tested (a path spanning more than half the world tests all).
    const wide = Math.abs(p[1] - q[1]) > 150, near = wide ? WBOX : WBOX.filter(B => !(Math.max(p[0], q[0]) < B.minLat - 25 || Math.min(p[0], q[0]) > B.maxLat + 25 || Math.max(p[1], q[1]) < B.minLon - 3 || Math.min(p[1], q[1]) > B.maxLon + 3));
    if (!near.length) return false;
    const SEGS = near.length === WBOX.length ? ALL : near.flatMap(B => B.segs);
    const n = Math.max(2, Math.ceil(km(p, q) / 60)); let prev = p;
    for (let i = 1; i <= n; i++) {
      const cur = i === n ? q : along(p, q, i / n);
      if (Math.abs(cur[1] - prev[1]) < 180) {
        const lo = Math.min(prev[0], cur[0]), hi = Math.max(prev[0], cur[0]), lo2 = Math.min(prev[1], cur[1]), hi2 = Math.max(prev[1], cur[1]);
        for (const s of SEGS) { if (hi < s.minLat || lo > s.maxLat || hi2 < s.minLon || lo2 > s.maxLon) continue; if (meets(prev, cur, s.a, s.b)) return true; }
      }
      prev = cur;
    }
    return false;
  }
  // The way from p to q: straight if no wall lies between, else the shortest chain through passes and round ends.
  // Returns { km, via: [waypoints], load } (load is the share of a full load the way allows; a high pass cuts it).
  const memo = new Map(), edge = new Map();
  const open = (i, j, P) => { const k0 = i < j ? i + ":" + j : j + ":" + i; if (i >= 2 && j >= 2) { if (!edge.has(k0)) edge.set(k0, !blocked(P[i], P[j])); return edge.get(k0); } return !blocked(P[i], P[j]); };
  function route(p, q) {
    const key = p[0].toFixed(3) + "," + p[1].toFixed(3) + "|" + q[0].toFixed(3) + "," + q[1].toFixed(3);
    if (memo.has(key)) return memo.get(key);
    let out;
    if (!blocked(p, q)) out = { km: km(p, q), via: [], load: 1 };
    else {
      const P = [p, q, ...WAYS.map(w => w.at)], n = P.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false); dist[0] = 0;
      for (;;) {
        let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || u === 1) break; done[u] = true;
        for (let v = 0; v < n; v++) { if (done[v] || v === u || (u === 0 && v === 1)) continue; if (!open(u, v, P)) continue; const d = dist[u] + km(P[u], P[v]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
      }
      if (dist[1] === Infinity) out = { km: Infinity, via: [], load: 1, barred: true };
      else { const via = []; for (let v = prev[1]; v > 0; v = prev[v]) via.unshift(WAYS[v - 2]); out = { km: dist[1], via, load: Math.min(1, ...via.map(w => w.load || 1)) }; }
    }
    memo.set(key, out); return out;
  }
  U.barriers = { WALLS, route, km, along, blocked };
})(window.UpShip);
