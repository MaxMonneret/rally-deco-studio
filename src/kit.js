/* ===== kit.js : kit rallye — noms de vitres (+ drapeau + groupe sanguin), ronds de porte, numéros, sponsors ===== */
'use strict';
const KIT = { pilot: 'DUPONT', copilot: 'MARTIN', bp: 'A+', bc: 'O+', fp: 'FR', fc: 'FR', font: 'RussoOne', size: 62, style: 'ombre', flag: true, blood: true, pilotSide: 'left', band: true };
const FLAG_COL = { '#1b4fa3': 'Bleu roi', '#ffffff': 'Blanc', '#d71920': 'Rouge', '#111111': 'Noir', '#ffd400': 'Jaune', '#1f9d55': 'Vert' };
const FLAGS = { // c : couleurs ; v : bandes verticales ; r : proportions
  FR: { c: ['#1b4fa3', '#ffffff', '#d71920'], v: true }, BE: { c: ['#111111', '#ffd400', '#d71920'], v: true }, IT: { c: ['#1f9d55', '#ffffff', '#d71920'], v: true },
  DE: { c: ['#111111', '#d71920', '#ffd400'] }, NL: { c: ['#d71920', '#ffffff', '#1b4fa3'] }, ES: { c: ['#d71920', '#ffd400', '#d71920'], r: [0.25, 0.5, 0.25] }, CH: { cross: true }
};
const layerForColor = hex => { let l = S.layers.find(l => l.color.toLowerCase() === hex.toLowerCase()); if (!l) l = addLayer(FLAG_COL[hex.toLowerCase()] || hex, hex); return l.id; };
function cobj(name, rings, layer, extra) { // objet recentré sur sa boîte englobante (rings en coordonnées monde)
  const b = G.bbox(rings); return makeObj(Object.assign({ name, rings: G.xf(rings, [1, 0, 0, 1, -b.cx, -b.cy]), x: b.cx, y: b.cy, layer }, extra || {}));
}
function flagObjs(code, cx, cy, fw, fh) {
  const F = FLAGS[code]; if (!F) return []; const out = [], x0 = cx - fw / 2, y0 = cy - fh / 2;
  if (F.cross) {
    const s = Math.min(fw, fh), sx = cx - s / 2, sy = cy - s / 2, a = s * 0.2, hb = [sx + s * .2, cy - a / 2, s * .6, a], vb = [cx - a / 2, sy + s * .2, a, s * .6];
    const cross = G.union([G.rect(...hb), G.rect(...vb)]);
    out.push(cobj('Drapeau CH rouge', G.diff([G.rect(sx, sy, s, s)], cross), layerForColor('#d71920')), cobj('Drapeau CH croix', cross, layerForColor('#ffffff'))); return out;
  }
  const r = F.r || [1 / 3, 1 / 3, 1 / 3]; let acc = 0;
  F.c.forEach((col, i) => { const f = r[i]; const rg = F.v ? G.rect(x0 + acc * fw, y0, f * fw, fh) : G.rect(x0, y0 + acc * fh, fw, f * fh); acc += f; out.push(cobj('Drapeau ' + code + ' ' + (i + 1), [rg], layerForColor(col))); });
  return out;
}
/** étiquette « drapeau + NOM + groupe sanguin » centrée en (cx,cy) */
function nameTag(o) {
  const gid = 'k' + nid(); let size = o.size;
  const meas = s => {
    const tw = G.bbox(textRings(o.name, o.font, s, 2, o.style === 'italique' ? 8 : 0, 'left')).w, fw = s * 1.45, gap = s * 0.45, bt = o.blood ? G.bbox(textRings(o.blood, o.font, s * 0.8, 1, 0, 'left')).w : 0, pad = s * 0.38, bw = bt + pad * 2;
    return { tw, fw, gap, bt, pad, bw, total: (o.flag ? fw + gap : 0) + tw + (o.blood ? gap + bw : 0) };
  };
  let m = meas(size); if (m.total > o.maxW) { size *= o.maxW / m.total; m = meas(size); }
  const out = []; let x = o.cx - m.total / 2; const rotPt = px => o.rot === 180 ? 2 * o.cx - px : px;
  const place = (ob, px, py) => { ob.x = rotPt(px); ob.y = py; if (o.rot) ob.rot = o.rot; ob.gid = gid; out.push(ob); };
  if (o.flag && FLAGS[o.flagCode]) { const fo = flagObjs(o.flagCode, 0, 0, m.fw, size * 1.0); fo.forEach(f => { f.x = rotPt(x + m.fw / 2 + f.x); f.y = o.cy + f.y; if (o.rot) f.rot = o.rot; f.gid = gid; out.push(f); }); x += m.fw + m.gap; }
  const styleText = (t, s) => {
    if (o.style === 'contour') { const w = G.union(t.rings), h = G.diff(w, G.offset(w, -Math.max(2.5, s * 0.07))); t.rings = h; t.lb = G.bbox(h); }
    return t;
  };
  const addText = (str, s, px, track, layer) => {
    const t = textObj(str, o.font, s, track, o.style === 'italique' ? 8 : 0, 'center', layer, { x: 0, y: 0 }); if (!t) return;
    styleText(t, s); t.name = 'Nom « ' + str + ' »';
    if (o.style === 'ombre' && o.sl) { const sh = textObj(str, o.font, s, track, o.style === 'italique' ? 8 : 0, 'center', o.sl, { x: 0, y: 0 }); const d = Math.max(2.5, s * 0.09); if (sh) { sh.name = 'Ombre « ' + str + ' »'; place(sh, px + d, o.cy + d); } }
    place(t, px, o.cy);
  };
  addText(o.name, size, x + m.tw / 2, 2, o.tl);
  x += m.tw;
  if (o.blood) {
    x += m.gap; const h = size * 1.5, t = Math.max(3, size * 0.09), w = m.bw;
    const ring = G.diff([G.roundRect(-w / 2, -h / 2, w, h, size * 0.3)], [G.roundRect(-w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t, size * 0.3 - t)]);
    place(cobj('Cadre groupe sanguin', ring, o.tl), x + w / 2, o.cy);
    addText(o.blood, size * 0.8, x + w / 2, 1, o.tl);
  }
  return out;
}
function readKit() {
  const g = id => { const e = $('#' + id); return e ? e.value : ''; };
  return { pilot: g('k_pilot'), copilot: g('k_copilot'), bp: g('k_bp'), bc: g('k_bc'), fp: g('k_fp'), fc: g('k_fc'), font: g('k_font') || 'RussoOne', size: parseFloat(g('k_size')) || 62, style: g('k_style'), flag: $('#k_flag').checked, blood: $('#k_blood').checked, pilotSide: g('k_side'), band: $('#k_band').checked, tl: g('k_tl'), sl: g('k_sl'), bl: g('k_bl') };
}
function addNameKit(target) {
  const v = V(), R = REG(), { L, H, W } = v, K = readKit(), out = [];
  const base = (who, extra) => Object.assign({ name: who === 'p' ? K.pilot : K.copilot, blood: K.blood ? (who === 'p' ? K.bp : K.bc) : '', flag: K.flag, flagCode: who === 'p' ? K.fp : K.fc, font: K.font, style: K.style, tl: K.tl, sl: K.sl, size: K.size, rot: 0 }, extra);
  const pSide = K.pilotSide, cSide = pSide === 'left' ? 'right' : 'left';
  if (target === 'vitres' || target === 'portes') {
    const win = target === 'vitres';
    for (const sd of ['left', 'right']) {
      const who = sd === pSide ? 'p' : 'c', r = R[sd], gx = win ? (v.door[1] + v.door[2]) / 2 + 100 : (v.door[0] + v.door[1]) / 2, cx = sd === 'left' ? r.x + gx : r.x + (L - gx);
      const cy = r.y + H - v.belt + (win ? -70 : 90), maxW = (win ? v.door[2] - v.door[1] : v.door[1] - v.door[0]) * 0.85;
      if (!base(who).name) continue; out.push(...nameTag(base(who, { cx, cy, maxW, size: K.size * (win ? 1 : 0.85) })));
    }
  } else if (target === 'parebrise') {
    const r = R.top, ybn = v.ws[0] + 150, bw = halfWidth(v, ybn) * 2 * .8, bh = K.size * 2.3, cx = r.x + W / 2, cy = r.y + ybn;
    if (K.band && K.bl) out.push(cobj('Bandeau pare-brise', [G.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.15)], K.bl, { gid: 'k' + nid() }));
    // lu depuis l'avant : le copilote est à gauche (côté pilote = gauche voiture => à droite pour l'observateur)
    const left = pSide === 'left' ? 'c' : 'p', right = pSide === 'left' ? 'p' : 'c';
    [[left, -1], [right, 1]].forEach(([who, s]) => { if (base(who).name) out.push(...nameTag(base(who, { cx: cx + s * bw / 4, cy, maxW: bw / 2 * 0.9, rot: 180, size: K.size * 0.9 }))); });
  } else if (target === 'lunette') {
    const r = R.rear, cy = r.y + H * 0.3, cx = r.x + W / 2, left = pSide === 'left' ? 'p' : 'c', right = pSide === 'left' ? 'c' : 'p';
    [[left, -1], [right, 1]].forEach(([who, s]) => { if (base(who).name) out.push(...nameTag(base(who, { cx: cx + s * W * 0.2, cy, maxW: W * 0.36, size: K.size * 0.8 }))); });
  }
  if (!out.length) { toast('Rien à ajouter : saisissez au moins un nom.'); return; }
  S.objs.push(...out); S.sel = new Set(out.map(o => o.id)); commit(); toast('Ajouté (' + out.length + ' éléments, groupés par étiquette). Vérifiez les couleurs/calques.');
}
function addNumbers(opt) { // ronds de porte + numéro, numéro de toit, numéro de capot
  const v = V(), R = REG(), { L, H, W } = v, out = [], num = opt.num || '12', light = opt.light, dark = opt.dark;
  const dd = Math.min(v.id === 'truck' ? 640 : 380, (v.belt - v.clear) * .55);
  if (opt.doors) {
    const rcx = (v.door[0] + v.door[1]) / 2, rcy = H - (v.belt + v.clear) / 2 + 10;
    for (const sd of ['left', 'right']) {
      const r = R[sd], x = sd === 'left' ? r.x + rcx : r.x + (L - rcx), y = r.y + rcy;
      const disc = opt.panel ? cobj('Panneau de porte', [G.roundRect(x - dd * .7, y - dd * .48, dd * 1.4, dd * .96, dd * .09)], light) : shapeObj('ellipse', dd, dd, light, { x, y }); disc.name = opt.panel ? 'Panneau de porte' : 'Rond de porte'; disc.gid = 'rd' + sd + nid();
      const t = textObj(String(num), 'Anton', dd * .5, 0, 0, 'center', dark, { x, y });
      if (t) { t.gid = disc.gid; t.name = 'N° ' + num; if (S.layers.findIndex(l => l.id === dark) < S.layers.findIndex(l => l.id === light)) punch(disc, t); out.push(disc, t); }
    }
  }
  if (opt.roof && v.rg[0] - v.ws[1] > 300) {
    const r = R.top, y = (v.ws[1] + v.rg[0]) / 2, rn = textObj(String(num), 'Anton', Math.min(W * .34, (v.rg[0] - v.ws[1]) * .4), 0, 0, 'center', dark, { x: r.x + W / 2, y: r.y + y });
    if (rn) { rn.rot = -90; rn.name = 'N° toit'; out.push(rn); }
  }
  if (opt.hood && v.ws[0] > 500) {
    const r = R.top, y = v.ws[0] * 0.48, hn = textObj(String(num), 'Anton', Math.min(W * .26, v.ws[0] * .3), 0, 0, 'center', dark, { x: r.x + W / 2, y: r.y + y });
    if (hn) { hn.rot = -90; hn.name = 'N° capot'; out.push(hn); }
  }
  if (!out.length) return; S.objs.push(...out); S.sel = new Set(out.map(o => o.id)); commit();
}
function addSponsorStrip(str, layer) {
  const v = V(), R = REG(), { L, H } = v, out = [], x0 = v.wheels[0].x + v.wheels[0].r + 90, x1 = v.wheels[1].x - v.wheels[1].r - 90;
  for (const sd of ['left', 'right']) {
    const r = R[sd], sp = textObj(str || 'PARTENAIRE 1  ·  PARTENAIRE 2', 'BebasNeue', Math.max(36, (v.belt - v.clear) * .07), 5, 0, 'center', layer, { x: sd === 'left' ? r.x + (x0 + x1) / 2 : r.x + (L - (x0 + x1) / 2), y: r.y + H - v.clear - 105 });
    if (sp) { const bb = G.bbox(sp.rings); if (bb.w > x1 - x0) sp.sx = sp.sy = (x1 - x0) / bb.w; sp.name = 'Sponsors bas de caisse'; sp.clip = 'body'; out.push(sp); }
  }
  if (out.length) { S.objs.push(...out); S.sel = new Set(out.map(o => o.id)); commit(); }
}
