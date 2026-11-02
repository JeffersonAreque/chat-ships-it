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

test('the OBS overlay keeps its tabs and places build, viewer, code, and timeline panels at frame edges', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'overlay.css'), 'utf8');
  assert.match(html, /Ideas/);
  assert.match(html, /Live Code/);
  assert.match(html, /Timeline/);
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.match(html, /id="chat-cta"/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'overlay', 'overlay.js'), 'utf8'), /type: 'replay-select'/);
  assert.match(css, /\.build-status\s*\{[^}]*top:/s);
  assert.match(css, /\.viewer-card\s*\{[^}]*right:/s);
  assert.match(css, /\.ideas-panel\s*\{[^}]*left:/s);
  assert.match(css, /\.code-panel\s*\{[^}]*bottom:[^}]*left:/s);
  assert.match(css, /\.timeline-panel\s*\{[^}]*bottom:/s);
});
