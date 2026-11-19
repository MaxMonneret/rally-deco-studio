/* ===== geom.js : géométrie vectorielle (anneaux de points en mm) + Clipper ===== */
'use strict';
const CL = ClipperLib;
const SC = 1000; // 1 mm = 1000 unités Clipper

const G = {
  toC: r => r.map(ring => ring.map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }))),
  fromC: ps => ps.map(ring => ring.map(p => [p.X / SC, p.Y / SC])),

  boolean(a, b, type, fa = CL.PolyFillType.pftNonZero, fb = CL.PolyFillType.pftNonZero) {
    const c = new CL.Clipper();
    c.AddPaths(G.toC(a), CL.PolyType.ptSubject, true);
    if (b && b.length) c.AddPaths(G.toC(b), CL.PolyType.ptClip, true);
    const out = new CL.Paths();
    c.Execute(type, out, fa, fb);
    return G.fromC(out);
  },
  union(a, evenodd) { return G.boolean(a, [], CL.ClipType.ctUnion, evenodd ? CL.PolyFillType.pftEvenOdd : CL.PolyFillType.pftNonZero); },
  inter(a, b) { return G.boolean(a, b, CL.ClipType.ctIntersection); },
  diff(a, b) { return b && b.length ? G.boolean(a, b, CL.ClipType.ctDifference) : a; },
  offset(rings, d, join = 'round', miter = 3) {
    if (!rings.length) return [];
    const co = new CL.ClipperOffset(miter, 0.1 * SC);
    co.AddPaths(G.toC(rings), join === 'round' ? CL.JoinType.jtRound : CL.JoinType.jtMiter, CL.EndType.etClosedPolygon);
    const out = new CL.Paths();
    co.Execute(out, d * SC);
    return G.fromC(out);
  },
  area(rings) { // surface nette en mm² (union préalable conseillée)
    let a = 0; for (const r of G.toC(rings)) a += CL.Clipper.Area(r);
    return Math.abs(a) / (SC * SC);
  },
  perimeter(rings) {
    let L = 0;
    for (const r of rings) for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; L += Math.hypot(q[0] - p[0], q[1] - p[1]); }
    return L;
  },
  bbox(rings) {
    let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
    for (const r of rings) for (const p of r) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return x0 > x1 ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  },
  /** normalise : union (nonzero ou pair-impair), retire les micro-anneaux */
  clean(rings, evenodd) {
    let r = G.union(rings, evenodd);
    return r.filter(x => x.length >= 3 && Math.abs(CL.Clipper.Area(G.toC([x])[0])) > 4 * SC * SC * 0.0001);
  },
  /** applique une transformation affine [a,b,c,d,e,f] */
  xf(rings, m) { return rings.map(r => r.map(p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]])); },
  /** déplace le centre de la bbox en (0,0) ; renvoie {rings,w,h} */
  center(rings) {
    const b = G.bbox(rings); if (!b) return { rings: [], w: 1, h: 1 };
    return { rings: G.xf(rings, [1, 0, 0, 1, -b.cx, -b.cy]), w: Math.max(b.w, 0.01), h: Math.max(b.h, 0.01) };
  },
  rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; },
  circle(cx, cy, r, n) {
    n = n || Math.max(16, Math.min(96, Math.ceil(r / 2)));
    const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return o;
  },
  ellipse(cx, cy, rx, ry, n) {
    n = n || Math.max(20, Math.min(120, Math.ceil(Math.max(rx, ry) / 2)));
    const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
  },
  roundRect(x, y, w, h, r, n = 8) {
    r = Math.min(r, w / 2, h / 2); const o = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
    return o;
  },
  poly(cx, cy, r, n, rot = -Math.PI / 2) { const o = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; },
  star(cx, cy, r1, r2, n, rot = -Math.PI / 2) { const o = []; for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; },
  /** lissage de Chaikin sur un anneau fermé */
  chaikin(r, it = 1, closed = true) {
    for (let k = 0; k < it; k++) {
      const o = []; const n = r.length;
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const p = r[i], q = r[(i + 1) % n];
        o.push([.75 * p[0] + .25 * q[0], .75 * p[1] + .25 * q[1]], [.25 * p[0] + .75 * q[0], .25 * p[1] + .75 * q[1]]);
      }
      if (!closed) { o.unshift(r[0]); o.push(r[n - 1]); }
      r = o;
    }
    return r;
  },
  /** simplification Douglas-Peucker (ligne ouverte) */
  dp(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); let md = 0, mi = -1;
      const A = pts[a], B = pts[b], dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy;
      for (let i = a + 1; i < b; i++) {
        const P = pts[i]; let d;
        if (l2 === 0) d = Math.hypot(P[0] - A[0], P[1] - A[1]);
        else d = Math.abs((P[0] - A[0]) * dy - (P[1] - A[1]) * dx) / Math.sqrt(l2);
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
};

