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

/* ----- géométrie (carrosserie lofée à sections courbes) ----- */
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const NS1 = 22, NS2 = 8, NS3 = 6, MH = NS1 + NS2 + NS3;
function stations(v) {
  const xs = []; const N = 140; for (let i = 0; i <= N; i++) xs.push(v.L * i / N);
  [...v.plan, ...v.top].forEach(p => { for (const dx of [-0.5, 0.5]) { const x = p[0] + dx; if (x > 0 && x < v.L) xs.push(x); } });
  for (let i = 1; i <= 10; i++) { const e = 110 * (i / 10) * (i / 10); xs.push(e, v.L - e); }
  for (const w of v.wheels) { const ar = w.r * 1.2 + 30; for (let x = w.x - ar; x <= w.x + ar; x += 18) if (x > 0 && x < v.L) xs.push(x); }
  xs.sort((a, b) => a - b); const o = [xs[0]]; for (const x of xs) if (x - o[o.length - 1] > 0.6) o.push(x); return o;
}
// demi-section (z>=0) : bas de caisse -> flanc -> épaule/pilier -> toit/capot (centre)
function halfProfile(v, x) {
  let hw = Math.max(80, halfWidth(v, x)), yb = bottomY(v, x), yt = topY(v, x);
  const e = 110, d = Math.min(x, v.L - x);
  if (d < e) { const t = d / e, s = Math.sqrt(1 - (1 - t) * (1 - t)); hw *= 0.8 + 0.2 * s; const sh = 45 * (1 - s); yb += sh; yt -= sh; }
  yt = Math.max(yt, yb + 60);
  const tuck = v.tuck ?? 0.06, tum = v.tumble ?? 0.22, beltY = v.belt || v.H * 0.6;
  const bul = u => 1 - tuck * (1 - u) * (1 - u);
  const k = sstep(beltY + 10, beltY + 130, yt), A = [], B = [];
  { // capot / coffre : épaule arrondie + léger bombé
    const rs = Math.min(hw * 0.3, (yt - yb) * 0.4, 140), crown = Math.min(30, hw * 0.05), yTop = z => yt - crown * (z / hw) * (z / hw), yA = yt - rs;
    for (let j = 0; j < NS1; j++) { const u = j / (NS1 - 1); A.push([hw * bul(u), yb + u * (yA - yb)]); }
    const zE = hw - rs, yE = yTop(zE);
    for (let j = 1; j <= NS2; j++) { const th = j / NS2 * Math.PI / 2; A.push([zE + rs * Math.cos(th), yA + (yE - yA) * Math.sin(th)]); }
    for (let j = 1; j <= NS3; j++) { const z = zE * (1 - j / NS3); A.push([z, yTop(z)]); }
  }
  { // habitacle : piliers inclinés (tumblehome) + arrondi de pavillon
    const yB = Math.max(yb + 40, Math.min(beltY, yt - 120)), hr = hw * (1 - tum), rr = Math.min(70, (yt - yB) * 0.3, hr * 0.5), yTop = z => yt - 12 * (z / hr) * (z / hr);
    for (let j = 0; j < NS1; j++) { const u = j / (NS1 - 1); B.push([hw * bul(u), yb + u * (yB - yb)]); }
    const P0 = [hw, yB], P1 = [hr, yTop(hr)], dl = Math.hypot(P0[0] - P1[0], P0[1] - P1[1]) || 1;
    const Q0 = [P1[0] + (P0[0] - P1[0]) * rr / dl, P1[1] + (P0[1] - P1[1]) * rr / dl], zq = Math.max(0, hr - rr), Q1 = [zq, yTop(zq)];
    const Na = NS2 / 2; for (let j = 1; j <= Na; j++) { const t = j / Na; B.push([P0[0] + (Q0[0] - P0[0]) * t, P0[1] + (Q0[1] - P0[1]) * t]); }
    const Nb = NS2 - Na; for (let j = 1; j <= Nb; j++) { const t = j / Nb, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; B.push([a * Q0[0] + b * P1[0] + c * Q1[0], a * Q0[1] + b * P1[1] + c * Q1[1]]); }
    for (let j = 1; j <= NS3; j++) { const z = zq * (1 - j / NS3); B.push([z, yTop(z)]); }
  }
  return A.map((a, j) => [a[0] + (B[j][0] - a[0]) * k, a[1] + (B[j][1] - a[1]) * k]);
}
function build3D() {
  if (!T3.ready) return;
  const v = V(); viewGeom(v, 'top'); topY(v, 0);
  if (T3.group) { T3.scene.remove(T3.group); T3.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const g = T3.group = new THREE.Group(); T3.scene.add(g);
  T3.cvs = {}; for (const k in T3.tex) { T3.tex[k].dispose(); } T3.tex = {};
  const L = v.L, W = v.W, Hh = v.H, X3 = x => L / 2 - x;
  const xs = stations(v), n = xs.length, K = 2 * MH - 1;
  updateTexturesPrep();
  const mk = (map, extra = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ map, roughness: 0.32, metalness: 0.1, clearcoat: 0.85, clearcoatRoughness: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.9 }, extra));
  T3.mats = {}; for (const vk of VIEWS) T3.mats[vk] = mk(T3.tex[vk]);
  T3.paintMat = new THREE.MeshPhysicalMaterial({ color: S.paint, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide });
  T3.body = true;
  if (MODEL.tris && addModelMeshes(g, v)) { T3.dirty = true; T3.fitDist = Math.max(L, Hh * 2) * 1.55; return; }
  const archIn = (x, y) => { let a = 0; for (const w of v.wheels) { const d = Math.hypot(x - w.x, y - w.r) - w.r * 1.14; a = Math.max(a, 1 - sstep(-30, 30, d)); } return a; };
  // grille de sommets : n stations x K points (gauche bas -> toit -> droite bas)
  const P = new Float32Array(n * K * 3), SX = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = xs[i], hp = halfProfile(v, x), D = Math.min(150, hp[NS1 - 1][0] * 0.2); SX[i] = x;
    for (let j = 0; j < MH; j++) {
      let z = hp[j][0], y = hp[j][1]; if (j < NS1) z -= D * archIn(x, y);
      P.set([X3(x), y, -z], (i * K + j) * 3); if (j < MH - 1) P.set([X3(x), y, z], (i * K + 2 * MH - 2 - j) * 3);
    }
  }
  const N = new Float32Array(P.length), g3 = (a, b) => (a * K + b) * 3;
  for (let i = 0; i < n; i++) for (let c = 0; c < K; c++) {
    const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, n - 1), c0 = Math.max(c - 1, 0), c1 = Math.min(c + 1, K - 1);
    const t1 = [0, 1, 2].map(q => P[g3(i1, c) + q] - P[g3(i0, c) + q]), t2 = [0, 1, 2].map(q => P[g3(i, c1) + q] - P[g3(i, c0) + q]);
    const nx = t1[1] * t2[2] - t1[2] * t2[1], ny = t1[2] * t2[0] - t1[0] * t2[2], nz = t1[0] * t2[1] - t1[1] * t2[0], l = Math.hypot(nx, ny, nz) || 1;
    N.set([nx / l, ny / l, nz / l], g3(i, c));
  }
  const fixWind = (I, Pp, Nn) => {
    const a = I[0], b = I[1], c = I[2]; const ux = Pp[b * 3] - Pp[a * 3], uy = Pp[b * 3 + 1] - Pp[a * 3 + 1], uz = Pp[b * 3 + 2] - Pp[a * 3 + 2], wx = Pp[c * 3] - Pp[a * 3], wy = Pp[c * 3 + 1] - Pp[a * 3 + 1], wz = Pp[c * 3 + 2] - Pp[a * 3 + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    if (fx * Nn[a * 3] + fy * Nn[a * 3 + 1] + fz * Nn[a * 3 + 2] < 0) for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
  };
  const geo = (Pp, Nn, U, I) => { fixWind(I, Pp, Nn); const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); gg.setIndex(I); return gg; };
  const part = (c0, c1, uvf, mat) => {
    const cols = c1 - c0 + 1, Pp = [], Nn = [], U = [], I = [];
    for (let i = 0; i < n; i++) for (let c = c0; c <= c1; c++) { const q = g3(i, c); Pp.push(P[q], P[q + 1], P[q + 2]); Nn.push(N[q], N[q + 1], N[q + 2]); U.push(...uvf(SX[i], P[q + 1], P[q + 2])); }
    for (let i = 0; i < n - 1; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + 1, cc = a + cols, d = cc + 1; I.push(a, cc, b, b, cc, d); }
    const m = new THREE.Mesh(geo(Pp, Nn, U, I), mat); m.castShadow = m.receiveShadow = true; g.add(m);
  };
  const Jq = NS1 + NS2 - 1;
  part(0, Jq, (x, y) => [x / L, y / Hh], T3.mats.left);
  part(Jq, K - 1 - Jq, (x, y, z) => [(z + W / 2) / W, 1 - x / L], T3.mats.top);
  part(K - 1 - Jq, K - 1, (x, y) => [1 - x / L, y / Hh], T3.mats.right);
  { // dessous
    const Pp = [], Nn = [], U = [], I = [];
    for (let i = 0; i < n; i++) for (const c of [0, K - 1]) { const q = g3(i, c); Pp.push(P[q], P[q + 1], P[q + 2]); Nn.push(0, -1, 0); U.push(0, 0); }
    for (let i = 0; i < n - 1; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    g.add(new THREE.Mesh(geo(Pp, Nn, U, I), new THREE.MeshStandardMaterial({ color: 0x15171a, side: THREE.DoubleSide })));
  }
  const cap = (i, front) => { // faces avant / arrière
    const Pp = [], Nn = [], U = [], I = []; let cy = 0; for (let c = 0; c < K; c++) cy += P[g3(i, c) + 1]; cy /= K;
    const add = (z, y) => { Pp.push(X3(xs[i]), y, z); Nn.push(front ? 1 : -1, 0, 0); U.push(front ? (W / 2 - z) / W : (z + W / 2) / W, y / Hh); };
    add(0, cy); for (let c = 0; c < K; c++) add(P[g3(i, c) + 2], P[g3(i, c) + 1]);
    for (let k = 1; k < K; k++) I.push(0, k, k + 1);
    return geo(Pp, Nn, U, I);
  };
  for (const [i, f, mt] of [[0, true, T3.mats.front], [n - 1, false, T3.mats.rear]]) { const m = new THREE.Mesh(cap(i, f), mt); m.castShadow = true; g.add(m); }
  // roues dans les passages
  const tireW = Math.min(0.15 * W, 320), liner = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, side: THREE.DoubleSide });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.9 }), disc = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, metalness: 0.6 }), alu = new THREE.MeshStandardMaterial({ color: 0xc4c9d0, roughness: 0.25, metalness: 0.9 });
  for (const w of v.wheels) for (const sd of [-1, 1]) {
    const hp = halfProfile(v, w.x), hw = hp[NS1 - 1][0], D = Math.min(150, hw * 0.2), grp = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, tireW, 48, 1), tyre); t.rotation.x = Math.PI / 2; grp.add(t);
    const dk = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.66, w.r * 0.66, tireW + 4, 40), disc); dk.rotation.x = Math.PI / 2; grp.add(dk);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(w.r * 0.66, w.r * 0.03, 8, 40), alu); lip.position.z = tireW / 2 + 2; grp.add(lip);
    for (let a = 0; a < 5; a++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(w.r * 0.5, w.r * 0.11, 12), alu); const an = a / 5 * Math.PI * 2; sp.position.set(Math.cos(an) * w.r * 0.28, Math.sin(an) * w.r * 0.28, tireW / 2 + 4); sp.rotation.z = an; grp.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.13, w.r * 0.13, tireW + 14, 16), alu); hub.rotation.x = Math.PI / 2; grp.add(hub);
    if (sd < 0) grp.rotation.y = Math.PI; // enjoliveur côté extérieur
    grp.position.set(X3(w.x), w.r, sd * (hw - tireW / 2 - 5)); grp.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(grp);
    const ln = new THREE.Mesh(new THREE.CircleGeometry(w.r * 1.08, 40), liner); ln.position.set(X3(w.x), w.r, sd * (hw - D + 3)); g.add(ln);
  }
  if (v.ws) { // rétroviseurs
    const mm = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.4 }), bw = halfProfile(v, v.ws[0] + 90)[NS1 - 1][0];
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(130, 85, 150), mm); m.position.set(X3(v.ws[0] + 90), (v.belt || Hh * 0.6) + 55, sd * (bw + 50)); m.castShadow = true; g.add(m); }
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
