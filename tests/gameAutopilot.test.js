const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('autopilot dodges and automatically restarts after a collision', () => {
  const shipPositions = [];
  const renderedText = [];
  const frameQueue = [];
  let currentTranslation = null;
  const drawing = new Proxy({}, {
    get(_target, property) {
      if (property === 'translate') return (x, y) => { currentTranslation = [x, y]; };
      if (property === 'moveTo') return (x, y) => {
        if (x === 0 && y === -21 && currentTranslation) shipPositions.push(currentTranslation);
      };
      if (property === 'fillText') return (text) => renderedText.push(String(text));
      return () => {};
    },
    set() { return true; },
  });
  const score = { textContent: '' };
  const canvas = { width: 80, height: 540, getContext: () => drawing };
  const listeners = new Map();
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.5;
  const context = vm.createContext({
    document: { querySelector: (selector) => selector === '#game' ? canvas : score },
    window: {
      location: { search: '?autopilot=1' },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    Math: deterministicMath,
    requestAnimationFrame: (callback) => frameQueue.push(callback),
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'game', 'game.js'), 'utf8');
  new vm.Script(source).runInContext(context);

  for (let frame = 0; frame < 700; frame += 1) {
    const nextFrame = frameQueue.shift();
    assert.equal(typeof nextFrame, 'function');
    nextFrame(frame * (1000 / 60));
  }

  assert.ok(listeners.has('keydown'));
  assert.ok(shipPositions.some(([x]) => x < 40), 'autopilot should move the ship away from the centered asteroid stream');
  assert.ok(renderedText.includes('Ship down!'), 'narrow test canvas should force a collision');
  assert.ok(shipPositions.length > 300, 'the game should keep rendering across automatic restarts');
});

test('the overlay panel is positioned at the top right', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'index.html'), 'utf8');
  assert.match(html, /body\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end/s);
  assert.match(html, /main\s*\{[^}]*margin-left:\s*auto/s);
  assert.match(html, /main\s*\{[^}]*margin-top:\s*88px/s);
});
