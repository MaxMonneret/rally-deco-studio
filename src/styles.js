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
  facettes: {
    name: 'Facettes Géométriques', blurb: 'Éclats low-poly anthracite / cyan – look « showcar »',
    pal: [['Anthracite', '#3b3f45'], ['Cyan', '#00b7c3'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .06, H * .18, L * .94, H * .76, 'facettes', { cell: H * .22, fade: 0 }, [0, 1, 2], { seed: 41, flip: true });
      c.topPart(0, 'facettes', { cell: 170, fade: 0 }, [0, 1, 2], 'hood', 42, { flip: true });
      c.topPart(1, 'facettes', { cell: 170, fade: 0 }, [0, 1, 2], 'roof', 43);
      c.topPart(2, 'facettes', { cell: 170, fade: 0 }, [0, 1, 2], 'trunk', 44);
      c.end('front', W * .98, H * .3, 'facettes', { cell: 120, fade: 0 }, [0, 1, 2], 45);
      c.end('rear', W * .98, H * .3, 'facettes', { cell: 120, fade: 0 }, [0, 1, 2], 46);
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
  rafale: {
    name: 'Rafale WRC', blurb: 'Bandes obliques franches rouge/noir qui plongent vers l\'avant – look Toyota / Hyundai, aplats nets',
    pal: [['Rouge', '#d71920'], ['Noir', '#111111'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .08, H * .12, L * .84, H * .8, 'rafale', { n: 8, angle: 36, gap: 28 }, [0, 1], { seed: 71, flip: true });
      c.side(0, H * .45, L * .22, H * .45, 'rafale', { n: 3, angle: 48, gap: 40 }, [1, 0], { seed: 72 });
      c.topPart(0, 'rafale', { n: 5, angle: 40, gap: 34 }, [0, 1], 'hood', 73);
      c.topPart(1, 'rafale', { n: 4, angle: 40, gap: 40 }, [1, 0], 'roof', 74);
      c.topPart(2, 'rafale', { n: 5, angle: 40, gap: 34 }, [0, 1], 'trunk', 75, { flip: true });
      c.end('front', W * .94, H * .24, 'rafale', { n: 6, angle: 40, gap: 30 }, [0, 1], 76);
      c.end('rear', W * .94, H * .24, 'rafale', { n: 6, angle: 40, gap: 30 }, [0, 1], 77);
    }
  },
  eclats: {
    name: 'Éclats Lime', blurb: 'Grandes lames angulaires imbriquées vert lime / noir – showcar agressif, 100 % aplats',
    pal: [['Vert lime', '#a5d600'], ['Noir', '#111111'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .04, H * .15, L * .92, H * .78, 'eclats', { n: 10, angle: -16, size: 60 }, [0, 1, 2], { seed: 81, flip: true });
      c.topPart(0, 'eclats', { n: 6, angle: -10, size: 70 }, [0, 1, 2], 'hood', 82);
      c.topPart(1, 'eclats', { n: 5, angle: 12, size: 70 }, [1, 0, 2], 'roof', 83);
      c.topPart(2, 'eclats', { n: 6, angle: -10, size: 70 }, [0, 1, 2], 'trunk', 84);
      c.end('front', W * .96, H * .26, 'eclats', { n: 6, angle: 8, size: 60 }, [0, 1, 2], 85);
      c.end('rear', W * .96, H * .26, 'eclats', { n: 6, angle: -8, size: 60 }, [0, 1, 2], 86);
    }
  },
  topo: {
    name: 'Topo Gravel', blurb: 'Courbes de niveau vert forêt / noir – esprit rallye nature, traits épais',
    pal: [['Vert forêt', '#1f6b3a'], ['Noir', '#111111'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .06, H * .14, L * .88, H * .8, 'topo', { lines: 8, width: 14, blobs: 3 }, [0, 1], { seed: 91 });
      c.topPart(0, 'topo', { lines: 6, width: 14, blobs: 2 }, [0, 1], 'hood', 92);
      c.topPart(1, 'topo', { lines: 5, width: 14, blobs: 2 }, [1, 0], 'roof', 93);
      c.topPart(2, 'topo', { lines: 6, width: 14, blobs: 2 }, [0, 1], 'trunk', 94);
      c.end('front', W * .96, H * .28, 'topo', { lines: 5, width: 12, blobs: 2 }, [0, 1], 95);
      c.end('rear', W * .96, H * .28, 'topo', { lines: 5, width: 12, blobs: 2 }, [0, 1], 96);
    }
  },
  hex: {
    name: 'Alvéoles Hybrid', blurb: 'Nid d\'abeille cyan / bleu nuit sur l\'arrière du flanc – techno, sans dégradé',
    pal: [['Cyan', '#00b7c3'], ['Bleu nuit', '#10264f'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .02, H * .16, L * .96, H * .78, 'hex', { cell: Math.round(H * .075), fill: 22 }, [0, 1], { seed: 101, flip: true });
      c.side(L * .5, H * .5, L * .5, H * .4, 'rafale', { n: 4, angle: 30, gap: 40 }, [1, 0], { seed: 102 });
      c.topPart(0, 'hex', { cell: 110, fill: 20 }, [0, 1], 'hood', 103, { flip: true });
      c.topPart(1, 'hex', { cell: 110, fill: 20 }, [1, 0], 'roof', 104);
      c.topPart(2, 'hex', { cell: 110, fill: 20 }, [0, 1], 'trunk', 105);
      c.end('front', W * .96, H * .26, 'hex', { cell: 85, fill: 20 }, [0, 1], 106);
      c.end('rear', W * .96, H * .26, 'hex', { cell: 85, fill: 20 }, [0, 1], 107);
    }
  },
  retro: {
    name: 'Rétro Groupe B', blurb: 'Faisceau de bandes bleu / rouge avec décrochement sur le flanc, capot et toit – icône des années 80',
    pal: [['Bleu roi', '#1b4fa3'], ['Rouge', '#d71920'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(-L * .02, H * .3, L * 1.04, H * .55, 'lignes', { n: 4, thick: 8, kink: 46, drop: 22 }, [0, 1, 0], { seed: 111 });
      c.stripes(W, L, [0, 1, 0]);
      c.end('front', W * .96, H * .22, 'lignes', { n: 4, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 112);
      c.end('rear', W * .96, H * .22, 'lignes', { n: 4, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 113);
    }
  },
  eclair: {
    name: 'Éclair Groupe A', blurb: 'Bande en marches d\'escalier bleu / jaune + liserés sur flancs blancs – esprit 106 / Saxo Gr.A',
    pal: [['Bleu roi', '#1b4fa3'], ['Jaune', '#ffd400'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(-L * .02, H * .45, L * 1.04, H * .5, 'eclair', { steps: 2, thick: 20, rise: 38 }, [0, 1, 0], { seed: 121 });
      c.topPart(0, 'eclair', { steps: 1, thick: 24, rise: 30 }, [0, 1, 0], 'hood', 122);
      c.topPart(2, 'eclair', { steps: 1, thick: 24, rise: 30 }, [0, 1, 0], 'trunk', 123, { flip: true });
      c.end('front', W * .96, H * .24, 'lignes', { n: 3, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 124);
      c.end('rear', W * .96, H * .24, 'lignes', { n: 3, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 125);
    }
  },
  bicolore: {
    name: 'Bicolore Biseauté', blurb: 'Grand bloc jaune à bord angulaire + liserés noirs – esprit Clio Super 1600',
    pal: [['Jaune', '#ffd400'], ['Noir', '#111111'], ['Blanc', '#ffffff']], light: 2, dark: 1,
    fn(c) {
      const { L, H, W } = c;
      c.side(0, H * .1, L * .62, H * .84, 'bloc', { facets: 2, reach: 85 }, [0, 1, 0], { seed: 131, flip: true });
      c.topPart(0, 'bloc', { facets: 2, reach: 70 }, [0, 1, 0], 'hood', 132);
      c.topPart(1, 'bloc', { facets: 1, reach: 60 }, [1, 0, 1], 'roof', 133);
      c.end('front', W * .96, H * .3, 'bloc', { facets: 2, reach: 70 }, [0, 1, 0], 134);
      c.end('rear', W * .96, H * .3, 'bloc', { facets: 2, reach: 60 }, [0, 1, 0], 135);
    }
  },
  camo: {
    name: 'Camo Rallye', blurb: 'Grosses taches orange / bleu / noir superposées – look libre « showcar », aplats simples à peler',
    pal: [['Orange', '#f47b20'], ['Bleu roi', '#1b4fa3'], ['Noir', '#111111']], light: 2, dark: 2,
    fn(c) {
      const { L, H, W } = c;
      c.side(L * .02, H * .12, L * .96, H * .84, 'camo', { n: 20, size: 18 }, [0, 1, 2], { seed: 141 });
      c.topPart(0, 'camo', { n: 12, size: 22 }, [0, 1, 2], 'hood', 142);
      c.topPart(1, 'camo', { n: 10, size: 22 }, [1, 2, 0], 'roof', 143);
      c.topPart(2, 'camo', { n: 12, size: 22 }, [2, 0, 1], 'trunk', 144);
      c.end('front', W * .96, H * .3, 'camo', { n: 10, size: 22 }, [0, 1, 2], 145);
      c.end('rear', W * .96, H * .3, 'camo', { n: 10, size: 22 }, [0, 1, 2], 146);
    }
  },
  groupeN: {
    name: 'Sobre Groupe N', blurb: 'Bandes de bas de caisse + faces, le reste laissé à la couleur d\'origine – sobre, rapide à poser',
    pal: [['Bleu roi', '#1b4fa3'], ['Rouge', '#d71920'], ['Blanc', '#ffffff']], light: 2, dark: 0,
    fn(c) {
      const { L, H, W } = c;
      c.side(0, H * .8, L, H * .14, 'lignes', { n: 3, thick: 22, kink: 52, drop: 0 }, [0, 1, 0], { seed: 151 });
      c.side(L * .55, H * .42, L * .45, H * .3, 'rafale', { n: 3, angle: 40, gap: 45 }, [0, 1], { seed: 152 });
      c.end('front', W * .96, H * .2, 'lignes', { n: 3, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 153);
      c.end('rear', W * .96, H * .2, 'lignes', { n: 3, thick: 14, kink: 50, drop: 0 }, [0, 1, 0], 154);
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
        out.push(...genGroup(gen, params, seed, lw, lh, tiers.map(i => ids[i]), place, 'noglass', STYLES[key].name));
      }
    },
    sideText(lx, ly, str, font, size, track, skew, layerIdx) {
      for (const sd of ['left', 'right']) {
        const r = R[sd]; const x = sd === 'left' ? r.x + lx : r.x + (L - lx);
        const t = textObj(str, font, size, track, skew, 'center', ids[layerIdx], { x, y: r.y + ly }); if (t) { t.clip = 'noglass'; out.push(t); }
      }
    },
    topPart(tierShift, gen, params, tiers, zone, seed, o = {}) {
      const z = regs[zone]; if (!z || z.y1 - z.y0 < 120) return;
      const r = R.top, len = z.y1 - z.y0, wid = Math.min(W * .96, 2 * hwAt((z.y0 + z.y1) / 2) * .98);
      const rot = o.rot ?? -90, wScale = o.scaleH || 1;
      const place = { x: r.x + W / 2, y: r.y + (z.y0 + z.y1) / 2, rot, fx: !!o.flip };
      out.push(...genGroup(gen, params, seed + seed0 * 100, len, wid * wScale, tiers.map(i => ids[i]), place, 'noglass', STYLES[key].name));
    },
    stripes(w, l, tiers) { // bandes centrales (dessus)
      const r = R.top, sw = W * .38;
      const place = { x: r.x + W / 2, y: r.y + l / 2, rot: 0 };
      out.push(...genGroup('bandes', { skew: 0, gap: 28 }, 5, sw, l * .995, tiers.map(i => ids[i]), place, 'noglass', 'Bandes racing'));
    },
    end(view, w, h, gen, params, tiers, seed) {
      const r = R[view]; const place = { x: r.x + W / 2, y: r.y + H - Math.max(v.frontBot, 300) - h * .35 };
      out.push(...genGroup(gen, params, seed + seed0 * 100, w, h, tiers.map(i => ids[i]), place, 'noglass', STYLES[key].name));
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
    if (sp) { const bb = G.bbox(sp.rings); if (bb.w > x1 - x0) { sp.sx = sp.sy = (x1 - x0) / bb.w; } sp.name = 'Sponsors bas de caisse'; sp.clip = 'noglass'; out.push(sp); }
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
    if (bt) { const bb = G.bbox(bt.rings); if (bb.w > bw * .92) { bt.sx = bt.sy = bw * .92 / bb.w; } bt.rot = 180; bt.gid = 'bn'; if (S.layers.findIndex(l => l.id === light) < S.layers.findIndex(l => l.id === dark)) punch(bar, bt); out.push(bar, bt); }
  }
  S.objs.push(...out);
  S.sel = new Set();
}
