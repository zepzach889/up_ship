# Builds js/data/world.js for the globe: the game's own 1920s Europe (from map-europe.js, run back through its
# projection into latitude and longitude) plus the rest of the world from Natural Earth, regrouped into 1920s
# territories, with Europe's area cut out so the two meet cleanly; and the large natural lakes.
# Inputs: Natural Earth 50m countries and lakes GeoJSON (pass their paths). Usage: python3 build_globe.py countries.geojson lakes.geojson
import json, math, re, sys
from shapely.geometry import shape, mapping, box, Polygon, MultiPolygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
NE, LAKES = sys.argv[1], sys.argv[2]
src = open('js/data/map-europe.js').read(); M = json.loads(src[src.index('{'):src.rindex('}') + 1])
P = M['projection']; rad = math.pi / 180
def inv(x, y):
    X = x / P['scale'] + P['x0']; Y = P['y1'] - y / P['scale']; rho = math.hypot(X, Y)
    if rho < 1e-12: return (P['lon0'], P['lat0'])
    c = 2 * math.asin(min(1, rho / 2)); p1 = P['lat0'] * rad
    lat = math.asin(math.cos(c) * math.sin(p1) + Y * math.sin(c) * math.cos(p1) / rho)
    lon = P['lon0'] * rad + math.atan2(X * math.sin(c), rho * math.cos(p1) * math.cos(c) - Y * math.sin(p1) * math.sin(c))
    return (lon / rad, lat / rad)
def rings(path):
    out = []
    for part in re.split(r'[MZ]', path):
        pts = [tuple(map(float, xy.split(','))) for xy in part.replace('L', ' ').split()]
        if len(pts) > 2: out.append([inv(x, y) for x, y in pts])
    return out
def to_poly(rs):
    polys = [Polygon(r).buffer(0) for r in rs]
    return unary_union([p for p in polys if not p.is_empty])
rnd = lambda o: round(o, 3) if isinstance(o, float) else [rnd(x) for x in o] if isinstance(o, (list, tuple)) else {k: rnd(v) for k, v in o.items()} if isinstance(o, dict) else o
def geo(g, tol):
    s = g.simplify(tol, preserve_topology=True) if tol else g
    ps = [s] if isinstance(s, Polygon) else [p for p in getattr(s, 'geoms', []) if isinstance(p, Polygon)]
    ps = [orient(p, sign=-1.0) for p in ps if p.area > (tol or 0.0001) ** 2]
    return rnd(mapping(MultiPolygon(ps))) if ps else None
# The game's Europe, exactly as drawn now.
europe = []
for c in M['countries']:
    g = to_poly(rings(c['path']))
    if g.is_empty: continue
    europe.append({"n": c['name'], "tint": c['tint'], "g": g})
eu_land = unary_union([e['g'] for e in europe]).buffer(0.01)
EU_TINT = {e['n']: e['tint'] for e in europe}
# The rest of the world: Natural Earth, regrouped into 1920s territories, with Europe's area removed.
ne = json.load(open(NE)); code = lambda f: f['properties'].get('ADM0_A3') or f['properties'].get('ISO_A3')
geoms = {}
for f in ne['features']: geoms.setdefault(code(f), []).append(shape(f['geometry']))
geoms = {k: unary_union(v) for k, v in geoms.items()}
E = [("Soviet Union", "RUS UKR BLR KAZ UZB TKM KGZ TJK GEO ARM AZE", "ussr"), ("British India", "IND PAK BGD MMR", "british"), ("French Indochina", "VNM LAO KHM", "french"),
 ("Dutch East Indies", "IDN", "dutch"), ("French West Africa", "SEN MLI MRT GIN CIV BFA NER BEN", "french"), ("French Equatorial Africa", "GAB COG CAF TCD", "french"),
 ("Belgian Congo", "COD", "belgian"), ("Anglo-Egyptian Sudan", "SDN SSD", "british"), ("Italian East Africa", "ERI SOM", "italian"), ("Japanese Empire", "JPN KOR PRK TWN", "japanese"),
 ("Rhodesia and Nyasaland", "ZMB ZWE MWI", "british"), ("British East Africa", "KEN UGA TZA", "british"), ("Union of South Africa", "ZAF NAM", "british"), ("British Malaya", "MYS SGP BRN", "british"),
 ("Australia", "AUS", "british"), ("Canada", "CAN", "british"), ("New Zealand", "NZL", "british"), ("Nigeria", "NGA", "british"), ("Gold Coast", "GHA", "british"), ("Angola", "AGO", "portuguese"),
 ("Mozambique", "MOZ", "portuguese"), ("Philippines", "PHL", "usa"), ("United States", "USA", "usa"), ("China", "CHN", "other"), ("Mongolia", "MNG", "other"), ("Brazil", "BRA", "other")]
used = set(); ents = []
for name, codes, power in E:
    gs = [geoms[c] for c in codes.split() if c in geoms]; used.update(codes.split())
    if gs: ents.append((name, unary_union(gs), power))
for c, g in geoms.items():
    if c not in used: ents.append((next((f['properties']['NAME'] for f in ne['features'] if code(f) == c), c), g, "other"))
POWER_TINT = {"british": 0, "french": 3, "italian": 1, "dutch": 2, "belgian": 5, "portuguese": 4, "spanish": 2, "japanese": 0, "usa": 1, "ussr": EU_TINT.get("Soviet Union", 0)}
world = []
for i, (name, g, power) in enumerate(ents):
    g = g.difference(eu_land)
    if g.is_empty or g.area < 0.02: continue
    tint = EU_TINT.get(name, POWER_TINT.get(power, i % 6))
    world.append({"n": name, "tint": tint, "a": round(g.area, 1), "l": rnd(list(g.representative_point().coords[0])), "c": geo(g, 0.4), "f": geo(g, 0.04)})
lakes = []
for f in json.load(open(LAKES))['features']:
    p = f['properties']; g = shape(f['geometry'])
    if g.area < 0.6 or 'eservoir' in (p.get('featurecla') or '') or 'eservoir' in (p.get('name') or ''): continue
    lakes.append(geo(g, 0.04))
out = {"europe": [{"n": e['n'], "tint": e['tint'], "a": round(e['g'].area, 1), "l": rnd(list(e['g'].representative_point().coords[0])), "f": geo(e['g'], 0.01), "c": geo(e['g'], 0.15)} for e in europe], "world": world, "lakes": [l for l in lakes if l]}
open('js/data/world.js', 'w').write("// Generated by tools/build_globe.py: the globe's territories (Europe as the game draws it, the rest from Natural Earth) and large lakes.\nwindow.UPSHIP_WORLD = " + json.dumps(out, separators=(',', ':')) + ";\n")
print(len(out['europe']), "European countries,", len(world), "other territories,", len(out['lakes']), "lakes |", round(len(open('js/data/world.js').read()) / 1e6, 2), "MB")
