// Assemble tout (bibliothèques, polices, code) dans UN SEUL fichier HTML autonome : dist/RallyDecoStudio.html
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const vendors = ['vendor/clipper.js', 'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/opentype.min.js'].map(rd).join('\n;\n');
const fonts = {};
for (const f of fs.readdirSync(path.join(root, 'fonts')).filter(f => f.endsWith('.ttf'))) fonts[f.replace('.ttf', '')] = fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');
const fontJs = 'const FONT_DATA=' + JSON.stringify(fonts) + ';';
const srcs = ['geom', 'vehicles', 'gens', 'pdf', 'app', 'styles', 'kit', 'model3d', 'view3d', 'export', 'ui'].map(n => '/* ---- ' + n + '.js ---- */\n' + rd('src/' + n + '.js')).join('\n');
const js = (vendors + '\n' + fontJs + '\n' + srcs).replace(/<\/script>/gi, '<\\/script>');
const html = rd('src/index.template.html').replace('/*__CSS__*/', () => rd('src/style.css')).replace('/*__SCRIPTS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/RallyDecoStudio.html'), html);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/index.html'), html); // GitHub Pages
console.log('OK dist/RallyDecoStudio.html', (html.length / 1e6).toFixed(2), 'Mo');
