/* ===== view3d.js : aperçu 3D (three.js) ===== */
'use strict';
const T3 = { ready: false, dirty: true, tex: {}, cvs: {}, group: null, timer: 0 };

function init3D() {
  if (T3.ready) return; T3.ready = true;
  const el = $('#c3d');
  const r = T3.renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, preserveDrawingBuffer: true });
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = T3.scene = new THREE.Scene(); sc.background = new THREE.Color(0x1b1f26);
  sc.fog = new THREE.Fog(0x1b1f26, 14000, 40000);
  const cam = T3.camera = new THREE.PerspectiveCamera(32, 1, 100, 80000);
  const oc = T3.controls = new THREE.OrbitControls(cam, el); oc.enableDamping = true; oc.dampingFactor = 0.08; oc.maxPolarAngle = Math.PI * 0.495; oc.minDistance = 1500; oc.maxDistance = 30000;
  // éclairage
  sc.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2d33, 0.55));
  const sun = T3.sun = new THREE.DirectionalLight(0xffffff, 1.15); sun.position.set(-5000, 9000, 6000); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sh = sun.shadow.camera; sh.left = -7000; sh.right = 7000; sh.top = 7000; sh.bottom = -7000; sh.near = 100; sh.far = 30000; sun.shadow.bias = -0.0004;
  sc.add(sun);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.35); fill.position.set(6000, 3000, -5000); sc.add(fill);
  // environnement (reflets studio)
  try {
    const es = new THREE.Scene(); const g = new THREE.SphereGeometry(50, 32, 16); const col = []; const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; const t = (y + 1) / 2; const c = new THREE.Color().lerpColors(new THREE.Color(0x25282e), new THREE.Color(0xcfe0ff), Math.pow(t, 1.4)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const lamp = (x, y, z, w, h, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    lamp(-30, 30, 20, 30, 10, 4); lamp(30, 25, -20, 20, 8, 3); lamp(0, 45, 0, 25, 25, 3);
    const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(es, 0.02).texture;
  } catch (e) { console.warn('env', e); }
  // sol
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30000, 64), new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const grid = new THREE.GridHelper(40000, 80, 0x3a4048, 0x2f343b); grid.position.y = 1; sc.add(grid);
  new ResizeObserver(() => resize3D()).observe(el.parentElement);
  resize3D(); loop3D();
  build3D(); camPreset('34av');
}
function resize3D() {
  if (!T3.renderer) return; const el = $('#c3d'), p = el.parentElement; const w = p.clientWidth, h = p.clientHeight; if (!w || !h) return;
  T3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); T3.renderer.setSize(w, h, false); T3.camera.aspect = w / h; T3.camera.updateProjectionMatrix();
}
function loop3D() {
  requestAnimationFrame(loop3D);
  if (S.mode === '2d' || !T3.ready) return;
  if (T3.dirty) { updateTextures(); T3.dirty = false; }
  T3.controls.update(); T3.renderer.render(T3.scene, T3.camera);
}
function schedule3D(fast) {
  T3.dirty = false; clearTimeout(T3.timer);
  T3.timer = setTimeout(() => { T3.dirty = true; }, fast ? 90 : 30);
  if (S.mode === '2d') T3.pending = true;
}

/* ----- textures ----- */
function updateTextures() {
  if (!T3.ready) return; const v = V(), R = REG();
  for (const vk of VIEWS) {
    const r = R[vk], k = Math.min(0.55, 2048 / Math.max(r.w, r.h));
    let c = T3.cvs[vk]; const W = Math.max(8, Math.round(r.w * k)), Hh = Math.max(8, Math.round(r.h * k));
    if (!c || c.width !== W || c.height !== Hh) { c = T3.cvs[vk] = document.createElement('canvas'); c.width = W; c.height = Hh; if (T3.tex[vk]) T3.tex[vk].dispose(); const t = T3.tex[vk] = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if (T3.mats && T3.mats[vk]) { T3.mats[vk].map = t; T3.mats[vk].needsUpdate = true; } }
    const ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, r.w, r.h);
    ctx.fillStyle = S.paint; ctx.fillRect(0, 0, r.w, r.h);
    const hasBg = S.showBg && S.bgs.some(b => b.vis && b.img && b.img.complete);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, r.w, r.h); ctx.clip(); ctx.translate(-r.x, -r.y);
    if (hasBg) for (const b of S.bgs) if (b.vis && b.img && b.img.complete) ctx.drawImage(b.img, b.x, b.y, b.w, b.h); // le plan sert de "peinture" 3D
    drawObjs(ctx); ctx.restore();
    if (!hasBg) drawOver(ctx, vk, 0.96);
    T3.tex[vk].needsUpdate = true;
  }
  if (T3.mats) { for (const m of Object.values(T3.mats)) m.color.set(0xffffff); T3.body && (T3.paintMat.color.set(S.paint)); }
}

