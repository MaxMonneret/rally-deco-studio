# Compose un fond (PNG) aligné sur la planche à partir d'un plan .ai/.pdf 5 vues (usage local, non publié)
import pymupdf, sys, json, base64, io
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
d = pymupdf.open(src); p = d[0]; k = 4
pm = p.get_pixmap(matrix=pymupdf.Matrix(k, k)); img = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
W, H = img.size; s = 900 / (p.rect.width)
box = lambda x0, y0, x1, y1: tuple(int(v / s * k) for v in (x0, y0, x1, y1))
views = {'right': box(485, 40, 890, 265), 'left': box(485, 270, 890, 462), 'top': box(20, 60, 195, 455), 'rear': box(240, 60, 445, 250), 'front': box(240, 270, 445, 462)}
L, Hh, Wd, GAP = 3680, 1380, 1600, 200
reg = {'left': (0, 0, L, Hh), 'right': (0, Hh + GAP, L, Hh), 'top': (L + GAP, 0, Wd, L), 'front': (L + GAP, L + GAP, Wd, Hh), 'rear': (L + GAP + Wd + GAP, L + GAP, Wd, Hh)}
tot = (L + GAP + Wd + GAP + Wd, L + GAP + Hh); ppm = 0.25
sheet = Image.new('RGB', (int(tot[0] * ppm), int(tot[1] * ppm)), 'white')
for v, b in views.items():
    c = img.crop(b); a = np.array(c.convert('L')); m = a < 215
    ys, xs = np.where(m)
    # ignorer lignes fines de cotation : colonnes/lignes peu remplies
    cols = np.where(m.sum(0) > 3)[0]; rows = np.where(m.sum(1) > 3)[0]
    x0, x1, y0, y1 = cols.min(), cols.max(), rows.min(), rows.max()
    c = c.crop((x0, y0, x1 + 1, y1 + 1)); rx, ry, rw, rh = reg[v]
    c = c.resize((max(1, int(rw * ppm)), max(1, int(rh * ppm))), Image.LANCZOS)
    sheet.paste(c, (int(rx * ppm), int(ry * ppm)))
buf = io.BytesIO(); sheet.save(buf, 'PNG'); 
sheet.save(out + '.png')
json.dump({'tot': tot, 'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}, open(out + '.json', 'w'))
print(sheet.size)
