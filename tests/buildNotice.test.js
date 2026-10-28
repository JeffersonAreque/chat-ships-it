const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('renders live stages with elapsed time and a shipped or failed toast', () => {
  const elements = new Map([
    ['#build-banner', { hidden: true, textContent: '' }],
    ['#build-toast', { hidden: true, textContent: '' }],
  ]);
  const window = {
    location: { pathname: '/game' },
    setInterval() { return 1; },
    setTimeout() { return 2; },
    clearTimeout() {},
  };
  const context = vm.createContext({
    document: { querySelector: (selector) => elements.get(selector) },
    window,
  });
  const script = fs.readFileSync(path.join(__dirname, '..', 'game', 'buildNotice.js'), 'utf8');
  new vm.Script(script).runInContext(context);
  const notice = window.ChatShipsBuildNotice;
  const banner = elements.get('#build-banner');
  const toast = elements.get('#build-toast');
  const item = { author: 'ana', text: 'make the asteroids cats' };

  for (const [status, expected] of [
    ['queued', 'Queued @ana'],
    ['building', "Codex is building @ana's idea: make the asteroids cats - "],
    ['validating', 'Validating @ana'],
    ['retrying', 'Retrying @ana'],
  ]) {
    notice.render({ buildNotice: { status, item, startedAt: Date.now() - 125000 } });
    assert.equal(banner.hidden, false);
    assert.ok(banner.textContent.startsWith(expected));
    assert.match(banner.textContent, /\d+:\d{2}$/);
  }

  notice.render({ buildNotice: { status: 'done', message: 'Shipped! Cat Asteroids by @ana' } });
  assert.equal(banner.hidden, true);
  assert.equal(toast.hidden, true);

  notice.render({ buildNotice: { status: 'failed', message: 'Failed, game unchanged' } });
  assert.equal(toast.hidden, true);

  const overlayElements = new Map([
    ['#build-banner', { hidden: true, textContent: '' }],
    ['#build-toast', { hidden: true, textContent: '' }],
  ]);
  const overlayWindow = {
    location: { pathname: '/overlay' },
    setInterval() { return 1; },
    setTimeout() { return 2; },
    clearTimeout() {},
  };
  const overlayContext = vm.createContext({
    document: { querySelector: (selector) => overlayElements.get(selector) },
    window: overlayWindow,
  });
  new vm.Script(script).runInContext(overlayContext);
  overlayWindow.ChatShipsBuildNotice.render({ buildNotice: { status: 'done', message: 'Shipped! Cat Asteroids by @ana' } });
  assert.equal(overlayElements.get('#build-toast').hidden, false);
  assert.equal(overlayElements.get('#build-toast').textContent, 'Shipped! Cat Asteroids by @ana');
});

