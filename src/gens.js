/* ===== gens.js : générateurs de motifs vectoriels (multi-couleurs) ===== */
'use strict';

/* ---------- polices ---------- */
const FONT_LIST = [
  ['BebasNeue', 'Bebas Neue (condensée)'], ['RussoOne', 'Russo One (sport)'], ['Anton', 'Anton (gras étroit)'],
  ['RacingSansOne', 'Racing Sans One (course)'], ['BlackOpsOne', 'Black Ops One (stencil)'], ['Audiowide', 'Audiowide (techno)'], ['Bungee', 'Bungee (urbain)']
];
const _fontCache = {};
function getFont(key) {
  if (_fontCache[key]) return _fontCache[key];
  const b64 = (typeof FONT_DATA !== 'undefined') && FONT_DATA[key];
  if (!b64) return null;
  const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return (_fontCache[key] = opentype.parse(u8.buffer));
}
/** texte -> anneaux (mm). size = hauteur de capitale approx. (mm) */
function textRings(str, fontKey, size, tracking = 0, skewDeg = 0, align = 'center', lineGap = 1.1) {
  const font = getFont(fontKey); if (!font) return [];
  const scale = size / ((font.tables.os2 && font.tables.os2.sCapHeight) || font.unitsPerEm * 0.7) ;
  const fs = font.unitsPerEm * scale;
  const lines = String(str).split('\n'); let all = [];
  lines.forEach((ln, li) => {
    let x = 0; const parts = [];
    const glyphs = font.stringToGlyphs(ln);
    glyphs.forEach((gl, i) => {
      const p = gl.getPath(x, 0, fs); parts.push(...cmdsToRings(p.commands, 8));
      x += gl.advanceWidth * scale + tracking;
      if (i < glyphs.length - 1) x += font.getKerningValue(gl, glyphs[i + 1]) * scale;
    });
    const wLine = x - tracking;
    const dx = align === 'left' ? 0 : align === 'right' ? -wLine : -wLine / 2;
    all.push(...G.xf(parts, [1, 0, 0, 1, dx, li * size * lineGap * 1.0]));
  });
  if (skewDeg) all = G.xf(all, [1, 0, -Math.tan(skewDeg * Math.PI / 180), 1, 0, 0]);
  return G.union(all);
}

/* ---------- briques ---------- */
function blade(ax, ay, bx, by, wMax, rnd, jag = 0.25, skew = 0.35, spikes = 0.12) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const n = Math.max(8, Math.min(70, Math.round(len / 22)));
  const A = [], B = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const prof = t < skew ? Math.pow(t / skew, 0.75) : Math.pow((1 - t) / (1 - skew), 1.15);
    const wv = wMax * prof;
    const j1 = 1 + (rnd() - .5) * 2 * jag, j2 = 1 + (rnd() - .5) * 2 * jag;
    const s1 = rnd() < spikes ? 1.7 : 1, s2 = rnd() < spikes ? 1.7 : 1;
    A.push([ax + dx * t + nx * wv * .5 * j1 * s1, ay + dy * t + ny * wv * .5 * j1 * s1]);
    B.push([ax + dx * t - nx * wv * .5 * j2 * s2, ay + dy * t - ny * wv * .5 * j2 * s2]);
  }
  return A.concat(B.reverse());
}
function ragged(p0, p1, rnd, amp, count) {
  const out = [p0]; const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy) || 1, nx = dy / len, ny = -dx / len;
  for (let i = 0; i < count; i++) {
    const t0 = (i + 0.2 + rnd() * 0.3) / count, t1 = (i + 0.7 + rnd() * 0.3) / count;
    const a = amp * (0.15 + rnd() * 0.85) * (rnd() < .25 ? 2.2 : 1);
    out.push([p0[0] + dx * t0 + nx * a * 0.2, p0[1] + dy * t0 + ny * a * 0.2]);
    out.push([p0[0] + dx * t1 + nx * a, p0[1] + dy * t1 + ny * a]);
  }
  out.push(p1); return out;
}
function ribbon(pts, wFn) { // ruban autour d'une polyligne
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = wFn(i / (pts.length - 1)) / 2;
    A.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); B.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return A.concat(B.reverse());
}
const smooth01 = t => t * t * (3 - 2 * t);

