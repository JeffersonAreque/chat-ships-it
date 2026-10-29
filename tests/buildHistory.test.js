const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { readReplaySource, readReplayTimeline } = require('../builder/buildHistory');

async function commit(root, subject, contents, allowEmpty = false) {
  await fs.writeFile(path.join(root, 'game', 'game.js'), contents, 'utf8');
  execFileSync('git', ['add', 'game/game.js'], { cwd: root });
  execFileSync('git', ['commit', '--quiet', ...(allowEmpty ? ['--allow-empty'] : []), '-m', subject], { cwd: root });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

async function makeHistory(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-ships-history-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'History Tests'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'history@example.invalid'], { cwd: root });
  const gamePath = path.join(root, 'game', 'game.js');
  await fs.mkdir(path.dirname(gamePath), { recursive: true });
  await fs.writeFile(gamePath, 'blank', 'utf8');
  execFileSync('git', ['add', 'game/game.js'], { cwd: root });
  execFileSync('git', ['commit', '--quiet', '-m', 'Initial file'], { cwd: root });
  await commit(root, 'Reset demo to starter game', 'blank', true);
  return root;
}

test('timeline starts at the latest reset and undo removes a shipped step', async (t) => {
  const root = await makeHistory(t);
  await commit(root, 'Chat idea #1 by @ana [Rainbow Trail]: rainbow trail', 'rainbow');
  const second = await commit(root, 'Chat idea #2 by @maria [Shield]: add a shield', 'shield');
  await commit(root, `Undo chat build ${second.slice(0, 7)}`, 'rainbow');
  const latestReset = await commit(root, 'Reset demo to starter game', 'blank');
  const afterReset = await commit(root, 'Chat idea #3 by @leo [Star Bloom]: add stars', 'stars');

  const timeline = readReplayTimeline(root);
  assert.equal(timeline.baselineCommit, latestReset);
  assert.deepEqual(timeline.steps.map((step) => step.commit), [latestReset, afterReset]);
  assert.equal(timeline.steps[1].title, 'Star Bloom');
  assert.equal(timeline.steps[1].author, 'leo');
  assert.equal(readReplaySource(root, latestReset), 'blank');
  assert.equal(readReplaySource(root, afterReset), 'stars');
  assert.throws(() => readReplaySource(root, second), /not part of the current demo timeline/);
});

test('an empty Reset demo marker still starts a new replay timeline', async (t) => {
  const root = await makeHistory(t);
  await commit(root, 'Chat idea #1 by @ana [Rainbow Trail]: rainbow trail', 'rainbow');
  await commit(root, 'Undo chat build unused', 'blank');
  execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'Reset demo to starter game'], { cwd: root });
  const marker = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const timeline = readReplayTimeline(root);
  assert.equal(timeline.baselineCommit, marker);
  assert.deepEqual(timeline.steps.map((step) => step.commit), [marker]);
});
