// Zips extension/ into public/researchie-extension.zip so the dashboard can offer it
// for download. Run before each deploy: npm run pack:extension
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'extension');
const out = path.join(root, 'public');
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));

// Fixed date so the zip only changes when the files do.
const date = new Date('2026-01-01T00:00:00Z');
const zip = new JSZip();
const folder = zip.folder('researchie-extension');

function add(dir, rel = '') {
  for (const name of fs.readdirSync(path.join(dir, rel)).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    const full = path.join(dir, r);
    if (fs.statSync(full).isDirectory()) add(dir, r);
    else folder.file(r, fs.readFileSync(full), { date });
  }
}
add(src);

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(path.join(out, 'researchie-extension.zip'), buf);
fs.writeFileSync(
  path.join(out, 'extension-info.json'),
  JSON.stringify({ version: manifest.version, bytes: buf.length }) + '\n',
);
console.log(`researchie-extension.zip v${manifest.version}, ${(buf.length / 1024).toFixed(0)} KB`);