/* ---------- Mulberry32 : aléatoire reproductible ---------- */
function rng(seed) {
  let a = (seed >>> 0) || 1;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  return f;
}

/* ---------- Courbes -> polylignes ---------- */
function bez3(p0, p1, p2, p3, n, out) {
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
              u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
}
function bez2(p0, p1, p2, n, out) {
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
}
function arcToPts(x1, y1, rx, ry, phi, fa, fs, x2, y2, out) {
  if (rx === 0 || ry === 0) { out.push([x2, y2]); return; }
  rx = Math.abs(rx); ry = Math.abs(ry);
  const cp = Math.cos(phi * Math.PI / 180), sp = Math.sin(phi * Math.PI / 180);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  let lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den)); if (fa === fs) co = -co;
  const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI; else if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(6, Math.ceil(Math.abs(dth) / (Math.PI / 24)));
  for (let i = 1; i <= n; i++) {
    const a = th1 + dth * i / n, ca = Math.cos(a), sa = Math.sin(a);
    out.push([cp * rx * ca - sp * ry * sa + cx, sp * rx * ca + cp * ry * sa + cy]);
  }
}

/** Parse un attribut SVG "d" -> anneaux (unités source). */
function parsePathD(d, n3 = 18) {
  const re = /([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
  const tok = []; let m;
  while ((m = re.exec(d))) tok.push(m[1] ? m[1] : parseFloat(m[2]));
  const rings = []; let cur = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const num = () => tok[i++];
  const flag = () => { const v = tok[i++]; return v ? 1 : 0; };
  const close = () => { if (cur && cur.length > 2) rings.push(cur); cur = null; };
  while (i < tok.length) {
    if (typeof tok[i] === 'string') cmd = tok[i++];
    else if (cmd === 'M') cmd = 'L'; else if (cmd === 'm') cmd = 'l';
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { if (cur) { x = sx; y = sy; } close(); lc = lq = null; continue; }
    if (C === 'M') { close(); x = ox + num(); y = oy + num(); sx = x; sy = y; cur = [[x, y]]; lc = lq = null; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); (cur || (cur = [[sx, sy]])).push([x, y]); lc = lq = null; }
    else if (C === 'H') { x = (rel ? x : 0) + num(); (cur || (cur = [[sx, sy]])).push([x, y]); lc = lq = null; }
    else if (C === 'V') { y = (rel ? y : 0) + num(); (cur || (cur = [[sx, sy]])).push([x, y]); lc = lq = null; }
    else if (C === 'C') {
      const a = [ox + num(), oy + num()], b = [ox + num(), oy + num()], e = [ox + num(), oy + num()];
      bez3([x, y], a, b, e, n3, cur || (cur = [[x, y]])); lc = b; lq = null; x = e[0]; y = e[1];
    } else if (C === 'S') {
      const a = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y], b = [ox + num(), oy + num()], e = [ox + num(), oy + num()];
      bez3([x, y], a, b, e, n3, cur || (cur = [[x, y]])); lc = b; lq = null; x = e[0]; y = e[1];
    } else if (C === 'Q') {
      const a = [ox + num(), oy + num()], e = [ox + num(), oy + num()];
      bez2([x, y], a, e, 12, cur || (cur = [[x, y]])); lq = a; lc = null; x = e[0]; y = e[1];
    } else if (C === 'T') {
      const a = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y], e = [ox + num(), oy + num()];
      bez2([x, y], a, e, 12, cur || (cur = [[x, y]])); lq = a; lc = null; x = e[0]; y = e[1];
    } else if (C === 'A') {
      const rx = num(), ry = num(), ph = num(), fa = flag(), fs = flag(), ex = ox + num(), ey = oy + num();
      arcToPts(x, y, rx, ry, ph, fa, fs, ex, ey, cur || (cur = [[x, y]])); x = ex; y = ey; lc = lq = null;
    } else break;
  }
  close();
  return rings;
}

