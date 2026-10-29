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
