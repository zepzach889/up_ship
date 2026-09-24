// Side-profile drawings of the three kinds of ship, in the company's colors.
// Nose points right. Used for map icons and Shipyard illustrations.
window.UpShip = window.UpShip || {};
(function (U) {
  const ENGINE = `<g id="art-engine"><path class="a-dark" d="M5,0 C5,-1.7 3,-2.3 0,-2.3 L-4.4,-2 C-5.6,-1.5 -5.6,1.5 -4.4,2 L0,2.3 C3,2.3 5,1.7 5,0 Z"/><ellipse class="a-prop" cx="-6.2" cy="0" rx="0.7" ry="3.4"/><rect class="a-window" x="1.4" y="-1.1" width="1.6" height="0.9" rx="0.2"/></g>`;
  const RINGS = (xs, h) => `<g class="a-ring">${xs.map(x => `<line x1="${x}" y1="${-h(x)}" x2="${x}" y2="${h(x)}"/>`).join("")}</g>`;

  const PASSENGER = `<g id="art-passenger">
    <path class="a-fin" d="M-24,-6.6 L-41,-15 L-49.5,-15 L-49.5,-0.6 Z"/><path class="a-fin" d="M-24,6.6 L-41,15 L-49.5,15 L-49.5,0.6 Z"/>
    <path class="a-rudder" d="M-44,-15 L-49.5,-15 L-49.5,-2 L-45,-3 Z"/><path class="a-rudder" d="M-44,15 L-49.5,15 L-49.5,2 L-45,3 Z"/>
    <path class="a-hull" d="M50,0 C50,-5.5 43,-8.8 30,-9 C10,-9.3 -10,-8.7 -26,-6.6 C-38,-5 -46,-2.4 -50,-0.4 L-50,0.4 C-46,2.4 -38,5 -26,6.6 C-10,8.7 10,9.3 30,9 C43,8.8 50,5.5 50,0 Z"/>
    <path class="a-hi" d="M49,-2.6 C47,-6.4 41,-8.4 30,-8.6 C10,-8.9 -10,-8.3 -26,-6.3 C-36,-5 -43,-3.2 -47,-1.6 C-40,-3.4 -30,-4.6 -20,-5.2 C0,-6.2 20,-6.4 34,-6 C42,-5.6 47,-4.4 49,-2.6 Z"/>
    <path class="a-lo" d="M49,2.8 C47,6.4 41,8.4 30,8.6 C10,8.9 -10,8.3 -26,6.3 C-36,5 -43,3.2 -47,1.6 C-40,3.8 -30,5.4 -20,6.2 C0,7.4 20,7.4 34,7 C42,6.6 47,5 49,2.8 Z"/>
    ${RINGS([38, 26, 14, 2, -10, -22, -34], x => x > 30 ? 8.4 : x > -15 ? 9 : x > -30 ? 7.2 : 5.2)}
    <path class="a-long" d="M44,-4.6 C30,-5.6 0,-5.9 -30,-4.6 M44,4.6 C30,5.6 0,5.9 -30,4.6"/>
    <path class="a-tail" d="M-22,-0.9 L-46,-1.5 L-50,-1.5 L-50,1.5 L-46,1.5 L-22,0.9 Z"/><line class="a-hinge" x1="-45.5" y1="-1.5" x2="-45.5" y2="1.5"/>
    <path class="a-dark" d="M50,0 C50,-1.8 49.2,-2.6 48,-2.8 L48,2.8 C49.2,2.6 50,1.8 50,0 Z"/>
    <path class="a-dark" d="M6,8.6 L33,8.6 C37,8.8 38.5,10.2 38.2,11.2 C37.6,13 35,13.6 32,13.6 L8,13.6 C6.5,13.6 5.6,12.4 6,11 Z"/>
    <g class="a-window"><rect x="10" y="10" width="2.4" height="1.9" rx="0.4"/><rect x="14" y="10" width="2.4" height="1.9" rx="0.4"/><rect x="18" y="10" width="2.4" height="1.9" rx="0.4"/><rect x="22" y="10" width="2.4" height="1.9" rx="0.4"/><rect x="26" y="10" width="2.4" height="1.9" rx="0.4"/><path d="M31,10 L35,10 C36.2,10.2 36.6,11 36.4,11.9 L31,11.9 Z"/></g>
    <line class="a-strut" x1="-12" y1="4.4" x2="-14" y2="6.6"/>
    <use href="#art-engine" transform="translate(-12 6.8)"/><use href="#art-engine" transform="translate(-36 4.6) scale(0.85)"/>
  </g>`;

  const CARGO = `<g id="art-cargo">
    <path class="a-fin" d="M-18,-9 L-35,-17 L-44.5,-17 L-44.5,-0.8 Z"/><path class="a-fin" d="M-18,9 L-35,17 L-44.5,17 L-44.5,0.8 Z"/>
    <path class="a-rudder" d="M-39,-17 L-44.5,-17 L-44.5,-2 L-40,-3.4 Z"/><path class="a-rudder" d="M-39,17 L-44.5,17 L-44.5,2 L-40,3.4 Z"/>
    <path class="a-hull" d="M45,0 C45,-7.5 39,-11.6 26,-11.8 C6,-12 -8,-11.6 -20,-9.4 C-33,-7 -41,-3.4 -45,-0.5 L-45,0.5 C-41,3.4 -33,7 -20,9.4 C-8,11.6 6,12 26,11.8 C39,11.6 45,7.5 45,0 Z"/>
    <path class="a-hi" d="M44,-3.4 C42,-8.6 36,-11.2 26,-11.4 C6,-11.6 -8,-11.2 -20,-9 C-30,-7.2 -37,-4.6 -42,-2 C-34,-5 -24,-7 -12,-7.8 C6,-8.8 22,-8.8 32,-8.2 C39,-7.6 42.5,-6 44,-3.4 Z"/>
    <path class="a-lo" d="M44,3.4 C42,8.6 36,11.2 26,11.4 C6,11.6 -8,11.2 -20,9 C-30,7.2 -37,4.6 -42,2 C-34,5.6 -24,8.2 -12,9.4 C6,10.6 22,10.6 32,10 C39,9.2 42.5,7 44,3.4 Z"/>
    ${RINGS([34, 22, 10, -2, -14, -26], x => x > 30 ? 11 : x > -5 ? 11.8 : x > -20 ? 10.4 : 8)}
    <path class="a-long" d="M40,-6 C26,-7.6 0,-8 -28,-6 M40,6 C26,7.6 0,8 -28,6"/>
    <path class="a-tail" d="M-16,-1 L-40,-1.7 L-44.8,-1.7 L-44.8,1.7 L-40,1.7 L-16,1 Z"/><line class="a-hinge" x1="-40.5" y1="-1.7" x2="-40.5" y2="1.7"/>
    <path class="a-dark" d="M45,0 C45,-2.2 44.2,-3.2 43,-3.4 L43,3.4 C44.2,3.2 45,2.2 45,0 Z"/>
    <path class="a-dark" d="M-14,11 L18,11 L20,12.4 L20,17.2 C20,18 19.2,18.6 18.2,18.6 L-12.2,18.6 C-13.2,18.6 -14,18 -14,17.2 Z"/>
    <g class="a-rib"><line x1="-6" y1="12.2" x2="-6" y2="17.6"/><line x1="3" y1="12.2" x2="3" y2="17.6"/><line x1="12" y1="12.2" x2="12" y2="17.6"/></g>
    <path class="a-dark" d="M28,11.3 L36,10.4 C38.4,10.6 39,12 38.4,13 C37.6,14.2 35.4,14.6 33,14.6 L29,14.6 C28,14.4 27.6,12.6 28,11.3 Z"/>
    <rect class="a-window" x="31" y="11.8" width="4.6" height="1.6" rx="0.4"/>
    <use href="#art-engine" transform="translate(-22 7.4)"/><use href="#art-engine" transform="translate(30 6.6) scale(0.9)"/>
  </g>`;

  const SURPLUS = `<g id="art-surplus">
    <path class="a-fin" d="M-34,-5 L-47,-12.5 L-56.5,-12.5 L-56.5,-0.5 Z"/><path class="a-fin" d="M-34,5 L-47,12.5 L-56.5,12.5 L-56.5,0.5 Z"/>
    <path class="a-rudder" d="M-51,-12.5 L-56.5,-12.5 L-56.5,-1.6 L-52,-2.4 Z"/><path class="a-rudder" d="M-51,12.5 L-56.5,12.5 L-56.5,1.6 L-52,2.4 Z"/>
    <path class="a-hull" d="M57,0 C57,-4.4 52,-7 42,-7.1 L-30,-7.1 C-44,-6.4 -52,-3 -57,-0.3 L-57,0.3 C-52,3 -44,6.4 -30,7.1 L42,7.1 C52,7 57,4.4 57,0 Z"/>
    <path class="a-hi" d="M56,-2 C54.6,-5.2 50,-6.8 42,-6.8 L-30,-6.8 C-42,-6.2 -49,-3.8 -53,-1.8 C-46,-3.6 -38,-4.4 -28,-4.6 L42,-4.6 C49,-4.5 53.8,-3.6 56,-2 Z"/>
    <path class="a-navy" d="M56.6,1 C55,5 50,6.8 42,6.9 L-30,6.9 C-43,6.2 -50,3.8 -54.5,1.4 C-44,3 -34,3.4 -24,3.4 L42,3.4 C49,3.4 53,2.6 56.6,1 Z"/>
    ${RINGS([46, 36, 26, 16, 6, -4, -14, -24, -36], () => 7).replace(/y2="7"/g, 'y2="3.4"')}
    <path class="a-navy" d="M-32,-0.8 L-52,-1.3 L-57,-1.3 L-57,1.3 L-52,1.3 L-32,0.8 Z"/><line class="a-hinge" x1="-51.5" y1="-1.3" x2="-51.5" y2="1.3"/>
    <path class="a-navy" d="M57,0 C57,-1.6 56.3,-2.3 55,-2.5 L55,2.5 C56.3,2.3 57,1.6 57,0 Z"/>
    <path class="a-navy" d="M34,6.9 L44,6.9 C46.4,7.1 47,8.6 46.4,9.6 C45.8,10.6 44,11 42,11 L36,11 C34.6,11 33.8,9.6 34,6.9 Z"/>
    <rect class="a-window" x="40.6" y="8.2" width="3.8" height="1.4" rx="0.3"/>
    <use href="#art-engine" transform="translate(20 5.6) scale(0.9)"/><use href="#art-engine" transform="translate(0 5.6) scale(0.9)"/>
    <use href="#art-engine" transform="translate(-20 5.6) scale(0.9)"/><use href="#art-engine" transform="translate(-40 4.2) scale(0.8)"/>
  </g>`;

  const DEFS = ENGINE + PASSENGER + CARGO + SURPLUS;

  // Standalone illustration for panels. Needs the map's defs on the page.
  function illustration(kind, width) {
    const h = Math.round(width * 0.36);
    return `<svg class="ship-art" viewBox="-60 -20 120 42" width="${width}" height="${h}" aria-hidden="true"><use href="#art-${kind}"/></svg>`;
  }

  U.shipArt = { DEFS, illustration };
})(window.UpShip);
