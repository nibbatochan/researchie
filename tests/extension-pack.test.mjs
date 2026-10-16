import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import JSZip from 'jszip';

// The zip offered on the dashboard must match extension/. Run `npm run pack:extension` if this fails.
test('public extension zip matches extension/', async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync('public/researchie-extension.zip'));
  const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
  const inZip = JSON.parse(await zip.file('researchie-extension/manifest.json').async('string'));
  assert.equal(inZip.version, manifest.version);
  const info = JSON.parse(fs.readFileSync('public/extension-info.json', 'utf8'));
  assert.equal(info.version, manifest.version);
  for (const f of fs.readdirSync('extension').filter((n) => n.endsWith('.js'))) {
    const a = await zip.file(`researchie-extension/${f}`).async('string');
    assert.equal(a, fs.readFileSync(`extension/${f}`, 'utf8'), `${f} is stale in the zip`);
  }
});
