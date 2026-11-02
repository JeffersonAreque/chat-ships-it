const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function makeEnvironment(pathname) {
  const elements = new Map();
  const timers = [];
  function element(extra = {}) {
    const classes = new Set();
    return {
      hidden: true,
      textContent: '',
      children: [],
      style: { setProperty() {} },
      classList: {
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
        has(name) { return classes.has(name); },
      },
      replaceChildren(...children) { this.children = children; },
      append(child) { this.children.push(child); },
      ...extra,
    };
  }
  for (const selector of ['#build-banner', '#build-clock', '#build-toast', '#toast-kicker', '#toast-title', '#toast-viewer', '#celebration-particles', '#stage-queued', '#stage-building', '#stage-validating', '#stage-shipped']) {
    elements.set(selector, element());
  }
  const window = {
    location: { pathname },
    setInterval() { return 1; },
    setTimeout(callback, duration) { timers.push({ callback, duration }); return timers.length; },
    clearTimeout() {},
  };
  const context = vm.createContext({
    document: { querySelector: (selector) => elements.get(selector), createElement: () => element() },
    window,
    Math,
  });
  const script = fs.readFileSync(path.join(__dirname, '..', 'game', 'buildNotice.js'), 'utf8');
  new vm.Script(script).runInContext(context);
  return { elements, timers, notice: window.ChatShipsBuildNotice };
}

test('shows the live build clock and advances queued, building, and validation stage dots', () => {
  const { elements, notice } = makeEnvironment('/overlay');
  const banner = elements.get('#build-banner');
  const item = { author: 'ana', text: 'make the asteroids cats' };

  for (const [status, current] of [['queued', 'queued'], ['building', 'building'], ['validating', 'validating'], ['retrying', 'building']]) {
    notice.render({ buildNotice: { status, item, startedAt: Date.now() - 125000 } });
    assert.equal(banner.hidden, false);
    assert.equal(elements.get('#build-clock').textContent, 'LIVE BUILD 2:05');
    assert.equal(elements.get(`#stage-${current}`).classList.has('is-current'), true);
  }
});

test('shows a centered shipped celebration for three seconds on the overlay only', () => {
  const overlay = makeEnvironment('/overlay');
  const notice = {
    buildNotice: {
      status: 'done',
      startedAt: Date.now() - 22000,
      message: 'Shipped! Neon Player Ship by @ana',
      item: { author: 'ana', featureTitle: 'Neon Player Ship' },
    },
  };
  overlay.notice.render(notice);
  assert.equal(overlay.elements.get('#build-banner').hidden, false);
  assert.equal(overlay.elements.get('#build-clock').textContent, 'SHIPPED 0:22');
  assert.equal(overlay.elements.get('#stage-shipped').classList.has('is-complete'), true);
  assert.equal(overlay.elements.get('#build-toast').hidden, false);
  assert.equal(overlay.elements.get('#toast-kicker').textContent, 'SHIPPED TO THE GAME');
  assert.equal(overlay.elements.get('#toast-title').textContent, 'Neon Player Ship');
  assert.equal(overlay.elements.get('#toast-viewer').textContent, 'by @ana');
  assert.equal(overlay.elements.get('#celebration-particles').children.length, 26);
  assert.equal(overlay.timers.at(-1).duration, 3000);

  const game = makeEnvironment('/game');
  game.notice.render(notice);
  assert.equal(game.elements.get('#build-toast').hidden, true);
  assert.equal(game.elements.get('#build-banner').hidden, false);
});
