/* ===== app.js : état du projet, rendu 2D, interactions ===== */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let _uid = 1; const nid = () => 'o' + (_uid++) + Math.random().toString(36).slice(2, 5);
const VINYL = [['Blanc', '#ffffff'], ['Noir', '#111111'], ['Rouge', '#d71920'], ['Orange', '#f47b20'], ['Jaune', '#ffd400'], ['Bleu roi', '#1b4fa3'], ['Bleu clair', '#3aa7e0'], ['Vert', '#1e9e4a'], ['Vert fluo', '#8cff00'], ['Gris', '#8a8d91'], ['Argent', '#c0c3c8'], ['Or', '#c9a227'], ['Rose fluo', '#ff2e93'], ['Violet', '#6a2c91'], ['Anthracite', '#3b3f45'], ['Cyan', '#00b7c3'], ['Jaune fluo', '#e8ff1a'], ['Orange fluo', '#ff6a13'], ['Vert lime', '#a5d600'], ['Bordeaux', '#7a1020']];

const S = {
  name: 'Ma déco rallye', veh: 'hatch', paint: '#e9ecef',
  layers: [], objs: [], bgs: [],
  sel: new Set(),
  view: { ox: 0, oy: 0, k: 0.1 },
  snap: 10, showGlass: true, showBg: true, showGrid: true, mode: '2d', tool: 'select'
};
const V = () => getVehicle(S.veh);
let _lay = null, _layK = null;
const REG = () => { if (_layK !== S.veh) { _lay = sheetLayout(V()); _layK = S.veh; } return _lay; };
const VIEWS = ['left', 'right', 'top', 'front', 'rear'];
function viewAt(x, y, margin = 40) {
  const R = REG();
  for (const k of VIEWS) { const r = R[k]; if (x >= r.x - margin && x <= r.x + r.w + margin && y >= r.y - margin && y <= r.y + r.h + margin) return k; }
  return null;
}
const layerById = id => S.layers.find(l => l.id === id);
const objById = id => S.objs.find(o => o.id === id);
function addLayer(name, color) { const l = { id: 'L' + (_uid++), name, color, vis: true, lock: false }; S.layers.push(l); return l; }

/* ---------- objets ---------- */
function makeObj(p) {
  const o = Object.assign({ id: nid(), name: 'Objet', layer: S.layers[0] && S.layers[0].id, rings: [], x: 0, y: 0, rot: 0, sx: 1, sy: 1, fx: false, clip: 'none', gid: null, src: null, lock: false, hide: false }, p);
  o.lb = G.bbox(o.rings) || { w: 1, h: 1, x0: 0, y0: 0, cx: 0, cy: 0 };
  return o;
}
function objMatrix(o) {
  const c = Math.cos(o.rot * Math.PI / 180), s = Math.sin(o.rot * Math.PI / 180), sx = o.sx * (o.fx ? -1 : 1), sy = o.sy;
  return [c * sx, s * sx, -s * sy, c * sy, o.x, o.y];
}
function wRings(o) { // anneaux transformés (sans clip)
  const k = [o.x, o.y, o.rot, o.sx, o.sy, o.fx, o.rings.length, o.rings[0] && o.rings[0].length].join('|');
  if (o._wk !== k) { o._wr = G.xf(o.rings, objMatrix(o)); o._wk = k; o._ck = null; o._p = null; o._p0 = null; }
  return o._wr;
}
const _clipCache = {};
function clipFor(view, mode) {
  const k = S.veh + view + mode; if (_clipCache[k]) return _clipCache[k];
  const r = REG()[view], rings = clipRings(V(), view, mode === 'body' ? true : false);
  return (_clipCache[k] = G.xf(rings, [1, 0, 0, 1, r.x, r.y]));
}
function cRings(o) { // anneaux affichés / exportés (avec ajustement carrosserie)
  const w = wRings(o);
  if (o.clip === 'none') return w;
  const bb = G.bbox(w); if (!bb) return w;
  const view = viewAt(bb.cx, bb.cy, 0) || viewAt(bb.cx, bb.cy, 300);
  if (!view) return w;
  const k = o._wk + o.clip + S.veh + view;
  if (o._ck !== k) { o._cr = G.inter(w, clipFor(view, o.clip === 'body' ? 'body' : 'noglass')); o._ck = k; o._p = null; }
  return o._cr;
}
function path2d(rings) {
  const p = new Path2D();
  for (const r of rings) { if (r.length < 3) continue; p.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) p.lineTo(r[i][0], r[i][1]); p.closePath(); }
  return p;
}
function objPath(o) { cRings(o); if (!o._p || o._pk !== (o._ck || o._wk)) { o._p = path2d(cRings(o)); o._pk = o._ck || o._wk; } return o._p; }

