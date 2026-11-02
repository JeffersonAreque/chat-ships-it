const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('all product pages use the shared locally bundled brand fonts', () => {
  for (const page of ['game/index.html', 'overlay/index.html', 'admin/index.html']) {
    assert.match(read(page), /href="\/assets\/brand\.css"/);
  }
  const brand = read('public/brand.css');
  const server = read('server.js');
  assert.match(brand, /@font-face[\s\S]*Space Grotesk[\s\S]*SpaceGrotesk-Variable\.ttf/);
  assert.match(brand, /@font-face[\s\S]*Space Mono[\s\S]*SpaceMono-Regular\.ttf/);
  assert.doesNotMatch(brand, /fonts\.googleapis\.com|fonts\.gstatic\.com|@import\s+url/i);
  assert.match(server, /app\.use\('\/assets', express\.static\(publicDirectory/);
  for (const file of [
    'public/fonts/space-grotesk/SpaceGrotesk-Variable.ttf',
    'public/fonts/space-grotesk/OFL.txt',
    'public/fonts/space-mono/SpaceMono-Regular.ttf',
    'public/fonts/space-mono/OFL.txt',
  ]) assert.ok(fs.statSync(path.join(root, file)).size > 1000, `${file} should be bundled`);
});

test('game has a 1280 by 720 OBS canvas, clean OBS chrome, and a chat credit ticker', () => {
  const html = read('game/index.html');
  const css = read('game/game.css');
  assert.match(html, /id="game" width="1280" height="720"/);
  assert.match(html, /get\('obs'\) === '1'/);
  assert.match(html, /Built by chat:/);
  assert.match(css, /html\.obs-mode #game[\s\S]*100vw/);
  assert.match(css, /html\.obs-mode \.wordmark[\s\S]*display:\s*none/);
  assert.match(css, /credit-ticker/);
});

test('overlay keeps panels at the edges and styles live diff, stage dots, celebration, and timeline thumbnails', () => {
  const html = read('overlay/index.html');
  const css = read('overlay/overlay.css');
  for (const id of ['build-banner', 'build-clock', 'stage-queued', 'stage-building', 'stage-validating', 'stage-shipped', 'approved', 'live-code', 'timeline', 'replay-frame', 'build-toast', 'celebration-particles']) {
    assert.ok(html.includes(`id="${id}"`), `Overlay is missing ${id}`);
  }
  assert.match(css, /\.build-status[\s\S]*top:/);
  assert.match(css, /\.code-panel[\s\S]*bottom:/);
  assert.match(css, /\.timeline-panel[\s\S]*bottom:/);
  assert.match(css, /\.diff-add/);
  assert.match(css, /\.diff-remove/);
  assert.match(css, /\.timeline-thumb/);
  assert.match(css, /\.ship-toast[\s\S]*50%/);
});

test('admin uses shared brand styling with card sections and clear action roles', () => {
  const html = read('admin/index.html');
  const css = read('admin/admin.css');
  assert.match(html, /id="ideas-card"/);
  assert.match(html, /id="build-card"/);
  assert.match(css, /\.dashboard-card/);
  assert.match(css, /button\.approve/);
  assert.match(css, /button\.reject/);
  assert.match(css, /\.build-status/);
});
