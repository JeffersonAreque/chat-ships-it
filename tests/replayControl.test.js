const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createReplayController } = require('../admin/replayController');

test('Play steps from the blank baseline every three seconds, then returns to live', () => {
  const sent = [];
  let tick;
  let duration;
  const controller = createReplayController({
    sendStep: (step) => sent.push(step.title),
    sendLive: () => sent.push('live'),
    setIntervalFn: (callback, ms) => { tick = callback; duration = ms; return 1; },
    clearIntervalFn: () => {},
  });

  controller.setSteps([
    { commit: 'a'.repeat(40), title: 'Blank starter', baseline: true },
    { commit: 'b'.repeat(40), title: 'Rainbow Trail' },
    { commit: 'c'.repeat(40), title: 'Neon Shield' },
  ]);
  controller.play();
  assert.equal(duration, 3000);
  assert.deepEqual(sent, ['Blank starter']);
  tick();
  assert.deepEqual(sent, ['Blank starter', 'Rainbow Trail']);
  tick();
  assert.deepEqual(sent, ['Blank starter', 'Rainbow Trail', 'Neon Shield']);
  tick();
  assert.deepEqual(sent, ['Blank starter', 'Rainbow Trail', 'Neon Shield', 'live']);
  assert.equal(controller.getState().playing, false);
});

test('manual replay controls broadcast steps and Stop returns to live', () => {
  const sent = [];
  const controller = createReplayController({
    sendStep: (step) => sent.push(step.title),
    sendLive: () => sent.push('live'),
    setIntervalFn: () => 1,
    clearIntervalFn: () => {},
  });
  controller.setSteps([{ commit: 'a'.repeat(40), title: 'Blank starter' }, { commit: 'b'.repeat(40), title: 'Rainbow Trail' }]);
  controller.next();
  controller.next();
  controller.previous();
  controller.stop();
  assert.deepEqual(sent, ['Blank starter', 'Rainbow Trail', 'Blank starter', 'live']);
});

test('admin has replay controls and overlay broadcasts only reflect the current replay step', () => {
  const root = path.join(__dirname, '..');
  const adminHtml = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(root, 'admin', 'admin.js'), 'utf8');
  const overlayHtml = fs.readFileSync(path.join(root, 'overlay', 'index.html'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(root, 'overlay', 'overlay.js'), 'utf8');
  const overlayCss = fs.readFileSync(path.join(root, 'overlay', 'overlay.css'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

  for (const id of ['replay-play', 'replay-prev', 'replay-next', 'replay-stop']) assert.match(adminHtml, new RegExp(`id="${id}"`));
  assert.match(adminJs, /sendStep:[\s\S]*type: 'replay-step'/);
  assert.match(adminJs, /fetch\('\/admin\/api\/replay'/);
  assert.match(server, /app\.post\('\/admin\/api\/replay'/);
  assert.match(server, /broadcastReplayStep\(String\(request\.body\?\.commit/);
  assert.match(overlayJs, /message\.type === 'replay-step'/);
  assert.match(overlayJs, /aria-current.*step/s);
  assert.doesNotMatch(overlayHtml, /<button\b/i);
  assert.doesNotMatch(overlayCss, /pointer-events:\s*auto/);
});
