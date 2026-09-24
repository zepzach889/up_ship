// Pre-made ship classes. Fictional classes modeled on real ships of the period.
window.UpShip = window.UpShip || {};
UpShip.SHIP_CLASSES = {
  seeschwalbe: {
    id: "seeschwalbe", kind: "passenger",
    name: "Seeschwalbe class",
    role: "Small passenger ship",
    basis: "Modeled on the Bodensee (1919)",
    passengers: 24, cargoTons: 1,
    speedKmh: 110, rangeKm: 1700, crew: 12,
    price: 90000, dailyCost: 150, fuelPerKm: 0.10,
    buildDays: 90,
    names: ["Konstanz", "Lindau", "Meersburg", "Überlingen", "Radolfzell", "Langenargen", "Immenstaad", "Hagnau"]
  },
  brieftaube: {
    id: "brieftaube", kind: "cargo",
    name: "Brieftaube class",
    role: "Mail and cargo ship",
    basis: "Modeled on small postwar cargo designs",
    passengers: 0, cargoTons: 8,
    speedKmh: 100, rangeKm: 2000, crew: 10,
    price: 70000, dailyCost: 110, fuelPerKm: 0.08,
    buildDays: 60,
    names: ["Merkur", "Kurier", "Eilbote", "Postillon", "Depesche", "Stafette"]
  },
  marine: {
    id: "marine", kind: "surplus",
    name: "Marine conversion",
    role: "War-surplus naval zeppelin, refitted",
    basis: "Modeled on wartime naval zeppelins",
    passengers: 40, cargoTons: 4,
    speedKmh: 95, rangeKm: 5000, crew: 20,
    price: 55000, dailyCost: 260, fuelPerKm: 0.16,
    buildDays: 14,
    note: "Cramped and worn. Its discomfort will matter once passenger comfort is added.",
    names: ["Nordsee", "Ostsee", "Helgoland", "Jade", "Weser", "Elbe", "Ems", "Kiel"]
  },
  swift: {
    id: "swift", kind: "passenger", name: "Swift class", role: "Passenger ship", basis: "Modeled on British postwar rigid designs",
    passengers: 30, cargoTons: 1, speedKmh: 100, rangeKm: 2200, crew: 14,
    price: 100000, dailyCost: 165, fuelPerKm: 0.11, buildDays: 120,
    names: ["Thames", "Severn", "Mersey", "Tyne", "Trent", "Avon", "Clyde", "Tay"]
  },
  petrel: {
    id: "petrel", kind: "cargo", name: "Petrel class", role: "Mail and cargo ship", basis: "Modeled on British postwar rigid designs",
    passengers: 0, cargoTons: 10, speedKmh: 90, rangeKm: 2500, crew: 12,
    price: 80000, dailyCost: 125, fuelPerKm: 0.09, buildDays: 90,
    names: ["Mercury", "Herald", "Dispatch", "Courier", "Messenger", "Envoy"]
  },
  rclass: {
    id: "rclass", kind: "surplus", name: "R-class conversion", role: "War-surplus rigid, refitted", basis: "Modeled on the R33 and R34 (1919)",
    passengers: 50, cargoTons: 5, speedKmh: 90, rangeKm: 6000, crew: 22,
    price: 60000, dailyCost: 280, fuelPerKm: 0.17, buildDays: 21,
    note: "Cramped and worn. Its discomfort will matter once passenger comfort is added.",
    names: ["Albion", "Caledonia", "Cambria", "Hibernia", "Anglia", "Mercia"]
  },
  hirondelle: {
    id: "hirondelle", kind: "passenger", name: "Hirondelle class", role: "Passenger semi-rigid", basis: "Modeled on French postwar semi-rigids",
    passengers: 20, cargoTons: 1, speedKmh: 105, rangeKm: 1400, crew: 10,
    price: 75000, dailyCost: 130, fuelPerKm: 0.09, buildDays: 75,
    names: ["Provence", "Bretagne", "Normandie", "Picardie", "Lorraine", "Alsace", "Touraine", "Gascogne"]
  },
  martinet: {
    id: "martinet", kind: "cargo", name: "Martinet class", role: "Mail and cargo semi-rigid", basis: "Modeled on French postwar semi-rigids",
    passengers: 0, cargoTons: 7, speedKmh: 100, rangeKm: 1800, crew: 9,
    price: 62000, dailyCost: 100, fuelPerKm: 0.075, buildDays: 60,
    names: ["Estafette", "Courrier", "Messager", "Postier", "Héraut", "Relais"]
  },
  reparations: {
    id: "reparations", kind: "surplus", name: "Reparations zeppelin", role: "German-built rigid received after the war, refitted", basis: "Modeled on the zeppelins France received as reparations",
    passengers: 45, cargoTons: 5, speedKmh: 100, rangeKm: 5500, crew: 22,
    price: 65000, dailyCost: 270, fuelPerKm: 0.16, buildDays: 21,
    note: "Better built than most war-surplus ships, but still cramped.",
    names: ["Atlantique", "Pacifique", "Sahara", "Alpes", "Pyrénées", "Vosges"]
  },
  gabbiano: {
    id: "gabbiano", kind: "passenger", name: "Gabbiano class", role: "Passenger semi-rigid", basis: "Modeled on Italian postwar semi-rigids",
    passengers: 20, cargoTons: 1, speedKmh: 100, rangeKm: 1500, crew: 9,
    price: 65000, dailyCost: 115, fuelPerKm: 0.085, buildDays: 60,
    names: ["Liguria", "Toscana", "Umbria", "Lazio", "Campania", "Puglia", "Sicilia", "Sardegna"]
  },
  colombo: {
    id: "colombo", kind: "cargo", name: "Colombo class", role: "Mail and cargo semi-rigid", basis: "Modeled on Italian postwar semi-rigids",
    passengers: 0, cargoTons: 6, speedKmh: 95, rangeKm: 1800, crew: 8,
    price: 55000, dailyCost: 90, fuelPerKm: 0.07, buildDays: 45,
    names: ["Mercurio", "Corriere", "Staffetta", "Messaggero", "Araldo", "Postiere"]
  },
  militare: {
    id: "militare", kind: "surplus", name: "Military semi-rigid conversion", role: "War-surplus semi-rigid, refitted", basis: "Modeled on Italian wartime semi-rigids",
    passengers: 30, cargoTons: 3, speedKmh: 90, rangeKm: 3000, crew: 14,
    price: 45000, dailyCost: 190, fuelPerKm: 0.12, buildDays: 14,
    note: "Cramped and worn. Its discomfort will matter once passenger comfort is added.",
    names: ["Ausonia", "Aquila", "Vesuvio", "Etna", "Stromboli", "Tevere"]
  }
};
UpShip.CATALOG = ["seeschwalbe", "brieftaube", "marine"];

