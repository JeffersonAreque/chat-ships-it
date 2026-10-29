const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { validateGameSource } = require('../builder/gameValidator');

const gamePath = path.join(__dirname, '..', 'game', 'game.js');
const apiPath = path.join(__dirname, '..', 'game', 'ENGINE_API.md');

test('blank starter runs the engine and draws no playable scene', async () => {
  const source = await fs.readFile(gamePath, 'utf8');
  const result = validateGameSource(source);

  assert.match(source, /CHAT_SHIPS_ENGINE_START[\s\S]*CHAT_SHIPS_ENGINE_END/);
  assert.match(source, /CHAT_SHIPS_FEATURE_START[\s\S]*update\(\) \{\},\s*draw\(\) \{\}/);
  assert.doesNotMatch(source, /Ship down!|spawnAsteroid|drawAsteroid/);
  assert.equal(result.frames, 350);
});

test('engine reference documents polish helpers for generated features', async () => {
  const reference = await fs.readFile(apiPath, 'utf8');
  for (const api of ['Engine.palette', 'Engine.input', 'Engine.sprites', 'Engine.particles.burst', 'Engine.effects.hit', 'Engine.sound.play', 'Engine.collisions', 'Engine.start']) {
    assert.ok(reference.includes(api), `Missing engine API reference for ${api}`);
  }
});