/* ---------- historique ---------- */
const H = { stack: [], idx: -1, lock: false };
function snapshot() { return JSON.stringify({ name: S.name, veh: S.veh, paint: S.paint, layers: S.layers, objs: S.objs.map(o => { const c = Object.assign({}, o); delete c._wr; delete c._wk; delete c._ck; delete c._cr; delete c._p; delete c._pk; delete c._p0; return c; }), bgs: S.bgs.map(b => ({ id: b.id, name: b.name, x: b.x, y: b.y, w: b.w, h: b.h, op: b.op, vis: b.vis, src: b.src })) }); }
function commit(label) {
  if (H.lock) return;
  H.stack.length = H.idx + 1; H.stack.push(snapshot()); if (H.stack.length > 40) H.stack.shift(); H.idx = H.stack.length - 1;
  try { localStorage.setItem('rds_autosave', H.stack[H.idx]); } catch (e) { }
  refreshAll(); schedule3D();
}
function loadSnap(js, keepView) {
  const d = JSON.parse(js);
  S.name = d.name; S.veh = d.veh; S.paint = d.paint; S.layers = d.layers; S.objs = d.objs.map(o => { o.lb = G.bbox(o.rings) || { w: 1, h: 1, cx: 0, cy: 0 }; return o; });
  S.bgs = (d.bgs || []).map(b => { const o = Object.assign({}, b); o.img = new Image(); o.img.onload = () => draw(); o.img.src = b.src; return o; });
  S.sel = new Set([...S.sel].filter(id => objById(id)));
  _layK = null; for (const k in _clipCache) delete _clipCache[k];
  if (V()) V()._vg = null;
}
function undo() { if (H.idx > 0) { H.idx--; loadSnap(H.stack[H.idx]); refreshAll(); schedule3D(); } }
function redo() { if (H.idx < H.stack.length - 1) { H.idx++; loadSnap(H.stack[H.idx]); refreshAll(); schedule3D(); } }

/* ---------- caméra 2D ---------- */
const cv = () => $('#c2d');
function fitView() {
  const R = REG().total, c = cv(), w = c.clientWidth, h = c.clientHeight; if (!w) return;
  const k = Math.min(w / (R.w + 400), h / (R.h + 400));
  S.view = { k, ox: (w - R.w * k) / 2, oy: (h - R.h * k) / 2 };
  draw();
}
const toScr = (x, y) => [x * S.view.k + S.view.ox, y * S.view.k + S.view.oy];
const toMM = (px, py) => [(px - S.view.ox) / S.view.k, (py - S.view.oy) / S.view.k];

