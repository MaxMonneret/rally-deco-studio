/* ===== styles.js : propositions de décos complètes ("décide comme un designer") ===== */
'use strict';
const STYLES = {
  griffures: {
    name: 'Griffures Rallye', blurb: 'Bloc rouge déchiré par des lames noires – agressif, très « rallye »',
    pal: [['Rouge', '#d71920'], ['Noir', '#111111'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .26, H * .2, L * .74, H * .66, 'griffures', { angle: -14, count: 15, jag: 45 }, [0, 1, 2], { seed: 11 });
      c.side(0, H * .38, L * .3, H * .42, 'griffures', { angle: 16, count: 9, jag: 55 }, [1, 0, 2], { seed: 12, flip: true });
      c.topPart(0, 'griffures', { angle: -10, count: 12, jag: 50 }, [0, 1, 2], 'hood', 13);
      c.topPart(1, 'griffures', { angle: 10, count: 10, jag: 50 }, [1, 0, 2], 'roof', 14);
      c.topPart(2, 'griffures', { angle: -12, count: 10, jag: 50 }, [0, 1, 2], 'trunk', 15);
      c.end('front', W * .94, H * .26, 'griffures', { angle: 8, count: 8, jag: 50 }, [0, 1, 2], 16);
      c.end('rear', W * .94, H * .26, 'griffures', { angle: -8, count: 8, jag: 50 }, [0, 1, 2], 17);
    }
  },
  splash: {
    name: 'Boue & Splash', blurb: 'Éclaboussures orange + traces de pneus – esprit terre / gravel',
    pal: [['Orange', '#f47b20'], ['Blanc', '#ffffff'], ['Anthracite', '#3b3f45']], light: 1, dark: 2,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .42, H * .28, L * .56, H * .22, 'pneus', { pitch: 48, band: 2 }, [1], { seed: 21, rot: -22 });
      c.side(L * .55, H * .35, H * .95, H * .95, 'splash', { spikes: 16, drops: 36 }, [0, 1], { seed: 22 });
      c.side(0, H * .38, H * .8, H * .8, 'splash', { spikes: 12, drops: 30 }, [0, 1], { seed: 23, flip: true });
      c.topPart(0, 'splash', { spikes: 14, drops: 30 }, [0, 1], 'hood', 24);
      c.topPart(1, 'pneus', { pitch: 55, band: 1 }, [1], 'roof', 25, { rot: -90, scaleH: .35 });
      c.topPart(2, 'splash', { spikes: 14, drops: 30 }, [0, 1], 'trunk', 26);
      c.end('front', W * .96, H * .3, 'splash', { spikes: 12, drops: 28 }, [0, 1], 27);
      c.end('rear', W * .96, H * .3, 'splash', { spikes: 12, drops: 28 }, [0, 1], 28);
    }
  },
  pixel: {
    name: 'Pixel Fade', blurb: 'Damier qui se dissout vers l\'avant – moderne, très tendance',
    pal: [['Noir', '#111111'], ['Jaune', '#ffd400'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .12, H * .22, L * .88, H * .66, 'damier', { cell: Math.max(40, H / 14), fade: 90 }, [0], { seed: 31, flip: true });
      c.side(L * .3, H * .62, L * .7, H * .3, 'damier', { cell: Math.max(40, H / 14), fade: 95 }, [1], { seed: 32, flip: true });
      c.topPart(0, 'damier', { cell: 70, fade: 85 }, [0], 'hood', 33, { flip: true });
      c.topPart(1, 'damier', { cell: 70, fade: 85 }, [0], 'roof', 34, { flip: true });
      c.topPart(2, 'damier', { cell: 70, fade: 70 }, [0], 'trunk', 35);
      c.end('front', W * .96, H * .24, 'damier', { cell: 40, fade: 80 }, [0], 36);
      c.end('rear', W * .96, H * .24, 'damier', { cell: 40, fade: 70 }, [0], 37);
    }
  },
  facettes: {
    name: 'Facettes Géométriques', blurb: 'Éclats low-poly anthracite / cyan – look « showcar »',
    pal: [['Anthracite', '#3b3f45'], ['Cyan', '#00b7c3'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .06, H * .18, L * .94, H * .76, 'facettes', { cell: H * .22, fade: 75 }, [0, 1, 2], { seed: 41, flip: true });
      c.topPart(0, 'facettes', { cell: 170, fade: 60 }, [0, 1, 2], 'hood', 42, { flip: true });
      c.topPart(1, 'facettes', { cell: 170, fade: 50 }, [0, 1, 2], 'roof', 43);
      c.topPart(2, 'facettes', { cell: 170, fade: 50 }, [0, 1, 2], 'trunk', 44);
      c.end('front', W * .98, H * .3, 'facettes', { cell: 120, fade: 70 }, [0, 1, 2], 45);
      c.end('rear', W * .98, H * .3, 'facettes', { cell: 120, fade: 70 }, [0, 1, 2], 46);
    }
  },
  racing: {
    name: 'Racing Stripes + Swoosh', blurb: 'Bandes centrales + traînées latérales bleu/rouge – classique pro',
    pal: [['Blanc', '#ffffff'], ['Bleu roi', '#1b4fa3'], ['Rouge', '#d71920']], light: 0, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .12, H * .42, L * .88, H * .5, 'swoosh', { curve: 60, thick: 46 }, [1, 2, 0], { seed: 51, flip: false });
      c.side(L * .55, H * .22, L * .42, H * .5, 'chevrons', { n: 4, thick: 16 }, [2], { seed: 52, flip: true });
      c.stripes(W, L, [1, 2, 0]);
      c.end('front', W * .9, H * .12, 'vitesse', { n: 5 }, [1, 2], 53);
      c.end('rear', W * .9, H * .12, 'vitesse', { n: 5 }, [1, 2], 54);
    }
  },
  camion: {
    name: 'Camion / Pro (nom de société)', blurb: 'Vagues + gros lettrage société – utilitaires et poids lourds',
    pal: [['Bleu roi', '#1b4fa3'], ['Blanc', '#ffffff'], ['Orange', '#f47b20']], light: 1, dark: 0,
    fn(c) {
      const { L, H, W, v } = c;
      const big = v.id === 'truck' || v.id === 'van';
      const x0 = big ? v.door[2] : L * .2;
      c.side(x0, H * .52, L - x0, H * .4, 'vagues', { amp: 28, waves: 1.6 }, [0, 2, 0], { seed: 61 });
      c.sideText(x0 + (L - x0) / 2, H * (big ? .32 : .3), c.name || 'VOTRE SOCIÉTÉ', 'Anton', Math.min(H * (big ? .12 : .1), 260), 6, 0, 0);
      c.sideText(x0 + (L - x0) / 2, H * (big ? .43 : .4), c.sub || 'TRANSPORT · LOGISTIQUE', 'RussoOne', Math.min(H * .05, 110), 8, 0, 2);
      c.topPart(1, 'bandes', { skew: 0, gap: 30 }, [0, 2, 1], 'roof', 62);
      c.end('front', W * .9, H * .14, 'vagues', { amp: 30, waves: 1.2 }, [0, 2, 0], 63);
      c.end('rear', W * .9, H * .2, 'vagues', { amp: 30, waves: 1.2 }, [0, 2, 0], 64);
    }
  }
};

