const vm = require('node:vm');

function createCanvasContext(renderedText) {
  const drawing = {
    fillText(text) {
      renderedText.push(String(text));
    },
  };

  return new Proxy(drawing, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

const ENGINE_START = '// CHAT_SHIPS_ENGINE_START';
const ENGINE_END = '// CHAT_SHIPS_ENGINE_END';

function getEngineSection(source) {
  const start = source.indexOf(ENGINE_START);
  const end = source.indexOf(ENGINE_END, start + ENGINE_START.length);
  if (start < 0 || end < 0) throw new Error('The game must preserve its protected engine section.');
  return source.slice(start, end + ENGINE_END.length);
}

function validateGameSource(source, { frames = 350, timeoutMs = 3000, engineBaseline } = {}) {
  const candidateEngine = getEngineSection(source);
  if (engineBaseline !== undefined && candidateEngine !== getEngineSection(engineBaseline)) {
    throw new Error('The candidate changed the protected engine section.');
  }
  const renderedText = [];
  const frameQueue = [];
  const listeners = new Map();
  const scoreElement = { textContent: '' };
  const drawing = createCanvasContext(renderedText);
  const canvas = { width: 960, height: 540, getContext: () => drawing };
  const document = {
    querySelector(selector) {
      if (selector === '#game') return canvas;
      if (selector === '#score') return scoreElement;
      return { textContent: '', getContext: () => drawing };
    },
    getElementById(id) {
      return this.querySelector(`#${id}`);
    },
  };
  const window = {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
  };
  const context = vm.createContext({
    document,
    window,
    console: { log() {}, warn() {}, error() {} },
    requestAnimationFrame(callback) {
      frameQueue.push(callback);
      if (frameQueue.length > 1000) throw new Error('Too many queued animation frames.');
    },
  });

  new vm.Script(source, { filename: 'game.js' }).runInContext(context, { timeout: timeoutMs });
  if (!listeners.has('keydown') || !listeners.has('keyup')) {
    throw new Error('The game must keep its keyboard controls.');
  }

  context.__frameQueue = frameQueue;
  context.__requestedFrames = frames;
  new vm.Script(`
    for (let frameNumber = 0; frameNumber < __requestedFrames; frameNumber += 1) {
      const callback = __frameQueue.shift();
      if (typeof callback !== 'function') throw new Error('The game stopped scheduling frames.');
      callback(frameNumber * (1000 / 60));
    }
  `, { filename: 'game-frame-check.js' }).runInContext(context, { timeout: timeoutMs });

  if (!/^\d+$/.test(String(scoreElement.textContent))) {
    throw new Error('The game score must remain a whole number.');
  }

  return { frames, renderedText };
}

module.exports = { validateGameSource, getEngineSection };
