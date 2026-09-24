// The four playable countries: strengths, catalogs, and name suggestions.
window.UpShip = window.UpShip || {};
UpShip.NATIONS = {
  germany: {
    id: "germany", name: "Germany", mapName: "Germany",
    strength: "Best early engineering",
    description: "Fast, well-built rigid ships from the builders who pioneered them.",
    catalog: ["seeschwalbe", "brieftaube", "marine"],
    subsidy: { scale: 0.6, frequency: 0.5, buildShare: 0.15, leaning: "capitals" },
    companyNames: {
      patterns: ["{cityer} Luftreederei", "{adj} Luftreederei", "{adj} Luftschiff-Linie", "{adj} Luftverkehrs-Gesellschaft", "{cityer} Luftschiff-Linie"],
      adj: ["Rheinische", "Hanseatische", "Süddeutsche", "Norddeutsche", "Bayerische", "Mitteldeutsche", "Schwäbische", "Märkische"]
    },
    directors: {
      first: ["Heinrich", "Karl", "Wilhelm", "Otto", "Friedrich", "Hans", "Walter", "Margarete", "Helene", "Clara"],
      last: ["Brandt", "Keller", "Hoffmann", "Wagner", "Richter", "Vogel", "Lange", "Hartmann", "Seidel", "Albrecht"]
    }
  },
  britain: {
    id: "britain", name: "Britain", mapName: "United Kingdom",
    strength: "Imperial-route ambitions",
    description: "Large, long-ranged rigid ships, slower and costlier than the German designs.",
    catalog: ["swift", "petrel", "rclass"],
    subsidy: { scale: 1.0, frequency: 1.0, buildShare: 0.25, leaning: "imperial" },
    companyNames: {
      patterns: ["{adj} Air Navigation Company", "{adj} Airship Company", "{adj} Aerial Transport Company", "{adj} Air Line", "{city} Airship Company"],
      adj: ["Royal", "British", "Atlantic", "Empire", "Albion", "Northern", "Dominion", "Commonwealth"]
    },
    directors: {
      first: ["Arthur", "George", "Edward", "Henry", "Charles", "William", "Albert", "Frederick", "Edith", "Margaret"],
      last: ["Whitcombe", "Harrington", "Fairfax", "Lindsay", "Ashworth", "Pembroke", "Carver", "Holloway", "Sinclair", "Marsh"]
    }
  },
  france: {
    id: "france", name: "France", mapName: "France",
    strength: "Strong government support",
    description: "Cheap small semi-rigids, plus a German-built zeppelin received as war reparations.",
    catalog: ["hirondelle", "martinet", "reparations"],
    subsidy: { scale: 1.5, frequency: 1.5, buildShare: 0.3, leaning: "any" },
    companyNames: {
      patterns: ["Compagnie {adj} de Navigation Aérienne", "Société des Dirigeables {of}", "Compagnie des Dirigeables {of}", "Lignes Aériennes {adj}s"],
      adj: ["Transcontinentale", "Méditerranéenne", "Atlantique", "Française", "Parisienne", "Provençale", "Nationale"],
      of: ["de France", "du Midi", "de l'Atlantique", "de Méditerranée", "de l'Ouest", "Transalpins"]
    },
    directors: {
      first: ["Henri", "Louis", "Georges", "Marcel", "Paul", "André", "Émile", "Jacques", "Marguerite", "Jeanne"],
      last: ["Lefèvre", "Moreau", "Girard", "Rousseau", "Fontaine", "Chevalier", "Garnier", "Lambert", "Dubois", "Mercier"]
    }
  },
  italy: {
    id: "italy", name: "Italy", mapName: "Italy",
    strength: "Mediterranean reach",
    description: "The cheapest and quickest-to-build ships, all semi-rigids, with shorter range.",
    catalog: ["gabbiano", "colombo", "militare"],
    subsidy: { scale: 1.0, frequency: 1.0, buildShare: 0.25, leaning: "mediterranean" },
    companyNames: {
      patterns: ["Società {adj} di Navigazione Aerea", "Aeronavi {adj}", "Linee Aeree {adjpl}", "Società {adj} Dirigibili"],
      adj: ["Italiana", "Tirrena", "Adriatica", "Ligure", "Lombarda", "Mediterranea", "Romana", "Partenopea"],
      adjpl: ["Italiane", "Tirrene", "Adriatiche", "Mediterranee", "Romane", "Lombarde"]
    },
    directors: {
      first: ["Giuseppe", "Giovanni", "Luigi", "Carlo", "Umberto", "Vittorio", "Enrico", "Alessandro", "Maria", "Giulia"],
      last: ["Rossi", "Bianchi", "Ferrari", "Conti", "Marchetti", "Galli", "Fontana", "Rinaldi", "Moretti", "Colombo"]
    }
  }
};
// Cities that count as Mediterranean or imperial destinations for route grants.
UpShip.MEDITERRANEAN = ["barcelona", "marseille", "toulon", "genoa", "rome", "naples", "athens", "constantinople", "tunis", "algiers", "malta", "alexandria", "cairo", "gibraltar"];
UpShip.IMPERIAL = ["gibraltar", "malta", "alexandria", "cairo", "marseille", "rome", "naples", "athens", "lisbon"];
UpShip.NATION_ORDER = ["germany", "britain", "france", "italy"];

// City-name forms used in company names.
UpShip.CITY_ADJ = { friedrichshafen: "Friedrichshafener", berlin: "Berliner", hamburg: "Hamburger", frankfurt: "Frankfurter" };

// Company identity options.
UpShip.EMBLEM = {
  symbols: ["wheel", "star", "compass", "eagle", "globe", "propeller", "sunburst", "airship"],
  symbolNames: { wheel: "Winged wheel", star: "Star", compass: "Compass rose", eagle: "Eagle", globe: "Globe", propeller: "Propeller", sunburst: "Sunburst", airship: "Airship" },
  frames: ["circle", "shield", "pennant", "diamond"],
  frameNames: { circle: "Circle", shield: "Shield", pennant: "Pennant", diamond: "Diamond" },
  // First colors mark ships and routes, so they need to read on the map.
  mainColors: ["#9b2a24", "#7a1f3a", "#b5561f", "#8a6a1c", "#2d5a3a", "#1f6a6a", "#1f3a68", "#3f5f86", "#5a3470", "#2a2a2a"],
  trimColors: ["#f0e7d1", "#d9b86a", "#c8ccd0", "#2a2a2a", "#9b2a24", "#1f3a68", "#2d5a3a", "#b5561f"]
};
