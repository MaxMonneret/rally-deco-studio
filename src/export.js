/* ===== export.js : préparation de la découpe (par couleur) et fichiers PDF / AI / SVG / ZIP ===== */
'use strict';
const EXP = { seams: false, seamW: 3, islands: false, islandGap: 60, roll: 600, margin: 15, gap: 16, overlap: 12, marks: true, mirror: false, cutOnly: false, knock: false, trap: 0.8, tile: true };

function layerRaw() { // anneaux monde par calque (union)
  const raw = {};
  for (const L of S.layers) {
    let rs = []; for (const o of S.objs) if (o.layer === L.id && !o.hide) rs = rs.concat(cRings(o));
    raw[L.id] = rs.length ? G.union(rs) : [];
  }
  if (EXP.seams) { const sc = seamCuts(); if (sc.length) for (const k in raw) if (raw[k].length) raw[k] = G.diff(raw[k], sc); }
  return raw;
}
/** joints de portières : fines coupures verticales pour poser chaque panneau séparément (pas de vinyle à cheval sur un joint) */
function seamCuts() {
  const v = V(), R = REG(), out = [], w = EXP.seamW || 3, y0 = v.H - v.belt + 10, y1 = v.H - v.clear - 40;
  for (const sd of ['left', 'right']) for (const x of v.door) { const cx = sd === 'left' ? R[sd].x + x : R[sd].x + (v.L - x); out.push(G.rect(cx - w / 2, R[sd].y + y0, w, y1 - y0)); }
  return out;
}
/** "réserves" : zone couverte par les couleurs du dessus, réduite du recouvrement => à évider dans la couleur du dessous */
function layerHoles() {
  const raw = layerRaw(), holes = {}; let acc = [];
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i];
    holes[L.id] = (EXP.knock && acc.length) ? (EXP.trap > 0 ? G.offset(acc, -EXP.trap) : acc) : null;
    if (raw[L.id].length) acc = G.union(acc.concat(raw[L.id]));
  }
  return holes;
}
/** une "pièce de pose" = un groupe d'objets (motif, texte, logo…) d'une même couleur */
function layerGroups(L, holes) {
  const map = new Map();
  for (const o of S.objs) { if (o.layer !== L.id || o.hide) continue; const k = o.gid || o.id; if (!map.has(k)) map.set(k, { name: o.name, rings: [] }); map.get(k).rings.push(...cRings(o)); }
  const R = REG(), out = [];
  for (const g of map.values()) {
    let rings = g.rings.length ? G.union(g.rings) : []; if (holes && holes[L.id]) rings = G.diff(rings, holes[L.id]);
    const b = G.bbox(rings); if (!b) continue;
    const view = viewAt(b.cx, b.cy, 300); const r = view && R[view];
    out.push({ name: g.name, rings, view, pos: r ? [b.x0 - r.x, b.y0 - r.y] : [b.x0, b.y0] });
  }
  return out;
}
function layerGeo() { const holes = layerHoles(), geo = {}; for (const L of S.layers) { let rs = []; layerGroups(L, holes).forEach(g => rs = rs.concat(g.rings)); geo[L.id] = rs.length ? G.union(rs) : []; } return geo; }
function rotLong(rings, b) { return G.xf(rings, [0, -1, 1, 0, -b.y0, b.x1]); } // x' = y-y0 ; y' = x1-x