/** commandes opentype.js -> anneaux */
function cmdsToRings(cmds, n = 10) {
  const rings = []; let cur = null, x = 0, y = 0;
  for (const c of cmds) {
    if (c.type === 'M') { if (cur && cur.length > 2) rings.push(cur); cur = [[c.x, c.y]]; x = c.x; y = c.y; }
    else if (c.type === 'L') { cur.push([c.x, c.y]); x = c.x; y = c.y; }
    else if (c.type === 'Q') { bez2([x, y], [c.x1, c.y1], [c.x, c.y], n, cur); x = c.x; y = c.y; }
    else if (c.type === 'C') { bez3([x, y], [c.x1, c.y1], [c.x2, c.y2], [c.x, c.y], n, cur); x = c.x; y = c.y; }
    else if (c.type === 'Z') { if (cur && cur.length > 2) rings.push(cur); cur = null; }
  }
  if (cur && cur.length > 2) rings.push(cur);
  return rings;
}

/* ---------- Import SVG : récupère tous les tracés/formes ---------- */
function svgToRings(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') throw new Error('SVG invalide');
  const out = [];
  const parseT = s => {
    let m = [1, 0, 0, 1, 0, 0]; if (!s) return m;
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let r;
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    while ((r = re.exec(s))) {
      const v = r[2].split(/[\s,]+/).filter(Boolean).map(Number); let t;
      if (r[1] === 'matrix') t = v;
      else if (r[1] === 'translate') t = [1, 0, 0, 1, v[0], v[1] || 0];
      else if (r[1] === 'scale') t = [v[0], 0, 0, v[1] === undefined ? v[0] : v[1], 0, 0];
      else if (r[1] === 'rotate') { const a = v[0] * Math.PI / 180, c = Math.cos(a), s2 = Math.sin(a), cx = v[1] || 0, cy = v[2] || 0; t = [c, s2, -s2, c, cx - c * cx + s2 * cy, cy - s2 * cx - c * cy]; }
      else if (r[1] === 'skewX') t = [1, 0, Math.tan(v[0] * Math.PI / 180), 1, 0, 0];
      else t = [1, Math.tan(v[0] * Math.PI / 180), 0, 1, 0, 0];
      m = mul(m, t);
    }
    return m;
  };
  const mulM = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const walk = (el, M) => {
    for (const c of el.children) {
      const tag = c.nodeName.toLowerCase();
      if (tag === 'defs' || tag === 'clippath' || tag === 'mask' || tag === 'symbol' || tag === 'metadata') continue;
      if (c.getAttribute('display') === 'none') continue;
      const m = mulM(M, parseT(c.getAttribute('transform')));
      const f = c.getAttribute('fill'); const st = c.getAttribute('style') || '';
      const noFill = f === 'none' || /fill\s*:\s*none/.test(st);
      let rs = null; const A = n => parseFloat(c.getAttribute(n)) || 0;
      if (tag === 'g' || tag === 'svg' || tag === 'a') { walk(c, m); continue; }
      if (noFill) continue;
      if (tag === 'path') rs = parsePathD(c.getAttribute('d') || '');
      else if (tag === 'rect') { const rx = A('rx'); rs = [rx ? G.roundRect(A('x'), A('y'), A('width'), A('height'), rx) : G.rect(A('x'), A('y'), A('width'), A('height'))]; }
      else if (tag === 'circle') rs = [G.circle(A('cx'), A('cy'), A('r'), 64)];
      else if (tag === 'ellipse') rs = [G.ellipse(A('cx'), A('cy'), A('rx'), A('ry'), 64)];
      else if (tag === 'polygon') { const v = (c.getAttribute('points') || '').split(/[\s,]+/).filter(Boolean).map(Number); const r = []; for (let i = 0; i + 1 < v.length; i += 2) r.push([v[i], v[i + 1]]); rs = [r]; }
      if (rs && rs.length) {
        const eo = /evenodd/.test(c.getAttribute('fill-rule') || '') || /fill-rule\s*:\s*evenodd/.test(st);
        out.push({ rings: G.xf(rs, m), eo });
      }
    }
  };
  walk(root, [1, 0, 0, 1, 0, 0]);
  // unités : viewBox / width -> mm si possible
  let unit = 1; const w = root.getAttribute('width'); const vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (w && /mm$/.test(w) && vb.length === 4 && vb[2]) unit = parseFloat(w) / vb[2];
  else if (w && /cm$/.test(w) && vb.length === 4 && vb[2]) unit = parseFloat(w) * 10 / vb[2];
  else if (w && /in$/.test(w) && vb.length === 4 && vb[2]) unit = parseFloat(w) * 25.4 / vb[2];
  else if (/pt$/.test(w || '')) unit = 25.4 / 72;
  else unit = 25.4 / 96; // px CSS
  let all = [];
  for (const o of out) all = all.concat(G.union(o.rings, o.eo));
  return { rings: G.xf(all, [unit, 0, 0, unit, 0, 0]) };
}