/* ---------- générateurs : (w,h,rnd,p) -> [tier0 rings, tier1 rings, ...] ---------- */
const GENS = {
  griffures: {
    label: 'Griffures / déchirures', tiers: 3, desc: 'Bloc + lames déchirées (style rallye)',
    params: { angle: ['Inclinaison °', -40, 40, -14], count: ['Densité', 4, 30, 14], jag: ['Déchiqueté', 0, 100, 40] },
    fn(w, h, rnd, p) {
      const ang = (p.angle ?? -14) * Math.PI / 180, tan = Math.tan(ang), j = (p.jag ?? 40) / 100;
      const bw = w * (0.45 + rnd() * 0.15), cnt = p.count ?? 14;
      const q = [[0, h * .12], [bw, h * .12 + tan * bw * 0.0 - h * 0.0], [bw, h * .6], [0, h * .6]];
      const edge = ragged([bw, h * .12], [bw, h * .62], rnd, w * .17 * (0.4 + j), 11);
      const t0 = [[0, h * .12], ...edge, [0, h * .62]];
      const sl = (x) => -tan * x * 0; // les lames portent l'inclinaison
      const t1 = [], t2 = [];
      for (let i = 0; i < cnt; i++) {
        const y0 = h * (0.08 + rnd() * 0.8), x0 = w * (0.08 + rnd() * 0.5), len = w * (0.25 + rnd() * 0.55);
        const x1 = Math.min(w, x0 + len), y1 = y0 + Math.tan(ang) * (x1 - x0) * -1 - (rnd() - .4) * h * .05;
        t1.push(blade(x0, y0, x1, y1, h * (0.025 + rnd() * 0.07), rnd, 0.1 + j * .6));
      }
      for (let i = 0; i < cnt * 1.6; i++) {
        const y0 = h * (0.05 + rnd() * 0.9), x0 = w * (0.05 + rnd() * 0.7), len = w * (0.1 + rnd() * 0.45);
        const x1 = Math.min(w, x0 + len), y1 = y0 + Math.tan(ang) * (x1 - x0) * -1;
        t2.push(blade(x0, y0, x1, y1, h * (0.008 + rnd() * 0.02), rnd, 0.2, 0.2, 0.2));
      }
      // rotation du bloc pour suivre l'inclinaison
      const rot = [Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), 0, 0];
      return [G.xf([t0], [1, 0, 0, 1, 0, 0]), t1, t2];
    }
  },
  splash: {
    label: 'Éclaboussures (boue / peinture)', tiers: 2, desc: 'Tache organique + gouttes',
    params: { spikes: ['Pointes', 4, 30, 14], drops: ['Gouttes', 6, 70, 34] },
    fn(w, h, rnd, p) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;
      const blob = (R0, nsp, jig) => {
        const n = 64, pts = [];
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2; let r = R0 * (0.7 + rnd() * jig);
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        for (let s = 0; s < nsp; s++) { // pointes
          const a = rnd() * Math.PI * 2, l = R0 * (1.3 + rnd() * 1.4), wd = R0 * (0.06 + rnd() * 0.1);
          pts.length && (pts.push([0, 0]));
        }
        return G.chaikin(pts.slice(0, n), 2);
      };
      const spl = (R0, ox, oy, dropsN, nsp) => {
        const out = [G.xf([blob(R0, 0, 0.5)], [1, 0, 0, 1, ox, oy])[0]];
        for (let s = 0; s < nsp; s++) {
          const a = rnd() * Math.PI * 2, l = R0 * (1.3 + rnd() * 1.6), wd = R0 * (0.08 + rnd() * 0.14);
          out.push(blade(ox + Math.cos(a) * R0 * .5, oy + Math.sin(a) * R0 * .5, ox + Math.cos(a) * l, oy + Math.sin(a) * l, wd, rnd, 0.1, 0.25, 0));
        }
        for (let d = 0; d < dropsN; d++) {
          const a = rnd() * Math.PI * 2, rr = R0 * (1.05 + Math.pow(rnd(), 0.8) * 2.0), s = R0 * (0.03 + rnd() * 0.12) * (1.2 - rr / (R0 * 3.2) * 0.6);
          const rx = s * (1 + rnd() * 1.2);
          out.push(G.xf([G.ellipse(0, 0, rx, s, 14)], [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), ox + Math.cos(a) * rr, oy + Math.sin(a) * rr])[0]);
        }
        return out;
      };
      const t0 = spl(R, cx, cy, p.drops ?? 34, p.spikes ?? 14);
      const t1 = spl(R * 0.55, cx + R * 0.15, cy - R * 0.1, Math.round((p.drops ?? 34) * 0.5), Math.round((p.spikes ?? 14) * 0.6));
      return [t0, t1];
    }
  },
  pneus: {
    label: 'Traces de pneus', tiers: 1, desc: 'Bande de chevrons (profil de pneu)',
    params: { pitch: ['Pas des crampons', 20, 120, 55], band: ['Nb de bandes', 1, 3, 1] },
    fn(w, h, rnd, p) {
      const pitch = p.pitch ?? 55, bands = Math.round(p.band ?? 1), bh = h / bands, out = [];
      for (let b = 0; b < bands; b++) {
        const y0 = b * bh + bh * 0.03, y1 = (b + 1) * bh - bh * 0.03;
        for (let x = 0; x < w - pitch; x += pitch) {
          const e = (rnd() < 0.07) ? 0 : 1; if (!e) continue;
          out.push([[x, y0], [x + pitch * .6, (y0 + y1) / 2], [x, y1], [x + pitch * .38, y1], [x + pitch * .98, (y0 + y1) / 2], [x + pitch * .38, y0]]);
        }
        out.push(G.rect(0, y0, w, bh * 0.045)); out.push(G.rect(0, y1 - bh * 0.045, w, bh * 0.045));
      }
      return [out];
    }
  },
  flammes: {
    label: 'Flammes', tiers: 3, desc: 'Langues de feu en 3 couleurs',
    params: { n: ['Langues', 2, 14, 6] },
    fn(w, h, rnd, p) {
      const n = Math.round(p.n ?? 6), tiers = [[], [], []];
      for (let i = 0; i < n; i++) {
        const bx = w * (i + 0.5) / n, bwid = w / n * 1.5, th = h * (0.55 + rnd() * 0.45), sway = (rnd() - .5) * w / n * 1.6;
        for (let k = 0; k < 3; k++) {
          const sc = [1, 0.66, 0.36][k], pts = [];
          for (let s = 0; s <= 24; s++) pts.push([bx + sway * Math.sin(s / 24 * Math.PI * 1.15) * sc + sway * 0.3 * s / 24, h - th * sc * (s / 24) - (k ? h * 0.01 * k : 0)]);
          tiers[k].push(ribbon(pts, t => bwid * sc * Math.pow(1 - t, 0.85) * (0.6 + 0.4 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2))));
        }
      }
      return tiers;
    }
  },
  damier: {
    label: 'Damier dégradé (pixel fade)', tiers: 1, desc: 'Carrés qui disparaissent progressivement',
    params: { cell: ['Taille case mm', 15, 120, 45], fade: ['Dégradé', 0, 100, 70] },
    fn(w, h, rnd, p) {
      const c = p.cell ?? 45, cols = Math.max(2, Math.round(w / c)), rows = Math.max(1, Math.round(h / c)), cw = w / cols, ch = h / rows, out = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const t = i / (cols - 1 || 1), dens = Math.pow(1 - t * (p.fade ?? 70) / 100, 1.4);
        if ((i + j) % 2 === 0 && rnd() < dens + 0.05) { const s = 1 - 0.25 * t; out.push(G.rect(i * cw + cw * (1 - s) / 2, j * ch + ch * (1 - s) / 2, cw * s, ch * s)); }
      }
      return [out];
    }
  },
  demiton: {
    label: 'Demi-teinte (points dégradés)', tiers: 1, desc: 'Trame de points dégradée',
    params: { cell: ['Pas mm', 12, 80, 30] },
    fn(w, h, rnd, p) {
      const c = p.cell ?? 30, cols = Math.max(3, Math.round(w / c)), rows = Math.max(2, Math.round(h / c)), cw = w / cols, ch = h / rows, out = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const t = i / (cols - 1), r = cw * 0.52 * Math.pow(1 - t, 0.9); if (r < 1.5) continue;
        out.push(G.circle((i + .5 + (j % 2 ? .5 : 0)) * cw, (j + .5) * ch, r, 18));
      }
      return [out];
    }
  },
  facettes: {
    label: 'Facettes géométriques (low-poly)', tiers: 3, desc: 'Triangles façon polygones, 3 couleurs',
    params: { cell: ['Taille mm', 60, 400, 160], fade: ['Dégradé', 0, 100, 55] },
    fn(w, h, rnd, p) {
      const c = p.cell ?? 160, cols = Math.max(2, Math.round(w / c)), rows = Math.max(2, Math.round(h / c)), cw = w / cols, ch = h / rows;
      const P = []; for (let j = 0; j <= rows; j++) { P[j] = []; for (let i = 0; i <= cols; i++) P[j][i] = [i * cw + ((i > 0 && i < cols) ? (rnd() - .5) * cw * .7 : 0), j * ch + ((j > 0 && j < rows) ? (rnd() - .5) * ch * .7 : 0)]; }
      const tiers = [[], [], []];
      const add = (a, b, c2, t) => {
        const dens = 1 - t * (p.fade ?? 55) / 100 * 1.2; if (rnd() > dens) return;
        const g = [(a[0] + b[0] + c2[0]) / 3, (a[1] + b[1] + c2[1]) / 3], s = 0.93;
        const tri = [a, b, c2].map(q => [g[0] + (q[0] - g[0]) * s, g[1] + (q[1] - g[1]) * s]);
        const r = rnd(); tiers[r < .55 ? 0 : r < .85 ? 1 : 2].push(tri);
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const t = i / cols, a = P[j][i], b = P[j][i + 1], c2 = P[j + 1][i + 1], d = P[j + 1][i];
        if (rnd() < .5) { add(a, b, c2, t); add(a, c2, d, t); } else { add(a, b, d, t); add(b, c2, d, t); }
      }
      return tiers;
    }
  },
  bandes: {
    label: 'Bandes racing inclinées', tiers: 3, desc: 'Bande large + 2 filets',
    params: { skew: ['Biais °', -60, 60, 25], gap: ['Écart mm', 10, 120, 40] },
    fn(w, h, rnd, p) {
      const sk = Math.tan((p.skew ?? 25) * Math.PI / 180) * h, g = p.gap ?? 40;
      const ws = [w * .46, w * .08, w * .04]; let x = 0; const tiers = [];
      ws.forEach((sw, i) => { const x0 = x; tiers.push([[[x0 + (sk > 0 ? sk : 0), 0], [x0 + sw + (sk > 0 ? sk : 0), 0], [x0 + sw + (sk > 0 ? 0 : -sk), h], [x0 + (sk > 0 ? 0 : -sk), h]]]); x += sw + g; });
      return tiers;
    }
  },
  chevrons: {
    label: 'Chevrons >>>', tiers: 1, desc: 'Flèches de vitesse',
    params: { n: ['Nombre', 2, 12, 5], thick: ['Épaisseur %', 8, 40, 18] },
    fn(w, h, rnd, p) {
      const n = Math.round(p.n ?? 5), t = (p.thick ?? 18) / 100, pitch = w / n, tw = pitch * (t * 2.2), out = [];
      for (let i = 0; i < n; i++) { const x = i * pitch; out.push([[x, 0], [x + tw, 0], [x + tw + pitch * .42, h / 2], [x + tw, h], [x, h], [x + pitch * .42, h / 2]]); }
      return [out];
    }
  },
  vitesse: {
    label: 'Lignes de vitesse', tiers: 2, desc: 'Traits effilés de longueurs variables',
    params: { n: ['Nombre', 3, 30, 12] },
    fn(w, h, rnd, p) {
      const n = Math.round(p.n ?? 12), t0 = [], t1 = []; const bh = h / n;
      for (let i = 0; i < n; i++) {
        const l = w * (0.3 + rnd() * 0.7), x0 = w - l, th = bh * (0.25 + rnd() * 0.5);
        (rnd() < .3 ? t1 : t0).push([[x0, i * bh + bh / 2], [x0 + l * .15, i * bh + bh / 2 - th / 2], [w, i * bh + bh / 2 - th / 2], [w, i * bh + bh / 2 + th / 2], [x0 + l * .15, i * bh + bh / 2 + th / 2]]);
      }
      return [t0, t1];
    }
  },
  swoosh: {
    label: 'Swoosh / traînées courbes', tiers: 3, desc: 'Rubans effilés qui épousent la caisse',
    params: { curve: ['Courbure', 0, 100, 55], thick: ['Épaisseur %', 6, 50, 24] },
    fn(w, h, rnd, p) {
      const cv = (p.curve ?? 55) / 100, th = h * (p.thick ?? 24) / 100, tiers = [[], [], []];
      for (let k = 0; k < 3; k++) {
        const off = k * th * 0.62, pts = [];
        for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([w * t, h * (0.9 - 0.8 * smooth01(Math.pow(t, 1 + cv))) - off * (1 - 0.3 * t)]); }
        tiers[k].push(ribbon(pts, t => th * [1, .55, .28][k] * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.8)));
      }
      return tiers;
    }
  },
  vagues: {
    label: 'Vagues (camion / utilitaire)', tiers: 3, desc: 'Rubans ondulés parallèles',
    params: { amp: ['Amplitude %', 5, 60, 25], waves: ['Ondes', 0.5, 4, 1.5] },
    fn(w, h, rnd, p) {
      const amp = h * (p.amp ?? 25) / 100 / 2, wv = p.waves ?? 1.5, tiers = [[], [], []]; const th = h * 0.16;
      for (let k = 0; k < 3; k++) {
        const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([w * t, h / 2 + k * th * 1.15 - th + Math.sin(t * Math.PI * 2 * wv - k * .35) * amp]); }
        tiers[k].push(ribbon(pts, t => th * [1, .7, .4][k] * Math.pow(Math.sin(Math.PI * t), 0.55)));
      }
      return tiers;
    }
  }
};

