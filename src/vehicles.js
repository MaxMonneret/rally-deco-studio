/* ===== vehicles.js : gabarits de véhicules (mm) ===== */
'use strict';
/*
  Convention : toutes les vues sont "à plat" dans la planche (mm, y vers le bas).
  - gauche : côté gauche du véhicule, avant orienté à GAUCHE   (x : avant 0 -> arrière L)
  - droite : côté droit, avant orienté à DROITE                (x : arrière 0 -> avant L)
  - dessus : avant en HAUT                                     (x : gauche 0 -> droite W, y : avant 0 -> arrière L)
  - face   : vue de face (le côté droit du véhicule est à gauche de l'image)
  - arrière: vue arrière (le côté gauche du véhicule est à gauche de l'image)
  Les profils sont donnés en (x depuis l'avant, hauteur y depuis le sol).
*/
const VEHICLES = {
  hatch: {
    name: 'Citadine rallye (type 106 / Saxo)', L: 3680, H: 1380, W: 1600, smooth: 2, clear: 190, frontBot: 330, rearBot: 380,
    top: [[0, 500], [120, 600], [450, 660], [1050, 730], [1800, 1320], [2000, 1380], [2800, 1370], [3300, 1010], [3560, 870], [3680, 830]],
    plan: [[0, 640], [60, 720], [200, 780], [500, 795], [3200, 795], [3500, 775], [3620, 720], [3680, 650]],
    wheels: [{ x: 640, r: 290 }, { x: 3025, r: 290 }],
    glass: [[[1160, 830], [1790, 1290], [2060, 1330], [2060, 830]], [[2110, 830], [2110, 1330], [2760, 1320], [3180, 1000], [3260, 830]]],
    ws: [1060, 1800], rg: [2850, 3320], belt: 830, hood: 640, door: [1100, 2080, 3000]
  },
  wrc: {
    name: 'Rallye WRC / Rally2 (hatch large)', L: 4000, H: 1450, W: 1880, smooth: 2, clear: 140, frontBot: 280, rearBot: 300,
    top: [[0, 470], [130, 640], [500, 730], [1150, 790], [1850, 1330], [2150, 1440], [2900, 1430], [3400, 1130], [3850, 1050], [4000, 1030]],
    plan: [[0, 740], [60, 840], [200, 920], [500, 940], [3500, 940], [3800, 910], [3940, 850], [4000, 760]],
    wheels: [{ x: 680, r: 330 }, { x: 3230, r: 330 }],
    glass: [[[1260, 870], [1880, 1290], [2200, 1395], [2200, 870]], [[2260, 870], [2260, 1395], [2900, 1385], [3350, 1120], [3480, 870]]],
    ws: [1150, 1850], rg: [2900, 3500], belt: 870, hood: 780, door: [1200, 2230, 3300]
  },
  suv: {
    name: 'Pick-up / 4x4 raid', L: 5300, H: 1800, W: 1900, smooth: 1, clear: 260, frontBot: 420, rearBot: 480,
    top: [[0, 800], [100, 1020], [600, 1080], [1300, 1100], [1900, 1700], [2150, 1800], [2800, 1790], [2900, 1340], [5300, 1330]],
    plan: [[0, 780], [80, 900], [250, 940], [600, 950], [4900, 950], [5200, 930], [5300, 850]],
    wheels: [{ x: 900, r: 410 }, { x: 4200, r: 410 }],
    glass: [[[1380, 1180], [1950, 1730], [2250, 1770], [2250, 1180]], [[2300, 1180], [2300, 1770], [2770, 1760], [2840, 1180]]],
    ws: [1300, 1950], rg: [2780, 2890], belt: 1180, hood: 1100, door: [1300, 2280, 2850]
  },
  van: {
    name: 'Utilitaire / fourgon', L: 5400, H: 2150, W: 2000, smooth: 1, clear: 230, frontBot: 380, rearBot: 450,
    top: [[0, 700], [100, 900], [600, 1020], [1200, 1120], [1750, 1900], [2000, 2150], [5300, 2150], [5400, 2100]],
    plan: [[0, 830], [100, 930], [300, 980], [800, 990], [5100, 990], [5350, 970], [5400, 920]],
    wheels: [{ x: 1000, r: 340 }, { x: 4400, r: 340 }],
    glass: [[[1500, 1230], [1900, 1850], [2300, 1930], [2300, 1230]]],
    ws: [1200, 1950], rg: [5390, 5399], belt: 1230, hood: 1120, door: [1400, 2350, 3900]
  },
  truck: {
    name: 'Camion porteur 7,5 t', L: 8000, H: 3500, W: 2550, smooth: 0, clear: 450, frontBot: 500, rearBot: 560,
    top: [[0, 2850], [70, 3060], [220, 3150], [2250, 3150], [2300, 3150], [2300, 3500], [8000, 3500]],
    plan: [[0, 1150], [2299, 1150], [2300, 1275], [8000, 1275]],
    wheels: [{ x: 1300, r: 520 }, { x: 6600, r: 520 }],
    glass: [[[350, 1900], [1750, 1900], [1750, 2800], [450, 2800]]],
    ws: [20, 220], rg: [7990, 7999], belt: 1900, hood: 2850, door: [300, 1800, 2300]
  }
};

