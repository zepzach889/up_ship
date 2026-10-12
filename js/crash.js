// The crash scene: when a ship is lost, the game pauses, the map glides to the spot, and a short scene plays
// over the map (fire, a storm, or a forced landing) before the telegram appears. It stays until the telegram goes.
window.UpShip = window.UpShip || {};
(function (U) {
  const NS = "http://www.w3.org/2000/svg";
  let layer = null, raf = null;

  function play(crash, then) {
    const a = U.cityById[crash.from], b = U.cityById[crash.to];
    if (!a || !b || !U.map.focus) { then(); return; }
    const A = [a.realLon ?? a.lon, a.realLat ?? a.lat], B = [b.realLon ?? b.lon, b.realLat ?? b.lat], here = d3.geoInterpolate(A, B)(crash.at);
    const k = Math.max(U.globe.view.k, 9);
    if (crash.kind === "damage") { U.map.focus(here[0], here[1], k, 1200, then); return; }          // short of a loss: the globe turns to it, no scene
    U.map.focus(here[0], here[1], k, 1300, () => {
      // Once there: the spot on screen, the course's heading as it looks on the globe, and a size to suit the screen.
      const [x, y] = U.map.project(here[0], here[1]), ahead = U.map.project(...d3.geoInterpolate(A, B)(Math.min(1, crash.at + 0.02)));
      const { W: sw, H: sh } = U.globe.size(), W = Math.min(sw, sh) * 0.9, heading = Math.atan2(ahead[1] - y, ahead[0] - x) * 180 / Math.PI;
      scene(crash.kind, x, y, W, heading, then);
    });
  }
  function scene(kind, x, y, W, heading, then) {
    clear();
    const svg = document.querySelector("#map svg");
    layer = document.createElementNS(NS, "g"); layer.id = "crash-layer"; svg.appendChild(layer);
    const L = W * 0.14, R = L * 0.15, flip = Math.abs(heading) > 90 ? -1 : 1;           // the ship drawn level, facing her way of travel
    const t0 = performance.now(), dur = 5200;
    const defs = `<defs><linearGradient id="cr-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eceeec"/><stop offset="0.45" stop-color="#c9cbc8"/><stop offset="1" stop-color="#8e908d"/></linearGradient>
      <linearGradient id="cr-fire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.5" stop-color="#f08a2a"/><stop offset="1" stop-color="#a83a14"/></linearGradient>
      <filter id="cr-soft" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="${R * 0.35}"/></filter>
      <filter id="cr-softer" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="${R * 1.1}"/></filter></defs>`;
    const hull = (cls, extra = "") => `<path d="M${-L / 2},0 C${-L / 2},${-R} ${-L * 0.3},${-R} ${-L * 0.2},${-R} L${L * 0.3},${-R} C${L * 0.45},${-R} ${L / 2},${-R * 0.4} ${L / 2},0 C${L / 2},${R * 0.4} ${L * 0.45},${R} ${L * 0.3},${R} L${-L * 0.2},${R} C${-L * 0.3},${R} ${-L / 2},${R} ${-L / 2},0 Z" class="${cls}" ${extra}/>`;
    const fins = `<path d="M${-L * 0.42},${-R * 0.7} L${-L * 0.52},${-R * 1.6} L${-L * 0.36},${-R * 0.8} Z M${-L * 0.42},${R * 0.7} L${-L * 0.52},${R * 1.6} L${-L * 0.36},${R * 0.8} Z" class="cr-fin"/>`;
    const ground = y + W * 0.09;
    function frame(now) {
      const k = Math.min(1, (now - t0) / dur);
      let g = defs;
      if (kind === "disaster") {
        // Fire from the stern forward; smoke; then the bare frame settles to the ground.
        const burn = Math.min(1, k * 1.6), fall = Math.max(0, (k - 0.45) / 0.55), cy = y + (ground - y - R) * fall * fall, tilt = 18 * fall;
        const fx = L / 2 - L * burn;
        let flames = "";
        for (let i = 0; i < 12; i++) { const px = (L / 2 - L * burn * (i / 11)) * flip, h = R * (0.9 + 0.7 * Math.abs(Math.sin(now / 110 + i * 1.9))); if (burn > 0.05) flames += `<ellipse cx="${px}" cy="${-R * 0.75 - h * 0.45}" rx="${R * 0.32}" ry="${h * 0.55}" fill="url(#cr-fire)" opacity="0.85" filter="url(#cr-soft)"/>`; }
        let smoke = ""; for (let i = 0; i < 8; i++) { const s = (now / 1600 + i / 8) % 1; smoke += `<circle cx="${(L / 2 - L * burn * 0.6) * flip + s * R * 3}" cy="${-R * 1.4 - s * R * 7}" r="${R * (0.6 + s * 1.4)}" fill="#4a4440" opacity="${(1 - s) * 0.45 * Math.min(1, burn * 3)}" filter="url(#cr-softer)"/>`; }
        const frameLines = Array.from({ length: 9 }, (_, i) => { const px = -L / 2 + L * (i + 0.5) / 9; return `<line x1="${px}" y1="${-R * 0.9}" x2="${px}" y2="${R * 0.9}" class="cr-frame"/>`; }).join("");
        g += `<g transform="translate(${x} ${cy}) rotate(${tilt * flip})">${smoke}
          <ellipse cx="${(L / 2 - L * burn / 2) * flip}" cy="0" rx="${L * burn * 0.6 + R}" ry="${R * 2.2}" fill="#f08a2a" opacity="${0.35 * burn}" filter="url(#cr-softer)"/>
          <g opacity="${1 - Math.min(1, fall * 1.4)}">${hull("cr-hull", 'fill="url(#cr-shade)"')}${fins}</g>
          <clipPath id="cr-burn"><rect x="${flip > 0 ? fx : -L / 2}" y="${-R * 1.2}" width="${L * burn}" height="${R * 2.4}"/></clipPath>
          <g clip-path="url(#cr-burn)">${hull("cr-glow", 'fill="url(#cr-fire)"')}</g><g opacity="${0.35 + 0.65 * burn}">${frameLines}</g>${flames}</g>`;
      } else {
        // A storm: cloud and rain, the ship pitching, then breaking in two and falling.
        const brk = Math.max(0, (k - 0.4) / 0.6), pitch = 10 * Math.sin(now / 260) * (1 - brk);
        let rain = ""; for (let i = 0; i < 26; i++) { const rx = x - W * 0.35 + (i * 37 % 100) / 100 * W * 0.7, ry = y - W * 0.2 + ((now / 4 + i * 53) % 200) / 200 * W * 0.35; rain += `<line x1="${rx}" y1="${ry}" x2="${rx - 2}" y2="${ry + 7}" class="cr-rain"/>`; }
        const cloud = [[-0.16, -0.12, 0.14], [0.02, -0.15, 0.17], [0.17, -0.11, 0.13], [-0.03, -0.08, 0.15]].map(([dx, dy, r]) => `<ellipse cx="${x + dx * W}" cy="${y + dy * W}" rx="${r * W}" ry="${r * W * 0.42}" fill="#4f5566" opacity="0.62" filter="url(#cr-softer)"/>`).join("");
        const fallY = (ground - y - R) * brk * brk, apart = L * 0.12 * brk;
        const half = (side) => `<g transform="translate(${x + side * apart} ${y + fallY}) rotate(${pitch + side * 28 * brk})"><clipPath id="cr-half${side}"><rect x="${side < 0 ? -L : 0}" y="${-R * 2}" width="${L}" height="${R * 4}"/></clipPath><g clip-path="url(#cr-half${side})">${hull("cr-hull", 'fill="url(#cr-shade)"')}${side * flip < 0 ? fins : ""}</g></g>`;
        g += cloud + half(-1) + half(1) + rain;
        if (Math.sin(now / 130) > 0.97) g += `<path d="M${x + W * 0.1},${y - W * 0.22} l-6,14 l5,0 l-7,15" class="cr-bolt"/>`;
      }
      layer.innerHTML = g;
      if (k < 1) raf = requestAnimationFrame(frame); else { raf = null; then(); }
    }
    raf = requestAnimationFrame(frame);
  }
  function clear() { if (raf) cancelAnimationFrame(raf); raf = null; if (layer) layer.remove(); layer = null; }
  U.crash = { play, clear };
})(window.UpShip);