/* ----- géométrie ----- */
function stations(v) {
  const xs = new Set(); const N = 160; for (let i = 0; i <= N; i++) xs.add(v.L * i / N);
  [...v.plan, ...v.top].forEach(p => { for (const dx of [-0.5, 0.5]) { const x = p[0] + dx; if (x > 0 && x < v.L) xs.add(x); } });
  return [...xs].sort((a, b) => a - b);
}
function strip(rows, cols, pos, uv) {
  const P = [], U = [], I = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const p = pos(i, j); P.push(p[0], p[1], p[2]); const u = uv(i, j, p); U.push(u[0], u[1]); }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
}
function build3D() {
  if (!T3.ready) return;
  const v = V(); viewGeom(v, 'top'); topY(v, 0);
  if (T3.group) { T3.scene.remove(T3.group); T3.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const g = T3.group = new THREE.Group(); T3.scene.add(g);
  T3.cvs = {}; for (const k in T3.tex) { T3.tex[k].dispose(); } T3.tex = {};
  const L = v.L, W = v.W, Hh = v.H;
  const xs = stations(v), n = xs.length, X3 = x => L / 2 - x;
  const sec = x => { const hw = halfWidth(v, x), yb = bottomY(v, x), yt = topY(v, x); const r = Math.max(10, Math.min(hw * 0.16, (yt - yb) * 0.35)); return { hw, yb, yt, r }; };
  const S_ = xs.map(sec);
  updateTexturesPrep();
  const mk = (map, extra = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ map, roughness: 0.32, metalness: 0.1, clearcoat: 0.85, clearcoatRoughness: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.9 }, extra));
  T3.mats = {}; for (const vk of VIEWS) T3.mats[vk] = mk(T3.tex[vk]);
  T3.paintMat = new THREE.MeshPhysicalMaterial({ color: S.paint, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide });
  T3.body = true;
  // flancs
  const wall = (side) => strip(n, 2, (i, j) => { const s = S_[i]; return [X3(xs[i]), j ? s.yt - s.r : s.yb, side * s.hw]; },
    (i, j, p) => { const x = xs[i]; return [side < 0 ? x / L : 1 - x / L, p[1] / Hh]; });
  const lw = new THREE.Mesh(wall(-1), T3.mats.left), rw = new THREE.Mesh(wall(1), T3.mats.right);
  // dessus (épaules + toit)
  const AR = 6, ROOF = 2, cols = AR * 2 + ROOF;
  const topPos = (i, j) => {
    const s = S_[i], x = xs[i]; let z, y;
    if (j < AR) { const a = Math.PI - (j / (AR - 1)) * Math.PI / 2; z = -s.hw + s.r + Math.cos(a) * s.r; y = s.yt - s.r + Math.sin(a) * s.r; }
    else if (j < AR + ROOF) { const t = (j - AR + 1) / (ROOF + 1); z = -s.hw + s.r + t * (2 * (s.hw - s.r)); y = s.yt; }
    else { const jj = j - AR - ROOF; const a = Math.PI / 2 - (jj / (AR - 1)) * Math.PI / 2; z = s.hw - s.r + Math.cos(a) * s.r; y = s.yt - s.r + Math.sin(a) * s.r; }
    return [X3(x), y, z];
  };
  const tg = strip(n, cols, topPos, (i, j, p) => [(p[2] + W / 2) / W, 1 - xs[i] / L]);
  const tm = new THREE.Mesh(tg, T3.mats.top);
  // dessous
  const ug = strip(n, 2, (i, j) => [X3(xs[i]), S_[i].yb, (j ? 1 : -1) * S_[i].hw], () => [0, 0]);
  const um = new THREE.Mesh(ug, new THREE.MeshStandardMaterial({ color: 0x15171a, side: THREE.DoubleSide }));
  // faces avant / arrière
  const cap = (i, front) => {
    const s = S_[i]; const pts = [];
    pts.push([-s.hw, s.yb]); pts.push([-s.hw, s.yt - s.r]);
    for (let a = 1; a < AR; a++) { const t = Math.PI - (a / (AR - 1)) * Math.PI / 2; pts.push([-s.hw + s.r + Math.cos(t) * s.r, s.yt - s.r + Math.sin(t) * s.r]); }
    for (let a = 0; a < AR; a++) { const t = Math.PI / 2 - (a / (AR - 1)) * Math.PI / 2; pts.push([s.hw - s.r + Math.cos(t) * s.r, s.yt - s.r + Math.sin(t) * s.r]); }
    pts.push([s.hw, s.yb]);
    const cz = 0, cy = (s.yb + s.yt) / 2; const P = [], U = [], I = [];
    const add = (z, y) => { P.push(X3(xs[i]), y, z); U.push(front ? (W / 2 - z) / W : (z + W / 2) / W, y / Hh); };
    add(cz, cy); pts.forEach(p => add(p[0], p[1]));
    for (let k = 1; k < pts.length; k++) I.push(0, k, k + 1);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); gg.setIndex(I); gg.computeVertexNormals(); return gg;
  };
  const fm = new THREE.Mesh(cap(0, true), T3.mats.front), rm = new THREE.Mesh(cap(n - 1, false), T3.mats.rear);
  for (const m of [lw, rw, tm, um, fm, rm]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // roues
  const tireW = Math.min(0.15 * W, 320);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.3, metalness: 0.9 });
  for (const w of v.wheels) for (const sd of [-1, 1]) {
    const hw = halfWidth(v, w.x), grp = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, tireW, 40, 1), tyre); t.rotation.x = Math.PI / 2; grp.add(t);
    const rm2 = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.62, w.r * 0.62, tireW + 4, 32), rim); rm2.rotation.x = Math.PI / 2; grp.add(rm2);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.2, w.r * 0.2, tireW + 10, 16), new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: .8, roughness: .4 })); hub.rotation.x = Math.PI / 2; grp.add(hub);
    grp.position.set(X3(w.x), w.r, sd * (hw - tireW * 0.35)); grp.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); g.add(grp);
  }
  T3.dirty = true; T3.fitDist = Math.max(L, Hh * 2) * 1.55;
}
function updateTexturesPrep() { // crée les textures avant les matériaux
  const v = V(), R = REG();
  for (const vk of VIEWS) {
    const r = R[vk], k = Math.min(0.55, 2048 / Math.max(r.w, r.h));
    const c = T3.cvs[vk] = document.createElement('canvas'); c.width = Math.max(8, Math.round(r.w * k)); c.height = Math.max(8, Math.round(r.h * k));
    const t = T3.tex[vk] = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter;
  }
}

