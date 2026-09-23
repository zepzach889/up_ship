# Up, Ship!

A tycoon game about running an airship passenger and cargo line in a golden age of airships where the planners' ambitions came true. You direct the company from 1919 onward: set routes, buy ships, research better technology, and build out the masts and sheds your fleet needs.

## Playing

- **Online:** once GitHub Pages is on for this repository, the game runs at `https://<your-username>.github.io/up_ship/`.
- **Offline:** download the repository (Code → Download ZIP), unzip it, and open `index.html` in a web browser.

Your game saves automatically in the browser.

## Current state: milestone 1

- Map of Europe in about 1924 borders, with the 33 cities of the first region
- Half-day turns from January 1919: press Next turn, or use auto-play at three speeds
- One ship, the *Konstanz* (Seeschwalbe class), flying Friedrichshafen to Berlin
- Basic passenger income and running costs
- Detail panels for cities, the ship, and the route

## Project layout

- `index.html`: the page
- `css/style.css`: all styling
- `js/data/`: map, city, and ship data
- `js/sim.js`: game clock and economy
- `js/map.js`: map drawing, zoom, and pan
- `js/ui.js`: top bar and detail panels
- `js/main.js`: starts the game and runs the clock
- `tools/build_map.py`: regenerates `js/data/map-europe.js` from the source map data

## Credits and license

Historical borders come from the [historical-basemaps](https://github.com/aourednik/historical-basemaps) project (GPL-3.0), adjusted to about 1924. Coastlines and the Irish Free State outline come from [Natural Earth](https://www.naturalearthdata.com/) (public domain), via [world-atlas](https://github.com/topojson/world-atlas).

This game is released under the GNU General Public License, version 3. See `LICENSE`.
