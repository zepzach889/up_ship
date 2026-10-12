// Europe, about 1924. Tier and specialty drive passenger demand.
// label: which side of the marker the name sits on ("r", "l", "t", "b").
window.UpShip = window.UpShip || {};
UpShip.CITIES = [
  // Refuelling stations: few passengers, but their masts and fuel make long ocean crossings possible in shorter legs.
  { id: "azores", name: "The Azores", country: "Portugal", lat: 37.74, lon: -25.67, tier: "small", specialty: "port", station: true, gateway: true, region: "ocean", via: "an island refuelling station", works: false, pro: "Halfway house of the North Atlantic, at Ponta Delgada", con: "Few passengers of its own; open ocean on every side", label: "r" },
  { id: "bermuda", name: "Bermuda", country: "Bermuda", lat: 32.3, lon: -64.78, tier: "small", specialty: "port", station: true, gateway: true, region: "ocean", via: "an island refuelling station", works: false, pro: "British island station on the way to New York and the Caribbean", con: "Few passengers of its own; open ocean on every side", label: "r" },
  { id: "newfoundland", name: "Newfoundland", country: "Newfoundland", lat: 47.56, lon: -52.71, tier: "small", specialty: "port", station: true, gateway: true, region: "ocean", via: "an island refuelling station", works: false, pro: "St John's, the shortest Atlantic crossing to Ireland", con: "Few passengers of its own; open ocean on every side", label: "r" },
  { id: "capeverde", name: "Cape Verde", country: "Portugal", lat: 14.93, lon: -23.51, tier: "small", specialty: "port", station: true, gateway: true, region: "ocean", via: "an island refuelling station", works: false, pro: "Mindelo, the coaling station on the way to South America", con: "Few passengers of its own; open ocean on every side", label: "r" },
  { id: "chicago", name: "Chicago", country: "United States", lat: 41.88, lon: -87.63, tier: "major", specialty: "industrial", gateway: true, region: "na", via: "in North America", home: true, works: false, pro: "Rail hub of the continent; meat, steel, and grain", con: "Lake gales in winter", label: "r" },
  { id: "philadelphia", name: "Philadelphia", country: "United States", lat: 39.95, lon: -75.17, tier: "large", specialty: "industrial", gateway: true, region: "na", via: "in North America", works: false, pro: "Shipyards, mills, and the Pennsylvania Railroad", con: "Close enough to New York to compete with it", label: "r" },
  { id: "boston", name: "Boston", country: "United States", lat: 42.36, lon: -71.06, tier: "large", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Finance and the New England trade", con: "Fog off the Atlantic", label: "r" },
  { id: "washington", name: "Washington", country: "United States", lat: 38.91, lon: -77.04, tier: "large", specialty: "capital", gateway: true, region: "na", via: "in North America", home: true, works: false, pro: "The capital: government, diplomats, and the Post Office", con: "Summer thunderstorms", label: "r" },
  { id: "detroit", name: "Detroit", country: "United States", lat: 42.33, lon: -83.05, tier: "large", specialty: "industrial", gateway: true, region: "na", via: "in North America", home: true, works: false, pro: "Motor cars: the fastest-growing city of the decade", con: "Lake weather", label: "r" },
  { id: "montreal", name: "Montreal", country: "Canada", lat: 45.5, lon: -73.57, tier: "large", specialty: "port", gateway: true, region: "na", via: "in North America", works: false, pro: "Canada's metropolis and St Lawrence port", con: "Hard winters", label: "r" },
  { id: "sanfrancisco", name: "San Francisco", country: "United States", lat: 37.77, lon: -122.42, tier: "large", specialty: "port", gateway: true, region: "na", via: "in North America", works: false, pro: "Pacific port and western finance", con: "Coastal fog", label: "r" },
  { id: "losangeles", name: "Los Angeles", country: "United States", lat: 34.05, lon: -118.24, tier: "large", specialty: "culture", gateway: true, region: "na", via: "in North America", works: false, pro: "Films, oil, and a boom that never stops", con: "Far from everything else", label: "r" },
  { id: "cleveland", name: "Cleveland", country: "United States", lat: 41.5, lon: -81.69, tier: "medium", specialty: "industrial", gateway: true, region: "na", via: "in North America", works: false, pro: "Steel and lake shipping", con: "Lake gales", label: "r" },
  { id: "pittsburgh", name: "Pittsburgh", country: "United States", lat: 40.44, lon: -79.99, tier: "medium", specialty: "industrial", gateway: true, region: "na", via: "in North America", works: false, pro: "Steel capital of the world", con: "Smoke and hills", label: "r" },
  { id: "stlouis", name: "St Louis", country: "United States", lat: 38.63, lon: -90.2, tier: "medium", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Gateway to the West, on the Mississippi", con: "Summer storms", label: "r" },
  { id: "neworleans", name: "New Orleans", country: "United States", lat: 29.95, lon: -90.07, tier: "medium", specialty: "port", gateway: true, region: "na", via: "in North America", works: false, pro: "Cotton port at the mouth of the Mississippi", con: "Hurricanes in late summer", label: "r" },
  { id: "toronto", name: "Toronto", country: "Canada", lat: 43.65, lon: -79.38, tier: "medium", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Ontario's capital and Canada's second city", con: "Lake weather", label: "r" },
  { id: "havana", name: "Havana", country: "Cuba", lat: 23.11, lon: -82.37, tier: "medium", specialty: "capital", gateway: true, region: "na", via: "in North America", works: false, pro: "Sugar, tourists, and no Prohibition", con: "Hurricanes in late summer", label: "r" },
  { id: "mexicocity", name: "Mexico City", country: "Mexico", lat: 19.43, lon: -99.13, tier: "medium", specialty: "capital", gateway: true, region: "na", via: "in North America", works: false, pro: "Capital of Mexico, high on its plateau", con: "Thin air at 2,200 metres", label: "r" },
  { id: "dallas", name: "Dallas", country: "United States", lat: 32.78, lon: -96.8, tier: "medium", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Cotton, banking, and the rail crossroads of Texas", con: "Plains storms", label: "r" },
  { id: "atlanta", name: "Atlanta", country: "United States", lat: 33.75, lon: -84.39, tier: "small", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Rail hub of the South", con: "Summer thunderstorms", label: "r" },
  { id: "miami", name: "Miami", country: "United States", lat: 25.76, lon: -80.19, tier: "small", specialty: "culture", gateway: true, region: "na", via: "in North America", works: false, pro: "Florida's boom town and resort", con: "Hurricanes in late summer", label: "r" },
  { id: "denver", name: "Denver", country: "United States", lat: 39.74, lon: -104.99, tier: "small", specialty: "commerce", gateway: true, region: "na", via: "in North America", works: false, pro: "Mile-high city at the foot of the Rockies", con: "The mountains to the west", label: "r" },
  { id: "seattle", name: "Seattle", country: "United States", lat: 47.61, lon: -122.33, tier: "small", specialty: "port", gateway: true, region: "na", via: "in North America", works: false, pro: "Pacific Northwest port and the gateway to Alaska", con: "Rain and coastal fog", label: "r" },
  { id: "portland", name: "Portland", country: "United States", lat: 45.52, lon: -122.68, tier: "small", specialty: "port", gateway: true, region: "na", via: "in North America", works: false, pro: "Columbia River port and lumber city", con: "Rain and coastal fog", label: "r" },
  { id: "oklahomacity", name: "Oklahoma City", country: "United States", lat: 35.47, lon: -97.52, tier: "small", specialty: "industrial", gateway: true, region: "na", via: "in North America", works: false, pro: "Oil boom from 1928", con: "Plains storms and tornadoes", label: "r", boom: { year: 1928, tier: "medium" } },
  { id: "lakehurst", name: "Lakehurst", country: "United States", lat: 40.01, lon: -74.31, tier: "small", specialty: "industrial", gateway: true, region: "na", via: "in North America", home: true, works: true, pro: "The Navy's airship station, with America's great hangar", con: "A small town; its traffic is New York's", label: "r" },
  { id: "akron", name: "Akron", country: "United States", lat: 41.08, lon: -81.52, tier: "small", specialty: "industrial", gateway: true, region: "na", via: "in North America", home: true, works: true, pro: "Rubber city, home of the Goodyear airship works", con: "Lake weather", label: "r" },
  // Gateways to the wider world: drawn at the map's edge, but distances, demand, and fares use their real places.
  // Each opens only after a survey flight wins landing rights.
  { id: "newyork", name: "New York", country: "United States", lat: 40.71, lon: -74.0, tier: "major", specialty: "commerce", gateway: true, region: "na", via: "in North America", home: true, works: false, pro: "The greatest city in the Americas: finance, shipping, and the Atlantic trade", con: "Needs landing rights, and the Atlantic to reach it", label: "r" },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", lat: 33.2, lon: -15.6, realLat: -22.91, realLon: -43.17, tier: "major", specialty: "port", gateway: true, via: "by way of the South Atlantic", works: false, pro: "Gateway to South America", con: "Needs a survey flight and long range", label: "l" },
  { id: "bombay", name: "Bombay", country: "British India", lat: 33.3, lon: 40.2, realLat: 19.08, realLon: 72.88, tier: "major", specialty: "port", gateway: true, via: "by way of Baghdad and the Persian Gulf", works: false, pro: "Gateway to India and the East", con: "Needs a survey flight and long range", label: "r" },
  { id: "capetown", name: "Cape Town", country: "South Africa", lat: 25.2, lon: 32.6, realLat: -33.92, realLon: 18.42, tier: "major", specialty: "port", gateway: true, via: "down the length of Africa", works: false, pro: "Gateway to southern Africa", con: "Needs a survey flight and long range", label: "r" },
  { id: "friedrichshafen", name: "Friedrichshafen", country: "Germany", lat: 47.65, lon: 9.48, tier: "small", specialty: "culture", home: true, works: true, pro: "Zeppelin works and calm lake weather", con: "A small town, far in Germany's southern corner", label: "r" },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.40, tier: "major", specialty: "capital", home: true, works: false, pro: "The largest demand in Germany", con: "No airship works", label: "r" },
  { id: "hamburg", name: "Hamburg", country: "Germany", lat: 53.55, lon: 9.99, tier: "large", specialty: "port", home: true, works: false, pro: "Port freight and access to the North Sea", con: "Fog and rough coastal weather", label: "r" },
  { id: "frankfurt", name: "Frankfurt", country: "Germany", lat: 50.11, lon: 8.68, tier: "medium", specialty: "commerce", home: true, works: false, pro: "Central location, trade fairs, and banking", con: "No airship works", label: "r" },

  { id: "cardington", name: "Cardington", country: "United Kingdom", lat: 52.11, lon: -0.42, tier: "small", specialty: "industrial", home: true, works: true, pro: "Government airship works with big sheds", con: "Small; the demand is in London", label: "t" },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.51, lon: -0.13, tier: "major", specialty: "capital", home: true, works: false, pro: "Huge demand", con: "Fog and costly land", label: "b" },
  { id: "glasgow", name: "Glasgow", country: "United Kingdom", lat: 55.86, lon: -4.25, tier: "large", specialty: "industrial", home: true, works: true, pro: "The Beardmore works at Inchinnan, where R34 was built", con: "Far from the rest of Europe", label: "l" },
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
  { id: "dublin", name: "Dublin", country: "Irish Free State", lat: 53.35, lon: -6.26, tier: "medium", specialty: "capital", label: "r" },
  { id: "edinburgh", name: "Edinburgh", country: "United Kingdom", lat: 55.95, lon: -3.19, tier: "medium", specialty: "culture", label: "r" },
  { id: "munich", name: "Munich", country: "Germany", lat: 48.14, lon: 11.58, tier: "large", specialty: "culture", label: "r" },
  { id: "cologne", name: "Cologne", country: "Germany", lat: 50.94, lon: 6.96, tier: "large", specialty: "commerce", label: "r" },
  { id: "gibraltar", name: "Gibraltar", country: "United Kingdom", lat: 36.14, lon: -5.35, tier: "small", specialty: "port", label: "b" },
  { id: "malta", name: "Malta", country: "United Kingdom", lat: 35.90, lon: 14.51, tier: "small", specialty: "port", label: "r" },
  { id: "algiers", name: "Algiers", country: "Algeria", lat: 36.75, lon: 3.06, tier: "medium", specialty: "port", label: "r" },
  { id: "tunis", name: "Tunis", country: "Tunisia", lat: 36.81, lon: 10.18, tier: "medium", specialty: "port", label: "r" },
  { id: "alexandria", name: "Alexandria", country: "Egypt", lat: 31.20, lon: 29.92, tier: "medium", specialty: "port", label: "l" },
  { id: "cairo", name: "Cairo", country: "Egypt", lat: 30.04, lon: 31.24, tier: "large", specialty: "capital", label: "r" },
  { id: "moscow", name: "Moscow", country: "Soviet Union", lat: 55.76, lon: 37.62, tier: "major", specialty: "capital", label: "r" },
  { id: "leningrad", name: "Leningrad", country: "Soviet Union", lat: 59.94, lon: 30.31, tier: "large", specialty: "port", label: "r" },
  { id: "kiev", name: "Kiev", country: "Soviet Union", lat: 50.45, lon: 30.52, tier: "large", specialty: "culture", label: "r" }
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

UpShip.nationOfCountry = { "Germany": "germany", "United Kingdom": "britain", "France": "france", "Italy": "italy", "United States": "usa" };
UpShip.cityById = Object.fromEntries(UpShip.CITIES.map(c => [c.id, c]));
