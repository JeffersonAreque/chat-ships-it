const assert = require('node:assert/strict');
const test = require('node:test');
const { createIdeaStore } = require('../ideas/ideaStore');

test('limits each user to one active idea and one vote per round', () => {
  const store = createIdeaStore();
  const first = store.handleMessage({ user: 'ana', text: '!idea make the ship green' });
  assert.equal(first.accepted, true);

  const secondIdea = store.handleMessage({ user: 'ANA', text: '!idea add a shield' });
  assert.equal(secondIdea.accepted, false);
  assert.match(secondIdea.reason, /already submitted an idea this round/i);

  const vote = store.handleMessage({ user: 'bob', text: '!vote 1' });
  assert.equal(vote.accepted, true);
  const secondVote = store.handleMessage({ user: 'BOB', text: '!vote 1' });
  assert.equal(secondVote.accepted, false);
  assert.match(secondVote.reason, /already voted this round/i);
});

test('rejects overlong, built-in banned, and configured banned idea text', () => {
  const store = createIdeaStore({ additionalBannedWords: ['spoilerword'] });
  assert.match(store.handleMessage({ user: 'ana', text: `!idea ${'x'.repeat(121)}` }).reason, /120 characters/);
  assert.match(store.handleMessage({ user: 'ana', text: '!idea add a shit asteroid' }).reason, /banned word/i);
  assert.match(store.handleMessage({ user: 'ana', text: '!idea add a spoilerword asteroid' }).reason, /banned word/i);
});
