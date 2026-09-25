// Drawings of masts, terminals, and sheds, in three sizes. Flat front views, lit from above left.
// Colors come from the wrapper: .fac-own uses the company color, .fac-pub uses slate.
window.UpShip = window.UpShip || {};
(function (U) {
  const MAST = {
    1: `<rect x="-5" y="10" width="10" height="1.4" class="fd"/>
      <path d="M-3.4,10 L-1.1,-5" class="legL"/><path d="M3.4,10 L1.1,-5" class="legR"/>
      <path d="M-3.4,10 L2.63,5 M3.4,10 L-2.63,5 M-2.63,5 L1.87,0 M2.63,5 L-1.87,0 M-1.87,0 L1.1,-5 M1.87,0 L-1.1,-5 M-2.63,5 L2.63,5 M-1.87,0 L1.87,0" class="br"/>
      <rect x="-2.2" y="-7" width="4.4" height="2" rx="0.3" class="fb"/><rect x="-2.2" y="-7" width="4.4" height="0.7" class="fh"/><path d="M-0.9,-7 L0,-9.4 L0.9,-7 Z" class="fd"/>`,
    2: `<rect x="-5.6" y="10" width="11.2" height="1.4" class="fd"/>
      <path d="M-3.9,10 L-1.1,-11" class="legL"/><path d="M3.9,10 L1.1,-11" class="legR"/>
      <path d="M-3.9,10 L3.2,4.75 M3.9,10 L-3.2,4.75 M-3.2,4.75 L2.5,-0.5 M3.2,4.75 L-2.5,-0.5 M-2.5,-0.5 L1.8,-5.75 M2.5,-0.5 L-1.8,-5.75 M-1.8,-5.75 L1.1,-11 M1.8,-5.75 L-1.1,-11 M-3.2,4.75 L3.2,4.75 M-1.8,-5.75 L1.8,-5.75" class="br"/>
      <rect x="-3.6" y="-1.1" width="7.2" height="1.2" class="fb"/><path d="M-3.6,-1.1 L-3.6,-2.6 M3.6,-1.1 L3.6,-2.6 M-3.6,-2.4 L3.6,-2.4" class="br"/>
      <rect x="-2.3" y="-13" width="4.6" height="2" rx="0.3" class="fb"/><rect x="-2.3" y="-13" width="4.6" height="0.7" class="fh"/><path d="M-0.9,-13 L0,-15.6 L0.9,-13 Z" class="fd"/>`,
    3: `<rect x="-6.2" y="10" width="12.4" height="1.6" class="fd"/>
      <path d="M-4.4,10 L-1.1,-17" class="legL"/><path d="M4.4,10 L1.1,-17" class="legR"/>
      <path d="M-4.4,10 L3.74,4.6 M4.4,10 L-3.74,4.6 M-3.74,4.6 L3.08,-0.8 M3.74,4.6 L-3.08,-0.8 M-3.08,-0.8 L2.42,-6.2 M3.08,-0.8 L-2.42,-6.2 M-2.42,-6.2 L1.76,-11.6 M2.42,-6.2 L-1.76,-11.6 M-1.76,-11.6 L1.1,-17 M1.76,-11.6 L-1.1,-17 M-3.74,4.6 L3.74,4.6 M-2.42,-6.2 L2.42,-6.2" class="br"/>
      <rect x="-4.2" y="-1.4" width="8.4" height="1.3" class="fb"/><path d="M-4.2,-1.4 L-4.2,-3 M4.2,-1.4 L4.2,-3 M-4.2,-2.8 L4.2,-2.8" class="br"/>
      <rect x="-2.8" y="-12.2" width="5.6" height="1.2" class="fb"/><path d="M-2.8,-12.2 L-2.8,-13.6 M2.8,-12.2 L2.8,-13.6 M-2.8,-13.4 L2.8,-13.4" class="br"/>
      <rect x="-2.6" y="-21" width="5.2" height="4" rx="0.4" class="fb"/><rect x="-2.6" y="-21" width="5.2" height="1" class="fh"/><rect x="-2.6" y="-17.8" width="5.2" height="0.8" class="fl"/>
      <rect x="-1.6" y="-19.6" width="1.3" height="1.2" class="fw"/><rect x="0.3" y="-19.6" width="1.3" height="1.2" class="fw"/><path d="M-0.9,-21 L0,-24 L0.9,-21 Z" class="fd"/>`
  };
  const TERMINAL = {
    1: `<rect x="-6" y="0" width="12" height="10" class="fb"/><rect x="-6" y="1" width="12" height="1" class="fh"/><rect x="-6" y="9" width="12" height="1" class="fl"/>
      <rect x="-2" y="-2.6" width="4" height="2.6" class="fb"/><rect x="-2" y="-2.6" width="4" height="0.8" class="fh"/><rect x="-6.4" y="0" width="12.8" height="1" class="fd"/>
      <rect x="-1.1" y="4.8" width="2.2" height="4.2" class="fw"/><rect x="-4.6" y="3" width="1.6" height="2.2" class="fw"/><rect x="3" y="3" width="1.6" height="2.2" class="fw"/>`,
    2: `<rect x="-8" y="0" width="16" height="10" class="fb"/><rect x="-8" y="1" width="16" height="1" class="fh"/><rect x="-8" y="9" width="16" height="1" class="fl"/>
      <rect x="-2.6" y="-7" width="5.2" height="7" class="fb"/><rect x="-2.6" y="-7" width="5.2" height="0.8" class="fh"/><rect x="-1.2" y="-9" width="2.4" height="2" class="fb"/><rect x="-1.2" y="-9" width="2.4" height="0.6" class="fh"/>
      <rect x="-8.4" y="0" width="16.8" height="1" class="fd"/><rect x="-1" y="-5.4" width="2" height="3.4" class="fw"/><rect x="-1.3" y="4.4" width="2.6" height="4.6" class="fw"/>
      <g class="fw"><rect x="-6.6" y="2.8" width="1.6" height="2"/><rect x="-4.2" y="2.8" width="1.6" height="2"/><rect x="2.6" y="2.8" width="1.6" height="2"/><rect x="5" y="2.8" width="1.6" height="2"/><rect x="-6.6" y="6" width="1.6" height="2"/><rect x="-4.2" y="6" width="1.6" height="2"/><rect x="2.6" y="6" width="1.6" height="2"/><rect x="5" y="6" width="1.6" height="2"/></g>`,
    3: `<rect x="-11" y="2" width="22" height="8" class="fb"/><rect x="-11" y="3" width="22" height="0.9" class="fh"/><rect x="-11" y="9.1" width="22" height="0.9" class="fl"/>
      <rect x="-5" y="-3" width="10" height="5" class="fb"/><rect x="-5" y="-3" width="10" height="0.8" class="fh"/>
      <rect x="-2.4" y="-12" width="4.8" height="9" class="fb"/><rect x="-2.4" y="-12" width="4.8" height="0.8" class="fh"/><rect x="-1" y="-14.4" width="2" height="2.4" class="fb"/><rect x="-1" y="-14.4" width="2" height="0.6" class="fh"/>
      <rect x="-11.4" y="2" width="22.8" height="0.9" class="fd"/><rect x="-5.4" y="-3" width="10.8" height="0.8" class="fd"/>
      <circle cx="0" cy="-8.6" r="1.6" class="fw"/><path d="M0,-8.6 L0,-9.8 M0,-8.6 L0.8,-8.6" class="hand"/><rect x="-1.5" y="4.6" width="3" height="5.4" class="fw"/>
      <g class="fw"><rect x="-9.6" y="4.2" width="1.4" height="2"/><rect x="-7.4" y="4.2" width="1.4" height="2"/><rect x="-5.2" y="4.2" width="1.4" height="2"/><rect x="3.8" y="4.2" width="1.4" height="2"/><rect x="6" y="4.2" width="1.4" height="2"/><rect x="8.2" y="4.2" width="1.4" height="2"/>
      <rect x="-9.6" y="7" width="1.4" height="1.8"/><rect x="-7.4" y="7" width="1.4" height="1.8"/><rect x="-5.2" y="7" width="1.4" height="1.8"/><rect x="3.8" y="7" width="1.4" height="1.8"/><rect x="6" y="7" width="1.4" height="1.8"/><rect x="8.2" y="7" width="1.4" height="1.8"/>
      <rect x="-3.8" y="-1.4" width="1.4" height="2.4"/><rect x="2.4" y="-1.4" width="1.4" height="2.4"/></g>`
  };
  // Hangar door ends. The doors use fixed dark and light tones so their detail shows in any company color.
  const shed = (w, top, dw, dtop, seams, base) => {
    const arch = (x, t, y0) => `M${-x},10 L${-x},${y0} C${-x},${t} ${x},${t} ${x},${y0} L${x},10`;
    return `<path d="${arch(w, top, base)} Z" class="fb"/>
      <path d="M${-w},${base} C${-w},${top} ${w},${top} ${w},${base} L${w - 1.3},${base} C${w - 1.3},${top + 1.6} ${-w + 1.3},${top + 1.6} ${-w + 1.3},${base} Z" class="fh"/>
      <path d="${arch(w, top, base)}" class="edge"/>
      <path d="${arch(dw, dtop, base + 1.1)} Z" class="door"/><path d="${arch(dw, dtop, base + 1.1)}" class="trim"/>
      <path d="${seams.map(x => `M${x},${dtop + 3.2 + Math.abs(x) * 0.25} L${x},10`).join(" ")}" class="seam"/>
      <rect x="${-w - 0.4}" y="9.2" width="${2 * w + 0.8}" height="1.2" class="fl"/>`;
  };
  const SHED = { 1: shed(5, -3.6, 3.4, -0.6, [0, -1.7, 1.7], 2.6), 2: shed(7, -6.6, 4.8, -3, [0, -2.4, 2.4], 1.6), 3: shed(9.5, -10, 6.6, -5.6, [0, -2.2, 2.2, -4.4, 4.4], 0.6) };

  // Gasholder in its guide frame, and a helium depot with a railway wagon. Cylinders stay steel grey.
  const GASPLANT = { 1: `<rect x="-10" y="10" width="20" height="1.4" class="fd"/>
      <rect x="-7.4" y="1.6" width="14.8" height="8.4" class="fb"/><rect x="-7.4" y="1.6" width="3" height="8.4" class="fh"/><rect x="4.6" y="1.6" width="2.8" height="8.4" class="fl"/>
      <rect x="-7.8" y="1.2" width="15.6" height="0.9" class="fd"/>
      <rect x="-6.6" y="-5.2" width="13.2" height="6.4" class="fb"/><rect x="-6.6" y="-5.2" width="2.7" height="6.4" class="fh"/><rect x="4.1" y="-5.2" width="2.5" height="6.4" class="fl"/>
      <rect x="-7" y="-5.6" width="14" height="0.9" class="fd"/><path d="M-6.6,-5.6 C-5,-7.6 5,-7.6 6.6,-5.6 Z" class="fh"/>
      <path d="M-8.6,10 L-8.6,-9.6 M8.6,10 L8.6,-9.6 M-8.9,-9.6 L8.9,-9.6 M-8.9,-2.2 L8.9,-2.2" class="col"/>
      <path d="M-3,10 L-3,-9.6 M3,10 L3,-9.6" class="br"/>
      <path d="M-8.6,-9.6 L-3,-2.2 M-3,-9.6 L-8.6,-2.2 M-3,-9.6 L3,-2.2 M3,-9.6 L-3,-2.2 M3,-9.6 L8.6,-2.2 M8.6,-9.6 L3,-2.2 M-8.6,-2.2 L-3,5 M-3,-2.2 L-8.6,5 M3,-2.2 L8.6,5 M8.6,-2.2 L3,5" class="br"/>
      <circle cx="-8.6" cy="-9.9" r="0.6" class="fd"/><circle cx="8.6" cy="-9.9" r="0.6" class="fd"/>` };
  const cyl = x => `<rect x="${x}" y="2.6" width="1.3" height="5.9" rx="0.6" class="cyl"/><rect x="${x}" y="2.6" width="0.45" height="5.9" class="cylhi"/><rect x="${x + 0.1}" y="2.3" width="1.1" height="0.7" rx="0.2" class="cap"/>`;
  const HESTORE = { 1: `<rect x="-11" y="10" width="22.5" height="1.4" class="fd"/>
      <path d="M-10.2,-0.5 L-4,-6.4 L2.2,-0.5 Z" class="fb"/><path d="M-10.2,-0.5 L-4,-6.4 L-4,-5 L-8.6,-0.5 Z" class="fh"/>
      <rect x="-10.6" y="-0.9" width="13.2" height="0.9" class="fd"/>
      <rect x="-9.8" y="0" width="11.6" height="10" class="fb"/><rect x="-9.8" y="0" width="11.6" height="0.9" class="fh"/><rect x="-9.8" y="9.1" width="11.6" height="0.9" class="fl"/>
      <rect x="-8.2" y="1.9" width="8.4" height="7.2" class="door"/>${[-7.6, -6, -4.4, -2.8, -1.2].map(cyl).join("")}
      <path d="M-8.2,9.1 L-8.2,1.9 L0.2,1.9 L0.2,9.1" class="trim"/>
      <rect x="3.2" y="6.8" width="8" height="1.3" class="fl"/>
      <rect x="3.6" y="4.9" width="7.2" height="1.25" rx="0.6" class="cyl"/><rect x="3.6" y="3.5" width="7.2" height="1.25" rx="0.6" class="cyl"/>
      <rect x="3.6" y="4.9" width="7.2" height="0.4" class="cylhi"/><rect x="3.6" y="3.5" width="7.2" height="0.4" class="cylhi"/>
      <rect x="3.3" y="3.3" width="0.8" height="3" rx="0.2" class="cap"/><rect x="10.3" y="3.3" width="0.8" height="3" rx="0.2" class="cap"/>
      <circle cx="5" cy="9.1" r="1.25" class="fd"/><circle cx="9.4" cy="9.1" r="1.25" class="fd"/><circle cx="5" cy="9.1" r="0.45" fill="#8a8f93"/><circle cx="9.4" cy="9.1" r="0.45" fill="#8a8f93"/>` };

  // Half-widths, for spacing symbols side by side.
  const WIDTH = { mast: { 1: 5, 2: 5.6, 3: 6.2 }, terminal: { 1: 6.4, 2: 8.4, 3: 11.4 }, shed: { 1: 5.4, 2: 7.4, 3: 9.9 }, gasplant: { 1: 9.4 }, hestore: { 1: 11 } };
  const DRAW = { mast: MAST, terminal: TERMINAL, shed: SHED, gasplant: GASPLANT, hestore: HESTORE };
  let DEFS = "";
  for (const t in DRAW) for (const l in DRAW[t]) DEFS += `<g id="fac-${t}-${l}">${DRAW[t][l]}</g>`;
  DEFS += `<g id="fac-warn"><path d="M0,-7.5 L7.5,6.5 L-7.5,6.5 Z" fill="#b0342a" stroke="#f0e7d1" stroke-width="1" stroke-linejoin="round"/>
    <rect x="-0.8" y="-2.8" width="1.6" height="5" fill="#f0e7d1"/><circle cx="0" cy="4.3" r="0.9" fill="#f0e7d1"/></g>`;

  // A small standalone drawing for panels and the key. Needs the map's defs on the page.
  function icon(type, level, own, size = 44) {
    return `<svg class="fac-art ${own ? "fac-own" : "fac-pub"}" viewBox="-13 -25 26 37" width="${Math.round(size * 26 / 37)}" height="${size}" aria-hidden="true"><use href="#fac-${type}-${level}"/></svg>`;
  }

  U.facArt = { DEFS, WIDTH, icon };
})(window.UpShip);