/** regroupe les anneaux proches (écart < gap mm) en îlots */
function clusters(rings, gap) {
  const bbs = rings.map(r => G.bbox([r])), n = rings.length, par = Array.from({ length: n }, (_, i) => i);
  const f = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = bbs[i], b = bbs[j]; if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) par[f(i)] = f(j); }
  const m = new Map(); rings.forEach((r, i) => { const k = f(i); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return [...m.values()];
}
function groupPieces(g) {
  const usable = EXP.roll - 2 * EXP.margin, out = [];
  if (EXP.islands && !g._sub && g.rings.length > 1) {
    const cl = clusters(g.rings, EXP.islandGap);
    if (cl.length > 1) { cl.forEach((c, i) => out.push(...groupPieces({ name: g.name + ' ilot ' + (i + 1) + '/' + cl.length, rings: c, view: g.view, _sub: true }))); return out; }
  }
  const b = G.bbox(g.rings), R0 = g.view && REG()[g.view], pos = R0 ? [b.x0 - R0.x, b.y0 - R0.y] : [b.x0, b.y0];
  const where = (g.view ? VIEW_NAMES[g.view] + ' ' : '') + '(' + Math.round(pos[0]) + ',' + Math.round(pos[1]) + ')';
  const rotated = b.w > b.h; const rr = rotated ? rotLong(g.rings, b) : G.xf(g.rings, [1, 0, 0, 1, -b.x0, -b.y0]);
  const w = rotated ? b.h : b.w, hh = rotated ? b.w : b.h;
  const nm = g.name.replace(/ ·\d$/, '');
  if (w <= usable || !EXP.tile) { out.push({ label: nm + ' - ' + where + (rotated ? ' [tourne 90]' : ''), rings: rr, w, h: hh }); return out; }
  const step = usable - EXP.overlap, n = Math.ceil((w - EXP.overlap) / step);
  for (let i = 0; i < n; i++) {
    const s0 = i * step, s1 = Math.min(w, s0 + usable);
    const c = G.inter(rr, [G.rect(s0, -1, s1 - s0, hh + 2)]); if (!c.length) continue;
    const bb = G.bbox(c), y0 = Math.max(0, bb.y0 - 6), y1 = Math.min(hh, bb.y1 + 6);
    out.push({ label: nm + ' - bande ' + (i + 1) + '/' + n + ' ' + where + ' [long. ' + Math.round(y0) + ' mm]', rings: G.xf(c, [1, 0, 0, 1, -s0, -y0]), w: s1 - s0, h: y1 - y0, tile: true });
  }
  return out;
}
function packPieces(pieces) {
  const usable = EXP.roll - 2 * EXP.margin, head = 16; pieces.sort((a, b) => b.h - a.h);
  const shelves = []; let y = 0;
  for (const p of pieces) {
    let sh = shelves.find(s => s.x + p.w + EXP.gap <= usable + 0.001 && p.h <= s.h + 0.001);
    if (!sh) { sh = { y, h: p.h, x: 0 }; shelves.push(sh); y += p.h + EXP.gap + 9; }
    p.px = EXP.margin + sh.x; p.py = EXP.margin + head + 9 + sh.y; sh.x += p.w + EXP.gap;
  }
  const pageH = EXP.margin + head + y + EXP.margin - EXP.gap;
  return { pageW: EXP.roll, pageH: Math.max(pageH, 120) };
}
/** prépare tout pour un calque */
function prepLayer(L, holes) {
  const groups = layerGroups(L, holes); if (!groups.length) return null;
  let pieces = []; groups.forEach(g => pieces.push(...groupPieces(g)));
  const pg = packPieces(pieces);
  const placed = pieces.map(p => ({ label: p.label, x: p.px, y: p.py, w: p.w, h: p.h, rings: G.xf(p.rings, [1, 0, 0, 1, p.px, p.py]) }));
  let all = [], flat = []; placed.forEach(p => all = all.concat(p.rings)); groups.forEach(g => flat = flat.concat(g.rings));
  return {
    layer: L, pageW: pg.pageW, pageH: pg.pageH, placed, rings: all,
    area: G.area(G.union(flat)) / 1e6, cut: G.perimeter(flat) / 1000, pieces: placed.length, vinyl: pg.pageW * pg.pageH / 1e6,
    wide: placed.some(p => p.w > EXP.roll - 2 * EXP.margin + 0.5)
  };
}
function allPrepped() { const holes = layerHoles(); return S.layers.map(L => prepLayer(L, holes)).filter(Boolean); }

function layerPdf(ls, idx) {
  const { pageW: W, pageH: Hh } = ls, mir = EXP.mirror ? W : 0, c = hexRGB(ls.layer.color);
  let s = '';
  // en-tête + infos (texte)
  const title = `${S.name}  |  ${V().name}  |  Couleur ${String(idx + 1).padStart(2, '0')} : ${ls.layer.name}  |  Echelle 1:1  |  Rouleau ${EXP.roll} mm` + (EXP.mirror ? '  |  MIROIR' : '');
  const txt = (x, y, str, size, bold) => { const wEst = str.length * size * 0.5 / MM2PT; const xx = mir ? W - x - wEst : x; return 'BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf 0 0 0 rg 1 0 0 1 ' + f2(xx * MM2PT) + ' ' + f2((Hh - y) * MM2PT) + ' Tm ' + pdfStr(str) + ' Tj ET\n'; };
  s += txt(EXP.margin, 9, title, 7, true);
  s += txt(EXP.margin, 14.5, `${ls.pieces} piece(s)  -  surface ${ls.area.toFixed(2)} m2  -  trait de coupe: ${ls.cut.toFixed(1)} m  -  ligne magenta "CutContour" = decoupe`, 6, false);
  // repères
  if (EXP.marks) { s += '0 0 0 RG 0.3 w\n'; for (const m of [[7, 7], [W - 7, 7], [7, Hh - 7], [W - 7, Hh - 7]]) s += regMark(m[0], m[1], Hh, mir); }
  // pièces : cadre léger + étiquette
  for (const p of ls.placed) {
    s += txt(p.x, p.y - 2.5, `${p.label}  (${p.w.toFixed(0)} x ${p.h.toFixed(0)} mm)`, 5.5, false);
  }
  // géométrie
  const ops = ringsToOps(ls.rings, Hh, mir);
  if (EXP.cutOnly) s += '/CS0 CS 1 SCN 0.25 w\n' + ops + 'S\n';
  else s += c[0].toFixed(3) + ' ' + c[1].toFixed(3) + ' ' + c[2].toFixed(3) + ' rg /CS0 CS 1 SCN 0.25 w\n' + ops + 'B\n';
  const doc = new PDFDoc(`${S.name} - ${ls.layer.name}`); doc.addPage(W, Hh, s); return doc.build();
}
function layerSvg(ls, idx) {
  const marks = EXP.marks ? [[7, 7], [ls.pageW - 7, 7], [7, ls.pageH - 7], [ls.pageW - 7, ls.pageH - 7]] : null;
  return svgFile({ w: ls.pageW, h: ls.pageH, rings: ls.rings, color: ls.layer.color, name: ls.layer.name, mirror: EXP.mirror, title: `${S.name} - ${ls.layer.name}`, marks, cutOnly: EXP.cutOnly });
}

/* ----- planche d'aperçu (vectorielle) + vues 3D ----- */
function previewPdf(withShots) {
  const geo = layerGeo(), v = V(), R = REG(), tot = R.total;
  const pw = 420, ph = 297, doc = new PDFDoc(S.name + ' - Apercu');
  let s = ''; const m = 12, top = 24;
  const k = Math.min((pw - 2 * m) / tot.w, (ph - top - m - 20) / tot.h);
  const ox = m + ((pw - 2 * m) - tot.w * k) / 2, oy = top;
  const X = rings => G.xf(rings, [k, 0, 0, k, ox, oy]);
  const T = (x, y, str, size, bold, rgb) => 'BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + (rgb || '0 0 0') + ' rg 1 0 0 1 ' + f2(x * MM2PT) + ' ' + f2((ph - y) * MM2PT) + ' Tm ' + pdfStr(str) + ' Tj ET\n';
  s += T(m, 12, S.name, 18, true) + T(m, 19, `${v.name}  -  ${v.L} x ${v.W} x ${v.H} mm  -  planche a l'echelle 1:${Math.round(1 / k)}`, 8, false, '0.35 0.35 0.35');
  for (const vk of VIEWS) {
    const r = R[vk], g = viewGeom(v, vk);
    const body = G.xf(g.body, [1, 0, 0, 1, r.x, r.y]);
    s += (hexRGB(S.paint).map(x => x.toFixed(3)).join(' ')) + ' rg 0.3 0.3 0.3 RG 0.35 w\n' + ringsToOps(X(body), ph, 0) + 'B\n';
    const gl = G.xf(g.glass, [1, 0, 0, 1, r.x, r.y]); s += '0.62 0.72 0.8 rg 0.3 0.3 0.3 RG 0.25 w\n' + ringsToOps(X(gl), ph, 0) + 'B\n';
    if (vk === 'left' || vk === 'right') for (const w of g.wheels) { const wc = X(G.xf([G.circle(w.cx, w.cy, w.r, 48)], [1, 0, 0, 1, r.x, r.y])); s += '0.12 0.12 0.13 rg\n' + ringsToOps(wc, ph, 0) + 'f\n'; const rc = X(G.xf([G.circle(w.cx, w.cy, w.r * .6, 36)], [1, 0, 0, 1, r.x, r.y])); s += '0.7 0.72 0.75 rg\n' + ringsToOps(rc, ph, 0) + 'f\n'; }
  }
  for (const L of S.layers) { const rg = geo[L.id]; if (!rg || !rg.length || !L.vis) continue; const c = hexRGB(L.color); s += c.map(x => x.toFixed(3)).join(' ') + ' rg 0.5 0.5 0.5 RG 0.12 w\n' + ringsToOps(X(rg), ph, 0) + 'B\n'; }
  for (const vk of VIEWS) { const r = R[vk]; s += T(ox + r.x * k, oy + r.y * k - 2, VIEW_NAMES[vk], 6.5, false, '0.4 0.4 0.4'); }
  // légende
  let lx = m; const ly = ph - 12;
  S.layers.forEach((L, i) => { const c = hexRGB(L.color), st = geoStat(L, geo); s += c.map(x => x.toFixed(3)).join(' ') + ' rg 0.3 0.3 0.3 RG 0.3 w ' + f2(lx * MM2PT) + ' ' + f2((ph - ly - 3.2) * MM2PT) + ' ' + f2(5 * MM2PT) + ' ' + f2(5 * MM2PT) + ' re B\n'; s += T(lx + 7, ly, `${i + 1}. ${L.name} - ${st.toFixed(2)} m2`, 8, false); lx += 62; });
  const images = [];
  doc.addPage(pw, ph, s);
  if (withShots && T3.ready) {
    const shots = [['34av', '3/4 avant'], ['34ar', '3/4 arriere'], ['gauche', 'Cote gauche'], ['face', 'Face avant']];
    let s2 = T(m, 12, S.name + ' - Rendu 3D', 16, true), imgs = [];
    const cw = (pw - 3 * m) / 2, ch = (ph - top - 2 * m) / 2;
    shots.forEach((sh, i) => {
      const px = 1400, py = Math.round(1400 * ch / cw), url = shot3D(px, py, sh[0]); const b = atob(url.split(',')[1]), u8 = new Uint8Array(b.length); for (let j = 0; j < b.length; j++) u8[j] = b.charCodeAt(j);
      const nm = 'Im' + i, x = m + (i % 2) * (cw + m), y = top + Math.floor(i / 2) * (ch + m);
      imgs.push({ name: nm, bytes: u8, w: px, h: py });
      s2 += 'q ' + f2(cw * MM2PT) + ' 0 0 ' + f2(ch * MM2PT) + ' ' + f2(x * MM2PT) + ' ' + f2((ph - y - ch) * MM2PT) + ' cm /' + nm + ' Do Q\n' + T(x + 2, y + ch - 3, sh[1], 8, true, '1 1 1');
    });
    doc.addPage(pw, ph, s2, imgs); camPreset('34av');
  }
  return doc.build();
}
function geoStat(L, geo) { return G.area(geo[L.id] || []) / 1e6; }

/* ----- ZIP complet ----- */
function exportZip() {
  const pre = allPrepped(); const files = []; const base = slug(S.name);
  pre.forEach((ls, i) => {
    const n = String(i + 1).padStart(2, '0') + '_' + slug(ls.layer.name);
    const pdf = layerPdf(ls, i); files.push({ name: `${base}/decoupe/${n}.pdf`, data: pdf }, { name: `${base}/decoupe/${n}.ai`, data: pdf }, { name: `${base}/decoupe/${n}.svg`, data: enc.encode(layerSvg(ls, i)) });
  });
  files.push({ name: `${base}/Apercu_client.pdf`, data: previewPdf(T3.ready) });
  files.push({ name: `${base}/projet.rallydeco.json`, data: enc.encode(snapshot()) });
  let txt = `Rally Deco Studio - ${S.name}\nVehicule : ${V().name}\nRouleau : ${EXP.roll} mm - marge ${EXP.margin} mm - recouvrement des bandes ${EXP.overlap} mm\n\n`;
  pre.forEach((ls, i) => txt += `${i + 1}. ${ls.layer.name} (${ls.layer.color}) : ${ls.pieces} pieces, ${ls.area.toFixed(2)} m2 utiles, vinyle ~ ${ls.vinyl.toFixed(2)} m2 (${(ls.pageH / 1000).toFixed(2)} m lineaire), coupe ${ls.cut.toFixed(1)} m\n`);
  txt += `\nFichiers .ai = PDF vectoriel compatible Illustrator (si besoin renommer en .pdf). Trait magenta "CutContour" = ligne de decoupe (Roland/Graphtec/Summa).\n`;
  files.push({ name: `${base}/LISEZMOI.txt`, data: enc.encode(txt) });
  download(makeZip(files), `${base}_decoupe.zip`, 'application/zip');
}
function saveProject() { download(enc.encode(snapshot()), slug(S.name) + '.rallydeco.json', 'application/json'); }
