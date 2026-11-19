// Test hors navigateur : génère une déco et écrit les PDF/SVG de découpe sur disque.
// usage : node tools/headless-export.mjs <vehicule> <style> <dossier-sortie>
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
if (process.env.ISL) 0;
const [veh = 'hatch', style = 'griffures', out = path.join(root, 'exemples')] = process.argv.slice(2);
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const fonts = {}; for (const f of fs.readdirSync(path.join(root, 'fonts'))) fonts[f.replace('.ttf', '')] = fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');
const ctx = { console, atob: s => Buffer.from(s, 'base64').toString('binary'), TextEncoder, Blob, setTimeout, performance, Uint8Array, Uint32Array, window: { addEventListener() {}, devicePixelRatio: 1 }, document: { documentElement: {}, createElement() { return {}; } }, localStorage: { setItem() {}, getItem() { return null; } }, navigator: { userAgent: 'node', appName: 'Netscape' } };
ctx.window.document = ctx.document; vm.createContext(ctx); ctx.self = ctx; ctx.globalThis = ctx;
const run = (code, name) => vm.runInContext(code, ctx, { filename: name });
run(rd('vendor/clipper.js'), 'clipper');
run(rd('vendor/opentype.min.js'), 'opentype');
run('const FONT_DATA=' + JSON.stringify(fonts) + ';', 'fonts');
const all = ['geom', 'vehicles', 'gens', 'pdf', 'app', 'styles', 'export'].map(n => rd('src/' + n + '.js')).join('\n');
run(all + `
globalThis.__api = { S, newProject, applyStyle, allPrepped, layerPdf, layerSvg, previewPdf, EXP, slug, STYLES, V, cRings, snapshot };
`, 'bundle');
const A = ctx.__api; A.newProject(veh); A.applyStyle(style, { num: '7', crew: 'DUPONT / MARTIN' });
fs.mkdirSync(out, { recursive: true });
if (process.env.ISL) A.EXP.islands = true;
const pre = A.allPrepped();
pre.forEach((ls, i) => { const n = `${String(i + 1).padStart(2, '0')}_${A.slug(ls.layer.name)}`; fs.writeFileSync(path.join(out, n + '.pdf'), A.layerPdf(ls, i)); fs.writeFileSync(path.join(out, n + '.svg'), A.layerSvg(ls, i)); console.log(n, ls.pieces + ' pièces', ls.area.toFixed(2) + ' m²', ls.pageW + 'x' + Math.round(ls.pageH) + ' mm'); });
fs.writeFileSync(path.join(out, 'apercu.pdf'), A.previewPdf(false));
if (process.env.LIST) for (const ls of pre) { console.log('--', ls.layer.name); ls.placed.forEach(p => console.log('  ', Math.round(p.w) + 'x' + Math.round(p.h), p.label)); }
