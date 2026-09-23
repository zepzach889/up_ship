// Pre-made ship classes. Fictional classes modeled on real ships of the period.
window.UpShip = window.UpShip || {};
UpShip.SHIP_CLASSES = {
  seeschwalbe: {
    id: "seeschwalbe",
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
    id: "brieftaube",
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
    id: "marine",
    name: "Marine conversion",
    role: "War-surplus naval zeppelin, refitted",
    basis: "Modeled on wartime naval zeppelins",
    passengers: 40, cargoTons: 4,
    speedKmh: 95, rangeKm: 5000, crew: 20,
    price: 55000, dailyCost: 260, fuelPerKm: 0.16,
    buildDays: 14,
    note: "Cramped and worn. Its discomfort will matter once passenger comfort is added.",
    names: ["Nordsee", "Ostsee", "Helgoland", "Jade", "Weser", "Elbe", "Ems", "Kiel"]
  }
};
UpShip.CATALOG = ["seeschwalbe", "brieftaube", "marine"];

// Economy settings. Kept gentle for now.
UpShip.ECONOMY = {
  startingMoney: 150000,
  fareBase: 2, farePerKm: 0.018,          // passenger fare, pounds
  freightBase: 5, freightPerKm: 0.07,     // per ton, pounds
  passengerShare: 0.75,                   // daily passengers per direction = sqrt(wA * wB) * share
  freightShare: 0.6,                      // daily tons per direction, same form
  demandSwing: 0.15,                      // random daily variation
  passengerWaitDays: 2,                   // unserved passengers give up after about this long
  freightWaitDays: 4,
  maxStops: 5
};

// Time. One turn is half a day; departures at 7 am and 7 pm.
// msPerTurn: how long a turn takes to play out on screen, by auto-play speed.
UpShip.TIME = {
  startDate: Date.UTC(1919, 0, 1),
  tickHours: 12,
  firstDepartureHour: 7,
  turnaroundHours: 1,
  msPerTurn: { 1: 3200, 2: 1600, 3: 700 }
};