/* ---------- dessin d'une vue du véhicule (coord. locales) ---------- */
function fillRings(ctx, rings) { ctx.beginPath(); for (const r of rings) { if (r.length < 3) continue; ctx.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) ctx.lineTo(r[i][0], r[i][1]); ctx.closePath(); } }
function drawBase(ctx, view, o = {}) {
  const v = V(), g = viewGeom(v, view);
  ctx.save(); ctx.lineJoin = 'round';
  fillRings(ctx, g.body); ctx.fillStyle = S.paint; ctx.fill('nonzero');
  if (view === 'left' || view === 'right') for (const w of g.wheels) { ctx.beginPath(); ctx.arc(w.cx, w.cy, w.arch, 0, 7); ctx.fillStyle = '#23272b'; ctx.fill(); }
  for (const d of g.dark) { fillRings(ctx, [d]); ctx.fillStyle = '#2b2f34'; ctx.fill(); }
  for (const d of g.light) { fillRings(ctx, [d]); ctx.fillStyle = '#e8e8e8'; ctx.fill(); }
  if (!o.noOutline) { fillRings(ctx, g.body); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = o.lw || 5; ctx.stroke(); }
  ctx.restore();
}
function drawOver(ctx, view, alpha) {
  const v = V(), g = viewGeom(v, view);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // vitres
  fillRings(ctx, g.glass); ctx.fillStyle = `rgba(32,44,56,${alpha})`; ctx.fill('nonzero');
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.stroke();
  // lignes de portes
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 4;
  for (const l of g.lines) { ctx.beginPath(); ctx.moveTo(l[0][0], l[0][1]); ctx.lineTo(l[1][0], l[1][1]); ctx.stroke(); }
  if (view === 'left' || view === 'right') for (const w of g.wheels) {
    ctx.beginPath(); ctx.arc(w.cx, w.cy, w.r, 0, 7); ctx.fillStyle = '#16181b'; ctx.fill();
    ctx.beginPath(); ctx.arc(w.cx, w.cy, w.r * 0.62, 0, 7); ctx.fillStyle = '#9aa0a6'; ctx.fill();
    ctx.beginPath(); ctx.arc(w.cx, w.cy, w.r * 0.2, 0, 7); ctx.fillStyle = '#50555a'; ctx.fill();
    ctx.strokeStyle = '#50555a'; ctx.lineWidth = w.r * 0.09; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.2832; ctx.beginPath(); ctx.moveTo(w.cx + Math.cos(a) * w.r * .2, w.cy + Math.sin(a) * w.r * .2); ctx.lineTo(w.cx + Math.cos(a) * w.r * .6, w.cy + Math.sin(a) * w.r * .6); ctx.stroke(); }
  }
  // dark parts (rétros, feux) redessinés au-dessus
  for (const d of g.dark) { fillRings(ctx, [d]); ctx.fillStyle = '#2b2f34'; ctx.fill(); }
  for (const d of g.light) { fillRings(ctx, [d]); ctx.fillStyle = '#e8e8e8'; ctx.fill(); }
  ctx.restore();
}
function drawObjs(ctx, opt = {}) {
  for (const L of S.layers) {
    if (!L.vis) continue;
    ctx.fillStyle = L.color; ctx.globalAlpha = opt.alpha ?? 1;
    for (const o of S.objs) {
      if (o.layer !== L.id || o.hide) continue;
      ctx.fill(objPath(o), 'nonzero');
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- dessin principal ---------- */
let _raf = 0;
function draw() { if (_raf) return; _raf = requestAnimationFrame(() => { _raf = 0; draw2D(); }); }
function draw2D() {
  const c = cv(), ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth, Hh = c.clientHeight; if (!W) return;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(Hh * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas') || '#20242a'; ctx.fillRect(0, 0, W, Hh);
  const k = S.view.k; ctx.save(); ctx.translate(S.view.ox, S.view.oy); ctx.scale(k, k);
  const R = REG(), tot = R.total;
  // planche
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-100, -100, tot.w + 200, tot.h + 200);
  if (S.showGrid) {
    const step = k > 0.25 ? 100 : k > 0.08 ? 500 : 1000; ctx.lineWidth = 1 / k; ctx.strokeStyle = '#e6e9ee'; ctx.beginPath();
    for (let x = 0; x <= tot.w + 100; x += step) { ctx.moveTo(x, -100); ctx.lineTo(x, tot.h + 100); }
    for (let y = 0; y <= tot.h + 100; y += step) { ctx.moveTo(-100, y); ctx.lineTo(tot.w + 100, y); }
    ctx.stroke();
  }
  if (S.showBg) for (const b of S.bgs) { if (!b.vis || !b.img || !b.img.complete) continue; ctx.globalAlpha = b.op; ctx.drawImage(b.img, b.x, b.y, b.w, b.h); ctx.globalAlpha = 1; }
  const hasBg = S.showBg && S.bgs.some(b => b.vis);
  for (const vk of VIEWS) {
    const r = R[vk]; ctx.save(); ctx.translate(r.x, r.y); if (hasBg) { fillRings(ctx, viewGeom(V(), vk).body); ctx.strokeStyle = 'rgba(255,60,0,.7)'; ctx.lineWidth = 3 / k; ctx.stroke(); } else drawBase(ctx, vk, { lw: 3 / k }); ctx.restore();
  }
  drawObjs(ctx);
  for (const vk of VIEWS) {
    const r = R[vk]; ctx.save(); ctx.translate(r.x, r.y);
    if (!hasBg) drawOver(ctx, vk, S.showGlass ? 0.42 : 0.0);
    ctx.restore();
    ctx.fillStyle = '#6b7380'; ctx.font = `${14 / k}px system-ui`; ctx.fillText(VIEW_NAMES[vk] + (vk === 'left' ? '  (avant ←)' : vk === 'right' ? '  (avant →)' : vk === 'top' ? '  (avant ↑)' : ''), r.x, r.y - 8 / k);
  }
  // sélection
  if (S.sel.size) {
    const sel = [...S.sel].map(objById).filter(Boolean);
    ctx.lineWidth = 1.5 / k; ctx.strokeStyle = '#18a0fb'; ctx.setLineDash([6 / k, 4 / k]);
    for (const o of sel) { const b = G.bbox(wRings(o)); if (b) ctx.strokeRect(b.x0, b.y0, b.w, b.h); }
    ctx.setLineDash([]);
    const sb = selBox();
    if (sb) {
      ctx.strokeStyle = '#18a0fb'; ctx.lineWidth = 1.5 / k; ctx.strokeRect(sb.x0, sb.y0, sb.w, sb.h);
      const hs = handles(sb);
      for (const h of hs) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#18a0fb'; ctx.lineWidth = 1.5 / k; ctx.beginPath(); if (h.id === 'rot') ctx.arc(h.x, h.y, 6 / k, 0, 7); else ctx.rect(h.x - 5 / k, h.y - 5 / k, 10 / k, 10 / k); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(sb.cx, sb.y0); ctx.lineTo(sb.cx, sb.y0 - 28 / k); ctx.stroke();
      ctx.fillStyle = '#18a0fb'; ctx.font = `${12 / k}px system-ui`; ctx.fillText(`${sb.w.toFixed(0)} × ${sb.h.toFixed(0)} mm`, sb.x0, sb.y1 + 16 / k);
    }
  }
  if (S.calib) { // calibration
    ctx.strokeStyle = '#ff3b30'; ctx.fillStyle = '#ff3b30'; ctx.lineWidth = 2 / k;
    for (const p of S.calib.pts) { ctx.beginPath(); ctx.arc(p[0], p[1], 6 / k, 0, 7); ctx.fill(); }
    if (S.calib.pts.length === 2) { ctx.beginPath(); ctx.moveTo(...S.calib.pts[0]); ctx.lineTo(...S.calib.pts[1]); ctx.stroke(); }
  }
  if (S.marquee) { const m = S.marquee; ctx.fillStyle = 'rgba(24,160,251,.12)'; ctx.strokeStyle = '#18a0fb'; ctx.lineWidth = 1 / k; ctx.fillRect(m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0); ctx.strokeRect(m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0); }
  ctx.restore();
  // règle d'échelle
  const bar = k > 0.25 ? 100 : k > 0.08 ? 500 : 1000;
  ctx.fillStyle = '#2b3138'; ctx.fillRect(12, Hh - 30, bar * k + 2, 3); ctx.fillStyle = '#9aa4b2'; ctx.font = '11px system-ui'; ctx.fillText(bar + ' mm', 12, Hh - 36);
}
function selBox() {
  let rs = []; for (const id of S.sel) { const o = objById(id); if (o) rs = rs.concat(wRings(o)); }
  return G.bbox(rs);
}
function handles(b) {
  const k = S.view.k;
  return [['nw', b.x0, b.y0], ['n', b.cx, b.y0], ['ne', b.x1, b.y0], ['e', b.x1, b.cy], ['se', b.x1, b.y1], ['s', b.cx, b.y1], ['sw', b.x0, b.y1], ['w', b.x0, b.cy], ['rot', b.cx, b.y0 - 28 / k]].map(a => ({ id: a[0], x: a[1], y: a[2] }));
}

/* ---------- interaction ---------- */
let drag = null;
function hitObj(x, y) {
  const sc = document.createElement('canvas').getContext('2d'); // contexte neutre
  for (let li = S.layers.length - 1; li >= 0; li--) {
    const L = S.layers[li]; if (!L.vis || L.lock) continue;
    for (let i = S.objs.length - 1; i >= 0; i--) {
      const o = S.objs[i]; if (o.layer !== L.id || o.hide || o.lock) continue;
      if (sc.isPointInPath(objPath(o), x, y, 'nonzero')) return o;
    }
  }
  return null;
}
function groupOf(o) { return o.gid ? S.objs.filter(p => p.gid === o.gid) : [o]; }
function setSel(ids) { S.sel = new Set(ids); refreshProps(); refreshLayers(); draw(); }
function initCanvas() {
  const c = cv();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => {
    e.preventDefault(); const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const [mx, my] = toMM(px, py); const f = Math.exp(-e.deltaY * 0.0015); S.view.k = Math.max(0.004, Math.min(6, S.view.k * f));
    S.view.ox = px - mx * S.view.k; S.view.oy = py - my * S.view.k; draw();
  }, { passive: false });
  c.addEventListener('pointerdown', e => {
    c.setPointerCapture(e.pointerId); const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, [x, y] = toMM(px, py);
    if (e.button === 1 || e.button === 2 || e.code === 'Space' || S.tool === 'pan' || spaceDown) { drag = { t: 'pan', px, py, ox: S.view.ox, oy: S.view.oy }; return; }
    if (S.calib) { S.calib.pts.push([x, y]); if (S.calib.pts.length === 2) finishCalib(); draw(); return; }
    // poignées
    const sb = selBox();
    if (sb && S.sel.size) {
      for (const h of handles(sb)) if (Math.abs(h.x - x) < 9 / S.view.k && Math.abs(h.y - y) < 9 / S.view.k) {
        const objs = [...S.sel].map(objById).filter(Boolean);
        drag = { t: h.id === 'rot' ? 'rot' : 'scale', h: h.id, sb, x, y, start: objs.map(o => ({ o, x: o.x, y: o.y, sx: o.sx, sy: o.sy, rot: o.rot })), a0: Math.atan2(y - sb.cy, x - sb.cx) }; return;
      }
    }
    const hit = hitObj(x, y);
    if (hit) {
      if (!S.sel.has(hit.id)) { const ids = e.altKey ? [hit.id] : groupOf(hit).map(o => o.id); if (e.shiftKey) ids.forEach(i => S.sel.add(i)); else S.sel = new Set(ids); refreshProps(); refreshLayers(); }
      else if (e.shiftKey) { groupOf(hit).forEach(o => S.sel.delete(o.id)); refreshProps(); refreshLayers(); draw(); return; }
      drag = { t: 'move', x, y, start: [...S.sel].map(objById).filter(Boolean).map(o => ({ o, x: o.x, y: o.y })), moved: false };
      if (e.ctrlKey || e.metaKey) { /* duplication au glisser */ dupSel(true); drag.start = [...S.sel].map(objById).map(o => ({ o, x: o.x, y: o.y })); }
    } else {
      if (!e.shiftKey) { S.sel = new Set(); refreshProps(); refreshLayers(); }
      drag = { t: 'marq', x, y }; S.marquee = { x0: x, y0: y, x1: x, y1: y };
    }
    draw();
  });
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, [x, y] = toMM(px, py);
    $('#coords').textContent = `x ${x.toFixed(0)}  y ${y.toFixed(0)} mm` + (viewAt(x, y) ? '  · ' + VIEW_NAMES[viewAt(x, y)] : '');
    if (!drag) return;
    if (drag.t === 'pan') { S.view.ox = drag.ox + px - drag.px; S.view.oy = drag.oy + py - drag.py; draw(); return; }
    if (drag.t === 'move') {
      let dx = x - drag.x, dy = y - drag.y;
      if (S.snap && drag.start.length) { const a = drag.start[0]; const nx = Math.round((a.x + dx) / S.snap) * S.snap, ny = Math.round((a.y + dy) / S.snap) * S.snap; dx = nx - a.x; dy = ny - a.y; }
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (Math.abs(dx) + Math.abs(dy) > 0) drag.moved = true;
      for (const s of drag.start) { s.o.x = s.x + dx; s.o.y = s.y + dy; }
      refreshPropsValues(); draw(); schedule3D(true); return;
    }
    if (drag.t === 'marq') { S.marquee.x1 = x; S.marquee.y1 = y; draw(); return; }
    if (drag.t === 'rot') {
      let da = Math.atan2(y - drag.sb.cy, x - drag.sb.cx) - drag.a0; let deg = da * 180 / Math.PI; if (e.shiftKey) deg = Math.round(deg / 15) * 15; const rad = deg * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
      for (const s of drag.start) { const dx = s.x - drag.sb.cx, dy = s.y - drag.sb.cy; s.o.x = drag.sb.cx + dx * cs - dy * sn; s.o.y = drag.sb.cy + dx * sn + dy * cs; s.o.rot = s.rot + deg; }
      refreshPropsValues(); draw(); schedule3D(true); return;
    }
    if (drag.t === 'scale') {
      const b = drag.sb, h = drag.h;
      const ax = h.includes('w') ? b.x1 : h.includes('e') ? b.x0 : b.cx, ay = h.includes('n') ? b.y1 : h.includes('s') ? b.y0 : b.cy;
      let fx = 1, fy = 1;
      if (h.includes('e')) fx = (x - ax) / ((b.x1 - ax) || 1); else if (h.includes('w')) fx = (x - ax) / ((b.x0 - ax) || -1);
      if (h.includes('s')) fy = (y - ay) / ((b.y1 - ay) || 1); else if (h.includes('n')) fy = (y - ay) / ((b.y0 - ay) || -1);
      fx = Math.max(0.02, fx); fy = Math.max(0.02, fy);
      if (h.length === 2 || e.shiftKey) { const f = h.length === 2 ? Math.max(fx, fy) : (h === 'e' || h === 'w' ? fx : fy); fx = fy = f; }
      for (const s of drag.start) {
        const o = s.o; o.x = ax + (s.x - ax) * fx; o.y = ay + (s.y - ay) * fy;
        const q = ((s.rot % 180) + 180) % 180;
        if (q < 0.5 || q > 179.5) { o.sx = s.sx * fx; o.sy = s.sy * fy; }
        else if (Math.abs(q - 90) < 0.5) { o.sx = s.sx * fy; o.sy = s.sy * fx; }
        else { const f = Math.sqrt(fx * fy); o.sx = s.sx * f; o.sy = s.sy * f; }
      }
      refreshPropsValues(); draw(); schedule3D(true); return;
    }
  });
  const up = e => {
    if (!drag) return;
    if (drag.t === 'marq') {
      const m = S.marquee, x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1), y0 = Math.min(m.y0, m.y1), y1 = Math.max(m.y0, m.y1);
      if (x1 - x0 > 3 / S.view.k) { for (const o of S.objs) { if (o.hide || o.lock) continue; const L = layerById(o.layer); if (!L || !L.vis || L.lock) continue; const b = G.bbox(wRings(o)); if (b && b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1) S.sel.add(o.id); } }
      S.marquee = null; refreshProps(); refreshLayers();
    } else if (drag.t === 'move' && drag.moved || drag.t === 'scale' || drag.t === 'rot') { commit(); }
    drag = null; draw();
  };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  new ResizeObserver(() => { if (!S._fitted && c.clientWidth) { S._fitted = true; fitView(); } draw(); }).observe(c.parentElement);
}
let spaceDown = false;
window.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (ctrl && e.key === 'y') { e.preventDefault(); redo(); }
  else if (ctrl && e.key === 'd') { e.preventDefault(); dupSel(); }
  else if (ctrl && e.key === 'a') { e.preventDefault(); setSel(S.objs.filter(o => !o.hide && !o.lock).map(o => o.id)); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { delSel(); }
  else if (e.key === 'Escape') { S.calib = null; setSel([]); }
  else if (e.key.startsWith('Arrow') && S.sel.size) {
    e.preventDefault(); const st = e.shiftKey ? 10 : 1; const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
    for (const id of S.sel) { const o = objById(id); if (o) { o.x += dx; o.y += dy; } } commit();
  } else if (e.key === 'f' || e.key === 'F') fitView();
});
window.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });

