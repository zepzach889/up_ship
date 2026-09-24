# Up, Ship!

A tycoon game about running an airship passenger and cargo line in a golden age of airships where the planners' ambitions came true. You direct the company from 1919 onward: set routes, buy ships, research better technology, and build out the masts and sheds your fleet needs.

## Playing

- **Online:** once GitHub Pages is on for this repository, the game runs at `https://<your-username>.github.io/up_ship/`.
- **Offline:** download the repository (Code → Download ZIP), unzip it, and open `index.html` in a web browser.

Your game saves automatically in the browser.

## Current state: milestone 4b

- New-game setup on the map: country, home city, company name, director, and emblem
- 45 cities from Lisbon to Moscow and down to Cairo, with about 1924 borders
- Half-day turns with auto-play; ships leave when ready rather than on fixed slots
- Ship wear, automatic overhauls with an adjustable threshold, service life, and selling
- Minor incidents such as forced landings and cancelled flights
- Limited stocks of war-surplus ships
- Out-and-back and circuit routes of up to five stops
- Telegram alerts: major ones stop auto-play, minor ones slow it until dismissed
- Ship drawings by role on the map and in the Shipyard
- Company statistics, fleet counts, and a telegram log
- Mail contracts from postal authorities, government route and construction grants, and bank loans
- A tutorial built around the first mail contract, which can be skipped

## Project layout

- `index.html`: the page
- `css/style.css`: all styling
- `js/data/`: map, city, ship, and country data
- `js/emblem.js`: company emblems
- `js/setup.js`: the new-game setup screens
- `js/shipart.js`: the ship drawings
- `js/contracts.js`: mail contracts, grants, and loans
- `js/tutorial.js`: the first-contract tutorial
- `js/sim.js`: game clock and economy
- `js/map.js`: map drawing, zoom, and pan
- `js/ui.js`: top bar and detail panels
- `js/main.js`: starts the game and runs the clock
- `tools/assign1924.py` and `tools/build_map.py`: regenerate `js/data/map-europe.js` from Natural Earth data (needs Python with shapely, and mapshaper)

## Credits and license

Map data comes from [Natural Earth](https://www.naturalearthdata.com/) (public domain). The 1924 borders are assembled from Natural Earth's modern province boundaries, so some borders are approximate.

This game is released under the GNU General Public License, version 3. See `LICENSE`.
