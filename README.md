# Up, Ship!

A tycoon game about running an airship passenger and cargo line in a golden age of airships where the planners' ambitions came true. You direct the company from 1919 onward: set routes, buy ships, research better technology, and build out the masts and sheds your fleet needs.

## Playing

- **Online:** once GitHub Pages is on for this repository, the game runs at `https://<your-username>.github.io/up_ship/`.
- **Offline:** download the repository (Code → Download ZIP), unzip it, and open `index.html` in a web browser.

Your game saves automatically in the browser.

## Current state: milestone 2

- Map of Europe in about 1924 borders, with the 33 cities of the first region
- Half-day turns from January 1919: press Next turn, or use auto-play at three speeds
- Shipyard with the German 1919 catalog: Seeschwalbe class, Brieftaube class, and Marine conversion
- Draw routes of up to five stops on the map, then assign ships to them
- Passengers and freight between every pair of stops on a route
- Fleet, Routes, and Finances panels; ships can be renamed

## Project layout

- `index.html`: the page
- `css/style.css`: all styling
- `js/data/`: map, city, and ship data
- `js/sim.js`: game clock and economy
- `js/map.js`: map drawing, zoom, and pan
- `js/ui.js`: top bar and detail panels
- `js/main.js`: starts the game and runs the clock
- `tools/assign1924.py` and `tools/build_map.py`: regenerate `js/data/map-europe.js` from Natural Earth data (needs Python with shapely, and mapshaper)

## Credits and license

Map data comes from [Natural Earth](https://www.naturalearthdata.com/) (public domain). The 1924 borders are assembled from Natural Earth's modern province boundaries, so some borders are approximate.

This game is released under the GNU General Public License, version 3. See `LICENSE`.