/* ---------- Vectorisation d'une image (logo) : seuil + suivi de contours ---------- */
function traceImage(imgData, w, h, opt = {}) {
  const thr = opt.threshold ?? 128, invert = !!opt.invert;
  const on = new Uint8Array((w + 2) * (h + 2)), W2 = w + 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4, a = imgData[k + 3] / 255;
    const lum = (0.299 * imgData[k] + 0.587 * imgData[k + 1] + 0.114 * imgData[k + 2]) * a + 255 * (1 - a);
    // transparent => fond (blanc). "on" = pixel sombre (à découper)
    let v = lum < thr; if (a < 0.4) v = false; if (invert) v = !v;
    on[(y + 1) * W2 + x + 1] = v ? 1 : 0;
  }
  // arêtes orientées (pixel "on" à gauche du sens de parcours)
  const next = new Map(); const key = (x, y) => y * (W2 + 1) + x;
  const addE = (x0, y0, x1, y1) => { const k = key(x0, y0); if (!next.has(k)) next.set(k, []); next.get(k).push([x1, y1]); };
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    const c = on[(y + 1) * W2 + x + 1], up = on[y * W2 + x + 1], left = on[(y + 1) * W2 + x];
    if (x < w || true) {
      if (c && !up) addE(x + 1, y, x, y);       // bord haut
      if (!c && up) addE(x, y, x + 1, y);       // bord bas du pixel du dessus
      if (c && !left) addE(x, y, x, y + 1);     // bord gauche
      if (!c && left) addE(x, y + 1, x, y);     // bord droit du pixel de gauche
    }
  }
  const rings = [];
  for (const [k0, list] of next) {
    while (list.length) {
      const start = list.pop(); let k = k0; const sx = k0 % (W2 + 1), sy = Math.floor(k0 / (W2 + 1));
      const ring = [[sx, sy]]; let cx = start[0], cy = start[1]; let guard = 0;
      while ((cx !== sx || cy !== sy) && guard++ < 2e6) {
        ring.push([cx, cy]);
        const l = next.get(key(cx, cy)); if (!l || !l.length) break;
        const nx = l.pop(); cx = nx[0]; cy = nx[1];
      }
      if (ring.length > 3) rings.push(ring);
    }
  }
  const eps = opt.simplify ?? 0.8;
  const out = rings.map(r => {
    const closed = r.concat([r[0]]); let s = G.dp(closed, eps); s.pop();
    return opt.smooth === false ? s : G.chaikin(s, 2);
  }).filter(r => r.length > 3);
  return G.union(out);
}