/* ---------- formes de base ---------- */
const SHAPES = {
  rect:   { label: 'Rectangle', fn: (w, h) => [G.rect(0, 0, w, h)] },
  rrect:  { label: 'Rect. arrondi', fn: (w, h) => [G.roundRect(0, 0, w, h, Math.min(w, h) * .2)] },
  ellipse:{ label: 'Ellipse / cercle', fn: (w, h) => [G.ellipse(w / 2, h / 2, w / 2, h / 2)] },
  tri:    { label: 'Triangle', fn: (w, h) => [[[w / 2, 0], [w, h], [0, h]]] },
  para:   { label: 'Parallélogramme', fn: (w, h) => [[[w * .25, 0], [w, 0], [w * .75, h], [0, h]]] },
  hex:    { label: 'Hexagone', fn: (w, h) => [G.xf([G.poly(0, 0, 1, 6, 0)], [w / 2, 0, 0, h / 2, w / 2, h / 2])[0]] },
  star:   { label: 'Étoile', fn: (w, h) => [G.xf([G.star(0, 0, 1, .42, 5)], [w / 2, 0, 0, h / 2, w / 2, h / 2])[0]] },
  arrow:  { label: 'Flèche', fn: (w, h) => [[[0, h * .3], [w * .6, h * .3], [w * .6, 0], [w, h / 2], [w * .6, h], [w * .6, h * .7], [0, h * .7]]] },
  ring:   { label: 'Anneau', fn: (w, h) => G.union([G.ellipse(w / 2, h / 2, w / 2, h / 2), G.ellipse(w / 2, h / 2, w * .38, h * .38).reverse()]) },
  flag:   { label: 'Damier (drapeau)', fn: (w, h) => { const o = []; const c = 8, r = Math.max(2, Math.round(c * h / w)); for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) if ((i + j) % 2 === 0) o.push(G.rect(i * w / c, j * h / r, w / c, h / r)); return o; } },
  bolt:   { label: 'Éclair', fn: (w, h) => [[[w * .55, 0], [w * .1, h * .56], [w * .45, h * .56], [w * .3, h], [w * .92, h * .36], [w * .55, h * .36]]] },
  sharkfin:{ label: 'Pointe / lame', fn: (w, h) => [blade(0, h / 2, w, h / 2, h, rng(1), 0, 0.3, 0)] }
};
