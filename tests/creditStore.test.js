const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createCreditStore } = require('../credits/creditStore');
const projectRoot = path.join(__dirname, '..');

test('migrates existing game-code credits and persists new server-managed credits', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-ships-credits-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = path.join(root, 'runtime', 'credits.json');
  const legacyGamePath = path.join(root, 'game.js');
  fs.writeFileSync(legacyGamePath, [
    '// CHAT_SHIPS_IT_BOSS_CREDIT_START',
    'context.fillText("Cats by @oldviewer", 16, 28);',
    '// CHAT_SHIPS_IT_BOSS_CREDIT_END',
  ].join('\n'));

  const store = createCreditStore({ filePath, legacyGamePath });
  assert.equal(store.getCredits()[0].text, 'Cats by @oldviewer');
  const added = store.addBuild({ id: 4, ideaId: 12, author: 'NewViewer' });
  assert.equal(added.text, 'Boss by @NewViewer');

  const reloaded = createCreditStore({ filePath, legacyGamePath });
  assert.deepEqual(reloaded.getCredits().map((credit) => credit.text), [
    'Boss by @NewViewer',
    'Cats by @oldviewer',
  ]);
});

test('renders credits in the game page outside game.js using text content', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'game', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(projectRoot, 'game', 'credits.js'), 'utf8');
  const game = fs.readFileSync(path.join(projectRoot, 'game', 'game.js'), 'utf8');
  assert.ok(html.indexOf('</canvas>') < html.indexOf('id="viewer-credits"'));
  assert.match(html, /src="\/game\/credits\.js"/);
  assert.match(script, /fetch\('\/game\/api\/credits'/);
  assert.match(script, /item\.textContent\s*=/);
  assert.doesNotMatch(script, /innerHTML/);
  assert.doesNotMatch(game, /CHAT_SHIPS_IT_BOSS_CREDIT|Boss by @/);
});