// Economy settings, tuned for a steady pace: a well-placed ship pays for itself in about four years.
UpShip.ECONOMY = {
  startingMoney: 150000,
  noWorksBonus: 50000,                    // extra starting funds for home cities without works
  worksBuildFactor: 0.7, worksPriceFactor: 0.9,
  fareBase: 1.5, farePerKm: 0.0042,       // passenger fare, pounds
  freightBase: 1, freightPerKm: 0.014,    // per ton, pounds
  passengerShare: 0.65,                   // daily passengers per direction = sqrt(wA * wB) * share
  freightShare: 0.75,                     // daily tons per direction, same form
  demandSwing: 0.15,                      // random daily variation
  passengerWaitDays: 2,                   // unserved passengers give up after about this long
  freightWaitDays: 4,
  costFactor: 0.5,                        // multiplies every class's daily cost and fuel
  maxStops: 5,
  turnaroundHours: 3,
  minLoadToLeave: 0.6,                    // ships wait for about this share of a full load...
  maxWaitHours: 12,                       // ...but no longer than this after arriving
  // Wear and service life
  lifeYears: { built: 15, surplus: 5 },
  surplusStartCondition: 0.6,
  wearPerFlightHour: 0.00012,             // condition lost per hour flown (surplus hulls wear 1.6 times faster)
  surplusWearFactor: 1.6,
  lowConditionCostRise: 0.5,              // daily cost rises up to 50% as condition falls to zero
  defaultOverhaulAt: 0.5,
  overhaulDays: 21,
  overhaulCostShare: 0.08,                // share of the class price
  surplusStock: 4,                        // war-surplus hulls each country can sell
  scrapShare: 0.1,
  // Minor incidents, rolled once per flight
  incidentBase: 0.0003, incidentWear: 0.012
};

// Time. One turn is half a day, starting at 7 am and 7 pm.
// msPerTurn: how long a turn takes to play out on screen, by auto-play speed.
UpShip.TIME = {
  startDate: Date.UTC(1919, 0, 1),
  tickHours: 12,
  firstDepartureHour: 7,
  msPerTurn: { 1: 3200, 2: 1600, 3: 700 }
};