/** évide 'base' à l'endroit de 'top' (réserve) quand 'top' est dans un calque situé SOUS 'base' */
function punch(base, top) {
  const w = G.diff(wRings(base), wRings(top));
  base.rings = G.xf(w, [1, 0, 0, 1, -base.x, -base.y]); base.sx = base.sy = 1; base.rot = 0; base.fx = false; base._wk = null; base.lb = G.bbox(base.rings) || base.lb;
}
function applyStyle(key, opt = {}) {
  const st = STYLES[key], v = V(), R = REG(), { L, H, W } = v;
  if (opt.clear !== false) { S.objs = []; S.layers = []; st.pal.forEach(p => addLayer(p[0], p[1])); }
  // calques cibles = ceux dont la couleur ~ celle du style (ou nouveaux)
  const ids = st.pal.map(p => { let l = S.layers.find(l => l.color.toLowerCase() === p[1].toLowerCase()); if (!l) l = addLayer(p[0], p[1]); return l.id; });
  const out = [];
  const seed0 = opt.seed || 1;
  const hwAt = x => halfWidth(v, x);
  const regs = { // zones de la vue du dessus (coordonnées locales)
    hood: { y0: 20, y1: v.ws[0] + 40 }, roof: { y0: v.ws[1] - 60, y1: v.rg[0] + 60 }, trunk: { y0: v.rg[1] - 40, y1: L - 20 }
  };
  const c = {
    v, L, H, W, name: opt.company, sub: opt.sub,
    side(lx, ly, lw, lh, gen, params, tiers, o = {}) {
      const rot = o.rot || 0, flip = !!o.flip, seed = (o.seed || 1) + seed0 * 100;
      for (const sd of ['left', 'right']) {
        const lcx = lx + lw / 2, lcy = ly + lh / 2; const r = R[sd];
        const place = sd === 'left' ? { x: r.x + lcx, y: r.y + lcy, rot, fx: flip } : { x: r.x + (L - lcx), y: r.y + lcy, rot: -rot, fx: !flip };
        out.push(...genGroup(gen, params, seed, lw, lh, tiers.map(i => ids[i]), place, 'body', STYLES[key].name));
      }
    },
    sideText(lx, ly, str, font, size, track, skew, layerIdx) {
      for (const sd of ['left', 'right']) {
        const r = R[sd]; const x = sd === 'left' ? r.x + lx : r.x + (L - lx);
        const t = textObj(str, font, size, track, skew, 'center', ids[layerIdx], { x, y: r.y + ly }); if (t) { t.clip = 'body'; out.push(t); }
      }
    },
    topPart(tierShift, gen, params, tiers, zone, seed, o = {}) {
      const z = regs[zone]; if (!z || z.y1 - z.y0 < 120) return;
      const r = R.top, len = z.y1 - z.y0, wid = Math.min(W * .96, 2 * hwAt((z.y0 + z.y1) / 2) * .98);
      const rot = o.rot ?? -90, wScale = o.scaleH || 1;
      const place = { x: r.x + W / 2, y: r.y + (z.y0 + z.y1) / 2, rot, fx: !!o.flip };
      out.push(...genGroup(gen, params, seed + seed0 * 100, len, wid * wScale, tiers.map(i => ids[i]), place, 'body', STYLES[key].name));
    },
    stripes(w, l, tiers) { // bandes centrales (dessus)
      const r = R.top, sw = W * .38;
      const place = { x: r.x + W / 2, y: r.y + l / 2, rot: 0 };
      out.push(...genGroup('bandes', { skew: 0, gap: 28 }, 5, sw, l * .995, tiers.map(i => ids[i]), place, 'body', 'Bandes racing'));
    },
    end(view, w, h, gen, params, tiers, seed) {
      const r = R[view]; const place = { x: r.x + W / 2, y: r.y + H - Math.max(v.frontBot, 300) - h * .35 };
      out.push(...genGroup(gen, params, seed + seed0 * 100, w, h, tiers.map(i => ids[i]), place, 'body', STYLES[key].name));
    }
  };
  st.fn(c);
  // ---- accessoires communs : ronds de porte, noms, bandeau pare-brise, sponsors ----
  const light = ids[st.light], dark = ids[st.dark], num = opt.num || '12';
  const dd = Math.min(v.id === 'truck' ? 640 : 380, (v.belt - v.clear) * .55);
  const rcx = (v.door[0] + v.door[1]) / 2, rcy = H - (v.belt + v.clear) / 2 + 10;
  for (const sd of ['left', 'right']) {
    const r = R[sd], x = sd === 'left' ? r.x + rcx : r.x + (L - rcx), y = r.y + rcy;
    const disc = shapeObj('ellipse', dd, dd, light, { x, y }); disc.name = 'Rond de porte'; disc.gid = 'rd' + sd;
    const t = textObj(String(num), 'Anton', dd * .5, 0, 0, 'center', dark, { x, y });
    if (t) { t.gid = disc.gid; t.name = 'N° ' + num; if (S.layers.findIndex(l => l.id === dark) < S.layers.findIndex(l => l.id === light)) punch(disc, t); out.push(disc, t); }
    // nom équipage sur vitre arrière latérale (bandeau bas de vitre)
    const crew = opt.crew || 'PILOTE / COPILOTE';
    const gx = (v.door[1] + v.door[2]) / 2 + 100; const nt = textObj(crew, 'RussoOne', Math.max(34, (v.belt - v.clear) * .075), 3, 8, 'center', light, { x: sd === 'left' ? r.x + gx : r.x + (L - gx), y: r.y + H - v.belt - 70 });
    if (nt) { nt.name = 'Équipage'; out.push(nt); }
    // sponsors bas de caisse
    const x0 = v.wheels[0].x + v.wheels[0].r + 90, x1 = v.wheels[1].x - v.wheels[1].r - 90;
    const sp = textObj(opt.sponsor || 'PARTENAIRE 1  ·  PARTENAIRE 2  ·  PARTENAIRE 3', 'BebasNeue', Math.max(36, (v.belt - v.clear) * .07), 5, 0, 'center', dark, { x: sd === 'left' ? r.x + (x0 + x1) / 2 : r.x + (L - (x0 + x1) / 2), y: r.y + H - v.clear - 105 });
    if (sp) { const bb = G.bbox(sp.rings); if (bb.w > x1 - x0) { sp.sx = sp.sy = (x1 - x0) / bb.w; } sp.name = 'Sponsors bas de caisse'; sp.clip = 'body'; out.push(sp); }
  }
  // numéro sur le toit
  if (v.rg[0] - v.ws[1] > 300) {
    const r = R.top, y = (v.ws[1] + v.rg[0]) / 2;
    const rn = textObj(String(num), 'Anton', Math.min(W * .34, (v.rg[0] - v.ws[1]) * .4), 0, 0, 'center', dark, { x: r.x + W / 2, y: r.y + y });
    if (rn) { rn.rot = -90; rn.name = 'N° toit'; out.push(rn); }
  }
  // bandeau pare-brise
  if (v.ws[1] - v.ws[0] > 200) {
    const r = R.top, ybn = v.ws[0] + 150, bw = hwAt(ybn) * 2 * .8, bh = 150;
    const bar = makeObj({ name: 'Bandeau pare-brise', rings: G.center([G.rect(0, 0, bw, bh)]).rings, layer: dark, x: r.x + W / 2, y: r.y + ybn, clip: 'none', gid: 'bn' });
    const bt = textObj((opt.crew || 'PILOTE / COPILOTE'), 'RacingSansOne', 90, 4, 0, 'center', light, { x: r.x + W / 2, y: r.y + ybn });
    if (bt) { const bb = G.bbox(bt.rings); if (bb.w > bw * .92) { bt.sx = bt.sy = bw * .92 / bb.w; } bt.gid = 'bn'; if (S.layers.findIndex(l => l.id === light) < S.layers.findIndex(l => l.id === dark)) punch(bar, bt); out.push(bar, bt); }
  }
  S.objs.push(...out);
  S.sel = new Set();
}
