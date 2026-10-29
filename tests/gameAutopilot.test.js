const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('the engine exposes OBS autopilot mode to generated features', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'game', 'game.js'), 'utf8');
  assert.match(source, /autopilot=1/);
  assert.match(source, /isAutopilot:\s*autopilot/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'game', 'ENGINE_API.md'), 'utf8'), /Engine\.input\.isAutopilot/);
});

test('the OBS overlay keeps its ideas, live code, and replay tabs in the top-right panel', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'index.html'), 'utf8');
  assert.match(html, /body\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end/s);
  assert.match(html, /main\s*\{[^}]*margin-left:\s*auto/s);
  assert.match(html, /main\s*\{[^}]*margin-top:\s*88px/s);
  assert.match(html, /Ideas/);
  assert.match(html, /Live Code/);
  assert.match(html, /Timeline/);
  assert.match(html, /id="replay-frame"/);
});
