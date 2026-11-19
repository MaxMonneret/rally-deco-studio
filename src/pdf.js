/* ===== pdf.js : export PDF/AI vectoriel, SVG, ZIP (sans dépendance) ===== */
'use strict';
const MM2PT = 72 / 25.4;
const f2 = n => (Math.round(n * 1000) / 1000).toString();
const hexRGB = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
const enc = new TextEncoder();
const latin = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
const pdfStr = s => '(' + String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, c => { const m = { 'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'ç': 'c', 'ô': 'o', 'û': 'u', 'ù': 'u', 'î': 'i', 'ï': 'i', 'É': 'E', '²': '2', '·': '-', '–': '-', '—': '-', '≈': '~', '°': ' deg', '×': 'x' }; return m[c] || '?'; }) + ')';

class PDFDoc {
  constructor(title = '') { this.pages = []; this.title = title; }
  /** w,h en mm ; content : chaîne d'opérateurs (en points, origine bas-gauche) ; images : [{name,bytes,w,h}] */
  addPage(wmm, hmm, content, images = []) { this.pages.push({ w: wmm * MM2PT, h: hmm * MM2PT, content, images }); }
  build() {
    const parts = []; let len = 0; const offs = [];
    const push = b => { if (typeof b === 'string') b = latin(b); parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); if (typeof body === 'string') push(body); else push(body); push('\nendobj\n'); };
    const stream = (n, dict, bytes) => { offs[n] = len; push(n + ' 0 obj\n<<' + dict + ' /Length ' + bytes.length + '>>\nstream\n'); push(bytes); push('\nendstream\nendobj\n'); };
    push('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
    const np = this.pages.length; let nextId = 7; const pageIds = [];
    const ids = this.pages.map(p => { const o = { page: nextId++, cont: nextId++, imgs: p.images.map(() => nextId++) }; pageIds.push(o.page); return o; });
    obj(1, '<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [] /D << >> >> >>'.replace(/ \/OCProperties.*>> >>$/, ' >>'));
    obj(2, '<< /Type /Pages /Kids [' + pageIds.map(i => i + ' 0 R').join(' ') + '] /Count ' + np + ' >>');
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    obj(5, '[/Separation /CutContour /DeviceCMYK 6 0 R]');
    obj(6, '<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>');
    this.pages.forEach((p, i) => {
      const id = ids[i];
      const xo = p.images.map((im, k) => '/' + im.name + ' ' + id.imgs[k] + ' 0 R').join(' ');
      obj(id.page, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f2(p.w) + ' ' + f2(p.h) + '] /TrimBox [0 0 ' + f2(p.w) + ' ' + f2(p.h) + '] /Contents ' + id.cont + ' 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ColorSpace << /CS0 5 0 R >> /XObject << ' + xo + ' >> >> >>');
      stream(id.cont, '', latin(p.content));
      p.images.forEach((im, k) => stream(id.imgs[k], '/Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', im.bytes));
    });
    const info = nextId++;
    obj(info, '<< /Title ' + pdfStr(this.title) + ' /Creator (Rally Deco Studio) /Producer (Rally Deco Studio) >>');
    const xref = len; const total = info + 1;
    push('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (let i = 1; i < total; i++) push(String(offs[i] || 0).padStart(10, '0') + ' 00000 n \n');
    push('trailer\n<< /Size ' + total + ' /Root 1 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const out = new Uint8Array(len); let o = 0; for (const b of parts) { out.set(b, o); o += b.length; }
    return out;
  }
}

/** anneaux (mm, y vers le bas, origine coin haut-gauche de la page) -> opérateurs de tracé PDF */
function ringsToOps(rings, pageH, mirrorW) {
  let s = '';
  for (const r of rings) {
    if (r.length < 3) continue;
    for (let i = 0; i < r.length; i++) {
      const x = (mirrorW ? mirrorW - r[i][0] : r[i][0]) * MM2PT, y = (pageH - r[i][1]) * MM2PT;
      s += f2(x) + ' ' + f2(y) + (i ? ' l\n' : ' m\n');
    }
    s += 'h\n';
  }
  return s;
}
/** repère de recalage (croix + cercle) */
function regMark(cx, cy, pageH, mirrorW) {
  const x = (mirrorW ? mirrorW - cx : cx) * MM2PT, y = (pageH - cy) * MM2PT, a = 5 * MM2PT, r = 2.2 * MM2PT, k = 0.5523 * r;
  return f2(x - a) + ' ' + f2(y) + ' m ' + f2(x + a) + ' ' + f2(y) + ' l ' + f2(x) + ' ' + f2(y - a) + ' m ' + f2(x) + ' ' + f2(y + a) + ' l S\n' +
    f2(x + r) + ' ' + f2(y) + ' m ' + f2(x + r) + ' ' + f2(y + k) + ' ' + f2(x + k) + ' ' + f2(y + r) + ' ' + f2(x) + ' ' + f2(y + r) + ' c ' +
    f2(x - k) + ' ' + f2(y + r) + ' ' + f2(x - r) + ' ' + f2(y + k) + ' ' + f2(x - r) + ' ' + f2(y) + ' c ' +
    f2(x - r) + ' ' + f2(y - k) + ' ' + f2(x - k) + ' ' + f2(y - r) + ' ' + f2(x) + ' ' + f2(y - r) + ' c ' +
    f2(x + k) + ' ' + f2(y - r) + ' ' + f2(x + r) + ' ' + f2(y - k) + ' ' + f2(x + r) + ' ' + f2(y) + ' c S\n';
}

/* ---------- SVG ---------- */
function svgFile({ w, h, rings, color, name, mirror, title, marks, cutOnly }) {
  const d = rings.map(r => 'M' + r.map(p => f2(mirror ? w - p[0] : p[0]) + ' ' + f2(p[1])).join('L') + 'Z').join('');
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + f2(w) + 'mm" height="' + f2(h) + 'mm" viewBox="0 0 ' + f2(w) + ' ' + f2(h) + '">\n';
  s += '<title>' + escXml(title) + '</title>\n';
  s += '<g id="' + escXml(name) + '">\n<path id="CutContour" d="' + d + '" fill="' + (cutOnly ? 'none' : color) + '" fill-rule="nonzero" stroke="#ff00ff" stroke-width="0.25"/>\n</g>\n';
  if (marks) s += '<g id="reperes" fill="none" stroke="#000" stroke-width="0.2">' + marks.map(m => { const x = mirror ? w - m[0] : m[0]; return '<path d="M' + f2(x - 5) + ' ' + f2(m[1]) + 'H' + f2(x + 5) + 'M' + f2(x) + ' ' + f2(m[1] - 5) + 'V' + f2(m[1] + 5) + '"/><circle cx="' + f2(x) + '" cy="' + f2(m[1]) + '" r="2.2"/>'; }).join('') + '</g>\n';
  return s + '</svg>\n';
}
const escXml = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ---------- ZIP (stockage sans compression) ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) { // files : [{name, data:Uint8Array}]
  const chunks = [], cd = []; let off = 0;
  const now = new Date(); const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)), dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate());
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    chunks.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cd.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + n;
  }
  let cdLen = 0; cd.forEach(b => cdLen += b.length);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdLen, true); e.setUint32(16, off, true);
  return new Blob([...chunks, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
function download(blobOrBytes, name, type) {
  const b = blobOrBytes instanceof Blob ? blobOrBytes : new Blob([blobOrBytes], { type: type || 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x';
