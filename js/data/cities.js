// Europe, about 1924. Tier and specialty drive passenger demand.
// label: which side of the marker the name sits on ("r", "l", "t", "b").
window.UpShip = window.UpShip || {};
UpShip.CITIES = [
  { id: "friedrichshafen", name: "Friedrichshafen", country: "Germany", lat: 47.65, lon: 9.48, tier: "small", specialty: "culture", home: true, works: true, pro: "Zeppelin works and calm lake weather", con: "A small town, far in Germany's southern corner", label: "r" },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.40, tier: "major", specialty: "capital", home: true, works: false, pro: "The largest demand in Germany", con: "No airship works", label: "r" },
  { id: "hamburg", name: "Hamburg", country: "Germany", lat: 53.55, lon: 9.99, tier: "large", specialty: "port", home: true, works: false, pro: "Port freight and access to the North Sea", con: "Fog and rough coastal weather", label: "r" },
  { id: "frankfurt", name: "Frankfurt", country: "Germany", lat: 50.11, lon: 8.68, tier: "medium", specialty: "commerce", home: true, works: false, pro: "Central location, trade fairs, and banking", con: "No airship works", label: "r" },

  { id: "cardington", name: "Cardington", country: "United Kingdom", lat: 52.11, lon: -0.42, tier: "small", specialty: "industrial", home: true, works: true, pro: "Government airship works with big sheds", con: "Small; the demand is in London", label: "t" },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.51, lon: -0.13, tier: "major", specialty: "capital", home: true, works: false, pro: "Huge demand", con: "Fog and costly land", label: "b" },
  { id: "glasgow", name: "Glasgow", country: "United Kingdom", lat: 55.86, lon: -4.25, tier: "large", specialty: "industrial", home: true, works: true, pro: "The Beardmore works at Inchinnan, where R34 was built", con: "Far from the rest of Europe", label: "r" },
  { id: "manchester", name: "Manchester", country: "United Kingdom", lat: 53.48, lon: -2.24, tier: "large", specialty: "industrial", home: true, works: false, pro: "Industrial freight and a large population", con: "Wet weather and no works", label: "r" },

  { id: "paris", name: "Paris", country: "France", lat: 48.86, lon: 2.35, tier: "major", specialty: "capital", home: true, works: false, pro: "Strong demand at the center of the network", con: "No shipbuilding base", label: "r" },
  { id: "marseille", name: "Marseille", country: "France", lat: 43.30, lon: 5.37, tier: "medium", specialty: "port", home: true, works: false, pro: "Mediterranean and North Africa routes", con: "The mistral wind", label: "l" },
  { id: "toulon", name: "Toulon", country: "France", lat: 43.12, lon: 5.93, tier: "small", specialty: "port", home: true, works: true, pro: "A naval airship base with sheds", con: "A small local market", label: "b" },
  { id: "bordeaux", name: "Bordeaux", country: "France", lat: 44.84, lon: -0.58, tier: "medium", specialty: "port", home: true, works: false, pro: "Atlantic reach toward South America", con: "Far from Europe's center", label: "l" },

  { id: "rome", name: "Rome", country: "Italy", lat: 41.90, lon: 12.50, tier: "large", specialty: "culture", home: true, works: true, pro: "The Ciampino airship works and government favor", con: "Only modest demand", label: "l" },
  { id: "milan", name: "Milan", country: "Italy", lat: 45.46, lon: 9.19, tier: "large", specialty: "industrial", home: true, works: false, pro: "Industrial wealth and freight", con: "The Alps block routes to the north", label: "r" },
  { id: "naples", name: "Naples", country: "Italy", lat: 40.85, lon: 14.27, tier: "large", specialty: "port", home: true, works: false, pro: "A southern port toward Africa and the eastern Mediterranean", con: "The poorest local market", label: "r" },
  { id: "genoa", name: "Genoa", country: "Italy", lat: 44.41, lon: 8.93, tier: "medium", specialty: "port", home: true, works: false, pro: "Port and shipping money", con: "Mountains behind the city leave little room for sheds", label: "l" },

  { id: "vienna", name: "Vienna", country: "Austria", lat: 48.21, lon: 16.37, tier: "large", specialty: "culture", label: "r" },
  { id: "prague", name: "Prague", country: "Czechoslovakia", lat: 50.08, lon: 14.44, tier: "medium", specialty: "culture", label: "r" },
  { id: "budapest", name: "Budapest", country: "Hungary", lat: 47.50, lon: 19.04, tier: "large", specialty: "capital", label: "r" },
  { id: "warsaw", name: "Warsaw", country: "Poland", lat: 52.23, lon: 21.01, tier: "large", specialty: "capital", label: "r" },
  { id: "bucharest", name: "Bucharest", country: "Romania", lat: 44.43, lon: 26.10, tier: "medium", specialty: "capital", label: "r" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.37, lon: 4.90, tier: "medium", specialty: "commerce", label: "r" },
  { id: "brussels", name: "Brussels", country: "Belgium", lat: 50.85, lon: 4.35, tier: "medium", specialty: "commerce", label: "l" },
  { id: "zurich", name: "Zurich", country: "Switzerland", lat: 47.38, lon: 8.54, tier: "medium", specialty: "commerce", label: "l" },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", lat: 55.68, lon: 12.57, tier: "medium", specialty: "port", label: "r" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", lat: 59.33, lon: 18.07, tier: "medium", specialty: "capital", label: "r" },
  { id: "kristiania", name: "Kristiania", country: "Norway", lat: 59.91, lon: 10.75, tier: "medium", specialty: "capital", label: "l" },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.42, lon: -3.70, tier: "large", specialty: "capital", label: "r" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", lat: 38.72, lon: -9.14, tier: "medium", specialty: "port", label: "r" },
  { id: "barcelona", name: "Barcelona", country: "Spain", lat: 41.39, lon: 2.17, tier: "large", specialty: "port", label: "r" },
  { id: "athens", name: "Athens", country: "Greece", lat: 37.98, lon: 23.73, tier: "medium", specialty: "culture", label: "r" },
  { id: "constantinople", name: "Constantinople", country: "Turkey", lat: 41.01, lon: 28.98, tier: "large", specialty: "port", label: "r" },
  { id: "dublin", name: "Dublin", country: "Irish Free State", lat: 53.35, lon: -6.26, tier: "medium", specialty: "capital", label: "r" }
];

UpShip.TIERS = {
  major: { name: "Major city", demand: 60, r: 6.5 },
  large: { name: "Large city", demand: 40, r: 5 },
  medium: { name: "Medium city", demand: 25, r: 4 },
  small: { name: "Small town", demand: 12, r: 3 }
};

UpShip.SPECIALTIES = {
  capital: { name: "Capital", note: "More mail and government travel", passengerBoost: 1.0, freightBoost: 0.9 },
  port: { name: "Port", note: "More freight", passengerBoost: 1.0, freightBoost: 1.4 },
  industrial: { name: "Industrial", note: "More freight, less tourism", passengerBoost: 0.9, freightBoost: 1.4 },
  culture: { name: "Culture", note: "More first-class travel", passengerBoost: 1.1, freightBoost: 0.7 },
  commerce: { name: "Commerce", note: "More business travel", passengerBoost: 1.05, freightBoost: 1.1 }
};

UpShip.nationOfCountry = { "Germany": "germany", "United Kingdom": "britain", "France": "france", "Italy": "italy" };
UpShip.cityById = Object.fromEntries(UpShip.CITIES.map(c => [c.id, c]));
