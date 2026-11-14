// Railways and steamer lanes of the 1920s, with waypoints so they follow the geography.
// Each route joins two game cities; its segments are rail or sea, running through the points given (lat, lon).
window.UpShip = window.UpShip || {};
(function (U) {
  const P = {
    // Oceania
    albury: [-36.08, 146.92], newcastle_nsw: [-32.93, 151.78], portaugusta: [-32.49, 137.77], kalgoorlie: [-30.75, 121.47], palmerston: [-40.35, 175.61],
    // Asia
    agra: [27.18, 78.01], allahabad: [25.44, 81.85], nagpur: [21.15, 79.09], vizag: [17.69, 83.22], jhansi: [25.45, 78.57], multan: [30.2, 71.47], hyderabad_sd: [25.39, 68.37],
    nagoya: [35.18, 136.91], pukow: [32.12, 118.72], tsinan: [36.65, 117.0], chengchow: [34.75, 113.63], shanhaikwan: [40.0, 119.75], changchun: [43.88, 125.32], antung: [40.12, 124.39],
    samara: [53.2, 50.15], orenburg: [51.77, 55.1], chelyabinsk: [55.16, 61.4], krasnoyarsk: [56.01, 92.87], chita: [52.03, 113.5], manchouli: [49.6, 117.43], kualalumpur: [3.14, 101.69], semarang: [-6.97, 110.42],
    // South America
    mendoza: [-32.89, -68.84], rosario: [-32.95, -60.65], cordoba_ar: [-31.42, -64.18], tucuman: [-26.82, -65.22], curitiba: [-25.43, -49.27], santos: [-23.96, -46.33],
    puertoberrio: [6.49, -74.4], arica: [-18.48, -70.32], colon: [9.36, -79.9],
    // The Middle East and Africa
    aswan: [24.09, 32.9], wadihalfa: [21.8, 31.35], atbara: [17.7, 33.98], elarish: [31.13, 33.8], gaza: [31.5, 34.47], lydda: [31.95, 34.89], deraa: [32.62, 36.1], haifa: [32.82, 35.0],
    constantine: [36.37, 6.61], fez: [34.03, -5.0], oujda: [34.68, -1.91], oran: [35.7, -0.63], kimberley: [-28.74, 24.76], deaar: [-30.65, 24.01], voi: [-3.4, 38.56],
    djibouti: [11.59, 43.15], diredawa: [9.6, 41.85], suez: [29.95, 32.56],
    // North America
    trenton: [40.22, -74.76], baltimore: [39.29, -76.61], newhaven: [41.31, -72.92], providence: [41.82, -71.41], albany: [42.65, -73.75], buffalo: [42.89, -78.88],
    erie: [42.13, -80.09], toledo: [41.65, -83.54], harrisburg: [40.27, -76.88], fortwayne: [41.08, -85.14], omaha: [41.26, -95.94], cheyenne: [41.14, -104.82],
    saltlake: [40.76, -111.89], reno: [39.53, -119.81], sacramento: [38.58, -121.49], stpaul: [44.95, -93.09], fargo: [46.88, -96.79], billings: [45.78, -108.5],
    spokane: [47.66, -117.43], elpaso: [31.76, -106.49], tucson: [32.22, -110.97], yuma: [32.69, -114.62], houston: [29.76, -95.37], sanantonio: [29.42, -98.49],
    laredo: [27.51, -99.51], monterrey: [25.69, -100.32], sanluispotosi: [22.15, -100.98], jacksonville: [30.33, -81.66], savannah: [32.08, -81.09],
    charlotte: [35.23, -80.84], richmond: [37.54, -77.44], mobile: [30.69, -88.04], bham: [33.52, -86.8], kingston_on: [44.23, -76.49], london_on: [42.98, -81.25],
    keywest: [24.56, -81.78], springfield_mo: [37.21, -93.29], tulsa: [36.15, -95.99], sanluisobispo: [35.28, -120.66], santabarbara: [34.42, -119.7], redding: [40.59, -122.39],
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
    // Oceania: railways round Australia's south-east and across the Nullarbor, New Zealand's main trunk, and the steamers.
    r("sydney", "melbourne", ["albury"], 1), r("sydney", "brisbane", ["newcastle_nsw"]), r("melbourne", "adelaide", []), r("adelaide", "perth", ["portaugusta", "kalgoorlie"]), r("auckland", "wellington", ["palmerston"]),
    boat("wellington", "christchurch", [], ["wellington", [-42.4, 174.2], [-43.6, 172.9]], []),
    s("sydney", "auckland", [[-34.4, 172.4]]), s("sydney", "wellington", [[-40.4, 173.6]]), s("melbourne", "hobart", [[-38.6, 144.9], [-41.0, 148.6], [-43.2, 147.9]]),
    s("sydney", "noumea", [[-30.9, 155.3], [-27.9, 159.2], [-25.0, 162.9]]), s("auckland", "suva", [[-32.2, 175.8], [-27.5, 176.8], [-22.8, 177.7]]), s("brisbane", "portmoresby", [[-24.6, 153.8], [-19.0, 151.8], [-13.5, 149.4]]), s("colombo", "perth", [[-10.0, 95.0]]),
    s("surabaya", "darwin", [[-8.9, 116.0], [-10.6, 123.4]]), s("perth", "adelaide", [[-35.4, 116.0], [-35.6, 136.0]]),
    // Asia: India's and Japan's dense railways, the Trans-Siberian, China's few trunk lines, and the mail steamers.
    r("bombay", "delhi", ["jhansi", "agra"], 1), r("delhi", "calcutta", ["allahabad"], 1), r("bombay", "calcutta", ["nagpur"], 1), r("calcutta", "madras", ["vizag"], 1), r("bombay", "madras", []),
    r("delhi", "lahore", [], 1), r("lahore", "karachi", ["multan", "hyderabad_sd"], 1), r("tokyo", "osaka", ["nagoya"], 1),
    r("peking", "tientsin", [], 1), r("tientsin", "nanking", ["tsinan", "pukow"]), r("nanking", "shanghai", [], 1), r("peking", "hankow", ["chengchow"]), r("tientsin", "mukden", ["shanhaikwan"]),
    r("mukden", "harbin", ["changchun"]), r("seoul", "mukden", ["antung"]), r("harbin", "vladivostok", []), r("moscow", "omsk", ["samara", "chelyabinsk"], 1), r("omsk", "novosibirsk", [], 1),
    r("novosibirsk", "irkutsk", ["krasnoyarsk"], 1), r("irkutsk", "harbin", ["chita", "manchouli"], 1), r("moscow", "tashkent", ["samara", "orenburg", [45.6, 62.1]]),
    r("bangkok", "penang", [[9.1, 99.3]]), r("penang", "singapore", ["kualalumpur"]), r("batavia", "surabaya", ["semarang"]),
    boat("canton", "hongkong", [], ["canton", [22.6, 113.7], "hongkong"], []),
    s("bombay", "colombo", [[14.0, 73.0], [8.0, 76.2]]), s("colombo", "madras", [[5.7, 80.6], [9.5, 81.8]]), s("calcutta", "rangoon", [[21.4, 88.2], [17.5, 93.5], [15.6, 95.6]]),
    s("colombo", "penang", [[5.6, 81.0], [6.0, 95.0]]), s("rangoon", "penang", [[15.0, 96.6], [9.0, 97.6]]), s("singapore", "batavia", [[-1.0, 105.6], [-5.0, 106.6]]),
    s("singapore", "bangkok", [[2.0, 104.6], [8.0, 102.6], [12.6, 100.8]]), s("singapore", "saigon", [[2.6, 104.8], [8.6, 107.2]]), s("saigon", "hongkong", [[10.2, 107.6], [14.0, 110.6], [20.0, 113.6]]),
    s("hongkong", "manila", [[18.0, 117.6]]), s("hongkong", "shanghai", [[22.0, 115.6], [25.0, 120.0], [30.6, 122.6]]), s("hongkong", "hanoi", [[21.2, 112.0], [20.0, 110.4], [20.6, 107.2]]),
    s("shanghai", "osaka", [[31.4, 123.0], [32.6, 128.6], [33.9, 131.0], [34.2, 133.5]]), s("shanghai", "tientsin", [[32.0, 123.0], [37.6, 123.2], [38.6, 119.0]]), s("osaka", "taihoku", [[33.4, 134.9], [30.0, 131.5], [26.0, 123.5]]),
    s("vladivostok", "tokyo", [[42.0, 134.0], [41.5, 140.6], [36.0, 141.4]]), s("manila", "taihoku", [[19.0, 120.0], [24.0, 122.3]]),
    // South America: few railways; the coastal steamers carry most travellers. (The Transandine railway ends at Mendoza for our purposes: its rack section over the pass is no rival.)
    r("rio", "saopaulo", [], 1), r("saopaulo", "portoalegre", ["curitiba"]), r("buenosaires", "asuncion", ["rosario"]), r("santiago", "valparaiso", [], 1), r("recife", "natal", []),
    r("barranquilla", "bogota", ["puertoberrio"]),
    boat("buenosaires", "montevideo", [], ["buenosaires", "montevideo"], []),
    s("recife", "salvador", [[-10.5, -35.6]]), s("salvador", "rio", [[-17.0, -38.2], [-22.5, -40.6]]), s("rio", "montevideo", [[-25.5, -45.5], [-31.0, -49.6], [-34.6, -53.6]]),
    s("belem", "recife", [[-0.5, -46.5], [-2.2, -40.0], [-4.6, -35.6]]), s("belem", "manaus", [[-1.6, -52.0], [-2.4, -56.0]]), s("portofspain", "belem", [[8.0, -57.0], [4.0, -50.0]]),
    s("panama", "lima", [[6.0, -80.0], [-1.0, -81.6], [-6.0, -81.8]]), s("lima", "valparaiso", [[-18.0, -72.6], [-27.0, -71.9]]), s("barranquilla", "caracas", [[12.6, -72.0], [12.0, -68.6]]),
    s("caracas", "portofspain", [[11.2, -64.0]]), s("panama", "barranquilla", ["colon", [10.6, -77.6]]),
    // The Middle East and Africa: the few railways of the 1920s, and the steamer lanes that carried most travellers.
    r("alexandria", "cairo", [], 1), r("cairo", "ismailia", []), r("ismailia", "jerusalem", ["elarish", "gaza", "lydda"]), r("beirut", "damascus", []), r("damascus", "jerusalem", ["deraa", "haifa", "lydda"]),
    r("baghdad", "basra", []), r("cairo", "khartoum", ["aswan", "wadihalfa", "atbara"]), r("mombasa", "nairobi", ["voi"]), r("capetown", "johannesburg", ["deaar", "kimberley"], 1),
    r("algiers", "tunis", ["constantine"]), r("casablanca", "algiers", ["fez", "oujda", "oran"]),
    boat("aden", "addisababa", [], [[12.2, 44.2], "djibouti"], ["diredawa"]),
    s("alexandria", "beirut", [[32.4, 31.6], [33.5, 34.6]]), s("ismailia", "aden", ["suez", [27.5, 34.0], [22.0, 37.6], [16.0, 41.2], [12.55, 43.45]]),
    s("aden", "karachi", [[14.5, 51.0], [20.5, 61.0]]), s("aden", "bombay", [[13.5, 52.0], [16.5, 66.0]]), s("aden", "mombasa", [[11.9, 51.6], [5.0, 49.2], [-2.0, 42.6]]),
    s("basra", "karachi", [[29.3, 49.0], [26.6, 54.6], [25.2, 57.6], [24.5, 62.0]]), s("karachi", "bombay", [[22.0, 67.6], [20.0, 71.0]]),
    s("mombasa", "capetown", [[-10.0, 41.0], [-20.0, 37.6], [-27.0, 34.2], [-34.6, 26.0], [-35.3, 20.0]]), s("lagos", "capetown", [[3.0, 3.0], [-6.0, 10.5], [-17.0, 10.6], [-30.0, 15.6]]),
    s("dakar", "lagos", [[9.0, -15.6], [4.0, -9.0], [4.3, -2.0], [5.8, 2.6]]), s("casablanca", "dakar", [[28.0, -13.6], [21.0, -18.0]]), s("gibraltar", "casablanca", [[35.6, -6.5]]),
    s("malta", "tripoli", []), s("tripoli", "benghazi", [[33.2, 16.0], [32.9, 19.0]]), s("benghazi", "alexandria", [[33.0, 23.0], [32.0, 28.0]]),
    // North America: the Pennsylvania and New York Central main lines, the transcontinentals, the Sunset Route, Canada, and Mexico.
    r("newyork", "philadelphia", ["trenton"], 1), r("philadelphia", "washington", ["baltimore"], 1), r("newyork", "boston", ["newhaven", "providence"], 1),
    r("newyork", "cleveland", ["albany", "buffalo", "erie"], 1), r("cleveland", "chicago", ["toledo"], 1), r("philadelphia", "pittsburgh", ["harrisburg"], 1),
    r("pittsburgh", "chicago", [[40.8, -81.4], "fortwayne"], 1), r("pittsburgh", "cleveland", []), r("akron", "cleveland", []), r("lakehurst", "newyork", []),
    r("chicago", "detroit", [], 1), r("detroit", "toronto", ["london_on"]), r("toronto", "montreal", ["kingston_on"], 1), r("montreal", "newyork", [[44.7, -73.45], "albany"], 1),
    r("chicago", "stlouis", [], 1), r("chicago", "denver", ["omaha"], 1), r("denver", "sanfrancisco", ["cheyenne", "saltlake", "reno", "sacramento"], 1),
    r("chicago", "seattle", ["stpaul", "fargo", "billings", "spokane"], 1), r("seattle", "portland", []), r("portland", "sanfrancisco", ["redding", "sacramento"]),
    r("sanfrancisco", "losangeles", ["sanluisobispo", "santabarbara"], 1), r("losangeles", "neworleans", ["yuma", "tucson", "elpaso", "sanantonio", "houston"], 1),
    r("stlouis", "dallas", ["springfield_mo", "tulsa"]), r("dallas", "oklahomacity", []), r("dallas", "neworleans", ["houston"]),
    r("neworleans", "atlanta", ["mobile", "bham"]), r("atlanta", "washington", ["charlotte", "richmond"], 1), r("washington", "miami", ["richmond", "savannah", "jacksonville"]),
    r("dallas", "mexicocity", ["sanantonio", "laredo", "monterrey", "sanluispotosi"]),
    boat("miami", "havana", ["keywest"], ["keywest", [23.6, -82.0]], []),
    s("newyork", "havana", [[38.0, -73.5], [32.0, -77.5], [26.5, -79.4]]), s("newyork", "boston", [[40.95, -73.2], [41.15, -72.2], [41.35, -71.1]]),
    s("detroit", "cleveland", [[42.05, -83.1], [41.75, -82.4]]), s("seattle", "sanfrancisco", [[48.3, -124.7], [44.0, -124.6], [40.0, -124.5]]),
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
