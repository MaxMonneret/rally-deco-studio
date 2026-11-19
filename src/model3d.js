/* ===== model3d.js : import d'un modèle 3D réel (OBJ / STL / GLB) + plaquage de la déco par projection ===== */
'use strict';
const MODEL = { tris: null, name: '', opt: { up: 'y', front: '+x', fit: 'veh', ground: true } };

/* ---- lecture des formats : retourne Float32Array de triangles (9 floats par triangle) ---- */
function parseOBJ(txt) {
  const v = [], out = [];
  for (const ln of txt.split(/\r?\n/)) {
    if (ln[0] === 'v' && ln[1] === ' ') { const a = ln.trim().split(/\s+/); v.push([+a[1], +a[2], +a[3]]); }
    else if (ln[0] === 'f' && ln[1] === ' ') {
      const idx = ln.trim().split(/\s+/).slice(1).map(s => { let i = parseInt(s.split('/')[0]); return i < 0 ? v.length + i : i - 1; });
      for (let k = 1; k < idx.length - 1; k++) for (const i of [idx[0], idx[k], idx[k + 1]]) out.push(...v[i]);
    }
  }
  return new Float32Array(out);
}
function parseSTL(buf) {
  const dv = new DataView(buf), n = dv.getUint32(80, true);
  if (84 + n * 50 === buf.byteLength) { const o = new Float32Array(n * 9); for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) o[i * 9 + k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true); return o; }
  const txt = new TextDecoder().decode(buf), out = []; const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g; let m; while ((m = re.exec(txt))) out.push(+m[1], +m[2], +m[3]); return new Float32Array(out);
}
function parseGLB(buf) {
  const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB invalide');
  let off = 12, json = null, bin = null;
  while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true); const chunk = buf.slice(off + 8, off + 8 + len); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004E4942) bin = chunk; off += 8 + len; }
  if (!json || !bin) throw new Error('GLB sans données (fichier .gltf externe non géré)');
  const CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const read = ai => {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], [T, sz] = CT[a.componentType], nc = NC[a.type], stride = bv.byteStride || sz * nc, base = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * nc);
    const view = new DataView(bin); const getter = { 5126: 'getFloat32', 5123: 'getUint16', 5125: 'getUint32', 5121: 'getUint8', 5122: 'getInt16', 5120: 'getInt8' }[a.componentType];
    for (let i = 0; i < a.count; i++) for (let c = 0; c < nc; c++) out[i * nc + c] = view[getter](base + i * stride + c * sz, true);
    return out;
  };
  const mul = (A, B) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += A[k * 4 + i] * B[j * 4 + k]; return o; };
  const local = n => { if (n.matrix) return n.matrix; const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
    return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]; };
  const out = [];
  const visit = (ni, M) => {
    const n = json.nodes[ni], W = mul(M, local(n));
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      if ((p.mode ?? 4) !== 4 || p.attributes.POSITION === undefined) continue;
      const P = read(p.attributes.POSITION), I = p.indices !== undefined ? read(p.indices) : Array.from({ length: P.length / 3 }, (_, i) => i);
      const tp = i => { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; return [W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]]; };
      for (let i = 0; i + 2 < I.length; i += 3) out.push(...tp(I[i]), ...tp(I[i + 1]), ...tp(I[i + 2]));
    }
    (n.children || []).forEach(c => visit(c, W));
  };
  const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], sc = json.scenes[json.scene || 0];
  sc.nodes.forEach(n => visit(n, I4));
  return new Float32Array(out);
}
function loadModelFile(file) {
  const rd = new FileReader(), ext = (file.name.split('.').pop() || '').toLowerCase();
  rd.onload = () => {
    try {
      const t = ext === 'obj' ? parseOBJ(rd.result) : ext === 'stl' ? parseSTL(rd.result) : parseGLB(rd.result);
      if (t.length < 9) throw new Error('aucun triangle trouvé');
      MODEL.tris = t; MODEL.name = file.name; guessAxes(); init3D(); build3D(); toast('Modèle chargé : ' + file.name + ' (' + (t.length / 9 | 0).toLocaleString('fr') + ' triangles). Réglez les axes si besoin.'); buildModelUI();
    } catch (e) { toast('Modèle illisible : ' + e.message); }
  };
  if (ext === 'obj') rd.readAsText(file); else rd.readAsArrayBuffer(file);
}
function guessAxes() { // longueur = plus grande dimension ; hauteur = Z si le modèle est « Z-up » (STEP/CAD), sinon Y
  const t = MODEL.tris, mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (let i = 0; i < t.length; i += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], t[i + c]); mx[c] = Math.max(mx[c], t[i + c]); }
  const d = mx.map((m, i) => m - mn[i]), li = d[0] >= d[1] && d[0] >= d[2] ? 0 : d[1] >= d[2] ? 1 : 2;
  MODEL.opt.front = ['+x', '+y', '+z'][li]; const rest = [0, 1, 2].filter(i => i !== li); const hi = d[rest[0]] < d[rest[1]] ? rest[0] : rest[1];
  MODEL.opt.up = ['x', 'y', 'z'][hi === li ? 1 : hi];
}
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], '-x': [-1, 0, 0], '-y': [0, -1, 0], '-z': [0, 0, -1] };
/** ajoute le modèle (déco plaquée par projection) dans le groupe g ; retourne false si pas de modèle */
function addModelMeshes(g, v) {
  if (!MODEL.tris) return false;
  const { L, W, H } = v, o = MODEL.opt, F = AX[o.front.replace('+', '')], U = AX[o.up];
  if (!F || !U || F.map(Math.abs).join() === U.map(Math.abs).join()) { toast('Axes avant / haut incompatibles'); return false; }
  const S = [F[1] * U[2] - F[2] * U[1], F[2] * U[0] - F[0] * U[2], F[0] * U[1] - F[1] * U[0]];
  const dot = (p, a) => p[0] * a[0] + p[1] * a[1] + p[2] * a[2];
  const t = MODEL.tris, n = t.length / 9, P = new Float32Array(t.length);
  const mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (let i = 0; i < t.length; i += 3) { const p = [t[i], t[i + 1], t[i + 2]], q = [dot(p, F), dot(p, U), dot(p, S)]; for (let c = 0; c < 3; c++) { P[i + c] = q[c]; mn[c] = Math.min(mn[c], q[c]); mx[c] = Math.max(mx[c], q[c]); } }
  const ex = mx[0] - mn[0], ey = mx[1] - mn[1], ez = mx[2] - mn[2];
  let kx = L / ex, ky = H / ey, kz = W / ez; if (o.fit === 'len') ky = kz = kx;
  const cx = (mx[0] + mn[0]) / 2, cz = (mx[2] + mn[2]) / 2;
  for (let i = 0; i < P.length; i += 3) { P[i] = (P[i] - cx) * kx; P[i + 1] = (P[i + 1] - mn[1]) * ky; P[i + 2] = (P[i + 2] - cz) * kz; }
  // normales lissées (soudure par position, seuil d'angle 50°)
  const fn = new Float32Array(n * 3), key = (x, y, z) => Math.round(x / 4) + ',' + Math.round(y / 4) + ',' + Math.round(z / 4), map = new Map();
  for (let f = 0; f < n; f++) {
    const a = f * 9, ux = P[a + 3] - P[a], uy = P[a + 4] - P[a + 1], uz = P[a + 5] - P[a + 2], wx = P[a + 6] - P[a], wy = P[a + 7] - P[a + 1], wz = P[a + 8] - P[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; fn[f * 3] = nx / l; fn[f * 3 + 1] = ny / l; fn[f * 3 + 2] = nz / l;
    for (let k = 0; k < 3; k++) { const kk = key(P[a + k * 3], P[a + k * 3 + 1], P[a + k * 3 + 2]); (map.get(kk) || map.set(kk, []).get(kk)).push(f); }
  }
  const groups = { left: [], right: [], top: [], front: [], rear: [], dark: [], tyre: [] }, X3 = x => x;
  const tyreAt = (xl, y, nz) => v.wheels.some(w => Math.hypot(xl - w.x, y - w.r) < w.r * 1.06 && Math.abs(nz) > 0.5);
  for (let f = 0; f < n; f++) {
    const a = f * 9, nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2];
    const cxm = (P[a] + P[a + 3] + P[a + 6]) / 3, cym = (P[a + 1] + P[a + 4] + P[a + 7]) / 3, czm = (P[a + 2] + P[a + 5] + P[a + 8]) / 3;
    let gname; const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    if (tyreAt(L / 2 - cxm, cym, nz) && Math.abs(czm) > W * 0.2) gname = 'tyre';
    else if (ny < -0.55 || cym < 45) gname = 'dark';
    else if (ay >= ax && ay >= az) gname = ny > 0 ? 'top' : 'dark';
    else if (az >= ax) gname = nz < 0 ? 'left' : 'right'; else gname = nx > 0 ? 'front' : 'rear';
    const G_ = groups[gname];
    for (let k = 0; k < 3; k++) {
      const px = P[a + k * 3], py = P[a + k * 3 + 1], pz = P[a + k * 3 + 2], xl = L / 2 - px;
      let sx = 0, sy = 0, sz = 0, kk = key(px, py, pz), lst = map.get(kk) || [f];
      for (const g2 of lst) { const d = fn[g2 * 3] * nx + fn[g2 * 3 + 1] * ny + fn[g2 * 3 + 2] * nz; if (d > 0.64) { sx += fn[g2 * 3]; sy += fn[g2 * 3 + 1]; sz += fn[g2 * 3 + 2]; } }
      const l = Math.hypot(sx, sy, sz) || 1;
      let u = 0, vv = 0;
      if (gname === 'left') { u = xl / L; vv = py / H; } else if (gname === 'right') { u = 1 - xl / L; vv = py / H; }
      else if (gname === 'top') { u = (pz + W / 2) / W; vv = 1 - xl / L; } else if (gname === 'front') { u = (W / 2 - pz) / W; vv = py / H; } else if (gname === 'rear') { u = (pz + W / 2) / W; vv = py / H; }
      G_.push([px, py, pz, sx / l, sy / l, sz / l, u, vv]);
    }
  }
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.8, side: THREE.DoubleSide }), tyre = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.9, side: THREE.DoubleSide });
  for (const k in groups) {
    const arr = groups[k]; if (!arr.length) continue;
    const pos = new Float32Array(arr.length * 3), nor = new Float32Array(arr.length * 3), uv = new Float32Array(arr.length * 2);
    arr.forEach((q, i) => { pos.set(q.slice(0, 3), i * 3); nor.set(q.slice(3, 6), i * 3); uv.set(q.slice(6, 8), i * 2); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, k === 'dark' ? dark : k === 'tyre' ? tyre : T3.mats[k]); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  return true;
}
function buildModelUI() {
  const box = $('#modelBox'); if (!box) return; box.innerHTML = '';
  const sel = (id, opts, val, fn) => h('select', { id, onchange: e => { fn(e.target.value); build3D(); } , html: opts.map(o => `<option value="${o[0]}" ${o[0] === val ? 'selected' : ''}>${o[1]}</option>`).join('') });
  box.append(h('div', { class: 'ptitle small' }, 'Modèle 3D réel (Blender / GrabCAD…)'),
    h('p', { class: 'hint' }, 'Importez un modèle de VOTRE voiture : OBJ, STL ou GLB (export Blender : File ▸ Export ▸ glTF 2.0 .glb). Il reste sur votre ordinateur ; la déco est plaquée dessus par projection depuis la planche. Respectez la licence du modèle (GrabCAD : souvent usage personnel). Retirez les pièces inutiles (intérieur, moteur) pour un rendu propre.'),
    h('label', { class: 'btn wide' }, MODEL.tris ? 'Remplacer le modèle…' : 'Importer un modèle 3D…', h('input', { type: 'file', accept: '.obj,.stl,.glb', hidden: true, onchange: e => { if (e.target.files[0]) loadModelFile(e.target.files[0]); e.target.value = ''; } })));
  if (MODEL.tris) {
    box.append(h('div', { class: 'bgname' }, MODEL.name),
      h('div', { class: 'grid2' },
        h('label', { class: 'f' }, 'Avant du modèle', sel('m_front', [['+x', '+X'], ['-x', '−X'], ['+y', '+Y'], ['-y', '−Y'], ['+z', '+Z'], ['-z', '−Z']], MODEL.opt.front, v => { MODEL.opt.front = v; })),
        h('label', { class: 'f' }, 'Haut du modèle', sel('m_up', [['x', '+X'], ['-x', '−X'], ['y', '+Y'], ['-y', '−Y'], ['z', '+Z'], ['-z', '−Z']], MODEL.opt.up, v => { MODEL.opt.up = v; }))),
      h('label', { class: 'f' }, 'Mise à l\'échelle', sel('m_fit', [['veh', 'Aux dimensions du gabarit (la déco colle)'], ['len', 'À la longueur (garde les proportions du modèle)']], MODEL.opt.fit, v => { MODEL.opt.fit = v; })),
      h('div', { class: 'btnrow' }, h('button', { class: 'danger', onclick: () => { MODEL.tris = null; MODEL.name = ''; build3D(); buildModelUI(); } }, 'Retirer le modèle')));
  }
}
