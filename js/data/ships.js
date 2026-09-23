// Pre-made ship classes. Fictional classes modeled on real ships of the period.
window.UpShip = window.UpShip || {};
UpShip.SHIP_CLASSES = {
  seeschwalbe: {
    id: "seeschwalbe",
    name: "Seeschwalbe class",
    builder: "Small German passenger ship",
    basis: "Modeled on the Bodensee (1919)",
    passengers: 24,
    speedKmh: 110,
    rangeKm: 1700,
    crew: 12,
    price: 90000,
    dailyCost: 150,     // wages, gas top-up, routine upkeep
    fuelPerKm: 0.10     // pounds per km flown
  }
};

// Economy settings. Kept gentle for now.
UpShip.ECONOMY = {
  startingMoney: 60000,
  fareBase: 2,          // pounds per ticket
  farePerKm: 0.018,     // pounds per km
  demandShare: 0.75,    // share of a city pair's potential taken by one departure
  demandSwing: 0.15     // random variation per departure
};

// Time. One turn is half a day; departures at 7 am and 7 pm.
// msPerTurn: how long a turn takes to play out on screen, by auto-play speed.
UpShip.TIME = {
  startDate: Date.UTC(1919, 0, 1),
  tickHours: 12,
  firstDepartureHour: 7,
  msPerTurn: { 1: 3200, 2: 1600, 3: 700 }
};
