# Assign each Natural Earth province to its approximate 1924 country.
import json
from shapely.geometry import shape, mapping, box, Polygon
BOX = box(-30, 26, 52, 72)
RENAME = {
  'Czech Republic': 'Czechoslovakia', 'Slovakia': 'Czechoslovakia',
  'Republic of Serbia': 'Yugoslavia', 'Kosovo': 'Yugoslavia', 'Montenegro': 'Yugoslavia',
  'Bosnia and Herzegovina': 'Yugoslavia', 'Macedonia': 'Yugoslavia', 'Croatia': 'Yugoslavia', 'Slovenia': 'Yugoslavia',
  'Moldova': 'Romania',
  'Russia': 'Soviet Union', 'Belarus': 'Soviet Union', 'Ukraine': 'Soviet Union', 'Georgia': 'Soviet Union',
  'Armenia': 'Soviet Union', 'Azerbaijan': 'Soviet Union', 'Kazakhstan': 'Soviet Union', 'Uzbekistan': 'Soviet Union',
  'Turkmenistan': 'Soviet Union', 'Kyrgyzstan': 'Soviet Union', 'Tajikistan': 'Soviet Union',
  'Ireland': 'Irish Free State', 'Aland': 'Finland', 'Faroe Islands': 'Denmark',
  'Guernsey': 'United Kingdom', 'Jersey': 'United Kingdom', 'Isle of Man': 'United Kingdom', 'Gibraltar': 'United Kingdom',
  'Northern Cyprus': 'Cyprus', 'Israel': 'Palestine', 'Jordan': 'Transjordan', 'Saudi Arabia': 'Arabia',
  'Iran': 'Persia', 'Western Sahara': 'Spanish Sahara', 'Republic of the Congo': 'Congo'
}
PROV = {  # (country, province name) -> 1924 owner
  ('Germany', 'Saarland'): 'Saar',
  ('Poland', 'West Pomeranian'): 'Germany', ('Poland', 'Lubusz'): 'Germany', ('Poland', 'Lower Silesian'): 'Germany',
  ('Poland', 'Opole'): 'Germany', ('Poland', 'Warmian-Masurian'): 'Germany',
  ('Russia', 'Kaliningrad'): 'Germany',
  ('Belarus', 'Brest'): 'Poland', ('Belarus', 'Grodno'): 'Poland',
  ('Ukraine', 'Volyn'): 'Poland', ('Ukraine', 'Rivne'): 'Poland', ('Ukraine', "L'viv"): 'Poland',
  ('Ukraine', "Ternopil'"): 'Poland', ('Ukraine', "Ivano-Frankivs'k"): 'Poland',
  ('Ukraine', 'Transcarpathia'): 'Czechoslovakia', ('Ukraine', 'Chernivtsi'): 'Romania',
  ('Lithuania', 'Vilniaus'): 'Poland',
  ('Bulgaria', 'Dobrich'): 'Romania', ('Bulgaria', 'Silistra'): 'Romania',
  ('Croatia', 'Istarska'): 'Italy',
}
SLOVENE_REGIONS_TO_ITALY = {'Goriška', 'Obalno-kraška', 'Notranjsko-kraška'}
DANZIG = Polygon([(18.35,54.28),(18.47,54.18),(18.72,54.13),(18.95,54.10),(19.22,54.12),(19.42,54.20),(19.60,54.33),
                  (19.65,54.47),(19.20,54.37),(18.80,54.38),(18.62,54.45),(18.55,54.60),(18.42,54.50)])
out = []
for f in json.load(open('ne_10m_admin_1_states_provinces.geojson'))['features']:
    p = f['properties']; g = shape(f['geometry']).buffer(0)
    if not g.intersects(BOX): continue
    a, n = p['admin'], p['name']
    owner = PROV.get((a, n)) or RENAME.get(a, a)
    if a == 'Slovenia' and p.get('region') in SLOVENE_REGIONS_TO_ITALY: owner = 'Italy'
    g = g.intersection(BOX)
    if a == 'Poland' and n == 'Pomeranian':
        dz = g.intersection(DANZIG)
        if not dz.is_empty: out.append({'type': 'Feature', 'properties': {'c': 'Danzig'}, 'geometry': mapping(dz)})
        g = g.difference(DANZIG)
    if g.is_empty: continue
    out.append({'type': 'Feature', 'properties': {'c': owner}, 'geometry': mapping(g)})
json.dump({'type': 'FeatureCollection', 'features': out}, open('prov1924.json', 'w'))
print(len(out), 'features')
