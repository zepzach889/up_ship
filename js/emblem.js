// Company emblems: a symbol inside a frame, in the company's two colors.
window.UpShip = window.UpShip || {};
(function (U) {
  function starPoints(cx, cy, r1, r2, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / n;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }

  // Each symbol is drawn in a 100 x 100 box. "t" is the trim color.
  const SYMBOLS = {
    star: t => `<polygon points="${starPoints(50, 53, 40, 16, 5)}" fill="${t}"/>`,
    sunburst: t => {
      let rays = "";
      for (let i = 0; i < 12; i++) rays += `<polygon points="47,20 53,20 50,4" fill="${t}" transform="rotate(${i * 30} 50 50)"/>`;
      return rays + `<circle cx="50" cy="50" r="17" fill="${t}"/>`;
    },
    compass: t => `<polygon points="${starPoints(50, 50, 30, 7, 4)}" fill="${t}" opacity="0.55" transform="rotate(45 50 50)"/>
      <polygon points="50,6 57,43 94,50 57,57 50,94 43,57 6,50 43,43" fill="${t}"/>`,
    globe: t => `<g fill="none" stroke="${t}" stroke-width="5"><circle cx="50" cy="50" r="36"/><ellipse cx="50" cy="50" rx="15" ry="36"/>
      <line x1="14" y1="50" x2="86" y2="50"/><path d="M20,32 H80 M20,68 H80"/></g>`,
    propeller: t => {
      let b = "";
      for (let i = 0; i < 3; i++) b += `<path d="M50,50 C60,38 61,14 50,6 C39,14 40,38 50,50 Z" fill="${t}" transform="rotate(${i * 120} 50 50)"/>`;
      return b + `<circle cx="50" cy="50" r="8" fill="${t}"/>`;
    },
    airship: t => `<ellipse cx="54" cy="44" rx="38" ry="14" fill="${t}"/>
      <polygon points="18,44 6,30 12,44 6,58" fill="${t}"/><rect x="44" y="60" width="18" height="7" rx="2" fill="${t}"/>
      <line x1="48" y1="56" x2="48" y2="61" stroke="${t}" stroke-width="3"/><line x1="58" y1="56" x2="58" y2="61" stroke="${t}" stroke-width="3"/>`,
    wheel: t => {
      let spokes = "";
      for (let i = 0; i < 6; i++) spokes += `<line x1="50" y1="36" x2="50" y2="64" stroke="${t}" stroke-width="3" transform="rotate(${i * 30} 50 50)"/>`;
      const wing = `<polygon points="34,40 4,34 8,42 34,46" fill="${t}"/><polygon points="34,49 8,47 13,55 34,55" fill="${t}"/><polygon points="34,58 14,60 20,66 34,63" fill="${t}"/>`;
      return `<circle cx="50" cy="50" r="15" fill="none" stroke="${t}" stroke-width="5"/>${spokes}${wing}<g transform="translate(100 0) scale(-1 1)">${wing}</g>`;
    },
    eagle: t => {
      const wing = `<polygon points="42,34 6,26 10,36 42,43" fill="${t}"/><polygon points="42,46 9,41 14,50 42,53" fill="${t}"/><polygon points="42,56 15,56 21,63 42,62" fill="${t}"/>`;
      return `<circle cx="50" cy="18" r="7" fill="${t}"/><polygon points="50,24 58,34 56,70 50,86 44,70 42,34" fill="${t}"/>
        <polygon points="57,16 64,19 57,21" fill="${t}"/>${wing}<g transform="translate(100 0) scale(-1 1)">${wing}</g>`;
    }
  };

  // Frame shape and where the symbol sits inside it.
  const FRAMES = {
    circle: { shape: '<circle cx="50" cy="50" r="46"/>', inner: '<circle cx="50" cy="50" r="40"/>', place: "translate(20 20) scale(0.6)" },
    shield: { shape: '<path d="M50,4 L92,14 L92,50 C92,76 72,90 50,97 C28,90 8,76 8,50 L8,14 Z"/>',
      inner: '<path d="M50,11 L85,19 L85,50 C85,72 68,84 50,90 C32,84 15,72 15,50 L15,19 Z"/>', place: "translate(21 17) scale(0.58)" },
    pennant: { shape: '<path d="M10,6 L90,6 L90,94 L50,76 L10,94 Z"/>', inner: '<path d="M16,12 L84,12 L84,85 L50,70 L16,85 Z"/>', place: "translate(21 12) scale(0.58)" },
    diamond: { shape: '<polygon points="50,2 98,50 50,98 2,50"/>', inner: '<polygon points="50,10 90,50 50,90 10,50"/>', place: "translate(27 27) scale(0.46)" }
  };

  function svg(e, size, extra = "") {
    const f = FRAMES[e.frame] || FRAMES.circle, sym = SYMBOLS[e.symbol] || SYMBOLS.star;
    return `<svg class="emblem" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" ${extra}>
      <g fill="${e.c1}" stroke="${e.c2}" stroke-width="3">${f.shape}</g>
      <g fill="none" stroke="${e.c2}" stroke-width="1.5" opacity="0.8">${f.inner}</g>
      <g transform="${f.place}">${sym(e.c2)}</g></svg>`;
  }

  // Symbol alone, for the picker buttons.
  function symbolIcon(name, color) { return `<svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true">${SYMBOLS[name](color)}</svg>`; }
  function frameIcon(name, color) { return `<svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="7">${FRAMES[name].shape}</g></svg>`; }

  U.emblem = { svg, symbolIcon, frameIcon };
})(window.UpShip);