/* ---------- actions ---------- */
function addObjs(list, select = true) {
  S.objs.push(...list); if (select) S.sel = new Set(list.map(o => o.id));
}
function delSel() { if (!S.sel.size) return; S.objs = S.objs.filter(o => !S.sel.has(o.id)); S.sel = new Set(); commit(); }
function dupSel(noCommit) {
  const copies = []; const gmap = {};
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const c = Object.assign({}, o, { id: nid(), x: o.x + (noCommit ? 0 : 30), y: o.y + (noCommit ? 0 : 30) }); delete c._wr; delete c._wk; delete c._ck; delete c._cr; delete c._p; delete c._pk; c.rings = o.rings; if (o.gid) c.gid = gmap[o.gid] || (gmap[o.gid] = 'g' + nid()); copies.push(c); }
  S.objs.push(...copies); S.sel = new Set(copies.map(o => o.id)); if (!noCommit) commit();
}
function mirrorObj(o) {
  const R = REG(), c = Object.assign({}, o, { id: nid(), gid: null });
  ['_wr', '_wk', '_ck', '_cr', '_p', '_pk'].forEach(k => delete c[k]);
  const b = G.bbox(wRings(o)); const view = viewAt(b.cx, b.cy, 300);
  if (view === 'left' || view === 'right') {
    const from = R[view], to = R[view === 'left' ? 'right' : 'left'];
    c.x = to.x + (from.w - (o.x - from.x)); c.y = to.y + (o.y - from.y);
  } else if (view) { const r = R[view]; c.x = r.x + (r.w - (o.x - r.x)); }
  else c.x = o.x + 100;
  c.rot = -o.rot; c.fx = !o.fx; return c;
}
function mirrorSel() {
  const gmap = {}; const out = [];
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const c = mirrorObj(o); if (o.gid) c.gid = gmap[o.gid] || (gmap[o.gid] = 'g' + nid()); out.push(c); }
  addObjs(out); commit();
}
function reorder(dir) { // z dans le calque
  for (const id of S.sel) { const i = S.objs.findIndex(o => o.id === id); if (i < 0) continue; const j = dir > 0 ? Math.min(S.objs.length - 1, i + 1) : Math.max(0, i - 1); const t = S.objs[i]; S.objs[i] = S.objs[j]; S.objs[j] = t; }
  commit();
}
function haloSel(d, layerId) {
  const out = [];
  for (const id of S.sel) {
    const o = objById(id); if (!o) continue; const w = G.union(cRings(o)); const h = G.offset(w, d); if (!h.length) continue;
    const c = makeObj({ name: 'Contour ' + o.name, rings: h, layer: layerId || o.layer, x: 0, y: 0, clip: 'none' });
    c.rings = h; c.lb = G.bbox(h); out.push(c);
    const idx = S.objs.indexOf(o); S.objs.splice(idx, 0, c);
  }
  S.sel = new Set(out.map(o => o.id)); commit();
}
function mkWorld(name, rings, layer, before) { // objet en coordonnées monde (x=y=0)
  const c = makeObj({ name, rings, layer, x: 0, y: 0, clip: 'none' }); c.rings = rings; c.lb = G.bbox(rings);
  const idx = before ? S.objs.indexOf(before) : -1; if (idx >= 0) S.objs.splice(idx, 0, c); else S.objs.push(c); return c;
}
function shadowSel(dx, dy, layerId) { // ombre portée décalée (aplat) : lire « effet 3D » sans dégradé
  const out = [];
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const w = G.union(cRings(o)); const sh = G.xf(w, [1, 0, 0, 1, dx, dy]); out.push(mkWorld('Ombre ' + o.name, sh, layerId || o.layer, o)); }
  S.sel = new Set(out.map(o => o.id)); commit();
}
function inlineSel(gap, width, layerId) { // liseré intérieur : fin trait parallèle au bord, à l'intérieur de la forme
  const out = [];
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const w = G.union(cRings(o)); const r = G.diff(G.offset(w, -gap), G.offset(w, -gap - width)); if (r.length) out.push(mkWorld('Liseré ' + o.name, r, layerId || o.layer)); }
  S.sel = new Set(out.map(o => o.id)); commit();
}
function repeatSel(n, dx, dy, sc) { // série (traînées, vitesse) : copies décalées avec échelle progressive
  const out = [];
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const b = G.bbox(cRings(o)); let k = 1;
    for (let i = 1; i <= n; i++) { k *= sc; const w = G.xf(G.union(cRings(o)), [k, 0, 0, k, b.cx * (1 - k) + dx * i, b.cy * (1 - k) + dy * i]); out.push(mkWorld(o.name + ' ×' + (i + 1), w, o.layer, o)); } }
  S.sel = new Set(out.map(o => o.id)); commit();
}
function cleanSel(minW) { // épure : supprime ce qui est plus fin que minW mm et les îlots minuscules (pelage / reports faciles)
  let n = 0;
  for (const id of S.sel) { const o = objById(id); if (!o) continue; const w = G.union(cRings(o));
    const op = G.offset(G.offset(w, -minW / 2), minW / 2).filter(r => Math.abs(G.area([r])) > minW * minW * 6);
    if (op.length) { o.rings = op; o.x = 0; o.y = 0; o.rot = 0; o.sx = o.sy = 1; o.fx = false; o.clip = 'none'; o._wk = null; o.lb = G.bbox(op); n++; } }
  commit(); toast('Épuré : détails < ' + minW + ' mm supprimés (' + n + ' objet' + (n > 1 ? 's' : '') + ')');
}
function placeCenter() { // centre de l'écran en mm
  const c = cv(); return toMM(c.clientWidth / 2, c.clientHeight / 2);
}
function genGroup(genKey, params, seed, w, h, tierLayers, place, clipMode, name) {
  const g = GENS[genKey], rnd = rng(seed), tiers = g.fn(w, h, rnd, params || {});
  const gid = 'g' + nid(); const out = [];
  tiers.forEach((t, i) => {
    if (!t || !t.length) return; const rings = G.clean(t.map(r => r), false); if (!rings.length) return;
    const rr = G.xf(rings, [1, 0, 0, 1, -w / 2, -h / 2]);
    out.push(makeObj({ name: (name || g.label) + (tiers.length > 1 ? ' ·' + (i + 1) : ''), rings: rr, layer: tierLayers[Math.min(i, tierLayers.length - 1)], x: place.x, y: place.y, rot: place.rot || 0, fx: !!place.fx, sx: place.sx || 1, sy: place.sy || 1, clip: clipMode || 'none', gid, src: { kind: 'gen', gen: genKey, params, seed, w, h } }));
  });
  return out;
}
function shapeObj(key, w, h, layer, place) {
  const rings = G.clean(SHAPES[key].fn(w, h), false); const c = G.center(rings);
  return makeObj({ name: SHAPES[key].label, rings: c.rings, layer, x: place.x, y: place.y, clip: 'none', src: { kind: 'shape', key } });
}
function textObj(str, font, size, track, skew, align, layer, place) {
  const rings = textRings(str, font, size, track, skew, align); if (!rings.length) return null;
  const b = G.bbox(rings); const cx = align === 'left' ? b.x0 : align === 'right' ? b.x1 : b.cx;
  return makeObj({ name: 'Texte « ' + str.split('\n')[0].slice(0, 18) + ' »', rings: G.xf(rings, [1, 0, 0, 1, -b.cx, -b.cy]), layer, x: place.x, y: place.y, src: { kind: 'text', str, font, size, track, skew, align } });
}
function regenText(o, src) {
  const t = textObj(src.str, src.font, src.size, src.track, src.skew, src.align, o.layer, { x: o.x, y: o.y }); if (!t) return;
  o.rings = t.rings; o.lb = t.lb; o.src = src; o.sx = 1; o.sy = 1; o._wk = null; o.name = t.name;
}

