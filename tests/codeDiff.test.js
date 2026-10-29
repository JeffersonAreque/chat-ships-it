const assert = require('node:assert/strict');
const test = require('node:test');
const { createUnifiedDiff } = require('../builder/codeDiff');

test('creates a compact readable unified diff for changed game code', () => {
  const diff = createUnifiedDiff('const a = 1;\nconst b = 2;\n', 'const a = 1;\nconst b = 3;\n');
  assert.match(diff, /^--- a\/game\.js\n\+\+\+ b\/game\.js/m);
  assert.match(diff, /-const b = 2;/);
  assert.match(diff, /\+const b = 3;/);
  assert.equal(createUnifiedDiff('same', 'same'), '');
});
