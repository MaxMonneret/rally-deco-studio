/* ===== ui.js : panneaux, boîtes de dialogue, démarrage ===== */
'use strict';
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else if (k === 'html') e.innerHTML = attrs[k]; else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const layerOpts = sel => S.layers.map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${l.name}</option>`).join('');

/* ---------- calques ---------- */
function refreshLayers() {
  const box = $('#layers'); box.innerHTML = '';
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i], n = S.objs.filter(o => o.layer === L.id).length;
    const row = h('div', { class: 'lrow' + (S.objs.some(o => o.layer === L.id && S.sel.has(o.id)) ? ' hasSel' : '') },
      h('button', { class: 'ic', title: 'Afficher / masquer', onclick: () => { L.vis = !L.vis; refreshLayers(); draw(); schedule3D(); } }, L.vis ? '👁' : '·'),
      h('button', { class: 'ic', title: 'Verrouiller', onclick: () => { L.lock = !L.lock; refreshLayers(); } }, L.lock ? '🔒' : '🔓'),
      h('input', { type: 'color', value: L.color, onchange: e => { L.color = e.target.value; commit(); } }),
      h('input', { class: 'lname', value: L.name, onchange: e => { L.name = e.target.value || L.name; commit(); } }),
      h('span', { class: 'cnt', title: 'Nombre d\'objets' }, n),
      h('button', { class: 'ic', title: 'Sélectionner les objets', onclick: () => setSel(S.objs.filter(o => o.layer === L.id).map(o => o.id)) }, '◎'),
      h('button', { class: 'ic', title: 'Monter (au-dessus)', onclick: () => { if (i < S.layers.length - 1) { [S.layers[i], S.layers[i + 1]] = [S.layers[i + 1], S.layers[i]]; commit(); } } }, '▲'),
      h('button', { class: 'ic', title: 'Descendre', onclick: () => { if (i > 0) { [S.layers[i], S.layers[i - 1]] = [S.layers[i - 1], S.layers[i]]; commit(); } } }, '▼'),
      h('button', { class: 'ic', title: 'Supprimer la couleur et ses objets', onclick: () => { if (n && !confirm(`Supprimer « ${L.name} » et ses ${n} objets ?`)) return; S.objs = S.objs.filter(o => o.layer !== L.id); S.layers.splice(i, 1); commit(); } }, '✕'));
    box.append(row);
  }
  // sélecteur de couleurs vinyle
  const add = $('#addLayerSel'); if (!add.options.length) { VINYL.forEach(v => add.append(h('option', { value: v[1] }, v[0]))); }
  $$('select.layerSel').forEach(s => { const cur = s.value; s.innerHTML = layerOpts(cur || (S.layers[0] && S.layers[0].id)); if (cur && layerById(cur)) s.value = cur; });
}

/* ---------- propriétés ---------- */
function selObjs() { return [...S.sel].map(objById).filter(Boolean); }
function refreshProps() {
  const box = $('#props'), os = selObjs(); box.innerHTML = '';
  if (!os.length) { box.append(h('p', { class: 'hint' }, 'Cliquez un élément sur la planche pour le modifier.\nShift = multi-sélection · Alt+clic = objet seul · Espace+glisser = déplacer la vue · molette = zoom · F = tout voir.')); return; }
  const o = os[0], multi = os.length > 1;
  const f = (lab, id, val, step = 1) => h('label', { class: 'f' }, lab, h('input', { id, type: 'number', step, value: val, onchange: applyProps }));
  box.append(h('div', { class: 'ptitle' }, multi ? `${os.length} objets sélectionnés` : o.name));
  if (!multi) box.append(h('input', { id: 'p_name', value: o.name, onchange: applyProps }));
  box.append(h('label', { class: 'f' }, 'Couleur (calque)', h('select', { id: 'p_layer', class: 'layerSel', html: layerOpts(o.layer), onchange: applyProps })));
  if (!multi) {
    const b = G.bbox(wRings(o)) || { cx: 0, cy: 0, w: 0, h: 0 };
    box.append(h('div', { class: 'grid2' }, f('X centre (mm)', 'p_x', 0), f('Y centre (mm)', 'p_y', 0), f('Largeur (mm)', 'p_w', 0), f('Hauteur (mm)', 'p_h', 0), f('Rotation °', 'p_rot', 0, 1)));
    box.append(h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'p_lock', onchange: e => { S.lockRatio = e.target.checked; } }), 'Proportions liées'));
    $('#p_lock').checked = S.lockRatio !== false; refreshPropsValues();
  }
  box.append(h('label', { class: 'f' }, 'Ajuster à la carrosserie', h('select', { id: 'p_clip', onchange: applyProps, html: `<option value="none">Non (libre)</option><option value="body">Oui – coupe aux contours + passages de roue</option><option value="noglass">Oui – et sans vitres</option>` })));
  $('#p_clip').value = o.clip;
  box.append(h('div', { class: 'btnrow' },
    h('button', { onclick: () => dupSel() }, 'Dupliquer'), h('button', { onclick: mirrorSel, title: 'Copie en miroir sur le côté opposé (gauche ↔ droite) ou symétrique' }, 'Miroir G/D'),
    h('button', { onclick: () => { for (const x of os) x.fx = !x.fx; commit(); } }, '⇋ Retourner'),
    h('button', { onclick: () => { for (const x of os) { x.rot += 180; x.fx = !x.fx; } commit(); } }, '⇵ Retourner V'),
    h('button', { onclick: () => reorder(1) }, 'Avancer'), h('button', { onclick: () => reorder(-1) }, 'Reculer'),
    h('button', { onclick: () => { const g = 'g' + nid(); os.forEach(x => x.gid = g); commit(); toast('Objets groupés'); } }, 'Grouper'),
    h('button', { onclick: () => { os.forEach(x => x.gid = null); commit(); } }, 'Dissocier'),
    h('button', { class: 'danger', onclick: delSel }, 'Supprimer')));
  box.append(h('div', { class: 'ptitle small' }, 'Contour / liseré'),
    h('div', { class: 'btnrow' }, h('input', { id: 'halo_d', type: 'number', value: 4, step: 0.5, style: 'width:70px' }), h('span', {}, 'mm'), h('select', { id: 'halo_l', class: 'layerSel', html: layerOpts(S.layers[0] && S.layers[0].id) }),
      h('button', { onclick: () => haloSel(parseFloat($('#halo_d').value) || 4, $('#halo_l').value) }, 'Créer')));
  const lo = (id) => h('select', { id, class: 'layerSel', html: layerOpts(S.layers[0] && S.layers[0].id) });
  box.append(h('div', { class: 'ptitle small' }, 'Effets design (aplats, sans dégradé)'),
    h('div', { class: 'hint' }, 'Ombre portée : copie décalée dans une couleur du dessous.'),
    h('div', { class: 'btnrow' }, h('input', { id: 'sh_dx', type: 'number', value: 10, style: 'width:56px', title: 'décalage X mm' }), h('input', { id: 'sh_dy', type: 'number', value: 10, style: 'width:56px', title: 'décalage Y mm' }), lo('sh_l'), h('button', { onclick: () => shadowSel(parseFloat($('#sh_dx').value) || 0, parseFloat($('#sh_dy').value) || 0, $('#sh_l').value) }, 'Ombre')),
    h('div', { class: 'hint' }, 'Liseré intérieur : trait fin parallèle au bord (écart · épaisseur mm).'),
    h('div', { class: 'btnrow' }, h('input', { id: 'in_g', type: 'number', value: 8, style: 'width:56px' }), h('input', { id: 'in_w', type: 'number', value: 6, style: 'width:56px' }), lo('in_l'), h('button', { onclick: () => inlineSel(parseFloat($('#in_g').value) || 6, parseFloat($('#in_w').value) || 5, $('#in_l').value) }, 'Liseré')),
    h('div', { class: 'hint' }, 'Série : n copies décalées (traînée de vitesse).'),
    h('div', { class: 'btnrow' }, h('input', { id: 'rp_n', type: 'number', value: 3, style: 'width:46px' }), h('input', { id: 'rp_x', type: 'number', value: -60, style: 'width:56px', title: 'pas X mm' }), h('input', { id: 'rp_y', type: 'number', value: 0, style: 'width:56px', title: 'pas Y mm' }), h('input', { id: 'rp_s', type: 'number', value: 0.85, step: 0.05, style: 'width:56px', title: 'échelle par copie' }), h('button', { onclick: () => repeatSel(parseInt($('#rp_n').value) || 3, parseFloat($('#rp_x').value) || 0, parseFloat($('#rp_y').value) || 0, parseFloat($('#rp_s').value) || 1) }, 'Répéter')),
    h('div', { class: 'hint' }, 'Épurer : retire les détails trop fins pour le vinyle monocouche (pelage).'),
    h('div', { class: 'btnrow' }, h('input', { id: 'cl_w', type: 'number', value: 4, step: 0.5, style: 'width:56px' }), h('span', {}, 'mm mini'), h('button', { onclick: () => cleanSel(parseFloat($('#cl_w').value) || 4) }, 'Épurer')));
  if (!multi && o.src && o.src.kind === 'text') {
    const s = o.src;
    box.append(h('div', { class: 'ptitle small' }, 'Texte'),
      h('textarea', { id: 't_str', rows: 2, onchange: applyText }, s.str),
      h('div', { class: 'grid2' }, h('label', { class: 'f' }, 'Police', h('select', { id: 't_font', onchange: applyText, html: FONT_LIST.map(f => `<option value="${f[0]}" ${f[0] === s.font ? 'selected' : ''}>${f[1]}</option>`).join('') })),
        f('Hauteur capitale mm', 't_size', s.size), f('Espacement', 't_track', s.track, 0.5), f('Inclinaison °', 't_skew', s.skew, 1)));
    ['t_size', 't_track', 't_skew'].forEach(id => $('#' + id).onchange = applyText);
  }
  if (!multi && o.src && o.src.kind === 'gen') box.append(h('div', { class: 'btnrow' }, h('button', { onclick: () => regenSel() }, '🎲 Nouvelle variante')));
}
function regenSel() {
  const os = selObjs(); const o = os[0]; if (!o || !o.src || o.src.kind !== 'gen') return;
  const grp = groupOf(o), s = o.src, seed = Math.floor(Math.random() * 1e6);
  const tiers = grp.map(g => g.layer), place = { x: o.x, y: o.y, rot: o.rot, fx: o.fx, sx: o.sx, sy: o.sy };
  const fresh = genGroup(s.gen, s.params, seed, s.w, s.h, tiers, place, o.clip, undefined);
  S.objs = S.objs.filter(x => !grp.includes(x)); S.objs.push(...fresh); S.sel = new Set(fresh.map(x => x.id)); commit();
}
function refreshPropsValues() {
  const o = selObjs()[0]; if (!o || !$('#p_x')) return; const b = G.bbox(cRingsOrW(o)) || { cx: o.x, cy: o.y, w: 0, h: 0 };
  $('#p_x').value = o.x.toFixed(1); $('#p_y').value = o.y.toFixed(1);
  $('#p_w').value = (o.lb.w * o.sx).toFixed(1); $('#p_h').value = (o.lb.h * o.sy).toFixed(1); $('#p_rot').value = (+o.rot).toFixed(1);
}
const cRingsOrW = o => wRings(o);
function applyProps() {
  const os = selObjs(); if (!os.length) return; const o = os[0];
  const L = $('#p_layer').value; os.forEach(x => x.layer = L);
  const cl = $('#p_clip').value; os.forEach(x => { x.clip = cl; x._ck = null; });
  if (os.length === 1) {
    o.name = $('#p_name').value || o.name; o.x = parseFloat($('#p_x').value); o.y = parseFloat($('#p_y').value); o.rot = parseFloat($('#p_rot').value) || 0;
    const w = parseFloat($('#p_w').value), hh = parseFloat($('#p_h').value), lock = $('#p_lock').checked;
    const sx0 = o.sx, sy0 = o.sy, sw = o.lb.w * o.sx, shh = o.lb.h * o.sy;
    if (w > 0 && Math.abs(w - sw) > 0.05) { o.sx = w / o.lb.w; if (lock) o.sy = sy0 * o.sx / sx0; }
    else if (hh > 0 && Math.abs(hh - shh) > 0.05) { o.sy = hh / o.lb.h; if (lock) o.sx = sx0 * o.sy / sy0; }
  }
  commit();
}
function applyText() {
  const o = selObjs()[0]; if (!o) return;
  regenText(o, { str: $('#t_str').value, font: $('#t_font').value, size: parseFloat($('#t_size').value) || 100, track: parseFloat($('#t_track').value) || 0, skew: parseFloat($('#t_skew').value) || 0, align: 'center' }); commit();
}

/* ---------- panneau gauche ---------- */
let curStyle = 'griffures', curGen = 'griffures';
function buildLeft() {
  // --- Déco auto
  const sl = $('#styleList'); sl.innerHTML = '';
  for (const k in STYLES) {
    const st = STYLES[k];
    sl.append(h('div', { class: 'style' + (k === curStyle ? ' on' : ''), onclick: () => { curStyle = k; buildLeft(); } },
      h('div', { class: 'sname' }, st.name), h('div', { class: 'sdots' }, st.pal.map(p => h('i', { style: 'background:' + p[1] }))), h('div', { class: 'sblurb' }, st.blurb)));
  }
  // --- Motifs
  const gl = $('#genList'); gl.innerHTML = '';
  for (const k in GENS) gl.append(h('button', { class: 'gbtn' + (k === curGen ? ' on' : ''), onclick: () => { curGen = k; buildLeft(); }, title: GENS[k].desc }, GENS[k].label));
  for (const k in SHAPES) gl.append(h('button', { class: 'gbtn sh' + (k === curGen ? ' on' : ''), onclick: () => { curGen = k; buildLeft(); } }, SHAPES[k].label));
  const pb = $('#genParams'); pb.innerHTML = '';
  const g = GENS[curGen];
  if (g) {
    for (const p in g.params) { const d = g.params[p]; pb.append(h('label', { class: 'f' }, d[0], h('input', { type: 'range', min: d[1], max: d[2], step: (d[2] - d[1]) > 20 ? 1 : 0.1, value: d[3], 'data-p': p, oninput: e => { e.target.nextSibling.textContent = e.target.value; } }), h('span', { class: 'rv' }, d[3]))); }
    const cs = h('div', { class: 'grid3' }); for (let i = 0; i < g.tiers; i++) cs.append(h('label', { class: 'f' }, 'Couleur ' + (i + 1), h('select', { class: 'layerSel', 'data-tier': i, html: layerOpts((S.layers[Math.min(i, S.layers.length - 1)] || {}).id) })));
    pb.append(cs);
  } else { pb.append(h('div', { class: 'grid3' }, h('label', { class: 'f' }, 'Couleur', h('select', { class: 'layerSel', 'data-tier': 0, html: layerOpts(S.layers[0] && S.layers[0].id) })))); }
  refreshLayers();
}
function genPlace(target, w, h2) {
  const v = V(), R = REG(), L = v.L, H = v.H, W = v.W, out = [];
  if (target === 'sides') { out.push({ x: R.left.x + L * .62, y: R.left.y + H * .55, fx: false, v: 'left' }); out.push({ x: R.right.x + L * .38, y: R.right.y + H * .55, fx: true, v: 'right' }); }
  else if (target === 'center') { const c = placeCenter(); out.push({ x: c[0], y: c[1], fx: false }); }
  else { const r = R[target]; out.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, fx: target === 'right', v: target }); }
  return out;
}
function insertPattern() {
  const target = $('#genTarget').value, v = V();
  const tiers = $$('#genParams [data-tier]').map(s => s.value); if (!tiers.length) { toast('Créez d\'abord une couleur'); return; }
  const params = {}; $$('#genParams [data-p]').forEach(i => params[i.dataset.p] = parseFloat(i.value));
  let w = parseFloat($('#genW').value), hh = parseFloat($('#genH').value);
  const seed = Math.floor(Math.random() * 1e6), clip = $('#genClip').checked ? 'body' : 'none';
  const places = genPlace(target, w, hh), out = [];
  if (GENS[curGen]) {
    for (const p of places) out.push(...genGroup(curGen, params, seed, w, hh, tiers, { x: p.x, y: p.y, fx: p.fx, rot: 0 }, clip));
  } else {
    places.forEach((p, i) => { const o = shapeObj(curGen, w, hh, tiers[0], { x: p.x, y: p.y }); o.clip = clip; if (i === 1) { o.fx = true; } out.push(o); });
  }
  addObjs(out); commit();
}
function insertText() {
  const str = $('#txtStr').value.trim(); if (!str) return;
  const target = $('#txtTarget').value; const font = $('#txtFont').value, size = parseFloat($('#txtSize').value) || 100;
  const layer = $('#txtLayer').value, out = [];
  const places = target === 'sides' ? [genPlace('left')[0], Object.assign(genPlace('right')[0], { fx: false })] : genPlace(target);
  places.forEach(p => { const t = textObj(str, font, size, parseFloat($('#txtTrack').value) || 0, parseFloat($('#txtSkew').value) || 0, 'center', layer, { x: p.x, y: p.y }); if (t) out.push(t); });
  addObjs(out); commit();
}
function importLogo(file) {
  const layer = $('#logoLayer').value, wmm = parseFloat($('#logoW').value) || 500;
  const place = placeCenter();
  const done = rings => {
    if (!rings.length) { toast('Aucun contour détecté (essayez Inverser ou un autre seuil)'); return; }
    const c = G.center(rings), k = wmm / c.w; const o = makeObj({ name: 'Logo ' + file.name.replace(/\.[^.]+$/, ''), rings: G.xf(c.rings, [k, 0, 0, k, 0, 0]), layer, x: place[0], y: place[1], src: { kind: 'logo' } });
    addObjs([o]); commit(); toast('Logo importé : ' + (rings.length) + ' contours');
  };
  if (/\.svg$/i.test(file.name) || file.type === 'image/svg+xml') { const rd = new FileReader(); rd.onload = () => { try { done(svgToRings(rd.result).rings); } catch (e) { toast('SVG illisible : ' + e.message); } }; rd.readAsText(file); }
  else {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height)), w = Math.round(img.width * k), hh = Math.round(img.height * k);
      const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, hh);
      const d = x.getImageData(0, 0, w, hh).data;
      try { done(traceImage(d, w, hh, { threshold: parseFloat($('#logoThr').value), invert: $('#logoInv').checked })); } catch (e) { toast('Vectorisation impossible : ' + e.message); }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
}
function refreshBgs() {
  const box = $('#bgList'); box.innerHTML = '';
  S.bgs.forEach(b => box.append(h('div', { class: 'bgrow' },
    h('div', { class: 'bgname' }, b.name, h('small', {}, ` ${b.w.toFixed(0)}×${b.h.toFixed(0)} mm`)),
    h('div', { class: 'btnrow' },
      h('button', { onclick: () => { b.vis = !b.vis; commit(); } }, b.vis ? 'Masquer' : 'Afficher'),
      h('button', { onclick: () => { S.calib = { bg: b.id, pts: [] }; toast('Cliquez 2 points de distance connue sur le fond (ex : les extrémités du véhicule)'); draw(); } }, '📏 Calibrer l\'échelle'),
      h('button', { onclick: () => { const R = REG().total; b.x = 0; b.y = 0; commit(); } }, 'Origine'),
      h('button', { class: 'danger', onclick: () => { S.bgs = S.bgs.filter(x => x !== b); commit(); } }, '✕')),
    h('label', { class: 'f' }, 'Opacité', h('input', { type: 'range', min: 0.05, max: 1, step: 0.05, value: b.op, oninput: e => { b.op = parseFloat(e.target.value); draw(); }, onchange: () => commit() })),
    h('div', { class: 'grid2' },
      h('label', { class: 'f' }, 'X mm', h('input', { type: 'number', value: b.x.toFixed(0), onchange: e => { b.x = parseFloat(e.target.value); commit(); } })),
      h('label', { class: 'f' }, 'Y mm', h('input', { type: 'number', value: b.y.toFixed(0), onchange: e => { b.y = parseFloat(e.target.value); commit(); } })),
      h('label', { class: 'f' }, 'Largeur mm', h('input', { type: 'number', value: b.w.toFixed(0), onchange: e => { const r = b.h / b.w; b.w = parseFloat(e.target.value); b.h = b.w * r; commit(); } }))))));
  if (!S.bgs.length) box.append(h('p', { class: 'hint' }, 'Aucun fond. Importez une photo / un gabarit de votre véhicule (PNG, JPG, SVG) puis calibrez l\'échelle : vos décos seront à la bonne taille réelle.'));
}

/* ---------- export ---------- */
function openExport() {
  const m = $('#exportDlg'); m.classList.add('on'); renderExport();
}
function renderExport() {
  const pre = allPrepped(), box = $('#expTable'); box.innerHTML = '';
  let tot = { a: 0, v: 0, c: 0 };
  const rows = pre.map((ls, i) => {
    tot.a += ls.area; tot.v += ls.vinyl; tot.c += ls.cut;
    const n = String(i + 1).padStart(2, '0') + '_' + slug(ls.layer.name);
    return h('tr', {}, h('td', {}, h('i', { class: 'sw', style: 'background:' + ls.layer.color }), ls.layer.name),
      h('td', {}, ls.pieces), h('td', {}, ls.area.toFixed(2)), h('td', {}, (ls.pageH / 1000).toFixed(2) + ' m'), h('td', {}, ls.cut.toFixed(1) + ' m'),
      h('td', { class: 'dl' },
        h('button', { onclick: () => download(layerPdf(ls, i), n + '.pdf', 'application/pdf') }, 'PDF'),
        h('button', { onclick: () => download(layerPdf(ls, i), n + '.ai', 'application/postscript') }, 'AI'),
        h('button', { onclick: () => download(enc.encode(layerSvg(ls, i)), n + '.svg', 'image/svg+xml') }, 'SVG')));
  });
  const tbl = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Couleur'), h('th', {}, 'Pièces'), h('th', {}, 'm² utiles'), h('th', {}, 'Rouleau'), h('th', {}, 'Coupe'), h('th', {}, 'Fichier'))), h('tbody', {}, rows),
    h('tfoot', {}, h('tr', {}, h('td', {}, 'Total'), h('td', {}), h('td', {}, tot.a.toFixed(2)), h('td', {}, tot.v.toFixed(2) + ' m² vinyle'), h('td', {}, tot.c.toFixed(1) + ' m'), h('td', {}))));
  box.append(pre.length ? tbl : h('p', { class: 'hint' }, 'Rien à exporter : ajoutez des éléments sur la planche.'));
  if (pre.some(p => p.wide)) box.append(h('p', { class: 'warn' }, '⚠ Une pièce dépasse la largeur utile du rouleau : activez « Découpe en bandes ».'));
}
function bindExportOpts() {
  const map = { eRoll: ['roll', Number], eMargin: ['margin', Number], eOverlap: ['overlap', Number], eTrap: ['trap', Number], eMarks: ['marks', 'chk'], eMirror: ['mirror', 'chk'], eCut: ['cutOnly', 'chk'], eKnock: ['knock', 'chk'], eIsl: ['islands', 'chk'], eTile: ['tile', 'chk'] };
  for (const id in map) { const el = $('#' + id), [k, t] = map[id]; if (t === 'chk') el.checked = EXP[k]; else el.value = EXP[k]; el.onchange = () => { EXP[k] = t === 'chk' ? el.checked : (parseFloat(el.value) || EXP[k]); renderExport(); }; }
}

/* ---------- rafraîchissement global ---------- */
function refreshAll() {
  $('#projName').value = S.name; $('#vehSel').value = S.veh; $('#paint').value = S.paint;
  refreshLayers(); refreshProps(); refreshBgs(); draw();
  const b = $('#btnUndo'); b && (b.disabled = H.idx <= 0); $('#btnRedo').disabled = H.idx >= H.stack.length - 1;
}
function setMode(m) {
  S.mode = m; $$('#modeBtns button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  const st = $('#stage'); st.className = 'm-' + m;
  if (m !== '2d') { init3D(); resize3D(); if (T3.pending) { T3.pending = false; } T3.dirty = true; }
  setTimeout(() => { draw(); resize3D(); }, 30);
}

/* ---------- démarrage ---------- */
function startUI() {
  const vs = $('#vehSel'); for (const k in VEHICLES) vs.append(h('option', { value: k }, VEHICLES[k].name));
  const fsel = FONT_LIST.map(f => `<option value="${f[0]}">${f[1]}</option>`).join(''); $('#txtFont').innerHTML = fsel;
  $('#vehSel').onchange = e => { if (S.objs.length && !confirm('Changer de véhicule : les éléments seront replacés selon le nouveau gabarit. Continuer ?')) { e.target.value = S.veh; return; } const old = S.objs; S.veh = e.target.value; _layK = null; for (const k in _clipCache) delete _clipCache[k]; S.objs = []; S.bgs = S.bgs; commit(); build3D(); fitView(); toast('Véhicule changé. Utilisez « Déco auto » pour régénérer une déco adaptée.'); };
  $('#paint').oninput = e => { S.paint = e.target.value; draw(); schedule3D(true); }; $('#paint').onchange = () => commit();
  $('#projName').onchange = e => { S.name = e.target.value; commit(); };
  $('#snapSel').onchange = e => { S.snap = parseFloat(e.target.value); };
  $$('#modeBtns button').forEach(b => b.onclick = () => setMode(b.dataset.m));
  $('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo; $('#btnFit').onclick = fitView;
  $('#btnNew').onclick = () => { if (confirm('Nouveau projet vide ?')) { newProject(S.veh); commit(); build3D(); fitView(); } };
  $('#btnSave').onclick = saveProject;
  $('#fileOpen').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { loadSnap(rd.result); H.stack = []; H.idx = -1; commit(); build3D(); fitView(); } catch (er) { toast('Fichier invalide'); } }; rd.readAsText(f); e.target.value = ''; };
  $('#btnOpen').onclick = () => $('#fileOpen').click();
  $('#showGlass').onchange = e => { S.showGlass = e.target.checked; draw(); };
  $('#showGrid').onchange = e => { S.showGrid = e.target.checked; draw(); };
  $('#showBg').onchange = e => { S.showBg = e.target.checked; draw(); };
  $('#addLayerBtn').onclick = () => { const sel = $('#addLayerSel'); const nm = sel.options[sel.selectedIndex].text; addLayer(nm, sel.value); commit(); buildLeft(); };
  $$('.tab').forEach(t => t.onclick = () => { $$('.tab').forEach(x => x.classList.toggle('on', x === t)); $$('.tabp').forEach(p => p.classList.toggle('on', p.id === t.dataset.t)); });
  $('#genGo').onclick = insertPattern; $('#txtGo').onclick = insertText;
  $('#genTarget').onchange = () => { const t = $('#genTarget').value, v = V(); const base = t === 'top' ? [v.W * .8, v.L * .3] : t === 'front' || t === 'rear' ? [v.W * .8, v.H * .3] : [v.L * .5, v.H * .35]; $('#genW').value = Math.round(base[0]); $('#genH').value = Math.round(base[1]); };
  $('#genTarget').dispatchEvent(new Event('change'));
  $('#logoFile').onchange = e => { if (e.target.files[0]) importLogo(e.target.files[0]); e.target.value = ''; };
  $('#bgFile').onchange = e => { if (e.target.files[0]) addBgFromFile(e.target.files[0]); e.target.value = ''; };
  $('#styleGo').onclick = () => {
    const opt = { num: $('#aNum').value, crew: $('#aCrew').value, sponsor: $('#aSponsor').value, company: $('#aCompany').value, sub: $('#aSub').value, seed: parseInt($('#aSeed').value) || 1, clear: $('#aClear').checked };
    applyStyle(curStyle, opt); commit(); buildLeft(); fitView(); toast('Déco « ' + STYLES[curStyle].name + ' » générée — modifiez, déplacez, changez les couleurs !');
  };
  $('#aDice').onclick = () => { $('#aSeed').value = Math.floor(Math.random() * 900) + 1; $('#styleGo').click(); };
  $('#btnExport').onclick = openExport; $('#expClose').onclick = () => $('#exportDlg').classList.remove('on');
  $('#expZip').onclick = () => { exportZip(); };
  $('#expPrev').onclick = () => { const b = previewPdf(false); window.open(URL.createObjectURL(new Blob([b], { type: 'application/pdf' })), '_blank'); };
  $('#expPrev3d').onclick = () => { if (!T3.ready) init3D(); const b = previewPdf(true); download(b, slug(S.name) + '_apercu_client.pdf', 'application/pdf'); };
  $('#expProj').onclick = saveProject;
  bindExportOpts();
  // 3D
  $$('#camBtns button').forEach(b => b.onclick = () => camPreset(b.dataset.c));
  $('#autoRot').onchange = e => { T3.controls.autoRotate = e.target.checked; T3.controls.autoRotateSpeed = 1.2; };
  $('#shot3d').onclick = () => { const u = shot3D(2000, 1125); const a = document.createElement('a'); a.href = u; a.download = slug(S.name) + '_3D.jpg'; a.click(); camPreset('34av'); };
  initCanvas();
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return; if (/\.(png|jpe?g|webp)$/i.test(f.name)) addBgFromFile(f); else if (/\.svg$/i.test(f.name)) importLogo(f); else if (/\.json$/.test(f.name)) { const rd = new FileReader(); rd.onload = () => { loadSnap(rd.result); commit(); build3D(); fitView(); }; rd.readAsText(f); } });
  // projet
  let restored = false;
  try { const sv = localStorage.getItem('rds_autosave'); if (sv && location.search.indexOf('new') < 0) { loadSnap(sv); restored = true; } } catch (e) { }
  const qp = new URLSearchParams(location.search);
  if (qp.get('veh') && VEHICLES[qp.get('veh')]) { newProject(qp.get('veh')); applyStyle(STYLES[qp.get('style')] ? qp.get('style') : 'griffures', { num: qp.get('num') || '12', crew: qp.get('crew') || 'DUPONT / MARTIN', company: qp.get('company') || 'VOTRE SOCIÉTÉ' }); restored = true; if (STYLES[qp.get('style')]) curStyle = qp.get('style'); }
  if (!restored) { newProject('hatch'); applyStyle('griffures', { num: '12', crew: 'DUPONT / MARTIN' }); }
  commit(); buildLeft();
  setMode(location.hash === '#3d' ? '3d' : 'both');
  setTimeout(() => { fitView(); try { build3D(); } catch (e) { console.error(e); } }, 60);
}
window.addEventListener('DOMContentLoaded', () => { try { startUI(); } catch (e) { console.error(e); document.body.prepend(h('pre', { style: 'color:red;padding:10px' }, String(e.stack || e))); } });