const GAP = 200;
function sheetLayout(v) {
  const { L, H, W } = v;
  const R = {
    left:  { x: 0, y: 0, w: L, h: H },
    right: { x: 0, y: H + GAP, w: L, h: H },
    top:   { x: L + GAP, y: 0, w: W, h: L },
    front: { x: L + GAP, y: L + GAP, w: W, h: H },
    rear:  { x: L + GAP + W + GAP, y: L + GAP, w: W, h: H }
  };
  let x1 = 0, y1 = 0; for (const k in R) { x1 = Math.max(x1, R[k].x + R[k].w); y1 = Math.max(y1, R[k].y + R[k].h); }
  R.total = { x: 0, y: 0, w: x1, h: y1 };
  return R;
}
const VIEW_NAMES = { left: 'Côté gauche', right: 'Côté droit', top: 'Dessus', front: 'Face avant', rear: 'Face arrière' };

/* interpolation linéaire d'une table [[x,y]] (les x identiques créent une marche) */
function interp(tab, x) {
  const n = tab.length;
  if (x <= tab[0][0]) return tab[0][1];
  if (x >= tab[n - 1][0]) return tab[n - 1][1];
  let best = tab[0][1];
  for (let i = 0; i < n - 1; i++) {
    const a = tab[i], b = tab[i + 1];
    if (x >= a[0] && x <= b[0]) { if (b[0] === a[0]) { best = b[1]; continue; } return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
  }
  return best;
}

/** profil supérieur lissé (liste de points x avant->arrière, y hauteur) */
function topPoly(v) {
  let pts = v.top.map(p => p.slice());
  if (v.smooth) {
    // Chaikin en gardant extrémités + marches
    const first = pts[0], last = pts[pts.length - 1];
    let mid = G.chaikin(pts, v.smooth, false);
    pts = mid;
  }
  return pts;
}
function bottomY(v, x) {
  const e = 140;
  if (x < e) return v.frontBot + (v.clear - v.frontBot) * (x / e);
  if (x > v.L - e) return v.rearBot + (v.clear - v.rearBot) * ((v.L - x) / e);
  return v.clear;
}
function halfWidth(v, x) { return interp(v.plan, x); }
function topY(v, x) {
  if (!v._tp) v._tp = topPoly(v);
  return interp(v._tp, x);
}

/** géométrie détaillée de chaque vue, en coordonnées locales (origine coin haut-gauche de la vue) */
function viewGeom(v, view) {
  if (!v._vg) v._vg = {};
  if (v._vg[view]) return v._vg[view];
  const { L, H, W } = v; const g = { body: [], glass: [], dark: [], light: [], wheels: [], lines: [] };
  const flipX = view === 'right';
  const fx = x => flipX ? L - x : x;
  if (view === 'left' || view === 'right') {
    const tp = v._tp || (v._tp = topPoly(v));
    const body = tp.map(p => [fx(p[0]), H - p[1]]);
    const last = tp[tp.length - 1], first = tp[0];
    body.push([fx(L), H - v.rearBot]);
    body.push([fx(L - 140), H - v.clear]);
    body.push([fx(140), H - v.clear]);
    body.push([fx(0), H - v.frontBot]);
    g.body = [body];
    g.glass = v.glass.map(poly => poly.map(p => [fx(p[0]), H - p[1]]));
    for (const w of v.wheels) {
      g.wheels.push({ cx: fx(w.x), cy: H - w.r, r: w.r, arch: w.r + 35 });
    }
    // lignes de portes
    v.door.forEach((x, i) => g.lines.push([[fx(x), H - v.belt + 20], [fx(x), H - v.clear - 60]]));
    // bas de caisse
    g.lines.push([[fx(v.wheels[0].x + v.wheels[0].r + 60), H - v.clear - 60], [fx(v.wheels[1].x - v.wheels[1].r - 60), H - v.clear - 60]]);
    // rétroviseur
    const mx = v.ws[1] > 200 ? v.ws[0] + (v.ws[1] - v.ws[0]) * 0.1 : 200;
    g.dark.push(G.roundRect(fx(mx) - 70, H - v.belt - 90, 140, 90, 25));
    g.mirrorPos = fx(mx);
  } else if (view === 'top') {
    const left = [], right = [];
    const N = 120; const xs = [];
    for (let i = 0; i <= N; i++) xs.push(L * i / N);
    v.plan.forEach(p => { xs.push(p[0] - 0.01, p[0] + 0.01); });
    xs.sort((a, b) => a - b);
    for (const x of xs) { const xx = Math.max(0, Math.min(L, x)); const hw = halfWidth(v, xx); left.push([W / 2 - hw, xx]); right.push([W / 2 + hw, xx]); }
    g.body = [left.concat(right.reverse())];
    const hwAt = x => halfWidth(v, x);
    const ws0 = v.ws[0], ws1 = v.ws[1];
    if (ws1 - ws0 > 100) {
      const a = hwAt(ws0) * 0.84, b = hwAt(ws1) * 0.72;
      g.glass.push([[W / 2 - a, ws0], [W / 2 + a, ws0], [W / 2 + b, ws1], [W / 2 - b, ws1]]);
    }
    const r0 = v.rg[0], r1 = v.rg[1];
    if (r1 - r0 > 100) { const a = hwAt(r0) * 0.7, b = hwAt(r1) * 0.62; g.glass.push([[W / 2 - a, r0], [W / 2 + a, r0], [W / 2 + b, r1], [W / 2 - b, r1]]); }
    // rétros
    const mx = ws0 + (ws1 - ws0) * 0.12 + 80, hw = hwAt(mx);
    g.dark.push(G.roundRect(W / 2 - hw - 120, mx - 55, 130, 110, 30), G.roundRect(W / 2 + hw - 10, mx - 55, 130, 110, 30));
    // roues dépassantes
    for (const w of v.wheels) { const hwx = hwAt(w.x); g.dark.push(G.rect(W / 2 - hwx - 10, w.x - w.r * 0.5, 90, w.r), G.rect(W / 2 + hwx - 80, w.x - w.r * 0.5, 90, w.r)); }
    g.lines.push([[W / 2, ws1], [W / 2, r0]]);
  } else { // front / rear
    const front = view === 'front';
    const hwMax = Math.max(...v.plan.map(p => p[1]));
    const xe = front ? 0 : L; const hwE = halfWidth(v, front ? 1 : L - 1);
    const yTop0 = front ? v.top[0][1] : v.top[v.top.length - 1][1];
    const tireW = Math.min(280, hwMax * 0.2);
    const cabHalf = v.truck ? hwMax : hwMax * 0.9;
    const bodyB = v.clear - 40, yB = H - (front ? v.frontBot : v.rearBot) + 0;
    const rb = G.roundRect(W / 2 - hwE, H - yTop0, hwE * 2, yTop0 - (front ? v.frontBot : v.rearBot) + 90, 60);
    const belt = v.belt, hood = front ? v.hood : v.top[v.top.length - 1][1];
    let cab;
    if (v.id === 'truck') {
      const cw = hwMax;
      cab = G.roundRect(W / 2 - cw, H - 3150, cw * 2, 3150 - v.clear + 40, 50);
      if (!front) cab = G.roundRect(W / 2 - hwMax, H - v.H, hwMax * 2, v.H - v.clear + 40, 40);
    } else {
      // habitacle
      const bw = hwMax * (front ? 0.95 : 0.93), tw = hwMax * (front ? 0.74 : 0.7);
      const base = front ? hood : v.belt; const rf = v.H - 10;
      cab = [[W / 2 - bw, H - base], [W / 2 - tw, H - rf], [W / 2 + tw, H - rf], [W / 2 + bw, H - base]];
      cab = G.chaikin(cab, 2);
    }
    const lower = G.roundRect(W / 2 - hwMax, H - Math.max(hood, v.belt - 100), hwMax * 2, Math.max(hood, v.belt - 100) - v.clear + 50, 70);
    g.body = G.union([lower, cab, rb]);
    g.mirrorsFV = true;
    // vitre
    if (v.id === 'truck') {
      if (front) g.glass.push(G.roundRect(W / 2 - hwMax + 120, H - 2850, (hwMax - 120) * 2, 1100, 40));
    } else {
      const base = front ? hood : v.belt, rf = v.H - 60; const bw = hwMax * 0.86, tw = hwMax * 0.68;
      g.glass.push(G.chaikin([[W / 2 - bw, H - base - 30], [W / 2 - tw, H - rf], [W / 2 + tw, H - rf], [W / 2 + bw, H - base - 30]], 2));
    }
    // feux / calandre
    const ly = H - (front ? Math.max(hood - 90, 500) : Math.max(hood - 120, 500));
    const lw = hwMax * 0.34;
    const lights = [G.roundRect(W / 2 - hwMax + 70, ly - 40, lw, 110, 30), G.roundRect(W / 2 + hwMax - 70 - lw, ly - 40, lw, 110, 30)];
    g.dark.push(...lights);
    if (front) {
      g.dark.push(G.roundRect(W / 2 - hwMax * 0.30, ly + 20, hwMax * 0.6, 110, 20)); // calandre
      g.dark.push(G.roundRect(W / 2 - hwMax * 0.78, H - v.frontBot - 10 + 40, hwMax * 1.56, 70, 20)); // prise d'air
    }
    g.light.push(G.roundRect(W / 2 - 260, H - v.frontBot - 10 + (front ? 150 : 100), 520, 110, 10)); // plaque
    // roues
    for (const s of [-1, 1]) {
      const r = v.wheels[0].r; g.dark.push(G.roundRect(W / 2 + s * (hwMax - tireW * 0.45) - tireW / 2, H - 2 * r, tireW, 2 * r - 20, 40));
    }
    // rétros
    for (const s of [-1, 1]) g.dark.push(G.roundRect(W / 2 + s * (hwMax + 90) - 80, H - belt - 80, 160, 100, 30));
    g.body = g.body.map(r => r);
    // garde-boue : enveloppe totale pour le clip = body + roues
  }
  v._vg[view] = g;
  return g;
}

/** Silhouette de clip : carrosserie moins passages de roues (vues latérales) */
function clipRings(v, view, glass) {
  const g = viewGeom(v, view);
  let b = G.union(g.body);
  if (view === 'left' || view === 'right') {
    const holes = g.wheels.map(w => G.circle(w.cx, w.cy, w.arch, 64));
    b = G.diff(b, G.union(holes));
  }
  if (glass === false) b = G.diff(b, G.union(g.glass));
  return b;
}

function getVehicle(id) {
  const v = VEHICLES[id]; v.id = id; return v;
}
