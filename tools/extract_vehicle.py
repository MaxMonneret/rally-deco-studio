# Extrait un gabarit de véhicule (profil, plan, vitres, roues) + un fond aligné à partir d'un plan 5 vues (.ai/.pdf)
# usage : python tools/extract_vehicle.py plan.ai sortie_base
import pymupdf, sys, json, base64, io, numpy as np, cv2
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
k = 4; L = 3680; GAP = 200; ppm = 0.25
p = pymupdf.open(src)[0]; pm = p.get_pixmap(matrix=pymupdf.Matrix(k, k))
img = np.frombuffer(pm.samples, np.uint8).reshape(pm.height, pm.width, 3).copy()
sc = 900 / p.rect.width
box = lambda a: tuple(int(v / sc * k) for v in a)
B = {'right': box((485, 40, 890, 265)), 'left': box((485, 270, 890, 462)), 'top': box((20, 60, 195, 455)), 'rear': box((240, 60, 445, 250)), 'front': box((240, 270, 445, 462))}
crop = lambda n: img[B[n][1]:B[n][3], B[n][0]:B[n][2]].copy()
def bodymask(c, kern):
    m = (c.min(2) < 235).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((kern, kern), np.uint8))
def bbox(m):
    ys, xs = np.where(m); return xs.min(), xs.max(), ys.min(), ys.max()
def dp(pts, eps):
    a = np.array(pts, np.float32).reshape(-1, 1, 2); return cv2.approxPolyDP(a, eps, False).reshape(-1, 2).tolist()
def glass(c, m):
    r, g, b = [c[..., i].astype(int) for i in range(3)]
    gm = ((abs(r - g) < 9) & (abs(g - b) < 9) & (r > 190) & (r < 228)).astype(np.uint8)
    gm = cv2.morphologyEx(gm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(gm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); return cs
# --- côté gauche (avant à gauche)
c = crop('left'); m = bodymask(c, 15); x0, x1, y0, y1 = bbox(m); s = L / (x1 - x0 + 1)   # mm / px
H = round((y1 - y0 + 1) * s)
top = []
for x in range(x0, x1 + 1, max(1, int(40 / s))):
    ys = np.where(m[:, x])[0]
    if len(ys): top.append([(x - x0) * s, (y1 - ys.min()) * s])
top = [[round(a), round(b)] for a, b in dp(top, 6 / s * s)]
top[0][0] = 0; top[-1][0] = L
row = m[y1 - 3, :]; runs = []; st = None
for x in range(len(row)):
    if row[x] and st is None: st = x
    if (not row[x] or x == len(row) - 1) and st is not None: runs.append((st, x)); st = None
runs = sorted(runs, key=lambda r: r[1] - r[0], reverse=True)[:2]; runs.sort()
wheels = [{'x': round(((a + b) / 2 - x0) * s), 'r': 290} for a, b in runs]
gl = []
for cn in glass(c, m):
    if cv2.contourArea(cn) < 2500: continue
    ap = cv2.approxPolyDP(cn, 4, True).reshape(-1, 2)
    gl.append([[round((px - x0) * s), round((y1 - py) * s)] for px, py in ap])
gl.sort(key=lambda g: min(p[0] for p in g))
# --- dessus (avant en bas dans le plan -> rotation 180°)
ct = cv2.rotate(crop('top'), cv2.ROTATE_180); mt = bodymask(ct, max(3, int(200 / s))); tx0, tx1, ty0, ty1 = bbox(mt)
Lt = (ty1 - ty0 + 1) * s
plan = []; ws = []; widths = []
for y in range(ty0, ty1 + 1, max(1, int(60 / s))):
    xs = np.where(mt[y])[0]
    if len(xs): widths.append(((y - ty0) * s, (xs.max() - xs.min() + 1) * s / 2, (xs.max() + xs.min()) / 2))
W = round(2 * max(w for _, w, _ in widths)); cx0 = np.median([c for *_, c in widths])
plan = [[round(a), round(b)] for a, b in dp([[a, b] for a, b, _ in widths], 8)]
plan[0][0] = 0; plan[-1][0] = L
cg = glass(ct, mt); big = []
for cn in cg:
    xx, yy, ww, hh = cv2.boundingRect(cn)
    if ww * s > 0.5 * W * 0.8 and cv2.contourArea(cn) > 3000: big.append(((yy - ty0) * s, (yy + hh - ty0) * s))
big.sort(); 
ws = [round(big[0][0]), round(big[0][1])] if big else [1000, 1700]; rg = [round(big[-1][0]), round(big[-1][1])] if len(big) > 1 else [2850, 3320]
veh = {'name': 'Peugeot 106 S16 (d\'après plan)', 'L': L, 'H': H, 'W': W, 'smooth': 1, 'clear': 190, 'frontBot': 330, 'rearBot': 380, 'top': top, 'plan': plan, 'wheels': wheels, 'glass': gl, 'ws': ws, 'rg': rg, 'belt': 830, 'hood': 640, 'door': [1100, 2080, 3000]}
json.dump(veh, open(out + '_vehicle.json', 'w'))
print('H', H, 'W', W, 'Lt', round(Lt), 'wheels', wheels, 'ws', ws, 'rg', rg, 'glass', len(gl), 'top pts', len(top), 'plan pts', len(plan))
# --- fond composite aligné sur la planche
reg = {'left': (0, 0), 'right': (0, H + GAP), 'top': (L + GAP, 0), 'front': (L + GAP, L + GAP), 'rear': (L + GAP + W + GAP, L + GAP)}
tot = (L + GAP + W + GAP + W, L + GAP + H)
sheet = Image.new('RGB', (int(tot[0] * ppm), int(tot[1] * ppm)), 'white')
def put(name, arr, anchor, mask=None):
    a = Image.fromarray(arr); f = s * ppm
    a = a.resize((max(1, int(a.width * f)), max(1, int(a.height * f))), Image.LANCZOS); sheet.paste(a, (int(anchor[0] * ppm) - 0, int(anchor[1] * ppm)))
for n in ('left', 'right'):
    cc = crop(n); mm = bodymask(cc, 15); a0, a1, b0, b1 = bbox(mm); put(n, cc[b0:b1 + 1, a0:a1 + 1], reg[n])
put('top', ct[ty0:ty1 + 1, tx0:tx1 + 1], (reg['top'][0] + W / 2 - (tx1 - tx0 + 1) * s / 2, 0))
for n in ('front', 'rear'):
    cc = crop(n); mm = bodymask(cc, 15); a0, a1, b0, b1 = bbox(mm)
    put(n, cc[b0:b1 + 1, a0:a1 + 1], (reg[n][0] + W / 2 - (a1 - a0 + 1) * s / 2, reg[n][1] + H - (b1 - b0 + 1) * s))
buf = io.BytesIO(); sheet.save(buf, 'PNG'); sheet.save(out + '.png')
json.dump({'tot': tot, 'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}, open(out + '.json', 'w'))
