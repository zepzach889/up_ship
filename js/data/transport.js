// Railways and steamer lanes of the 1920s, with waypoints so they follow the geography.
// Each route joins two game cities; its segments are rail or sea, running through the points given (lat, lon).
window.UpShip = window.UpShip || {};
(function (U) {
  const P = {
    dover: [51.13, 1.31], calais: [50.95, 1.86], harwich: [51.94, 1.28], hook: [51.98, 4.13], ostend: [51.23, 2.92], holyhead: [53.31, -4.63],
    dunlaoghaire: [53.29, -6.13], chester: [53.19, -2.89], kiel: [54.32, 10.14], korsor: [55.33, 11.14], helsingor: [56.03, 12.61], helsingborg: [56.05, 12.69],
    nassjo: [57.65, 14.69], karlstad: [59.37, 13.5], dijon: [47.32, 5.04], modane: [45.2, 6.67], turin: [45.07, 7.69], belfort: [47.64, 6.86], basel: [47.56, 7.59],
    lyon: [45.76, 4.84], avignon: [43.95, 4.81], aubagne: [43.29, 5.57], perpignan: [42.7, 2.9], narbonne: [43.18, 3.0], montpellier: [43.61, 3.88], arles: [43.68, 4.63],
    laspezia: [44.1, 9.82], pisa: [43.72, 10.4], grosseto: [42.76, 11.1], bologna: [44.49, 11.34], florence: [43.77, 11.25], cassino: [41.49, 13.83],
    belgrade: [44.8, 20.46], sofia: [42.7, 23.32], plovdiv: [42.14, 24.75], edirne: [41.68, 26.56], constanta: [44.18, 28.63], thessaloniki: [40.64, 22.94],
    alexandroupoli: [40.85, 25.87], zaragoza: [41.65, -0.88], badajoz: [38.88, -6.97], irun: [43.34, -1.79], burgos: [42.34, -3.7], cordoba: [37.88, -4.78],
    bobadilla: [37.04, -4.72], algeciras: [36.13, -5.45], constantine: [36.36, 6.61], york: [53.96, -1.08], newcastle: [54.97, -1.61], birmingham: [52.48, -1.9],
    carlisle: [54.89, -2.93], hanover: [52.37, 9.73], leipzig: [51.34, 12.37], nuremberg: [49.45, 11.08], stuttgart: [48.78, 9.18], bremen: [53.08, 8.8],
    salzburg: [47.8, 13.04], linz: [48.31, 14.29], strasbourg: [48.58, 7.75], poznan: [52.41, 16.93], minsk: [53.9, 27.56], smolensk: [54.78, 32.04],
    dresden: [51.05, 13.74], brno: [49.2, 16.6], karlsruhe: [49.0, 8.4], gotthard: [46.56, 8.57], lugano: [46.0, 8.95], romanshorn: [47.57, 9.38],
    rotterdam: [51.92, 4.48], brest: [52.1, 23.7], orleans: [47.9, 1.9], poitiers: [46.58, 0.34], hendaye: [43.36, -1.77]
  };
  const r = (a, b, via, express) => ({ a, b, express: !!express, segs: [{ type: "rail", pts: [a, ...(via || []), b] }] });
  // Rail with a sea crossing in the middle: rail to a port, a steamer across, rail on.
  const boat = (a, b, railA, sea, railB) => ({ a, b, boat: true, segs: [
    { type: "rail", pts: [a, ...railA] }, { type: "sea", pts: sea }, { type: "rail", pts: [...railB, b] }].filter(s => s.pts.length > 1) });
  const s = (a, b, via) => ({ a, b, sea: true, segs: [{ type: "sea", pts: [a, ...(via || []), b] }] });
  const ROUTES = [
    r("london", "manchester", ["birmingham"], 1), r("manchester", "glasgow", ["carlisle"], 1), r("london", "edinburgh", ["york", "newcastle"], 1),
    r("edinburgh", "glasgow", [], 1), r("london", "cardington", []),
    r("paris", "brussels", [], 1), r("brussels", "amsterdam", ["rotterdam"], 1), r("brussels", "cologne", [], 1), r("cologne", "hamburg", ["bremen"], 1),
    r("cologne", "frankfurt", [], 1), r("frankfurt", "munich", ["stuttgart"], 1), r("berlin", "hamburg", [], 1), r("berlin", "cologne", ["hanover"], 1),
    r("berlin", "munich", ["leipzig", "nuremberg"], 1), r("berlin", "warsaw", ["poznan"], 1), r("warsaw", "moscow", ["brest", "minsk", "smolensk"], 1),
    r("moscow", "leningrad", [], 1), r("moscow", "kiev", []), r("kiev", "warsaw", []),
    r("paris", "marseille", ["dijon", "lyon", "avignon"], 1), r("marseille", "toulon", ["aubagne"]), r("paris", "bordeaux", ["orleans", "poitiers"], 1),
    r("paris", "zurich", ["belfort", "basel"], 1), r("paris", "munich", ["strasbourg", "stuttgart"], 1), r("munich", "vienna", ["salzburg", "linz"], 1),
    r("vienna", "budapest", [], 1), r("budapest", "bucharest", []), r("budapest", "constantinople", ["belgrade", "sofia", "plovdiv", "edirne"], 1),
    r("milan", "rome", ["bologna", "florence"], 1), r("rome", "naples", ["cassino"], 1), r("milan", "genoa", []), r("genoa", "rome", [[44.42, 9.35], [44.2, 9.9], [43.9, 10.35], "pisa", "grosseto"]),
    r("milan", "zurich", ["lugano", "gotthard"], 1), r("zurich", "frankfurt", ["basel", "karlsruhe"], 1), r("paris", "milan", ["dijon", "modane", "turin"], 1),
    r("berlin", "prague", ["dresden"], 1), r("prague", "vienna", ["brno"], 1), r("stockholm", "kristiania", ["karlstad"]),
    r("madrid", "barcelona", ["zaragoza"]), r("madrid", "lisbon", ["badajoz"]), r("barcelona", "marseille", ["perpignan", "narbonne", "montpellier", "arles"]),
    r("bordeaux", "madrid", [[43.9, -0.9], [43.45, -1.45], "irun", "burgos"]), r("madrid", "gibraltar", ["cordoba", "bobadilla", "algeciras"]), r("friedrichshafen", "munich", []),
    r("athens", "constantinople", [[38.32, 23.32], [38.9, 22.43], [39.64, 22.42], [40.2, 22.3], [40.5, 22.45], [40.72, 22.75], "thessaloniki", [41.09, 23.55], [41.15, 24.14], [41.14, 24.89], [41.12, 25.4], "edirne"]), r("alexandria", "cairo", [], 1), r("algiers", "tunis", ["constantine"]),
    boat("london", "paris", ["dover"], ["dover", "calais"], ["calais"]),
    boat("london", "amsterdam", ["harwich"], ["harwich", "hook"], ["hook", "rotterdam"]),
    boat("london", "brussels", ["dover"], ["dover", "ostend"], ["ostend"]),
    boat("london", "dublin", [[53.1, -2.44], "chester", [53.15, -3.5], [53.2, -4.13], "holyhead"], ["holyhead", "dublin"], []),
    boat("hamburg", "copenhagen", [[54.3, 9.7], [54.78, 9.43], [55.49, 9.47], [55.57, 9.75], [55.4, 10.39], [55.31, 10.79]], [[55.31, 10.79], [55.33, 11.14]], [[55.33, 11.14], [55.44, 11.79], [55.64, 12.08]]),
    boat("copenhagen", "stockholm", [[55.8, 12.3], [55.93, 12.3], "helsingor"], ["helsingor", "helsingborg"], ["helsingborg", [56.1, 13.05], [56.9, 14.0], "nassjo", [58.41, 15.62], [59.0, 16.2], [59.2, 17.63]]),
    r("friedrichshafen", "zurich", ["romanshorn"]),
    boat("bucharest", "constantinople", ["constanta"], ["constanta", [42.2, 29.2], [41.3, 29.1], "constantinople"], []),
    s("marseille", "algiers", [[41.5, 5.4], [39.6, 5.0]]), s("marseille", "tunis", [[40.0, 7.6]]), s("naples", "malta", [[40.0, 13.3], [38.6, 12.0], [37.4, 11.9], [36.3, 13.8]]),
    s("malta", "alexandria", [[33.8, 24.0]]), s("gibraltar", "malta", [[37.6, 11.2], [36.6, 13.0]]),
    s("constantinople", "alexandria", [[40.85, 28.3], [40.65, 27.4], [40.35, 26.7], [40.1, 26.35], [39.85, 26.05], [38.9, 25.6], [37.7, 25.9], [36.4, 26.8], [35.6, 27.0]]),
    s("athens", "alexandria", [[37.5, 23.7], [35.9, 23.0], [34.5, 23.5]]),
    s("stockholm", "leningrad", [[59.4, 19.2], [59.75, 23.0], [59.85, 26.0], [59.9, 28.0], [59.95, 29.3]]), s("genoa", "tunis", [[43.3, 9.55], [42.3, 9.85], [40.0, 10.5]]),
    s("lisbon", "gibraltar", [[37.0, -9.2], [36.6, -7.0], [35.95, -6.2]]), s("naples", "athens", [[39.4, 15.0], [38.5, 15.45], [38.25, 15.63], [37.9, 15.95], [37.6, 17.0], [37.2, 21.0], [36.2, 22.5], [36.25, 23.4], [37.0, 23.8], [37.6, 23.75]])
  ];
  U.TRANSPORT = { POINTS: P, ROUTES };
})(window.UpShip);
