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

  const MEDIUM = `<g id="art-medium">
    <path class="a-fin" d="M-35,-8.5 L-54,-19 L-63.5,-19 L-63.5,-0.8 Z"/><path class="a-fin" d="M-35,8.5 L-54,19 L-63.5,19 L-63.5,0.8 Z"/>
    <path class="a-rudder" d="M-58,-19 L-63.5,-19 L-63.5,-2 L-59,-3.4 Z"/><path class="a-rudder" d="M-58,19 L-63.5,19 L-63.5,2 L-59,3.4 Z"/>
    <path class="a-hull" d="M65,0 C65,-6.6 45.5,-11 32.5,-11 L-13,-11 C-39,-11 -57.2,-3.85 -65,-0.44 L-65,0.44 C-57.2,3.85 -39,11 -13,11 L32.5,11 C45.5,11 65,6.6 65,0 Z"/>
    <path class="a-hi" d="M64,-3 C62,-8 48,-10.4 32.5,-10.4 L-13,-10.4 C-36,-10.4 -52,-5 -60,-2 C-50,-4.6 -36,-6.6 -13,-7 L32.5,-7 C46,-7 58,-5.6 64,-3 Z"/>
    <path class="a-lo" d="M64,3 C62,8 48,10.4 32.5,10.4 L-13,10.4 C-36,10.4 -52,5 -60,2 C-50,5 -36,7.6 -13,8 L32.5,8 C46,8 58,6 64,3 Z"/>
    ${RINGS([52, 40, 28, 16, 4, -8, -20, -32, -44], x => ({ 52: 8.6, 40: 10.6, "-20": 10.5, "-32": 9, "-44": 6.8 }[x] || 11))}
    <path class="a-long" d="M58,-6 C40,-7.4 0,-7.4 -40,-6 M58,6 C40,7.4 0,7.4 -40,6"/>
    <path class="a-tail" d="M-32,-1 L-60,-1.7 L-65,-1.7 L-65,1.7 L-60,1.7 L-32,1 Z"/><line class="a-hinge" x1="-59.5" y1="-1.7" x2="-59.5" y2="1.7"/>
    <path class="a-dark" d="M65,0 C65,-2 64.2,-3 63,-3.2 L63,3.2 C64.2,3 65,2 65,0 Z"/>
    <path class="a-dark" d="M14,10.6 L42,10.6 C46,10.8 47.6,12.4 47.2,13.6 C46.6,15.6 43.8,16.2 40.6,16.2 L16,16.2 C14.4,16.2 13.6,14.8 14,13.4 Z"/>
    <g class="a-window"><rect x="17" y="12.2" width="2.4" height="1.9" rx="0.4"/><rect x="21" y="12.2" width="2.4" height="1.9" rx="0.4"/><rect x="25" y="12.2" width="2.4" height="1.9" rx="0.4"/><rect x="29" y="12.2" width="2.4" height="1.9" rx="0.4"/><rect x="33" y="12.2" width="2.4" height="1.9" rx="0.4"/><rect x="37" y="12.2" width="2.4" height="1.9" rx="0.4"/><path d="M41,12.2 L45,12.2 C46.2,12.4 46.6,13.2 46.4,14.1 L41,14.1 Z"/></g>
    <use href="#art-engine" transform="translate(-6 9)"/><use href="#art-engine" transform="translate(-28 8.2)"/><use href="#art-engine" transform="translate(-47 5.6) scale(0.85)"/>
  </g>`;

  const FREIGHTER = `<g id="art-freighter">
    <path class="a-fin" d="M-30,-11.5 L-50,-23 L-63.5,-23 L-63.5,-1 Z"/><path class="a-fin" d="M-30,11.5 L-50,23 L-63.5,23 L-63.5,1 Z"/>
    <path class="a-rudder" d="M-57,-23 L-63.5,-23 L-63.5,-2.5 L-58,-4.4 Z"/><path class="a-rudder" d="M-57,23 L-63.5,23 L-63.5,2.5 L-58,4.4 Z"/>
    <path class="a-hull" d="M65,0 C65,-9 48,-15 32,-15 L-10,-15 C-38,-15 -56,-5.2 -65,-0.6 L-65,0.6 C-56,5.2 -38,15 -10,15 L32,15 C48,15 65,9 65,0 Z"/>
    <path class="a-hi" d="M64,-4 C61,-11 48,-14.3 32,-14.3 L-10,-14.3 C-34,-14.3 -50,-7.6 -59,-3 C-48,-6.6 -32,-9.6 -10,-10 L32,-10 C46,-10 58,-7.6 64,-4 Z"/>
    <path class="a-lo" d="M64,4 C61,11 48,14.3 32,14.3 L-10,14.3 C-34,14.3 -50,7.6 -59,3 C-48,7 -32,10.6 -10,11 L32,11 C46,11 58,8.4 64,4 Z"/>
    ${RINGS([54, 42, 30, 18, 6, -6, -18, -30, -42, -52], x => ({ 54: 10.8, 42: 14, "-18": 13.8, "-30": 11.4, "-42": 8.4, "-52": 5.4 }[x] || 15))}
    <path class="a-long" d="M58,-7.6 C40,-10 0,-10 -40,-7.6 M58,7.6 C40,10 0,10 -40,7.6"/>
    <path class="a-tail" d="M-28,-1.2 L-59,-2 L-65,-2 L-65,2 L-59,2 L-28,1.2 Z"/><line class="a-hinge" x1="-58.5" y1="-2" x2="-58.5" y2="2"/>
    <path class="a-dark" d="M65,0 C65,-2.4 64.2,-3.6 63,-3.8 L63,3.8 C64.2,3.6 65,2.4 65,0 Z"/>
    <path class="a-dark" d="M-26,14 L24,14 L27,15.8 L27,21 C27,22 26,22.6 25,22.6 L-24,22.6 C-25,22.6 -26,22 -26,21 Z"/>
    <g class="a-rib"><line x1="-16" y1="15" x2="-16" y2="21.8"/><line x1="-6" y1="15" x2="-6" y2="21.8"/><line x1="4" y1="15" x2="4" y2="21.8"/><line x1="14" y1="15" x2="14" y2="21.8"/></g>
    <g class="a-hatch"><rect x="-13.4" y="16.4" width="5" height="4" rx="0.4"/><rect x="6.6" y="16.4" width="5" height="4" rx="0.4"/></g>
    <path class="a-dark" d="M36,14.2 L46,13.2 C48.6,13.4 49.2,15 48.6,16.2 C47.8,17.4 45.6,17.8 43,17.8 L38,17.8 C36.8,17.6 36.2,15.6 36.6,14.2 Z"/>
    <rect class="a-window" x="41" y="14.8" width="4.8" height="1.6" rx="0.4"/>
    <use href="#art-engine" transform="translate(-40 10)"/><use href="#art-engine" transform="translate(-4 11.4) scale(0.95)"/><use href="#art-engine" transform="translate(30 11.2) scale(0.95)"/>
  </g>`;

  const LINER = `<g id="art-liner">
    <path class="a-fin" d="M-46,-11 L-68,-24 L-83.5,-24 L-83.5,-0.8 Z"/><path class="a-fin" d="M-46,11 L-68,24 L-83.5,24 L-83.5,0.8 Z"/>
    <path class="a-rudder" d="M-76,-24 L-83.5,-24 L-83.5,-2 L-77,-3.8 Z"/><path class="a-rudder" d="M-76,24 L-83.5,24 L-83.5,2 L-77,3.8 Z"/>
    <path class="a-hull" d="M85,0 C85,-8.4 64,-14 44,-14 L-20,-14 C-52,-14 -74,-4.9 -85,-0.5 L-85,0.5 C-74,4.9 -52,14 -20,14 L44,14 C64,14 85,8.4 85,0 Z"/>
    <path class="a-hi" d="M84,-3.6 C81,-10.4 62,-13.3 44,-13.3 L-20,-13.3 C-48,-13.3 -66,-7 -78,-2.6 C-64,-6 -46,-8.8 -20,-9.2 L44,-9.2 C60,-9.2 76,-7.2 84,-3.6 Z"/>
    <path class="a-lo" d="M84,3.6 C81,10.4 62,13.3 44,13.3 L-20,13.3 C-48,13.3 -66,7 -78,2.6 C-64,6.4 -46,9.8 -20,10.2 L44,10.2 C60,10.2 76,7.8 84,3.6 Z"/>
    ${RINGS([72, 60, 48, 36, 24, 12, 0, -12, -24, -36, -48, -60, -70], x => ({ 72: 10.4, 60: 12.8, 48: 13.8, "-24": 13.8, "-36": 13, "-48": 11.6, "-60": 9.4, "-70": 6.8 }[x] || 14))}
    <path class="a-tail" d="M-44,-1.2 L-77,-2 L-85,-2 L-85,2 L-77,2 L-44,1.2 Z"/><line class="a-hinge" x1="-76.5" y1="-2" x2="-76.5" y2="2"/>
    <path class="a-dark" d="M85,0 C85,-2.4 84.2,-3.6 83,-3.8 L83,3.8 C84.2,3.6 85,2.4 85,0 Z"/>
    <g class="a-window">${[8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38].map(x => `<rect x="${x}" y="7.4" width="1.8" height="1.5" rx="0.3"/>`).join("")}</g>
    <path class="a-dark" d="M50,13.6 L62,12.8 C64.8,13 65.4,14.8 64.8,16 C64,17.2 61.8,17.6 59,17.6 L52,17.6 C50.6,17.4 50,15.4 50.4,13.6 Z"/>
    <g class="a-window"><rect x="54" y="14.2" width="2" height="1.6" rx="0.3"/><rect x="57" y="14.2" width="2" height="1.6" rx="0.3"/><path d="M60,14.2 L63,14.2 C63.8,14.4 64,15 63.9,15.8 L60,15.8 Z"/></g>
    <use href="#art-engine" transform="translate(30 11.2) scale(1.1)"/><use href="#art-engine" transform="translate(4 11.8) scale(1.1)"/>
    <use href="#art-engine" transform="translate(-24 11.4) scale(1.1)"/><use href="#art-engine" transform="translate(-50 9.4)"/>
  </g>`;


  // Top views, for ships in flight. Nose points right; the map rotates them to their heading.
  const POD = `<g id="art-pod"><path class="a-dark" d="M5,0 C5,-1.7 3,-2.3 0,-2.3 L-4.4,-2 C-5.6,-1.5 -5.6,1.5 -4.4,2 L0,2.3 C3,2.3 5,1.7 5,0 Z"/><line class="a-proptop" x1="-6.2" y1="-3.4" x2="-6.2" y2="3.4"/></g>`;
  const HATCH = `<g id="art-hatch"><rect class="a-lo" x="-4.5" y="-3.6" width="9" height="7.2" rx="0.6"/><path class="a-seamtop" d="M-4.5,0 L4.5,0"/><rect class="a-hatchline" x="-4.5" y="-3.6" width="9" height="7.2" rx="0.6"/></g>`;
  const pods = list => list.map(([x, y, sc]) => `<use href="#art-pod" transform="translate(${x} ${-y})${sc ? ` scale(${sc})` : ""}"/><use href="#art-pod" transform="translate(${x} ${y})${sc ? ` scale(${sc})` : ""}"/>`).join("");
  const mirror = d => d.replace(/(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/g, (m, x, _a, y) => `${x},${(-parseFloat(y)).toString()}`);
  // A top view shares the side view's hull outline, with the upper-side shading mirrored below.
  function topView(id, o) {
    return `<g id="art-top-${id}">
      <path class="a-fin" d="${o.fin}"/><path class="a-fin" d="${mirror(o.fin)}"/>
      <path class="a-rudder" d="${o.rud}"/><path class="a-rudder" d="${mirror(o.rud)}"/>
      ${pods(o.pods)}
      <path class="a-hull" d="${o.hull}"/><path class="a-hi" d="${o.hi}"/><path class="a-lo" d="${mirror(o.hi)}"/>
      ${RINGS(o.rings, o.ringH)}
      <path class="a-spine" d="M${o.len - 2},0 L${-o.len + 2},0"/>
      <path class="a-dark" d="${o.tail}"/>
      ${o.extra || ""}
    </g>`;
  }
  const TOPS = topView("passenger", {
      len: 50, fin: "M-24,-6.6 L-41,-15 L-49.5,-15 L-49.5,-0.6 Z", rud: "M-44,-15 L-49.5,-15 L-49.5,-2 L-45,-3 Z",
      pods: [[-12, 10.4]], hull: "M50,0 C50,-5.5 43,-8.8 30,-9 C10,-9.3 -10,-8.7 -26,-6.6 C-38,-5 -46,-2.4 -50,-0.4 L-50,0.4 C-46,2.4 -38,5 -26,6.6 C-10,8.7 10,9.3 30,9 C43,8.8 50,5.5 50,0 Z",
      hi: "M49,-2.6 C47,-6.4 41,-8.4 30,-8.6 C10,-8.9 -10,-8.3 -26,-6.3 C-36,-5 -43,-3.2 -47,-1.6 C-40,-3.4 -30,-4.6 -20,-5.2 C0,-6.2 20,-6.4 34,-6 C42,-5.6 47,-4.4 49,-2.6 Z",
      rings: [38, 26, 14, 2, -10, -22, -34], ringH: x => x > 30 ? 8.4 : x > -15 ? 9 : x > -30 ? 7.2 : 5.2, tail: "M-24,-0.7 L-50,-0.9 L-50,0.9 L-24,0.7 Z",
      extra: `<rect class="a-band" x="29" y="-8.9" width="1.4" height="17.8"/><rect class="a-band" x="32.4" y="-8.8" width="1.4" height="17.6"/>` })
    + topView("cargo", {
      len: 45, fin: "M-18,-9 L-35,-17 L-44.5,-17 L-44.5,-0.8 Z", rud: "M-39,-17 L-44.5,-17 L-44.5,-2 L-40,-3.4 Z",
      pods: [[-22, 12.4], [30, 12.6]], hull: "M45,0 C45,-7.5 39,-11.6 26,-11.8 C6,-12 -8,-11.6 -20,-9.4 C-33,-7 -41,-3.4 -45,-0.5 L-45,0.5 C-41,3.4 -33,7 -20,9.4 C-8,11.6 6,12 26,11.8 C39,11.6 45,7.5 45,0 Z",
      hi: "M44,-3.4 C42,-8.6 36,-11.2 26,-11.4 C6,-11.6 -8,-11.2 -20,-9 C-30,-7.2 -37,-4.6 -42,-2 C-34,-5 -24,-7 -12,-7.8 C6,-8.8 22,-8.8 32,-8.2 C39,-7.6 42.5,-6 44,-3.4 Z",
      rings: [34, 22, 10, -2, -14, -26], ringH: x => x > 30 ? 11 : x > -5 ? 11.8 : x > -20 ? 10.4 : 8, tail: "M-18,-0.8 L-45,-1 L-45,1 L-18,0.8 Z",
      extra: `<use href="#art-hatch" transform="translate(-6 0) scale(0.85)"/><use href="#art-hatch" transform="translate(4.5 0) scale(0.85)"/><use href="#art-hatch" transform="translate(15 0) scale(0.85)"/>` })
    + topView("surplus", {
      len: 57, fin: "M-34,-5 L-47,-12.5 L-56.5,-12.5 L-56.5,-0.5 Z", rud: "M-51,-12.5 L-56.5,-12.5 L-56.5,-1.6 L-52,-2.4 Z",
      pods: [[20, 8.6, 0.9], [0, 8.6, 0.9], [-20, 8.6, 0.9], [-40, 7.4, 0.8]], hull: "M57,0 C57,-4.4 52,-7 42,-7.1 L-30,-7.1 C-44,-6.4 -52,-3 -57,-0.3 L-57,0.3 C-52,3 -44,6.4 -30,7.1 L42,7.1 C52,7 57,4.4 57,0 Z",
      hi: "M56,-2 C54.6,-5.2 50,-6.8 42,-6.8 L-30,-6.8 C-42,-6.2 -49,-3.8 -53,-1.8 C-46,-3.6 -38,-4.4 -28,-4.6 L42,-4.6 C49,-4.5 53.8,-3.6 56,-2 Z",
      rings: [46, 36, 26, 16, 6, -4, -14, -24, -36], ringH: x => x > -30 ? 7 : 5.8, tail: "M-32,-0.6 L-57,-0.8 L-57,0.8 L-32,0.6 Z",
      extra: `<circle class="a-dark" cx="44" cy="0" r="2.6"/><circle class="a-hiline" cx="44" cy="0" r="1.6"/>` })
    + topView("medium", {
      len: 65, fin: "M-35,-8.5 L-54,-19 L-63.5,-19 L-63.5,-0.8 Z", rud: "M-58,-19 L-63.5,-19 L-63.5,-2 L-59,-3.4 Z",
      pods: [[-6, 12.8], [-28, 12.2]], hull: "M65,0 C65,-6.6 45.5,-11 32.5,-11 L-13,-11 C-39,-11 -57.2,-3.85 -65,-0.44 L-65,0.44 C-57.2,3.85 -39,11 -13,11 L32.5,11 C45.5,11 65,6.6 65,0 Z",
      hi: "M64,-3 C62,-8 48,-10.4 32.5,-10.4 L-13,-10.4 C-36,-10.4 -52,-5 -60,-2 C-50,-4.6 -36,-6.6 -13,-7 L32.5,-7 C46,-7 58,-5.6 64,-3 Z",
      rings: [52, 40, 28, 16, 4, -8, -20, -32, -44], ringH: x => ({ 52: 8.6, 40: 10.6, "-20": 10.5, "-32": 9, "-44": 6.8 }[x] || 11), tail: "M-32,-0.8 L-65,-1 L-65,1 L-32,0.8 Z",
      extra: `<rect class="a-band" x="44" y="-10" width="1.6" height="20"/><rect class="a-band" x="47.6" y="-9.6" width="1.6" height="19.2"/>` })
    + topView("freighter", {
      len: 65, fin: "M-30,-11.5 L-50,-23 L-63.5,-23 L-63.5,-1 Z", rud: "M-57,-23 L-63.5,-23 L-63.5,-2.5 L-58,-4.4 Z",
      pods: [[-40, 14.6], [-4, 16.4], [30, 16.2]], hull: "M65,0 C65,-9 48,-15 32,-15 L-10,-15 C-38,-15 -56,-5.2 -65,-0.6 L-65,0.6 C-56,5.2 -38,15 -10,15 L32,15 C48,15 65,9 65,0 Z",
      hi: "M64,-4 C61,-11 48,-14.3 32,-14.3 L-10,-14.3 C-34,-14.3 -50,-7.6 -59,-3 C-48,-6.6 -32,-9.6 -10,-10 L32,-10 C46,-10 58,-7.6 64,-4 Z",
      rings: [54, 42, 30, 18, 6, -6, -18, -30, -42], ringH: x => ({ 54: 10.8, 42: 14, "-18": 13.8, "-30": 11.4, "-42": 8.4 }[x] || 15), tail: "M-28,-1 L-65,-1.2 L-65,1.2 L-28,1 Z",
      extra: [-19, -8, 3, 14, 25].map(x => `<use href="#art-hatch" transform="translate(${x} 0)"/>`).join("") })
    + topView("liner", {
      len: 85, fin: "M-46,-11 L-68,-24 L-83.5,-24 L-83.5,-0.8 Z", rud: "M-76,-24 L-83.5,-24 L-83.5,-2 L-77,-3.8 Z",
      pods: [[30, 15.8, 1.1], [4, 15.8, 1.1], [-24, 15.6, 1.1], [-50, 13.4]], hull: "M85,0 C85,-8.4 64,-14 44,-14 L-20,-14 C-52,-14 -74,-4.9 -85,-0.5 L-85,0.5 C-74,4.9 -52,14 -20,14 L44,14 C64,14 85,8.4 85,0 Z",
      hi: "M84,-3.6 C81,-10.4 62,-13.3 44,-13.3 L-20,-13.3 C-48,-13.3 -66,-7 -78,-2.6 C-64,-6 -46,-8.8 -20,-9.2 L44,-9.2 C60,-9.2 76,-7.2 84,-3.6 Z",
      rings: [72, 60, 48, 36, 24, 12, 0, -12, -24, -36, -48, -60, -70], ringH: x => ({ 72: 10.4, 60: 12.8, 48: 13.8, "-24": 13.8, "-36": 13, "-48": 11.6, "-60": 9.4, "-70": 6.8 }[x] || 14), tail: "M-44,-1 L-85,-1.2 L-85,1.2 L-44,1 Z",
      extra: `<circle class="a-band" cx="56" cy="0" r="6.4"/><circle class="a-hull" cx="56" cy="0" r="4.4"/><circle class="a-band" cx="56" cy="0" r="2"/>` });
  // Shadow sizes cast on the map by each top view.
  const SHADOW = { passenger: [46, 11], cargo: [42, 14], surplus: [54, 9], medium: [60, 12], freighter: [60, 16], liner: [80, 14] };

  const DEFS = ENGINE + PASSENGER + CARGO + SURPLUS + MEDIUM + FREIGHTER + LINER + POD + HATCH + TOPS;

  // Each drawing's extent, for panel illustrations.
  const VIEW = { passenger: "-60 -20 120 42", cargo: "-60 -20 120 42", surplus: "-60 -20 120 42",
    medium: "-70 -22 140 44", freighter: "-70 -26 140 52", liner: "-90 -27 180 54" };

  // Standalone illustration for panels. Needs the map's defs on the page.
  function illustration(art, width) {
    const [, , w, h] = VIEW[art].split(" ").map(Number);
    return `<svg class="ship-art" viewBox="${VIEW[art]}" width="${width}" height="${Math.round(width * h / w)}" aria-hidden="true"><use href="#art-${art}"/></svg>`;
  }

  U.shipArt = { DEFS, illustration, SHADOW };
})(window.UpShip);
