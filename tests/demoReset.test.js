const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createBuildQueue } = require('../ideas/buildQueue');
const { createIdeaStore } = require('../ideas/ideaStore');
const projectRoot = path.join(__dirname, '..');

test('demo reset clears ideas, votes, approvals, and build queue IDs', () => {
  const ideas = createIdeaStore();
  const queue = createBuildQueue();
  const submitted = ideas.handleMessage({ user: 'Ana', text: '!idea Make cats' });
  ideas.handleMessage({ user: 'Bee', text: '!vote 1' });
  ideas.approveIdea(submitted.idea.id);
  queue.enqueue({ ...submitted.idea, votes: 1 }, 1);
  ideas.nextRound();

  const snapshot = ideas.reset();
  queue.clear();
  assert.equal(snapshot.round, 1);
  assert.deepEqual(snapshot.ideas, []);
  assert.equal(snapshot.latestApproval, null);
  assert.deepEqual(queue.getItems(), []);
  assert.equal(queue.enqueue({ ...submitted.idea, votes: 0 }, 1).id, 1);
});

test('admin reset button asks for confirmation and calls the protected reset route', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'admin', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(projectRoot, 'admin', 'admin.js'), 'utf8');
  const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.match(html, /id="reset-demo"/);
  assert.match(script, /window\.confirm\('Reset the demo to the starter game\?/);
  assert.match(script, /postAction\('reset-demo'\)/);
  assert.match(server, /app\.post\('\/admin\/api\/reset-demo'/);
});