/* ----- caméras ----- */
function camPreset(p) {
  if (!T3.ready) return; const c = T3.camera, o = T3.controls; const d = (T3.fitDist || 9000) * Math.max(1, 1.25 / Math.min(1.6, c.aspect || 1)), v = V(), cy = v.H * 0.4;
  const P = { '34av': [0.62, 0.30, -0.8], '34ar': [-0.62, 0.30, 0.8], gauche: [0, 0.08, -1.1], droite: [0, 0.08, 1.1], face: [1.15, 0.1, 0.001], arriere: [-1.15, 0.1, 0.001], dessus: [0, 1.35, 0.001] }[p] || [-0.6, 0.3, 0.8];
  c.position.set(P[0] * d, cy + P[1] * d, P[2] * d); o.target.set(0, cy * 0.7, 0); o.update();
}
function shot3D(w, h, preset) {
  const r = T3.renderer, el = $('#c3d'); const ow = el.width, oh = el.height;
  if (preset) camPreset(preset);
  if (T3.dirty) { updateTextures(); T3.dirty = false; }
  r.setPixelRatio(1); r.setSize(w, h, false); T3.camera.aspect = w / h; T3.camera.updateProjectionMatrix(); T3.controls.update();
  r.render(T3.scene, T3.camera); const url = el.toDataURL('image/jpeg', 0.92);
  resize3D(); return url;
}