/* ---------- fonds / calibration ---------- */
function finishCalib() {
  const cb = S.calib, d = Math.hypot(cb.pts[0][0] - cb.pts[1][0], cb.pts[0][1] - cb.pts[1][1]);
  const real = parseFloat(prompt('Longueur réelle en mm entre les 2 points cliqués ?\n(ex : empattement 2385, longueur totale 3678)', '1000'));
  S.calib = null;
  if (real > 0) { const f = real / d; const b = S.bgs.find(x => x.id === cb.bg); if (b) { const cx = cb.pts[0][0], cy = cb.pts[0][1]; b.x = cx + (b.x - cx) * f; b.y = cy + (b.y - cy) * f; b.w *= f; b.h *= f; commit(); toast('Échelle appliquée au fond (' + f.toFixed(3) + '×)'); } }
  draw();
}
function addBgFromFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    const src = rd.result, img = new Image();
    img.onload = () => {
      const R = REG().total; const k = Math.min(R.w / img.width, R.h / img.height) * 0.5;
      const b = { id: nid(), name: file.name, src, img, x: 0, y: 0, w: img.width * k, h: img.height * k, op: 0.55, vis: true };
      S.bgs.push(b); commit(); fitView(); toast('Fond ajouté. Utilisez « Calibrer l\'échelle » : cliquez 2 points de distance connue.');
    };
    img.src = src;
  };
  rd.readAsDataURL(file);
}
function toast(msg, ms = 3500) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); }

/* ---------- nouveau projet ---------- */
function newProject(veh, palette) {
  S.name = 'Ma déco rallye'; S.veh = veh || S.veh; S.objs = []; S.layers = []; S.bgs = []; S.sel = new Set(); _layK = null;
  for (const k in _clipCache) delete _clipCache[k];
  (palette || [['Noir', '#111111'], ['Blanc', '#ffffff'], ['Rouge', '#d71920']]).forEach(p => addLayer(p[0], p[1]));
  H.stack = []; H.idx = -1;
}
